package main

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

/* roshttp.go — мостик между страницей учебника и роутером.
   Браузер не умеет открывать TCP к порту 8728, поэтому опрос делает
   Go-сервер, а страница получает готовый паспорт в JSON. */

func (s *server) handleRouterProbe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "нужен POST", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Address  string `json:"address"`
		User     string `json:"user"`
		Password string `json:"password"`
		Save     bool   `json:"save"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		writeJSON(w, map[string]interface{}{"ok": false, "error": "не разобрал запрос: " + err.Error()})
		return
	}
	info, err := probeRouter(req.Address, req.User, req.Password)
	if err != nil {
		// Отдаём не только текст, но и разбор попыток: интерфейс покажет
		// таблицу «путь / порт / что случилось» и подсказки по политикам.
		// Без этого человек видел «неверный пароль» при верном пароле.
		out := map[string]interface{}{"ok": false, "error": err.Error()}
		var pe *probeError
		if errors.As(err, &pe) {
			out["kind"] = pe.Kind
			out["attempts"] = pe.Attempts
			out["hints"] = pe.Hints
			out["address"] = pe.Address
			log.Printf("опрос %s не удался (вид=%s): %s", req.Address, pe.Kind, attemptsText(pe.Attempts))
		} else {
			log.Printf("опрос %s не удался: %v", req.Address, err)
		}
		writeJSON(w, out)
		return
	}
	log.Printf("опрос %s удался: %s %s через %s", info.Address, info.Board, info.Version, info.Transport)
	user := strings.TrimSpace(req.User)
	if user == "" {
		user = "admin"
	}
	if req.Save {
		_ = saveRouter(savedRouter{
			Address:   info.Address,
			User:      user,
			Identity:  info.Identity,
			Version:   info.Version,
			Board:     info.Board,
			Firmware:  info.Firmware,
			Wifi:      info.Wifi,
			Transport: info.Transport,
			Updated:   info.Updated,
		})
	}
	writeJSON(w, map[string]interface{}{"ok": true, "info": info})
}

// handleRouterDiscover — поиск роутеров в сети.
//
// ?address=192.168.88.1 — подсеть этого адреса сканируется первой
// (пользователь уже знает, где искать). Виртуальные адаптеры в поиск
// не попадают: см. комментарий в discover.go.
func (s *server) handleRouterDiscover(w http.ResponseWriter, r *http.Request) {
	prefer := r.URL.Query().Get("address")
	found := discoverRouters(3*time.Second, prefer)
	log.Printf("поиск роутеров: prefer=%q найдено=%d", prefer, len(found))
	for _, f := range found {
		log.Printf("  найден %s (%s) источник=%s порт=%d", f.Address, f.Identity, f.Source, f.Port)
	}
	writeJSON(w, map[string]interface{}{"ok": true, "found": found})
}

// handleRouterCheck — «Проверить доступность»: какие порты вообще открыты.
// Логин не нужен, поэтому кнопку можно нажимать до ввода пароля:
// она отвечает на вопрос «роутер ли это и включены ли сервисы».
func (s *server) handleRouterCheck(w http.ResponseWriter, r *http.Request) {
	addr := normalizeAddress(r.URL.Query().Get("address"))
	if addr == "" {
		var req struct {
			Address string `json:"address"`
		}
		_ = json.NewDecoder(io.LimitReader(r.Body, 1<<14)).Decode(&req)
		addr = normalizeAddress(req.Address)
	}
	if addr == "" {
		writeJSON(w, map[string]interface{}{"ok": false, "error": "не указан адрес"})
		return
	}
	ports := checkRouterPorts(addr)
	open := make([]int, 0, 4)
	for _, p := range ports {
		if p.Open {
			open = append(open, p.Port)
		}
		log.Printf("проверка %s: порт %d (%s) открыт=%v", addr, p.Port, p.Label, p.Open)
	}
	writeJSON(w, map[string]interface{}{"ok": true, "address": addr, "ports": ports, "open": open})
}

func (s *server) handleRouterSaved(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		list := loadRouters()
		out := map[string]interface{}{"ok": true, "saved": list}
		if last, ok := lastRouter(); ok {
			out["last"] = last
		}
		writeJSON(w, out)
	case http.MethodPost, http.MethodDelete:
		var req struct {
			Address string `json:"address"`
		}
		_ = json.NewDecoder(io.LimitReader(r.Body, 1<<14)).Decode(&req)
		addr := strings.TrimSpace(req.Address)
		if addr == "" {
			addr = normalizeAddress(r.URL.Query().Get("address"))
		}
		if addr == "" {
			writeJSON(w, map[string]interface{}{"ok": false, "error": "не указан адрес"})
			return
		}
		if err := deleteRouter(addr); err != nil {
			writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		writeJSON(w, map[string]interface{}{"ok": true})
	default:
		http.Error(w, "метод не поддерживается", http.StatusMethodNotAllowed)
	}
}

// handleRouterApply — сравнение («что изменится») и применение конфига.
// dry=true только сравнивает с текущим состоянием, ничего не меняя.
func (s *server) handleRouterApply(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "нужен POST", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Address     string `json:"address"`
		User        string `json:"user"`
		Password    string `json:"password"`
		Text        string `json:"text"`
		Dry         bool   `json:"dry"`
		StopOnError bool   `json:"stopOnError"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 2<<20)).Decode(&req); err != nil {
		writeJSON(w, map[string]interface{}{"ok": false, "error": "не разобрал запрос: " + err.Error()})
		return
	}
	if strings.TrimSpace(req.Text) == "" {
		writeJSON(w, map[string]interface{}{"ok": false, "error": "пустой конфиг"})
		return
	}
	addr := normalizeAddress(req.Address)
	if req.Dry {
		snap, ok := loadSnapshot(addr)
		if !ok {
			fresh, err := collectSnapshot(addr, req.User, req.Password)
			if err == nil {
				snap, ok = fresh, true
			}
		}
		items := planConfig(req.Text, menusOf(snap))
		counts := map[string]int{}
		for _, it := range items {
			counts[it.Kind]++
		}
		writeJSON(w, map[string]interface{}{
			"ok":         true,
			"dry":        true,
			"plan":       items,
			"counts":     counts,
			"snapshotAt": snapshotTime(snap),
			"snapshotOk": ok,
		})
		return
	}
	results, err := rosApply(addr, req.User, req.Password, req.Text, req.StopOnError)
	if err != nil {
		writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
		return
	}
	counts := map[string]int{}
	for _, res := range results {
		counts[res.Status]++
	}
	writeJSON(w, map[string]interface{}{
		"ok":      true,
		"results": results,
		"counts":  counts,
	})
}

// handleRouterSnapshot — прочитать текущее состояние роутера и сохранить его.
func (s *server) handleRouterSnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "нужен POST", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Address  string `json:"address"`
		User     string `json:"user"`
		Password string `json:"password"`
		ReadOnly bool   `json:"readOnly"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		writeJSON(w, map[string]interface{}{"ok": false, "error": "не разобрал запрос: " + err.Error()})
		return
	}
	addr := normalizeAddress(req.Address)
	if req.ReadOnly {
		if snap, ok := loadSnapshot(addr); ok {
			writeJSON(w, map[string]interface{}{"ok": true, "snapshot": snap, "cached": true})
			return
		}
	}
	snap, err := collectSnapshot(addr, req.User, req.Password)
	if err != nil {
		writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
		return
	}
	writeJSON(w, map[string]interface{}{"ok": true, "snapshot": snap})
}

// handleRouterUpdates — проверка и установка обновлений RouterOS / прошивки.
func (s *server) handleRouterUpdates(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "нужен POST", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Address  string `json:"address"`
		User     string `json:"user"`
		Password string `json:"password"`
		Action   string `json:"action"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		writeJSON(w, map[string]interface{}{"ok": false, "error": "не разобрал запрос: " + err.Error()})
		return
	}
	addr := normalizeAddress(req.Address)
	switch req.Action {
	case "", "check":
		upd, err := checkRouterUpdates(addr, req.User, req.Password)
		if err != nil {
			writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		writeJSON(w, map[string]interface{}{"ok": true, "updates": upd})
	case "routeros":
		msg, err := installRouterOS(addr, req.User, req.Password)
		if err != nil {
			writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		writeJSON(w, map[string]interface{}{"ok": true, "message": msg})
	case "firmware":
		msg, err := upgradeFirmware(addr, req.User, req.Password)
		if err != nil {
			writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		writeJSON(w, map[string]interface{}{"ok": true, "message": msg})
	case "reboot":
		msg, err := rebootRouter(addr, req.User, req.Password)
		if err != nil {
			writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
			return
		}
		writeJSON(w, map[string]interface{}{"ok": true, "message": msg})
	default:
		writeJSON(w, map[string]interface{}{"ok": false, "error": "неизвестное действие: " + req.Action})
	}
}

// menusOf достаёт меню из снимка (или пустую карту).
func menusOf(s *rosSnapshot) map[string][]map[string]string {
	if s == nil || s.Menus == nil {
		return map[string][]map[string]string{}
	}
	return s.Menus
}

func snapshotTime(s *rosSnapshot) string {
	if s == nil {
		return ""
	}
	return s.Updated
}
