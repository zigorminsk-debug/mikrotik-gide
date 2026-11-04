package main

import (
	"log"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

var (
	windowMu  sync.Mutex
	windowCmd *exec.Cmd
)

// openUI показывает интерфейс и возвращает функцию ожидания закрытия окна.
// Второй результат — удалось ли открыть отдельное окно приложения.
func openUI(url string, browserOnly bool, profile string) (func() error, bool) {
	if !browserOnly {
		if wait, ok := openAppWindow(url, profile); ok {
			return wait, true
		}
	}
	openDefault(url)
	return nil, false
}

// openAppWindow запускает Edge или Chrome в режиме приложения с отдельным
// профилем: так окно выглядит как обычное приложение, а процесс можно дождаться.
func openAppWindow(url, profile string) (func() error, bool) {
	if runtime.GOOS != "windows" {
		return nil, false
	}
	for _, name := range []string{"msedge.exe", "chrome.exe"} {
		exe, err := findBrowser(name)
		if err != nil {
			continue
		}
		cmd := exec.Command(exe,
			"--app="+url,
			"--user-data-dir="+profile,
			"--no-first-run",
			"--no-default-browser-check",
			"--disable-background-mode",
			"--disable-features=Translate",
			"--window-size=1280,900",
		)
		if err := cmd.Start(); err != nil {
			log.Printf("не удалось запустить %s: %v", exe, err)
			continue
		}
		log.Printf("окно открывает %s", exe)
		windowMu.Lock()
		windowCmd = cmd
		windowMu.Unlock()
		return cmd.Wait, true
	}
	return nil, false
}

func findBrowser(name string) (string, error) {
	if p, err := exec.LookPath(name); err == nil {
		return p, nil
	}
	var candidates []string
	for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles", "LOCALAPPDATA"} {
		base := os.Getenv(env)
		if base == "" {
			continue
		}
		candidates = append(candidates,
			filepath.Join(base, "Microsoft", "Edge", "Application", name),
			filepath.Join(base, "Google", "Chrome", "Application", name),
		)
	}
	for _, p := range candidates {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p, nil
		}
	}
	return "", os.ErrNotExist
}

func openDefault(url string) {
	switch runtime.GOOS {
	case "windows":
		_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		_ = exec.Command("open", url).Start()
	default:
		_ = exec.Command("xdg-open", url).Start()
	}
}

// closeAppWindow закрывает окно приложения перед перезапуском после обновления.
func closeAppWindow() {
	windowMu.Lock()
	cmd := windowCmd
	windowCmd = nil
	windowMu.Unlock()
	if cmd != nil && cmd.Process != nil {
		_ = cmd.Process.Kill()
	}
}

// waitPortFree ждёт, пока прошлый экземпляр освободит порт после обновления.
func waitPortFree(port int, limit time.Duration) {
	deadline := time.Now().Add(limit)
	for time.Now().Before(deadline) {
		ln, err := net.Listen("tcp", net.JoinHostPort("127.0.0.1", itoa(port)))
		if err == nil {
			_ = ln.Close()
			return
		}
		time.Sleep(150 * time.Millisecond)
	}
}

func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	var b [12]byte
	i := len(b)
	for v > 0 {
		i--
		b[i] = byte('0' + v%10)
		v /= 10
	}
	return string(b[i:])
}
