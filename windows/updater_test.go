package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLastNumber(t *testing.T) {
	cases := map[string]int{
		"build-51":            51,
		"1.0.51":              51,
		"Сборка 49 · v1.0.49": 49,
		"":                    0,
		"dev":                 0,
		"v1.2.3":              3,
	}
	for in, want := range cases {
		if got := lastNumber(in); got != want {
			t.Errorf("lastNumber(%q) = %d, ожидалось %d", in, got, want)
		}
	}
}

func TestPickWindowsAsset(t *testing.T) {
	assets := []updateAsset{
		{Name: "mikrotik-gide-v1.0.51.apk", Size: 400000},
		{Name: "content-pack.json", Size: 13000},
		{Name: "mikrotik-gide-windows-v1.0.51.exe", Size: 12000000},
	}
	got, ok := pickWindowsAsset(assets)
	if !ok || got.Name != "mikrotik-gide-windows-v1.0.51.exe" {
		t.Fatalf("выбран не тот файл: %+v, ok=%v", got, ok)
	}
	if _, ok := pickWindowsAsset([]updateAsset{{Name: "x.apk"}}); ok {
		t.Fatal("не должно быть exe среди apk")
	}
	if got, ok := pickWindowsAsset([]updateAsset{{Name: "other.exe"}}); !ok || got.Name != "other.exe" {
		t.Fatal("запасной вариант .exe должен подходить")
	}

	// Установщик важнее портативного exe: он ставит программу в одно место
	// и закрывает работающую копию, поэтому «открылась старая версия» —
	// ровно та ошибка, которую он лечит.
	withSetup := []updateAsset{
		{Name: "mikrotik-gide-windows-v1.0.60.exe", Size: 12000000},
		{Name: "mikrotik-gide-setup-v1.0.60.exe", Size: 13000000},
		{Name: "mikrotik-gide-v1.0.60.apk", Size: 400000},
	}
	got, ok = pickWindowsAsset(withSetup)
	if !ok || got.Name != "mikrotik-gide-setup-v1.0.60.exe" {
		t.Fatalf("должен выбираться установщик, выбран %+v", got)
	}
	if !isSetupAsset(got.Name) {
		t.Fatal("установщик не распознан по имени")
	}
	if isSetupAsset("mikrotik-gide-windows-v1.0.60.exe") {
		t.Fatal("портативный exe принят за установщик")
	}
}

// Слишком маленький или не-MZ файл не запускаем ни как exe, ни как установщик.
func TestApplyUpdateRejectsBrokenPayload(t *testing.T) {
	dir := t.TempDir()
	exe := filepath.Join(dir, "mikrotik-gide.exe")
	for _, info := range []*updateInfo{
		{Asset: "mikrotik-gide-setup-v1.0.60.exe", Setup: true},
		{Asset: "mikrotik-gide-windows-v1.0.60.exe"},
	} {
		if err := applyUpdate(exe, info, []byte("nope")); err == nil {
			t.Fatalf("для %s принят мусор вместо программы", info.Asset)
		}
		if err := applyUpdate(exe, info, append([]byte("MZ"), make([]byte, 100)...)); err == nil {
			t.Fatalf("для %s принят обрезанный файл", info.Asset)
		}
	}
}

func TestInstallUpdateReplacesFile(t *testing.T) {
	dir := t.TempDir()
	exe := filepath.Join(dir, "mikrotik-gide.exe")
	if err := os.WriteFile(exe, []byte("old"), 0o755); err != nil {
		t.Fatal(err)
	}
	started := ""
	oldStart := startProcess
	startProcess = func(path, wd string) error { started = path; return nil }
	defer func() { startProcess = oldStart }()

	payload := append([]byte("MZ"), make([]byte, 2<<20)...)
	if err := installUpdate(exe, payload); err != nil {
		t.Fatalf("installUpdate: %v", err)
	}
	data, err := os.ReadFile(exe)
	if err != nil {
		t.Fatal(err)
	}
	if len(data) != len(payload) {
		t.Fatalf("размер нового файла %d, ожидался %d", len(data), len(payload))
	}
	if started != exe {
		t.Fatalf("запущен %q, ожидался %q", started, exe)
	}
	backup, err := os.ReadFile(exe + ".old")
	if err != nil || string(backup) != "old" {
		t.Fatalf("резервная копия не создана: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "update-bad.exe")); err == nil {
		t.Fatal("временный файл не должен оставаться")
	}
}

func TestInstallUpdateRejectsGarbage(t *testing.T) {
	dir := t.TempDir()
	exe := filepath.Join(dir, "app.exe")
	if err := os.WriteFile(exe, []byte("old"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := installUpdate(exe, []byte("not an exe")); err == nil {
		t.Fatal("мусор должен отвергаться")
	}
	if err := installUpdate(exe, append([]byte("MZ"), make([]byte, 100)...)); err == nil {
		t.Fatal("слишком маленький файл должен отвергаться")
	}
	if data, _ := os.ReadFile(exe); string(data) != "old" {
		t.Fatal("исходный файл не должен меняться при ошибке")
	}
}
