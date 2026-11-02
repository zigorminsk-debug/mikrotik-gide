/* =========================================================================
   wizard.js — генератор готового конфига RouterOS 7.
   Возможности: WAN (DHCP/статика/PPPoE), LAN+DHCP, гостевая VLAN, Wi-Fi,
   IPv6 (PD или статика), NAT + проброс портов, firewall, WireGuard,
   L2TP/IPsec-сервер, PPPoE-сервер, автобэкап.
   API: ConfigWizard.generate(opts), .validate(opts), .presets(), .defaults
   ========================================================================= */
(function () {
  'use strict';

  const C = window.NetCalc || null;

  const DEFAULTS = {
    identity: 'office-gw',
    preset: '',
    wan: 'dhcp',            // dhcp | static | pppoe
    wanPort: 'ether1',
    wanIp: '203.0.113.20', wanPrefix: 24, wanGw: '203.0.113.1',
    pppoeUser: 'login', pppoePass: 'password',
    lanPorts: 'ether2-ether5',
    lanIp: '192.168.88.1', lanPrefix: 24,
    bridge: 'bridge-lan',
    dhcp: true, dns: '1.1.1.1,8.8.8.8',
    guest: true, guestPort: 'ether5', guestIp: '192.168.20.1', guestPrefix: 24,
    wifi: false, wifiSsid: 'Office', wifiPass: 'WiFi-Pass-2026', wifiGuestSsid: 'Office-Guest',
    wifiGuestPass: 'Guest-Pass-2026',
    ipv6: 'off',            // off | pd | static
    ipv6Prefix: '2001:db8:1::/64',
    wg: true, wgIp: '10.10.10.1', wgPort: 13231,
    l2tp: false, l2tpPsk: 'IPsec-PSK-2026', l2tpPool: '10.20.20.10-10.20.20.99',
    pppoeServer: false, pppoeServerPort: 'ether5', pppoePool: '10.30.30.10-10.30.30.99',
    pppoeServerUser: '', pppoeServerPass: '',
    forwards: [],           // [{proto, extPort, toIp, toPort, comment}]
    nat: true, protect: true,
    autobackup: false,
    tz: 'Europe/Minsk', ntp: 'by.pool.ntp.org'
  };

  const PRESETS = {
    home: {
      name: 'Дом / квартира',
      set: { identity: 'home-gw', wan: 'dhcp', guest: false, wifi: true, wg: false, ipv6: 'pd', protect: true }
    },
    office: {
      name: 'Офис',
      set: { identity: 'office-gw', wan: 'dhcp', guest: true, wifi: true, wg: true, ipv6: 'off', protect: true }
    },
    cafe: {
      name: 'Гостевой Wi-Fi',
      set: { identity: 'cafe-gw', wan: 'dhcp', guest: true, wifi: true, wg: false, ipv6: 'off', dhcp: true }
    },
    isp: {
      name: 'PPPoE-сервер',
      set: { identity: 'isp-gw', wan: 'static', guest: false, wifi: false, wg: false, pppoeServer: true, ipv6: 'off' }
    },
    hub: {
      name: 'VPN-хаб',
      set: { identity: 'vpn-hub', wan: 'static', guest: false, wifi: false, wg: true, l2tp: true, ipv6: 'off' }
    }
  };

  function clean(v) {
    return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/"/g, '').trim();
  }

  function opt(o, k) {
    const v = o && o[k] != null && o[k] !== '' ? o[k] : DEFAULTS[k];
    return v;
  }

  function q(v) { return '"' + clean(v) + '"'; }

  function ipOk(s) { return C ? C.ipToInt(s) != null : /\d+\.\d+\.\d+\.\d+/.test(String(s)); }

  function expandPorts(spec) {
    const out = [];
    String(spec || '').split(',').forEach(function (piece) {
      const p = piece.trim();
      if (!p) return;
      const m = p.match(/^([a-zA-Z]+)(\d+)\s*-\s*([a-zA-Z]*)(\d+)$/);
      if (m && +m[4] >= +m[2] && +m[4] - +m[2] <= 48) {
        for (let i = +m[2]; i <= +m[4]; i++) out.push(m[1] + i);
        return;
      }
      out.push(p);
    });
    return out;
  }

  function netCidr(ip, prefix) {
    if (C && C.parse) {
      const p = C.parse(ip + '/' + prefix);
      if (p) return p.ipStr + '/' + p.prefix;
    }
    return String(ip) + '/' + prefix;
  }

  function networkOf(ip, prefix) {
    if (!C) return null;
    const p = C.parse(ip + '/' + prefix);
    if (!p) return null;
    const inf = C.info(p.ip, p.prefix);
    return inf ? { start: inf.networkInt, end: inf.networkInt + Math.pow(2, 32 - p.prefix) - 1, cidr: inf.cidr } : null;
  }

  function overlaps(a, b) {
    if (!a || !b) return false;
    return a.start <= b.end && b.start <= a.end;
  }

  function ipInNetwork(ip, net) {
    if (!net || !C) return false;
    const n = C.ipToInt(ip);
    return n != null && n >= net.start && n <= net.end;
  }

  function ipv6Ok(s) {
    const t = String(s || '').trim();
    return /^[0-9a-fA-F:]{2,39}\/\d{1,3}$/.test(t);
  }

  /* адрес роутера из префикса: 2001:db8:1::/64 → 2001:db8:1::1/64 */
  function v6RouterAddress(prefix) {
    const base = String(prefix || '2001:db8:1::/64').replace(/\/\d+$/, '').replace(/::?$/, '');
    return (base ? base + '::1' : '2001:db8:1::1') + '/64';
  }

  /* ---------------- проверка ответов ---------------- */
  function validate(rawOpts) {
    const o = rawOpts || {};
    const issues = [];
    const err = function (field, msg) { issues.push({ field: field, msg: msg, level: 'error' }); };
    const warn = function (field, msg) { issues.push({ field: field, msg: msg, level: 'warn' }); };

    if (!clean(opt(o, 'identity'))) err('identity', 'Укажите имя роутера');
    if (!ipOk(opt(o, 'lanIp'))) err('lanIp', 'Некорректный IP роутера в LAN');
    const lanPrefix = +opt(o, 'lanPrefix');
    if (!(lanPrefix >= 8 && lanPrefix <= 30)) err('lanPrefix', 'Префикс LAN должен быть от 8 до 30');
    const lanNet = lanPrefix >= 8 && lanPrefix <= 30 ? networkOf(opt(o, 'lanIp'), lanPrefix) : null;

    const wan = opt(o, 'wan');
    if (wan === 'static') {
      if (!ipOk(opt(o, 'wanIp'))) err('wanIp', 'Некорректный IP WAN');
      if (!ipOk(opt(o, 'wanGw'))) err('wanGw', 'Некорректный шлюз провайдера');
      const wanPrefix = +opt(o, 'wanPrefix');
      if (!(wanPrefix >= 8 && wanPrefix <= 30)) err('wanPrefix', 'Префикс WAN должен быть от 8 до 30');
      if (ipOk(opt(o, 'wanIp')) && ipOk(opt(o, 'wanGw'))) {
        const w = networkOf(opt(o, 'wanIp'), wanPrefix);
        const g = C ? C.ipToInt(opt(o, 'wanGw')) : null;
        if (w && g != null && (g < w.start || g > w.end)) warn('wanGw', 'Шлюз не входит в подсеть WAN — проверьте');
      }
    }
    if (wan === 'pppoe') {
      if (clean(opt(o, 'pppoeUser')) === 'login' || !clean(opt(o, 'pppoeUser'))) err('pppoeUser', 'Укажите логин PPPoE');
      if (clean(opt(o, 'pppoePass')) === 'password' || !clean(opt(o, 'pppoePass'))) err('pppoePass', 'Укажите пароль PPPoE');
    }

    if (opt(o, 'guest')) {
      if (!ipOk(opt(o, 'guestIp'))) err('guestIp', 'Некорректный IP гостевого шлюза');
      const gp = +opt(o, 'guestPrefix');
      if (!(gp >= 8 && gp <= 30)) err('guestPrefix', 'Префикс гостевой сети от 8 до 30');
      const gNet = gp >= 8 && gp <= 30 ? networkOf(opt(o, 'guestIp'), gp) : null;
      if (lanNet && gNet && overlaps(lanNet, gNet)) err('guestIp', 'Гостевая сеть пересекается с LAN');
    }

    if (opt(o, 'wifi')) {
      if (!clean(opt(o, 'wifiSsid'))) err('wifiSsid', 'Укажите имя Wi-Fi сети');
      if (String(opt(o, 'wifiPass')).length < 8) err('wifiPass', 'Пароль WPA2 — минимум 8 символов');
      if (opt(o, 'guest') && String(opt(o, 'wifiGuestPass')).length < 8) err('wifiGuestPass', 'Пароль гостевого Wi-Fi — минимум 8 символов');
    }

    if (opt(o, 'ipv6') === 'static' && !ipv6Ok(opt(o, 'ipv6Prefix'))) {
      err('ipv6Prefix', 'Префикс IPv6 в формате 2001:db8:1::/64');
    }

    if (opt(o, 'wg')) {
      if (!ipOk(opt(o, 'wgIp'))) err('wgIp', 'Некорректный адрес WireGuard');
      const p = +opt(o, 'wgPort');
      if (!(p >= 1 && p <= 65535)) err('wgPort', 'Порт WireGuard от 1 до 65535');
      if (opt(o, 'l2tp') && +opt(o, 'wgPort') === 500) warn('wgPort', 'Порт 500 занят IPsec');
    }

    if (opt(o, 'l2tp') && String(opt(o, 'l2tpPsk')).length < 8) {
      err('l2tpPsk', 'IPsec PSK — минимум 8 символов');
    }
    const wanPortV = clean(opt(o, 'wanPort')) || 'ether1';
    if (opt(o, 'guest') && clean(opt(o, 'guestPort')) === wanPortV) {
      err('guestPort', 'Гостевой порт не может совпадать с портом WAN');
    }
    if (opt(o, 'pppoeServer')) {
      const sp = clean(opt(o, 'pppoeServerPort')) || 'ether5';
      if (sp === wanPortV) err('pppoeServerPort', 'Порт абонентов не может быть портом WAN');
      else if (opt(o, 'guest') && sp === clean(opt(o, 'guestPort'))) {
        warn('pppoeServerPort', 'Порт абонентов занят гостевым VLAN — выберите свободный порт');
      }
      if (!clean(opt(o, 'pppoePool'))) err('pppoePool', 'Укажите пул для абонентов');
      if (opt(o, 'pppoeServerUser') && String(opt(o, 'pppoeServerPass')).length < 4) {
        err('pppoeServerPass', 'Пароль абонента — минимум 4 символа');
      }
    }

    (o.forwards || []).forEach(function (f, i) {
      if (!ipOk(f.toIp)) err('fwd' + i, 'Правило ' + (i + 1) + ': некорректный внутренний IP');
      const ep = +f.extPort, ip2 = +f.toPort || +f.extPort;
      if (!(ep >= 1 && ep <= 65535)) err('fwd' + i, 'Правило ' + (i + 1) + ': внешний порт 1–65535');
      if (!(ip2 >= 1 && ip2 <= 65535)) err('fwd' + i, 'Правило ' + (i + 1) + ': внутренний порт 1–65535');
      if (lanNet && ipOk(f.toIp) && !ipInNetwork(f.toIp, lanNet)) {
        warn('fwd' + i, 'Правило ' + (i + 1) + ': адрес не из сети LAN — убедитесь, что это нужный сегмент');
      }
    });

    return issues;
  }

  /* ---------------- генерация конфига ---------------- */
  function generate(rawOpts) {
    const o = rawOpts || {};
    const issues = validate(o);
    const warn = issues.filter(function (x) { return x.level === 'warn'; }).map(function (x) { return x.msg; });
    const errors = issues.filter(function (x) { return x.level === 'error'; }).map(function (x) { return x.msg; });

    const identity = clean(opt(o, 'identity')) || 'router';
    const wanMode = opt(o, 'wan');
    const wanPort = clean(opt(o, 'wanPort')) || 'ether1';
    const bridge = clean(opt(o, 'bridge')) || 'bridge-lan';
    const lanIp = clean(opt(o, 'lanIp'));
    const lanPrefix = +opt(o, 'lanPrefix');
    const guestOn = !!opt(o, 'guest');
    const guestPort = clean(opt(o, 'guestPort')) || 'ether5';
    const guestIface = 'vlan-guest';
    const wifiOn = !!opt(o, 'wifi');
    const wgOn = !!opt(o, 'wg');
    const l2tpOn = !!opt(o, 'l2tp');
    const pppoeSrv = !!opt(o, 'pppoeServer');
    const ipv6Mode = opt(o, 'ipv6');
    const forwards = (o.forwards || []).filter(function (f) { return f && clean(f.toIp); });

    const lanPorts = expandPorts(opt(o, 'lanPorts')).filter(function (p) {
      return p !== wanPort && !(guestOn && p === guestPort) && !(pppoeSrv && p === clean(opt(o, 'pppoeServerPort')));
    });

    const L = [];
    const push = function () { for (let i = 0; i < arguments.length; i++) L.push(arguments[i]); };
    const head = function (t) { L.push('', '# ---------- ' + t + ' ----------'); };
    let section = 0;
    const sec = function (t) { section++; head(section + '. ' + t); };

    push('# ' + identity + ' — конфиг собран мастером приложения «MikroTik · Учебник Winbox 4»',
      '# RouterOS 7.x. Вставьте целиком в New Terminal.',
      '# Перед вставкой сохраните текущий конфиг: /export file=before-change');
    if (errors.length) {
      push('# ВНИМАНИЕ: есть незаполненные или некорректные поля — исправьте их перед вставкой:');
      errors.forEach(function (e) { push('#   · ' + e); });
    }

    sec('Интерфейсы и списки');
    push('/interface list', 'add name=LAN', 'add name=WAN');
    if (guestOn) push('/interface list add name=GUEST');
    push('/interface list member',
      'add interface=' + bridge + ' list=LAN',
      'add interface=' + wanPort + ' list=WAN');
    push('', '/interface bridge add name=' + bridge);
    lanPorts.forEach(function (p) {
      push('/interface bridge port add bridge=' + bridge + ' interface=' + p);
    });
    if (guestOn) {
      push('', '/interface bridge set ' + bridge + ' vlan-filtering=yes',
        '/interface bridge vlan add bridge=' + bridge + ' tagged=bridge-lan untagged=' + guestPort + ' vlan-ids=20',
        '/interface vlan add name=' + guestIface + ' vlan-id=20 interface=' + bridge,
        '/interface bridge port add bridge=' + bridge + ' interface=' + guestPort + ' pvid=20',
        '/interface list member add interface=' + guestIface + ' list=GUEST');
    }

    sec('WAN');
    if (wanMode === 'static') {
      push('/ip address add address=' + netCidr(opt(o, 'wanIp'), opt(o, 'wanPrefix')) + ' interface=' + wanPort,
        '/ip route add gateway=' + clean(opt(o, 'wanGw')));
    } else if (wanMode === 'pppoe') {
      push('/interface pppoe-client add name=wan-pppoe interface=' + wanPort +
        ' user=' + q(opt(o, 'pppoeUser')) + ' password=' + q(opt(o, 'pppoePass')) +
        ' add-default-route=yes use-peer-dns=yes disabled=no',
        '/interface list member add interface=wan-pppoe list=WAN');
    } else {
      push('/ip dhcp-client add interface=' + wanPort + ' add-default-route=yes use-peer-dns=yes disabled=no');
    }

    sec('LAN, DHCP и DNS');
    push('/ip address add address=' + netCidr(lanIp, lanPrefix) + ' interface=' + bridge);
    if (C && C.info) {
      const inf = C.info(C.ipToInt(lanIp), lanPrefix);
      if (inf && inf.hosts > 2 && opt(o, 'dhcp')) {
        const parts = inf.network.split('.');
        const base = parts[0] + '.' + parts[1] + '.' + parts[2] + '.';
        const from = base + (lanPrefix >= 25 ? 2 : 10);
        const to = base + (inf.hosts > 200 ? 250 : Math.min(254, inf.hosts + 1));
        push('/ip pool add name=lan-pool ranges=' + from + '-' + to,
          '/ip dhcp-server add name=dhcp-lan interface=' + bridge + ' address-pool=lan-pool lease-time=1d',
          '/ip dhcp-server network add address=' + inf.cidr + ' gateway=' + lanIp + ' dns-server=' + lanIp);
      }
    }
    push('/ip dns set servers=' + clean(opt(o, 'dns')) + ' allow-remote-requests=yes');

    if (guestOn) {
      sec('Гостевая сеть (VLAN 20)');
      const gIp = clean(opt(o, 'guestIp'));
      push('/ip address add address=' + gIp + '/' + (+opt(o, 'guestPrefix')) + ' interface=' + guestIface,
        '/ip pool add name=guest-pool ranges=' + gIp.replace(/\.\d+$/, '.100') + '-' + gIp.replace(/\.\d+$/, '.200'),
        '/ip dhcp-server add name=dhcp-guest interface=' + guestIface + ' address-pool=guest-pool lease-time=1h',
        '/ip dhcp-server network add address=' + netCidr(gIp, +opt(o, 'guestPrefix')) + ' gateway=' + gIp +
        ' dns-server=' + clean(opt(o, 'dns')).split(',')[0]);
    }

    if (wifiOn) {
      sec('Wi-Fi');
      push('/interface wifi security',
        'add name=sec-lan authentication-types=wpa2-psk,wpa3-psk passphrase=' + q(opt(o, 'wifiPass')),
        '/interface wifi',
        'add name=wifi-lan master-interface=wifi1 ssid=' + q(opt(o, 'wifiSsid')) + ' security=sec-lan',
        '/interface bridge port add bridge=' + bridge + ' interface=wifi-lan');
      if (guestOn) {
        push('/interface wifi security add name=sec-guest authentication-types=wpa2-psk passphrase=' + q(opt(o, 'wifiGuestPass')),
          '/interface wifi add name=wifi-guest master-interface=wifi1 ssid=' + q(opt(o, 'wifiGuestSsid')) + ' security=sec-guest',
          '/interface bridge port add bridge=' + bridge + ' interface=wifi-guest pvid=20',
          '/interface bridge vlan add bridge=' + bridge + ' untagged=wifi-guest vlan-ids=20');
      }
    }

    if (ipv6Mode !== 'off') {
      sec('IPv6');
      if (ipv6Mode === 'pd') {
        push('/ipv6 dhcp-client add interface=' + wanPort + ' pool-name=ipv6-pool request=prefix add-default-route=yes disabled=no',
          '/ipv6 address add address=::1/64 from-pool=ipv6-pool interface=' + bridge + ' advertise=yes',
          '/ipv6 nd add interface=' + bridge + ' ra-interval=30s-60s ra-lifetime=1800s managed-address-configuration=no other-configuration=no');
      } else {
        push('/ipv6 address add address=' + v6RouterAddress(clean(opt(o, 'ipv6Prefix'))) + ' interface=' + bridge + ' advertise=yes',
          '/ipv6 nd add interface=' + bridge + ' ra-interval=30s-60s ra-lifetime=1800s');
      }
      push('/ipv6 firewall address-list add list=lan6 address=' + (ipv6Mode === 'static'
        ? clean(opt(o, 'ipv6Prefix')) : '2000::/3') + ' comment="v6 range"');
      push('/ipv6 firewall filter',
        'add chain=input connection-state=established,related action=accept',
        'add chain=input connection-state=invalid action=drop',
        'add chain=input protocol=icmpv6 action=accept comment="icmpv6"',
        'add chain=input in-interface-list=WAN action=drop comment="drop wan v6"',
        'add chain=forward connection-state=established,related action=accept',
        'add chain=forward connection-state=invalid action=drop',
        'add chain=forward in-interface-list=LAN action=accept comment="lan v6"',
        'add chain=forward in-interface-list=WAN action=drop');
    }

    sec('NAT и проброс портов');
    if (opt(o, 'nat')) {
      push('/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="internet"');
      forwards.forEach(function (f, i) {
        const proto = (f.proto || 'tcp').toLowerCase();
        const toPort = +f.toPort || +f.extPort;
        push('/ip firewall nat add chain=dstnat protocol=' + proto + ' dst-port=' + (+f.extPort) +
          ' in-interface-list=WAN action=dst-nat to-addresses=' + clean(f.toIp) + ' to-ports=' + toPort +
          ' comment=' + q(f.comment || ('forward-' + (i + 1))));
      });
      if (forwards.length) {
        push('# hairpin: доступ к сервису изнутри по внешнему IP');
        forwards.forEach(function (f) {
          const proto = (f.proto || 'tcp').toLowerCase();
          const toPort = +f.toPort || +f.extPort;
          push('/ip firewall nat add chain=srcnat protocol=' + proto + ' dst-address=' + clean(f.toIp) +
            ' dst-port=' + toPort + ' action=masquerade comment="hairpin"');
        });
      }
    }

    sec('Firewall');
    if (opt(o, 'protect')) {
      push('/ip firewall filter',
        'add chain=input connection-state=established,related action=accept comment="established"',
        'add chain=input connection-state=invalid action=drop comment="invalid"',
        'add chain=input protocol=icmp action=accept comment="icmp"',
        'add chain=input in-interface-list=WAN action=drop comment="drop wan input"',
        'add chain=forward connection-state=established,related action=accept comment="fwd established"',
        'add chain=forward connection-state=invalid action=drop');
      if (wgOn) push('add chain=forward in-interface=wg0 action=accept comment="wg forward"');
      if (l2tpOn) push('# L2TP: при необходимости разрешите forward для PPP-интерфейсов (in-interface=all-ppp)');
      push('add chain=forward in-interface-list=LAN out-interface-list=WAN action=accept comment="lan to wan"');
      if (guestOn) {
        push('add chain=forward in-interface-list=GUEST out-interface-list=LAN action=drop comment="guest isolated"',
          'add chain=forward in-interface-list=GUEST out-interface-list=WAN action=accept comment="guest to wan"');
      }
      push('add chain=forward in-interface-list=WAN action=drop comment="drop wan forward"');
    } else {
      push('# firewall не включён — не оставляйте роутер без правил в интернете');
    }

    if (wgOn || l2tpOn) {
      sec('VPN');
      if (wgOn) {
        push('/interface wireguard add name=wg0 listen-port=' + (+opt(o, 'wgPort') || 13231),
          '/ip address add address=' + netCidr(clean(opt(o, 'wgIp')), 24) + ' interface=wg0',
          '/ip firewall filter add chain=input protocol=udp dst-port=' + (+opt(o, 'wgPort') || 13231) +
          ' action=accept comment="wireguard" place-before=[find where comment="drop wan input"]',
          '# Пир: /interface wireguard peers add interface=wg0 public-key="…" allowed-address=10.10.10.2/32');
      }
      if (l2tpOn) {
        push('/interface l2tp-server server set enabled=yes use-ipsec=yes ipsec-secret=' + q(opt(o, 'l2tpPsk')) +
          ' authentication=mschap2 default-profile=default',
          '/ip pool add name=vpn-pool ranges=' + clean(opt(o, 'l2tpPool')),
          '/ppp profile add name=vpn-profile local-address=10.20.20.1 remote-address=vpn-pool dns-server=' +
          clean(opt(o, 'dns')).split(',')[0],
          '/ppp secret add name=vpn1 password=' + q('ChangeMe-2026') + ' profile=vpn-profile service=l2tp',
          '/ip firewall filter add chain=input protocol=udp dst-port=500,1701,4500 action=accept comment="l2tp/ipsec" place-before=[find where comment="drop wan input"]');
      }
    }

    if (pppoeSrv) {
      sec('PPPoE-сервер (абоненты)');
      const port = clean(opt(o, 'pppoeServerPort')) || 'ether5';
      const portBusy = port === wanPort || (guestOn && port === guestPort);
      push('/interface bridge add name=bridge-subscribers',
        portBusy
          ? '# ВНИМАНИЕ: порт ' + port + ' занят — замените его на свободный порт абонентов'
          : '/interface bridge port add bridge=bridge-subscribers interface=' + port,
        '/ip pool add name=pppoe-pool ranges=' + clean(opt(o, 'pppoePool')),
        '/ppp profile add name=pppoe-profile local-address=10.30.30.1 remote-address=pppoe-pool dns-server=' +
        clean(opt(o, 'dns')).split(',')[0] + ' rate-limit=20M/20M',
        '/interface pppoe-server server add service-name=internet interface=bridge-subscribers default-profile=pppoe-profile disabled=no',
        '/ip address add address=10.30.30.1/24 interface=bridge-subscribers');
      if (clean(opt(o, 'pppoeServerUser'))) {
        push('/ppp secret add name=' + q(opt(o, 'pppoeServerUser')) + ' password=' + q(opt(o, 'pppoeServerPass')) +
          ' profile=pppoe-profile service=pppoe');
      }
      push('/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="subscribers nat"');
    }

    if (opt(o, 'autobackup')) {
      sec('Автобэкап конфигурации');
      push('/system script',
        'add name=auto-backup policy=read,write,sensitive source={',
        '  :local d [/system clock get date]',
        '  :local tag ("bak-" . $d)',
        '  /system backup save name=$tag dont-encrypt=yes',
        '  /export file=($tag . "-cfg")',
        '  :log info ("auto-backup: " . $tag)',
        '}',
        '/system scheduler add name=daily-backup start-time=03:30:00 interval=1d on-event="/system script run auto-backup"');
      push('# Копии лежат в Files. Для отправки на сервер добавьте в скрипт:');
      push('# /tool fetch url="sftp://backup@10.0.0.5/" src-path=($tag . ".backup") upload=yes user=backup password=***');
    }

    sec('Сервисы и время');
    const lanNetBase = netCidr(lanIp, lanPrefix);
    push('/ip service set winbox address=' + lanNetBase,
      '/ip service set ssh address=' + lanNetBase,
      '/ip service disable telnet,ftp,www,api,api-ssl',
      '/system ntp client set enabled=yes servers=' + clean(opt(o, 'ntp')),
      '/system clock set time-zone-name=' + clean(opt(o, 'tz')),
      '/system identity set name=' + q(identity));

    sec('Проверка после вставки');
    push('# /ip address print', '# /ip route print where dst-address=0.0.0.0/0',
      '# /ip firewall filter print stats', '# /ipv6 address print',
      '# /ping 8.8.8.8 count=4', '# /export file=after-wizard');

    const text = L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const sections = [];
    L.forEach(function (line) {
      if (/^# ----------/.test(line)) sections.push(line.replace(/^# -+ | -+$/g, '').trim());
    });
    const wanTitle = wanMode === 'dhcp' ? 'WAN DHCP' : wanMode === 'pppoe' ? 'WAN PPPoE' : 'WAN статика';
    return {
      text: text,
      title: identity + ' · ' + wanTitle,
      sections: sections,
      warnings: warn,
      errors: errors,
      lines: L.length,
      counts: {
        forwards: forwards.length,
        vpn: (wgOn ? 1 : 0) + (l2tpOn ? 1 : 0),
        'wifi': wifiOn ? 1 : 0,
        ipv6: ipv6Mode === 'off' ? 0 : 1
      }
    };
  }

  function presets() {
    const out = [];
    for (const k in PRESETS) out.push({ id: k, name: PRESETS[k].name, set: PRESETS[k].set });
    return out;
  }

  /* применение шаблона к текущим ответам */
  function applyPreset(base, presetId) {
    const p = PRESETS[presetId];
    const out = {};
    for (const k in DEFAULTS) out[k] = (base && base[k] != null) ? base[k] : DEFAULTS[k];
    if (p) {
      for (const k in p.set) out[k] = p.set[k];
      out.preset = presetId;
    }
    return out;
  }

  window.ConfigWizard = {
    generate: generate,
    validate: validate,
    presets: presets,
    applyPreset: applyPreset,
    defaults: DEFAULTS,
    expandPorts: expandPorts,
    networkOf: networkOf
  };
})();
