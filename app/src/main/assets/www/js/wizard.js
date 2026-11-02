/* =========================================================================
   wizard.js — генератор готового конфига RouterOS 7 по ответам на вопросы.
   Чистые функции: возвращают текст конфига и предупреждения.
   ========================================================================= */
(function () {
  'use strict';

  const C = window.NetCalc || null;

  const DEFAULTS = {
    identity: 'office-gw',
    wan: 'dhcp',
    wanPort: 'ether1',
    wanIp: '203.0.113.20',
    wanPrefix: 24,
    wanGw: '203.0.113.1',
    pppoeUser: 'login',
    pppoePass: 'password',
    lanPorts: 'ether2-ether5',
    lanIp: '192.168.88.1',
    lanPrefix: 24,
    bridge: 'bridge-lan',
    dhcp: true,
    dns: '1.1.1.1,8.8.8.8',
    guest: true,
    guestPort: 'ether5',
    guestIp: '192.168.20.1',
    guestPrefix: 24,
    wg: true,
    wgIp: '10.10.10.1',
    wgPort: 13231,
    nat: true,
    protect: true,
    tz: 'Europe/Minsk',
    ntp: 'by.pool.ntp.org'
  };

  function clean(v) {
    return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').replace(/"/g, '').trim();
  }

  function opt(o, k) {
    const v = o && o[k] != null && o[k] !== '' ? o[k] : DEFAULTS[k];
    return v;
  }

  function q(v) {
    return '"' + clean(v) + '"';
  }

  function ipOk(s) {
    if (!C) return /\d+\.\d+\.\d+\.\d+/.test(String(s));
    return C.ipToInt(s) != null;
  }

  /* «ether2-ether5» → [ether2, ether3, ether4, ether5]; «ether2,ether3» → […] */
  function expandPorts(spec) {
    const out = [];
    String(spec || '').split(',').forEach(function (piece) {
      const p = piece.trim();
      if (!p) return;
      const m = p.match(/^([a-zA-Z]+)(\d+)\s*-\s*([a-zA-Z]*)(\d+)$/);
      if (m) {
        const pre = m[1];
        const from = +m[2];
        const to = +m[4];
        if (to >= from && to - from <= 48) {
          for (let i = from; i <= to; i++) out.push(pre + i);
          return;
        }
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

  function generate(rawOpts) {
    const o = rawOpts || {};
    const identity = clean(opt(o, 'identity')) || 'router';
    const wanMode = opt(o, 'wan');
    const wanPort = clean(opt(o, 'wanPort')) || 'ether1';
    const bridge = clean(opt(o, 'bridge')) || 'bridge-lan';
    const lanIp = clean(opt(o, 'lanIp'));
    const lanPrefix = +opt(o, 'lanPrefix');
    const warn = [];

    if (!ipOk(lanIp)) warn.push('Адрес LAN выглядит некорректно — проверьте значение.');
    if (wanMode === 'static' && !ipOk(opt(o, 'wanIp'))) warn.push('Адрес WAN некорректен.');
    if (wanMode === 'static' && !ipOk(opt(o, 'wanGw'))) warn.push('Шлюз WAN некорректен.');
    if (wanMode === 'pppoe' && (!clean(opt(o, 'pppoeUser')) || opt(o, 'pppoeUser') === 'login')) {
      warn.push('Для PPPoE укажите логин и пароль от провайдера.');
    }

    const guestOn = !!opt(o, 'guest');
    const guestPort = clean(opt(o, 'guestPort')) || 'ether5';
    const lanPorts = expandPorts(opt(o, 'lanPorts')).filter(function (p) {
      return p !== wanPort && !(guestOn && p === guestPort);
    });
    const guestIface = 'vlan-guest';
    const wgOn = !!opt(o, 'wg');

    const L = [];
    const push = function () { for (let i = 0; i < arguments.length; i++) L.push(arguments[i]); };
    const head = function (t) { L.push('', '# ---------- ' + t + ' ----------'); };

    push('# ' + identity + ' — конфиг собран мастером приложения MikroTik · Учебник',
      '# RouterOS 7.x / Winbox 4. Вставьте целиком в New Terminal.',
      '# Перед вставкой сохраните текущий конфиг: /export file=before-change');

    head('1. Интерфейсы и списки');
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

    head('2. WAN');
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

    head('3. LAN, DHCP и DNS');
    push('/ip address add address=' + netCidr(lanIp, lanPrefix) + ' interface=' + bridge);
    if (C && C.info) {
      const inf = C.info(C.ipToInt(lanIp), lanPrefix);
      if (inf && inf.hosts > 2) {
        const parts = inf.network.split('.');
        const base = parts[0] + '.' + parts[1] + '.' + parts[2] + '.';
        const from = base + (lanPrefix >= 25 ? 2 : 10);
        const to = base + (inf.hosts > 200 ? 250 : Math.min(254, inf.hosts + 1));
        if (opt(o, 'dhcp')) {
          push('/ip pool add name=lan-pool ranges=' + from + '-' + to,
            '/ip dhcp-server add name=dhcp-lan interface=' + bridge + ' address-pool=lan-pool lease-time=1d',
            '/ip dhcp-server network add address=' + inf.cidr + ' gateway=' + lanIp + ' dns-server=' + lanIp);
        }
      }
    }
    push('/ip dns set servers=' + clean(opt(o, 'dns')) + ' allow-remote-requests=yes');

    if (guestOn) {
      head('4. Гостевая сеть (VLAN 20)');
      push('/ip address add address=' + netCidr(clean(opt(o, 'guestIp')), +opt(o, 'guestPrefix')) +
        ' interface=' + guestIface,
        '/ip pool add name=guest-pool ranges=' + clean(opt(o, 'guestIp')).replace(/\.\d+$/, '.100') + '-' +
        clean(opt(o, 'guestIp')).replace(/\.\d+$/, '.200'),
        '/ip dhcp-server add name=dhcp-guest interface=' + guestIface + ' address-pool=guest-pool lease-time=1h',
        '/ip dhcp-server network add address=' + netCidr(clean(opt(o, 'guestIp')), +opt(o, 'guestPrefix')) +
        ' gateway=' + clean(opt(o, 'guestIp')) + ' dns-server=' + clean(opt(o, 'dns')).split(',')[0]);
    }

    head((guestOn ? '5' : '4') + '. NAT');
    if (opt(o, 'nat')) {
      push('/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="internet"');
    }

    head((guestOn ? '6' : '5') + '. Firewall');
    if (opt(o, 'protect')) {
      push('/ip firewall filter',
        'add chain=input connection-state=established,related action=accept comment="established"',
        'add chain=input connection-state=invalid action=drop comment="invalid"',
        'add chain=input protocol=icmp action=accept comment="icmp"',
        'add chain=input in-interface-list=WAN action=drop comment="drop wan input"',
        'add chain=forward connection-state=established,related action=accept comment="fwd established"',
        'add chain=forward connection-state=invalid action=drop',
        'add chain=forward in-interface-list=LAN out-interface-list=WAN action=accept comment="lan to wan"');
      if (guestOn) {
        push('add chain=forward in-interface-list=GUEST out-interface-list=LAN action=drop comment="guest isolated"',
          'add chain=forward in-interface-list=GUEST out-interface-list=WAN action=accept comment="guest to wan"');
      }
      push('add chain=forward in-interface-list=WAN action=drop comment="drop wan forward"');
    } else {
      push('# firewall не включён — не оставляйте роутер без правил в интернете');
      warn.push('Firewall выключен: роутер будет открыт из интернета. Включайте защиту для продакшена.');
    }

    if (wgOn) {
      head('7. WireGuard');
      push('/interface wireguard add name=wg0 listen-port=' + (+opt(o, 'wgPort') || 13231),
        '/ip address add address=' + netCidr(clean(opt(o, 'wgIp')), 24) + ' interface=wg0',
        '/ip firewall filter add chain=input protocol=udp dst-port=' + (+opt(o, 'wgPort') || 13231) +
        ' action=accept comment="wireguard" place-before=2',
        '/ip firewall filter add chain=forward in-interface=wg0 action=accept comment="wg forward"',
        '/ip firewall filter add chain=forward out-interface=wg0 action=accept comment="wg reply"');
      push('# Пир добавляется вручную: /interface wireguard peers add interface=wg0 public-key="..." allowed-address=10.10.10.2/32');
    }

    head('8. Сервисы и время');
    push('/ip service set winbox address=' + netCidr(lanIp, lanPrefix).split('/')[0].replace(/\.\d+$/, '.0') + '/' + lanPrefix,
      '/ip service set ssh address=' + netCidr(lanIp, lanPrefix).split('/')[0].replace(/\.\d+$/, '.0') + '/' + lanPrefix,
      '/ip service disable telnet,ftp,www,api,api-ssl',
      '/system ntp client set enabled=yes servers=' + clean(opt(o, 'ntp')),
      '/system clock set time-zone-name=' + clean(opt(o, 'tz')),
      '/system identity set name=' + q(identity));

    head('9. Проверка после вставки');
    push('# /ip address print', '# /ip route print where dst-address=0.0.0.0/0',
      '# /ip firewall filter print stats', '# /ping 8.8.8.8 count=4', '# /export file=after-wizard');

    const text = L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const sections = [];
    L.forEach(function (line) {
      if (/^# ----------/.test(line)) sections.push(line.replace(/^# -+ | -+$/g, '').trim());
    });
    return {
      text: text,
      title: identity + ' · ' + (wanMode === 'dhcp' ? 'WAN по DHCP' : wanMode === 'pppoe' ? 'WAN PPPoE' : 'WAN статический'),
      sections: sections,
      warnings: warn,
      lines: L.length
    };
  }

  window.ConfigWizard = { generate: generate, defaults: DEFAULTS, expandPorts: expandPorts };
})();
