package main

import (
	"bufio"
	"crypto/md5"
	"encoding/hex"
	"net"
	"strings"
	"testing"
	"time"
)

/* rosapi_server_test.go — проверка протокола API на настоящем TCP-соединении.
   Поднимаем «мини-роутер» на 127.0.0.1 и прогоняем через него вход и команды:
   так тестируется не только разбор строк, но и обмен пакетами. */

type fakeROS struct {
	ln        net.Listener
	user      string
	pass      string
	challenge bool // старый протокол: challenge в =ret=
	rows      map[string][]map[string]string
}

func newFakeROS(t *testing.T, challenge bool) *fakeROS {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("слушатель: %v", err)
	}
	f := &fakeROS{ln: ln, user: "admin", pass: "secret", challenge: challenge,
		rows: map[string][]map[string]string{
			"/system/resource": {{"version": "7.24.6", "board-name": "RB951G-2HnD"}},
			"/system/routerboard": {{"current-firmware": "6.49.13", "upgrade-firmware": "6.49.13"}},
		}}
	go f.serve()
	t.Cleanup(func() { _ = ln.Close() })
	return f
}

func (f *fakeROS) addr() (string, int) {
	tcp := f.ln.Addr().(*net.TCPAddr)
	return tcp.IP.String(), tcp.Port
}

func (f *fakeROS) serve() {
	for {
		conn, err := f.ln.Accept()
		if err != nil {
			return
		}
		go f.handle(conn)
	}
}

func (f *fakeROS) handle(conn net.Conn) {
	defer func() { _ = conn.Close() }()
	br := bufio.NewReader(conn)
	var pendingChallenge string
	authed := false
	for {
		words, err := readSentenceFrom(br)
		if err != nil {
			return
		}
		if len(words) == 0 {
			continue
		}
		cmd := words[0]
		attrs := rosAttrs(words[1:])
		switch {
		case cmd == "/login" && len(words) == 1:
			if f.challenge {
				pendingChallenge = "a1b2c3d4e5f60718"
				_ = writeSentence(conn, "!done", "=ret="+pendingChallenge)
				continue
			}
			_ = writeSentence(conn, "!done")
		case cmd == "/login":
			if f.challenge {
				want := challengeResponse(f.pass, pendingChallenge)
				if attrs["response"] == want && attrs["name"] == f.user {
					authed = true
					_ = writeSentence(conn, "!done")
					continue
				}
				_ = writeSentence(conn, "!trap", "=message=invalid user name or password")
				continue
			}
			if attrs["name"] == f.user && attrs["password"] == f.pass {
				authed = true
				_ = writeSentence(conn, "!done")
				continue
			}
			_ = writeSentence(conn, "!trap", "=message=invalid user name or password")
		case strings.HasSuffix(cmd, "/print"):
			if !authed {
				_ = writeSentence(conn, "!trap", "=message=not logged in")
				continue
			}
			path := strings.TrimSuffix(cmd, "/print")
			rows, ok := f.rows[path]
			if !ok {
				_ = writeSentence(conn, "!done")
				continue
			}
			for _, row := range rows {
				reply := []string{"!re"}
				for k, v := range row {
					reply = append(reply, "="+k+"="+v)
				}
				if err := writeSentence(conn, reply...); err != nil {
					return
				}
			}
			_ = writeSentence(conn, "!done")
		default:
			_ = writeSentence(conn, "!trap", "=message=no such command")
		}
	}
}

func challengeResponse(pass, challenge string) string {
	ch, err := hex.DecodeString(challenge)
	if err != nil {
		return ""
	}
	h := md5.New()
	h.Write([]byte{0})
	h.Write([]byte(pass))
	h.Write(ch)
	return "00" + hex.EncodeToString(h.Sum(nil))
}

func TestAPIProtocolNewLogin(t *testing.T) {
	f := newFakeROS(t, false)
	host, port := f.addr()
	c, err := rosDial(host, port, false, 5*time.Second)
	if err != nil {
		t.Fatalf("соединение: %v", err)
	}
	defer func() { _ = c.Close() }()
	if err := c.login("admin", "secret"); err != nil {
		t.Fatalf("вход: %v", err)
	}
	rows, err := c.command("/system/resource/print")
	if err != nil {
		t.Fatalf("команда: %v", err)
	}
	if len(rows) != 1 || rows[0]["version"] != "7.24.6" {
		t.Fatalf("ответ роутера: %v", rows)
	}
	// паспорт целиком, как его увидит приложение
	info, err := collectRouter(apiSource{c: c}, &rosProbeInfo{Address: host, Transport: "api"})
	if err != nil {
		t.Fatalf("паспорт: %v", err)
	}
	if info.Version != "7.24.6" || info.Board != "RB951G-2HnD" || info.Firmware != "6.49.13" {
		t.Fatalf("паспорт собран неверно: %+v", info)
	}
}

func TestAPIProtocolWrongPassword(t *testing.T) {
	f := newFakeROS(t, false)
	host, port := f.addr()
	c, err := rosDial(host, port, false, 5*time.Second)
	if err != nil {
		t.Fatalf("соединение: %v", err)
	}
	defer func() { _ = c.Close() }()
	err = c.login("admin", "неверный")
	if err == nil {
		t.Fatal("ожидали ошибку входа")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "password") {
		t.Fatalf("неожиданный текст ошибки: %v", err)
	}
	if _, err := c.command("/system/resource/print"); err == nil {
		t.Fatal("без входа команды выполняться не должны")
	}
}

func TestAPIProtocolChallengeLogin(t *testing.T) {
	f := newFakeROS(t, true)
	host, port := f.addr()
	c, err := rosDial(host, port, false, 5*time.Second)
	if err != nil {
		t.Fatalf("соединение: %v", err)
	}
	defer func() { _ = c.Close() }()
	if err := c.login("admin", "secret"); err != nil {
		t.Fatalf("вход по challenge (RouterOS 6.42 и ниже): %v", err)
	}
	rows, err := c.command("/system/resource/print")
	if err != nil || len(rows) != 1 {
		t.Fatalf("команда после входа: %v / %v", rows, err)
	}
	if rows[0]["version"] != "7.24.6" {
		t.Fatalf("версия: %v", rows[0])
	}
}

func TestRouterWordLengthRoundTrip(t *testing.T) {
	for _, size := range []int{0, 1, 127, 128, 16383, 16384, 100000} {
		word := strings.Repeat("a", size)
		var buf strings.Builder
		if err := writeSentence(&buf, word, "x"); err != nil {
			t.Fatalf("запись %d: %v", size, err)
		}
		if size == 0 {
			continue // пустое слово — это конец предложения, отдельно не проверяем
		}
		got, err := readSentenceFrom(bufio.NewReader(strings.NewReader(buf.String())))
		if err != nil {
			t.Fatalf("чтение %d: %v", size, err)
		}
		if len(got) != 2 || got[0] != word || got[1] != "x" {
			t.Fatalf("слово длиной %d исказилось (получили %d слов, первое длиной %d)",
				size, len(got), len(got[0]))
		}
	}
}
