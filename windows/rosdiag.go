package main

import (
	"context"
	"errors"
	"fmt"
	"net"
	"strconv"
	"strings"
	"time"
)

/* rosdiag.go — диагностика подключения к роутеру.

   Зачем отдельный файл: пользователь видел «роутер отклонил логин или пароль»
   даже когда пароль верный, потому что программа не различала три разные
   ситуации:

     · порт закрыт            → сервис api/www-ssl выключен на роутере;
     · порт открыт, но отказ  → настоящая проблема с логином/политиками;
     · порт открыт, а ответа нет → чужое устройство на этом адресе или firewall.

   Здесь каждая попытка описывается структурой rosAttempt (её видно в
   интерфейсе), а ошибки разбираются по видам: conn / timeout / auth /
   permission / protocol. Плюс checkRouterPorts — проверка доступности
   портов без логина (кнопка «Проверить доступность»).

   Справка по RouterOS, которая попадает в подсказки интерфейса:
     · API (8728) требует у группы пользователя политику `api`;
     · API-SSL (8729) — политику `api` и включённый /ip service api-ssl;
     · REST (443) — включённый www-ssl и политику `rest-api`;
     · 2FA/TOTP у пользователя ломает вход по API (нужен Winbox/веб);
     · /ip service … address=… ограничивает, с каких адресов пускают. */

// Виды неудач — по ним интерфейс выбирает подсказку.
const (
	kindConnect    = "connect"    // до порта не дошли: закрыт или не отвечает
	kindTimeout    = "timeout"    // соединение не установилось за отведённое время
	kindAuth       = "auth"       // роутер ответил «неверный логин или пароль»
	kindPermission = "permission" // логин верный, но политик не хватает
	kindProtocol   = "protocol"   // ответили, но это не RouterOS/не тот протокол
	kindConfig     = "config"     // ошибка в данных, которые ввёл пользователь
)

// rosAttempt — одна попытка подключения (rest / api / api-ssl).
type rosAttempt struct {
	Transport string `json:"transport"` // rest | api | api-ssl
	Port      int    `json:"port"`
	Stage     string `json:"stage"`  // connect | login | read
	OK        bool   `json:"ok"`     // попытка удалась
	Kind      string `json:"kind"`   // вид ошибки (пусто при успехе)
	Detail    string `json:"detail"` // текст для человека
}

// probeError — неудачный опрос целиком: что пробовали и что вышло.
type probeError struct {
	Address  string       `json:"address"`
	Kind     string       `json:"kind"`
	Message  string       `json:"message"`
	Attempts []rosAttempt `json:"attempts"`
	Hints    []string     `json:"hints"`
}

func (e *probeError) Error() string { return e.Message }

// addHint добавляет подсказку без повторов.
func (e *probeError) addHint(h string) {
	for _, x := range e.Hints {
		if x == h {
			return
		}
	}
	e.Hints = append(e.Hints, h)
}

// classifyNetErr переводит ошибку соединения в понятный вид и текст.
func classifyNetErr(err error) (string, string) {
	if err == nil {
		return "", ""
	}
	// Отдельного кода ошибки «connection refused» в переносимом виде нет
	// (на Windows это WSAECONNREFUSED, на Linux — ECONNREFUSED), поэтому
	// опираемся на текст: он стабилен и там, и там.
	var ne net.Error
	if errors.As(err, &ne) && ne.Timeout() {
		return kindTimeout, "нет ответа за отведённое время"
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return kindTimeout, "нет ответа за отведённое время"
	}
	low := strings.ToLower(err.Error())
	switch {
	case strings.Contains(low, "eof"), strings.Contains(low, "reset by peer"),
		strings.Contains(low, "handshake"):
		return kindProtocol, "порт открыт, но ответил не RouterOS: " + err.Error()
	case strings.Contains(low, "refused"):
		return kindConnect, "порт закрыт — сервис выключен на роутере"
	case strings.Contains(low, "timeout") || strings.Contains(low, "timed out"):
		return kindTimeout, "нет ответа за отведённое время"
	case strings.Contains(low, "no route"), strings.Contains(low, "unreachable"):
		return kindConnect, "адрес недоступен — другой сегмент сети?"
	}
	return kindConnect, err.Error()
}

// classifyTrap разбирает ответ роутера на неудачный вход.
// RouterOS на неверные данные отвечает trap-сообщением, по его тексту и
// различаем «пароль» и «нет прав».
func classifyTrap(msg string) (string, string) {
	low := strings.ToLower(msg)
	raw := strings.TrimSpace(msg)
	if raw == "" {
		raw = "роутер не объяснил причину"
	}
	switch {
	case strings.Contains(low, "password") || strings.Contains(low, "пароль"):
		// Текст роутера оставляем в скобках: он точнее любого пересказа
		// («invalid user name or password (6)», «user ... has no api policy»).
		return kindAuth, "роутер: " + raw
	case strings.Contains(low, "permission"), strings.Contains(low, "not allowed"),
		strings.Contains(low, "access denied"), strings.Contains(low, "policy"),
		strings.Contains(low, "no permission"):
		return kindPermission, "роутер: " + raw
	case strings.Contains(low, "too many"), strings.Contains(low, "blocked"):
		return kindAuth, "роутер заблокировал вход после перебора: " + raw
	}
	return kindProtocol, "роутер: " + raw
}

// classifyProbeErr — единая точка разбора ошибки попытки: сначала смотрим,
// не сказал ли роутер «не пущу», потом — не сетевая ли это ошибка,
// и только затем считаем ответ «непонятным протоколом».
func classifyProbeErr(err error) (string, string) {
	if err == nil {
		return "", ""
	}
	msg := err.Error()
	low := strings.ToLower(msg)
	if strings.Contains(low, "отклонил логин") || strings.Contains(low, "401") ||
		strings.Contains(low, "unauthorized") {
		return kindAuth, "роутер отклонил логин или пароль"
	}
	if strings.Contains(low, "нет соединения") || strings.Contains(low, "refused") ||
		strings.Contains(low, "timeout") || strings.Contains(low, "timed out") ||
		strings.Contains(low, "no route") || strings.Contains(low, "unreachable") ||
		strings.Contains(low, "eof") || strings.Contains(low, "reset by peer") {
		return classifyNetErr(err)
	}
	return kindProtocol, msg
}

// rosPortStatus — результат проверки одного порта без логина.
type rosPortStatus struct {
	Port   int    `json:"port"`
	Label  string `json:"label"`  // что за сервис
	Open   bool   `json:"open"`   // удалось установить TCP-соединение
	Detail string `json:"detail"` // пояснение
}

// checkRouterPorts быстро проверяет, какие сервисы вообще открыты на адресе.
// Логин не нужен: только TCP-соединение. Это первый вопрос при «не подключается».
func checkRouterPorts(address string) []rosPortStatus {
	address = normalizeAddress(address)
	services := []struct {
		port  int
		label string
		on    string
		off   string
	}{
		{8291, "Winbox", "открыт — Winbox подключится", "закрыт — Winbox тоже не пустит"},
		{8728, "API", "открыт — опрос версии возможен", "закрыт — включите /ip service enable api"},
		{8729, "API-SSL", "открыт — подойдёт защищённый API", "закрыт — включите /ip service enable api-ssl"},
		{443, "REST (www-ssl)", "открыт — можно опрашивать по HTTPS", "закрыт — включите www-ssl с сертификатом"},
		{80, "Web (www)", "открыт", "закрыт"},
		{22, "SSH", "открыт", "закрыт"},
	}
	out := make([]rosPortStatus, 0, len(services))
	for _, s := range services {
		addr := net.JoinHostPort(address, strconv.Itoa(s.port))
		d := net.Dialer{Timeout: 900 * time.Millisecond}
		conn, err := d.Dial("tcp", addr)
		st := rosPortStatus{Port: s.port, Label: s.label}
		if err == nil {
			_ = conn.Close()
			st.Open = true
			st.Detail = s.on
		} else {
			st.Detail = s.off
			if k, _ := classifyNetErr(err); k == kindTimeout {
				st.Detail = "не отвечает (фильтр или другой адрес)"
			}
		}
		out = append(out, st)
	}
	return out
}

// serviceHint подсказывает, что включить на роутере для выбранного транспорта.
func serviceHint(transport string) string {
	switch transport {
	case "api":
		return "включите API: /ip service enable api; при необходимости разрешите адрес: " +
			"/ip service set api address=192.168.88.0/24"
	case "api-ssl":
		return "включите защищённый API: /ip service enable api-ssl"
	case "rest":
		return "REST работает только через www-ssl: /ip service enable www-ssl (нужен сертификат)"
	}
	return "проверьте /ip service print"
}

// permissionHint — почему логин может быть верным, а входа нет.
func permissionHint() string {
	return "Проверьте на роутере: /user group print detail — у группы пользователя должна быть " +
		"политика api (для REST ещё rest-api); /user print detail — нет ли 2FA/TOTP; " +
		"/ip service print — в колонке Address не должно стоять чужой подсети."
}

// newProbeError собирает итоговую ошибку из списка попыток.
func newProbeError(address string, attempts []rosAttempt) *probeError {
	e := &probeError{Address: address, Kind: kindConnect, Attempts: attempts}
	// Приоритет вывода: настоящий отказ по паролю важнее «порт закрыт»,
	// иначе человек идёт включать сервис, который уже включён.
	for _, a := range attempts {
		if a.Kind == kindAuth || a.Kind == kindPermission {
			e.Kind = a.Kind
			break
		}
		if a.Kind == kindProtocol && e.Kind == kindConnect {
			e.Kind = kindProtocol
		}
	}
	switch e.Kind {
	case kindAuth:
		e.Message = "Роутер отклонил логин или пароль (ответил сам роутер, не программа)"
		e.addHint("Проверьте раскладку и лишние пробелы в пароле; попробуйте войти этим же паролем в Winbox.")
		e.addHint(permissionHint())
		e.addHint("Если для пользователя включена 2FA (TOTP), вход по API невозможен — используйте Winbox или веб.")
	case kindPermission:
		e.Message = "Логин верный, но у пользователя нет прав на API"
		e.addHint(permissionHint())
	case kindProtocol:
		e.Message = "На " + address + " ответил не RouterOS API"
		e.addHint("Возможно, в списке поиска был адрес другого устройства — впишите адрес роутера вручную.")
	default:
		e.Message = "Не удалось подключиться к " + address
		for _, a := range attempts {
			if a.Stage == "connect" && a.Kind == kindConnect {
				e.addHint("Порт " + strconv.Itoa(a.Port) + " закрыт: " + serviceHint(a.Transport))
			}
		}
		if len(e.Hints) == 0 {
			e.addHint("Проверьте адрес и что компьютер в той же сети, что и роутер.")
		}
	}
	return e
}

// attemptsText — короткая строка «что пробовали» для журнала.
func attemptsText(list []rosAttempt) string {
	parts := make([]string, 0, len(list))
	for _, a := range list {
		state := "ok"
		if !a.OK {
			state = a.Kind + ": " + a.Detail
		}
		parts = append(parts, fmt.Sprintf("%s(%d)=%s", a.Transport, a.Port, state))
	}
	return strings.Join(parts, "; ")
}
