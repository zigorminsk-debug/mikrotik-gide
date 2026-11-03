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
    devSeg: false,          // разделить устройства по подсетям (4 VLAN)
    dsVlanPc: 10, dsVlanWifi: 30, dsVlanPhones: 40, dsVlanIot: 50,
    dsWifiPc: 'PC-WiFi', dsWifiPhones: 'Phones', dsWifiIot: 'Printers',
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
    leases: [],             // [{mac, ip, comment}] — резервирование адресов
    dnsStatic: [],          // [{name, address}] — локальные имена
    segments: [],           // [{vlanId, name, ip, port}] — дополнительные VLAN
    model: 'generic',       // generic | hex | ax2 | ax3 | rb4011 | crs328
    failover: false, wan2Port: 'lte1', wan2Check: '8.8.8.8',
    harden: false,          // расширенная защита (сервисы, MAC-сервер, blacklist)
    hotspot: false, hotspotPass: 'guest-2026',
    qos: false, wanDown: 100, wanUp: 100,
    snmp: false, snmpCommunity: 'mon-8f3c1a', snmpHost: '192.168.88.0/24',
    syslog: false, syslogHost: '192.168.88.10',
    nat: true, protect: true,
    autobackup: false,
    tz: 'Europe/Minsk', ntp: 'by.pool.ntp.org',
    author: '',            // объект или автор конфига — попадёт в шапку
    leaseTime: '1d',       // время аренды DHCP
    wifiCountry: 'belarus', wifiCh24: 6, wifiCh5: 36, wifiWidth: 20, wifiTxPower: '',
    routes: [],            // [{dst, gw, distance}] — статические маршруты
    mail: false, mailServer: 'smtp.yandex.ru', mailPort: 587, mailFrom: 'router@example.com',
    mailTo: 'admin@example.com', mailUser: '', mailPass: ''
  };

  /* типовые модели: подставляют порты и наличие Wi-Fi */
  const MODELS = {
    generic: { name: 'Универсальный', wanPort: 'ether1', lanPorts: 'ether2-ether5', guestPort: 'ether5' },
    hex: { name: 'hEX / hEX S', wanPort: 'ether1', lanPorts: 'ether2-ether4', guestPort: 'ether5', wifi: false },
    ax2: { name: 'hAP ax2', wanPort: 'ether1', lanPorts: 'ether2-ether4', guestPort: 'ether5', wifi: true },
    ax3: { name: 'hAP ax3', wanPort: 'ether1', lanPorts: 'ether2-ether4', guestPort: 'ether5', wifi: true },
    rb4011: { name: 'RB4011', wanPort: 'ether1', lanPorts: 'ether2-ether9', guestPort: 'ether10', wifi: false },
    crs328: { name: 'CRS328-24P', wanPort: 'ether1', lanPorts: 'ether2-ether23', guestPort: 'ether24', wifi: false }
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
    office4: {
      name: 'Офис: 4 подсети по устройствам',
      set: {
        identity: 'office-gw', wan: 'dhcp', guest: true, wifi: true, wg: true, ipv6: 'off', protect: true,
        devSeg: true, model: 'ax3', lanPorts: 'ether2-ether4', guestPort: 'ether5',
        dsWifiPc: 'PC-WiFi', dsWifiPhones: 'Phones', dsWifiIot: 'Printers'
      }
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
    },
    cctv: {
      name: 'Видеонаблюдение',
      set: { identity: 'cctv-gw', wan: 'dhcp', guest: false, wifi: false, wg: true,
        protect: true, harden: true, autobackup: true }
    },
    school: {
      name: 'Школа / класс',
      set: { identity: 'school-gw', wan: 'dhcp', guest: true, wifi: true, wg: false,
        ipv6: 'off', protect: true, qos: true, wanDown: 200, wanUp: 200 }
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
  function ch24Freq(n) { return 2412 + 5 * ((parseInt(n, 10) || 1) - 1); }
  function ch5Freq(n) { return 5000 + 5 * (parseInt(n, 10) || 36); }

  /* четыре равные подсети из LAN: /24 → 4 × /26 */
  function ipInt(s) {
    const p = String(s || '').split('.');
    if (p.length !== 4) return null;
    let n = 0;
    for (let i = 0; i < 4; i++) {
      const v = parseInt(p[i], 10);
      if (!(v >= 0 && v <= 255)) return null;
      n = n * 256 + v;
    }
    return n;
  }

  function intIp(n) {
    n = n >>> 0;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  function dsSplit(ip, prefix) {
    const n = ipInt(ip);
    const p0 = parseInt(prefix, 10);
    if (n === null || !(p0 >= 22 && p0 <= 28)) return [];
    const size = Math.pow(2, 32 - p0);
    const base = Math.floor(n / size) * size;
    const out = [];
    for (let i = 0; i < 4; i++) {
      const net = base + i * size;
      const from = net + (size > 64 ? 10 : 2);
      const to = Math.min(net + size - 2, net + 200);
      out.push({
        net: intIp(net), prefix: p0, cidr: intIp(net) + '/' + p0,
        gw: intIp(net + 1), from: intIp(from), to: intIp(to),
        hosts: size - 2
      });
    }
    return out;
  }
  function cidrOk(v) {
    const t = String(v || '').trim();
    const m = t.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/);
    if (!m) return false;
    const p = parseInt(m[2], 10);
    return p >= 0 && p <= 32 && ipOk(m[1]);
  }

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

    if (opt(o, 'devSeg')) {
      const pfx = +opt(o, 'lanPrefix');
      if (!(pfx >= 22 && pfx <= 28)) {
        err('lanPrefix', 'Для четырёх подсетей нужен префикс LAN от /22 до /28 (обычно /24)');
      }
      const dsFields = [
        ['dsVlanPc', 'Проводные компьютеры'],
        ['dsVlanWifi', 'Ноутбуки и планшеты'],
        ['dsVlanPhones', 'Телефоны'],
        ['dsVlanIot', 'Принтеры и периферия']
      ];
      const used = {};
      dsFields.forEach(function (f) {
        const v = parseInt(clean(opt(o, f[0])), 10);
        if (!(v >= 1 && v <= 4094)) { err(f[0], f[1] + ': VLAN ID от 1 до 4094'); return; }
        if (used[v]) err(f[0], f[1] + ': VLAN ' + v + ' уже занят другим сегментом');
        if (opt(o, 'guest') && v === 20) err(f[0], f[1] + ': VLAN 20 занят гостевой сетью — выберите другой');
        if ((o.segments || []).some(function (sg) { return parseInt(sg && sg.vlanId, 10) === v; })) {
          err(f[0], f[1] + ': VLAN ' + v + ' уже используется в дополнительных сегментах');
        }
        if (v === 1) warn(f[0], f[1] + ': VLAN 1 обычно управляющий — лучше 10 и выше');
        used[v] = true;
      });
      if (!clean(opt(o, 'dsWifiPc')) || !clean(opt(o, 'dsWifiPhones')) || !clean(opt(o, 'dsWifiIot'))) {
        err('dsWifiPc', 'Укажите имена трёх Wi-Fi сетей: ноутбуки, телефоны, принтеры');
      }
      if (!opt(o, 'wifi')) warn('devSeg', 'Wi-Fi выключен: подсети для ноутбуков, телефонов и принтеров останутся без беспроводного доступа');
      if (opt(o, 'guest')) warn('devSeg', 'Гостевая сеть останется изолированной от рабочих подсетей — так и задумано');
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

    if (opt(o, 'wifi')) {
      const ch24 = parseInt(opt(o, 'wifiCh24'), 10);
      const ch5 = parseInt(opt(o, 'wifiCh5'), 10);
      const width = parseInt(opt(o, 'wifiWidth'), 10) || 20;
      if (!(ch24 >= 1 && ch24 <= 13)) err('wifiCh24', 'Канал 2.4 ГГц должен быть 1–13');
      if (!(ch5 >= 32 && ch5 <= 177)) err('wifiCh5', 'Канал 5 ГГц должен быть 32–177');
      if ([20, 40, 80].indexOf(width) < 0) err('wifiWidth', 'Ширина канала: 20, 40 или 80 МГц');
      if (!clean(opt(o, 'wifiCountry'))) err('wifiCountry', 'Укажите страну — от неё зависят разрешённые каналы и мощность');
      if (width === 40 && ch24 >= 1 && ch24 <= 13) warn('wifiCh24', 'Ширина 40 МГц в 2.4 ГГц перекрывает почти весь диапазон — оставьте 20');
      const txp = clean(opt(o, 'wifiTxPower'));
      if (txp) {
        const tp = parseFloat(txp.replace(',', '.'));
        if (!isFinite(tp) || tp < 0 || tp > 30) err('wifiTxPower', 'Мощность передатчика: число от 0 до 30 dBm');
        else if (tp > 20) warn('wifiTxPower', 'Мощность выше 20 dBm — проверьте лимит EIRP для своей страны и усиление антенны');
        else if (tp > 17) warn('wifiTxPower', 'Для нескольких точек 14–17 dBm лучше: клиенты будут переходить между ними');
      }
    }

    (o.routes || []).forEach(function (r, i) {
      if (!r) return;
      const empty = !clean(r.dst) && !clean(r.gw);
      if (empty) return;
      if (!cidrOk(r.dst)) err('routes', 'Маршрут ' + (i + 1) + ': адрес сети должен быть вида 10.20.0.0/16');
      if (!ipOk(clean(r.gw))) err('routes', 'Маршрут ' + (i + 1) + ': шлюз должен быть IP-адресом');
      const d = parseInt(r.distance, 10);
      if (r.distance && !(d >= 1 && d <= 255)) err('routes', 'Маршрут ' + (i + 1) + ': дистанция 1–255');
      if (cidrOk(r.dst) && lanNet) {
        const rn = networkOf(r.dst.split('/')[0], +r.dst.split('/')[1]);
        if (rn && rn.cidr === lanNet.cidr) warn('routes', 'Маршрут ' + (i + 1) + ' совпадает с сетью LAN — он не понадобится');
      }
    });

    if (opt(o, 'mail')) {
      const port = parseInt(opt(o, 'mailPort'), 10);
      if (!clean(opt(o, 'mailServer'))) err('mailServer', 'Укажите SMTP-сервер');
      if (!(port >= 1 && port <= 65535)) err('mailPort', 'Порт SMTP должен быть 1–65535');
      const from = clean(opt(o, 'mailFrom')), to = clean(opt(o, 'mailTo'));
      if (!/.+@.+\..+/.test(from)) err('mailFrom', 'Адрес отправителя выглядит некорректно');
      if (!/.+@.+\..+/.test(to)) err('mailTo', 'Адрес получателя выглядит некорректно');
      if (clean(opt(o, 'mailUser')) && !clean(opt(o, 'mailPass'))) warn('mailPass', 'Логин указан без пароля — сервер может отклонить отправку');
    }

    const lease = clean(opt(o, 'leaseTime')) || '1d';
    if (!/^\d+[smhdw]?$/.test(lease)) err('leaseTime', 'Время аренды DHCP: 30m, 12h, 1d, 1w');
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

    if (opt(o, 'failover')) {
      const w2 = clean(opt(o, 'wan2Port'));
      if (!w2) err('wan2Port', 'Укажите порт резервного канала');
      if (w2 === wanPortV) err('wan2Port', 'Резервный канал не может быть тем же портом, что основной WAN');
      const lanList = expandPorts(opt(o, 'lanPorts'));
      if (lanList.indexOf(w2) >= 0) warn('wan2Port', 'Порт резервного канала входит в список LAN — уберите его оттуда');
      if (!ipOk(opt(o, 'wan2Check'))) warn('wan2Check', 'Адрес проверки канала не похож на IP — оставьте 8.8.8.8');
    }

    const segVlans = {};
    (o.segments || []).forEach(function (sg, i) {
      const tag = 'Сегмент ' + (i + 1) + ': ';
      const vId = parseInt(sg.vlanId, 10);
      if (segVlans[vId]) err('seg' + i, tag + 'VLAN ID ' + vId + ' уже используется другим сегментом');
      segVlans[vId] = true;
      const vid = parseInt(sg.vlanId, 10);
      if (!(vid >= 1 && vid <= 4094)) err('seg' + i, tag + 'VLAN ID от 1 до 4094');
      if (opt(o, 'guest') && vid === 20) warn('seg' + i, tag + 'VLAN 20 уже занят гостевой сетью');
      const parts = String(sg.ip || '').split('/');
      if (!ipOk(parts[0])) err('seg' + i, tag + 'некорректный IP шлюза');
      const pfx = +(parts[1] || 24);
      if (!(pfx >= 8 && pfx <= 30)) err('seg' + i, tag + 'префикс от 8 до 30');
      if (!clean(sg.port)) err('seg' + i, tag + 'не указан порт');
      else if (clean(sg.port) === wanPortV) err('seg' + i, tag + 'порт не может быть WAN');
      else if (opt(o, 'guest') && clean(sg.port) === clean(opt(o, 'guestPort'))) {
        warn('seg' + i, tag + 'порт уже занят гостевой сетью');
      }
    });

    (o.leases || []).forEach(function (l, i) {
      if (!clean(l.mac) || !/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(clean(l.mac))) {
        err('lease' + i, 'Резервирование ' + (i + 1) + ': MAC в формате AA:BB:CC:DD:EE:FF');
      }
      if (!ipOk(l.ip)) err('lease' + i, 'Резервирование ' + (i + 1) + ': некорректный IP');
      if (lanNet && ipOk(l.ip) && !ipInNetwork(l.ip, lanNet)) {
        const dsAll = opt(o, 'devSeg') ? dsSplit(opt(o, 'lanIp'), opt(o, 'lanPrefix')) : [];
        const inDs = dsAll.some(function (n) {
          const nn = networkOf(n.gw, n.prefix);
          return nn && ipInNetwork(l.ip, nn);
        });
        if (!inDs) warn('lease' + i, 'Резервирование ' + (i + 1) + ': адрес вне сети LAN');
      }
    });

    (o.dnsStatic || []).forEach(function (d, i) {
      if (!clean(d.name)) err('dns' + i, 'DNS-имя ' + (i + 1) + ': укажите имя, например nas.local');
      if (!ipOk(d.address)) err('dns' + i, 'DNS-имя ' + (i + 1) + ': некорректный IP');
    });

    if (opt(o, 'hotspot') && !opt(o, 'guest')) {
      err('hotspot', 'Hotspot работает на гостевой сети — включите «Гостевая сеть»');
    }

    if (opt(o, 'qos')) {
      const dn = +opt(o, 'wanDown'), up = +opt(o, 'wanUp');
      if (!(dn >= 1 && dn <= 100000)) err('wanDown', 'Скорость скачивания от 1 до 100000 Мбит/с');
      if (!(up >= 1 && up <= 100000)) err('wanUp', 'Скорость отдачи от 1 до 100000 Мбит/с');
    }

    if (opt(o, 'snmp')) {
      if (String(clean(opt(o, 'snmpCommunity'))).length < 4) err('snmpCommunity', 'SNMP community — минимум 4 символа');
      if (String(clean(opt(o, 'snmpCommunity'))).toLowerCase() === 'public') err('snmpCommunity', 'community=public — так делать нельзя');
      if (!ipOk(String(opt(o, 'snmpHost')).split('/')[0])) err('snmpHost', 'Укажите сеть мониторинга, например 192.168.88.0/24');
    }
    if (opt(o, 'syslog') && !ipOk(opt(o, 'syslogHost'))) {
      err('syslogHost', 'Укажите IP сервера логов');
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
    const failoverOn = !!opt(o, 'failover');
    const hardenOn = !!opt(o, 'harden');
    const hotspotOn = !!opt(o, 'hotspot');
    const qosOn = !!opt(o, 'qos');
    const snmpOn = !!opt(o, 'snmp');
    const syslogOn = !!opt(o, 'syslog');
    const wan2Port = clean(opt(o, 'wan2Port')) || 'lte1';
    const routes = (o.routes || []).filter(function (r) {
      return r && cidrOk(r.dst) && ipOk(clean(r.gw));
    }).map(function (r) {
      const d = parseInt(r.distance, 10);
      return { dst: clean(r.dst), gw: clean(r.gw), distance: d >= 1 && d <= 255 ? d : 1 };
    });
    const mailOn = !!opt(o, 'mail');
    const mailTo = clean(opt(o, 'mailTo'));
    const authorLine = clean(opt(o, 'author'));
    const leaseTime = clean(opt(o, 'leaseTime')) || '1d';
    const devSeg = !!opt(o, 'devSeg');
    const dsVl = {
      pc: parseInt(opt(o, 'dsVlanPc'), 10) || 10,
      wifi: parseInt(opt(o, 'dsVlanWifi'), 10) || 30,
      phone: parseInt(opt(o, 'dsVlanPhones'), 10) || 40,
      iot: parseInt(opt(o, 'dsVlanIot'), 10) || 50
    };
    const dsSsid = {
      pc: clean(opt(o, 'dsWifiPc')) || 'PC-WiFi',
      phone: clean(opt(o, 'dsWifiPhones')) || 'Phones',
      iot: clean(opt(o, 'dsWifiIot')) || 'Printers'
    };
    const dsNets = devSeg ? dsSplit(lanIp, lanPrefix) : [];
    const dsOn = devSeg && dsNets.length === 4;
    const l3Iface = dsOn ? 'vlan-' + dsVl.pc : bridge;
    const mailSend = function (subject, body) {
      return '/tool e-mail send to=' + q(mailTo) + ' subject=' + q(subject) + ' body=' + q(body);
    };

    const segs = (o.segments || []).map(function (sg) {
      const parts = String(sg.ip || '').split('/');
      return {
        vlanId: parseInt(sg.vlanId, 10) || 0,
        name: clean(sg.name) || ('vlan' + (sg.vlanId || '')),
        ip: clean(parts[0]),
        prefix: +(parts[1] || 24),
        port: clean(sg.port)
      };
    }).filter(function (sg) { return sg.vlanId >= 1 && sg.vlanId <= 4094 && ipOk(sg.ip) && sg.port; });

    const segIfaces = segs.map(function (sg) { return 'vlan-' + sg.vlanId; });
    const leases = (o.leases || []).filter(function (l) {
      return clean(l.mac) && ipOk(l.ip);
    }).map(function (l) { return { mac: clean(l.mac), ip: clean(l.ip), comment: clean(l.comment) }; });
    const dnsStatic = (o.dnsStatic || []).filter(function (d) {
      return clean(d.name) && ipOk(d.address);
    }).map(function (d) { return { name: clean(d.name), address: clean(d.address) }; });

    const lanPorts = expandPorts(opt(o, 'lanPorts')).filter(function (p) {
      if (p === wanPort) return false;
      if (guestOn && p === guestPort) return false;
      if (pppoeSrv && p === clean(opt(o, 'pppoeServerPort'))) return false;
      if (failoverOn && p === wan2Port) return false;
      if (segs.some(function (sg) { return sg.port === p; })) return false;
      return true;
    });

    const L = [];
    const push = function () { for (let i = 0; i < arguments.length; i++) L.push(arguments[i]); };
    const head = function (t) { L.push('', '# ---------- ' + t + ' ----------'); };
    let section = 0;
    const sec = function (t) { section++; head(section + '. ' + t); };

    push('# ' + identity + ' — конфиг собран мастером приложения «MikroTik · Учебник Winbox 4»',
      '# RouterOS 7.x. Вставьте целиком в New Terminal.',
      '# Перед вставкой сохраните текущий конфиг: /export file=before-change');
    if (authorLine) push('# Объект / автор: ' + authorLine);
    push('# Собрано: ' + new Date().toLocaleString('ru-RU') + ' · разделов: предпросмотр ниже');
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
      push('/interface bridge port add bridge=' + bridge + ' interface=' + p +
        (dsOn ? ' pvid=' + dsVl.pc : ''));
    });
    if (dsOn) {
      push('', '# Проводные ПК — во VLAN ' + dsVl.pc + '; Wi-Fi сети получат свои VLAN в разделе Wi-Fi',
        '/interface bridge vlan add bridge=' + bridge + ' tagged=' + bridge +
        (lanPorts.length ? ' untagged=' + lanPorts.join(',') : '') + ' vlan-ids=' + dsVl.pc);
      push('/interface vlan add name=vlan-' + dsVl.pc + ' vlan-id=' + dsVl.pc + ' interface=' + bridge,
        '/interface vlan add name=vlan-' + dsVl.wifi + ' vlan-id=' + dsVl.wifi + ' interface=' + bridge,
        '/interface vlan add name=vlan-' + dsVl.phone + ' vlan-id=' + dsVl.phone + ' interface=' + bridge,
        '/interface vlan add name=vlan-' + dsVl.iot + ' vlan-id=' + dsVl.iot + ' interface=' + bridge);
      [dsVl.pc, dsVl.wifi, dsVl.phone, dsVl.iot].forEach(function (v) {
        push('/interface list member add interface=vlan-' + v + ' list=LAN');
      });
    }
    if (guestOn || segs.length) {
      if (guestOn) {
        push('', '/interface bridge vlan add bridge=' + bridge + ' tagged=' + bridge + ' untagged=' + guestPort + ' vlan-ids=20',
          '/interface vlan add name=' + guestIface + ' vlan-id=20 interface=' + bridge,
          '/interface bridge port add bridge=' + bridge + ' interface=' + guestPort + ' pvid=20',
          '/interface list member add interface=' + guestIface + ' list=GUEST');
      }
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

    if (failoverOn) {
      push('', '# Резервный канал: основной маршрут дистанция 1, резервный — 2');
      push('/ip dhcp-client add interface=' + wan2Port + ' add-default-route=yes default-route-distance=2 use-peer-dns=no disabled=no',
        '/interface list member add interface=' + wan2Port + ' list=WAN');
      let downCmd, upCmd;
      if (wanMode === 'static') {
        const gw = clean(opt(o, 'wanGw'));
        downCmd = '/ip route set [find dst-address=0.0.0.0/0 gateway=' + gw + '] distance=10';
        upCmd = '/ip route set [find dst-address=0.0.0.0/0 gateway=' + gw + '] distance=1';
      } else if (wanMode === 'pppoe') {
        downCmd = '/interface pppoe-client set [find name=wan-pppoe] default-route-distance=10';
        upCmd = '/interface pppoe-client set [find name=wan-pppoe] default-route-distance=1';
      } else {
        downCmd = '/ip dhcp-client set [find interface=' + wanPort + '] default-route-distance=10';
        upCmd = '/ip dhcp-client set [find interface=' + wanPort + '] default-route-distance=1';
      }
      if (mailOn) {
        downCmd += '; ' + mailSend('WAN1 down', 'Основной канал упал, включён резервный маршрут.');
        upCmd += '; ' + mailSend('WAN1 up', 'Основной канал восстановлен.');
      }
      push('/tool netwatch add host=' + (ipOk(opt(o, 'wan2Check')) ? clean(opt(o, 'wan2Check')) : '8.8.8.8') +
        ' interval=30s comment="wan1 failover" down-script=' + q(downCmd) + ' up-script=' + q(upCmd),
        '# Если канал оживёт, netwatch вернёт основному маршруту дистанцию 1.');
    }

    sec('LAN, DHCP и DNS');
    if (dsOn) {
      push('# Адреса и DHCP для разделённых подсетей — в следующем разделе.',
        '# Управляющий адрес роутера будет на vlan-' + dsVl.pc + ' (проводные ПК).');
    } else {
      push('/ip address add address=' + netCidr(lanIp, lanPrefix) + ' interface=' + l3Iface);
    }
    if (!dsOn && C && C.info) {
      const inf = C.info(C.ipToInt(lanIp), lanPrefix);
      if (inf && inf.hosts > 2 && opt(o, 'dhcp')) {
        const parts = inf.network.split('.');
        const base = parts[0] + '.' + parts[1] + '.' + parts[2] + '.';
        const from = base + (lanPrefix >= 25 ? 2 : 10);
        const to = base + (inf.hosts > 200 ? 250 : Math.min(254, inf.hosts + 1));
        push('/ip pool add name=lan-pool ranges=' + from + '-' + to,
          '/ip dhcp-server add name=dhcp-lan interface=' + bridge + ' address-pool=lan-pool lease-time=' + leaseTime,
          '/ip dhcp-server network add address=' + inf.cidr + ' gateway=' + lanIp + ' dns-server=' + lanIp);
      }
    }
    push('/ip dns set servers=' + clean(opt(o, 'dns')) + ' allow-remote-requests=yes');

    if (dsOn) {
      sec('Устройства по подсетям (VLAN ' + dsVl.pc + '/' + dsVl.wifi + '/' + dsVl.phone + '/' + dsVl.iot + ')');
      push('# Каждый тип устройств — в своей подсети, но маршрутизация между ними разрешена:',
        '# общие папки, принтеры, NAS и RDP доступны всем, как будто сеть одна.');
      const dsGroups = [
        { vlan: dsVl.pc, name: 'Проводные компьютеры' },
        { vlan: dsVl.wifi, name: 'Ноутбуки и планшеты (Wi-Fi)' },
        { vlan: dsVl.phone, name: 'Телефоны' },
        { vlan: dsVl.iot, name: 'Принтеры и периферия' }
      ];
      dsGroups.forEach(function (g, i) {
        const n = dsNets[i];
        const iface = 'vlan-' + g.vlan;
        push('', '# ' + g.name + ': ' + n.cidr + ', шлюз ' + n.gw + ', пул ' + n.from + '–' + n.to,
          '/ip address add address=' + n.gw + '/' + n.prefix + ' interface=' + iface,
          '/ip pool add name=pool-' + g.vlan + ' ranges=' + n.from + '-' + n.to,
          '/ip dhcp-server add name=dhcp-' + g.vlan + ' interface=' + iface + ' address-pool=pool-' + g.vlan + ' lease-time=' + leaseTime,
          '/ip dhcp-server network add address=' + n.cidr + ' gateway=' + n.gw + ' dns-server=' + n.gw);
      });
      push('', '# Общие ресурсы: все четыре подсети видят друг друга полностью —',
        '# файловые шары, сетевые принтеры, сервер RDS, NAS и любые внутренние сервисы.',
        '/ip firewall filter add chain=forward in-interface-list=LAN out-interface-list=LAN action=accept comment="общие ресурсы: подсети видят друг друга"',
        '/ip firewall filter add chain=forward in-interface-list=LAN out-interface-list=WAN action=accept comment="LAN в интернет"',
        '# Серверу RDS и принтерам закрепите адреса в разделе «DHCP leases» — тогда доступ по IP всегда один и тот же.');
      const dsIfaces = ['vlan-' + dsVl.pc, 'vlan-' + dsVl.wifi, 'vlan-' + dsVl.phone, 'vlan-' + dsVl.iot].join(',');
      push('', '# Имена и обнаружение: mDNS-повторитель (RouterOS 7.16+) сохраняет видимость принтеров,',
        '# NAS и Chromecast из любой подсети. На старых версиях обновите RouterOS.',
        '/ip firewall filter add chain=input protocol=udp dst-port=5353 action=accept comment="mDNS repeater"',
        '/ip dns set mdns-repeat-ifaces=' + dsIfaces,
        '# mDNS закрывает AirPrint, Chromecast, NAS и сетевые имена. Обзор сети Windows (WS-Discovery)',
        '# идёт широковещательно и через подсети не проходит: подключайте принтеры по IP или добавьте',
        '# записи в раздел «Локальные DNS-имена» (/ip dns static).',
        '# Если в конфиге есть общий drop в forward, поднимите правило «общие ресурсы» выше него.');
    }

    if (routes.length) {
      sec('Статические маршруты');
      push('# Для сетей за другим роутером или второго шлюза. Дистанция по умолчанию 1.');
      routes.forEach(function (r) {
        push('/ip route add dst-address=' + r.dst + ' gateway=' + r.gw +
          (r.distance && r.distance !== 1 ? ' distance=' + r.distance : '') +
          ' comment=' + q('static ' + r.dst));
      });
    }

    if (guestOn) {
      sec('Гостевая сеть (VLAN 20)');
      const gIp = clean(opt(o, 'guestIp'));
      push('/ip address add address=' + gIp + '/' + (+opt(o, 'guestPrefix')) + ' interface=' + guestIface,
        '/ip pool add name=guest-pool ranges=' + gIp.replace(/\.\d+$/, '.100') + '-' + gIp.replace(/\.\d+$/, '.200'),
        '/ip dhcp-server add name=dhcp-guest interface=' + guestIface + ' address-pool=guest-pool lease-time=' +
        (leaseTime === '1d' ? '1h' : leaseTime),
        '/ip dhcp-server network add address=' + netCidr(gIp, +opt(o, 'guestPrefix')) + ' gateway=' + gIp +
        ' dns-server=' + clean(opt(o, 'dns')).split(',')[0]);
    }

    if (segs.length) {
      sec('Дополнительные сегменты VLAN');
      segs.forEach(function (sg) {
        const iface = 'vlan-' + sg.vlanId;
        const busy = sg.port === wanPort || (guestOn && sg.port === guestPort) ||
          (pppoeSrv && sg.port === clean(opt(o, 'pppoeServerPort'))) || (failoverOn && sg.port === wan2Port);
        if (busy) {
          push('# ' + sg.name + ': порт ' + sg.port + ' уже занят — выберите свободный порт для этого сегмента');
          return;
        }
        push('# ' + sg.name + ': VLAN ' + sg.vlanId + ', шлюз ' + sg.ip + '/' + sg.prefix + ', порт ' + sg.port,
          '/interface vlan add name=' + iface + ' vlan-id=' + sg.vlanId + ' interface=' + bridge,
          '/interface bridge port add bridge=' + bridge + ' interface=' + sg.port + ' pvid=' + sg.vlanId,
          '/interface bridge vlan add bridge=' + bridge + ' tagged=' + bridge + ' untagged=' + sg.port + ' vlan-ids=' + sg.vlanId,
          '/ip address add address=' + sg.ip + '/' + sg.prefix + ' interface=' + iface);
        if (C && C.info) {
          const inf = C.info(C.ipToInt(sg.ip), sg.prefix);
          if (inf && inf.hosts > 2) {
            const b = inf.network.split('.');
            const base = b[0] + '.' + b[1] + '.' + b[2] + '.';
            const from = base + (sg.prefix >= 25 ? 2 : 10);
            const to = base + (inf.hosts > 200 ? 250 : Math.min(254, inf.hosts + 1));
            push('/ip pool add name=pool-' + sg.vlanId + ' ranges=' + from + '-' + to,
              '/ip dhcp-server add name=dhcp-' + sg.vlanId + ' interface=' + iface + ' address-pool=pool-' + sg.vlanId + ' lease-time=12h',
              '/ip dhcp-server network add address=' + inf.cidr + ' gateway=' + sg.ip + ' dns-server=' + lanIp);
          }
        }
        push('/ip firewall filter add chain=forward in-interface=' + iface + ' out-interface-list=LAN action=drop comment=' +
          q(sg.name + ': в LAN нельзя'),
          '/ip firewall filter add chain=forward in-interface-list=LAN out-interface=' + iface + ' action=drop comment=' +
          q(sg.name + ': из LAN нельзя'),
          '/ip firewall filter add chain=forward in-interface=' + iface + ' out-interface-list=WAN action=accept comment=' +
          q(sg.name + ': в интернет'),
          '/ip firewall filter add chain=forward in-interface=' + iface + ' action=drop comment=' + q(sg.name + ': остальное закрыто'));
      });
    }

    if (wifiOn) {
      sec('Wi-Fi');
      if (dsOn) {
        push('# Три отдельные сети: ноутбуки, телефоны и принтеры — каждая в своём VLAN',
          '/interface wifi security',
          'add name=sec-lan authentication-types=wpa2-psk,wpa3-psk passphrase=' + q(opt(o, 'wifiPass')),
          'add name=sec-iot authentication-types=wpa2-psk,wpa3-psk passphrase=' + q(opt(o, 'wifiPass')),
          '/interface wifi',
          'add name=wifi-pc master-interface=wifi1 ssid=' + q(dsSsid.pc) + ' security=sec-lan',
          'add name=wifi-phones master-interface=wifi1 ssid=' + q(dsSsid.phone) + ' security=sec-iot',
          'add name=wifi-iot master-interface=wifi1 ssid=' + q(dsSsid.iot) + ' security=sec-iot',
          '/interface bridge port',
          'add bridge=' + bridge + ' interface=wifi-pc pvid=' + dsVl.wifi,
          'add bridge=' + bridge + ' interface=wifi-phones pvid=' + dsVl.phone,
          'add bridge=' + bridge + ' interface=wifi-iot pvid=' + dsVl.iot,
          '/interface bridge vlan',
          'add bridge=' + bridge + ' tagged=' + bridge + ' untagged=wifi-pc vlan-ids=' + dsVl.wifi,
          'add bridge=' + bridge + ' tagged=' + bridge + ' untagged=wifi-phones vlan-ids=' + dsVl.phone,
          'add bridge=' + bridge + ' tagged=' + bridge + ' untagged=wifi-iot vlan-ids=' + dsVl.iot);
      } else {
        push('/interface wifi security',
          'add name=sec-lan authentication-types=wpa2-psk,wpa3-psk passphrase=' + q(opt(o, 'wifiPass')),
          '/interface wifi',
          'add name=wifi-lan master-interface=wifi1 ssid=' + q(opt(o, 'wifiSsid')) + ' security=sec-lan',
          '/interface bridge port add bridge=' + bridge + ' interface=wifi-lan');
      }
      const country = clean(opt(o, 'wifiCountry')) || 'belarus';
      const width = parseInt(opt(o, 'wifiWidth'), 10) || 20;
      const ch24 = parseInt(opt(o, 'wifiCh24'), 10) || 6;
      const ch5 = parseInt(opt(o, 'wifiCh5'), 10) || 36;
      push('', '# Страна и каналы: от страны зависят разрешённые частоты и мощность',
        '/interface wifi set wifi1 country=' + country);
      const txp = clean(opt(o, 'wifiTxPower'));
      if (txp) push('/interface wifi set wifi1 tx-power=' + txp);
      push('/interface wifi set wifi1 channel.frequency=' + ch24Freq(ch24) + ' channel.width=' + width + 'mhz');
      push('# 5 ГГц (второй радиоинтерфейс, у hAP ax2/ax3 это wifi2):',
        '# /interface wifi set wifi2 channel.frequency=' + ch5Freq(ch5) + ' channel.width=' + (width === 20 ? 80 : width) + 'mhz');
      if (width === 40 && ch24 >= 1 && ch24 <= 13) {
        push('# ВНИМАНИЕ: 40 МГц в 2.4 ГГц занимает почти весь диапазон — лучше 20 МГц.');
      }
      if (guestOn) {
        push('/interface wifi security add name=sec-guest authentication-types=wpa2-psk passphrase=' + q(opt(o, 'wifiGuestPass')),
          '/interface wifi add name=wifi-guest master-interface=wifi1 ssid=' + q(opt(o, 'wifiGuestSsid')) + ' security=sec-guest',
          '/interface bridge port add bridge=' + bridge + ' interface=wifi-guest pvid=20',
          '/interface bridge vlan add bridge=' + bridge + ' untagged=wifi-guest vlan-ids=20');
      }
    }

    if (ipv6Mode !== 'off' && dsOn) {
      sec('IPv6');
      push('# При разделении на подсети IPv6 настраивается для каждой VLAN отдельно:',
        '# /ipv6 address add address=::1/64 interface=vlan-' + dsVl.pc + ' advertise=yes',
        '# /ipv6 address add address=::1/64 interface=vlan-' + dsVl.wifi + ' advertise=yes и так далее',
        '# Правила /ipv6 firewall filter из шаблона ниже добавьте для интерфейсов vlan-* в списке LAN.');
    } else if (ipv6Mode !== 'off') {
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

    if (hotspotOn) {
      sec('Hotspot для гостей');
      if (!guestOn) {
        push('# Hotspot не настроен: он работает на гостевой сети. Включите «Гостевая сеть» и повторите.');
      } else {
        push('/ip hotspot profile add name=hsprof hotspot-address=' + clean(opt(o, 'guestIp')) +
          ' dns-name=guest.local login-by=http-chap,cookie',
          '/ip hotspot user profile add name=hs-users shared-users=1 rate-limit=5M/5M',
          '/ip dhcp-server set [find name=dhcp-guest] disabled=yes',
          '# Hotspot сам выдаёт адреса гостям, поэтому обычный DHCP на этой сети выключен.',
          '/ip hotspot add name=hs-guest interface=' + guestIface + ' address-pool=guest-pool profile=hsprof disabled=no',
          '/ip hotspot user add name=guest password=' + q(opt(o, 'hotspotPass')) + ' profile=hs-users',
          '# Ваучеры: /ip hotspot user add name=voucher-01 password=… profile=hs-users');
      }
    }

    if (leases.length) {
      sec('Резервирование адресов (DHCP leases)');
      if (!opt(o, 'dhcp')) push('# DHCP-сервер выключен — резервирования не сработают.');
      leases.forEach(function (l) {
        push('/ip dhcp-server lease add address=' + l.ip + ' mac-address=' + l.mac +
          ' server=dhcp-lan comment=' + q(l.comment || 'static lease'));
      });
    }

    if (dnsStatic.length) {
      sec('Локальные DNS-имена');
      dnsStatic.forEach(function (d) {
        push('/ip dns static add name=' + clean(d.name) + ' address=' + d.address + ' ttl=1h');
      });
    }

    if (qosOn) {
      sec('Скорость и приоритеты (QoS)');
      const dn = Math.max(1, Math.round((+opt(o, 'wanDown') || 100) * 0.95));
      const up = Math.max(1, Math.round((+opt(o, 'wanUp') || 100) * 0.95));
      push('/queue type add name=pcq-up kind=pcq pcq-classifier=src-address',
        '/queue type add name=pcq-down kind=pcq pcq-classifier=dst-address',
        '/queue simple add name=wan-shape target=' + (C && C.info ? C.info(C.ipToInt(lanIp), lanPrefix).cidr : netCidr(lanIp, lanPrefix)) +
        ' max-limit=' + up + 'M/' + dn + 'M queue=pcq-up/pcq-down comment="qos shape"',
        '# FastTrack обходит очереди: если шейпинг не срабатывает, исключите нужный трафик из fasttrack-connection.');
    }

    if (mailOn) {
      sec('Уведомления на e-mail');
      push('/tool e-mail set server=' + q(opt(o, 'mailServer')) + ' port=' + (parseInt(opt(o, 'mailPort'), 10) || 587) +
        ' from=' + q(opt(o, 'mailFrom')) + ' tls=yes' +
        (clean(opt(o, 'mailUser')) ? ' user=' + q(opt(o, 'mailUser')) + ' password=' + q(opt(o, 'mailPass')) : ''));
      if (!failoverOn) {
        push('/tool netwatch add host=' + (ipOk(opt(o, 'wan2Check')) ? clean(opt(o, 'wan2Check')) : '8.8.8.8') +
          ' interval=1m comment="internet watch" down-script=' +
          q(mailSend('Internet down', 'Роутер ' + identity + ' не видит внешний адрес.')) +
          ' up-script=' + q(mailSend('Internet up', 'Роутер ' + identity + ' снова в сети.')));
      }
      push('# Проверка отправки:', '# ' + mailSend('RouterOS test', 'Письмо от ' + identity));
      push('# Пароль SMTP останется в конфиге — используйте отдельный ящик только для роутера.');
    }

    if (snmpOn || syslogOn) {
      sec('Мониторинг');
      if (snmpOn) {
        push('/snmp set enabled=yes',
          '/snmp community add name=' + clean(opt(o, 'snmpCommunity')) + ' addresses=' + clean(opt(o, 'snmpHost')));
      }
      if (syslogOn) {
        push('/system logging action add name=remote target=remote remote=' + clean(opt(o, 'syslogHost')),
          '/system logging add topics=info,error,warning action=remote');
      }
    }

    if (hardenOn) {
      sec('Базовая защита от взлома');
      push('/tool mac-server set allowed-interface-list=LAN',
        '/tool mac-server mac-winbox set allowed-interface-list=LAN',
        '/tool mac-server ping set enabled=no',
        '/ip neighbor discovery-settings set discover-interface-list=LAN',
        '/ip upnp set enabled=no',
        '/ip socks set enabled=no',
        '/ip smb set enabled=no');
      if (opt(o, 'protect')) {
        push('# Брутфорс: 3 попытки → blacklist на неделю (правила встают перед блокировкой WAN)',
          '/ip firewall filter add chain=input action=drop protocol=tcp dst-port=22,8291 src-address-list=blacklist comment="blacklist" place-before=[find where comment="drop wan input"]',
          '/ip firewall filter add chain=input action=add-src-to-address-list protocol=tcp dst-port=22,8291 src-address-list=stage2 address-list=blacklist address-list-timeout=1w comment="brute stage3" place-before=[find where comment="drop wan input"]',
          '/ip firewall filter add chain=input action=add-src-to-address-list protocol=tcp dst-port=22,8291 src-address-list=stage1 address-list=stage2 address-list-timeout=1m comment="brute stage2" place-before=[find where comment="drop wan input"]',
          '/ip firewall filter add chain=input action=add-src-to-address-list protocol=tcp dst-port=22,8291 connection-state=new address-list=stage1 address-list-timeout=1m comment="brute stage1" place-before=[find where comment="drop wan input"]');
      }
      push('# Полный чек-лист защиты — раздел «Защита от взлома» в приложении.');
    }

    sec('Сервисы и время');
    const lanNetBase = netCidr(lanIp, lanPrefix);
    push('/ip service set winbox address=' + lanNetBase,
      '/ip service set ssh address=' + lanNetBase,
      '/ip service disable telnet,ftp,www,api,api-ssl',
      '/system ntp client set enabled=yes servers=' + clean(opt(o, 'ntp')),
      '/system clock set time-zone-name=' + clean(opt(o, 'tz')),
      '/system identity set name=' + q(identity));

    if (guestOn || segs.length || dsOn) {
      push('', '# VLAN-фильтрация включается в самом конце: все адреса, пулы и DHCP уже созданы',
        '/interface bridge set ' + bridge + ' vlan-filtering=yes');
    }

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
        ipv6: ipv6Mode === 'off' ? 0 : 1,
        segments: segs.length,
        devices: dsOn ? 4 : 0,
        leases: leases.length,
        routes: routes.length,
        notify: mailOn ? 1 : 0,
        services: (failoverOn ? 1 : 0) + (hotspotOn ? 1 : 0) + (qosOn ? 1 : 0) + (snmpOn ? 1 : 0) +
          (syslogOn ? 1 : 0) + (hardenOn ? 1 : 0)
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

  function models() {
    const out = [];
    for (const k in MODELS) out.push({ id: k, name: MODELS[k].name });
    return out;
  }

  /* применение модели: порты и Wi-Fi */
  function applyModel(base, modelId) {
    const m = MODELS[modelId];
    const out = {};
    for (const k in DEFAULTS) out[k] = (base && base[k] != null) ? base[k] : DEFAULTS[k];
    if (m) {
      out.model = modelId;
      out.wanPort = m.wanPort;
      out.lanPorts = m.lanPorts;
      out.guestPort = m.guestPort;
      if (m.wifi != null) out.wifi = m.wifi;
      if (out.pppoeServerPort && (m.wanPort === out.pppoeServerPort)) out.pppoeServerPort = m.guestPort;
    }
    return out;
  }

  window.ConfigWizard = {
    generate: generate,
    validate: validate,
    presets: presets,
    applyPreset: applyPreset,
    models: models,
    applyModel: applyModel,
    defaults: DEFAULTS,
    expandPorts: expandPorts,
    networkOf: networkOf,
    subnets: dsSplit
  };
})();
