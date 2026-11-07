package main

import (
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"
)

/* rosapply.go — применение собранного конфига прямо из программы.

   Браузер не может открыть TCP к роутеру, поэтому страница отдаёт текст
   скрипта Go-серверу, а тот разбирает его на команды и отправляет по протоколу
   MikroTik API построчно. Так видно результат каждой строки, а не «вставил всё
   и надеюсь».

   Что поддерживается:
     · обычные команды  /ip address add address=… interface=…
     · обёртки мастера  :do { … } on-error={}       — ошибку показываем честно
                        :if ([:len […]] = 0) do={…} — команда уже есть, это ок
     · прочие выражения (:local, :put, :if со сложным условием) собираются
       в один временный скрипт и выполняются на роутере целиком

   ВАЖНО (исправление «применил, а ничего не поменялось»):
   1) В протоколе API нет выражений в квадратных скобках. Строку
      «/interface wireless set [find default-name=wlan1] ssid=X» нельзя
      разложить на путь и аргументы: из «[find default-name=wlan1]»
      получался аргумент «default-name=wlan1]», роутер отвечал
      «unknown parameter», а обёртка :do … on-error={} превращала это
      в отчёт «уже есть». Теперь строка с [ … ] уходит на роутер
      целиком, скриптом — с той же семантикой, что в .rsc.
   2) Позиционное слово-селектор («set wlan1 ssid=…») раньше отбрасывалось,
      если рядом были аргументы: команда уходила без указания объекта,
      и SSID с паролем оставались заводскими. Теперь это numbers=…
   3) Порядок строк сохраняется: скриптовые строки идут вперемешку с
      обычными, а не «всё в конце».
   4) После применения программа перечитывает /ip address, /interface
      wireless и /interface wifi и показывает, что реально стало на роутере.
*/

// rosCommand — одна строка конфига, разобранная на путь, действие и аргументы.
type rosCommand struct {
	Raw    string            `json:"raw"`
	Path   string            `json:"path"`
	Action string            `json:"action"`
	Args   map[string]string `json:"args"`
	Order  []string          `json:"-"`
	Ignore bool              `json:"ignore"`
	Script bool              `json:"script"`
	Expr   bool              `json:"expr"` // строка содержит [ … ] — её выполняет роутер
}

// rosActionWords — слова-действия RouterOS. По ним отделяем путь от аргументов.
var rosActionWords = map[string]bool{
	"add": true, "set": true, "print": true, "remove": true, "unset": true,
	"enable": true, "disable": true, "export": true, "import": true,
	"upgrade": true, "install": true, "downgrade": true, "run": true,
	"check-for-updates": true, "reboot": true, "shutdown": true, "reset": true,
	"move": true, "comment": true, "find": true, "get": true, "monitor": true,
	"save": true, "load": true, "edit": true, "snoop": true, "refresh": true,
}

// hasBracketExpr сообщает, есть ли в строке выражение в квадратных скобках:
// [find default-name=wlan1], [/ip firewall filter find where comment="…"],
// place-before=[…]. Внутри кавычек скобки не считаются.
func hasBracketExpr(s string) bool {
	quote := byte(0)
	for i := 0; i < len(s); i++ {
		ch := s[i]
		switch {
		case quote != 0:
			if ch == quote {
				quote = 0
			}
		case ch == '"' || ch == '\'':
			quote = ch
		case ch == '[':
			return true
		case ch == '#':
			return false // дальше комментарий
		}
	}
	return false
}

// tokenizeLine делит строку на слова, учитывая кавычки "…" и '…'.
func tokenizeLine(line string) []string {
	var out []string
	var cur strings.Builder
	quote := byte(0)
	started := false
	for i := 0; i < len(line); i++ {
		ch := line[i]
		switch {
		case quote != 0:
			if ch == quote {
				quote = 0
				continue
			}
			cur.WriteByte(ch)
		case ch == '"' || ch == '\'':
			quote = ch
			started = true
		case ch == ' ' || ch == '\t':
			if started || cur.Len() > 0 {
				out = append(out, cur.String())
				cur.Reset()
				started = false
			}
		default:
			cur.WriteByte(ch)
			started = true
		}
	}
	if started || cur.Len() > 0 {
		out = append(out, cur.String())
	}
	return out
}

// matchBrace возвращает содержимое между { и парной } и позицию закрывающей.
func matchBrace(s string, open int) (string, int, bool) {
	if open < 0 || open >= len(s) || s[open] != '{' {
		return "", 0, false
	}
	depth := 0
	for i := open; i < len(s); i++ {
		switch s[i] {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return strings.TrimSpace(s[open+1 : i]), i, true
			}
		}
	}
	return "", 0, false
}

// unwrapGuard снимает обёртки мастера и говорит, можно ли игнорировать ошибку.
//
//	:do {команда} on-error={}            — ошибку глушим
//	:if ([:len [...]] = 0) do={команда}  — команда уже есть, это норма
func unwrapGuard(line string) (string, bool) {
	s := strings.TrimSpace(line)
	guarded := false
	for i := 0; i < 4; i++ {
		switch {
		case strings.HasPrefix(s, ":do"):
			open := strings.IndexByte(s, '{')
			inner, _, ok := matchBrace(s, open)
			if !ok {
				return s, guarded
			}
			s, guarded = inner, true
		case strings.HasPrefix(s, ":if"):
			doIdx := strings.Index(s, "do=")
			if doIdx < 0 {
				return s, guarded
			}
			open := strings.IndexByte(s[doIdx:], '{')
			if open < 0 {
				return s, guarded
			}
			inner, _, ok := matchBrace(s, doIdx+open)
			if !ok {
				return s, guarded
			}
			s, guarded = inner, true
		default:
			return s, guarded
		}
	}
	return s, guarded
}

// parseConfigLine разбирает строку конфига. Второй результат — удалось ли
// разобрать как команду (иначе это комментарий или пустая строка).
func parseConfigLine(line string) (rosCommand, bool) {
	raw := strings.TrimSpace(line)
	if raw == "" || strings.HasPrefix(raw, "#") {
		return rosCommand{}, false
	}
	body, guarded := unwrapGuard(raw)
	cmd := rosCommand{Raw: raw, Args: map[string]string{}, Ignore: guarded}
	// Выражения в квадратных скобках ([find …], place-before=[…]) в API не
	// существуют. Такие строки выполняет сам RouterOS — целиком, как в .rsc
	// (обёртка :do { … } on-error={} остаётся в тексте строки).
	// Смотрим именно тело после снятия обёрток: условие вида
	// :if ([:len [/ip … find …]] = 0) do={…} — это нормальная идемпотентная
	// проверка, её команду можно отправить обычным путём.
	if hasBracketExpr(body) {
		cmd.Script = true
		cmd.Expr = true
		return cmd, true
	}
	if !strings.HasPrefix(body, "/") {
		cmd.Script = true
		return cmd, true
	}
	words := tokenizeLine(body)
	if len(words) < 2 {
		cmd.Script = true
		return cmd, true
	}
	// ищем первое слово-действие: всё до него — путь, всё после — аргументы
	act := -1
	for i := 1; i < len(words); i++ {
		if rosActionWords[words[i]] {
			act = i
			break
		}
		if strings.Contains(words[i], "=") {
			break
		}
	}
	if act < 0 {
		cmd.Script = true
		return cmd, true
	}
	cmd.Path = strings.Join(words[:act], " ")
	cmd.Action = words[act]
	positional := []string{}
	for _, w := range words[act+1:] {
		eq := strings.Index(w, "=")
		if eq > 0 {
			key := strings.TrimPrefix(w[:eq], "-")
			cmd.Args[key] = w[eq+1:]
			cmd.Order = append(cmd.Order, key)
			continue
		}
		if w != "" {
			positional = append(positional, w)
		}
	}
	if len(positional) > 0 && (len(cmd.Args) == 0 || cmd.Action != "add") {
		// Позиционное слово — это указание объекта, в API это numbers=:
		//   «/ip service disable telnet,ftp»        → numbers=telnet,ftp
		//   «/interface wireless set wlan1 ssid=X»  → numbers=wlan1 + ssid=X
		// Раньше при наличии аргументов слово молча терялось, и «set» уходил
		// без объекта: SSID и пароль Wi-Fi оставались заводскими.
		cmd.Args["numbers"] = strings.Join(positional, ",")
		cmd.Order = append(cmd.Order, "numbers")
	}
	return cmd, true
}

// words превращает разобранную команду в набор слов для API.
// Путь идёт в слэш-форме: «/ip/address/add».
func (c rosCommand) words() []string {
	out := []string{apiPath(c.Path + " " + c.Action)}
	for _, k := range c.Order {
		out = append(out, "="+k+"="+c.Args[k])
	}
	return out
}

// rosApplyResult — результат по одной строке.
type rosApplyResult struct {
	Line    int    `json:"line"`
	Raw     string `json:"raw,omitempty"`
	Command string `json:"command,omitempty"`
	Status  string `json:"status"` // ok | exists | error | skipped | script
	Message string `json:"message,omitempty"`
}

// isAlreadyThere распознаёт «объект уже существует» в ответе роутера.
func isAlreadyThere(msg string) bool {
	m := strings.ToLower(msg)
	for _, s := range []string{"already have", "already exists", "уже есть", "duplicate", "already added"} {
		if strings.Contains(m, s) {
			return true
		}
	}
	return false
}

// rosStep — команда вместе с номером строки в исходном конфиге.
type rosStep struct {
	Cmd  rosCommand
	Line int
}

// splitConfig возвращает команды и строки-выражения скрипта (с номерами строк).
func splitConfig(text string) (steps []rosStep, script []rosStep) {
	for i, line := range strings.Split(text, "\n") {
		cmd, ok := parseConfigLine(line)
		if !ok {
			continue
		}
		step := rosStep{Cmd: cmd, Line: i + 1}
		if cmd.Script {
			script = append(script, step)
			continue
		}
		steps = append(steps, step)
	}
	return steps, script
}

// rosApply отправляет конфиг на роутер построчно.
// stopOnError — остановиться на первой же ошибке.
func rosApply(address, user, pass, text string, stopOnError bool) ([]rosApplyResult, error) {
	c, err := dialRouterAPI(address, user, pass)
	if err != nil {
		return nil, err
	}
	defer func() { _ = c.Close() }()

	steps, script := splitConfig(text)
	results := make([]rosApplyResult, 0, len(steps)+2)

	// Перед изменениями делаем бэкап на самом роутере: если что-то пойдёт не так,
	// конфиг возвращается через Files → Restore.
	backupName := "before-apply-" + time.Now().Format("20060102-1504")
	backup := rosApplyResult{Status: "ok"}
	if _, err := c.runCommand("/system backup save", "=name="+backupName, "=dont-encrypt=yes"); err != nil {
		backup.Status = "error"
		backup.Message = "бэкап не сделался: " + err.Error() + " — применяю без страховки"
	} else {
		backup.Message = "бэкап перед изменениями: " + backupName + " (Files → Restore)"
	}
	results = append(results, backup)

	// Строки идут в том порядке, в котором они записаны в конфиге: раньше все
	// «скриптовые» строки выполнялись в самом конце, из-за чего порядок
	// «создать → настроить» мог нарушаться.
	all := make([]rosStep, 0, len(steps)+len(script))
	all = append(all, steps...)
	all = append(all, script...)
	sort.SliceStable(all, func(i, j int) bool { return all[i].Line < all[j].Line })

	// Строки, которые выключают сам API (наш канал связи), выполняем в самом
	// конце: иначе связь оборвётся на середине конфига, а остальные команды
	// просто не дойдут до роутера.
	var late []rosStep

	for i := 0; i < len(all); i++ {
		step := all[i]

		if isApiKill(step.Cmd) {
			late = append(late, step)
			continue
		}

		// Скриптовые строки (выражения [ … ], :local, :put) выполняем пачкой
		// подряд идущих — так меньше обращений к роутеру и сохранён порядок.
		if step.Cmd.Script {
			batch := []rosStep{step}
			for i+1 < len(all) && all[i+1].Cmd.Script {
				i++
				batch = append(batch, all[i])
			}
			got, bad := runScriptBatch(c, batch)
			results = append(results, got...)
			if bad > 0 && stopOnError {
				results = append(results, rosApplyResult{Status: "skipped", Message: "остановлено на ошибке"})
				return results, nil
			}
			continue
		}

		cmd := step.Cmd
		res := rosApplyResult{
			Line:    step.Line,
			Raw:     strings.TrimSpace(cmd.Raw),
			Command: strings.TrimSpace(cmd.Path + "/" + cmd.Action + " " + strings.Join(cmd.words()[1:], " ")),
		}
		if cmd.Action == "print" || cmd.Action == "export" || cmd.Action == "monitor" || cmd.Action == "get" || cmd.Action == "find" {
			res.Status = "skipped"
			res.Message = "только чтение — не отправлялось"
			results = append(results, res)
			continue
		}
		if _, err := c.runCommand(cmd.words()...); err != nil {
			switch {
			case isAlreadyThere(err.Error()):
				res.Status = "exists"
				res.Message = "уже настроено — пропущено"
			case cmd.Ignore:
				// Раньше здесь стояло «уже есть» — и настоящая ошибка внутри
				// :do … on-error={} выглядела как успех. Теперь честно:
				// строка не применилась, текст роутера в отчёте.
				res.Status = "skipped"
				res.Message = "не применилось (обёртка :do … on-error): " + err.Error()
			default:
				res.Status = "error"
				res.Message = err.Error()
			}
		} else {
			res.Status = "ok"
		}
		results = append(results, res)
		if res.Status == "error" && stopOnError {
			results = append(results, rosApplyResult{Status: "skipped", Message: "остановлено на ошибке"})
			return results, nil
		}
	}

	// Что реально стало на роутере: адреса и SSID. Без этого человек видит
	// «выполнено», а на деле адрес или имя сети остались прежними.
	state, wirelessRows, wifiRows := verifyApplyState(c)
	results = append(results, state...)
	// Отдельно — самое частое расхождение: конфиг собран для одного пакета
	// Wi-Fi, а на роутере другой. Тогда все команды /interface wifi уходят в
	// несуществующее меню, обёртки :do … on-error={} их глотают, и SSID
	// остаётся заводским. Говорим об этом прямо, а не «готово».
	for _, msg := range wifiProblems(wifiWantFrom(text), wirelessRows, wifiRows) {
		results = append(results, rosApplyResult{Status: "error", Raw: "/interface wireless", Message: msg})
	}

	for _, step := range late {
		cmd := step.Cmd
		res := rosApplyResult{
			Line:    step.Line,
			Raw:     strings.TrimSpace(cmd.Raw),
			Command: strings.TrimSpace(cmd.Path + "/" + cmd.Action + " " + strings.Join(cmd.words()[1:], " ")),
		}
		if _, err := c.runCommand(cmd.words()...); err != nil {
			res.Status = "error"
			res.Message = err.Error()
		} else {
			res.Status = "ok"
		}
		res.Message = strings.TrimSpace(res.Message + " Внимание: этим выключается API — программа " +
			"больше не сможет подключаться к роутеру. Вернуть: /ip service enable api (api-ssl, www-ssl) " +
			"в Winbox → New Terminal.")
		results = append(results, res)
		if res.Status == "error" && stopOnError {
			break
		}
	}

	// Итоговая сводка: сколько строк реально не применилось. Считаем и жёсткие
	// ошибки, и «не применилось» внутри :do … on-error={} — именно их раньше
	// показывали как «уже есть», из-за чего казалось, что всё применилось.
	hard, soft := 0, 0
	for _, r := range results {
		switch {
		case r.Status == "error":
			hard++
		case r.Status == "skipped" && strings.Contains(r.Message, "не применилось"):
			soft++
		}
	}
	if hard+soft > 0 {
		results = append(results, rosApplyResult{
			Status: "note",
			Message: fmt.Sprintf("не применилось: %d строк (с отказом роутера: %d) — текст рядом с каждой строкой",
				hard+soft, hard),
		})
	}
	return results, nil
}

// isApiKill — выключает ли строка сервис, через который мы сейчас работаем
// (api / api-ssl / www-ssl). Такие строки выполняются последними: иначе
// программа теряет связь с роутером на середине применения конфига.
func isApiKill(cmd rosCommand) bool {
	if cmd.Script || cmd.Action != "disable" {
		return false
	}
	if !strings.Contains(strings.ToLower(cmd.Path), "ip service") {
		return false
	}
	n := strings.ToLower(cmd.Args["numbers"])
	return strings.Contains(n, "api") || strings.Contains(n, "www-ssl")
}

// runScriptBatch выполняет пачку скриптовых строк одним временным скриптом
// на роутере. Возвращает строки отчёта и число неудач.
//
// Почему скриптом, а не по API: выражения [find …], place-before=[…] и
// :local существуют только в языке RouterOS. Отправить их по протоколу API
// нельзя — их надо именно выполнить на роутере, как при /import.
func runScriptBatch(c *rosConn, batch []rosStep) ([]rosApplyResult, int) {
	results := make([]rosApplyResult, 0, len(batch))
	srcLines := make([]string, 0, len(batch))
	for _, st := range batch {
		results = append(results, rosApplyResult{
			Line:    st.Line,
			Raw:     strings.TrimSpace(st.Cmd.Raw),
			Status:  "script",
			Message: "выполняется скриптом на роутере",
		})
		srcLines = append(srcLines, strings.TrimSpace(st.Cmd.Raw))
	}
	src := strings.Join(srcLines, "\n")
	name := "mtg-wizard-" + time.Now().Format("150405.000")

	add := func() error {
		_, err := c.runCommand("/system script add", "=name="+name, "=source="+src,
			"=policy=read,write,policy,test,romon")
		return err
	}
	if err := add(); err != nil {
		if isAlreadyThere(err.Error()) {
			_, _ = c.runCommand("/system script remove", "=numbers="+name)
			err = add()
		}
		if err != nil {
			for i := range results {
				results[i].Status = "error"
				results[i].Message = "не удалось создать временный скрипт: " + err.Error()
			}
			return results, len(results)
		}
	}
	_, runErr := c.runCommand("/system script run", "=number="+name)
	_, _ = c.runCommand("/system script remove", "=numbers="+name)
	if runErr != nil {
		for i := range results {
			results[i].Status = "error"
			results[i].Message = "скрипт не выполнился: " + runErr.Error()
		}
		return results, len(results)
	}
	for i := range results {
		results[i].Message = "выполнено скриптом"
	}
	return results, 0
}

// verifyApplyState читает фактическое состояние после применения.
// Строки со статусом "state" интерфейс показывает отдельным блоком
// «Сейчас на роутере»: по ним видно, поменялся ли адрес и SSID.
func verifyApplyState(c *rosConn) (results []rosApplyResult, wireless, wifi []map[string]string) {
	checks := []struct {
		path   string
		fields []string
	}{
		{"/ip address", []string{"address", "interface"}},
		{"/interface wireless", []string{"name", "ssid"}},
		{"/interface wifi", []string{"name", "ssid"}},
	}
	const maxRows = 40
	var out []rosApplyResult
	for _, ch := range checks {
		rows, err := c.runCommand(ch.path + " print")
		if err != nil {
			continue // меню может отсутствовать (нет пакета wifi и т.п.)
		}
		switch ch.path {
		case "/interface wireless":
			wireless = rows
		case "/interface wifi":
			wifi = rows
		}
		for _, row := range rows {
			if len(out) >= maxRows {
				return out, wireless, wifi
			}
			parts := make([]string, 0, len(ch.fields))
			for _, f := range ch.fields {
				if v := strings.TrimSpace(row[f]); v != "" {
					parts = append(parts, v)
				}
			}
			if len(parts) == 0 {
				continue
			}
			out = append(out, rosApplyResult{
				Status:  "state",
				Raw:     ch.path,
				Message: strings.Join(parts, " · "),
			})
		}
	}
	return out, wireless, wifi
}

// wifiWant — что конфиг требует от Wi-Fi: имена радиоинтерфейсов и SSID,
// а также какой пакет он вообще трогает. Читается по тексту конфига, включая
// строки-скрипты: в пакете wifi команда set идёт с [find where name="wifi1"],
// и без разбора скриптовых строк расхождение пакетов было бы не видно.
type wifiWant struct {
	Wireless     []string // wlan1, wlan2 — из /interface wireless set
	Wifi         []string // wifi1, wifi2 — из /interface wifi set
	SSID         string   // ожидаемое имя сети
	UsesWireless bool     // конфиг вообще обращается к /interface wireless …
	UsesWifi     bool     // … и к /interface wifi …
}

func wifiWantFrom(text string) wifiWant {
	var want wifiWant
	for _, line := range strings.Split(text, "\n") {
		l := strings.TrimSpace(line)
		if l == "" || strings.HasPrefix(l, "#") {
			continue
		}
		// Строки-скрипты (:do, :if, [find …]) разбираем по тексту.
		if strings.Contains(l, "/interface wifi") {
			want.UsesWifi = true
		}
		if strings.Contains(l, "/interface wireless") {
			want.UsesWireless = true
		}
		cmd, ok := parseConfigLine(l)
		if !ok || cmd.Script {
			continue
		}
		// Путь в разборе хранится словами («/interface wireless»), поэтому
		// приводим к виду со слэшами: иначе сравнение молча не срабатывает.
		path := strings.ReplaceAll(strings.TrimSpace(cmd.Path), " ", "/")
		if cmd.Action == "set" {
			names := strings.Fields(cmd.Args["numbers"])
			switch path {
			case "/interface/wireless":
				want.Wireless = append(want.Wireless, names...)
			case "/interface/wifi":
				want.Wifi = append(want.Wifi, names...)
			}
		}
		if ssid := strings.TrimSpace(cmd.Args["ssid"]); ssid != "" && want.SSID == "" {
			want.SSID = ssid
		}
	}
	return want
}

func radioNames(rows []map[string]string) []string {
	var out []string
	for _, r := range rows {
		if n := strings.TrimSpace(r["name"]); n != "" {
			out = append(out, n)
		}
	}
	return out
}

func hasRadio(rows []map[string]string, name string) bool {
	for _, n := range radioNames(rows) {
		if n == name {
			return true
		}
	}
	return false
}

// wifiProblems сравнивает желаемое с реальным и возвращает человеческие
// объяснения расхождений. Пустой список — Wi-Fi применился.
func wifiProblems(want wifiWant, wireless, wifi []map[string]string) []string {
	var out []string
	// Главное расхождение: пакеты разные. Тогда команды раздела Wi-Fi уходят
	// в несуществующее меню, обёртки :do … on-error={} их глотают, а на
	// роутере остаётся заводской SSID — ровно то, что видел пользователь.
	if want.UsesWifi && len(wifi) == 0 && len(wireless) > 0 {
		out = append(out, "раздел Wi-Fi не выполнен: конфиг собран для пакета wifi "+
			"(/interface wifi …), а на роутере пакет wireless ("+
			strings.Join(radioNames(wireless), ", ")+"). SSID и пароль остались прежними. "+
			"Соберите конфиг с моделью hAP ac³, hAP ac², cAP ac или RB951G — "+
			"или установите пакет wifi и перезагрузите роутер.")
	}
	if want.UsesWireless && len(wireless) == 0 && len(wifi) > 0 {
		out = append(out, "раздел Wi-Fi не выполнен: конфиг собран для пакета wireless "+
			"(/interface wireless …), а на роутере пакет wifi ("+
			strings.Join(radioNames(wifi), ", ")+"). Соберите конфиг с моделью hAP ax²/ax³ или cAP ax.")
	}
	if len(want.Wireless) > 0 {
		if len(wireless) == 0 {
			out = append(out, "раздел Wi-Fi не выполнен: в конфиге команды для "+
				strings.Join(want.Wireless, ", ")+", а на роутере нет пакета wireless "+
				"(меню /interface wireless отсутствует). Конфиг собран для пакета wifi.")
		} else {
			var missing []string
			for _, n := range want.Wireless {
				if !hasRadio(wireless, n) {
					missing = append(missing, n)
				}
			}
			if len(missing) > 0 {
				out = append(out, "раздел Wi-Fi не выполнен: нет радиоинтерфейса "+
					strings.Join(missing, ", ")+" (на роутере: "+
					strings.Join(radioNames(wireless), ", ")+"). Проверьте имя радио в мастере.")
			}
		}
	}
	if len(want.Wifi) > 0 && !want.UsesWifi {
		if len(wifi) == 0 {
			msg := "раздел Wi-Fi не выполнен: в конфиге команды для " +
				strings.Join(want.Wifi, ", ") + ", а на роутере нет пакета wifi"
			if names := radioNames(wireless); len(names) > 0 {
				msg += " (есть пакет wireless: " + strings.Join(names, ", ") +
					"). Выберите модель с пакетом wireless — hAP ac³, hAP ac², cAP ac, RB951G."
			}
			out = append(out, msg)
		} else {
			var missing []string
			for _, n := range want.Wifi {
				if !hasRadio(wifi, n) {
					missing = append(missing, n)
				}
			}
			if len(missing) > 0 {
				out = append(out, "раздел Wi-Fi не выполнен: нет радиоинтерфейса "+
					strings.Join(missing, ", ")+" (на роутере: "+
					strings.Join(radioNames(wifi), ", ")+").")
			}
		}
	}
	// Пакет wireless задаёт ssid прямо на интерфейсе — значит его можно
	// проверить. У пакета wifi ssid живёт в профиле configuration, там
	// проверка была бы ложной.
	if want.SSID != "" && len(want.Wireless) > 0 && len(wireless) > 0 {
		var got []string
		found := false
		for _, r := range wireless {
			if s := strings.TrimSpace(r["ssid"]); s != "" {
				got = append(got, s)
				if s == want.SSID {
					found = true
				}
			}
		}
		if !found && len(got) > 0 {
			out = append(out, "SSID не поменялся: на роутере «"+strings.Join(got, "», «")+
				"», в конфиге «"+want.SSID+"». Строки /interface wireless set не выполнились — "+
				"смотрите текст ошибок выше.")
		}
	}
	return out
}

// rosPlanItem — одна строка «что изменится» до применения.
type rosPlanItem struct {
	Line   int    `json:"line"`
	Raw    string `json:"raw"`
	Path   string `json:"path,omitempty"`
	Action string `json:"action,omitempty"`
	Kind   string `json:"kind"` // create | exists | update | read | other | script
	Note   string `json:"note,omitempty"`
}

// planConfig сравнивает команды конфига с текущим состоянием роутера.
// snapshot — меню роутера, как их отдаёт /print.
func planConfig(text string, snapshot map[string][]map[string]string) []rosPlanItem {
	var out []rosPlanItem
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		cmd, ok := parseConfigLine(line)
		if !ok {
			continue
		}
		item := rosPlanItem{Line: i + 1, Raw: strings.TrimSpace(line), Path: cmd.Path, Action: cmd.Action}
		if cmd.Script {
			item.Kind = "script"
			if cmd.Expr {
				item.Note = "строка с [ … ] — выполнится на роутере целиком (как в .rsc)"
			} else {
				item.Note = "выражение скрипта — выполнится на роутере"
			}
			out = append(out, item)
			continue
		}
		switch cmd.Action {
		case "print", "export", "monitor", "get", "find":
			item.Kind = "read"
			item.Note = "только чтение"
		case "set", "unset", "enable", "disable", "comment", "move", "remove":
			item.Kind = "update"
			item.Note = "изменит существующее"
		case "add":
			key, val := matchKey(cmd)
			if key == "" {
				item.Kind = "create"
				break
			}
			rows, known := snapshot[cmd.Path]
			if !known {
				item.Kind = "create"
				item.Note = "меню не прочитано — проверка по «" + key + "»"
				break
			}
			found := false
			for _, row := range rows {
				if strings.EqualFold(strings.TrimSpace(row[key]), val) {
					found = true
					break
				}
			}
			if found {
				item.Kind = "exists"
				item.Note = key + "=" + val + " уже есть"
			} else {
				item.Kind = "create"
				item.Note = "будет создано: " + key + "=" + val
			}
		default:
			item.Kind = "other"
		}
		out = append(out, item)
	}
	return out
}

// matchKey выбирает поле, по которому узнаём «такой объект уже есть».
func matchKey(cmd rosCommand) (string, string) {
	for _, k := range []string{"comment", "name", "address", "dst-address", "interface", "chain"} {
		if v, ok := cmd.Args[k]; ok && v != "" && v != "*" {
			if k == "chain" {
				if a := cmd.Args["action"]; a != "" {
					return "chain", v + "/" + a
				}
			}
			return k, v
		}
	}
	return "", ""
}

// splitTarget делит «192.168.88.1:8728» на адрес и порт.
// Порт нужен тестам (и полезен, если API вынесен на нестандартный порт).
func splitTarget(target string) (string, int) {
	t := strings.TrimSpace(target)
	t = strings.TrimPrefix(t, "http://")
	t = strings.TrimPrefix(t, "https://")
	if i := strings.IndexByte(t, '/'); i >= 0 {
		t = t[:i]
	}
	if i := strings.LastIndexByte(t, ':'); i > 0 {
		if p, err := strconv.Atoi(t[i+1:]); err == nil && p > 0 && p < 65536 {
			return t[:i], p
		}
	}
	return t, 0
}

// dialRouterAPI подключается по API: сначала 8728, затем api-ssl 8729.
func dialRouterAPI(target, user, pass string) (*rosConn, error) {
	address, fixedPort := splitTarget(target)
	if address == "" {
		return nil, errors.New("не указан адрес роутера")
	}
	var problems []string
	var ports []struct {
		port int
		tls  bool
		name string
	}
	if fixedPort > 0 {
		ports = []struct {
			port int
			tls  bool
			name string
		}{{fixedPort, fixedPort == 8729, "api:" + strconv.Itoa(fixedPort)}}
	} else {
		ports = []struct {
			port int
			tls  bool
			name string
		}{{8728, false, "api"}, {8729, true, "api-ssl"}}
	}
	for _, p := range ports {
		c, err := rosDial(address, p.port, p.tls, 6*time.Second)
		if err != nil {
			problems = append(problems, fmt.Sprintf("%s (%d): нет соединения", p.name, p.port))
			continue
		}
		if err := c.login(user, pass); err != nil {
			_ = c.Close()
			if strings.Contains(strings.ToLower(err.Error()), "password") {
				return nil, errors.New("роутер отклонил логин или пароль")
			}
			problems = append(problems, p.name+": "+err.Error())
			continue
		}
		return c, nil
	}
	return nil, errors.New("для записи на роутер нужен протокол API: включите его командой " +
		"/ip service enable api (или api-ssl). Подробности: " + strings.Join(problems, "; "))
}
