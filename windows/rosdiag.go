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
		{443, "REST (www-ssl)", "открыт — REST по https:// доступен (политика rest-api)",
			"закрыт — включите www-ssl с сертификатом"},
		{80, "REST (www)", "открыт — REST по http:// тоже работает: пароль проверяется независимо от политики api",
			"закрыт — включите www, если нужен второй путь проверки входа"},
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
		return "REST по https:// работает через www-ssl: /ip service enable www-ssl (нужен сертификат)"
	case "rest-http":
		return "REST по http:// работает через www: /ip service enable www (только для своей сети!)"
	}
	return "проверьте /ip service print"
}

// permissionHint — почему логин может быть верным, а входа нет.
func permissionHint() string {
	return "Проверьте на роутере: /user group print detail — у группы пользователя должна быть " +
		"политика api (для REST ещё rest-api); /user print detail — нет ли 2FA/TOTP; " +
		"/ip service print — в колонке Address не должно стоять чужой подсети."
}

// loginRefusedHints — что проверить, когда роутер ответил
// «invalid user name or password», хотя пароль верный.
//
// RouterOS отдаёт этот ОДИН текст в четырёх разных случаях, и три из них
// к паролю отношения не имеют. Поэтому подсказки идут в порядке проверки:
// от самого частого и безопасного к самому редкому.
func loginRefusedHints(user string) []string {
	u := strings.TrimSpace(user)
	if u == "" {
		u = "admin"
	}
	return []string{
		// Самая частая причина: политика api у группы. В Winbox вход идёт
		// по политике winbox и проходит, а API — нет.
		"Политика api у группы: /user group print detail — в строке policy должна быть api " +
			"(для REST ещё rest-api). Без неё RouterOS отвечает именно «invalid user name or password».",
		// После смены подсети это очень частый случай: у пользователя остался
		// старый адрес в поле address, и вход с нового адреса отклоняется.
		fmt.Sprintf("Ограничение адреса у пользователя: /user print detail where name=%s — поле address "+
			"должно включать адрес этого компьютера. После смены подсети там часто остаётся старая "+
			"192.168.88.0/24.", u),
		"Двухфакторный вход (TOTP): с ним вход по API невозможен вообще — только Winbox или веб.",
		// Проверка пароля без риска: поставить временный и вернуть прежний.
		fmt.Sprintf("Проверить сам пароль без риска: /user set %s password=Test123456 — если вход пойдёт, "+
			"дело в пароле (лишний символ, раскладка), потом верните прежний.", u),
		// Контрольный пользователь: сразу отделяет «права» от «пароля».
		"Контрольный вход: /user group add name=api-test policy=api,read,write,test; " +
			"/user add name=apiuser group=api-test password=Test123456; /ip service enable api — " +
			"опросите apiuser. Вошёл — проблема в учётке " + u + ", не вошёл — в сервисе или 2FA.",
		"Журнал роутера после попытки показывает настоящую причину: /log print where message~\"login\".",
	}
}

// newProbeError собирает итоговую ошибку из списка попыток.
func newProbeError(address, user string, attempts []rosAttempt) *probeError {
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
	// Отказ по паролю мог прийти только по REST (401): там 401 означает и
	// «неверный пароль», и «у группы нет политики rest-api». Если ни один
	// транспорт не дошёл до входа по API, говорим об этом прямо — иначе
	// человек снова пойдёт искать ошибку в пароле, которого там нет.
	restOnly := true
	for _, a := range attempts {
		if a.Stage == "login" {
			restOnly = false
		}
	}
	switch e.Kind {
	case kindAuth:
		if restOnly {
			e.Message = "Вход по REST отклонён (HTTP 401): неверный пароль или у пользователя нет политики rest-api"
			e.addHint("Сначала проверьте политику: /user group print detail — нужна rest-api (для REST) " +
				"и api (для API 8728).")
			for _, h := range loginRefusedHints(user)[1:3] {
				e.addHint(h)
			}
			e.addHint("Если политика и адрес в порядке — сверьте пароль: он мог измениться или в нём лишний символ.")
		} else {
			// Роутер сам ответил отказом. Пароль при этом может быть верным:
			// см. комментарий у loginRefusedHints.
			e.Message = "Роутер отклонил вход по API (invalid user name or password). " +
				"Это не всегда пароль — проверьте по списку ниже"
			for _, h := range loginRefusedHints(user) {
				e.addHint(h)
			}
		}
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
