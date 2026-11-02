/* Разделы: PPP, VPN (WireGuard/IPsec/туннели), WiFi и CAPsMAN */
window.DATA = window.DATA || [];

window.DATA.push({
  id: 'ppp', name: 'PPP (PPPoE, L2TP, SSTP)', ic: 'svc',
  items: [
    {
      id: 'ppp-profiles', t: 'PPP → Profiles', lvl: 2,
      path: 'PPP → Profiles', tags: ['profile', 'pppoe', 'vpn'],
      purpose: 'Профиль PPP — шаблон параметров для подключающихся клиентов: адрес локальной стороны, пул адресов клиентам, DNS, скорость, разрешённые протоколы и время сессии.',
      usage: [
        'Профили для PPPoE-клиентов провайдера: разные тарифы и пулы.',
        'Профиль для L2TP/IPsec удалённых сотрудников.',
        'Ограничение скорости через rate-limit на профиле.'
      ],
      steps: [
        { t: 'Создайте профиль', d: 'PPP → Profiles → `+`: Name=`pppoe-clients`, Local Address=`10.255.0.1`, Remote Address=`pool-pppoe`, DNS Server=`1.1.1.1,8.8.8.8`.' },
        { t: 'Rate limit', d: 'Поле Rate Limit: `10M/10M` (upload/download для клиента). Для тарифов удобно делать отдельные профили.' },
        { t: 'Протоколы', d: 'Вкладка Protocols: используйте Use Compression=no, Change TCP MSS=yes (важно для PPPoE).' },
        { t: 'Лимиты сессий', d: 'Only One=yes — один логин = одна сессия; Session Timeout=0 (без ограничения).' },
        { t: 'Примените', d: 'В PPPoE Server и в Secrets укажите Profile=`pppoe-clients`.' }
      ],
      scenes: [{
        path: 'PPP → Profiles', win: 'PPP Profiles', tabs: ['General', 'Limits', 'Protocols', 'Queue'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 130 }, { t: 'Local Address', w: 120 }, { t: 'Remote Address', w: 120 }, { t: 'Rate Limit', w: 100 }, { t: 'DNS Server', w: 140 }],
        rows: [[{ v: 'pppoe-clients', m: 2 }, { v: '10.255.0.1', m: 3 }, { v: 'pool-pppoe' }, '10M/10M', '1.1.1.1']],
        sel: 0,
        notes: ['Кнопка создания профиля', 'Адрес роутера в PPP-сессии', 'Пул адресов, выдаваемых клиентам']
      }],
      check: [{ d: 'терминал', c: '/ppp profile print detail\n/ppp profile print where name="pppoe-clients"' }]
    },
    {
      id: 'ppp-secrets', t: 'PPP → Secrets — учётные записи', lvl: 2,
      path: 'PPP → Secrets', tags: ['логин', 'pppoe', 'vpn'],
      purpose: 'Secrets — список логинов и паролей для PPP-подключений (PPPoE, L2TP, PPTP, SSTP, OVPN). Каждой записи назначается профиль и, при необходимости, статический адрес.',
      usage: [
        'Учётные записи PPPoE-клиентов провайдера.',
        'Логины для сотрудников на L2TP/IPsec VPN.',
        'Статический адрес для конкретного клиента (Remote Address в secret).'
      ],
      steps: [
        { t: 'Создайте запись', d: 'PPP → Secrets → `+`: Name=`client01`, Password=..., Service=`pppoe` (или l2tp/any), Profile=`pppoe-clients`.' },
        { t: 'Статический адрес', d: 'Поле Remote Address = `10.255.0.55` — клиент всегда будет получать этот адрес.' },
        { t: 'Ограничения', d: 'Вкладка Limits: Rate Limit, Only One, а также Caller ID (разрешить только с определённого MAC).' },
        { t: 'Проверка', d: 'Вкладка Connections/Active: клиент появится после подключения.' },
        { t: 'Экспорт для биллинга', d: 'Список можно генерировать скриптом или из RADIUS.' }
      ],
      scenes: [{
        path: 'PPP → Secrets', win: 'PPP Secrets', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }, { t: '⌕' }],
        cols: [{ t: 'Name', w: 110 }, { t: 'Password', w: 90 }, { t: 'Service', w: 84 }, { t: 'Profile', w: 118 }, { t: 'Remote Address', w: 118 }, { t: 'Disabled', w: 70 }],
        rows: [
          [{ v: 'client01', m: 2 }, '••••••••', { v: 'pppoe', m: 3 }, 'pppoe-clients', '10.255.0.55', 'false'],
          ['vpn.ivanov', '••••••••', 'l2tp', 'vpn-staff', '10.99.0.21', 'false']
        ],
        sel: 0,
        notes: ['Кнопка добавления учётной записи', 'Логин, который вводит клиент', 'Сервис, для которого действует запись']
      }],
      check: [{ d: 'терминал', c: '/ppp secret print detail\n/ppp active print' }]
    },
    {
      id: 'ppp-pppoe-server', t: 'PPP → PPPoE Server', lvl: 2,
      path: 'PPP → PPPoE Server (Interface → PPPoE Server)', tags: ['pppoe', 'сервер', 'провайдер'],
      purpose: 'PPPoE-сервер принимает подключения клиентов по PPPoE. Используется для организации доступа в интернет в локальной сети (микро-провайдер, общежитие, офисный центр).',
      usage: [
        'Раздача интернета абонентам по логину/паролю.',
        'Авторизация устройств в сети без 802.1X.',
        'Тарификация и ограничение скорости через профили.'
      ],
      steps: [
        { t: 'Подготовьте интерфейс', d: 'Интерфейс, в который приходят клиенты, должен быть в мосту или отдельным портом. Создайте профиль и пул.' },
        { t: 'Включите сервер', d: 'PPP → PPPoE Server → `+`: Service Name=`isp`, Interface=bridge-clients, Default Profile=`pppoe-clients`, Authentication=pap,chap,mschap2.' },
        { t: 'One session per host', d: 'Включите, чтобы клиент не поднимал десятки сессий.' },
        { t: 'Пользователи', d: 'PPP → Secrets: добавьте логины клиентов с нужным профилем.' },
        { t: 'MTU/MRU', d: 'Max MTU=1480, Max MRU=1480 — иначе возможны проблемы с фрагментацией.' },
        { t: 'Проверка', d: 'PPP → Active Connections: клиент в статусе «connected», трафик растёт.' }
      ],
      scenes: [{
        path: 'PPP → PPPoE Server', win: 'PPPoE Server', tabs: ['PPPoE Server'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Service Name', w: 120 }, { t: 'Interface', w: 130 }, { t: 'Default Profile', w: 130 }, { t: 'Authentication', w: 160 }, { t: 'Max MTU', w: 78 }],
        rows: [[{ v: 'isp', m: 2 }, { v: 'bridge-clients', m: 3 }, 'pppoe-clients', 'pap,chap,mschap2', '1480']],
        sel: 0,
        notes: ['Кнопка добавления PPPoE-сервера', 'Имя сервиса — клиент может его запрашивать', 'Интерфейс, куда приходят клиенты']
      }],
      check: [{ d: 'терминал', c: '/interface pppoe-server server print\n/ppp active print\n/log print where topics~"pppoe"' }]
    },
    {
      id: 'ppp-l2tp-server', t: 'PPP → L2TP Server (+IPsec)', lvl: 3,
      path: 'PPP → L2TP Server', tags: ['l2tp', 'vpn', 'ipsec'],
      purpose: 'L2TP-сервер принимает VPN-подключения от сотрудников и филиалов. В связке с IPsec (L2TP/IPsec) трафик шифруется, а авторизация идёт по PPP-логину.',
      usage: [
        'Удалённые сотрудники подключаются к офисной сети с ноутбука.',
        'Резервный канал до филиала через интернет.',
        'Доступ к внутренним сервисам без публикации портов.'
      ],
      steps: [
        { t: 'Создайте профиль и секрет', d: 'PPP → Profiles: `vpn-staff` (Local Address=10.99.0.1, Remote Address=pool-vpn, DNS=10.10.10.10). PPP → Secrets: логины сотрудников, Service=l2tp.' },
        { t: 'Включите сервер', d: 'PPP → L2TP Server → кнопка L2TP Server: Enabled=yes, Default Profile=`vpn-staff`, Use IPsec=yes, IPsec Secret=`длинный_ключ`, Authentication=mschap2.' },
        { t: 'Разрешите порты', d: 'Firewall input: udp 500, udp 4500 и (если без NAT-T) esp — от адресов клиентов.' },
        { t: 'Проверьте IPsec', d: 'IP → IPsec → Active Peers: должны появиться пиры; PPP → Active Connections — сессии.' },
        { t: 'Маршруты', d: 'Клиентам нужен маршрут в LAN: либо push через профиль (Remote Address в той же подсети), либо NAT для VPN-пула.' },
        { t: 'NAT для VPN', d: 'Если VPN-клиенты должны выходить в интернет через офис: masquerade out-interface=WAN, in-interface=<l2tp-интерфейс/пул>.' }
      ],
      scenes: [
        {
          path: 'PPP → L2TP Server', win: 'L2TP Server', noTools: true,
          form: {
            title: 'L2TP Server', buttons: ['Apply', 'Cancel'],
            fields: [
              { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
              { l: 'Default Profile', v: 'vpn-staff', type: 'select', m: 2 },
              { l: 'Use IPsec', v: 'yes', type: 'select', m: 3 },
              { l: 'IPsec Secret', v: '••••••••••••', m: 4 },
              { l: 'Authentication', v: 'mschap2', type: 'select' },
              { l: 'Keepalive Timeout', v: '30' },
              { l: 'Max MTU / MRU', v: '1450 / 1450' }
            ]
          },
          notes: ['Включение L2TP-сервера', 'Профиль, который получают подключившиеся', 'Шифрование через IPsec', 'Общий ключ IPsec — сообщается клиентам отдельно от пароля']
        },
        {
          path: 'IP → IPsec → Active Peers', win: 'IPsec Active Peers', tools: [{ t: '−', id: 'kill', m: 1 }],
          cols: [{ t: 'Remote Address', w: 140 }, { t: 'State', w: 92 }, { t: 'Uptime', w: 100 }, { t: 'Side', w: 70 }, { t: 'Enc. Algorithm', w: 150 }],
          rows: [[{ v: '203.0.113.77', m: 2 }, { v: 'established', c: 'ok' }, '01:22:14', 'responder', 'aes-256-cbc/sha256']],
          sel: 0,
          notes: ['Кнопка разрыва сессии (полезно при зависшем подключении)', 'Адрес клиента']
        }
      ],
      check: [{
        d: 'терминал',
        c: '/interface l2tp-server server print\n/ppp active print\n/ip ipsec active-peers print\n/log print where topics~"ipsec,l2tp"'
      }],
      warn: 'Ключ IPsec — не пароль пользователя: он одинаков для всех и передаётся клиенту отдельно. Слабый ключ = уязвимость.'
    }
  ]
});

window.DATA.push({
  id: 'vpn', name: 'VPN и туннели', ic: 'svc',
  items: [
    {
      id: 'vpn-wireguard', t: 'WireGuard — современный VPN', lvl: 2,
      path: 'Interface → WireGuard · IP → Address', tags: ['wireguard', 'vpn', 'site-to-site'],
      purpose: 'WireGuard — быстрый и простой VPN на UDP. В RouterOS 7 он встроен: создаётся интерфейс с приватным ключом, пиры обмениваются публичными ключами и allowed-address.',
      usage: [
        'Site-to-site между офисом и филиалом (роутер ↔ роутер).',
        'Удалённый доступ сотрудников (клиент ↔ роутер).',
        'Резервный канал через LTE для основного линка.'
      ],
      steps: [
        { t: 'Создайте интерфейс', d: 'Interface → WireGuard → `+`: Name=`wg0`, Listen Port=13231. Приватный ключ сгенерируется автоматически — скопируйте публичный.' },
        { t: 'Назначьте адрес', d: 'IP → Address → `+`: `10.10.10.1/24`, Interface=wg0.' },
        { t: 'Добавьте пир', d: 'WireGuard → вкладка Peers → `+`: Interface=wg0, Public Key=<ключ клиента>, Allowed Address=`10.10.10.2/32`, Endpoint=`203.0.113.77:13231`, Persistent Keepalive=25s.' },
        { t: 'Откройте порт', d: 'Firewall input: accept udp dst-port=13231 (лучше — только с известных адресов).' },
        { t: 'Маршруты', d: 'IP → Routes: в сеть филиала через wg0; либо Allowed Address на пире задаёт маршрут автоматически.' },
        { t: 'Firewall между сетями', d: 'Разрешите forward между LAN и wg0 только для нужных адресов.' },
        { t: 'Проверка', d: 'WireGuard → Peers: Latest Handshake обновляется, Transfer растёт.' }
      ],
      scenes: [
        {
          path: 'Interface → WireGuard', win: 'WireGuard', tabs: ['WireGuard', 'Peers', 'Private Keys'],
          tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
          cols: [{ t: 'Name', w: 90 }, { t: 'Listen Port', w: 88 }, { t: 'Public Key', w: 260 }, { t: 'MTU', w: 60 }],
          rows: [[{ v: 'wg0', m: 2 }, { v: '13231', m: 3 }, 'q3Jd…8vTk=', '1420']],
          sel: 0,
          notes: ['Кнопка создания WireGuard-интерфейса', 'Имя интерфейса для адресов и маршрутов', 'UDP-порт, который должен быть открыт в firewall']
        },
        {
          path: 'Interface → WireGuard → Peers', win: 'WireGuard Peers', tools: [{ t: '+', id: 'add', m: 1 }],
          cols: [{ t: 'Interface', w: 84 }, { t: 'Public Key', w: 220 }, { t: 'Allowed Address', w: 150 }, { t: 'Endpoint', w: 150 }, { t: 'Handshake', w: 84 }],
          rows: [[{ v: 'wg0' }, { v: 'x7Lm…2QpE=', m: 2 }, { v: '10.10.10.2/32', m: 3 }, '203.0.113.77:13231', { v: '12s ago', c: 'ok' }]],
          sel: 0,
          notes: ['Кнопка добавления пира', 'Публичный ключ второй стороны', 'Адрес пира внутри туннеля (и/или его подсеть)']
        }
      ],
      check: [{
        d: 'терминал',
        c: '/interface wireguard print\n/interface wireguard peers print detail\n/ip route print where interface~"wg"'
      }],
      warn: 'Allowed Address определяет и маршрут, и фильтр: указывайте только реальные подсети пира, иначе получите неожиданную маршрутизацию.'
    },
    {
      id: 'vpn-ipsec-ikev2', t: 'IPsec IKEv2 (road-warrior)', lvl: 3,
      path: 'IP → IPsec', tags: ['ipsec', 'ikev2', 'vpn'],
      purpose: 'IPsec — стандартный VPN на уровне IP. Для удалённых сотрудников используется IKEv2 с mode-config: клиент получает внутренний адрес и маршруты, шифрование работает на уровне ядра.',
      usage: [
        'Корпоративный VPN для Windows/macOS/iOS/Android (встроенные клиенты).',
        'Site-to-site соединение с оборудованием, где нет WireGuard.',
        'Защищённый канал между офисами через недоверенный интернет.'
      ],
      steps: [
        { t: 'Профиль', d: 'IP → IPsec → Profiles → `+`: Name=`ike2-rw`, Hash Algorithm=sha256, Encryption=aes-256-cbc/aes-256-gcm, DH Group=modp2048/ecp256.' },
        { t: 'Mode Config', d: 'IP → IPsec → Mode Configs → `+`: Name=`rw-cfg`, Address Pool=`pool-vpn`, Address Prefix Length=32, Split Include=`192.168.88.0/24`.' },
        { t: 'Peer', d: 'IP → IPsec → Peers → `+`: Name=`ike2-rw`, Address=0.0.0.0/0, Exchange Mode=ike2, Passive=yes, Send Initial Contact=yes.' },
        { t: 'Identity', d: 'IP → IPsec → Identities → `+`: Peer=ike2-rw, Auth Method=mschap2 (или rsa-signature), Mode Config=rw-cfg, Secret=...' },
        { t: 'Policy (template)', d: 'IP → IPsec → Policies → `+`: Template=yes, Group=default, Src=0.0.0.0/0, Dst=`192.168.88.0/24`, Action=encrypt, Level=require.' },
        { t: 'Пользователи', d: 'IP → IPsec → Users → `+`: Name=`ivanov`, Password=...' },
        { t: 'Firewall', d: 'input: udp 500, udp 4500 (500 нужен только для IKE), плюс accept esp.' },
        { t: 'Проверка', d: 'IP → IPsec → Active Peers и Installed SAs: фаза 1 и фаза 2 установлены.' }
      ],
      scenes: [{
        path: 'IP → IPsec → Peers', win: 'IPsec Peers', tabs: ['Peers', 'Identities', 'Policies', 'Active Peers'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 110 }, { t: 'Address', w: 120 }, { t: 'Exchange Mode', w: 110 }, { t: 'Passive', w: 70 }, { t: 'Profile', w: 110 }, { t: 'Send Initial Contact', w: 130 }],
        rows: [[{ v: 'ike2-rw', m: 2 }, { v: '0.0.0.0/0' }, { v: 'ike2', m: 3 }, { v: 'yes', m: 4 }, 'ike2-rw', 'yes']],
        sel: 0,
        notes: ['Кнопка создания пира', 'Имя пира для идентификации', 'IKEv2 — современный режим (IKEv1 только для совместимости)', 'Passive: роутер ждёт подключений, а не инициирует']
      }],
      check: [{
        d: 'терминал',
        c: '/ip ipsec active-peers print\n/ip ipsec installed-sa print count-only\n/ip ipsec identity print\n/log print where topics~"ipsec"'
      }],
      warn: 'Для работы за NAT нужны udp 500 и udp 4500. Проверьте, что провайдер не блокирует IPsec.'
    },
    {
      id: 'vpn-tunnels', t: 'EoIP, GRE и IPIP — L2/L3-туннели', lvl: 3,
      path: 'Interface → EoIP / GRE Tunnel / IPIP Tunnel', tags: ['eoip', 'gre', 'туннель'],
      purpose: 'Туннели инкапсулируют трафик между двумя точками. EoIP передаёт Ethernet-кадры (L2 — можно bridgевать два офиса), GRE/IPIP — IP-пакеты (L3). Шифрования нет, только инкапсуляция.',
      usage: [
        'Объединение двух офисов в один L2-сегмент (EoIP + bridge).',
        'Передача multicast/широковещательного трафика между площадками.',
        'Транспорт для OSPF/BGP между филиалами (GRE).'
      ],
      steps: [
        { t: 'Подготовьте транспорт', d: 'Между точками должен быть IP-маршрут (интернет, VPN). Для EoIP нужны публичные/маршрутизируемые адреса или WireGuard под ним.' },
        { t: 'Создайте туннель', d: 'Interface → EoIP → `+`: Name=`eoip-branch`, Remote Address=`203.0.113.20`, Tunnel ID=1, Local Address=`203.0.113.10`.' },
        { t: 'MTU', d: 'MTU=1400 (или ниже), Clamp TCP MSS=yes — иначе часть сайтов и сервисов не откроется.' },
        { t: 'Bridge (для EoIP)', d: 'Bridge → Ports: добавьте eoip-branch в bridge-lan — две площадки станут одной сетью. Осторожно: возможен broadcast-шторм.' },
        { t: 'Firewall', d: 'Разрешите протокол 47 (GRE) и IP-протокол 97 (EoIP) только с адреса второй площадки.' },
        { t: 'Безопасность', d: 'Туннели без шифрования — стройте их поверх WireGuard/IPsec.' }
      ],
      scenes: [{
        path: 'Interface → EoIP Tunnel', win: 'EoIP Tunnel', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Name', w: 110 }, { t: 'Remote Address', w: 140 }, { t: 'Tunnel ID', w: 80 }, { t: 'Local Address', w: 140 }, { t: 'MTU', w: 60 }, { t: 'Keepalive', w: 80 }],
        rows: [[{ v: 'eoip-branch', m: 2 }, { v: '203.0.113.20', m: 3 }, { v: '1', m: 4 }, '203.0.113.10', '1400', '10s']],
        sel: 0,
        notes: ['Кнопка создания туннеля', 'Имя локального интерфейса туннеля', 'Публичный адрес второй площадки', 'Tunnel ID должен совпадать на обеих сторонах']
      }],
      check: [{ d: 'терминал', c: '/interface eoip print\n/interface bridge port print where interface~"eoip"' }],
      danger: 'Объединение двух офисов в один L2-домен через EoIP без STP-защиты может вызвать шторм и положить обе сети. Включайте RSTP и BPDU Guard.'
    },
    {
      id: 'vpn-zerotier', t: 'ZeroTier (SD-WAN туннель)', lvl: 3,
      path: 'ZeroTier → ZeroTier', tags: ['zerotier', 'sdwan', 'vpn'],
      purpose: 'ZeroTier создаёт оверлейную сеть L2 поверх интернета без публичных адресов и настройки IPsec. В RouterOS 7 поддерживается с версии 7.11.',
      usage: [
        'Быстрое объединение устройств за NAT (нет публичных IP).',
        'Резервный канал для управления роутерами на объектах.',
        'Подключение к устройствам без возможности проброса портов.'
      ],
      steps: [
        { t: 'Получите Network ID', d: 'На my.zerotier.com создайте сеть и скопируйте её ID.' },
        { t: 'Создайте интерфейс', d: 'ZeroTier → ZeroTier → `+`: Name=`zt1`, Network ID=`8056c2e21c...`, Disabled=no.' },
        { t: 'Авторизуйте узел', d: 'В веб-панели ZeroTier отметьте узел как Authorized — он получит адрес.' },
        { t: 'Адрес и маршруты', d: 'IP → Address появится адрес ZeroTier-сети; при необходимости добавьте маршруты через zt1.' },
        { t: 'Firewall', d: 'Разрешите forward между LAN и zt1 для нужных подсетей.' }
      ],
      scenes: [{
        path: 'ZeroTier → ZeroTier', win: 'ZeroTier', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Name', w: 96 }, { t: 'Network ID', w: 190 }, { t: 'Status', w: 110 }, { t: 'Node ID', w: 160 }, { t: 'Disabled', w: 70 }],
        rows: [[{ v: 'zt1', m: 2 }, { v: '8056c2e21c1a2b3c', m: 3 }, { v: 'OK', c: 'ok' }, 'a1b2c3d4e5', 'false']],
        sel: 0,
        notes: ['Кнопка добавления ZeroTier-интерфейса', 'ID сети из панели ZeroTier', 'Статус подключения узла']
      }],
      check: [{ d: 'терминал', c: '/zerotier print\n/zerotier peer print\n/ip address print where interface~"zt"' }]
    }
  ]
});

window.DATA.push({
  id: 'wifi', name: 'WiFi и CAPsMAN', ic: 'iface',
  items: [
    {
      id: 'wifi-interface', t: 'WiFi → WiFi — точки доступа', lvl: 2,
      path: 'WiFi → WiFi', tags: ['wifi', 'ssid', 'точка доступа'],
      purpose: 'Создание беспроводных интерфейсов в RouterOS 7 (пакет wifi/wifi-qcom). Каждая точка доступа описывается параметрами: master-radio, SSID, security, datapath, канал.',
      usage: [
        'Домашняя или офисная Wi-Fi сеть на роутере с радио.',
        'Несколько SSID на одном радио (гостевая, корпоративная, IoT).',
        'Точка доступа с ограничением скорости и VLAN (через datapath).'
      ],
      steps: [
        { t: 'Проверьте пакет', d: 'System → Packages: должен быть `wifi` (или `wifi-qcom`, `wifi-qcom-ac`). В разделе появится WiFi.' },
        { t: 'Создайте интерфейс', d: 'WiFi → WiFi → `+`: Master Interface=`radio1` (5GHz) или radio2, SSID=`Office`, Security=`sec-office`.' },
        { t: 'Включите и добавьте в мост', d: 'Disabled=no; Bridge → Ports: interface=`wifi1`, bridge=bridge-lan.' },
        { t: 'Канал', d: 'Вкладка Channel: Band=5ghz-ax/ac, Width=20/40/80MHz, Frequency=auto (или фиксированный скан).' },
        { t: 'Datapath', d: 'Вкладка Datapath: Bridge=bridge-lan, VLAN ID при необходимости, Local Forwarding=yes для offload.' },
        { t: 'Скрытая ли гостевая сеть', d: 'Отдельный SSID + VLAN в datapath, firewall запрещает доступ в LAN.' }
      ],
      scenes: [{
        path: 'WiFi → WiFi', win: 'WiFi Interfaces', tabs: ['WiFi', 'Security', 'Access List', 'Registration'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 90 }, { t: 'Master Interface', w: 120 }, { t: 'SSID', w: 120 }, { t: 'Security', w: 110 }, { t: 'Channel', w: 100 }, { t: 'Disabled', w: 70 }],
        rows: [
          [{ v: 'wifi1', m: 2 }, { v: 'radio1 (5GHz)', m: 3 }, { v: 'Office', m: 4 }, 'sec-office', '5180/80mhz', 'false'],
          ['wifi2', 'radio2 (2.4GHz)', 'Office', 'sec-office', '2437/20mhz', 'false'],
          ['wifi-guest', 'radio1 (5GHz)', 'Office-Guest', 'sec-guest', 'auto', 'false']
        ],
        sel: 0,
        notes: ['Кнопка создания Wi-Fi сети', 'Имя интерфейса — используется в мосту', 'Master interface — физическое радио', 'SSID, который видят клиенты']
      }],
      check: [{ d: 'терминал', c: '/interface wifi print\n/interface wifi registration-table print\n/interface wifi monitor wifi1 once' }],
      warn: 'На моделях с новым чипом (wifi-qcom) старый раздел Wireless не используется — настройка только через WiFi.'
    },
    {
      id: 'wifi-security', t: 'WiFi → Security — профили безопасности', lvl: 2,
      path: 'WiFi → Security', tags: ['wpa3', 'пароль', 'безопасность'],
      purpose: 'Профиль безопасности определяет методы аутентификации и шифрования для Wi-Fi: WPA2/WPA3, PSK или EAP, пароль, а также параметры 802.11w и гостевой изоляции.',
      usage: [
        'Единый профиль безопасности для нескольких SSID.',
        'Переход с WPA2 на WPA3 (transition mode).',
        'Отдельный профиль для корпоративной сети с RADIUS (EAP).'
      ],
      steps: [
        { t: 'Создайте профиль', d: 'WiFi → Security → `+`: Name=`sec-office`, Authentication Types=wpa2-psk, wpa3-psk.' },
        { t: 'Пароль', d: 'Passphrase: не менее 12 символов. Для WPA3 обязателен защищённый режим (PMF).' },
        { t: 'Корпоративный режим', d: 'Для EAP: Authentication Types=wpa2-eap, wpa3-eap; укажите RADIUS-сервер в профиле (или через RADIUS-раздел).' },
        { t: 'PMF', d: 'Management Protection=required для WPA3, optional для переходного режима — старые устройства могут не подключаться.' },
        { t: 'Примените', d: 'В интерфейсе WiFi укажите Security=`sec-office`.' }
      ],
      scenes: [{
        path: 'WiFi → Security', win: 'WiFi Security', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Name', w: 120 }, { t: 'Authentication Types', w: 220 }, { t: 'Passphrase', w: 120 }, { t: 'Management Protection', w: 140 }],
        rows: [[{ v: 'sec-office', m: 2 }, { v: 'wpa2-psk, wpa3-psk', m: 3 }, '••••••••••••', 'optional']],
        sel: 0,
        notes: ['Кнопка создания профиля', 'Имя профиля для ссылки из интерфейса', 'Типы аутентификации: WPA2/WPA3 + PSK']
      }],
      check: [{ d: 'терминал', c: '/interface wifi security print detail' }]
    },
    {
      id: 'wifi-accesslist', t: 'WiFi → Access List — фильтр клиентов', lvl: 2,
      path: 'WiFi → Access List', tags: ['mac-фильтр', 'доступ', 'wifi'],
      purpose: 'Список правил доступа к Wi-Fi по MAC-адресу клиента: разрешить, запретить, ограничить скорость или перенаправить на другой интерфейс.',
      usage: [
        'Белый список устройств в офисе.',
        'Блокировка «соседских» устройств.',
        'Ограничение скорости для конкретного клиента.'
      ],
      steps: [
        { t: 'Создайте правило', d: 'WiFi → Access List → `+`: Interface=`wifi1`, MAC Address=..., Action=accept (или reject).' },
        { t: 'Порядок', d: 'Правила читаются сверху вниз. Поставьте reject для «всех остальных», если нужен белый список: `+` без MAC, Action=reject.' },
        { t: 'Лимит скорости', d: 'В правиле можно указать Rate Limit для конкретного клиента.' },
        { t: 'Проверка', d: 'WiFi → Registration: устройства с reject не появятся в таблице.' }
      ],
      scenes: [{
        path: 'WiFi → Access List', win: 'WiFi Access List', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Interface', w: 100 }, { t: 'MAC Address', w: 150 }, { t: 'Action', w: 86 }, { t: 'Rate Limit', w: 100 }, { t: 'Comment', w: 150 }],
        rows: [
          [{ v: 'wifi1', m: 2 }, { v: 'D4:CA:6D:77:01:2E', m: 3 }, { v: 'accept', c: 'ok', m: 4 }, '20M/20M', 'ноутбук директора'],
          ['wifi1', '', { v: 'reject', c: 'no' }, '', 'все остальные']
        ],
        sel: 0,
        notes: ['Кнопка добавления правила', 'Интерфейс Wi-Fi', 'MAC клиента', 'accept разрешает, reject блокирует']
      }],
      check: [{ d: 'терминал', c: '/interface wifi access-list print\n/interface wifi registration-table print' }]
    },
    {
      id: 'wifi-capsman', t: 'CAPsMAN — централизованное управление Wi-Fi', lvl: 3,
      path: 'WiFi → CAPsMAN · Provisioning', tags: ['capsman', 'точки доступа', 'роуминг'],
      purpose: 'CAPsMAN управляет несколькими точками доступа из одного места: единые SSID, пароли и каналы, автоматическое применение конфигураций, быстрый роуминг 802.11r/k/v.',
      usage: [
        'Офис с 5–50 точками доступа — одна настройка для всех.',
        'Гостевая сеть с единым порталом на всей территории.',
        'Бесшовный роуминг при перемещении между этажами.'
      ],
      steps: [
        { t: 'Настройте контроллер', d: 'WiFi → CAPsMAN: Enabled=yes, Interfaces=bridge-lan (или адрес контроллера).' },
        { t: 'Создайте конфигурацию', d: 'WiFi → Configuration (`cfg-5g`): SSID, Security, Channel (Band=5ghz-ax, Width=80mhz), Datapath=Bridge=bridge-lan.' },
        { t: 'Provisioning', d: 'WiFi → Provisioning → `+`: Action=create-enabled, Master Configuration=`cfg-5g`, Supported Bands=5ghz-ax, Country=BY.' },
        { t: 'Подключите точку', d: 'На CAP-устройстве: WiFi → CAP: Enabled=yes, Discovery Interface=bridge-lan, CapsMan Address=`192.168.88.1`.' },
        { t: 'Проверка', d: 'CAPsMAN → Remote CAP: точка в статусе connected, конфигурация применена; Registration покажет клиентов.' },
        { t: 'Роуминг', d: 'В конфигурации включите 802.11r (Fast BSS Transition) и 802.11k/v для бесшовного перехода.' }
      ],
      scenes: [{
        path: 'WiFi → CAPsMAN → Remote CAP', win: 'CAPsMAN Remote CAP', tabs: ['Remote CAP', 'Provisioning', 'Configuration', 'Registration'],
        cols: [{ t: 'Identity', w: 120 }, { t: 'Address', w: 130 }, { t: 'State', w: 100 }, { t: 'Radios', w: 130 }, { t: 'Board', w: 110 }],
        rows: [
          [{ v: 'AP-1floor', m: 1 }, { v: '192.168.88.11', m: 2 }, { v: 'connected', c: 'ok' }, '2 (2.4/5GHz)', 'cAP ax'],
          ['AP-2floor', '192.168.88.12', 'connected', '2', 'cAP ax']
        ],
        sel: 0,
        notes: ['Точки доступа, подключённые к контроллеру', 'Адреса точек (получены по DHCP или статикой)']
      }],
      check: [{ d: 'терминал', c: '/interface wifi capsman print\n/interface wifi remote-cap print\n/interface wifi provisioning print' }],
      warn: 'Все точки должны быть одной «линейки» драйвера (wifi или legacy wireless) — старые CAP с новым пакетом wifi несовместимы.'
    },
    {
      id: 'wifi-legacy', t: 'Wireless (legacy) — старые модели', lvl: 2,
      path: 'Wireless → Wireless / Security Profiles', tags: ['wireless', 'legacy', '2.4ghz'],
      purpose: 'Классический раздел Wireless для моделей с драйвером legacy (hAP ac, wAP ac, RB2011 и др.). Настройка SSID, security-profiles, access-list и registration — аналогично WiFi, но другим синтаксисом.',
      usage: [
        'Обслуживание парка устройств на RouterOS 6/7 с legacy-радио.',
        'Точки доступа, не поддерживающие пакет wifi.',
        'Настройка гостевого SSID на старых моделях.'
      ],
      steps: [
        { t: 'Создайте security-profile', d: 'Wireless → Security Profiles → `+`: Name=`sp-office`, Mode=dynamic keys, Authentication Types=WPA2 PSK, WPA2 Pre-Shared Key=...' },
        { t: 'Настройте интерфейс', d: 'Wireless → Wireless → двойной клик по wlan1: Mode=ap-bridge, SSID=`Office`, Security Profile=`sp-office`, Band=2ghz-b/g/n, Channel Width=20MHz.' },
        { t: 'Country и частота', d: 'Country=`belarus`, Frequency=auto, Installation=indoor — обязательно корректный country для разрешённых каналов.' },
        { t: 'Мост', d: 'Bridge → Ports: добавьте wlan1 в bridge-lan.' },
        { t: 'Клиенты', d: 'Wireless → Registration Table: видно RSSP, Tx/Rx rate, uptime подключённых.' }
      ],
      scenes: [{
        path: 'Wireless → Wireless', win: 'Wireless Interfaces',
        cols: [{ t: 'Name', w: 84 }, { t: 'Mode', w: 100 }, { t: 'SSID', w: 110 }, { t: 'Band', w: 110 }, { t: 'Security Profile', w: 120 }, { t: 'Disabled', w: 70 }],
        rows: [[{ v: 'wlan1', m: 1 }, { v: 'ap-bridge', m: 2 }, { v: 'Office', m: 3 }, '2ghz-b/g/n', 'sp-office', 'false']],
        sel: 0,
        notes: ['Интерфейс беспроводной сети', 'Режим точки доступа — ap-bridge', 'Имя сети, которое видят клиенты']
      }],
      check: [{ d: 'терминал', c: '/interface wireless print\n/interface wireless security-profiles print\n/interface wireless registration-table print' }]
    }
  ]
});
