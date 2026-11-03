package main

import (
	"encoding/json"
	"io"
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
		writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
		return
	}
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

func (s *server) handleRouterDiscover(w http.ResponseWriter, r *http.Request) {
	found := discoverRouters(3 * time.Second)
	writeJSON(w, map[string]interface{}{"ok": true, "found": found})
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
