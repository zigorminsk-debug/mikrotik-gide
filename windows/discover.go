package main

import (
	"context"
	"encoding/binary"
	"net"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

/* discover.go — поиск роутеров MikroTik в локальной сети.

   Две вещи, за которые этот файл отвечает:

   1) MNDP (MikroTik Neighbor Discovery Protocol, UDP 5678). Роутер сам
      рассказывает о себе: имя, версию RouterOS, плату, MAC и адрес.
      Логин для этого не нужен.

   2) Перебор адресов своей подсети по открытым портам 8728 (API) и 8291
      (Winbox) — на случай, когда MNDP молчит (broadcast режется, роутер в
      соседнем сегменте, discovery выключен на интерфейсе).

   ВАЖНО (исправление ошибки «находит адреса не из этой сети»):
   раньше в список попадали ВСЕ приватные /24 со всех сетевых адаптеров —
   вместе с Hyper-V Default Switch (172.x), WSL, Docker, VirtualBox
   (192.168.56.x) и VPN. Теперь виртуальные адаптеры и их диапазоны
   отбрасываются, а адрес берётся из источника UDP-пакета: роутер точно
   отвечает со своего настоящего адреса. */

const mndpPort = 5678

// mndpProbe — минимальный пакет-запрос MNDP (заголовок: версия 0, TTL 0).
var mndpProbe = []byte{0, 0, 0, 0}

// discoveredRouter — найденный в сети роутер (то, что видит пользователь).
type discoveredRouter struct {
	Address  string `json:"address"`  // адрес, по которому отвечает роутер
	Identity string `json:"identity"` // System → Identity
	Version  string `json:"version"`  // 7.24.6
	Board    string `json:"board"`    // RB951G-2HnD
	Platform string `json:"platform"` // MikroTik
	MAC      string `json:"mac"`      // MAC из MNDP (по нему подключаются в Winbox)
	Source   string `json:"source"`   // mndp | port
	Port     int    `json:"port"`     // 0 для MNDP, иначе открытый порт
	SameNet  bool   `json:"sameNet"`  // отвечает из нашей подсети
}

// localNet — подсеть, которую имеет смысл сканировать.
type localNet struct {
	Iface string
	IP    net.IP
	Net   *net.IPNet
}

// virtualAdapterRe — имена виртуальных адаптеров Windows и туннелей.
// Их подсети к роутерам MikroTik отношения не имеют, а сканирование
// занимает время и выдаёт «чужие» адреса.
var virtualAdapterRe = regexp.MustCompile(`(?i)vethernet|hyper-v|virtualbox|vmware|wsl|docker|tailscale|zerotier|openvpn|wireguard|ipsec|pptp|loopback|npcap|tap[-\d]|tun\d|teredo|isatap`)

// virtualRanges — диапазоны, зарезервированные под виртуальные машины и
// служебные сети. Проверяются по адресу адаптера, а не по имени: на разных
// системах имена разные, а адреса одинаковые.
var virtualRanges = mustCIDRs(
	"172.16.0.0/12",   // Docker, WSL2, Hyper-V Default Switch
	"192.168.56.0/24", // VirtualBox host-only
	"10.0.2.0/24",     // QEMU / VirtualBox NAT
	"10.211.55.0/24",  // Parallels
	"169.254.0.0/16",  // link-local (APIPA) — роутера там нет
	"0.0.0.0/8",       // «нет адреса»
	"127.0.0.0/8",     // loopback
)

// mustCIDRs разбирает список сетей; ошибка в литерале — повод упасть на
// тестах, а не в работе, поэтому паникуем осознанно.
func mustCIDRs(list ...string) []*net.IPNet {
	out := make([]*net.IPNet, 0, len(list))
	for _, s := range list {
		_, n, err := net.ParseCIDR(s)
		if err != nil {
			panic("discover: плохая сеть " + s + ": " + err.Error())
		}
		out = append(out, n)
	}
	return out
}

// inAnyNet сообщает, попадает ли адрес в один из диапазонов.
func inAnyNet(ip net.IP, nets []*net.IPNet) bool {
	for _, n := range nets {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

// usableLocalAddr — годится ли адрес адаптера для поиска роутера.
// Вынесено отдельной функцией, чтобы правило можно было проверить тестом
// без реальных сетевых адаптеров: именно здесь отсекаются «чужие» подсети
// (Hyper-V 172.17–31.x, WSL, Docker, VirtualBox 192.168.56.x, APIPA).
func usableLocalAddr(iface string, ip net.IP) bool {
	if ip == nil || ip.To4() == nil || !ip.IsPrivate() {
		return false
	}
	if virtualAdapterRe.MatchString(iface) {
		return false
	}
	return !inAnyNet(ip, virtualRanges)
}

// usableLocalNets собирает подсети, которые действительно могут содержать
// роутер: пропускает виртуальные адаптеры и служебные диапазоны.
func usableLocalNets() []localNet {
	var out []localNet
	ifaces, err := net.Interfaces()
	if err != nil {
		return out
	}
	for _, ifc := range ifaces {
		if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
			continue
		}
		if virtualAdapterRe.MatchString(ifc.Name) {
			continue
		}
		addrs, err := ifc.Addrs()
		if err != nil {
			continue
		}
		for _, a := range addrs {
			ipnet, ok := a.(*net.IPNet)
			if !ok {
				continue
			}
			v4 := ipnet.IP.To4()
			if !usableLocalAddr(ifc.Name, v4) {
				continue
			}
			// берём /24 вокруг нашего адреса: роутер по умолчанию живёт в нём
			mask := net.CIDRMask(24, 32)
			out = append(out, localNet{
				Iface: ifc.Name,
				IP:    v4,
				Net:   &net.IPNet{IP: v4.Mask(mask), Mask: mask},
			})
		}
	}
	// сначала сети с адресом вида .1–.9 у нашего интерфейса: там чаще шлюз
	sort.SliceStable(out, func(i, j int) bool { return out[i].Iface < out[j].Iface })
	return out
}

// broadcastOf возвращает широковещательный адрес подсети (192.168.88.255).
// Слать запрос на общий 255.255.255.255 бесполезно, если у машины несколько
// адаптеров: пакет уйдёт только через тот, что выбран маршрутом по умолчанию.
func broadcastOf(n *net.IPNet) net.IP {
	ip := n.IP.To4()
	if ip == nil {
		return nil
	}
	b := make(net.IP, 4)
	for i := 0; i < 4; i++ {
		b[i] = ip[i] | ^n.Mask[i]
	}
	return b
}

/* ---------------------------------------------------------------- MNDP --- */

// parseMNDP разбирает пакет MNDP строго по формату:
//
//	заголовок: 4 байта (версия 2 байта, TTL 2 байта)
//	дальше TLV: тип (2 байта), длина (2 байта), значение (длина байт)
//
// Типы, которые нас интересуют: 1 — MAC, 2 — identity, 3 — версия,
// 4 — платформа, 7 — плата, 11 — IPv4-адрес.
//
// Второй результат — удалось ли разобрать пакет целиком. Раньше парсер
// «подбирал» смещение и мог выдать случайные 4 байта за IP — отсюда в списке
// появлялись адреса не из сети. Теперь сомнительный пакет просто отбрасывается.
func parseMNDP(b []byte) (map[string]string, bool) {
	out := map[string]string{}
	if len(b) < 8 {
		return out, false
	}
	off := 4 // заголовок MNDP
	for off+4 <= len(b) {
		typ := int(binary.BigEndian.Uint16(b[off : off+2]))
		ln := int(binary.BigEndian.Uint16(b[off+2 : off+4]))
		off += 4
		if typ < 1 || typ > 12 || ln < 0 || off+ln > len(b) {
			return out, false
		}
		val := b[off : off+ln]
		off += ln
		switch typ {
		case 1: // MAC
			if len(val) != 6 {
				return out, false
			}
			out["mac"] = net.HardwareAddr(val).String()
		case 2:
			out["identity"] = cleanText(val)
		case 3:
			out["version"] = cleanText(val)
		case 4:
			out["platform"] = cleanText(val)
		case 5: // uptime — 4 байта, не нужен
			if len(val) != 4 {
				return out, false
			}
		case 7:
			out["board"] = cleanText(val)
		case 8, 12: // флаги и опции конфигурации
		case 9: // IPv6
			if len(val) != 16 {
				return out, false
			}
		case 10: // имя интерфейса
			out["interface"] = cleanText(val)
		case 11: // IPv4
			if len(val) != 4 {
				return out, false
			}
			ip := net.IP(val)
			if ip.IsUnspecified() || ip.IsMulticast() || ip.Equal(net.IPv4bcast) {
				return out, false
			}
			out["ip"] = ip.String()
		}
	}
	return out, true
}

// cleanText приводит строку из пакета к виду, пригодному для показа.
func cleanText(b []byte) string {
	return strings.TrimSpace(strings.ToValidUTF8(string(b), ""))
}

// discoverMNDP рассылает запрос по всем «настоящим» подсетям и слушает ответы.
// nets передаётся снаружи, чтобы признак sameNet считался по тому же набору
// подсетей, по которому шлём запрос (включая адрес, введённый вручную).
func discoverMNDP(d time.Duration, nets []localNet) []discoveredRouter {
	conn, err := net.ListenUDP("udp4", &net.UDPAddr{IP: net.IPv4zero, Port: mndpPort})
	if err != nil {
		// порт занят (например, открыт второй экземпляр программы) — без MNDP
		return nil
	}
	defer func() { _ = conn.Close() }()
	_ = conn.SetDeadline(time.Now().Add(d))

	type hit struct {
		router discoveredRouter
		from   net.IP
	}
	results := map[string]hit{}
	done := make(chan struct{})
	go func() {
		defer close(done)
		buf := make([]byte, 2048)
		for {
			n, addr, err := conn.ReadFromUDP(buf)
			if err != nil {
				return
			}
			from := addr.IP.To4()
			if from == nil || from.IsLoopback() {
				continue
			}
			fields, ok := parseMNDP(buf[:n])
			if !ok {
				continue // битый или не MNDP-пакет
			}
			// Адрес берём из источника пакета: это гарантированно адрес роутера
			// в нашей сети. Адрес из TLV (type 11) может быть из другого
			// интерфейса роутера — показываем его только как дополнение.
			ip := from.String()
			r := discoveredRouter{
				Address:  ip,
				Identity: fields["identity"],
				Version:  fields["version"],
				Board:    fields["board"],
				Platform: fields["platform"],
				MAC:      fields["mac"],
				Source:   "mndp",
			}
			results[ip] = hit{router: r, from: from}
		}
	}()

	targets := make([]*net.UDPAddr, 0, len(nets)+1)
	for _, ln := range nets {
		if b := broadcastOf(ln.Net); b != nil {
			targets = append(targets, &net.UDPAddr{IP: b, Port: mndpPort})
		}
	}
	targets = append(targets, &net.UDPAddr{IP: net.IPv4bcast, Port: mndpPort})
	for i := 0; i < 3; i++ {
		for _, t := range targets {
			_, _ = conn.WriteToUDP(mndpProbe, t)
		}
		time.Sleep(500 * time.Millisecond)
	}
	<-done

	out := make([]discoveredRouter, 0, len(results))
	for _, h := range results {
		h.router.SameNet = inLocalSubnet(h.from, nets)
		out = append(out, h.router)
	}
	return out
}

// inLocalSubnet — отвечает ли адрес из одной из наших «настоящих» подсетей.
func inLocalSubnet(ip net.IP, nets []localNet) bool {
	for _, ln := range nets {
		if ln.Net.Contains(ip) {
			return true
		}
	}
	return false
}

/* ---------------------------------------------------------- перебор портов --- */

// scanPorts перебирает адреса подсетей и оставляет хосты с открытым API
// или Winbox. Используется только как запасной способ, когда MNDP молчит.
// d — таймаут на один адрес (соединение не ждёт дольше).
func scanPorts(nets []localNet, d time.Duration) []discoveredRouter {
	if len(nets) == 0 {
		return nil
	}
	if len(nets) > 3 {
		nets = nets[:3]
	}
	ports := []int{8728, 8291}
	resCh := make(chan discoveredRouter, 32)
	var wg sync.WaitGroup
	sem := make(chan struct{}, 256) // 254 адреса × 2 порта — гоним волнами
	// Общий предел на весь перебор: на каждый адрес отводим d, волн примерно
	// (254·2)/256, плюс запас на медленные ответы. Без запаса скан обрывался
	// на второй подсети, и «роутер не найден» было неправдой.
	budget := d * 8 * time.Duration(len(nets))
	if budget > 12*time.Second {
		budget = 12 * time.Second
	}
	ctx, cancel := context.WithTimeout(context.Background(), budget)
	defer cancel()

	for _, ln := range nets {
		base := ln.Net.IP.To4()
		if base == nil {
			continue
		}
		prefix := strconv.Itoa(int(base[0])) + "." + strconv.Itoa(int(base[1])) + "." + strconv.Itoa(int(base[2])) + "."
		for host := 1; host < 255; host++ {
			for _, port := range ports {
				wg.Add(1)
				go func(ip string, port int) {
					defer wg.Done()
					select {
					case sem <- struct{}{}:
					case <-ctx.Done():
						return
					}
					defer func() { <-sem }()
					addr := net.JoinHostPort(ip, strconv.Itoa(port))
					conn, err := (&net.Dialer{Timeout: d}).DialContext(ctx, "tcp", addr)
					if err != nil {
						return
					}
					_ = conn.Close()
					resCh <- discoveredRouter{Address: ip, Source: "port", Port: port, SameNet: true}
				}(prefix+strconv.Itoa(host), port)
			}
		}
	}
	go func() { wg.Wait(); close(resCh) }()

	found := map[string]discoveredRouter{}
	for r := range resCh {
		// порт API информативнее Winbox: по нему можно сразу опрашивать версию
		if old, ok := found[r.Address]; ok && old.Port == 8728 {
			continue
		}
		found[r.Address] = r
	}
	out := make([]discoveredRouter, 0, len(found))
	for _, r := range found {
		out = append(out, r)
	}
	return out
}

/* ------------------------------------------------------------------ итог --- */

// discoverRouters объединяет MNDP и перебор портов.
// preferAddr — адрес, введённый пользователем: его подсеть сканируем первой.
func discoverRouters(d time.Duration, preferAddr string) []discoveredRouter {
	nets := usableLocalNets()
	if want := net.ParseIP(normalizeAddress(preferAddr)).To4(); want != nil && want.IsPrivate() {
		// Подсеть, в которой находится введённый адрес, — в начало списка.
		if !inLocalSubnet(want, nets) {
			// Адрес мог попасть в отсечённый диапазон (например, у человека
			// роутер действительно 192.168.56.1). Если адрес ввели руками,
			// доверяем человеку: ищем и в этой подсети.
			mask := net.CIDRMask(24, 32)
			nets = append([]localNet{{
				Iface: "адрес указан вручную",
				IP:    want,
				Net:   &net.IPNet{IP: want.Mask(mask), Mask: mask},
			}}, nets...)
		}
		sort.SliceStable(nets, func(i, j int) bool {
			return !nets[i].Net.Contains(want) && nets[j].Net.Contains(want)
		})
	}

	byAddr := map[string]discoveredRouter{}
	for _, r := range discoverMNDP(d, nets) {
		byAddr[r.Address] = r
	}
	if len(byAddr) == 0 {
		for _, r := range scanPorts(nets, 300*time.Millisecond) {
			byAddr[r.Address] = r
		}
	}

	out := make([]discoveredRouter, 0, len(byAddr))
	for _, r := range byAddr {
		out = append(out, r)
	}
	// сначала свои подсети, потом всё остальное; внутри — по адресу
	sort.Slice(out, func(i, j int) bool {
		if out[i].SameNet != out[j].SameNet {
			return out[i].SameNet
		}
		return ipLess(out[i].Address, out[j].Address)
	})
	return out
}

// ipLess сравнивает адреса численно (чтобы 192.168.88.2 шёл раньше .10).
func ipLess(a, b string) bool {
	ia, ib := net.ParseIP(a).To4(), net.ParseIP(b).To4()
	if ia == nil || ib == nil {
		return a < b
	}
	return binary.BigEndian.Uint32(ia) < binary.BigEndian.Uint32(ib)
}
