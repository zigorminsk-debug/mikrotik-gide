package main

import (
	"crypto/rand"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"path"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	web "github.com/zigorminsk-debug/mikrotik-gide"
)

//go:embed desktop.js
var desktopJS string

type server struct {
	version  string
	build    string
	dir      string
	root     fs.FS
	token    string
	http     *http.Server
	upd      *updater
	lastSeen atomic.Int64
	busy     atomic.Bool
}

func newServer(version, build, dir string) *server {
	s := &server{
		version: version,
		build:   build,
		dir:     dir,
		root:    web.WWW(),
		token:   randomToken(),
		upd:     newUpdater(version, build),
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/version", s.handleVersion)
	mux.HandleFunc("/api/ping", s.handlePing)
	mux.HandleFunc("/api/update/check", s.handleUpdateCheck)
	mux.HandleFunc("/api/update/apply", s.handleUpdateApply)
	mux.HandleFunc("/api/router/probe", s.handleRouterProbe)
	mux.HandleFunc("/api/router/discover", s.handleRouterDiscover)
	mux.HandleFunc("/api/router/check", s.handleRouterCheck)
	mux.HandleFunc("/api/router/saved", s.handleRouterSaved)
	mux.HandleFunc("/api/router/apply", s.handleRouterApply)
	mux.HandleFunc("/api/router/snapshot", s.handleRouterSnapshot)
	mux.HandleFunc("/api/router/updates", s.handleRouterUpdates)
	mux.HandleFunc("/desktop.js", s.handleDesktopJS)
	mux.HandleFunc("/js/version.js", s.handleVersionJS)
	mux.HandleFunc("/", s.handleStatic)
	s.http = &http.Server{
		Handler:           s.track(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}
	s.lastSeen.Store(time.Now().Unix())
	return s
}

func (s *server) close() {
	if s.http != nil {
		_ = s.http.Close()
	}
}

func (s *server) track(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.lastSeen.Store(time.Now().Unix())
		next.ServeHTTP(w, r)
	})
}

// watchIdle завершает процесс, если страница давно не присылала heartbeat.
func (s *server) watchIdle(idle time.Duration) {
	go func() {
		t := time.NewTicker(10 * time.Second)
		defer t.Stop()
		for range t.C {
			if time.Since(time.Unix(s.lastSeen.Load(), 0)) > idle {
				log.Printf("страница закрыта, завершение работы")
				s.close()
				time.Sleep(150 * time.Millisecond)
				exitApp(0)
				return
			}
		}
	}()
}

func (s *server) handlePing(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = io.WriteString(w, "ok")
}

func (s *server) handleVersion(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, map[string]interface{}{
		"ok":       true,
		"platform": "windows",
		"version":  s.version,
		"build":    s.build,
		"go":       goVersion(),
	})
}

func (s *server) handleVersionJS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	code, _ := strconv.Atoi(s.build)
	fmt.Fprintf(w, "window.APP_VERSION = %q;\n", s.version)
	fmt.Fprintf(w, "window.APP_BUILD_DATE = %q;\n", time.Now().Format("2006-01-02"))
	fmt.Fprintf(w, "window.APP_VERSION_CODE = %d;\n", code)
	fmt.Fprintf(w, "window.APP_PLATFORM = 'windows';\n")
}

func (s *server) handleDesktopJS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	js := strings.ReplaceAll(desktopJS, "__MTG_TOKEN__", s.token)
	js = strings.ReplaceAll(js, "__MTG_VERSION__", s.version)
	_, _ = io.WriteString(w, js)
}

func (s *server) handleUpdateCheck(w http.ResponseWriter, r *http.Request) {
	info, err := s.upd.latest(r.Context())
	if err != nil {
		writeJSON(w, map[string]interface{}{
			"ok":      false,
			"error":   err.Error(),
			"current": s.version,
		})
		return
	}
	writeJSON(w, info)
}

func (s *server) handleUpdateApply(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		http.Error(w, "только POST", http.StatusMethodNotAllowed)
		return
	}
	if r.Header.Get("X-MTG-Token") != s.token {
		http.Error(w, "нет доступа", http.StatusForbidden)
		return
	}
	if !s.busy.CompareAndSwap(false, true) {
		writeJSON(w, map[string]interface{}{"ok": false, "error": "обновление уже идёт"})
		return
	}

	info, err := s.upd.latest(r.Context())
	if err != nil {
		s.busy.Store(false)
		writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
		return
	}
	if !info.Available {
		s.busy.Store(false)
		writeJSON(w, map[string]interface{}{"ok": false, "error": "установлена последняя версия"})
		return
	}

	exe, err := exePath()
	if err != nil {
		s.busy.Store(false)
		writeJSON(w, map[string]interface{}{"ok": false, "error": "не удалось определить путь к программе: " + err.Error()})
		return
	}

	log.Printf("обновление: качаю %s (%d байт)", info.Asset, info.Size)
	data, err := s.upd.download(r.Context(), info)
	if err != nil {
		s.busy.Store(false)
		writeJSON(w, map[string]interface{}{"ok": false, "error": "скачивание: " + err.Error()})
		return
	}
	if err := installUpdate(exe, data); err != nil {
		s.busy.Store(false)
		writeJSON(w, map[string]interface{}{"ok": false, "error": "замена файла: " + err.Error()})
		return
	}

	writeJSON(w, map[string]interface{}{"ok": true, "version": info.Latest, "restart": true})
	go func() {
		time.Sleep(600 * time.Millisecond)
		log.Printf("перезапуск в версии %s", info.Latest)
		closeAppWindow()
		time.Sleep(250 * time.Millisecond)
		s.close()
		exitApp(0)
	}()
}

func (s *server) handleStatic(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "метод не поддерживается", http.StatusMethodNotAllowed)
		return
	}
	rel := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	if rel == "" {
		rel = "index.html"
	}
	if strings.HasSuffix(rel, "/") {
		rel += "index.html"
	}
	f, err := s.root.Open(rel)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil || st.IsDir() {
		http.NotFound(w, r)
		return
	}
	data, err := io.ReadAll(f)
	if err != nil {
		http.Error(w, "ошибка чтения файла", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", contentType(rel))
	if strings.HasSuffix(rel, ".html") || strings.HasSuffix(rel, ".js") || strings.HasSuffix(rel, ".css") {
		w.Header().Set("Cache-Control", "no-store")
	} else {
		w.Header().Set("Cache-Control", "public, max-age=3600")
	}
	if strings.HasSuffix(rel, ".html") {
		data = []byte(injectDesktop(string(data)))
	}
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	if r.Method == http.MethodHead {
		return
	}
	_, _ = w.Write(data)
}

// injectDesktop подключает мост настольной версии к общему интерфейсу.
func injectDesktop(html string) string {
	const tag = "<script src=\"/desktop.js\"></script>"
	if strings.Contains(html, tag) {
		return html
	}
	if i := strings.LastIndex(html, "</body>"); i >= 0 {
		return html[:i] + tag + "\n" + html[i:]
	}
	return html + tag
}

func contentType(name string) string {
	switch strings.ToLower(path.Ext(name)) {
	case ".html":
		return "text/html; charset=utf-8"
	case ".js":
		return "text/javascript; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".webp":
		return "image/webp"
	case ".ico":
		return "image/x-icon"
	case ".woff2":
		return "font/woff2"
	case ".txt", ".md":
		return "text/plain; charset=utf-8"
	}
	return "application/octet-stream"
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(v)
}

func randomToken() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return hex.EncodeToString(b)
}
