package main

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"net"
	"strings"
	"testing"
)

func TestRosWordLength(t *testing.T) {
	cases := []struct {
		n    int
		want []byte
	}{
		{0, []byte{0}},
		{5, []byte{5}},
		{0x80, []byte{0x80, 0x80}},
		{0x1234, []byte{0x92, 0x34}},
	}
	for _, c := range cases {
		got := rosWordLength(c.n)
		if !bytes.Equal(got, c.want) {
			t.Errorf("rosWordLength(%d) = %v, хотели %v", c.n, got, c.want)
		}
	}
}

func TestParseVersion(t *testing.T) {
	cases := []struct {
		in           string
		major, minor int
		patch        int
	}{
		{"7.24.6", 7, 24, 6},
		{"6.49.13 (stable)", 6, 49, 13},
		{"7.13", 7, 13, 0},
		{"", 0, 0, 0},
	}
	for _, c := range cases {
		major, minor, patch := parseVersion(c.in)
		if major != c.major || minor != c.minor || patch != c.patch {
			t.Errorf("parseVersion(%q) = %d.%d.%d, хотели %d.%d.%d",
				c.in, major, minor, patch, c.major, c.minor, c.patch)
		}
	}
}

func TestRosAttrs(t *testing.T) {
	m := rosAttrs([]string{"=.id=*1", "=name=ether1", "=disabled=false", "мусор"})
	if m["name"] != "ether1" || m["disabled"] != "false" || m[".id"] != "*1" {
		t.Fatalf("не разобрал атрибуты: %v", m)
	}
}

func TestNormalizeAddress(t *testing.T) {
	cases := map[string]string{
		"https://192.168.88.1/rest": "192.168.88.1",
		" 192.168.88.1 ":            "192.168.88.1",
		"192.168.88.1:8728":         "192.168.88.1",
		"10.0.0.1/24":               "10.0.0.1",
	}
	for in, want := range cases {
		if got := normalizeAddress(in); got != want {
			t.Errorf("normalizeAddress(%q) = %q, хотели %q", in, got, want)
		}
	}
}

// fakeSource подменяет роутер: отдаёт заранее записанные ответы.
type fakeSource struct {
	data map[string][]map[string]string
	err  map[string]error
}

func (f fakeSource) fetch(path string) ([]map[string]string, error) {
	if e, ok := f.err[path]; ok {
		return nil, e
	}
	return f.data[path], nil
}

func TestCollectRouter(t *testing.T) {
	src := fakeSource{data: map[string][]map[string]string{
		"/system/resource": {{"version": "7.24.6", "board-name": "RB951G-2HnD", "architecture-name": "mipsbe", "uptime": "1w2d"}},
		"/system/routerboard": {{"current-firmware": "6.49.13", "upgrade-firmware": "6.49.13",
			"model": "RB951G-2HnD", "serial-number": "6E1C05A1B2C3"}},
		"/system/identity":    {{"name": "home-gw"}},
		"/system/package":     {{"name": "routeros"}, {"name": "wireless"}},
		"/interface":          {{"name": "ether1", "type": "ether"}, {"name": "wlan1", "type": "wlan"}},
		"/interface/wireless": {{"name": "wlan1", "band": "2ghz-b/g/n"}},
		"/ip/service":         {{"name": "winbox", "address": "192.168.88.0/24"}, {"name": "telnet", "disabled": "true"}},
	}, err: map[string]error{"/interface/wifi": errors.New("нет такого меню")}}

	info, err := collectRouter(src, &rosProbeInfo{Address: "192.168.88.1"})
	if err != nil {
		t.Fatalf("collectRouter: %v", err)
	}
	if info.Version != "7.24.6" || info.Major != 7 || info.Minor != 24 {
		t.Errorf("версия разобрана неверно: %q (%d.%d)", info.Version, info.Major, info.Minor)
	}
	if info.Board != "RB951G-2HnD" || info.Firmware != "6.49.13" {
		t.Errorf("плата/прошивка: %q / %q", info.Board, info.Firmware)
	}
	if info.Wifi != "legacy" || len(info.Radios) != 1 || info.Radios[0] != "wlan1" {
		t.Errorf("Wi-Fi определён неверно: %q %v", info.Wifi, info.Radios)
	}
	if info.Wifi5 {
		t.Errorf("у RB951G нет 5 ГГц, а получили Wifi5=true")
	}
	if len(info.Ports) != 1 || info.Ports[0] != "ether1" {
		t.Errorf("порты: %v", info.Ports)
	}
	if len(info.Services) != 1 || info.Services[0] != "winbox (192.168.88.0/24)" {
		t.Errorf("сервисы: %v", info.Services)
	}
	if info.Uptime != "1w2d" || info.Identity != "home-gw" {
		t.Errorf("uptime/identity: %q / %q", info.Uptime, info.Identity)
	}
}

func TestCollectRouterNoVersion(t *testing.T) {
	src := fakeSource{data: map[string][]map[string]string{
		"/system/resource": {{"board-name": "x"}},
	}}
	if _, err := collectRouter(src, &rosProbeInfo{}); err == nil {
		t.Fatal("ожидали ошибку, когда роутер не отдал версию")
	}
}

func mndpPacket(fields map[uint16]string) []byte {
	var buf bytes.Buffer
	buf.Write([]byte{0, 0, 0, 1}) // заголовок: версия 0, TTL 1
	for typ, val := range fields {
		var hdr [4]byte
		binary.BigEndian.PutUint16(hdr[0:2], typ)
		binary.BigEndian.PutUint16(hdr[2:4], uint16(len(val)))
		buf.Write(hdr[:])
		buf.WriteString(val)
	}
	return buf.Bytes()
}

func TestParseMNDP(t *testing.T) {
	pkt := mndpPacket(map[uint16]string{2: "office-gw", 3: "7.16.2", 4: "MikroTik", 7: "RB4011iGS+"})
	got, ok := parseMNDP(pkt)
	if !ok {
		t.Fatalf("корректный пакет не разобран: %v", got)
	}
	if got["identity"] != "office-gw" || got["version"] != "7.16.2" || got["board"] != "RB4011iGS+" {
		t.Fatalf("MNDP разобран неверно: %v", got)
	}
	if _, ok := parseMNDP([]byte{1, 2, 3}); ok {
		t.Fatal("на мусоре парсер должен вернуть false")
	}
}

// Ошибка «находит адреса не из этой сети» возникала из-за «подбора» смещений:
// случайные байты выдавались за IP. Строгий разбор обязан отбраковывать
// пакеты с неверной длиной TLV, а не показывать их как роутер.
func TestParseMNDPStrict(t *testing.T) {
	// длина больше, чем осталось в пакете
	broken := []byte{0, 0, 0, 1, 0, 2, 0, 40, 'a', 'b'}
	if _, ok := parseMNDP(broken); ok {
		t.Fatal("пакет с длиной за границей буфера принят")
	}
	// MAC должен быть ровно 6 байт
	badMAC := []byte{0, 0, 0, 1, 0, 1, 0, 4, 1, 2, 3, 4}
	if _, ok := parseMNDP(badMAC); ok {
		t.Fatal("MAC длиной 4 байта принят")
	}
	// неизвестный тип (0) — не наш пакет
	if _, ok := parseMNDP([]byte{0, 0, 0, 1, 0, 0, 0, 1, 9}); ok {
		t.Fatal("пакет с типом TLV 0 принят")
	}
	// нулевой IP не должен выдаваться за адрес роутера
	zeroIP := []byte{0, 0, 0, 1, 0, 11, 0, 4, 0, 0, 0, 0}
	if _, ok := parseMNDP(zeroIP); ok {
		t.Fatal("адрес 0.0.0.0 принят за IP роутера")
	}
	// нормальный IP и MAC — читаются
	good := append([]byte{0, 0, 0, 1}, []byte{0, 1, 0, 6, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff}...)
	good = append(good, []byte{0, 11, 0, 4, 192, 168, 88, 1}...)
	m, ok := parseMNDP(good)
	if !ok || m["ip"] != "192.168.88.1" || m["mac"] != "aa:bb:cc:dd:ee:ff" {
		t.Fatalf("верный пакет разобран как %v (ok=%v)", m, ok)
	}
}

// Виртуальные адаптеры и их подсети не должны попадать в поиск:
// иначе в списке появляются 172.17.0.1 (Docker), 192.168.56.1 (VirtualBox)
// и прочие адреса «не из этой сети».
func TestUsableLocalAddr(t *testing.T) {
	cases := []struct {
		iface string
		ip    string
		want  bool
	}{
		{"Ethernet", "192.168.88.10", true},
		{"Беспроводная сеть", "192.168.1.5", true},
		{"vEthernet (Default Switch)", "172.17.0.1", false},
		{"vEthernet (WSL)", "172.20.0.1", false},
		{"VirtualBox Host-Only Network", "192.168.56.1", false},
		{"Ethernet 2", "192.168.56.1", false}, // диапазон VirtualBox важнее имени
		{"Ethernet 3", "169.254.10.5", false}, // APIPA
		{"Ethernet 4", "8.8.8.8", false},      // не приватный
		{"Docker Desktop", "10.0.0.5", false},
		{"Wi-Fi", "172.25.3.4", false}, // 172.16/12 — виртуальные сети
	}
	for _, c := range cases {
		ip := net.ParseIP(c.ip)
		if got := usableLocalAddr(c.iface, ip); got != c.want {
			t.Errorf("%s (%s): получено %v, ожидали %v", c.iface, c.ip, got, c.want)
		}
	}
}

// Запрос MNDP надо слать на широковещательный адрес каждой подсети,
// иначе пакет уходит только через интерфейс по умолчанию.
func TestBroadcastOf(t *testing.T) {
	_, n, err := net.ParseCIDR("192.168.88.0/24")
	if err != nil {
		t.Fatalf("cidr: %v", err)
	}
	if got := broadcastOf(n).String(); got != "192.168.88.255" {
		t.Fatalf("широковещательный адрес %s, ожидали 192.168.88.255", got)
	}
}

// Жалоба «пароль верный, а программа говорит про пароль»: RouterOS отдаёт
// один и тот же текст при отсутствии политики api, при ограничении адреса,
// при 2FA и при неверном пароле. Подсказки обязаны перечислять все варианты
// и содержать готовые команды с именем пользователя.
func TestLoginRefusedHints(t *testing.T) {
	hints := strings.Join(loginRefusedHints("csladmin"), " | ")
	for _, want := range []string{
		"policy",                                 // политика api у группы
		"name=csladmin",                          // ограничение адреса у конкретного пользователя
		"address",                                // поле address
		"192.168.88.0/24",                        // типичный остаток после смены подсети
		"TOTP",                                   // двухфакторный вход
		"/user set csladmin password=Test123456", // безопасная проверка пароля
		"apiuser",                                // контрольный пользователь
		"/log print",                             // журнал роутера
	} {
		if !strings.Contains(hints, want) {
			t.Errorf("в подсказках нет %q:\n%s", want, hints)
		}
	}
	if empty := strings.Join(loginRefusedHints(""), " | "); !strings.Contains(empty, "name=admin") {
		t.Errorf("без имени пользователя подсказка должна подставлять admin: %s", empty)
	}

	// Итоговая ошибка при отказе API собирает эти подсказки и не называет
	// виноватым только пароль.
	e := newProbeError("192.168.90.1", "csladmin", []rosAttempt{
		{Transport: "rest", Port: 443, Kind: kindProtocol, Detail: "tls: handshake failure"},
		{Transport: "api", Port: 8728, Stage: "login", Kind: kindAuth,
			Detail: "роутер: invalid user name or password (6)"},
	})
	if e.Kind != kindAuth {
		t.Fatalf("вид %q, ожидали auth", e.Kind)
	}
	if !strings.Contains(e.Message, "не всегда пароль") {
		t.Errorf("сообщение снова сводит всё к паролю: %q", e.Message)
	}
	if !strings.Contains(strings.Join(e.Hints, " | "), "policy") {
		t.Errorf("в подсказках нет политики api: %v", e.Hints)
	}
}

// Разбор отказа роутера: «неверный пароль» и «нет прав» — разные ситуации,
// и человеку нужны разные подсказки.
func TestClassifyTrap(t *testing.T) {
	cases := []struct {
		msg  string
		kind string
	}{
		{"invalid user name or password (6)", kindAuth},
		{"user admin has no api policy", kindPermission},
		{"not allowed (9)", kindPermission},
		{"too many failed logins", kindAuth},
	}
	for _, c := range cases {
		kind, detail := classifyTrap(c.msg)
		if kind != c.kind {
			t.Errorf("%q: вид %q, ожидали %q", c.msg, kind, c.kind)
		}
		if !strings.Contains(detail, strings.Split(c.msg, " ")[0]) {
			t.Errorf("%q: в подробностях потерян текст роутера: %q", c.msg, detail)
		}
	}
}

// Итоговая ошибка должна выбирать самый осмысленный вид: если один путь
// закрыт, а другой сказал «пароль не тот» — показываем «пароль».
func TestNewProbeErrorPrefersAuth(t *testing.T) {
	e := newProbeError("192.168.88.1", "csladmin", []rosAttempt{
		{Transport: "rest", Port: 443, Kind: kindConnect, Detail: "порт закрыт"},
		{Transport: "api", Port: 8728, Stage: "login", Kind: kindAuth, Detail: "роутер: invalid user name or password (6)"},
	})
	if e.Kind != kindAuth {
		t.Fatalf("вид %q, ожидали %q", e.Kind, kindAuth)
	}
	if len(e.Hints) == 0 {
		t.Fatal("без подсказок человек не поймёт, что делать")
	}
	if !strings.Contains(attemptsText(e.Attempts), "api(8728)") {
		t.Fatalf("в журнале нет разбора попыток: %q", attemptsText(e.Attempts))
	}
}

func TestFlattenRows(t *testing.T) {
	var v interface{}
	if err := json.Unmarshal([]byte(`[{"name":"ether1","disabled":false,"mtu":1500,"addresses":["1.2.3.4/24"]}]`), &v); err != nil {
		t.Fatalf("json: %v", err)
	}
	rows := flattenRows(v)
	if len(rows) != 1 {
		t.Fatalf("строк: %d", len(rows))
	}
	r := rows[0]
	if r["name"] != "ether1" || r["disabled"] != "false" || r["mtu"] != "1500" || r["addresses"] != "1.2.3.4/24" {
		t.Fatalf("flattenRows: %v", r)
	}
}
