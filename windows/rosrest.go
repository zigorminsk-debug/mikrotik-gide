package main

import (
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

/* rosrest.go — второй способ опроса: REST API RouterOS 7 (www-ssl).
   Он удобен тем, что не требует ничего, кроме включённого www-ssl (443),
   и работает даже когда api/api-ssl закрыты. */

type restSource struct {
	base  string
	user  string
	pass  string
	http  *http.Client
	notes []string
}

func newRESTSource(address, user, pass string) *restSource {
	if user == "" {
		user = "admin"
	}
	tr := &http.Transport{
		// сертификат на роутере самоподписанный, соединение локальное
		TLSClientConfig:   &tls.Config{InsecureSkipVerify: true},
		DisableKeepAlives: false,
	}
	return &restSource{
		base: "https://" + address,
		user: user,
		pass: pass,
		http: &http.Client{Transport: tr, Timeout: 8 * time.Second},
	}
}

// fetch забирает /rest/<path>. Отсутствующее меню (404) — это не ошибка,
// а пустой ответ: роутер просто не знает такой команды.
func (s *restSource) fetch(path string) ([]map[string]string, error) {
	if strings.HasSuffix(path, "/print") {
		path = strings.TrimSuffix(path, "/print")
	}
	url := s.base + "/rest" + path
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(s.user, s.pass)
	req.Header.Set("Accept", "application/json")
	resp, err := s.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() { _ = resp.Body.Close() }()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	switch resp.StatusCode {
	case http.StatusOK:
	case http.StatusUnauthorized:
		return nil, errors.New("роутер отклонил логин или пароль")
	case http.StatusNotFound, http.StatusBadRequest:
		return nil, nil
	default:
		return nil, fmt.Errorf("HTTP %d на %s", resp.StatusCode, path)
	}
	var any1 interface{}
	if err := json.Unmarshal(body, &any1); err != nil {
		return nil, err
	}
	return flattenRows(any1), nil
}

// flattenRows приводит ответ REST (объект или массив объектов) к тем же
// строкам «ключ → значение», что отдаёт протокол API.
func flattenRows(v interface{}) []map[string]string {
	var objs []map[string]interface{}
	switch t := v.(type) {
	case []interface{}:
		for _, it := range t {
			if m, ok := it.(map[string]interface{}); ok {
				objs = append(objs, m)
			}
		}
	case map[string]interface{}:
		objs = append(objs, t)
	}
	out := make([]map[string]string, 0, len(objs))
	for _, m := range objs {
		row := make(map[string]string, len(m))
		for k, val := range m {
			switch tv := val.(type) {
			case string:
				row[k] = tv
			case float64:
				row[k] = fmt.Sprintf("%g", tv)
			case bool:
				row[k] = fmt.Sprintf("%t", tv)
			case nil:
				// пустое значение в RouterOS часто приходит как null
			case []interface{}:
				parts := make([]string, 0, len(tv))
				for _, x := range tv {
					parts = append(parts, fmt.Sprint(x))
				}
				row[k] = strings.Join(parts, ",")
			}
		}
		out = append(out, row)
	}
	return out
}

func probeREST(address, user, pass string) (*rosProbeInfo, error) {
	src := newRESTSource(address, user, pass)
	info, err := collectRouter(src, &rosProbeInfo{Transport: "rest"})
	if err != nil {
		return nil, err
	}
	info.Address = address
	return info, nil
}
