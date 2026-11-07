/* Дополнительные окна Winbox 4 и привязка «шаг → окно».
   Каждый шаг инструкции получает свою картинку: либо из scenes самой статьи,
   либо из добавленных здесь окон. Формат:
     add('id-статьи', [схемы], { номерШага: индексДобавленной | {i: индекс, f: фокус} }) */
(function () {
  'use strict';
  var D = window.DATA || [];

  function article(id) {
    for (var i = 0; i < D.length; i++) {
      var its = D[i].items || [];
      for (var j = 0; j < its.length; j++) if (its[j].id === id) return its[j];
    }
    return null;
  }

  function add(id, scenes, map) {
    var a = article(id);
    if (!a) return;
    if (!a.scenes) a.scenes = [];
    var base = a.scenes.length;
    a.scenes = a.scenes.concat(scenes);
    if (!map) return;
    Object.keys(map).forEach(function (k) {
      var st = (a.steps || [])[+k];
      if (!st || typeof st === 'string') return;
      var v = map[k];
      if (typeof v === 'number') { st.s = base + v; return; }
      st.s = base + (v.i || 0);
      if (v.f) st.shot = v.f;
    });
  }

  /* ---------------- общие окна ---------------- */

  var FILES = {
    path: 'Files', win: 'Files', noTools: true,
    cols: [{ t: 'Name', w: 190 }, { t: 'Type', w: 90 }, { t: 'Size', w: 90 }, { t: 'Creation Time', w: 150 }],
    rows: [
      [{ v: 'backups/first-config.backup' }, { v: 'backup' }, { v: '24.1 KiB' }, { v: 'nov/03/2026 09:12' }],
      [{ v: 'config-2026-11-03.rsc' }, { v: 'script' }, { v: '12.6 KiB' }, { v: 'nov/03/2026 03:30' }]
    ],
    sel: 0
  };

  var SERVICES = {
    path: 'IP → Services', win: 'IP Services', noTools: true,
    cols: [{ t: 'Name', w: 90 }, { t: 'Port', w: 70 }, { t: 'Available From', w: 150 }, { t: 'Certificate', w: 90 }],
    rows: [
      [{ v: 'winbox', m: 1 }, { v: '8291' }, { v: '192.168.88.0/24' }, { v: '' }],
      [{ v: 'ssh', m: 1 }, { v: '22' }, { v: '192.168.88.0/24' }, { v: '' }],
      ['www', '80', '192.168.88.0/24', ''],
      ['telnet', '23', '', ''],
      ['ftp', '21', '', '']
    ],
    sel: 0,
    notes: ['Оставьте только winbox и ssh и ограничьте их локальной сетью']
  };

  var DHCP_SETUP = {
    path: 'IP → DHCP Server → DHCP Setup', win: 'DHCP Setup', tabs: ['DHCP Setup'], tab: 'DHCP Setup', noTools: true,
    form: {
      title: 'DHCP Setup (шаг 3 из 7)', buttons: ['Назад', 'Далее', 'Отмена'],
      fields: [
        { l: 'DHCP Server Interface', v: 'bridge-lan', type: 'select' },
        { l: 'DHCP Address Space', v: '192.168.88.0/24', ro: true },
        { l: 'Gateway for DHCP Network', v: '192.168.88.1' },
        { l: 'Addresses to Give Out', v: '192.168.88.10-192.168.88.254' },
        { l: 'DNS Servers', v: '192.168.88.1' },
        { l: 'Lease Time', v: '1d 00:00:00', type: 'select' }
      ]
    }
  };

  var NAT_NEW = {
    path: 'IP → Firewall → NAT → New', win: 'New NAT Rule', tabs: ['General', 'Advanced', 'Extra', 'Action', 'Statistics'],
    tab: 'General', noTools: true,
    form: {
      title: 'New NAT Rule', buttons: ['OK', 'Cancel', 'Apply'],
      fields: [
        { l: 'Chain', v: 'srcnat', type: 'select' },
        { l: 'Src. Address', v: '192.168.88.0/24' },
        { l: 'Out. Interface List', v: 'WAN', type: 'select' },
        { l: 'Action', v: 'masquerade', type: 'select' }
      ],
      note: 'Вкладка Action — там выбирается действие: masquerade, dst-nat, redirect'
    }
  };

  var NEW_ADDRESS = {
    path: 'IP → Address → New', win: 'New Address', noTools: true,
    form: {
      title: 'New Address', buttons: ['OK', 'Cancel', 'Apply'],
      fields: [
        { l: 'Address', v: '192.168.88.1/24' },
        { l: 'Network', v: '192.168.88.0', ro: true },
        { l: 'Interface', v: 'bridge-lan', type: 'select' },
        { l: 'Comment', v: 'LAN' }
      ]
    }
  };

  var NEW_ROUTE = {
    path: 'IP → Routes → New', win: 'New Route', noTools: true,
    form: {
      title: 'New Route', buttons: ['OK', 'Cancel', 'Apply'],
      fields: [
        { l: 'Dst. Address', v: '0.0.0.0/0' },
        { l: 'Gateway', v: '203.0.113.1' },
        { l: 'Distance', v: '1' },
        { l: 'Check Gateway', v: 'ping', type: 'select' },
        { l: 'Pref. Source', v: '203.0.113.20' }
      ]
    }
  };

  var NETWATCH_NEW = {
    path: 'Tools → Netwatch', win: 'Netwatch', noTools: true,
    form: {
      title: 'New Netwatch Entry', buttons: ['OK', 'Cancel', 'Apply'],
      fields: [
        { l: 'Host', v: '8.8.8.8' },
        { l: 'Interval', v: '00:00:10' },
        { l: 'Timeout', v: '1s', type: 'select' },
        { l: 'Type', v: 'simple', type: 'select' },
        { l: 'Down', v: '/system script run failover-down' },
        { l: 'Up', v: '/system script run failover-up' }
      ]
    }
  };

  /* ---------------- 1. Старт и база ---------------- */

  add('start-base-setup', [
    {
      path: 'Interfaces → Interface', win: 'Interface List', tabs: ['Interface', 'Ethernet', 'VLAN', 'Bridge'],
      tab: 'Interface', noTools: true,
      cols: [{ t: 'Name', w: 90 }, { t: 'Type', w: 90 }, { t: 'L2 MTU', w: 70 }, { t: 'RX', w: 70 }, { t: 'TX', w: 70 }],
      rows: [
        [{ v: 'WAN' }, { v: 'ether' }, { v: '1500' }, { v: '1.2 Gbps' }, { v: '210 Mbps' }],
        [{ v: 'LAN1' }, { v: 'ether' }, { v: '1500' }, { v: '340 Mbps' }, { v: '890 Mbps' }],
        [{ v: 'LAN2' }, { v: 'ether' }, { v: '1500' }, { v: '0 bps' }, { v: '0 bps' }]
      ],
      sel: 0
    },
    {
      path: 'Bridge → Bridge', win: 'Bridge', tabs: ['Bridge', 'Ports', 'VLANs', 'Hosts'], tab: 'Bridge', noTools: true,
      cols: [{ t: 'Name', w: 100 }, { t: 'Protocol Mode', w: 110 }, { t: 'VLAN Filtering', w: 110 }, { t: 'STP', w: 90 }],
      rows: [[{ v: 'bridge-lan' }, { v: '802.1Q' }, { v: 'no' }, { v: 'rstp' }]],
      sel: 0
    },
    {
      path: 'IP → DHCP Client', win: 'DHCP Client', noTools: true,
      cols: [{ t: 'Interface', w: 90 }, { t: 'Address', w: 150 }, { t: 'Status', w: 110 }, { t: 'Add Default Route', w: 120 }],
      rows: [[{ v: 'WAN' }, { v: '203.0.113.20/24' }, { v: 'bound' }, { v: 'yes' }]],
      sel: 0
    },
    DHCP_SETUP,
    {
      path: 'IP → DNS', win: 'DNS Settings', noTools: true,
      form: {
        title: 'DNS Settings', buttons: ['OK', 'Cancel', 'Apply'],
        fields: [
          { l: 'Servers', v: '1.1.1.1, 8.8.8.8' },
          { l: 'Allow Remote Requests', v: '', type: 'check' },
          { l: 'Max UDP Packet Size', v: '4096' },
          { l: 'Cache Size', v: '2048 KiB' }
        ]
      }
    },
    NAT_NEW,
    FILES
  ], { 0: 0, 1: 1, 2: 2, 4: 3, 5: 4, 7: 5, 8: 6 });

  add('start-first-login', [
    {
      path: 'Winbox 4 → Connect', win: 'Winbox 4', noTools: true,
      form: {
        title: 'Connect to Router', buttons: ['Connect', 'Cancel'],
        fields: [
          { l: 'Connect To', v: '00:0C:42:1A:2B:3C' },
          { l: 'Login', v: 'admin' },
          { l: 'Password', v: '' },
          { l: 'Secure Mode', v: '', type: 'check' }
        ],
        note: 'MAC-адрес подставляется кликом по строке в Neighbors'
      }
    },
    SERVICES,
    FILES
  ], { 0: 0, 5: 1, 6: 2 });

  /* ---------------- 2. IP ---------------- */

  add('ip-dhcp-server', [
    DHCP_SETUP,
    {
      path: 'IP → DHCP Server → Leases', win: 'DHCP Leases', noTools: true,
      cols: [{ t: 'Address', w: 130 }, { t: 'MAC Address', w: 140 }, { t: 'Host Name', w: 120 }, { t: 'Status', w: 90 }],
      rows: [
        [{ v: '192.168.88.10' }, { v: 'D4:3A:2C:11:01:AA' }, { v: 'nas' }, { v: 'bound' }],
        [{ v: '192.168.88.11' }, { v: '9C:B6:54:7A:22:1B' }, { v: 'printer' }, { v: 'bound' }]
      ],
      sel: 0
    },
    {
      path: 'IP → DHCP Server → Options', win: 'DHCP Options', noTools: true,
      cols: [{ t: 'Name', w: 120 }, { t: 'Code', w: 70 }, { t: 'Value', w: 220 }],
      rows: [
        [{ v: 'ntp' }, { v: '42' }, { v: '192.168.88.1' }],
        [{ v: 'pxe-boot' }, { v: '66' }, { v: '192.168.88.10' }]
      ],
      sel: 0
    }
  ], { 0: 0, 2: 0, 4: 1, 5: 2 });

  add('ip-dns', [
    {
      path: 'IP → DNS → Static', win: 'DNS Static', tabs: ['DNS', 'Cache', 'Static'], tab: 'Static', noTools: true,
      cols: [{ t: 'Name', w: 160 }, { t: 'Type', w: 80 }, { t: 'Address', w: 140 }, { t: 'TTL', w: 80 }],
      rows: [
        [{ v: 'nas.lan' }, { v: 'A' }, { v: '192.168.88.10' }, { v: '1h' }],
        [{ v: 'printer.lan' }, { v: 'A' }, { v: '192.168.88.11' }, { v: '1h' }]
      ],
      sel: 0
    },
    NEW_ROUTE
  ], { 2: 0 });

  add('ip-address', [NEW_ADDRESS], { 0: 0, 1: 0 });
  add('ip-routes', [NEW_ROUTE, NETWATCH_NEW], { 0: 0, 4: 1 });
  add('ip-services', [SERVICES], { 0: 0 });

  /* ---------------- 3. System ---------------- */

  add('sys-users', [
    {
      path: 'System → Users → New', win: 'New User', noTools: true,
      form: {
        title: 'New User', buttons: ['OK', 'Cancel', 'Apply'],
        fields: [
          { l: 'Name', v: 'admin2' },
          { l: 'Group', v: 'full', type: 'select' },
          { l: 'Password', v: '••••••••••••' },
          { l: 'Confirm Password', v: '••••••••••••' },
          { l: 'Allowed Address', v: '192.168.88.0/24' }
        ]
      }
    },
    SERVICES
  ], { 1: 0 });

  add('sys-scheduler', [
    {
      path: 'System → Scheduler → New', win: 'New Scheduler', noTools: true,
      form: {
        title: 'New Scheduler', buttons: ['OK', 'Cancel', 'Apply'],
        fields: [
          { l: 'Name', v: 'daily-export' },
          { l: 'Start Time', v: '03:30:00' },
          { l: 'Interval', v: '1d' },
          { l: 'On Event', v: '/system script run export-daily' },
          { l: 'Policy', v: 'read, write, ftp', type: 'select' }
        ]
      }
    }
  ], { 1: 0, 2: 0 });

  /* ---------------- 4. WiFi, MPLS, Routing ---------------- */

  add('wifi-interface', [
    {
      path: 'WiFi → WiFi → New', win: 'New WiFi Interface', noTools: true,
      form: {
        title: 'New WiFi Interface', buttons: ['OK', 'Cancel', 'Apply'],
        fields: [
          { l: 'Name', v: 'wifi-office' },
          { l: 'Master Interface', v: 'wifi1', type: 'select' },
          { l: 'SSID', v: 'Office' },
          { l: 'Security', v: 'sec-office', type: 'select' },
          { l: 'Channel Width', v: '20/40/80mhz', type: 'select' }
        ]
      }
    }
  ], { 1: 0, 2: 0 });

  add('mpls-basics', [
    {
      path: 'MPLS → MPLS', win: 'MPLS', noTools: true,
      form: {
        title: 'MPLS Settings', buttons: ['OK', 'Cancel', 'Apply'],
        fields: [
          { l: 'Enabled', v: '', type: 'check' },
          { l: 'LSR ID', v: '10.0.0.1' },
          { l: 'Dynamic Label Range', v: '16-1048575' },
          { l: 'Propagate TTL', v: '', type: 'check' }
        ]
      }
    },
    NEW_ROUTE
  ], { 0: 0, 1: 1 });

  add('rt-bgp', [
    {
      path: 'Routing → BGP → Connections → New', win: 'New BGP Connection', noTools: true,
      form: {
        title: 'New BGP Connection', buttons: ['OK', 'Cancel', 'Apply'],
        fields: [
          { l: 'Name', v: 'to-isp1' },
          { l: 'Remote Address', v: '203.0.113.1' },
          { l: 'Remote AS', v: '64500' },
          { l: 'Local Role', v: 'ebgp', type: 'select' },
          { l: 'Update Source', v: '203.0.113.20' }
        ]
      }
    }
  ], { 2: 0, 3: 0 });

  /* ---------------- 5. Задачи PROD ---------------- */

  add('task-port-forward', [
    {
      path: 'IP → Firewall → NAT → New', win: 'New NAT Rule', tabs: ['General', 'Advanced', 'Extra', 'Action'],
      tab: 'General', noTools: true,
      form: {
        title: 'New NAT Rule', buttons: ['OK', 'Cancel', 'Apply'],
        fields: [
          { l: 'Chain', v: 'dstnat', type: 'select' },
          { l: 'Protocol', v: 'tcp', type: 'select' },
          { l: 'Dst. Port', v: '8080' },
          { l: 'In. Interface List', v: 'WAN', type: 'select' }
        ],
        note: 'Вкладка Action: action=dst-nat, To Addresses=192.168.88.50, To Ports=80'
      }
    },
    {
      path: 'IP → Firewall → NAT → Action', win: 'New NAT Rule', tabs: ['General', 'Action'], tab: 'Action', noTools: true,
      form: {
        title: 'Action', buttons: ['OK', 'Cancel', 'Apply'],
        fields: [
          { l: 'Action', v: 'dst-nat', type: 'select' },
          { l: 'To Addresses', v: '192.168.88.50' },
          { l: 'To Ports', v: '80' }
        ]
      }
    }
  ], { 0: 0, 1: 0, 2: 1 });

  add('task-failover', [NETWATCH_NEW, NEW_ROUTE], { 1: 0, 2: 1 });

  add('q-simple', [
    {
      path: 'Queues → Simple Queues → New', win: 'New Simple Queue', noTools: true,
      form: {
        title: 'New Simple Queue', buttons: ['OK', 'Cancel', 'Apply'],
        fields: [
          { l: 'Name', v: 'guest-limit' },
          { l: 'Target', v: '192.168.20.0/24' },
          { l: 'Max Limit (upload)', v: '10M' },
          { l: 'Max Limit (download)', v: '30M' },
          { l: 'Burst Limit', v: '40M' }
        ]
      }
    }
  ], { 1: 0 });

  add('vpn-wireguard', [
    {
      path: 'Interfaces → WireGuard → Peers → New', win: 'New WireGuard Peer', noTools: true,
      form: {
        title: 'New WireGuard Peer', buttons: ['OK', 'Cancel', 'Apply'],
        fields: [
          { l: 'Interface', v: 'wg0', type: 'select' },
          { l: 'Public Key', v: 'pQ8k…Xr2A=' },
          { l: 'Allowed Address', v: '10.10.10.2/32, 192.168.50.0/24' },
          { l: 'Endpoint', v: '198.51.100.7:51820' },
          { l: 'Persistent Keepalive', v: '25s' }
        ]
      }
    }
  ], { 2: 0 });

  add('task-office-from-scratch', [
    {
      term: true, win: 'New Terminal', path: 'New Terminal',
      lines: [
        { k: 'pr', t: '[admin@office-gw] > /ip address print' },
        { k: 'out', t: 'Flags: D - DYNAMIC; I - INVALID' },
        { k: 'out', t: ' #   ADDRESS            NETWORK         INTERFACE' },
        { k: 'out', t: ' 0   192.168.10.1/24   192.168.10.0    bridge-lan' },
        { k: 'out', t: ' 1   203.0.113.20/24    203.0.113.0     ether1' },
        { k: 'pr', t: '[admin@office-gw] > /ping 8.8.8.8 count=4' },
        { k: 'out', t: '  sent=4 received=4 packet-loss=0% min-rtt=11ms avg-rtt=12ms max-rtt=14ms' }
      ]
    },
    FILES
  ], { 3: 0, 4: 1 });

  add('task-snmp-zabbix', [NETWATCH_NEW], { 4: 0 });
})();
