package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const repoSlug = "zigorminsk-debug/mikrotik-gide"

// exitApp позволяет тестам подменять выход из процесса.
var exitApp = os.Exit

type updateAsset struct {
	Name   string `json:"name"`
	Size   int64  `json:"size"`
	URL    string `json:"browser_download_url"`
	Digest string `json:"digest"`
}

type release struct {
	TagName string        `json:"tag_name"`
	Name    string        `json:"name"`
	Body    string        `json:"body"`
	HTMLURL string        `json:"html_url"`
	Assets  []updateAsset `json:"assets"`
}

type updateInfo struct {
	OK        bool   `json:"ok"`
	Current   string `json:"current"`
	Latest    string `json:"latest"`
	Available bool   `json:"available"`
	Notes     string `json:"notes"`
	Size      int64  `json:"size"`
	Asset     string `json:"asset"`
	Setup     bool   `json:"setup"`
	URL       string `json:"url"`
	Digest    string `json:"-"`
}

type updater struct {
	current string
	build   string
	client  *http.Client
}

func newUpdater(version, build string) *updater {
	return &updater{current: version, build: build, client: &http.Client{Timeout: 60 * time.Second}}
}

// latest спрашивает GitHub о последнем релизе и сравнивает номера сборок.
func (u *updater) latest(ctx context.Context) (*updateInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.github.com/repos/"+repoSlug+"/releases/latest", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "mikrotik-gide-desktop/"+u.current)
	resp, err := u.client.Do(req)
	if err != nil {
		return nil, errors.New("нет связи с GitHub")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub ответил %d", resp.StatusCode)
	}
	var rel release
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&rel); err != nil {
		return nil, errors.New("не удалось прочитать ответ GitHub")
	}
	asset, ok := pickWindowsAsset(rel.Assets)
	if !ok {
		return nil, errors.New("в последнем релизе нет сборки для Windows")
	}
	latest := lastNumber(rel.TagName)
	if latest == 0 {
		latest = lastNumber(asset.Name)
	}
	current := lastNumber(u.build)
	if current == 0 {
		current = lastNumber(u.current)
	}
	return &updateInfo{
		OK:        true,
		Current:   u.current,
		Latest:    "1.0." + strconv.Itoa(latest),
		Available: latest > current,
		Notes:     trimNotes(rel.Body),
		Size:      asset.Size,
		Asset:     asset.Name,
		Setup:     isSetupAsset(asset.Name),
		URL:       asset.URL,
		Digest:    asset.Digest,
	}, nil
}

// download забирает exe и проверяет размер и SHA-256, если GitHub его отдал.
func (u *updater) download(ctx context.Context, info *updateInfo) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, info.URL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "mikrotik-gide-desktop/"+u.current)
	resp, err := u.client.Do(req)
	if err != nil {
		return nil, errors.New("нет связи с GitHub")
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("сервер отдал %d", resp.StatusCode)
	}
	const maxSize = 300 << 20
	data, err := io.ReadAll(io.LimitReader(resp.Body, maxSize+1))
	if err != nil {
		return nil, err
	}
	if len(data) > maxSize {
		return nil, errors.New("файл слишком большой")
	}
	if info.Size > 0 && int64(len(data)) != info.Size {
		return nil, fmt.Errorf("размер не совпал: %d вместо %d", len(data), info.Size)
	}
	if strings.HasPrefix(info.Digest, "sha256:") {
		sum := sha256.Sum256(data)
		want := strings.TrimPrefix(info.Digest, "sha256:")
		if !strings.EqualFold(hex.EncodeToString(sum[:]), want) {
			return nil, errors.New("контрольная сумма не совпала")
		}
	}
	return data, nil
}

// isSetupAsset отличает установщик от портативного exe по имени файла.
func isSetupAsset(name string) bool {
	n := strings.ToLower(name)
	return strings.HasSuffix(n, ".exe") && strings.Contains(n, "setup")
}

// pickWindowsAsset выбирает файл для обновления. Установщик в приоритете:
// он кладёт программу в одно место и закрывает работающую копию, поэтому
// рядом не появляется второй exe, который потом путают с новым.
func pickWindowsAsset(assets []updateAsset) (updateAsset, bool) {
	var portable, fallback updateAsset
	var havePortable, haveFallback bool
	for _, a := range assets {
		name := strings.ToLower(a.Name)
		if !strings.HasSuffix(name, ".exe") {
			continue
		}
		if isSetupAsset(name) {
			return a, true
		}
		if strings.Contains(name, "windows") && !havePortable {
			portable, havePortable = a, true
			continue
		}
		if !haveFallback {
			fallback, haveFallback = a, true
		}
	}
	if havePortable {
		return portable, true
	}
	return fallback, haveFallback
}

// checkExePayload проверяет, что скачался именно исполняемый файл Windows.
func checkExePayload(data []byte) error {
	if len(data) < 1<<20 {
		return errors.New("файл обновления слишком мал")
	}
	if len(data) < 2 || data[0] != 'M' || data[1] != 'Z' {
		return errors.New("скачанный файл не является программой Windows")
	}
	return nil
}

// installSetup запускает установщик в тихом режиме. Он сам закрывает
// работающую копию (/CLOSEAPPLICATIONS) и ставит программу в
// %LOCALAPPDATA%\Programs\MikroTik Gide — путь один, поэтому «открылась
// старая версия» больше не случается.
func installSetup(data []byte) error {
	dir := filepath.Join(os.TempDir(), "mikrotik-gide-setup")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	file := filepath.Join(dir, "setup-"+strconv.FormatInt(time.Now().UnixNano(), 36)+".exe")
	if err := os.WriteFile(file, data, 0o755); err != nil {
		return err
	}
	cmd := exec.Command(file,
		"/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART", "/NOCANCEL",
		"/CLOSEAPPLICATIONS", "/NORESTARTAPPLICATIONS")
	cmd.Dir = dir
	if err := cmd.Start(); err != nil {
		return err
	}
	go func() { _ = cmd.Wait() }()
	return nil
}

// applyUpdate ставит обновление: через установщик или подменой exe рядом.
func applyUpdate(exe string, info *updateInfo, data []byte) error {
	if err := checkExePayload(data); err != nil {
		return err
	}
	if info.Setup {
		return installSetup(data)
	}
	return installUpdate(exe, data)
}

// installUpdate кладёт новый exe рядом со старым, подменяет файл и запускает его.
// Работающий процесс Windows позволяет переименовать, но не удалить.
func installUpdate(exe string, data []byte) error {
	if err := checkExePayload(data); err != nil {
		return err
	}
	dir := filepath.Dir(exe)
	tmp := filepath.Join(dir, "update-"+strconv.FormatInt(time.Now().UnixNano(), 36)+".exe")
	if err := os.WriteFile(tmp, data, 0o755); err != nil {
		return err
	}
	old := exe + ".old"
	_ = os.Remove(old)
	if err := os.Rename(exe, old); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, exe); err != nil {
		_ = os.Rename(old, exe)
		_ = os.Remove(tmp)
		return err
	}
	if err := startProcess(exe, dir); err != nil {
		return fmt.Errorf("не удалось запустить новую версию: %w", err)
	}
	return nil
}

// startProcess вынесен отдельно, чтобы тесты не запускали реальный файл.
var startProcess = func(exe, dir string) error {
	cmd := exec.Command(exe)
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "MTG_UPDATED=1")
	return cmd.Start()
}

var numberRe = regexp.MustCompile(`\d+`)

// lastNumber возвращает последнее число в строке: build-51 → 51, v1.0.51 → 51.
func lastNumber(s string) int {
	nums := numberRe.FindAllString(s, -1)
	if len(nums) == 0 {
		return 0
	}
	n, err := strconv.Atoi(nums[len(nums)-1])
	if err != nil {
		return 0
	}
	return n
}

func trimNotes(body string) string {
	body = strings.TrimSpace(body)
	if len(body) > 1200 {
		body = body[:1200] + "…"
	}
	return body
}

func exePath() (string, error) {
	p, err := os.Executable()
	if err != nil {
		return "", err
	}
	return filepath.EvalSymlinks(p)
}

func goVersion() string {
	return runtime.Version()
}
