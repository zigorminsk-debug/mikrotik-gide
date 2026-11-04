package main

import "testing"

// «Запустил 148, а открылась 130»: findRunning находил старый экземпляр и
// открывал его окно. Решение принимается по версии/сборке, а не по занятости
// порта.
func TestSameBuild(t *testing.T) {
	savedVer, savedBuild := version, buildNo
	defer func() { version, buildNo = savedVer, savedBuild }()
	version, buildNo = "1.0.148", "148"

	cases := []struct {
		ver, build string
		want       bool
		why        string
	}{
		{"1.0.148", "148", true, "та же сборка — можно открыть её окно"},
		{"1.0.130", "130", false, "старая копия: открывать её нельзя"},
		{"1.0.148", "130", false, "версия совпала, сборка нет"},
		{"", "", false, "версия неизвестна — считаем чужой"},
		{"", "148", true, "сборка известна и совпала"},
		{"dev", "dev", false, "dev-сборки не переиспользуем"},
	}
	for _, c := range cases {
		if got := sameBuild(c.ver, c.build); got != c.want {
			t.Errorf("sameBuild(%q, %q) = %v, ожидалось %v (%s)",
				c.ver, c.build, got, c.want, c.why)
		}
	}

	if orDash("") != "?" || orDash("1.0.148") != "1.0.148" {
		t.Error("orDash должен подставлять «?» вместо пустой строки")
	}
}
