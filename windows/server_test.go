package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func testServer(t *testing.T) *httptest.Server {
	t.Helper()
	s := newServer("1.0.51", "51", t.TempDir())
	ts := httptest.NewServer(s.http.Handler)
	t.Cleanup(ts.Close)
	return ts
}

func get(t *testing.T, url string) (int, string, string) {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(body), resp.Header.Get("Content-Type")
}

func TestVersionEndpoint(t *testing.T) {
	ts := testServer(t)
	code, body, ctype := get(t, ts.URL+"/api/version")
	if code != 200 {
		t.Fatalf("код %d", code)
	}
	if !strings.Contains(ctype, "application/json") {
		t.Fatalf("тип %q", ctype)
	}
	if !strings.Contains(body, `"platform":"windows"`) || !strings.Contains(body, `"version":"1.0.51"`) {
		t.Fatalf("ответ: %s", body)
	}
}

func TestIndexInjectsDesktopBridge(t *testing.T) {
	ts := testServer(t)
	code, body, ctype := get(t, ts.URL+"/")
	if code != 200 || !strings.Contains(ctype, "text/html") {
		t.Fatalf("код %d, тип %s", code, ctype)
	}
	if !strings.Contains(body, `<script src="/desktop.js"></script>`) {
		t.Fatal("мост desktop.js не подключён")
	}
	if !strings.Contains(body, "js/version.js") {
		t.Fatal("index.html повреждён")
	}
}

func TestStaticAssets(t *testing.T) {
	ts := testServer(t)
	for _, p := range []string{"/js/app.js", "/css/app.css", "/js/data/gaps2.js", "/js/data/wifi-power.js"} {
		code, _, ctype := get(t, ts.URL+p)
		if code != 200 {
			t.Errorf("%s → код %d", p, code)
			continue
		}
		if !strings.HasPrefix(ctype, "text/javascript") && !strings.HasPrefix(ctype, "text/css") {
			t.Errorf("%s → тип %s", p, ctype)
		}
	}
	if code, _, _ := get(t, ts.URL+"/no-such-file.js"); code != 404 {
		t.Errorf("несуществующий файл → код %d", code)
	}
}

func TestVersionJS(t *testing.T) {
	ts := testServer(t)
	_, body, ctype := get(t, ts.URL+"/js/version.js")
	if !strings.HasPrefix(ctype, "text/javascript") {
		t.Fatalf("тип %s", ctype)
	}
	for _, want := range []string{"window.APP_VERSION = \"1.0.51\"", "window.APP_VERSION_CODE = 51", "windows"} {
		if !strings.Contains(body, want) {
			t.Errorf("в version.js нет %q:\n%s", want, body)
		}
	}
}

func TestDesktopJSGetsToken(t *testing.T) {
	ts := testServer(t)
	_, body, _ := get(t, ts.URL+"/desktop.js")
	if strings.Contains(body, "__MTG_TOKEN__") {
		t.Fatal("токен не подставлен")
	}
	if !strings.Contains(body, "window.MTG") {
		t.Fatal("мост desktop.js пуст")
	}
}

func TestApplyRequiresToken(t *testing.T) {
	ts := testServer(t)
	resp, err := http.Post(ts.URL+"/api/update/apply", "application/json", strings.NewReader("{}"))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("без токена код %d", resp.StatusCode)
	}
}

func TestInjectDesktop(t *testing.T) {
	got := injectDesktop("<html><body><p>x</p></body></html>")
	if !strings.Contains(got, `src="/desktop.js"`) {
		t.Fatal("скрипт не вставлен")
	}
	if strings.Count(got, "desktop.js") != 1 {
		t.Fatal("скрипт вставлен дважды")
	}
	if injectDesktop(got) != got {
		t.Fatal("повторная вставка изменила документ")
	}
}
