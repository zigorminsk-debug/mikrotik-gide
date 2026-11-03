package main

import (
	"errors"
	"fmt"
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
     · обёртки мастера  :do { … } on-error={}       — ошибку считаем нормой
                        :if ([:len […]] = 0) do={…} — команда уже есть, это ок
     · прочие выражения (:local, :put, :if со сложным условием) собираются
       в один временный скрипт и выполняются на роутере целиком
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
	if len(positional) > 0 && len(cmd.Args) == 0 {
		// например «/ip service disable telnet,ftp» — в API это numbers=
		cmd.Args["numbers"] = strings.Join(positional, ",")
		cmd.Order = append(cmd.Order, "numbers")
	}
	return cmd, true
}

// rosWord превращает разобранную команду в набор слов для API.
func (c rosCommand) words() []string {
	out := []string{c.Path + "/" + c.Action}
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
	failed := 0

	// Перед изменениями делаем бэкап на самом роутере: если что-то пойдёт не так,
	// конфиг возвращается через Files → Restore.
	backupName := "before-apply-" + time.Now().Format("20060102-1504")
	backup := rosApplyResult{Status: "ok"}
	if _, err := c.command("/system backup save", "=name="+backupName, "=dont-encrypt=yes"); err != nil {
		backup.Status = "error"
		backup.Message = "бэкап не сделался: " + err.Error() + " — применяю без страховки"
	} else {
		backup.Message = "бэкап перед изменениями: " + backupName + " (Files → Restore)"
	}
	results = append(results, backup)

	for _, step := range steps {
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
		if _, err := c.command(cmd.words()...); err != nil {
			switch {
			case isAlreadyThere(err.Error()):
				res.Status = "exists"
				res.Message = "уже настроено — пропущено"
			case cmd.Ignore:
				res.Status = "exists"
				res.Message = err.Error()
			default:
				res.Status = "error"
				res.Message = err.Error()
				failed++
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

	if len(script) > 0 {
		name := "mtg-wizard-" + time.Now().Format("150405")
		srcLines := make([]string, 0, len(script))
		for _, st := range script {
			srcLines = append(srcLines, strings.TrimSpace(st.Cmd.Raw))
		}
		src := strings.Join(srcLines, "\n")
		res := rosApplyResult{Status: "script", Message: "выражения скрипта: строк " + fmt.Sprint(len(script))}
		if _, err := c.command("/system script add", "=name="+name, "=source="+src, "=policy=read,write,policy,test,romon"); err != nil {
			if isAlreadyThere(err.Error()) {
				_, _ = c.command("/system script remove", "=numbers="+name)
				_, err = c.command("/system script add", "=name="+name, "=source="+src, "=policy=read,write,policy,test,romon")
			}
			if err != nil {
				res.Status = "error"
				res.Message = "не удалось создать временный скрипт: " + err.Error()
				failed++
				results = append(results, res)
				return results, nil
			}
		}
		if _, err := c.command("/system script run", "=number="+name); err != nil {
			res.Status = "error"
			res.Message = err.Error()
			failed++
		} else {
			res.Message += " — выполнены"
		}
		_, _ = c.command("/system script remove", "=numbers="+name)
		results = append(results, res)
	}
	_ = failed
	return results, nil
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
			item.Note = "выражение скрипта — выполнится на роутере"
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
