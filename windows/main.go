// Command mikrotik-gide — настольная версия учебника для Windows.
//
// Приложение поднимает локальный HTTP-сервер с общим веб-интерфейсом
// (app/src/main/assets/www) и открывает его в отдельном окне Edge/Chrome
// в режиме приложения. Интерфейс тот же, что и в Android-версии.
package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
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
			log.Printf("приложение уже запущено: %s", url)
			openUI(url, *browserOnly, profile)
			return
		}
	}

	// после обновления старый экземпляр ещё держит порт — подождём его
	if os.Getenv("MTG_UPDATED") == "1" {
		waitPortFree(*port, 8*time.Second)
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

	wait, ok := openUI(url, *browserOnly, profile)
	if !ok {
		// Окно приложения недоступно — работаем как локальный сервер для браузера
		// и завершаемся, когда страница перестанет присылать heartbeat.
		srv.watchIdle(2 * time.Minute)
		select {}
	}
	_ = wait()
	log.Printf("окно закрыто, завершение работы")
	srv.close()
	time.Sleep(150 * time.Millisecond)
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
