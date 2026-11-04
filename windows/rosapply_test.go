package main

import (
	"strconv"
	"strings"
	"testing"
	"time"
)

/* rosapply_test.go — разбор конфига, план изменений и настоящее применение
   через фейковый роутер на TCP. */

func TestParseConfigLine(t *testing.T) {
	cases := []struct {
		line   string
		path   string
		action string
		args   map[string]string
		script bool
		ignore bool
		ok     bool
	}{
		{line: "# комментарий", ok: false},
		{line: "   ", ok: false},
		{line: "/ip address add address=192.168.88.1/24 interface=bridge-lan",
			path: "/ip address", action: "add",
			args: map[string]string{"address": "192.168.88.1/24", "interface": "bridge-lan"}, ok: true},
		{line: `/interface bridge add name=bridge-lan comment="Основной мост"`,
			path: "/interface bridge", action: "add",
			args: map[string]string{"name": "bridge-lan", "comment": "Основной мост"}, ok: true},
		{line: "/ip service disable telnet,ftp,www",
			path: "/ip service", action: "disable",
			args: map[string]string{"numbers": "telnet,ftp,www"}, ok: true},
		{line: ":do {/ip firewall filter add chain=input action=drop} on-error={}",
			path: "/ip firewall filter", action: "add",
			args: map[string]string{"chain": "input", "action": "drop"}, ignore: true, ok: true},
		{line: `:if ([:len [/ip firewall address-list find where list=blocked]] = 0) do={/ip firewall address-list add list=blocked address=0.0.0.0/8}`,
			path: "/ip firewall address-list", action: "add",
			args: map[string]string{"list": "blocked", "address": "0.0.0.0/8"}, ignore: true, ok: true},
		{line: ":local rosVer [/system resource get version]", script: true, ok: true},
		{line: "/system note set show-at-login=no", path: "/system note", action: "set",
			args: map[string]string{"show-at-login": "no"}, ok: true},
	}
	for _, c := range cases {
		cmd, ok := parseConfigLine(c.line)
		if ok != c.ok {
			t.Errorf("%q: разобралось=%v, хотели %v", c.line, ok, c.ok)
			continue
		}
		if !ok {
			continue
		}
		if cmd.Script != c.script {
			t.Errorf("%q: script=%v, хотели %v", c.line, cmd.Script, c.script)
		}
		if c.script {
			continue
		}
		if cmd.Path != c.path || cmd.Action != c.action {
			t.Errorf("%q: путь/действие = %q/%q, хотели %q/%q", c.line, cmd.Path, cmd.Action, c.path, c.action)
		}
		if cmd.Ignore != c.ignore {
			t.Errorf("%q: ignore=%v, хотели %v", c.line, cmd.Ignore, c.ignore)
		}
		for k, v := range c.args {
			if cmd.Args[k] != v {
				t.Errorf("%q: аргумент %s = %q, хотели %q", c.line, k, cmd.Args[k], v)
			}
		}
	}
}

func TestPlanConfig(t *testing.T) {
	snapshot := map[string][]map[string]string{
		"/ip address":       {{"address": "192.168.88.1/24", "interface": "bridge-lan"}},
		"/interface bridge": {{"name": "bridge-lan"}},
	}
	text := strings.Join([]string{
		"# шапка",
		"/interface bridge add name=bridge-lan",
		"/interface bridge add name=bridge-guest",
		"/ip address add address=192.168.88.1/24 interface=bridge-lan",
		"/ip address add address=192.168.20.1/24 interface=bridge-guest",
		"/ip service disable telnet",
		"/ip route print",
		":put \"привет\"",
	}, "\n")
	items := planConfig(text, snapshot)
	kinds := map[string]string{}
	for _, it := range items {
		kinds[strings.TrimSpace(it.Raw)] = it.Kind
	}
	want := map[string]string{
		"/interface bridge add name=bridge-lan":                          "exists",
		"/interface bridge add name=bridge-guest":                        "create",
		"/ip address add address=192.168.88.1/24 interface=bridge-lan":   "exists",
		"/ip address add address=192.168.20.1/24 interface=bridge-guest": "create",
		"/ip service disable telnet":                                     "update",
		"/ip route print":                                                "read",
		":put \"привет\"":                                                "script",
	}
	for raw, kind := range want {
		if kinds[raw] != kind {
			t.Errorf("%q: вид = %q, хотели %q", raw, kinds[raw], kind)
		}
	}
	if len(items) != len(want) {
		t.Errorf("строк в плане: %d, хотели %d", len(items), len(want))
	}
}

func TestApplyConfigAgainstFakeRouter(t *testing.T) {
	f := newFakeROS(t, false)
	f.fail["/ip/dns/set"] = "already have such entry"
	host, port := f.addr()
	target := host + ":" + strconv.Itoa(port)

	text := strings.Join([]string{
		"# конфиг мастера",
		"/interface bridge add name=bridge-lan",
		"/ip address add address=192.168.88.1/24 interface=bridge-lan",
		"/ip dns set servers=1.1.1.1",
		"/ip service disable telnet,ftp",
		"/ip route print",
		":local x 1",
	}, "\n")

	results, err := rosApply(target, "admin", "secret", text, false)
	if err != nil {
		t.Fatalf("применение: %v", err)
	}
	statuses := map[string]string{}
	for _, r := range results {
		statuses[r.Raw] = r.Status
	}
	hasBackup := false
	for _, r := range results {
		if strings.Contains(r.Message, "бэкап перед изменениями") {
			hasBackup = true
		}
	}
	if !hasBackup {
		t.Errorf("перед применением должен делаться бэкап: %v", results)
	}
	if len(results) < 5 {
		t.Fatalf("строк в отчёте: %d (%v)", len(results), statuses)
	}
	if statuses["/interface bridge add name=bridge-lan"] != "ok" {
		t.Errorf("мост: %q", statuses["/interface bridge add name=bridge-lan"])
	}
	if statuses["/ip dns set servers=1.1.1.1"] != "exists" {
		t.Errorf("«уже есть» должно считаться нормой, получили %q", statuses["/ip dns set servers=1.1.1.1"])
	}
	if statuses["/ip route print"] != "skipped" {
		t.Errorf("print не должен отправляться: %q", statuses["/ip route print"])
	}
	hasScript := false
	for _, r := range results {
		if r.Status == "script" {
			hasScript = true
		}
	}
	if !hasScript {
		t.Error("выражение :local должно уйти отдельным скриптом")
	}

	sent := strings.Join(f.commands(), "\n")
	for _, want := range []string{
		"/system/backup/save",
		"/interface/bridge/add",
		"/ip/address/add",
		"/ip/service/disable",
		"/system/script/add",
		"/system/script/run",
		"/system/script/remove",
	} {
		if !strings.Contains(sent, want) {
			t.Errorf("на роутер не ушло: %s\nотправлено:\n%s", want, sent)
		}
	}
	if strings.Contains(sent, "/ip/route/print") {
		t.Error("команда только для чтения всё-таки отправлена")
	}
}

func TestApplyConfigWrongPassword(t *testing.T) {
	f := newFakeROS(t, false)
	host, port := f.addr()
	_, err := rosApply(host+":"+strconv.Itoa(port), "admin", "неверный", "/ip address print", false)
	if err == nil {
		t.Fatal("ожидали ошибку входа")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "пароль") {
		t.Fatalf("текст ошибки: %v", err)
	}
}

func TestSplitTarget(t *testing.T) {
	cases := []struct {
		in   string
		host string
		port int
	}{
		{"192.168.88.1", "192.168.88.1", 0},
		{"192.168.88.1:8728", "192.168.88.1", 8728},
		{"https://192.168.88.1:8729/rest", "192.168.88.1", 8729},
		{" 10.0.0.1 ", "10.0.0.1", 0},
	}
	for _, c := range cases {
		host, port := splitTarget(c.in)
		if host != c.host || port != c.port {
			t.Errorf("splitTarget(%q) = %q/%d, хотели %q/%d", c.in, host, port, c.host, c.port)
		}
	}
}

func TestTokenizeLine(t *testing.T) {
	got := tokenizeLine(`/ip firewall filter add comment="два слова" chain=input`)
	want := []string{"/ip", "firewall", "filter", "add", "comment=два слова", "chain=input"}
	if len(got) != len(want) {
		t.Fatalf("слов: %v", got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("слово %d = %q, хотели %q", i, got[i], want[i])
		}
	}
}

// роутер, который не понимает слэш-форму пути, должен получить форму с пробелами
func TestRunCommandFallbackToSpaces(t *testing.T) {
	f := newFakeROS(t, false)
	f.fail["/ip/dns/set"] = "no such command"
	host, port := f.addr()
	c, err := rosDial(host, port, false, 5*time.Second)
	if err != nil {
		t.Fatalf("соединение: %v", err)
	}
	defer func() { _ = c.Close() }()
	if err := c.login("admin", "secret"); err != nil {
		t.Fatalf("вход: %v", err)
	}
	if _, err := c.runCommand("/ip dns set", "=servers=1.1.1.1"); err != nil {
		t.Fatalf("запасная форма пути не сработала: %v", err)
	}
	sent := strings.Join(f.commands(), "\n")
	if !strings.Contains(sent, "/ip/dns/set") || !strings.Contains(sent, "/ip dns set") {
		t.Fatalf("ожидали две попытки, отправлено:\n%s", sent)
	}
}

func TestAPIPath(t *testing.T) {
	cases := map[string]string{
		"/ip address print":                           "/ip/address/print",
		"/interface wireless security-profiles print": "/interface/wireless/security-profiles/print",
		"/system package update check-for-updates":    "/system/package/update/check-for-updates",
		"/system/resource/print":                      "/system/resource/print",
	}
	for in, want := range cases {
		if got := apiPath(in); got != want {
			t.Errorf("apiPath(%q) = %q, хотели %q", in, got, want)
		}
	}
}
