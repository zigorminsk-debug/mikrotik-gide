package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

/* devices.go — «паспорта» роутеров, которые уже опрашивали.
   Пароль НЕ сохраняется: он нужен только на время запроса. */

type savedRouter struct {
	Address   string `json:"address"`
	User      string `json:"user"`
	Identity  string `json:"identity"`
	Version   string `json:"version"`
	Board     string `json:"board"`
	Firmware  string `json:"firmware"`
	Wifi      string `json:"wifi"`
	Transport string `json:"transport"`
	Updated   string `json:"updated"`
}

var routerFileMu sync.Mutex

func routersFile() string {
	return filepath.Join(dataDir(), "routers.json")
}

func loadRouters() []savedRouter {
	routerFileMu.Lock()
	defer routerFileMu.Unlock()
	b, err := os.ReadFile(routersFile())
	if err != nil {
		return nil
	}
	var list []savedRouter
	if err := json.Unmarshal(b, &list); err != nil {
		return nil
	}
	return list
}

func writeRouters(list []savedRouter) error {
	routerFileMu.Lock()
	defer routerFileMu.Unlock()
	dir := dataDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	tmp := routersFile() + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, routersFile())
}

// saveRouter добавляет паспорт или обновляет запись с тем же адресом.
func saveRouter(r savedRouter) error {
	if r.Address == "" {
		return nil
	}
	if r.Updated == "" {
		r.Updated = time.Now().Format("2006-01-02 15:04")
	}
	list := loadRouters()
	replaced := false
	for i := range list {
		if list[i].Address == r.Address {
			if r.User == "" {
				r.User = list[i].User
			}
			list[i] = r
			replaced = true
			break
		}
	}
	if !replaced {
		list = append(list, r)
	}
	return writeRouters(list)
}

func deleteRouter(address string) error {
	list := loadRouters()
	out := make([]savedRouter, 0, len(list))
	for _, r := range list {
		if r.Address != address {
			out = append(out, r)
		}
	}
	return writeRouters(out)
}

// lastRouter возвращает самый свежий паспорт — его приложение применяет
// при запуске, чтобы конструктор сразу собирал конфиг под эту версию.
func lastRouter() (savedRouter, bool) {
	list := loadRouters()
	if len(list) == 0 {
		return savedRouter{}, false
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Updated > list[j].Updated })
	return list[0], true
}
