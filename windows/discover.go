package main

import (
	"context"
	"encoding/binary"
	"net"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

/* discover.go — поиск роутеров в локальной сети без логина и пароля.
   Два независимых способа:
     1) MNDP (UDP 5678) — соседи MikroTik сами рассказывают имя, версию и плату;
     2) быстрый перебор адресов своей подсети по открытым портам 8728/8291. */

// discoveredRouter — найденный в сети роутер.
type discoveredRouter struct {
	Address  string `json:"address"`
	Identity string `json:"identity"`
	Version  string `json:"version"`
	Board    string `json:"board"`
	Platform string `json:"platform"`
	Source   string `json:"source"` // mndp | port
	Port     int    `json:"port"`
}

// mndpProbe — запрос «кто тут MikroTik?».
var mndpProbe = []byte{0, 0, 0, 0}

// parseMNDP разбирает пакет MNDP и возвращает найденные поля.
// Формат: 4 байта заголовка, дальше TLV (2 байта тип, 2 байта длина, значение).
func parseMNDP(b []byte) map[string]string {
	out := map[string]string{}
	parse := func(off int) map[string]string {
		res := map[string]string{}
		for off+4 <= len(b) {
			typ := int(binary.BigEndian.Uint16(b[off : off+2]))
			ln := int(binary.BigEndian.Uint16(b[off+2 : off+4]))
			off += 4
			if ln < 0 || off+ln > len(b) {
				return nil
			}
			val := b[off : off+ln]
			off += ln
			switch typ {
			case 2:
				res["identity"] = string(val)
			case 3:
				res["version"] = string(val)
			case 4:
				res["platform"] = string(val)
			case 7:
				res["board"] = string(val)
			case 11:
				if len(val) == 4 || len(val) == 16 {
					res["address"] = net.IP(val).String()
				}
			}
		}
		return res
	}
	for _, off := range []int{4, 0, 6, 2} {
		if off >= len(b) {
			continue
		}
		if res := parse(off); len(res) > len(out) {
			out = res
		}
	}
	return out
}

// discoverMNDP слушает 5678 и рассылает запрос в broadcast.
func discoverMNDP(d time.Duration) []discoveredRouter {
	conn, err := net.ListenUDP("udp4", &net.UDPAddr{IP: net.IPv4zero, Port: 5678})
	if err != nil {
		// порт занят (например, запущен второй экземпляр) — работаем без MNDP
		return nil
	}
	defer func() { _ = conn.Close() }()
	_ = conn.SetDeadline(time.Now().Add(d))

	found := map[string]discoveredRouter{}
	done := make(chan struct{})
	go func() {
		defer close(done)
		buf := make([]byte, 2048)
		for {
			n, addr, err := conn.ReadFromUDP(buf)
			if err != nil {
				return
			}
			fields := parseMNDP(buf[:n])
			ip := addr.IP.String()
			if v := fields["address"]; v != "" {
				ip = v
			}
			if ip == "" || strings.HasPrefix(ip, "127.") {
				continue
			}
			found[ip] = discoveredRouter{
				Address:  ip,
				Identity: fields["identity"],
				Version:  fields["version"],
				Board:    fields["board"],
				Platform: fields["platform"],
				Source:   "mndp",
			}
		}
	}()

	dst := &net.UDPAddr{IP: net.IPv4bcast, Port: 5678}
	for i := 0; i < 4; i++ {
		_, _ = conn.WriteToUDP(mndpProbe, dst)
		time.Sleep(400 * time.Millisecond)
	}
	<-done

	out := make([]discoveredRouter, 0, len(found))
	for _, r := range found {
		out = append(out, r)
	}
	return out
}

// localSubnets возвращает адреса /24 своих частных интерфейсов.
func localSubnets() []string {
	var out []string
	ifaces, err := net.Interfaces()
	if err != nil {
		return out
	}
	seen := map[string]bool{}
	for _, ifc := range ifaces {
		if ifc.Flags&net.FlagUp == 0 || ifc.Flags&net.FlagLoopback != 0 {
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
			if v4 == nil || !v4.IsPrivate() {
				continue
			}
			base := v4.Mask(net.CIDRMask(24, 32)).String()
			if !seen[base] {
				seen[base] = true
				out = append(out, base)
			}
		}
	}
	return out
}

// scanPorts перебирает адреса подсетей и оставляет те, где открыт порт API/Winbox.
func scanPorts(subnets []string, d time.Duration) []discoveredRouter {
	if len(subnets) == 0 {
		return nil
	}
	if len(subnets) > 3 {
		subnets = subnets[:3]
	}
	ports := []int{8728, 8291}
	resCh := make(chan discoveredRouter, 32)
	var wg sync.WaitGroup
	sem := make(chan struct{}, 128)
	ctx, cancel := context.WithTimeout(context.Background(), d*3)
	defer cancel()

	for _, base := range subnets {
		prefix := strings.TrimSuffix(base, "0")
		if prefix == "" {
			continue
		}
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
					resCh <- discoveredRouter{Address: ip, Source: "port", Port: port}
				}(prefix+strconv.Itoa(host), port)
			}
		}
	}
	go func() { wg.Wait(); close(resCh) }()

	found := map[string]discoveredRouter{}
	for r := range resCh {
		if old, ok := found[r.Address]; ok {
			if old.Port == 8728 {
				continue // порт API информативнее Winbox
			}
		}
		found[r.Address] = r
	}
	out := make([]discoveredRouter, 0, len(found))
	for _, r := range found {
		out = append(out, r)
	}
	return out
}

// discoverRouters объединяет оба способа: у MNDP-записей есть имя и версия,
// записи по портам дополняют список теми, кто не отвечает на broadcast.
func discoverRouters(d time.Duration) []discoveredRouter {
	mndp := discoverMNDP(d)
	byAddr := map[string]discoveredRouter{}
	for _, r := range mndp {
		byAddr[r.Address] = r
	}
	// перебор подсетей — только если MNDP не нашёл ничего: он быстрее и точнее
	if len(byAddr) == 0 {
		for _, r := range scanPorts(localSubnets(), 350*time.Millisecond) {
			byAddr[r.Address] = r
		}
	}
	out := make([]discoveredRouter, 0, len(byAddr))
	for _, r := range byAddr {
		out = append(out, r)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Address == out[j].Address {
			return out[i].Port < out[j].Port
		}
		return out[i].Address < out[j].Address
	})
	return out
}
