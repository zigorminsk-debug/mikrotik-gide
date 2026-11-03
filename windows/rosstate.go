package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"
)

/* rosstate.go — текущее состояние роутера и обновления.

   Состояние (snapshot) сохраняется в файл рядом с паспортами, чтобы мастер мог
   показать «что уже есть, а что будет создано» ещё до подключения. Обновления
   RouterOS и прошивки RouterBOOT ставятся из программы, но только по явной
   команде пользователя.
*/

// snapshotMenus — меню, которые читаем для сравнения с конфигом.
var snapshotMenus = []string{
	"/system identity",
	"/ip address",
	"/ip route",
	"/ip dns",
	"/ip cloud",
	"/ip service",
	"/ip pool",
	"/ip dhcp-client",
	"/ip dhcp-server",
	"/ip dhcp-server network",
	"/ip firewall filter",
	"/ip firewall nat",
	"/ip firewall address-list",
	"/ip firewall service-port",
	"/interface bridge",
	"/interface bridge port",
	"/interface bridge vlan",
	"/interface vlan",
	"/interface ethernet",
	"/interface wireless",
	"/interface wireless security-profiles",
	"/interface wifi",
	"/interface wifi security",
	"/interface wifi configuration",
	"/interface wifi datapath",
	"/interface wireguard",
	"/interface wireguard peers",
	"/ipv6 address",
	"/system scheduler",
	"/system script",
	"/system ntp client",
	"/tool bandwidth-server",
	"/tool romon",
}

// rosSnapshot — прочитанные меню роутера.
type rosSnapshot struct {
	Address string                         `json:"address"`
	Updated string                         `json:"updated"`
	Menus   map[string][]map[string]string `json:"menus"`
	Counts  map[string]int                 `json:"counts"`
}

func snapshotPath(address string) string {
	safe := strings.NewReplacer(".", "_", ":", "_", "/", "_", " ", "").Replace(normalizeAddress(address))
	if safe == "" {
		safe = "router"
	}
	return filepath.Join(dataDir(), "snapshot-"+safe+".json")
}

func loadSnapshot(address string) (*rosSnapshot, bool) {
	b, err := os.ReadFile(snapshotPath(address))
	if err != nil {
		return nil, false
	}
	var s rosSnapshot
	if err := json.Unmarshal(b, &s); err != nil || s.Menus == nil {
		return nil, false
	}
	return &s, true
}

func saveSnapshot(s *rosSnapshot) error {
	if s == nil {
		return errors.New("пустой снимок")
	}
	if err := os.MkdirAll(dataDir(), 0o755); err != nil {
		return err
	}
	b, err := json.Marshal(s)
	if err != nil {
		return err
	}
	return os.WriteFile(snapshotPath(s.Address), b, 0o644)
}

// collectSnapshot читает меню роутера через API.
func collectSnapshot(address, user, pass string) (*rosSnapshot, error) {
	c, err := dialRouterAPI(address, user, pass)
	if err != nil {
		return nil, err
	}
	defer func() { _ = c.Close() }()
	snap := &rosSnapshot{
		Address: normalizeAddress(address),
		Updated: time.Now().Format("2006-01-02 15:04"),
		Menus:   map[string][]map[string]string{},
		Counts:  map[string]int{},
	}
	for _, menu := range snapshotMenus {
		rows, err := c.command(menu + "/print")
		if err != nil {
			continue // меню может отсутствовать в этой версии — это нормально
		}
		if len(rows) > 500 {
			rows = rows[:500]
		}
		snap.Menus[menu] = rows
		snap.Counts[menu] = len(rows)
	}
	if len(snap.Menus) == 0 {
		return nil, errors.New("роутер не отдал ни одного меню")
	}
	_ = saveSnapshot(snap)
	return snap, nil
}

// rosUpdates — что можно обновить на роутере.
type rosUpdates struct {
	Installed    string `json:"installed"`
	Latest       string `json:"latest"`
	Status       string `json:"status"`
	Channel      string `json:"channel"`
	RouterOSNew  bool   `json:"routerosNew"`
	Firmware     string `json:"firmware"`
	FirmwareNew  string `json:"firmwareNew"`
	FirmwareNext bool   `json:"firmwareNext"`
	Note         string `json:"note,omitempty"`
	Checked      string `json:"checked"`
}

// checkRouterUpdates: /system package update check-for-updates + print,
// плюс /system routerboard print (текущая и доступная прошивка).
func checkRouterUpdates(address, user, pass string) (*rosUpdates, error) {
	c, err := dialRouterAPI(address, user, pass)
	if err != nil {
		return nil, err
	}
	defer func() { _ = c.Close() }()
	out := &rosUpdates{Checked: time.Now().Format("2006-01-02 15:04")}
	c.setTimeout(45 * time.Second)
	if _, err := c.command("/system package update/check-for-updates"); err != nil {
		out.Note = "проверка обновлений не удалась (нет интернета на роутере?): " + err.Error()
	}
	c.setTimeout(15 * time.Second)
	if rows, err := c.command("/system package update/print"); err == nil && len(rows) > 0 {
		row := firstRow(rows)
		out.Installed = strings.TrimSpace(row["installed-version"])
		out.Latest = strings.TrimSpace(row["latest-version"])
		out.Status = strings.TrimSpace(row["status"])
		out.Channel = strings.TrimSpace(row["channel"])
		if out.Latest != "" && out.Latest != out.Installed {
			out.RouterOSNew = true
		}
	}
	if rows, err := c.command("/system routerboard/print"); err == nil && len(rows) > 0 {
		row := firstRow(rows)
		out.Firmware = strings.TrimSpace(row["current-firmware"])
		out.FirmwareNew = strings.TrimSpace(row["upgrade-firmware"])
		if out.FirmwareNew != "" && out.FirmwareNew != out.Firmware {
			out.FirmwareNext = true
		}
	}
	if out.Installed == "" && out.Latest == "" && out.Firmware == "" {
		return nil, errors.New("роутер не отдал сведения об обновлениях")
	}
	return out, nil
}

// installRouterOS ставит обновление RouterOS (роутер перезагрузится).
func installRouterOS(address, user, pass string) (string, error) {
	c, err := dialRouterAPI(address, user, pass)
	if err != nil {
		return "", err
	}
	defer func() { _ = c.Close() }()
	c.setTimeout(45 * time.Second)
	if _, err := c.command("/system package update/install"); err != nil {
		return "", err
	}
	return "Обновление RouterOS запущено. Роутер перезагрузится сам (1–3 минуты) — " +
		"после перезагрузки опросите его снова.", nil
}

// upgradeFirmware поднимает прошивку RouterBOOT (нужна перезагрузка).
func upgradeFirmware(address, user, pass string) (string, error) {
	c, err := dialRouterAPI(address, user, pass)
	if err != nil {
		return "", err
	}
	defer func() { _ = c.Close() }()
	if _, err := c.command("/system routerboard/upgrade"); err != nil {
		return "", err
	}
	return "Прошивка RouterBOOT обновлена. Перезагрузите роутер: /system reboot " +
		"(или кнопка Reset). Новая прошивка включится после перезагрузки.", nil
}

// rebootRouter перезагружает роутер по команде из программы.
func rebootRouter(address, user, pass string) (string, error) {
	c, err := dialRouterAPI(address, user, pass)
	if err != nil {
		return "", err
	}
	defer func() { _ = c.Close() }()
	if _, err := c.command("/system reboot"); err != nil {
		// на перезагрузке соединение обрывается — это ожидаемо
		if strings.Contains(strings.ToLower(err.Error()), "eof") ||
			strings.Contains(strings.ToLower(err.Error()), "reset") ||
			strings.Contains(strings.ToLower(err.Error()), "closed") {
			return "Команда перезагрузки отправлена. Роутер выключится на 1–2 минуты.", nil
		}
		return "", err
	}
	return "Команда перезагрузки отправлена. Роутер выключится на 1–2 минуты.", nil
}
