/* =========================================================================
   scene.js — рендерер «скриншотов Winbox 4» (векторные макеты окон RouterOS
   с подсветкой элементов и стрелками-указателями).

   Спецификация сцены:
   {
     path: 'IP → Firewall → Filter Rules',   // путь в меню Winbox
     win:  'Firewall',                        // заголовок окна
     tabs: ['Filter Rules','NAT',...], tab: 'Filter Rules',
     cols: [{t:'#',w:34},'Chain','Action'],
     rows: [[ '#', 'input', {v:'accept', m:1} ], ...],
     sel: 1,                                  // выделенная строка
     form: { title:'New Filter Rule', tabs:[...], tab:'General',
             fields:[{l:'Chain', v:'forward', m:2, type:'select'}],
             buttons:['OK','Cancel'] },
     notes: ['Нажмите +','Выберите chain'],
     status: '3 items'
   }
   либо терминал: { term:true, win:'New Terminal', lines:[...] }
   ========================================================================= */
(function () {
  'use strict';

  /* Дерево Winbox 4 — порядок и названия как в настоящем Winbox 4. */
  const MENU = [
    { g: 'Quick Set', ic: 'quick' },
    { g: 'WiFi', ic: 'wifi', items: ['WiFi', 'Security', 'Access List', 'Registration', 'CAPsMAN', 'Provisioning'] },
    { g: 'Interfaces', ic: 'port', items: ['Interface', 'Ethernet', 'VLAN', 'Bonding', 'Bridge', 'WireGuard', 'VXLAN', 'Lists', 'Detect Internet', 'LTE'] },
    { g: 'WireGuard', ic: 'shield', items: ['WireGuard', 'Peers'] },
    { g: 'Bridge', ic: 'bridge', items: ['Bridge', 'Ports', 'VLANs', 'Hosts', 'Filters', 'MSTP', 'NAT'] },
    { g: 'PPP', ic: 'ppp', items: ['Interfaces', 'Secrets', 'Profiles', 'PPPoE Server', 'L2TP Server', 'OVPN Server', 'Active Connections'] },
    { g: 'Switch', ic: 'switch', items: ['Switch', 'Ports', 'VLANs', 'Rules'] },
    { g: 'Mesh', ic: 'mesh' },
    { g: 'IP', ic: 'ip', items: ['Address', 'ARP', 'Cloud', 'DHCP Client', 'DHCP Server', 'DNS', 'Firewall', 'Hotspot',
      'IPsec', 'Kid Control', 'Neighbor Discovery', 'Pool', 'Routes', 'Services', 'Settings', 'SNTP Client',
      'SMB', 'UPnP', 'VRF', 'Web Proxy'] },
    { g: 'IPv6', ic: 'ipv6', items: ['Address', 'DHCP Client', 'DHCP Server', 'ND', 'Firewall', 'Routes'] },
    { g: 'MPLS', ic: 'mpls', items: ['MPLS', 'Forwarding', 'LDP', 'Traffic Eng'] },
    { g: 'Routing', ic: 'route', items: ['Table', 'Rules', 'Nexthops', 'Filters', 'BGP', 'OSPF', 'RIP', 'Prefix Lists', 'BFD'] },
    { g: 'System', ic: 'system', items: ['Identity', 'Clock', 'NTP Client', 'Users', 'Certificates', 'Files', 'Logging',
      'Packages', 'RouterBOOT', 'Scheduler', 'Scripts', 'Backup', 'Reset Configuration', 'Resources',
      'Health', 'Watchdog', 'Auto Upgrade', 'Note'] },
    { g: 'Queues', ic: 'queue', items: ['Simple Queues', 'Queue Tree', 'Queue Types', 'Interface Queues'] },
    { g: 'Dot1X', ic: 'key' },
    /* Ниже — порядок ровно как в левом дереве Winbox 4 (сверено по снимкам
       из CI): Files, Log, New Terminal, RADIUS, Tools, Make Supout.rif. */
    { g: 'Files', ic: 'file' },
    { g: 'Log', ic: 'log' },
    { g: 'New Terminal', ic: 'term' },
    { g: 'RADIUS', ic: 'key' },
    { g: 'Tools', ic: 'tool', items: ['Ping', 'Traceroute', 'Torch', 'Profiler', 'Sniffer', 'Netwatch', 'Graphing',
      'Bandwidth Test', 'Traffic Generator', 'Email', 'Wake on LAN', 'RoMON', 'Fetch', 'Speed Test'] }
  ];

  /* Линейные иконки разделов — те же по смыслу, что у Winbox 4. */
  const ICO = {
    quick: 'M13 2 4 14h6l-1 8 9-12h-6z',
    wifi: 'M3.5 9a14 14 0 0 1 17 0M6.5 12.5a10 10 0 0 1 11 0M9.5 16a5.5 5.5 0 0 1 5 0',
    port: 'M4 6h16v4H4zM4 14h16v4H4z',
    shield: 'M12 3l8 3v6c0 5-7.5 9-8 9s-8-4-8-9V6z',
    bridge: 'M3 12h18M7 12V8M17 12V8M5 8h4M15 8h4',
    ppp: 'M4 7h16v10H4zM8 12h.01M12 12h.01M16 12h.01',
    switch: 'M4 8h16l-3-3M20 16H4l3 3',
    mesh: 'M12 4l8 15H4z',
    ip: 'M3 6h10v12H3zM17 9l3 3-3 3',
    ipv6: 'M3 6h10v12H3zM17 9l3 3-3 3M6.5 10.5h3',
    mpls: 'M12 3l9 9-9 9-9-9z',
    route: 'M4 12h6l4-6h6M4 12h6l4 6h6',
    system: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 3v3M12 18v3M4.5 7.5l2.5 2M17 14.5l2.5 2M4.5 16.5l2.5-2M17 9.5l2.5-2',
    queue: 'M4 5v14M9 8v11M14 11v8M19 14v5',
    key: 'M15 8.5a3.5 3.5 0 1 0-3.4 3.5L4 19.5V21h2v-1.5h1.5V18H9v-1.5h1.5l1.6-1.6',
    tool: 'M20 5.5a4 4 0 0 1-5.2 4.9L7 18.2 5.8 17l7.8-7.8A4 4 0 0 1 18.5 5z',
    file: 'M4 6h5l2 2h9v10H4z',
    log: 'M5 6h14M5 11h14M5 16h9',
    term: 'M4 5h16v14H4zM7 10l2.5 2.5L7 15M12 15h5',
    win: 'M3 5h18v14H3zM3 9h18'
  };

  function ico(name, size) {
    const d = ICO[name] || ICO.win;
    const s = size || 14;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor"' +
      ' stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  }

  /* Названия в статьях иногда пишут по-старому (Interface, Certificates) —
     в дереве Winbox 4 это Interfaces и System → Certificates. */
  const GROUP_ALIAS = {
    interface: 'interfaces', interfaces: 'interfaces',
    certificates: 'system', certificate: 'system',
    firewall: 'ip', nat: 'ip', dns: 'ip', dhcp: 'ip', routes: 'ip', route: 'ip',
    'wireguard peers': 'wireguard', peers: 'wireguard',
    files: 'files', log: 'log', logs: 'log', login: 'quick set'
  };

  function groupName(g) {
    const k = String(g || '').toLowerCase().trim();
    return GROUP_ALIAS[k] || k;
  }

  function groupIcon(path) {
    const g = String(path || '').split('→')[0].trim();
    const key = groupName(g);
    for (let i = 0; i < MENU.length; i++) if (MENU[i].g.toLowerCase() === key) return MENU[i].ic;
    if (/wireguard/i.test(path || '')) return 'shield';
    if (/files/i.test(path || '')) return 'file';
    return 'win';
  }

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- боковое меню Winbox (мини-копия) ---------- */
  /* marks: {grp: 1, sub: 2} — номера на пункте меню, чтобы в статье можно было
     писать «1 — откройте Routing, 2 — выберите Tables» и видеть это на картинке */
  function sidebar(path, marks) {
    const parts = String(path || '').split('→').map(function (s) { return s.trim(); }).filter(Boolean);
    const g0 = groupName(parts[0] || '');
    const i0 = (parts[1] || '').toLowerCase();
    const mk = marks || {};
    const box = el('div', 'wb-side');
    box.appendChild(el('div', 'sb-search', 'Search'));
    MENU.forEach(function (grp) {
      const hl = groupName(grp.g) === g0;
      const open = !!(grp.items && grp.items.length) || hl;
      const gEl = el('div', 'sb-grp' + (hl ? ' hl' : ''),
        '<span class="sb-ico">' + ico(grp.ic, 14) + '</span><span>' + esc(grp.g) + '</span>' +
        (open ? '<span class="car">›</span>' : ''));
      if (hl && mk.grp) { gEl.setAttribute('data-m', mk.grp); gEl.classList.add('wb-target'); }
      box.appendChild(gEl);
      if (hl && grp.items) {
        grp.items.forEach(function (it) {
          const on = it.toLowerCase() === i0;
          const sEl = el('div', 'sb-sub' + (on ? ' hl' : ''), esc(it));
          if (on && mk.sub) { sEl.setAttribute('data-m', mk.sub); sEl.classList.add('wb-target'); }
          box.appendChild(sEl);
        });
      }
    });
    return box;
  }

  /* ---------- таблица ---------- */
  function table(spec) {
    const wrap = el('div', 'wb-table');
    const cols = (spec.cols || []).map(function (c) {
      return typeof c === 'string' ? { t: c, w: 0 } : { t: c.t, w: c.w || 0 };
    });
    const head = el('div', 'wb-tr wb-th');
    cols.forEach(function (c, i) {
      const d = el('div', null, esc(c.t));
      d.style.flex = c.w ? '1 1 ' + c.w + 'px' : '1 1 0';
      d.style.minWidth = c.w ? c.w + 'px' : '48px';
      d.id = 'th-' + i;
      head.appendChild(d);
    });
    wrap.appendChild(head);

    (spec.rows || []).forEach(function (row, r) {
      const tr = el('div', 'wb-tr wb-td' + (spec.sel === r ? ' sel' : ''));
      tr.id = 'row-' + r;
      cols.forEach(function (c, i) {
        const cell = row[i] == null ? '' : row[i];
        const o = (typeof cell === 'object') ? cell : { v: cell };
        const d = el('div', null);
        d.style.flex = c.w ? '1 1 ' + c.w + 'px' : '1 1 0';
        d.style.minWidth = c.w ? c.w + 'px' : '48px';
        d.innerHTML = '<div class="' + (o.c || '') + '">' + esc(o.v) + '</div>';
        d.id = 'cell-' + r + '-' + i;
        if (o.m) d.setAttribute('data-m', o.m);
        if (o.m) d.classList.add('wb-target');
        if (o.foc) d.classList.add('foc');
        tr.appendChild(d);
      });
      wrap.appendChild(tr);
    });
    return wrap;
  }

  /* ---------- реальные окна Winbox 4 (RouterOS 7) ----------
     Каталог нужен, чтобы макет диалога совпадал с настоящим окном: тот же
     порядок полей, те же чекбоксы, поля-списки с «+» и вкладки.
     core:1 — поле есть в окне всегда, даже если в статье его не заполняли. */
  const WIN4 = {
    'wireguard peer': {
      title: 'WireGuard Peer',
      fields: [
        { l: 'Enabled', k: 'check', core: 1 },
        { l: 'Comment', k: 'text', core: 1 },
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Interface', k: 'select', core: 1 },
        { l: 'Public Key', k: 'text', core: 1 },
        { l: 'Private Key', k: 'select', core: 1 },
        { l: 'Endpoint', k: 'plus', core: 1 },
        { l: 'Endpoint Port', k: 'plus', core: 1 },
        { l: 'Allowed Address', k: 'multi', core: 1 },
        { l: 'Preshared Key', k: 'select', core: 1 },
        { l: 'Persistent Keepalive', k: 'plus', core: 1 },
        { l: 'Responder', k: 'check', core: 1 },
        { l: 'Current Endpoint Address', k: 'text' },
        { l: 'Current Endpoint Port', k: 'text' },
        { l: 'Rx', k: 'text' },
        { l: 'Tx', k: 'text' },
        { l: 'Last Handshake', k: 'text' },
        { l: 'Client Address', k: 'multi' },
        { l: 'Client DNS', k: 'multi' },
        { l: 'Client Endpoint', k: 'text' },
        { l: 'Client Keepalive', k: 'plus' },
        { l: 'Client Listen Port', k: 'plus' },
        { l: 'Client MTU', k: 'plus' },
        { l: 'Client Allowed Address', k: 'multi' },
        { l: 'Client Config', k: 'area' }
      ]
    },
    'wireguard': {
      title: 'WireGuard',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Listen Port', k: 'text', core: 1 },
        { l: 'Private Key', k: 'text', core: 1 },
        { l: 'Public Key', k: 'text', core: 1 },
        { l: 'MTU', k: 'text' }
      ]
    },
    'mangle rule': {
      title: 'Mangle Rule',
      tabs: ['General', 'Advanced', 'Extra', 'Action', 'Statistics'],
      fields: [
        { l: 'Chain', k: 'select', core: 1 },
        { l: 'Src. Address', k: 'text' },
        { l: 'Dst. Address', k: 'text' },
        { l: 'Protocol', k: 'select' },
        { l: 'Src. Port', k: 'text' },
        { l: 'Dst. Port', k: 'text' },
        { l: 'In. Interface', k: 'select' },
        { l: 'Out. Interface', k: 'select' },
        { l: 'In. Interface List', k: 'select' },
        { l: 'Out. Interface List', k: 'select' },
        { l: 'Action', k: 'select', core: 1 },
        { l: 'New Routing Mark', k: 'select' },
        { l: 'Passthrough', k: 'check' },
        { l: 'New Connection Mark', k: 'select' },
        { l: 'New Packet Mark', k: 'select' },
        { l: 'Comment', k: 'text' }
      ]
    },
    'ppp profile': {
      title: 'PPP Profile',
      tabs: ['General', 'Protocols', 'Limits', 'Queue', 'Scripts'],
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Local Address', k: 'text', core: 1 },
        { l: 'Remote Address', k: 'text', core: 1 },
        { l: 'DNS Server', k: 'text' },
        { l: 'Rate Limit', k: 'text' },
        { l: 'Session Timeout', k: 'text' },
        { l: 'Idle Timeout', k: 'text' },
        { l: 'Change TCP MSS', k: 'check' }
      ]
    },
    'certificate': {
      title: 'Certificate',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Common Name', k: 'text', core: 1 },
        { l: 'Subject Alt. Name', k: 'text' },
        { l: 'Key Size', k: 'text' },
        { l: 'Key Usage', k: 'text' },
        { l: 'Days Valid', k: 'text' },
        { l: 'Trusted', k: 'check' },
        { l: 'Copy From', k: 'select' }
      ]
    },
    'sign': {
      title: 'Sign',
      fields: [
        { l: 'CA', k: 'select', core: 1 },
        { l: 'Name', k: 'text' },
        { l: 'Days Valid', k: 'text' },
        { l: 'Certificate Template', k: 'select' }
      ]
    },
    'client config': {
      title: 'Client Config',
      fields: [
        { l: 'Client Address', k: 'text', core: 1 },
        { l: 'Client DNS', k: 'text', core: 1 },
        { l: 'Client Endpoint', k: 'text', core: 1 },
        { l: 'Client Allowed Address', k: 'text', core: 1 },
        { l: 'Config', k: 'area', core: 1 }
      ]
    },
    'routing table': {
      title: 'Table',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'FIB', k: 'check', core: 1 },
        { l: 'Comment', k: 'text' }
      ]
    },
    'script': {
      title: 'Script',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Owner', k: 'text', core: 1 },
        { l: 'Policy', k: 'text', core: 1 },
        { l: "Don't Require Permissions", k: 'check' },
        { l: 'Source', k: 'area', core: 1 }
      ]
    },
    'scheduler': {
      title: 'Scheduler',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Start Date', k: 'text', core: 1 },
        { l: 'Start Time', k: 'text', core: 1 },
        { l: 'Interval', k: 'text', core: 1 },
        { l: 'On Event', k: 'text', core: 1 },
        { l: 'Policy', k: 'text' },
        { l: 'Run Count', k: 'text' },
        { l: 'Comment', k: 'text' }
      ]
    },
    'filter rule': {
      title: 'Filter Rule',
      tabs: ['General', 'Advanced', 'Extra', 'Action', 'Statistics'],
      fields: [
        { l: 'Chain', k: 'select', core: 1 },
        { l: 'Src. Address', k: 'text' },
        { l: 'Dst. Address', k: 'text' },
        { l: 'Protocol', k: 'select' },
        { l: 'Src. Port', k: 'text' },
        { l: 'Dst. Port', k: 'text' },
        { l: 'In. Interface', k: 'select' },
        { l: 'Out. Interface', k: 'select' },
        { l: 'In. Interface List', k: 'select' },
        { l: 'Out. Interface List', k: 'select' },
        { l: 'Connection State', k: 'select' },
        { l: 'Connection NAT State', k: 'select' },
        { l: 'Action', k: 'select', core: 1 },
        { l: 'Comment', k: 'text' }
      ]
    },
    'nat rule': {
      title: 'NAT Rule',
      tabs: ['General', 'Advanced', 'Extra', 'Action', 'Statistics'],
      fields: [
        { l: 'Chain', k: 'select', core: 1 },
        { l: 'Src. Address', k: 'text' },
        { l: 'Dst. Address', k: 'text' },
        { l: 'Protocol', k: 'select' },
        { l: 'Dst. Port', k: 'text' },
        { l: 'In. Interface', k: 'select' },
        { l: 'Out. Interface', k: 'select' },
        { l: 'In. Interface List', k: 'select' },
        { l: 'Out. Interface List', k: 'select' },
        { l: 'Action', k: 'select', core: 1 },
        { l: 'To Addresses', k: 'text' },
        { l: 'To Ports', k: 'text' },
        { l: 'Comment', k: 'text' }
      ]
    },
    'dhcp setup': {
      title: 'DHCP Setup',
      fields: [
        { l: 'DHCP Server Interface', k: 'select', core: 1 },
        { l: 'DHCP Address Space', k: 'text', core: 1 },
        { l: 'Gateway for DHCP Network', k: 'text', core: 1 },
        { l: 'Addresses to Give Out', k: 'text', core: 1 },
        { l: 'DNS Servers', k: 'text', core: 1 },
        { l: 'Lease Time', k: 'text', core: 1 }
      ]
    },
    'dns settings': {
      title: 'DNS Settings',
      fields: [
        { l: 'Servers', k: 'text', core: 1 },
        { l: 'Dynamic Servers', k: 'text', core: 1 },
        { l: 'Allow Remote Requests', k: 'check', core: 1 },
        { l: 'Max UDP Packet Size', k: 'select' },
        { l: 'Cache Size', k: 'text' },
        { l: 'Cache Max TTL', k: 'text' },
        { l: 'Cache Used', k: 'text' },
        { l: 'Query Server Timeout', k: 'select' },
        { l: 'Use DoH Server', k: 'text' },
        { l: 'DoH Server', k: 'text' },
        { l: 'Verify DoH Certificate', k: 'check' }
      ]
    },
    'route': {
      title: 'Route',
      fields: [
        { l: 'Dst. Address', k: 'text', core: 1 },
        { l: 'Gateway', k: 'text', core: 1 },
        { l: 'Pref. Source', k: 'text' },
        { l: 'Distance', k: 'text' },
        { l: 'Scope', k: 'select' },
        { l: 'Target Scope', k: 'select' },
        { l: 'Routing Table', k: 'select' },
        { l: 'Check Gateway', k: 'select' },
        { l: 'Comment', k: 'text' }
      ]
    },
    'ip pool': {
      title: 'IP Pool',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Addresses', k: 'text', core: 1 },
        { l: 'Next Pool', k: 'select' }
      ]
    },
    'ppp secret': {
      title: 'PPP Secret',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Password', k: 'text', core: 1 },
        { l: 'Service', k: 'select', core: 1 },
        { l: 'Profile', k: 'select', core: 1 },
        { l: 'Local Address', k: 'text' },
        { l: 'Remote Address', k: 'text' },
        { l: 'Routes', k: 'text' },
        { l: 'Comment', k: 'text' }
      ]
    },
    'interface': {
      title: 'Interface',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Type', k: 'select', core: 1 },
        { l: 'MTU', k: 'text' },
        { l: 'L2 MTU', k: 'text' },
        { l: 'MAC Address', k: 'text' },
        { l: 'ARP', k: 'select' },
        { l: 'Comment', k: 'text' }
      ]
    },
    'netwatch entry': {
      title: 'Netwatch Entry',
      fields: [
        { l: 'Host', k: 'text', core: 1 },
        { l: 'Type', k: 'select', core: 1 },
        { l: 'Interval', k: 'text', core: 1 },
        { l: 'Timeout', k: 'text' },
        { l: 'Port', k: 'text' },
        { l: 'Up', k: 'text' },
        { l: 'Down', k: 'text' },
        { l: 'Comment', k: 'text' }
      ]
    },
    'l2tp server': {
      title: 'L2TP Server',
      fields: [
        { l: 'Enabled', k: 'check', core: 1 },
        { l: 'Max MTU', k: 'text', core: 1 },
        { l: 'Max MRU', k: 'text' },
        { l: 'Keepalive Timeout', k: 'text' },
        { l: 'Use IPsec', k: 'select', core: 1 },
        { l: 'IPsec Secret', k: 'text' },
        { l: 'Allow Fast Path', k: 'check' },
        { l: 'Authentication', k: 'select' },
        { l: 'Default Profile', k: 'select' }
      ]
    },
    'pptp server': {
      title: 'PPTP Server',
      fields: [
        { l: 'Enabled', k: 'check', core: 1 },
        { l: 'Authentication', k: 'select', core: 1 },
        { l: 'Default Profile', k: 'select' },
        { l: 'Keepalive Timeout', k: 'text' }
      ]
    },
    'sstp server': {
      title: 'SSTP Server',
      fields: [
        { l: 'Enabled', k: 'check', core: 1 },
        { l: 'Port', k: 'text', core: 1 },
        { l: 'Default Profile', k: 'select', core: 1 },
        { l: 'Certificate', k: 'select' },
        { l: 'Keepalive Timeout', k: 'text' },
        { l: 'Authentication', k: 'select' }
      ]
    },
    'ovpn server': {
      title: 'OVPN Server',
      fields: [
        { l: 'Enabled', k: 'check', core: 1 },
        { l: 'Port', k: 'text', core: 1 },
        { l: 'Mode', k: 'select' },
        { l: 'Netmask', k: 'text' },
        { l: 'Max MTU', k: 'text' },
        { l: 'Certificate', k: 'select' },
        { l: 'Require Client Certificate', k: 'check' },
        { l: 'Cipher', k: 'select' },
        { l: 'Authentication', k: 'select' },
        { l: 'Default Profile', k: 'select' }
      ]
    },
    'backup': {
      title: 'Backup',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Password', k: 'text' },
        { l: 'Confirm Password', k: 'text' },
        { l: "Don't Encrypt", k: 'check' }
      ]
    },
    'snmp': {
      title: 'SNMP',
      fields: [
        { l: 'Enabled', k: 'check', core: 1 },
        { l: 'Contact', k: 'text' },
        { l: 'Location', k: 'text' },
        { l: 'Trap Community', k: 'text' },
        { l: 'Trap Target', k: 'text' },
        { l: 'Trap Version', k: 'select' },
        { l: 'Trap Generators', k: 'text' },
        { l: 'Authentication', k: 'select' }
      ]
    },
    'sniffer': {
      title: 'Sniffer',
      fields: [
        { l: 'Interface', k: 'select', core: 1 },
        { l: 'File Name', k: 'text' },
        { l: 'File Limit', k: 'text' },
        { l: 'Memory Limit', k: 'text' },
        { l: 'Filter', k: 'text' },
        { l: 'Filter Stream', k: 'text' },
        { l: 'Streaming Enabled', k: 'check' },
        { l: 'Streaming Server', k: 'text' }
      ]
    },
    'pppoe client': {
      title: 'PPPoE Client',
      tabs: ['General', 'Dial Out', 'Status', 'Traffic'],
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Interface', k: 'select', core: 1 },
        { l: 'User', k: 'text', core: 1 },
        { l: 'Password', k: 'text', core: 1 },
        { l: 'Service', k: 'text' },
        { l: 'AC Name', k: 'text' },
        { l: 'Keepalive Timeout', k: 'text' },
        { l: 'MTU', k: 'text' },
        { l: 'Add Default Route', k: 'check' },
        { l: 'Default Route Distance', k: 'text' },
        { l: 'Use Peer DNS', k: 'check' },
        { l: 'Disabled', k: 'check' }
      ]
    },
    'bridge': {
      title: 'Bridge',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'MTU', k: 'text' },
        { l: 'L2 MTU', k: 'text' },
        { l: 'ARP', k: 'select' },
        { l: 'Admin MAC', k: 'text' },
        { l: 'Protocol Mode', k: 'select' },
        { l: 'VLAN Filtering', k: 'check' },
        { l: 'Comment', k: 'text' }
      ]
    },
    'vlan': {
      title: 'VLAN',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Interface', k: 'select', core: 1 },
        { l: 'VLAN ID', k: 'text', core: 1 },
        { l: 'MTU', k: 'text' },
        { l: 'ARP', k: 'select' },
        { l: 'Comment', k: 'text' }
      ]
    },
    'address': {
      title: 'Address',
      fields: [
        { l: 'Address', k: 'text', core: 1 },
        { l: 'Network', k: 'text', core: 1 },
        { l: 'Interface', k: 'select', core: 1 },
        { l: 'Comment', k: 'text' }
      ]
    },
    'dhcp client': {
      title: 'DHCP Client',
      fields: [
        { l: 'Interface', k: 'select', core: 1 },
        { l: 'Use Peer DNS', k: 'check' },
        { l: 'Use Peer NTP', k: 'check' },
        { l: 'Add Default Route', k: 'check' },
        { l: 'Default Route Distance', k: 'text' },
        { l: 'Disabled', k: 'check' }
      ]
    },
    'user': {
      title: 'User',
      fields: [
        { l: 'Name', k: 'text', core: 1 },
        { l: 'Group', k: 'select', core: 1 },
        { l: 'Password', k: 'text' },
        { l: 'Confirm Password', k: 'text' },
        { l: 'Allowed Address', k: 'text' },
        { l: 'Comment', k: 'text' }
      ]
    }
  };

  /* как в статьях называют одно и то же поле */
  const FIELD_SYN = {
    'allowed ips': 'allowed address', 'allowed ip': 'allowed address',
    'allowedaddress': 'allowed address', 'allowed-address': 'allowed address',
    'preshared key (psk)': 'preshared key', 'psk': 'preshared key',
    'keepalive': 'persistent keepalive', 'keepalive time': 'persistent keepalive',
    'persistent keepalive (s)': 'persistent keepalive',
    'publickey': 'public key', 'privatekey': 'private key',
    'mtu (l2)': 'l2 mtu', 'comment (примечание)': 'comment',
    'address space': 'dhcp address space', 'gateway': 'gateway for dhcp network',
    'addresses to give out (pool)': 'addresses to give out',
    'pool': 'addresses to give out', 'dns server': 'dns servers',
    'lease time (dhcp)': 'lease time',
    'dst address': 'dst. address', 'src address': 'src. address',
    'dst port': 'dst. port', 'src port': 'src. port',
    'in interface': 'in. interface', 'out interface': 'out. interface',
    'in interface list': 'in. interface list', 'out interface list': 'out. interface list',
    'gateway (nexthop)': 'gateway', 'distance (metric)': 'distance',
    'routing table': 'routing table', 'table': 'routing table'
  };

  function normLabel(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[*:]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function dialogName(spec) {
    const t = String((spec.form && spec.form.title) || spec.win || '').toLowerCase().trim();
    const strip = function (s) {
      return s.replace(/^new\s+/, '').replace(/\s*\(.*?\)\s*$/, '').replace(/\s*-\s*.*$/, '').trim();
    };
    const a = strip(t);
    if (WIN4[a]) return a;
    const b = t.replace(/^new\s+/, '').trim();
    if (WIN4[b]) return b;
    return '';
  }

  /* «Enabled», «yes/no» и подобные поля в Winbox 4 — это чекбоксы */
  const CHECK_RE = /^(enabled|responder|passive|use ipsec|add default route|no default config|don't encrypt|allow remote requests|secure mode|upgrade firmware|keep users|run post-boot|dynamic|invalid)$/i;

  function guessType(fd) {
    const v = fd.v == null ? '' : String(fd.v).trim();
    if (CHECK_RE.test(fd.l)) return 'check';
    if (/^(yes|no)$/i.test(v)) return 'check';
    if (fd.ro) return 'text';
    return fd.v === '' ? 'text' : '';
  }

  function prepareForm(spec) {
    const src = spec.form || {};
    const out = {};
    for (const k in src) out[k] = src[k];

    let fields = (src.fields || []).map(function (fd) {
      const o = {};
      for (const k in fd) o[k] = fd[k];
      o._l = normLabel(o.l);
      return o;
    });

    const key = dialogName(spec);
    const cat = key ? WIN4[key] : null;
    if (cat) {
      const by = {};
      fields.forEach(function (fd) {
        if (!by[fd._l]) by[fd._l] = fd;
        const syn = FIELD_SYN[fd._l];
        if (syn && !by[syn]) by[syn] = fd;
      });
      const used = [];
      const list = [];
      /* показываем окно так, как оно выглядит: все поля сверху до последнего
         заполненного в статье, пустые — пустыми, как в настоящем диалоге */
      let last = -1;
      const need = {};
      cat.fields.forEach(function (c, i) {
        const nk = normLabel(c.l);
        if (by[nk]) last = i;
        /* если у поля-«+» в статье есть значение, покажем и поле Current … */
        if (c.k === 'plus' && by[nk] && String(by[nk].v || '').trim()) {
          need[normLabel('Current ' + c.l)] = 1;
          need[normLabel('Current ' + c.l + ' Address')] = 1;
        }
      });
      cat.fields.forEach(function (c, i) {
        const nk = normLabel(c.l);
        const a = by[nk] || null;
        if (a) used.push(a);
        if (!a && !c.core && i > last && !need[nk]) return;
        const o = a || { l: c.l };
        o.l = c.l;
        if (!o.type && c.k && c.k !== 'text') o.type = c.k;
        list.push(o);
      });
      /* поля, которых в настоящем окне нет, не рисуем — они попадают в отладку,
         чтобы авторы статей поправили подписи */
      fields.forEach(function (fd) {
        if (used.indexOf(fd) < 0 && list.indexOf(fd) < 0) {
          if (!window.__win4dropped) window.__win4dropped = [];
          window.__win4dropped.push(key + ': ' + fd.l);
        }
      });
      fields = list;
      if (!src.tabs && cat.tabs) out.tabs = cat.tabs.slice();
      if (!src.title) out.title = cat.title;
    }

    /* Поля с вкладкой (t) — как в настоящем Winbox: в General видно только
       General, в Action — только Action. Если автор разметил вкладки, оставляем
       лишь те поля, что он перечислил (каталог иначе досыпает пустые). */
    if (src.tab && fields.some(function (f) { return f.t; })) {
      const authored = {};
      (src.fields || []).forEach(function (f) { authored[normLabel(f.l)] = 1; });
      fields = fields.filter(function (f) {
        if (!authored[normLabel(f.l)]) return false;
        return !f.t || f.t === src.tab;
      });
    }

    /* у полей-списков («+») значение относится к соседнему полю Current … */
    fields.forEach(function (fd) {
      if (fd.type !== 'plus' && !(fd.type === 'check' && fd.plus)) return;
      const v = fd.v == null ? '' : String(fd.v).trim();
      if (!v) return;
      const wants = [normLabel('Current ' + fd.l), normLabel('Current ' + fd.l + ' Address')];
      for (let i = 0; i < fields.length; i++) {
        if (wants.indexOf(normLabel(fields[i].l)) >= 0 && !fields[i].v) {
          fields[i].v = v;
          fields[i].type = fields[i].type || '';
          fd.v = '';
          break;
        }
      }
    });

    fields.forEach(function (fd) {
      const v = fd.v == null ? '' : String(fd.v).trim();
      if (CHECK_RE.test(fd.l)) fd.type = 'check';
      if (!fd.type) fd.type = guessType(fd);
      if (fd.type === 'check') {
        if (!('v' in fd) || v === '') fd.v = !/^disabled$/i.test(fd.l);
        else fd.v = /^(yes|true|1|on)$/i.test(v);
      }
    });
    out.fields = fields;
    return out;
  }

  /* ---------- форма ---------- */
  function form(spec, tabsHost) {
    const f = prepareForm(spec);
    const box = el('div', 'wb-form');
    if (tabsHost) box.appendChild(tabsHost);

    const body = el('div', 'wb-form-body');
    (f.fields || []).forEach(function (fd, i) {
      const row = el('div', 'wb-f');
      const linkCls = fd.link ? ' link' : '';
      if (fd.err) {
        row.appendChild(el('div', 'lbl-box',
          '<div class="lb' + linkCls + '">' + esc(fd.l) + '</div>' +
          '<div class="err">' + esc(fd.err) + '</div>'));
      } else {
        row.appendChild(el('label', linkCls.trim(), esc(fd.l)));
      }

      const target = function (node) {
        node.id = 'f-' + i;
        if (fd.m) { node.setAttribute('data-m', fd.m); node.classList.add('wb-target'); }
        if (fd.foc) node.classList.add('foc');
        return node;
      };
      const sq = function (glyph, cls, off) {
        const b = el('button', 'sq' + (cls ? ' ' + cls : '') + (off ? ' off' : ''), glyph);
        b.type = 'button';
        return b;
      };

      if (fd.type === 'check') {
        row.appendChild(target(el('div', 'chk' + (fd.v ? ' on' : ''))));
        if (fd.plus) row.appendChild(sq('+', 'plus'));
      } else if (fd.type === 'plus') {
        /* поле-список, куда значения добавляют кнопкой «+» (Endpoint, Port …) */
        row.appendChild(target(sq('+', 'plus')));
        if (fd.v) row.appendChild(el('div', 'fnote', esc(fd.v)));
      } else if (fd.type === 'area') {
        const c = target(el('div', 'ctl', esc(fd.v == null ? '' : fd.v)));
        c.style.height = 'auto';
        c.style.minHeight = '46px';
        c.style.whiteSpace = 'pre-wrap';
        c.style.alignItems = 'flex-start';
        c.style.padding = '4px 7px';
        row.appendChild(c);
      } else if (fd.multi || fd.type === 'multi') {
        /* значение + «−» + «▾» + «+» — как у Allowed Address в WireGuard Peer */
        const wrap = el('div', 'combo');
        const c = target(el('div', 'ctl', esc(fd.v == null ? '' : fd.v)));
        wrap.appendChild(c);
        wrap.appendChild(el('div', 'car', '▾'));
        row.appendChild(wrap);
        row.appendChild(sq('−', 'minus'));
        row.appendChild(sq('+', 'plus'));
      } else {
        const c = target(el('div', 'ctl' + (fd.ro ? ' ro' : ''), esc(fd.v == null ? '' : fd.v)));
        if (fd.type === 'select') {
          const wrap = el('div', 'combo');
          wrap.appendChild(c);
          wrap.appendChild(el('div', 'car', '▾'));
          row.appendChild(wrap);
        } else {
          row.appendChild(c);
        }
        if (fd.plus) row.appendChild(sq('+', 'plus'));
      }
      body.appendChild(row);
    });

    if (f.note) body.appendChild(el('div', 'wb-f', '<label></label><div class="fnote">' + esc(f.note) + '</div>'));
    box.appendChild(body);

    if (f.buttons !== false) {
      const foot = el('div', 'wb-form-foot');
      const list = (f.buttons || ['Cancel', 'Apply', 'OK']).slice().map(function (b) {
        return (b && typeof b === 'object') ? b : { t: b };
      });
      /* Winbox 4 держит внизу справа Cancel / Apply / OK, остальные кнопки — слева.
         В статьях подписи бывают по-русски, поэтому приводим их к стандартным. */
      const SYN = {
        cancel: 'Cancel', 'отмена': 'Cancel', back: 'Back', 'назад': 'Back',
        apply: 'Apply', 'применить': 'Apply', ok: 'OK', 'ок': 'OK', 'готово': 'OK',
        next: 'Next', 'далее': 'Next'
      };
      const norm = function (b) {
        const t = (b && typeof b === 'object') ? b.t : b;
        const k = String(t).toLowerCase().replace(/[.!…]+$/g, '').trim();
        return SYN[k] || t;
      };
      const STD = ['Cancel', 'Apply', 'OK'];
      const acts = list.filter(function (b) { return STD.indexOf(norm(b)) < 0; });
      const std = STD.map(function (name) {
        for (let i = 0; i < list.length; i++) if (norm(list[i]) === name) return list[i];
        return null;
      }).filter(Boolean);
      if (!std.length) std.push({ t: 'OK' });

      acts.forEach(function (b) {
        const btn = el('button', 'wb-btn', '<span class="bi">⋯</span>' + esc(b.t));
        btn.type = 'button';
        btn.id = 'btn-' + String(b.t).toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
        btn.style.marginRight = 'auto';
        if (b.m) { btn.setAttribute('data-m', b.m); btn.classList.add('wb-target'); }
        foot.appendChild(btn);
      });
      std.forEach(function (b) {
        const name = norm(b);
        const cls = name === 'Cancel' ? ' sec' : ' def';
        const btn = el('button', 'wb-btn' + cls, esc(name));
        btn.type = 'button';
        btn.id = 'btn-' + name.toLowerCase();
        if (b.m) { btn.setAttribute('data-m', b.m); btn.classList.add('wb-target'); }
        foot.appendChild(btn);
      });
      box.appendChild(foot);
    }
    return box;
  }
  /* ---------- терминал ---------- */
  function terminal(spec) {
    const t = el('div', 'wb-term');
    const h = el('div', 'wb-term-h');
    h.innerHTML = '<span class="ico">' + ico('log', 15) + '</span><span>' + esc(spec.win || 'New Terminal') + '</span>' +
      '<span class="path">' + esc(spec.path || '') + '</span>' +
      '<button class="copy" type="button">Copy</button>';
    t.appendChild(h);
    const pre = document.createElement('pre');
    const html = (spec.lines || []).map(function (ln) {
      if (typeof ln === 'object') {
        return '<span class="' + (ln.k || 'out') + '">' + esc(ln.t) + '</span>';
      }
      const s = String(ln);
      if (/^[>/]|\/ip |\/interface |\/system |\/tool |\/queue |\/routing |\/ppp |\/bridge /.test(s)) {
        return '<span class="pr">[admin@MikroTik] &gt; </span><span class="cm">' + esc(s) + '</span>';
      }
      return '<span class="out">' + esc(s) + '</span>';
    }).join('\n');
    pre.innerHTML = html;
    t.appendChild(pre);
    return t;
  }
  /* ---------- аннотации ----------
     Правило: номер-бейдж ставится на сам элемент (в его правый верхний угол),
     чтобы стрелка не тянулась через всю таблицу и не перечёркивала текст.
     Стрелка рисуется только для мелких элементов (кнопки, вкладки, чекбоксы):
     бейдж выносится над ними, стрелка бьёт в центр.                    */
  function annotate(root, notes) {
    const svgNS = 'http://www.w3.org/2000/svg';

    Array.prototype.forEach.call(root.querySelectorAll('.wb-annot, .wb-num'), function (n) {
      n.parentNode.removeChild(n);
    });

    const W = root.offsetWidth || 1000;
    const H = root.offsetHeight || 400;
    const rb = root.getBoundingClientRect();
    // если макет уже отмасштабирован transform'ом — переводим px в «натуральные»
    const sc = (W && rb.width ? rb.width / W : 1) || 1;

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'wb-annot');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    const targets = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-m]'), function (m) {
      const n = m.getAttribute('data-m');
      if (!targets[n]) targets[n] = m;
    });

    const R = 9;          // радиус бейджа
    const taken = [];     // занятые позиции — чтобы номера не наезжали друг на друга

    notes.forEach(function (text, idx) {
      const n = idx + 1;
      const t = targets[n];
      if (!t) return;

      const r = t.getBoundingClientRect();
      const x = (r.left - rb.left) / sc;
      const y = (r.top - rb.top) / sc;
      const w = r.width / sc;
      const h = r.height / sc;

      // мелкие управляющие элементы (кнопки, чекбоксы) — бейдж выносим наружу со стрелкой;
      // ячейки, поля, вкладки — бейдж внутри самого элемента, у правого края
      const isCtrl = t.classList.contains('wb-btn') || t.classList.contains('chk') ||
        t.classList.contains('sq') || t.classList.contains('car');
      const small = isCtrl || w < 20 || h < 16;
      let cx, cy;

      if (!small) {
        cx = x + w - R - 2;
        cy = y + h / 2;
      } else {
        // мелкий: бейдж над элементом, стрелка вниз
        cx = x + w / 2;
        cy = y - R - 5;
        if (cy < R + 3) cy = y + h + R + 5;
      }

      cx = Math.min(W - R - 3, Math.max(R + 3, cx));
      cy = Math.min(H - R - 3, Math.max(R + 3, cy));

      if (!small) {
        // крупная цель: бейдж гарантированно внутри своего элемента,
        // чтобы он не мог наехать на текст соседней ячейки
        cx = Math.min(x + w - R - 2, Math.max(x + R + 2, cx));
        cy = Math.min(y + h - R + 2, Math.max(y + R - 2, cy));
      }

      let guard = 0;
      while (guard++ < 10 && taken.some(function (p) {
        return Math.abs(p[0] - cx) < 2 * R - 2 && Math.abs(p[1] - cy) < 2 * R - 2;
      })) {
        cy += 2 * R + 3;
        if (cy > H - R - 3) { cy = R + 3; cx += 2 * R + 3; }
      }
      taken.push([cx, cy]);

      if (small) {
        const tx = x + w / 2;
        const ty = y + h / 2;
        const a = Math.atan2(ty - cy, tx - cx);
        const sx = cx + Math.cos(a) * (R + 1);
        const sy = cy + Math.sin(a) * (R + 1);
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) +
          'L' + tx.toFixed(1) + ',' + ty.toFixed(1));
        svg.appendChild(path);
        const ah = 8;
        const head = document.createElementNS(svgNS, 'path');
        head.setAttribute('d', 'M' + tx.toFixed(1) + ',' + ty.toFixed(1) +
          'L' + (tx - ah * Math.cos(a - 0.42)).toFixed(1) + ',' + (ty - ah * Math.sin(a - 0.42)).toFixed(1) +
          'L' + (tx - ah * Math.cos(a + 0.42)).toFixed(1) + ',' + (ty - ah * Math.sin(a + 0.42)).toFixed(1) + 'Z');
        head.setAttribute('fill', '#e11d48');
        head.setAttribute('stroke', 'none');
        svg.appendChild(head);
      }

      const badge = el('div', 'wb-num', String(n));
      badge.style.left = (cx - R) + 'px';
      badge.style.top = (cy - R) + 'px';
      root.appendChild(badge);
    });

    root.insertBefore(svg, root.firstChild);
  }

  /* ---------- масштабирование под ширину ---------- */
  function fit(host) {
    const inner = host.querySelector('.scene-scale');
    if (!inner) return;
    const base = inner.querySelector('.wb, .wb-term');
    if (!base) return;
    const avail = host.clientWidth;
    const natural = base.offsetWidth || 1000;
    let k = avail / natural;
    if (k > 1) k = 1;
    if (k < 0.6) k = 0.6;
    inner.style.transform = 'scale(' + k + ')';
    host._k = k;
    host._natW = natural;
    const h = base.offsetHeight || 400;
    host.style.height = Math.ceil(h * k) + 'px';
    const needScroll = (avail / natural) < 0.6;
    host.style.overflowX = needScroll ? 'auto' : 'hidden';
    inner.style.width = natural + 'px';
    const hint = host.parentElement ? host.parentElement.querySelector('.scene-hint') : null;
    if (hint) {
      if (needScroll) hint.classList.add('on');
      else hint.classList.remove('on');
    }
  }

  /* ---------- фокус на конкретном элементе окна ----------
     Одна и та же схема используется для разных шагов: подсвечивается
     только то поле/строка/вкладка, о которой говорит шаг.            */
  function withFocus(spec) {
    const f = spec.focus;
    if (!f) return spec;
    const s = {};
    for (const k in spec) s[k] = spec[k];

    if (f.path) {
      s._fp = true;
      s.notes = ['Это окно открывается по пути: ' + (spec.path || spec.win || 'RouterOS 7')];
      return s;
    }
    if (f.field != null && spec.form && (spec.form.fields || [])[f.field]) {
      const fld = spec.form.fields;
      const form = {};
      for (const k in spec.form) form[k] = spec.form[k];
      form.fields = fld.map(function (fd, i) {
        const c = {};
        for (const k2 in fd) c[k2] = fd[k2];
        if (i === f.field) { c.m = 1; c.foc = true; } else { c.m = 0; }
        return c;
      });
      s.form = form;
      s._ff = f.field;
      const F = form.fields[f.field];
      s._fL = String((F && F.l) || '').toLowerCase();
      s.notes = ['Поле «' + (F.l || '') + '»' + (F.v != null && F.v !== '' ? ' → ' + F.v : '')];
      return s;
    }
    if (f.row != null && spec.rows && spec.rows[f.row]) {
      const row = spec.rows[f.row];
      s.rows = spec.rows.map(function (r, i) {
        return r.map(function (cell, j) {
          const o = (cell && typeof cell === 'object') ? (function () { const c = {}; for (const k2 in cell) c[k2] = cell[k2]; return c; })() : { v: cell };
          if (i === f.row && j === 0) { o.m = 1; o.foc = true; } else { o.m = 0; }
          return o;
        });
      });
      s._fr = f.row;
      const first = row[0];
      const label = (first && typeof first === 'object') ? first.v : first;
      s.notes = ['Строка «' + String(label == null ? '' : label) + '»'];
      return s;
    }
    if (f.tab != null && spec.tabs && spec.tabs[f.tab]) {
      s.tab = spec.tabs[f.tab];
      s.tabMark = spec.tabs[f.tab];
      s.tabMarkN = 1;
      s.notes = ['Вкладка «' + spec.tabs[f.tab] + '»'];
      return s;
    }
    if (f.tool != null && spec.tools && spec.tools[f.tool]) {
      s.tools = spec.tools.map(function (b, i) {
        const c = {};
        for (const k2 in b) c[k2] = b[k2];
        if (i === f.tool) { c.m = 1; c.foc = true; } else { c.m = 0; }
        return c;
      });
      s._fb = f.tool;
      s.notes = ['Кнопка «' + (spec.tools[f.tool].t || '') + '»'];
      return s;
    }
    return spec;
  }

  function applyDim(body, spec) {
    if (spec._ff != null) {
      /* порядок полей может отличаться от авторского (каталог Winbox 4),
         поэтому ориентируемся на подпись поля, а не на индекс */
      const want = String(spec._fL || '').toLowerCase();
      Array.prototype.forEach.call(body.querySelectorAll('.wb-form-body > .wb-f'), function (r) {
        const lb = r.querySelector('label, .lbl-box .lb');
        const txt = lb ? lb.textContent.trim().toLowerCase() : '';
        r.classList.toggle('dim', !want || txt !== want);
      });
    }
    if (spec._fr != null) {
      Array.prototype.forEach.call(body.querySelectorAll('.wb-table > .wb-tr'), function (r, i) {
        if (r.classList.contains('wb-th')) return;
        r.classList.toggle('dim', (i - 1) !== spec._fr);
      });
    }
  }

  function render(specRaw) {
    const spec = withFocus(specRaw);
    const block = el('div', 'scene-block');
    if (spec.cap) {
      block.appendChild(el('div', 'scene-cap', '<svg viewBox="0 0 24 24" width="13" height="13"><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3 9h18" stroke="currentColor" stroke-width="1.6"/></svg> <b>' + esc(spec.cap) + '</b>'));
    }
    const host = el('div', 'scene-host');
    const scale = el('div', 'scene-scale');

    const root = el('div', 'wb');
    root.appendChild(sidebar(spec.path, spec.menu));

    const main = el('div', 'wb-main');

    /* строка заголовка: «Окно › Диалог», справа — путь в меню и кнопки окна */
    const pf = spec.form ? prepareForm(spec) : null;
    const fTitle = pf ? (pf.title || '') : '';
    /* «New WireGuard Peer» — это окно WireGuard Peer с диалогом New… */
    const isNew = /^new\s+/i.test(String(spec.win || '')) || /^new\b/i.test(fTitle);
    /* названия окон, как они подписаны в Winbox 4 */
    const WIN_TITLE = {
      firewall: 'IP Firewall', 'address list': 'IP Address', 'address lists': 'IP Address',
      'route list': 'IP Routes', routes: 'IP Routes', 'ip routes': 'IP Routes',
      'dhcp leases': 'DHCP Server', nat: 'IP Firewall', 'filter rules': 'IP Firewall',
      services: 'IP Services', 'ip services': 'IP Services', users: 'User'
    };
    const winRaw = String(spec.win || 'Winbox 4').replace(/^new\s+/i, '') || 'Winbox 4';
    const winType = WIN_TITLE[winRaw.toLowerCase()] || winRaw;
    /* в шапке Winbox 4 рядом с именем окна стоит имя открытого диалога */
    let child = '';
    if (isNew) child = fTitle && !/^new\b/i.test(fTitle) ? fTitle : 'New…';
    else if (fTitle && fTitle.toLowerCase() !== winType.toLowerCase()) {
      child = fTitle.replace(new RegExp('^' + winType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*', 'i'), '')
        .replace(/^[([\s]+|[)\]]+$/g, '').trim();
    }
    const tb = el('div', 'wb-tb');
    tb.innerHTML = '<span class="ico">' + ico(groupIcon(spec.path), 15) + '</span>' +
      '<span class="tt">' + esc(winType) + '</span>' +
      (child ? '<span class="arr">›</span><span class="chip">' + esc(child) + '</span>' : '') +
      '<span class="path">' + esc(spec.path || '') + '</span>' +
      '<span class="wc"><i>⤢</i><i>✕</i></span>';
    if (spec._fp) {
      const pEl = tb.querySelector('.path');
      if (pEl) { pEl.id = 'wpath'; pEl.setAttribute('data-m', '1'); pEl.classList.add('wb-target'); pEl.classList.add('foc'); }
    }
    main.appendChild(tb);

    const dlgTabs = (pf && pf.tabs) || null;
    let dlgTabsHost = null;
    if (dlgTabs && dlgTabs.length) {
      dlgTabsHost = el('div', 'wb-tabs wb-dlgtabs');
      const onT = pf.tab || dlgTabs[0];
      const tmarks = (pf && pf.tabMarks) || {};
      dlgTabs.forEach(function (t, i) {
        const d = el('div', 'wb-tab' + (t === onT ? ' on' : ''), esc(t));
        /* номер на вкладке диалога: «5 — перейдите на вкладку Dial Out» */
        const mk = tmarks[t] || ((pf && pf.tabMark === t) ? (pf.tabMarkN || 1) : 0);
        if (mk) { d.setAttribute('data-m', mk); d.classList.add('wb-target'); }
        dlgTabsHost.appendChild(d);
      });
    }

    if (spec.tabs && spec.tabs.length) {
      const tabs = el('div', 'wb-tabs');
      spec.tabs.forEach(function (t, i) {
        const on = (spec.tab || spec.tabs[0]) === t;
        const d = el('div', 'wb-tab' + (on ? ' on' : ''), esc(t));
        d.id = 'tab-' + i;
        if (spec.tabMark === t) { d.setAttribute('data-m', spec.tabMarkN || 1); d.classList.add('wb-target'); d.classList.add('foc'); }
        tabs.appendChild(d);
      });
      main.appendChild(tabs);
    }

    if (!spec.noTools && !(spec.form && !spec.tools)) {
      const tools = el('div', 'wb-tools');
      const btns = spec.tools || [
        { t: 'New', i: '+', title: 'Add new' }, { t: 'Enable', i: '✓', title: 'Enable' },
        { t: 'Disable', i: '✕', title: 'Disable' }, { t: 'Remove', i: '−', title: 'Remove' },
        { t: 'Comment', i: '✎', title: 'Comment' }
      ];
      const TOOLMAP = {
        '+': ['New', '+'], '−': ['Remove', '−'], '-': ['Remove', '−'],
        '✓': ['Enable', '✓'], '✕': ['Disable', '✕'], '⌕': ['Find', '⌕'],
        '⇅': ['Sort', '⇅'], '↻': ['Refresh', '↻'], '↑': ['Up', '↑'], '↓': ['Down', '↓']
      };
      btns.forEach(function (b, i) {
        /* в статьях кнопки заданы значком — подписываем их как в Winbox 4 */
        const m = TOOLMAP[b.t];
        const bi = b.i || (m ? m[1] : '');
        const bt = m ? m[0] : b.t;
        const btn = el('button', 'wb-btn' + (b.pri ? ' pri' : (i > 1 ? ' ghost' : '')),
          '<span class="bi">' + esc(bi) + '</span>' + esc(bt));
        btn.type = 'button';
        btn.id = 'tb-' + (b.id || ('b' + i));
        btn.title = b.title || '';
        if (b.m) { btn.setAttribute('data-m', b.m); btn.classList.add('wb-target'); }
        if (b.foc) btn.classList.add('foc');
        tools.appendChild(btn);
      });
      if (spec.toolsNote) tools.appendChild(el('span', null, '<span style="margin-left:8px;color:#5b636b;font-size:11px">' + esc(spec.toolsNote) + '</span>'));
      main.appendChild(tools);
    }

    const work = el('div', 'wb-work');
    const body = el('div', 'wb-body');
    if (spec.cols) body.appendChild(table(spec));
    if (spec.form) body.appendChild(form(spec, dlgTabsHost));
    if (spec.bodyHtml) body.insertAdjacentHTML('beforeend', spec.bodyHtml);
    applyDim(body, spec);
    work.appendChild(body);

    /* правая панель окна (Copy, Find …) — как в настоящем Winbox 4 */
    if (spec.rightTools !== false) {
      const right = el('div', 'wb-right');
      (spec.rightTools || [{ t: 'Copy', i: '⧉' }, { t: 'Find', i: '⌕' }]).forEach(function (r, i) {
        const d = el('div', 'rt' + (i === 0 ? ' on' : ''),
          '<span class="ri">' + esc(r.i || '⧉') + '</span><span>' + esc(r.t) + '</span>');
        if (r.m) { d.setAttribute('data-m', r.m); d.classList.add('wb-target'); }
        right.appendChild(d);
      });
      work.appendChild(right);
    }
    main.appendChild(work);

    const stText = spec.status || (spec.cols ? '3 items' : '');
    if (stText) {
      const st = el('div', 'wb-status');
      st.innerHTML = '<span>' + esc(stText) + '</span><span class="sp">' + esc(spec.statusRight || '') + '</span>';
      main.appendChild(st);
    }

    root.appendChild(main);
    scale.appendChild(root);
    host.appendChild(scale);
    block.appendChild(host);
    if (spec.marks) block.classList.add('guide');
    block._compact = !!spec.compact;
    if (!spec.compact) block.appendChild(el('div', 'scene-hint', '⇄ Окно шире экрана — прокрутите вбок или нажмите «⤢ крупнее»'));
    addZoom(block, host, spec);
    if (spec.notes && spec.notes.length) {
      const ul = el('ul', 'notes');
      spec.notes.forEach(function (t, i) {
        ul.appendChild(el('li', null, '<span class="n">' + (i + 1) + '</span><span>' + t + '</span>'));
      });
      block.appendChild(ul);
    }
    block._host = host;
    block._fit = function () { fit(host); };
    block._foc = main.querySelector('.foc') || null;
    block._compact = !!spec.compact;
    return block;
  }
  /* ---------- меню Winbox: «где нажать», когда окно ещё не открыто ---------- */
  function renderNav(spec) {
    const block = el('div', 'scene-block');
    block.appendChild(el('div', 'scene-cap',
      '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M4 6h16M4 12h11M4 18h7" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg> <b>' +
      esc('Меню Winbox 4' + (spec.path ? ': ' + spec.path : '')) + '</b>'));
    const host = el('div', 'scene-host');
    const scale = el('div', 'scene-scale');
    const root = el('div', 'wb wb-navwin');
    root.appendChild(sidebar(spec.path, spec.menu));

    const main = el('div', 'wb-main');
    const tb = el('div', 'wb-tb');
    tb.innerHTML = '<span class="ico">' + ico('win', 15) + '</span><span class="tt">Winbox 4</span>' +
      '<span class="path">чтение по дереву меню</span><span class="wc"><i>⤢</i><i>✕</i></span>';
    main.appendChild(tb);

    const work = el('div', 'wb-work');
    const body = el('div', 'wb-body');
    body.innerHTML = '<div class="wb-navpath">' +
      String(spec.path || '').split('→').map(function (p) { return '<span class="np">' + esc(p.trim()) + '</span>'; })
        .join('<span class="narr">›</span>') +
      '</div><div class="wb-navhint">Откройте этот раздел в дереве Winbox 4 — появится окно настроек.</div>';
    work.appendChild(body);
    main.appendChild(work);
    root.appendChild(main);

    scale.appendChild(root);
    host.appendChild(scale);
    block.appendChild(host);

    // подсветка целевого пункта
    const subs = root.querySelectorAll('.sb-sub.hl');
    const grps = root.querySelectorAll('.sb-grp.hl');
    const target = subs.length ? subs[subs.length - 1] : (grps.length ? grps[0] : null);
    let notes = [];
    if (target) {
      const n = (spec.menu && (spec.menu.sub || spec.menu.grp)) || 1;
      target.id = 'navtarget';
      target.setAttribute('data-m', n);
      target.classList.add('wb-target');
      target.classList.add('foc');
      notes = spec.notes || ['Откройте в меню: ' + (spec.path || '')];
    }
    addZoom(block, host, spec);
    if (notes.length) {
      const ul = el('ul', 'notes');
      notes.forEach(function (t, i) {
        ul.appendChild(el('li', null, '<span class="n">' + (i + 1) + '</span><span>' + esc(t) + '</span>'));
      });
      block.appendChild(ul);
    }
    block._host = host;
    block._fit = function () { fit(host); };
    block._nav = true;
    block._compact = true;
    return block;
  }
  function renderTerminal(spec) {
    const block = el('div', 'scene-block');
    if (spec.cap) {
      block.appendChild(el('div', 'scene-cap',
        '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M4 5l5 5-5 5M11 17h8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg> <b>' + esc(spec.cap) + '</b>'));
    }
    const host = el('div', 'scene-host');
    host.style.background = '#e4e8eb';
    const scale = el('div', 'scene-scale');
    scale.appendChild(terminal(spec));
    host.appendChild(scale);
    block.appendChild(host);
    block.appendChild(el('div', 'scene-hint', '⇄ Тап по окну открывает его крупно; команды копируются кнопкой справа вверху'));
    addZoom(block, host, spec);
    if (spec.notes && spec.notes.length) {
      const ul = el('ul', 'notes');
      spec.notes.forEach(function (t, i) {
        ul.appendChild(el('li', null, '<span class="n">' + (i + 1) + '</span><span>' + t + '</span>'));
      });
      block.appendChild(ul);
    }
    block._host = host;
    block._fit = function () { fit(host); };
    return block;
  }

  /* ---------- полноэкранный просмотр схемы ---------- */
  function addZoom(block, host, spec) {
    const btn = el('button', 'scene-zoom', (spec && spec.compact) ? '⤢' : '⤢ крупнее');
    btn.type = 'button';
    host.appendChild(btn);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      openZoom(block, spec);
    });
    host.addEventListener('click', function () {
      openZoom(block, spec);
    });
  }

  function openZoom(block, spec) {
    const src = block.querySelector('.scene-host .scene-scale');
    if (!src) return;

    const clone = src.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.margin = '0';

    const layer = el('div', 'zoom-layer');

    const head = el('div', 'zoom-head');
    const title = (spec && (spec.cap || spec.win)) || 'Схема Winbox 4';
    head.innerHTML = '<span class="title">' + esc(title) + '</span>';

    const ctl = el('div', 'zoom-ctl');
    const bMinus = el('button', null, '−');
    const pct = el('span', 'pct', '100%');
    const bPlus = el('button', null, '+');
    const bFit = el('button', null, '⇔');
    bMinus.type = bPlus.type = bFit.type = 'button';
    bMinus.setAttribute('aria-label', 'Уменьшить');
    bPlus.setAttribute('aria-label', 'Увеличить');
    bFit.setAttribute('aria-label', 'Вписать по ширине экрана');
    ctl.appendChild(bMinus); ctl.appendChild(pct); ctl.appendChild(bPlus); ctl.appendChild(bFit);

    const bClose = el('button', 'icon-btn', '✕');
    bClose.type = 'button';
    bClose.setAttribute('aria-label', 'Закрыть');
    head.appendChild(ctl);
    head.appendChild(bClose);

    const stage = el('div', 'zoom-stage');
    const canvas = el('div', 'zoom-canvas');
    const box = el('div', 'zoom-box');
    box.appendChild(clone);
    canvas.appendChild(box);
    stage.appendChild(canvas);

    const tip = el('div', 'zoom-tip',
      'Один палец — прокрутка · щипок двумя пальцами — масштаб · двойной тап — увеличить');

    layer.appendChild(head);
    layer.appendChild(stage);
    layer.appendChild(tip);
    document.body.appendChild(layer);
    document.body.style.overflow = 'hidden';

    const MAXK = 3;
    let natW = Math.round(clone.offsetWidth) || 1000;
    let natH = Math.round(clone.offsetHeight) || 420;
    let k = 1, padL = 0, padT = 0;

    function fitK() {
      const sw = stage.clientWidth || window.innerWidth;
      return Math.min(MAXK, Math.max(0.2, (sw - 8) / natW));
    }

    /* размеры и положение считаем сами — без flex-центрирования,
       чтобы схема гарантированно занимала экран и не уезжала в угол */
    function apply() {
      const sw = stage.clientWidth, sh = stage.clientHeight;
      const w = natW * k, h = natH * k;
      const cw = Math.max(sw, Math.ceil(w));
      const ch = Math.max(sh, Math.ceil(h));
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      padL = Math.max(0, (cw - w) / 2);
      padT = Math.max(0, (ch - h) / 2);
      box.style.width = natW + 'px';
      box.style.height = natH + 'px';
      box.style.transform = 'scale(' + k + ')';
      box.style.left = padL.toFixed(1) + 'px';
      box.style.top = padT.toFixed(1) + 'px';
      pct.textContent = Math.round(k * 100) + '%';
      const f = fitK();
      bMinus.disabled = k <= f + 0.001;
      bPlus.disabled = k >= MAXK - 0.001;
      bFit.classList.toggle('on', Math.abs(k - f) < 0.008);
    }

    /* масштаб вокруг точки (px, py) внутри сцены */
    function zoomAt(kNew, px, py) {
      const nx = (stage.scrollLeft + px - padL) / k;
      const ny = (stage.scrollTop + py - padT) / k;
      k = Math.min(MAXK, Math.max(fitK(), kNew));
      apply();
      stage.scrollLeft = Math.max(0, nx * k + padL - px);
      stage.scrollTop = Math.max(0, ny * k + padT - py);
    }

    function step(d) {
      zoomAt(Math.round((k + d) * 100) / 100, stage.clientWidth / 2, stage.clientHeight / 2);
    }
    bMinus.addEventListener('click', function () { step(-0.15); });
    bPlus.addEventListener('click', function () { step(0.15); });
    bFit.addEventListener('click', function () {
      k = fitK(); apply();
      stage.scrollLeft = 0; stage.scrollTop = 0;
    });

    /* ---------- жесты ---------- */
    let pan = null, pinch = null, lastTap = 0, tapX = 0, tapY = 0;

    function d2(t) {
      const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.hypot(dx, dy);
    }
    function mid(t) {
      const r = stage.getBoundingClientRect();
      return {
        x: (t[0].clientX + t[1].clientX) / 2 - r.left,
        y: (t[0].clientY + t[1].clientY) / 2 - r.top
      };
    }

    stage.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinch = { d: d2(e.touches) || 1, k: k };
        pan = null;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        pan = {
          x: e.touches[0].clientX, y: e.touches[0].clientY,
          sl: stage.scrollLeft, st: stage.scrollTop, moved: 0
        };
        const now = Date.now();
        if (now - lastTap < 320 &&
            Math.abs(e.touches[0].clientX - tapX) < 30 &&
            Math.abs(e.touches[0].clientY - tapY) < 30) {
          // двойной тап: вписать ⇄ увеличить вокруг точки нажатия
          const rect = stage.getBoundingClientRect();
          const f = fitK();
          if (k > f + 0.05) {
            k = f; apply();
            stage.scrollLeft = 0; stage.scrollTop = 0;
          } else {
            zoomAt(f * 2, e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
          }
          lastTap = 0;
          return;
        }
        lastTap = now;
        tapX = e.touches[0].clientX;
        tapY = e.touches[0].clientY;
      }
    }, { passive: false });

    stage.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        const d = d2(e.touches);
        const m = mid(e.touches);
        zoomAt(pinch.k * (d / pinch.d), m.x, m.y);
      } else if (e.touches.length === 1 && pan) {
        e.preventDefault();
        const dx = e.touches[0].clientX - pan.x;
        const dy = e.touches[0].clientY - pan.y;
        pan.moved = Math.max(pan.moved, Math.abs(dx) + Math.abs(dy));
        stage.scrollLeft = pan.sl - dx;
        stage.scrollTop = pan.st - dy;
      }
    }, { passive: false });

    stage.addEventListener('touchend', function (e) {
      if (e.touches.length === 0) { pinch = null; pan = null; }
      else if (e.touches.length === 1 && pinch) { pinch = null; }
    });

    /* колесо мыши (для превью в браузере) */
    stage.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(k * (e.deltaY > 0 ? 0.92 : 1.08), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    function close() {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.body.style.overflow = '';
      layer.remove();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    function onResize() {
      const f = fitK();
      if (k < f) k = f;
      apply();
    }
    bClose.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    /* первый расчёт — после того как слой получил размеры */
    function boot() {
      natW = Math.round(clone.offsetWidth) || natW;
      natH = Math.round(clone.offsetHeight) || natH;
      if (stage.clientWidth < 20) { requestAnimationFrame(boot); return; }
      k = fitK();
      apply();
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
    }
    requestAnimationFrame(boot);
  }

  /* один обработчик resize на всё приложение: блоков в статье бывает 10+ */
  const LIVE = [];
  let rt = null;
  function onResizeAll() {
    clearTimeout(rt);
    rt = setTimeout(function () {
      for (let i = LIVE.length - 1; i >= 0; i--) {
        const b = LIVE[i];
        if (!b.isConnected) { LIVE.splice(i, 1); continue; }
        if (b._fit) b._fit();
        if (b._annotate) b._annotate();
        centerFocus(b);
      }
    }, 120);
  }
  window.addEventListener('resize', onResizeAll);
  window.addEventListener('orientationchange', onResizeAll);

  /* если шаг говорит про конкретное поле — прокручиваем окно к нему */
  function centerFocus(b) {
    const host = b._host, f = b._foc;
    if (!host || !f || !b._compact) return;
    const k = host._k || 1;
    if (host.scrollWidth <= host.clientWidth + 2) return;
    const left = (f.offsetLeft || 0) * k;
    const w = (f.offsetWidth || 0) * k;
    const target = left + w / 2 - host.clientWidth / 2;
    host.scrollLeft = Math.max(0, target);
  }

  function mount(container, specs, opts) {
    const compact = !!(opts && opts.compact);
    // забываем блоки прошлых статей, чтобы не копить память при переходах
    for (let i = LIVE.length - 1; i >= 0; i--) if (!LIVE[i].isConnected) LIVE.splice(i, 1);
    const blocks = [];
    (specs || []).forEach(function (spec) {
      const one = compact ? (function () {
        const c = {};
        for (const k in spec) c[k] = spec[k];
        c.compact = true;
        return c;
      })() : spec;
      const b = one.nav ? renderNav(one) : (one.term ? renderTerminal(one) : render(one));
      if (compact) b.classList.add('compact');
      container.appendChild(b);
      blocks.push(b);
      LIVE.push(b);
    });
    // аннотации считаем после вставки в DOM (нужна реальная геометрия)
    requestAnimationFrame(function () {
      blocks.forEach(function (b) {
        if (b._fit) b._fit();            // сначала масштаб, потом геометрия стрелок
        const root = b.querySelector('.wb');
        if (root && b.querySelectorAll('[data-m]').length) {
          const notes = collectNotes(b);
          if (notes.length) {
            b._annotate = function () { annotate(root, notes); };
            b._annotate();
          }
        }
        centerFocus(b);
      });
    });
    return blocks;
  }

  function collectNotes(block) {
    // текст заметок берём из списка .notes (он уже отрисован), числа — по порядку
    const items = block.querySelectorAll('.notes li');
    return Array.prototype.map.call(items, function (li) {
      return li.querySelector('span:last-child').textContent;
    });
  }

  window.Scene = { render: render, renderTerminal: renderTerminal, renderNav: renderNav, mount: mount, fit: fit,
    _prepareForm: prepareForm, _dialogName: dialogName, _win4: WIN4, _menu: MENU };
})();
