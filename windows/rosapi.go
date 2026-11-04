package main

import (
	"bufio"
	"crypto/md5"
	"crypto/tls"
	"encoding/hex"
	"errors"
	"io"
	"net"
	"strconv"
	"strings"
	"time"
)

/* rosapi.go — клиент протокола MikroTik API (порты 8728 / 8729).
   Своя реализация на стандартной библиотеке: не тянем сторонние пакеты
   в сборку Windows-версии, а протокол простой — слова с префиксом длины.

   Пример:
       c, err := rosDial("192.168.88.1", 8728, false, 5*time.Second)
       if err == nil { err = c.login("admin", "пароль"); rows, _ := c.command("/system/resource/print") }
*/

// rosConn — соединение с RouterOS по протоколу API.
type rosConn struct {
	conn net.Conn
	br   *bufio.Reader
	// время ожидания ответа; некоторые команды (check-for-updates) отвечают
	// дольше обычного, поэтому таймаут можно поднять
	readTimeout time.Duration
}

// setTimeout поднимает время ожидания ответа для долгих команд.
func (c *rosConn) setTimeout(d time.Duration) { c.readTimeout = d }

// rosWordLength кодирует длину слова протокола API.
func rosWordLength(n int) []byte {
	switch {
	case n < 0x80:
		return []byte{byte(n)}
	case n < 0x4000:
		return []byte{byte(n>>8) | 0x80, byte(n)}
	case n < 0x200000:
		return []byte{byte(n>>16) | 0xC0, byte(n >> 8), byte(n)}
	case n < 0x10000000:
		return []byte{byte(n>>24) | 0xE0, byte(n >> 16), byte(n >> 8), byte(n)}
	default:
		return []byte{0xF0, byte(n >> 24), byte(n >> 16), byte(n >> 8), byte(n)}
	}
}

// rosReadLength читает префикс длины слова.
func rosReadLength(br *bufio.Reader) (int, error) {
	b0, err := br.ReadByte()
	if err != nil {
		return 0, err
	}
	switch {
	case b0&0x80 == 0:
		return int(b0), nil
	case b0&0xC0 == 0x80:
		b1, err := br.ReadByte()
		if err != nil {
			return 0, err
		}
		return int(b0&0x3F)<<8 | int(b1), nil
	case b0&0xE0 == 0xC0:
		var b [2]byte
		if _, err := io.ReadFull(br, b[:]); err != nil {
			return 0, err
		}
		return int(b0&0x1F)<<16 | int(b[0])<<8 | int(b[1]), nil
	case b0&0xF0 == 0xE0:
		var b [3]byte
		if _, err := io.ReadFull(br, b[:]); err != nil {
			return 0, err
		}
		return int(b0&0x0F)<<24 | int(b[0])<<16 | int(b[1])<<8 | int(b[2]), nil
	default:
		var b [4]byte
		if _, err := io.ReadFull(br, b[:]); err != nil {
			return 0, err
		}
		return int(b[0])<<24 | int(b[1])<<16 | int(b[2])<<8 | int(b[3]), nil
	}
}

// writeSentence отправляет одно предложение (набор слов).
// Отдельная функция, чтобы тем же кодом можно было отвечать в тестовом сервере.
func writeSentence(w io.Writer, words ...string) error {
	buf := make([]byte, 0, 128)
	for _, word := range words {
		buf = append(buf, rosWordLength(len(word))...)
		buf = append(buf, word...)
	}
	buf = append(buf, 0) // конец предложения
	_, err := w.Write(buf)
	return err
}

// sendSentence отправляет одну команду (набор слов).
func (c *rosConn) sendSentence(words ...string) error {
	_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	return writeSentence(c.conn, words...)
}

// readSentence читает одно предложение (до пустого слова).
// Таймаут ставится на каждое чтение: один общий дедлайн на соединение
// обрывал опрос, если роутер отвечал по частям дольше нескольких секунд.
func (c *rosConn) readSentence() ([]string, error) {
	wait := c.readTimeout
	if wait <= 0 {
		wait = 15 * time.Second
	}
	_ = c.conn.SetReadDeadline(time.Now().Add(wait))
	return readSentenceFrom(c.br)
}

// readSentenceFrom читает предложение из любого потока.
func readSentenceFrom(br *bufio.Reader) ([]string, error) {
	var words []string
	for {
		n, err := rosReadLength(br)
		if err != nil {
			return words, err
		}
		if n == 0 {
			return words, nil
		}
		if n > 1<<20 {
			return words, errors.New("слишком длинное слово в ответе роутера")
		}
		w := make([]byte, n)
		if _, err := io.ReadFull(br, w); err != nil {
			return words, err
		}
		words = append(words, string(w))
	}
}

func rosDial(address string, port int, useTLS bool, timeout time.Duration) (*rosConn, error) {
	addr := net.JoinHostPort(address, strconv.Itoa(port))
	d := net.Dialer{Timeout: timeout}
	var (
		conn net.Conn
		err  error
	)
	if useTLS {
		// RouterOS по умолчанию отдаёт самоподписанный сертификат — проверять
		// его нечем, а соединение идёт внутри локальной сети.
		conn, err = tls.DialWithDialer(&d, "tcp", addr, &tls.Config{InsecureSkipVerify: true})
	} else {
		conn, err = d.Dial("tcp", addr)
	}
	if err != nil {
		return nil, err
	}
	_ = conn.SetDeadline(time.Now().Add(timeout)) // только на первый обмен (login)
	c := &rosConn{conn: conn, br: bufio.NewReader(conn)}
	return c, nil
}

func (c *rosConn) Close() error { return c.conn.Close() }

// rosReplyError превращает !trap/!fatal в ошибку с текстом от роутера.
func rosReplyError(reply []string) error {
	if len(reply) == 0 {
		return nil
	}
	switch reply[0] {
	case "!trap", "!fatal":
	default:
		return nil
	}
	msg := ""
	for _, w := range reply[1:] {
		if strings.HasPrefix(w, "=message=") {
			msg = w[len("=message="):]
		}
	}
	if msg == "" {
		msg = "роутер отклонил команду"
	}
	return errors.New(msg)
}

// rosAttrs разбирает =ключ=значение в карту.
func rosAttrs(words []string) map[string]string {
	m := make(map[string]string, len(words))
	for _, w := range words {
		if !strings.HasPrefix(w, "=") {
			continue
		}
		body := w[1:]
		i := strings.IndexByte(body, '=')
		if i < 0 {
			m[body] = ""
			continue
		}
		m[body[:i]] = body[i+1:]
	}
	return m
}

// login выполняет вход. Поддержаны оба варианта протокола:
// новый (6.43+: /login с name и password) и старый (challenge в =ret=).
func (c *rosConn) login(user, pass string) error {
	user = strings.TrimSpace(user)
	if user == "" {
		user = "admin"
	}
	if err := c.sendSentence("/login"); err != nil {
		return err
	}
	reply, err := c.readSentence()
	if err != nil {
		return err
	}
	ret := ""
	for _, w := range reply {
		if strings.HasPrefix(w, "=ret=") {
			ret = w[len("=ret="):]
		}
	}
	if ret == "" {
		// новый протокол: имя и пароль открытым текстом
		if err := c.sendSentence("/login", "=name="+user, "=password="+pass); err != nil {
			return err
		}
		reply, err = c.readSentence()
		if err != nil {
			return err
		}
		return rosReplyError(reply)
	}
	challenge, err := hex.DecodeString(ret)
	if err != nil {
		return errors.New("роутер прислал непонятный запрос пароля")
	}
	h := md5.New()
	h.Write([]byte{0})
	h.Write([]byte(pass))
	h.Write(challenge)
	resp := "00" + hex.EncodeToString(h.Sum(nil))
	if err := c.sendSentence("/login", "=name="+user, "=response="+resp); err != nil {
		return err
	}
	reply, err = c.readSentence()
	if err != nil {
		return err
	}
	return rosReplyError(reply)
}

// command выполняет команду и возвращает строки ответа (!re).
func (c *rosConn) command(words ...string) ([]map[string]string, error) {
	_ = c.conn.SetDeadline(time.Time{})
	if err := c.sendSentence(words...); err != nil {
		return nil, err
	}
	var rows []map[string]string
	for {
		reply, err := c.readSentence()
		if err != nil {
			return rows, err
		}
		if len(reply) == 0 {
			return rows, nil
		}
		switch reply[0] {
		case "!re":
			rows = append(rows, rosAttrs(reply[1:]))
		case "!done":
			return rows, nil
		case "!trap", "!fatal":
			return rows, rosReplyError(reply)
		}
	}
}

// apiPath переводит команду в форму протокола API: пробелы между уровнями меню
// заменяются слэшами («/ip address print» → «/ip/address/print»). Именно такая
// форма описана в документации RouterOS, а сервер понимает её всегда.
func apiPath(cmd string) string {
	fields := strings.Fields(strings.TrimSpace(cmd))
	if len(fields) == 0 {
		return cmd
	}
	return strings.Join(fields, "/")
}

// apiPathSpaces — та же команда, но с пробелами (запасной вариант).
func apiPathSpaces(cmd string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(cmd)), " ")
}

// runCommand выполняет команду, начиная со слэш-формы пути; если роутер
// не знает такой команды — пробует форму с пробелами.
func (c *rosConn) runCommand(words ...string) ([]map[string]string, error) {
	if len(words) == 0 {
		return nil, errors.New("пустая команда")
	}
	rows, err := c.command(append([]string{apiPath(words[0])}, words[1:]...)...)
	if err == nil {
		return rows, nil
	}
	msg := strings.ToLower(err.Error())
	if strings.Contains(msg, "no such command") || strings.Contains(msg, "bad command name") ||
		strings.Contains(msg, "expected command") {
		return c.command(append([]string{apiPathSpaces(words[0])}, words[1:]...)...)
	}
	return rows, err
}

// apiSource — источник данных через протокол API.
type apiSource struct {
	c *rosConn
}

func (s apiSource) fetch(path string) ([]map[string]string, error) {
	path = strings.TrimSuffix(path, "/print")
	return s.c.runCommand(path + " print")
}

// rosProbeInfo — паспорт роутера, который показывает приложение.
type rosProbeInfo struct {
	Address     string   `json:"address"`
	Transport   string   `json:"transport"` // rest | api | api-ssl | mndp
	Identity    string   `json:"identity"`
	Version     string   `json:"version"`
	Major       int      `json:"major"`
	Minor       int      `json:"minor"`
	Patch       int      `json:"patch"`
	Board       string   `json:"board"`
	Model       string   `json:"model"`
	Arch        string   `json:"arch"`
	Platform    string   `json:"platform"`
	Firmware    string   `json:"firmware"`
	FirmwareNew string   `json:"firmwareUpgrade"`
	Serial      string   `json:"serial"`
	Routerboard bool     `json:"routerboard"`
	Packages    []string `json:"packages"`
	Wifi        string   `json:"wifi"` // legacy | wifi | none
	Radios      []string `json:"radios"`
	Wifi5       bool     `json:"wifi5"`
	Ports       []string `json:"ports"`
	Services    []string `json:"services"`
	License     string   `json:"license"`
	Uptime      string   `json:"uptime"`
	Notes       []string `json:"notes"`
	Updated     string   `json:"updated"`
}

// parseVersion разбирает «7.24.6» или «6.49.13 (stable)» в числа.
func parseVersion(v string) (int, int, int) {
	v = strings.TrimSpace(v)
	i := strings.IndexAny(v, " (\t")
	if i > 0 {
		v = v[:i]
	}
	parts := strings.Split(v, ".")
	num := func(s string) int {
		n := 0
		for _, r := range s {
			if r < '0' || r > '9' {
				break
			}
			n = n*10 + int(r-'0')
		}
		return n
	}
	major, minor, patch := 0, 0, 0
	if len(parts) > 0 {
		major = num(parts[0])
	}
	if len(parts) > 1 {
		minor = num(parts[1])
	}
	if len(parts) > 2 {
		patch = num(parts[2])
	}
	return major, minor, patch
}

func firstRow(rows []map[string]string) map[string]string {
	if len(rows) > 0 && rows[0] != nil {
		return rows[0]
	}
	return map[string]string{}
}

func names(rows []map[string]string, key string) []string {
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		if v := strings.TrimSpace(r[key]); v != "" {
			out = append(out, v)
		}
	}
	return out
}

// collectRouter собирает паспорт из любого источника (API или REST).
func collectRouter(src interface {
	fetch(path string) ([]map[string]string, error)
}, info *rosProbeInfo) (*rosProbeInfo, error) {
	if info == nil {
		info = &rosProbeInfo{}
	}
	resRows, err := src.fetch("/system/resource")
	if err != nil {
		return nil, err
	}
	res := firstRow(resRows)
	if res["version"] == "" {
		return nil, errors.New("роутер не отдал версию RouterOS")
	}
	info.Version = strings.TrimSpace(res["version"])
	info.Major, info.Minor, info.Patch = parseVersion(info.Version)
	info.Board = strings.TrimSpace(res["board-name"])
	if info.Board == "" {
		info.Board = strings.TrimSpace(res["platform"])
	}
	info.Arch = strings.TrimSpace(res["architecture-name"])
	info.Platform = strings.TrimSpace(res["platform"])
	info.Uptime = strings.TrimSpace(res["uptime"])

	if rows, err := src.fetch("/system/routerboard"); err == nil && len(rows) > 0 {
		rb := firstRow(rows)
		info.Routerboard = true
		info.Firmware = strings.TrimSpace(rb["current-firmware"])
		info.FirmwareNew = strings.TrimSpace(rb["upgrade-firmware"])
		info.Serial = strings.TrimSpace(rb["serial-number"])
		if m := strings.TrimSpace(rb["model"]); m != "" {
			info.Model = m
		}
		if info.Board == "" {
			info.Board = strings.TrimSpace(rb["model"])
		}
	}
	if rows, err := src.fetch("/system/identity"); err == nil && len(rows) > 0 {
		info.Identity = strings.TrimSpace(firstRow(rows)["name"])
	}
	if rows, err := src.fetch("/system/package"); err == nil {
		info.Packages = names(rows, "name")
	}
	if rows, err := src.fetch("/system/license"); err == nil && len(rows) > 0 {
		l := firstRow(rows)
		info.License = strings.TrimSpace(l["nlevel"])
	}
	if rows, err := src.fetch("/ip/service"); err == nil {
		for _, r := range rows {
			if strings.TrimSpace(r["disabled"]) == "true" {
				continue
			}
			name := strings.TrimSpace(r["name"])
			if name == "" {
				continue
			}
			addr := strings.TrimSpace(r["address"])
			if addr != "" && addr != "0.0.0.0/0" {
				name += " (" + addr + ")"
			}
			info.Services = append(info.Services, name)
		}
	}
	if rows, err := src.fetch("/interface"); err == nil {
		for _, r := range rows {
			name := strings.TrimSpace(r["name"])
			typ := strings.TrimSpace(r["type"])
			if name == "" {
				continue
			}
			if typ == "ether" {
				info.Ports = append(info.Ports, name)
			}
		}
	}
	// пакет wifi (ax / wifi-qcom-ac) и старый wireless — взаимоисключающие
	wirelessRows, werr := src.fetch("/interface/wireless")
	wifiRows, ferr := src.fetch("/interface/wifi")
	if ferr == nil && len(wifiRows) > 0 {
		info.Wifi = "wifi"
		info.Radios = names(wifiRows, "name")
		for _, r := range wifiRows {
			band := strings.ToLower(r["channel.band"] + " " + r["band"] + " " + r["configuration.band"])
			if strings.Contains(band, "5ghz") || strings.Contains(band, "5g") {
				info.Wifi5 = true
			}
		}
	} else if werr == nil && len(wirelessRows) > 0 {
		info.Wifi = "legacy"
		info.Radios = names(wirelessRows, "name")
		for _, r := range wirelessRows {
			if strings.Contains(strings.ToLower(r["band"]), "5ghz") {
				info.Wifi5 = true
			}
		}
	} else {
		info.Wifi = "none"
	}
	for _, p := range info.Packages {
		if strings.HasPrefix(p, "wifi-") && info.Wifi == "none" {
			info.Notes = append(info.Notes, "пакет "+p+" установлен, но радиоинтерфейсы не найдены")
		}
	}
	// на моделях с 5 ГГц часто не понять диапазон через API — подскажем по модели
	if info.Wifi != "none" && !info.Wifi5 && len(info.Radios) > 1 {
		info.Wifi5 = true
	}
	info.Updated = time.Now().Format("2006-01-02 15:04")
	if info.Identity == "" {
		info.Identity = info.Board
	}
	return info, nil
}

// probeRouter опрашивает роутер по очереди: REST (443) → api (8728) → api-ssl (8729).
//
// Возвращает паспорт роутера или *probeError с разбором каждой попытки:
// в интерфейсе видно, где именно споткнулись — порт закрыт, пароль отклонён
// или у пользователя нет прав. Раньше любая неудача по паролю превращалась
// в «роутер отклонил логин или пароль», даже если проблема была в другом.
func probeRouter(address, user, pass string) (*rosProbeInfo, error) {
	address = normalizeAddress(address)
	if address == "" {
		return nil, &probeError{
			Kind:    kindConfig,
			Message: "Не указан адрес роутера",
			Hints:   []string{"Обычно это 192.168.88.1 или 192.168.1.1 — посмотрите на наклейке роутера."},
		}
	}
	if user == "" {
		user = "admin"
	}
	var attempts []rosAttempt

	// 1. REST — сначала HTTPS (www-ssl, 443), затем HTTP (www, 80).
	// Две схемы нужны, чтобы проверить учётные данные независимо от политики
	// api: если www-ssl выключен, а www включён, ответ по 80 покажет, дело
	// в пароле или в правах. Политика для REST — rest-api.
	for _, ep := range []struct {
		scheme    string
		transport string
		port      int
	}{
		{"https", "rest", 443},
		{"http", "rest-http", 80},
	} {
		info, err := probeRESTAt(address, ep.scheme, ep.transport, user, pass)
		if err == nil {
			attempts = append(attempts, rosAttempt{
				Transport: ep.transport, Port: ep.port, Stage: "read", OK: true,
				Detail: "вход принят",
			})
			return info, nil
		}
		kind, detail := classifyProbeErr(err)
		if kind == kindAuth {
			detail = "роутер отклонил вход (HTTP 401): пароль или нет политики rest-api"
		}
		attempts = append(attempts, rosAttempt{
			Transport: ep.transport, Port: ep.port, Stage: "connect",
			Kind: kind, Detail: detail,
		})
	}

	// 2. Порт 8728 и 3. защищённый 8729 — обычный протокол MikroTik API.
	for _, p := range []struct {
		port int
		tls  bool
		name string
	}{{8728, false, "api"}, {8729, true, "api-ssl"}} {
		c, err := rosDial(address, p.port, p.tls, 6*time.Second)
		if err != nil {
			kind, detail := classifyNetErr(err)
			attempts = append(attempts, rosAttempt{
				Transport: p.name, Port: p.port, Stage: "connect",
				Kind: kind, Detail: detail,
			})
			continue
		}
		err = c.login(user, pass)
		if err != nil {
			_ = c.Close()
			kind, detail := classifyTrap(err.Error())
			attempts = append(attempts, rosAttempt{
				Transport: p.name, Port: p.port, Stage: "login",
				Kind: kind, Detail: detail,
			})
			// Настоящий отказ по паролю — дальше пробовать бессмысленно:
			// остальные транспорты используют те же учётные данные.
			if kind == kindAuth || kind == kindPermission {
				return nil, newProbeError(address, user, attempts)
			}
			continue
		}
		info, cerr := collectRouter(apiSource{c: c}, &rosProbeInfo{Transport: p.name})
		_ = c.Close()
		if cerr != nil {
			attempts = append(attempts, rosAttempt{
				Transport: p.name, Port: p.port, Stage: "read",
				Kind: kindProtocol, Detail: cerr.Error(),
			})
			continue
		}
		attempts = append(attempts, rosAttempt{Transport: p.name, Port: p.port, Stage: "read", OK: true})
		info.Address = address
		return info, nil
	}

	return nil, newProbeError(address, user, attempts)
}

// normalizeAddress приводит «https://192.168.88.1/x» к «192.168.88.1».
func normalizeAddress(a string) string {
	a = strings.TrimSpace(a)
	a = strings.TrimPrefix(a, "http://")
	a = strings.TrimPrefix(a, "https://")
	if i := strings.IndexByte(a, '/'); i >= 0 {
		a = a[:i]
	}
	if i := strings.IndexByte(a, ':'); i >= 0 && strings.Count(a, ":") == 1 {
		a = a[:i] // порт указывать не нужно, опрашиваем стандартные
	}
	return a
}
