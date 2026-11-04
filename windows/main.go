// Command mikrotik-gide — настольная версия учебника для Windows.
//
// Приложение поднимает локальный HTTP-сервер с общим веб-интерфейсом
// (app/src/main/assets/www) и открывает его в отдельном окне Edge/Chrome
// в режиме приложения. Интерфейс тот же, что и в Android-версии.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

var (
	// version и buildNo подставляет сборка: -ldflags "-X main.version=1.0.51"
	version = "dev"
	buildNo = "0"
)

func main() {
	port := flag.Int("port", 47800, "порт локального сервера (0 — любой свободный)")
	browserOnly := flag.Bool("browser", false, "открыть в системном браузере вместо окна приложения")
	noWindow := flag.Bool("no-window", false, "только сервер, без окна")
	showVer := flag.Bool("version", false, "напечатать версию и выйти")
	flag.Parse()

	if *showVer {
		fmt.Printf("MikroTik Gide %s (сборка %s, %s/%s)\n", version, buildNo, runtime.GOOS, runtime.GOARCH)
		return
	}

	dir := dataDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		log.Printf("не удалось создать каталог данных: %v", err)
	}
	setupLog(dir)
	log.Printf("MikroTik Gide %s (сборка %s), данные: %s", version, buildNo, dir)

	// файл .old остался от прошлого обновления — он больше не нужен
	if exe, err := os.Executable(); err == nil {
		_ = os.Remove(exe + ".old")
	}

	profile := filepath.Join(dir, "window-profile")

	if !*noWindow {
		if url, ok := findRunning(*port); ok {
			ver, build := runningVersion(url)
			if sameBuild(ver, build) {
				log.Printf("приложение уже запущено: %s", url)
				openUI(url, *browserOnly, profile)
				return
			}
			// Порт занимает другая сборка: открывать её нельзя, иначе
			// пользователь запускает новый файл, а видит старую версию.
			log.Printf("на %s работает версия %s (сборка %s), эта — %s (сборка %s): "+
				"запускаю отдельную копию", url, orDash(ver), orDash(build), version, buildNo)
		}
	}

	// после обновления старый экземпляр ещё держит порт — подождём его
	if os.Getenv("MTG_UPDATED") == "1" {
		waitPortFree(*port, 8*time.Second)
	}

	// Второй двойной клик во время медленного первого запуска (проверка
	// антивирусом, распаковка) не должен поднимать второй сервер на соседнем
	// порту: несколько секунд ждём, пока первый экземпляр начнёт отвечать.
	if !*noWindow && portBusy(*port) {
		deadline := time.Now().Add(5 * time.Second)
		for time.Now().Before(deadline) {
			if u, ok := findRunning(*port); ok {
				if ver, build := runningVersion(u); sameBuild(ver, build) {
					log.Printf("приложение уже запущено: %s", u)
					openUI(u, *browserOnly, profile)
					return
				}
				log.Printf("порт занят другой сборкой (%s) — поднимаю свою", u)
				break
			}
			time.Sleep(150 * time.Millisecond)
		}
	}

	srv := newServer(version, buildNo, dir)
	ln, err := listen(*port)
	if err != nil {
		log.Fatalf("не удалось открыть порт: %v", err)
	}
	url := "http://" + ln.Addr().String() + "/"
	log.Printf("интерфейс: %s", url)

	go func() {
		if err := srv.http.Serve(ln); err != nil && err != http.ErrServerClosed {
			log.Printf("сервер остановлен: %v", err)
		}
	}()

	if *noWindow {
		select {}
	}

	// Не открываем окно, пока сервер не отвечает: иначе первый запуск
	// показывает пустую страницу и кажется, что программа не стартовала.
	if !waitServer(url, 5*time.Second) {
		log.Printf("сервер не ответил за 5 с — открываю окно всё равно")
	}

	wait, ok := openUI(url, *browserOnly, profile)
	if !ok || wait == nil {
		// Окно приложения недоступно — работаем как локальный сервер для браузера
		// и завершаемся, когда страница перестанет присылать heartbeat.
		log.Printf("окно приложения недоступно — работаю сервером до закрытия страницы")
		srv.watchIdle(idleLimit)
		select {}
	}
	opened := time.Now()
	_ = wait()
	// Edge/Chrome с тем же профилем уже запущен: новый процесс лишь передаёт
	// адрес старому окну и сразу завершается. Раньше из-за этого приложение
	// закрывалось вместе с ним — окно мигало, и помогала только вторая попытка.
	if elapsed := time.Since(opened); elapsed < 3*time.Second {
		log.Printf("окно передано уже запущенному браузеру за %v — сервер остаётся работать", elapsed.Round(time.Millisecond))
		srv.watchIdle(idleLimit)
		select {}
	}
	log.Printf("окно закрыто, завершение работы")
	srv.close()
	time.Sleep(150 * time.Millisecond)
}

// idleLimit — сколько ждём без heartbeat от страницы, прежде чем завершиться.
const idleLimit = 3 * time.Minute

// portBusy сообщает, занят ли порт (значит, кто-то уже слушает).
func portBusy(port int) bool {
	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return true
	}
	_ = ln.Close()
	return false
}

// waitServer проверяет, что локальный сервер уже отвечает на /api/version.
func waitServer(url string, limit time.Duration) bool {
	client := &http.Client{Timeout: 500 * time.Millisecond}
	deadline := time.Now().Add(limit)
	for time.Now().Before(deadline) {
		resp, err := client.Get(url + "api/version")
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				return true
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
	return false
}

func listen(port int) (net.Listener, error) {
	if ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port)); err == nil {
		return ln, nil
	}
	for p := port + 1; p <= port+10; p++ {
		if ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", p)); err == nil {
			return ln, nil
		}
	}
	return net.Listen("tcp", "127.0.0.1:0")
}

// findRunning ищет уже запущенный экземпляр приложения на соседних портах.
func findRunning(port int) (string, bool) {
	client := &http.Client{Timeout: 700 * time.Millisecond}
	for p := port; p <= port+10; p++ {
		u := fmt.Sprintf("http://127.0.0.1:%d/api/version", p)
		resp, err := client.Get(u)
		if err != nil {
			continue
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			continue
		}
		return fmt.Sprintf("http://127.0.0.1:%d/", p), true
	}
	return "", false
}

// runningVersion узнаёт, какая сборка отвечает по адресу работающего
// экземпляра: по одному лишь «порт занят» нельзя понять, наша это копия
// или старая, оставшаяся с прошлой установки.
func runningVersion(base string) (ver, build string) {
	client := &http.Client{Timeout: 800 * time.Millisecond}
	resp, err := client.Get(strings.TrimSuffix(base, "/") + "/api/version")
	if err != nil {
		return "", ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", ""
	}
	var v struct {
		Version string `json:"version"`
		Build   string `json:"build"`
	}
	if json.NewDecoder(io.LimitReader(resp.Body, 1<<16)).Decode(&v) != nil {
		return "", ""
	}
	return v.Version, v.Build
}

// sameBuild отвечает, можно ли переиспользовать окно работающего экземпляра.
func sameBuild(ver, build string) bool {
	if build != "" && build != "0" && build == buildNo {
		return true
	}
	if ver != "" && ver != "dev" && ver == version {
		return true
	}
	return false
}

func orDash(s string) string {
	if s == "" {
		return "?"
	}
	return s
}

func dataDir() string {
	if runtime.GOOS == "windows" {
		if v := os.Getenv("LOCALAPPDATA"); v != "" {
			return filepath.Join(v, "MikroTikGide")
		}
	}
	if v, err := os.UserConfigDir(); err == nil {
		return filepath.Join(v, "MikroTikGide")
	}
	return "."
}

func setupLog(dir string) {
	f, err := os.OpenFile(filepath.Join(dir, "app.log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return
	}
	log.SetOutput(io.MultiWriter(os.Stderr, f))
	log.SetFlags(log.LstdFlags)
}
