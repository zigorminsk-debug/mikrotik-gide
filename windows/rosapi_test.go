package main

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
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
	got := parseMNDP(pkt)
	if got["identity"] != "office-gw" || got["version"] != "7.16.2" || got["board"] != "RB4011iGS+" {
		t.Fatalf("MNDP разобран неверно: %v", got)
	}
	if len(parseMNDP([]byte{1, 2, 3})) != 0 {
		t.Fatal("на мусоре парсер должен вернуть пусто")
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
