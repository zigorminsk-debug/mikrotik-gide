/* Разделы «IP» и «IPv6» */
window.DATA = window.DATA || [];
window.DATA.push({
  id: 'ip', name: 'IP', ic: 'ip',
  items: [
    {
      id: 'ip-address', t: 'IP → Address — адреса интерфейсов', lvl: 1,
      path: 'IP → Address', tags: ['адресация', 'шлюз'],
      purpose: 'Список IP-адресов, назначенных интерфейсам. Один интерфейс может иметь несколько адресов; адрес на мосту — это шлюз для всей LAN. Без адреса роутер не может маршрутизировать трафик этого сегмента.',
      usage: [
        'Назначение адреса шлюза локальной сети.',
        'Второй адрес на интерфейсе для перехода на новую подсеть без простоя.',
        'Публичный адрес на WAN при статическом подключении.'
      ],
      steps: [
        { t: 'Добавьте адрес', d: 'IP → Address → `+`: Address=`192.168.88.1/24`, Interface=`bridge-lan`, Network оставьте auto.' },
        { t: 'WAN со статикой', d: '`+`: Address=`203.0.113.10/24`, Interface=`WAN`. Маршрут по умолчанию: IP → Routes → `+` 0.0.0.0/0 gateway=203.0.113.1.' },
        { t: 'Второй адрес', d: 'Добавьте ещё один адрес на тот же интерфейс — оба будут активны.' },
        { t: 'Проверка', d: 'Колонка Invalid должна быть false, Actual Interface — реальный порт (для моста это bridge).' },
        { t: 'Комментарии', d: 'Поле Comment помогает отличать пулы и адреса — заполняйте его.' }
      ],
      scenes: [{
        path: 'IP → Address', win: 'Address List', tabs: ['Address'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }, { t: '⌕' }],
        cols: [{ t: 'Address', w: 160 }, { t: 'Network', w: 120 }, { t: 'Interface', w: 118 }, { t: 'Actual Interface', w: 118 }, { t: 'Invalid', w: 66 }, { t: 'Dynamic', w: 66 }],
        rows: [
          [{ v: '192.168.88.1/24', m: 2 }, '192.168.88.0', { v: 'bridge-lan', m: 3 }, 'bridge-lan', 'false', 'false'],
          ['10.10.10.1/24', '10.10.10.0', 'vlan10-office', 'bridge-lan', 'false', 'false'],
          ['203.0.113.10/24', '203.0.113.0', 'WAN', 'ether1', 'false', 'false']
        ],
        sel: 0,
        notes: ['Кнопка добавления адреса',
          'Адрес с префиксом: /24 = маска 255.255.255.0',
          'Интерфейс, на котором адрес будет активен']
      }],
      check: [{ d: 'терминал', c: '/ip address print\n/ip address print detail' }],
      mistakes: ['Адрес назначен физическому порту, который входит в bridge — работать не будет.', 'Дублирование подсети на двух интерфейсах — RouterOS пометит адрес как invalid.']
    },
    {
      id: 'ip-routes', t: 'IP → Routes — таблица маршрутов', lvl: 1,
      path: 'IP → Routes', tags: ['маршрутизация', 'шлюз', 'static'],
      purpose: 'Таблица маршрутизации определяет, куда отправлять пакеты: маршрут по умолчанию в интернет, статические маршруты в филиалы, маршруты к пулам VPN. Динамические маршруты добавляют OSPF/BGP.',
      usage: [
        'Маршрут по умолчанию на шлюз провайдера при статическом подключении.',
        'Статический маршрут в сеть филиала через VPN-туннель.',
        'Два маршрута по умолчанию с разной дистанцией — резервный канал.'
      ],
      steps: [
        { t: 'Посмотрите активные маршруты', d: 'IP → Routes: флаг A — активный, D — динамический, S — статический.' },
        { t: 'Добавьте маршрут по умолчанию', d: '`+`: Dst. Address=0.0.0.0/0, Gateway=203.0.113.1 (или имя интерфейса pppoe-out1), Distance=1.' },
        { t: 'Резервный канал', d: 'Второй маршрут 0.0.0.0/0 через LTE-интерфейс с Distance=10 — включится при пропадании основного (если активен check-gateway).' },
        { t: 'Проверка шлюза', d: 'Check Gateway=ping или arp — маршрут помечается неактивным, если шлюз не отвечает.' },
        { t: 'Маршрут в филиал', d: 'Dst. Address=10.50.0.0/24, Gateway=wg-branch (туннель).' }
      ],
      scenes: [{
        path: 'IP → Routes', win: 'Route List', tabs: ['Routes', 'Nexthops', 'Rules', 'Tables'],
        cols: [{ t: 'A', w: 32 }, { t: 'Dst. Address', w: 132 }, { t: 'Gateway', w: 140 }, { t: 'Distance', w: 70 }, { t: 'Pref. Source', w: 110 }, { t: 'Comment', w: 150 }],
        rows: [
          [{ v: 'AS', c: 'ok' }, { v: '0.0.0.0/0', m: 1 }, { v: '203.0.113.1 reachable', m: 2 }, { v: '1', m: 3 }, '203.0.113.10', 'основной канал'],
          ['AS', '0.0.0.0/0', 'lte1 reachable', '10', '', 'резерв'],
          ['AS', '10.50.0.0/24', 'wg-branch', '1', '', 'филиал Витебск'],
          ['A S', '192.168.88.0/24', 'bridge-lan', '0', '', 'connected']
        ],
        sel: 0,
        notes: ['Dst. Address 0.0.0.0/0 — маршрут по умолчанию (весь интернет)',
          'Gateway — адрес шлюза провайдера или имя интерфейса',
          'Меньшая Distance = приоритетнее']
      }],
      check: [{ d: 'терминал', c: '/ip route print\n/ip route check 8.8.8.8\n/ip route print where active=no' }]
    },
    {
      id: 'ip-dns', t: 'IP → DNS — кэширующий DNS', lvl: 1,
      path: 'IP → DNS', tags: ['dns', 'allow-remote-requests'],
      purpose: 'RouterOS может работать DNS-сервером для локальной сети: кэширует ответы и раздаёт их клиентам. Также здесь задаются статические записи (Static) для внутренних сервисов.',
      usage: [
        'Раздача DNS клиентам через DHCP (обычно указывают IP роутера).',
        'Статическая запись `nas.lan → 192.168.88.10` для доступа по имени.',
        'Принудительный DNS для всех клиентов (в обход пользовательских настроек) через NAT redirect.'
      ],
      steps: [
        { t: 'Задайте upstream-серверы', d: 'IP → DNS → Servers: 1.1.1.1, 8.8.8.8 или серверы провайдера. Можно добавить DoH: кнопка Use DoH Server.' },
        { t: 'Разрешите запросы из LAN', d: 'Allow Remote Requests = yes. Без этого роутер отвечает только себе.' },
        { t: 'Статические записи', d: 'Вкладка Static → `+`: Name=`nas.lan`, Address=192.168.88.10, TTL=1h.' },
        { t: 'DNS в DHCP', d: 'IP → DHCP Server → Networks: DNS Servers = 192.168.88.1.' },
        { t: 'Защита от подмены', d: 'NAT-правило: chain=dstnat, protocol=udp, dst-port=53, in-interface-list=LAN, action=redirect to-ports=53 — все DNS-запросы пойдут через роутер.' },
        { t: 'Кэш', d: 'Кнопка Cache: показать/очистить кэш. Полезно после смены DNS-провайдера.' }
      ],
      scenes: [{
        path: 'IP → DNS', win: 'DNS', tabs: ['Settings', 'Cache', 'Static'],
        noTools: true,
        form: {
          title: 'DNS Settings', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Servers', v: '1.1.1.1, 8.8.8.8', m: 1 },
            { l: 'Dynamic Servers', v: '10.20.0.1', ro: true },
            { l: 'Allow Remote Requests', v: 'yes', type: 'select', m: 2 },
            { l: 'Max UDP Packet Size', v: '4096', type: 'select' },
            { l: 'Cache Size', v: '2048 KiB' },
            { l: 'Cache Max TTL', v: '1w' },
            { l: 'Query Server Timeout', v: '2s' }
          ]
        },
        notes: ['Upstream DNS-серверы, к которым обращается роутер',
          'Без этой опции клиенты LAN не смогут пользоваться DNS роутера']
      }],
      check: [{ d: 'терминал', c: '/ip dns print\n/ip dns cache print\n:put [:resolve "mikrotik.com"]' }],
      warn: 'Открытый DNS-резолвер (Allow Remote Requests=yes без firewall) — это DNS amplification атака. Всегда закрывайте порт 53 из интернета правилом input drop.'
    },
    {
      id: 'ip-dhcp-client', t: 'DHCP Client — получение адреса', lvl: 1,
      path: 'IP → DHCP Client', tags: ['dhcp', 'wan', 'провайдер'],
      purpose: 'Клиент запрашивает адрес, маску, шлюз и DNS у вышестоящего сервера. Типовой способ подключения к провайдеру и к домашнему роутеру.',
      usage: [
        'WAN-порты с динамическим адресом от провайдера.',
        'Временное подключение роутера к чужой сети для настройки.',
        'Резервный LTE-интерфейс, получающий адрес от модема.'
      ],
      steps: [
        { t: 'Добавьте клиента', d: 'IP → DHCP Client → `+`: Interface=WAN, Use Peer DNS=yes, Use Peer NTP=no, Add Default Route=yes.' },
        { t: 'Клиентский идентификатор', d: 'Client ID оставьте пустым, если провайдер не требует иное. Некоторые операторы привязывают по MAC.' },
        { t: 'Release/Renew', d: 'Кнопки в окне клиента: Release — отдать адрес, Renew — запросить заново.' },
        { t: 'Проверьте адрес', d: 'IP → Address: появится динамический адрес с флагом D.' },
        { t: 'Маршрут', d: 'При Add Default Route=yes маршрут 0.0.0.0/0 создаётся автоматически с distance 1.' }
      ],
      scenes: [{
        path: 'IP → DHCP Client', win: 'DHCP Client', tabs: ['DHCP Client'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }, { t: 'Release' }, { t: 'Renew' }],
        cols: [{ t: 'Interface', w: 96 }, { t: 'Address', w: 130 }, { t: 'Status', w: 90 }, { t: 'Use Peer DNS', w: 96 }, { t: 'Add Default Route', w: 116 }],
        rows: [[{ v: 'WAN', m: 2 }, '100.71.14.9/24', { v: 'bound', c: 'ok' }, 'yes', 'yes']],
        sel: 0,
        notes: ['Кнопка добавления DHCP-клиента',
          'Интерфейс, который смотрит в сторону провайдера']
      }],
      check: [{ d: 'терминал', c: '/ip dhcp-client print detail\n/ip dhcp-client release WAN' }]
    },
    {
      id: 'ip-dhcp-server', t: 'DHCP Server — раздача адресов', lvl: 1,
      path: 'IP → DHCP Server → DHCP Setup', tags: ['dhcp', 'lan', 'пул'],
      purpose: 'DHCP-сервер выдаёт клиентам адреса, шлюз, DNS и другие опции. Настройка делается мастером DHCP Setup, а тонкая настройка — в Networks, Pools, Options и Leases.',
      usage: [
        'Основная LAN офиса или квартиры.',
        'Гостевая сеть и VLAN с отдельным пулом.',
        'Резервирование адресов для принтеров, камер и точек доступа по MAC (Static Lease).'
      ],
      steps: [
        { t: 'Запустите мастер', d: 'IP → DHCP Server → кнопка DHCP Setup. Выберите интерфейс (bridge-lan или VLAN).' },
        { t: 'Адрес сети и шлюз', d: 'Мастер подставит адрес роутера как шлюз. Проверьте, что он совпадает с адресом интерфейса.' },
        { t: 'Пул адресов', d: 'Диапазон, например 192.168.88.10–192.168.88.254. Не включайте в пул адрес роутера.' },
        { t: 'DNS и lease time', d: 'DNS = 192.168.88.1 (или внешний), Lease Time = 10m для гостей, 1d для офиса.' },
        { t: 'Резервирование', d: 'IP → DHCP Server → Leases: найдите клиента → Make Static. Адрес закрепится за MAC.' },
        { t: 'Опции', d: 'Options: option 3 (router), 6 (dns), 42 (NTP), 66/67 (PXE) — добавляйте при необходимости.' }
      ],
      scenes: [
        {
          path: 'IP → DHCP Server', win: 'DHCP Server', tabs: ['DHCP Server', 'Networks', 'Leases', 'Options'],
          tools: [{ t: 'DHCP Setup', id: 'setup', m: 1 }, { t: '+', id: 'add' }, { t: '−' }, { t: '✓' }, { t: '✕' }],
          cols: [{ t: 'Name', w: 100 }, { t: 'Interface', w: 118 }, { t: 'Address Pool', w: 130 }, { t: 'Lease Time', w: 96 }, { t: 'Add ARP', w: 78 }, { t: 'Disabled', w: 70 }],
          rows: [[{ v: 'dhcp-lan', m: 2 }, { v: 'bridge-lan', m: 3 }, 'pool-lan', '1d', 'yes', 'false']],
          sel: 0,
          notes: ['Кнопка запуска мастера настройки — самый быстрый путь',
            'Имя сервера, произвольное',
            'Интерфейс, в котором раздаются адреса (для VLAN — VLAN-интерфейс)']
        },
        {
          path: 'IP → DHCP Server → Networks', win: 'DHCP Networks', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }],
          cols: [{ t: 'Address', w: 130 }, { t: 'Gateway', w: 118 }, { t: 'DNS Server', w: 118 }, { t: 'Netmask', w: 66 }, { t: 'NTP Server', w: 100 }],
          rows: [[{ v: '192.168.88.0/24', m: 2 }, { v: '192.168.88.1', m: 3 }, '192.168.88.1', '24', '']],
          sel: 0,
          notes: ['Кнопка добавления сети',
            'Подсеть, для которой действуют параметры',
            'Шлюз, который получат клиенты — обычно IP роутера']
        }
      ],
      check: [{
        d: 'терминал',
        c: '/ip dhcp-server print\n/ip dhcp-server network print\n/ip pool print\n/ip dhcp-server lease print'
      }],
      mistakes: [
        'Мастер не запускается: на интерфейсе нет адреса или он в bridge без IP.',
        'Пул пересекается с адресом роутера или статическими адресами.',
        'Два DHCP-сервера в одном L2-сегменте (свой + чужой роутер) — клиенты получают случайные адреса.'
      ]
    },
    {
      id: 'ip-dhcp-relay', t: 'DHCP Relay — сервер в другой сети', lvl: 2,
      path: 'IP → DHCP Relay', tags: ['dhcp', 'relay'],
      purpose: 'Relay передаёт DHCP-запросы из сегмента без своего сервера на централизованный DHCP-сервер (например, на RouterOS в другом VLAN или на Windows Server).',
      usage: [
        'Единый DHCP-сервер для всех VLAN офиса.',
        'Гостевая сеть, обслуживаемая центральным контроллером.',
        'Сеть за VPN-туннелем, где нет локального сервера.'
      ],
      steps: [
        { t: 'Создайте relay', d: 'IP → DHCP Relay → `+`: Name=`relay-vlan20`, Interface=vlan20-guest, DHCP Server=10.10.10.10, Local Address=10.20.0.1.' },
        { t: 'Разрешите на сервере', d: 'На центральном DHCP-сервере должен быть пул/сеть для подсети 10.20.0.0/24 и разрешён приём relay-запросов.' },
        { t: 'Маршрутизация', d: 'Между relay и сервером должен быть IP-маршрут (обычно через тот же роутер с VLAN).' },
        { t: 'Проверка', d: 'IP → DHCP Relay: счётчики Received/Sent должны расти; leases появляются на центральном сервере.' }
      ],
      scenes: [{
        path: 'IP → DHCP Relay', win: 'DHCP Relay', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }],
        cols: [{ t: 'Name', w: 120 }, { t: 'Interface', w: 120 }, { t: 'DHCP Server', w: 130 }, { t: 'Local Address', w: 130 }, { t: 'Disabled', w: 70 }],
        rows: [[{ v: 'relay-vlan20', m: 2 }, { v: 'vlan20-guest', m: 3 }, '10.10.10.10', '10.20.0.1', 'false']],
        sel: 0,
        notes: ['Кнопка добавления relay', 'Интерфейс, где нет DHCP-сервера', 'Адрес центрального DHCP-сервера']
      }],
      check: [{ d: 'терминал', c: '/ip dhcp-relay print detail\n/log print where topics~"dhcp"' }]
    },
    {
      id: 'ip-arp', t: 'IP → ARP — таблица соответствия', lvl: 2,
      path: 'IP → ARP', tags: ['arp', 'mac', 'защита'],
      purpose: 'Таблица ARP сопоставляет IP и MAC в локальном сегменте. Режим ARP на интерфейсе (enabled, reply-only, proxy-arp, disabled) — инструмент защиты от подмены и способ организации связности без маршрутов.',
      usage: [
        'Поиск «кто занял адрес»: конфликт IP видно по двум MAC.',
        'Статические ARP-записи для критичных устройств.',
        'Режим reply-only — защита от ARP-спуфинга в гостевых сетях.'
      ],
      steps: [
        { t: 'Откройте ARP', d: 'IP → ARP: список IP ↔ MAC ↔ interface, флаг D — динамическая запись.' },
        { t: 'Найдите конфликт', d: 'Отсортируйте по Address: два одинаковых IP с разными MAC — конфликт адресов.' },
        { t: 'Статическая запись', d: '`+`: Address=192.168.88.10, MAC Address=... (флаг C — complete), Interface=bridge-lan.' },
        { t: 'Режим интерфейса', d: 'Interface → Interface → двойной клик → ARP = reply-only (для клиентских сетей), proxy-arp (для схем без маршрутов).' },
        { t: 'Очистка', d: 'Кнопка Remove all динамических записей — помогает после замены оборудования.' }
      ],
      scenes: [{
        path: 'IP → ARP', win: 'ARP List', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '⌕' }, { t: 'Remove all' }],
        cols: [{ t: 'Address', w: 130 }, { t: 'MAC Address', w: 136 }, { t: 'Interface', w: 110 }, { t: 'Published', w: 80 }, { t: 'Invalid', w: 70 }],
        rows: [
          ['192.168.88.1', 'DC:2C:6E:A1:4F:21', { v: 'bridge-lan', m: 1 }, 'no', 'false'],
          ['192.168.88.10', '00:1B:44:11:3A:B7', 'bridge-lan', 'no', 'false'],
          ['192.168.88.24', 'D4:CA:6D:77:01:2E', 'bridge-lan', 'no', 'false']
        ],
        sel: 0,
        notes: ['Кнопка добавления статической записи (для резервирования MAC/IP)']
      }],
      check: [{ d: 'терминал', c: '/ip arp print\n/ip arp print where invalid=yes' }]
    },

    /* ---------------- FIREWALL ---------------- */
    {
      id: 'ip-firewall-filter', t: 'Firewall → Filter Rules — ядро безопасности', lvl: 2,
      path: 'IP → Firewall → Filter Rules', tags: ['firewall', 'filter', 'безопасность'],
      purpose: 'Filter Rules — фильтр пакетов по цепочкам input (на роутер), forward (через роутер), output (от роутера). Это главный инструмент защиты: без правил RouterOS по умолчанию пропускает всё.',
      usage: [
        'Базовая защита роутера: закрыть управление из интернета.',
        'Сегментация: гостям запрещён доступ к серверам, камерам — в интернет.',
        'Разрешение конкретных сервисов: проброс портов, доступ к NAS извне (через dst-nat).'
      ],
      steps: [
        { t: 'Правило 1 — established,related', d: 'chain=input, action=accept, connection-state=established,related. Ставится первым, иначе уже установленные соединения будут рваться.' },
        { t: 'Правило 2 — invalid', d: 'chain=input, action=drop, connection-state=invalid.' },
        { t: 'Правило 3 — ICMP', d: 'chain=input, protocol=icmp, action=accept (с ограничением icmp-limit, если нужна защита от флуда).' },
        { t: 'Правило 4 — LAN', d: 'chain=input, in-interface-list=LAN, action=accept. Локальные админы входят без ограничений.' },
        { t: 'Правило 5 — drop WAN', d: 'chain=input, in-interface-list=WAN, action=drop. Всё снаружи на роутер запрещено.' },
        { t: 'Forward-цепочка', d: 'accept established,related → drop invalid → accept in LAN out WAN → drop всё остальное.' },
        { t: 'FastTrack (опционально)', d: 'chain=forward, action=fasttrack-connection, connection-state=established,related — после базового accept, ускоряет NAT-трафик.' },
        { t: 'Проверьте счётчики', d: 'Колонка Bytes растёт у правил — значит трафик реально проходит через них. Правило с нулём стоит проверить.' }
      ],
      scenes: [
        {
          path: 'IP → Firewall → Filter Rules', win: 'Firewall', tab: 'Filter Rules',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'Raw', 'Connections', 'Address Lists'],
          tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }, { t: '⇅' }, { t: '⌕' }],
          cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 70 }, { t: 'Action', w: 124 }, { t: 'Connection State', w: 120 },
            { t: 'In. Interface List', w: 118 }, { t: 'Bytes', w: 78 }, { t: 'Comment', w: 200 }],
          rows: [
            ['0', 'input', { v: 'accept', c: 'ok' }, 'established,related', '', '12.4 GiB', 'defconf: accept established'],
            ['1', 'input', 'drop', 'invalid', '', '402 MiB', 'defconf: drop invalid'],
            ['2', 'input', 'accept', '', '', '88 MiB', 'icmp'],
            ['3', 'input', 'accept', '', { v: 'LAN', m: 2 }, '9.1 GiB', 'accept LAN'],
            ['4', 'input', { v: 'drop', c: 'no', m: 3 }, '', 'WAN', '1.1 MiB', 'drop all from WAN'],
            ['5', 'forward', 'accept', 'established,related', '', '90.1 GiB', 'defconf: accept established'],
            ['6', 'forward', { v: 'fasttrack-connection', c: 'ok' }, 'established,related', '', '84.0 GiB', 'fasttrack'],
            ['7', 'forward', { v: 'drop', c: 'no' }, '', '', '3.2 MiB', 'drop all else']
          ],
          sel: 4,
          notes: ['Кнопка «+» создаёт новое правило в текущей вкладке',
            'Список интерфейсов LAN удобнее конкретных портов',
            'Финальный drop закрывает всё, что не разрешено выше']
        },
        {
          path: 'IP → Firewall → Filter Rules → New', win: 'New Filter Rule',
          noTools: true,
          form: {
            title: 'New Filter Rule', tabs: ['General', 'Advanced', 'Extra', 'Action', 'Statistics'],
            buttons: ['OK', 'Cancel', 'Comment', 'Copy'],
            fields: [
              { l: 'Chain', v: 'input', type: 'select', m: 1 },
              { l: 'Src. Address', v: '', m: 2 },
              { l: 'In. Interface List', v: 'WAN', type: 'select', m: 3 },
              { l: 'Connection State', v: 'established,related', type: 'select' },
              { l: 'Protocol', v: 'tcp', type: 'select' },
              { l: 'Dst. Port', v: '22' },
              { l: 'Action', v: 'drop', type: 'select', m: 4 },
              { l: 'Comment', v: 'block ssh from WAN' }
            ]
          },
          notes: ['Chain: input — трафик «на роутер», forward — «через роутер»',
            'Src/Dst Address — точная фильтрация по IP или подсети',
            'Интерфейс/список, к которому применяется правило',
            'Action: accept, drop, reject, log, jump, fasttrack-connection']
        }
      ],
      check: [{
        d: 'терминал',
        c: '/ip firewall filter print\n/ip firewall filter print stats\n/ip firewall filter print where bytes=0'
      }],
      warn: 'Правило drop для input без предварительного accept established,related отрежет доступ к роутеру и вам, и клиентам. Настраивайте через Safe Mode или с консоли.',
      mistakes: [
        'Порядок правил: drop стоит выше accept — разрешение никогда не сработает.',
        'Правила только для input, а forward оставлен открытым — «транзитный» трафик не фильтруется.',
        'FastTrack ставится до правил маркировки/фильтрации — помеченный трафик обходит mangle и queues.'
      ]
    },
    {
      id: 'ip-firewall-nat', t: 'Firewall → NAT — трансляция адресов', lvl: 2,
      path: 'IP → Firewall → NAT', tags: ['nat', 'masquerade', 'проброс портов'],
      purpose: 'NAT подменяет адреса/порты: srcnat (masquerade) даёт доступ в интернет устройствам с приватными адресами, dstnat публикует внутренние сервисы наружу (port forwarding).',
      usage: [
        'Общий доступ в интернет для LAN (masquerade на WAN).',
        'Проброс портов: веб-камера, RDP, игровой сервер, IP-АТС.',
        'Hairpin NAT — доступ к внутреннему сервису по внешнему адресу изнутри сети.',
        'Принудительный DNS/DNS-hijack и подмена адресов между VLAN.'
      ],
      steps: [
        { t: 'Masquerade', d: '`+`: Chain=srcnat, Out. Interface List=WAN, Action=masquerade. Одна строка — интернет для всей LAN.' },
        { t: 'Проброс порта', d: '`+`: Chain=dstnat, Protocol=tcp, Dst. Port=8080, In. Interface List=WAN, Action=dst-nat, To Addresses=192.168.88.50, To Ports=80.' },
        { t: 'Hairpin NAT', d: 'Второе правило: Chain=srcnat, Src. Address=192.168.88.0/24, Dst. Address=192.168.88.50, Protocol=tcp, Dst. Port=80, Action=masquerade — чтобы доступ работал изнутри по внешнему адресу.' },
        { t: 'Ограничьте источник', d: 'Для проброса добавьте Src. Address List или используйте address-list в правиле, если сервис должен быть доступен не всем.' },
        { t: 'Проверьте счётчики', d: 'У правила dstnat должны расти Bytes при подключении снаружи; если нет — трафик не доходит (firewall/провайдер CGNAT).' }
      ],
      scenes: [
        {
          path: 'IP → Firewall → NAT', win: 'Firewall', tab: 'NAT',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'Raw', 'Connections', 'Address Lists'],
          cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 66 }, { t: 'Protocol', w: 66 }, { t: 'Dst. Port', w: 66 },
            { t: 'In. Interface List', w: 110 }, { t: 'Action', w: 92 }, { t: 'To Addresses', w: 118 }, { t: 'Comment', w: 150 }],
          rows: [
            ['0', { v: 'srcnat', m: 1 }, '', '', '', { v: 'masquerade', c: 'ok', m: 2 }, '', 'internet for LAN'],
            ['1', 'dstnat', 'tcp', '8080', 'WAN', 'dst-nat', { v: '192.168.88.50', m: 3 }, 'camera web'],
            ['2', 'srcnat', '', '80', '', 'masquerade', '192.168.88.0/24', 'hairpin']
          ],
          sel: 0,
          notes: ['srcnat — исходящий трафик из LAN в интернет',
            'masquerade автоматически подставляет адрес WAN',
            'Внутренний адрес и порт, куда перенаправляется трафик']
        },
        {
          path: 'IP → Firewall → NAT → New', win: 'New NAT Rule',
          noTools: true,
          form: {
            title: 'New NAT Rule', tabs: ['General', 'Advanced', 'Extra', 'Action', 'Statistics'],
            buttons: ['OK', 'Cancel', 'Comment'],
            fields: [
              { l: 'Chain', v: 'dstnat', type: 'select', m: 1 },
              { l: 'Protocol', v: 'tcp', type: 'select' },
              { l: 'Dst. Port', v: '8080', m: 2 },
              { l: 'In. Interface List', v: 'WAN', type: 'select', m: 3 },
              { l: 'Action', v: 'dst-nat', type: 'select', m: 4 },
              { l: 'To Addresses', v: '192.168.88.50' },
              { l: 'To Ports', v: '80' },
              { l: 'Comment', v: 'camera web' }
            ]
          },
          notes: ['dstnat — правило входящих подключений',
            'Внешний порт, который вы публикуете',
            'Только с WAN, чтобы не ломать доступ изнутри',
            'Action dst-nat с указанием внутреннего адреса и порта']
        }
      ],
      check: [{
        d: 'терминал',
        c: '/ip firewall nat print\n/ip firewall connection print where dst-port~"8080"\n/log print where topics~"firewall"'
      }],
      warn: 'Проброс портов открывает устройство в интернет. Если провайдер использует CGNAT, внешний адрес не будет доступен — нужен VPN или публичный IP.',
      mistakes: [
        'Masquerade без out-interface — ломает маршрутизацию между VLAN.',
        'Проброс с in-interface=all — порт доступен изнутри и снаружи непредсказуемо.',
        'Открыли порт, но забыли разрешить forward в firewall — соединение не устанавливается.'
      ]
    },
    {
      id: 'ip-firewall-mangle', t: 'Firewall → Mangle — маркировка трафика', lvl: 3,
      path: 'IP → Firewall → Mangle', tags: ['mangle', 'pcc', 'qos'],
      purpose: 'Mangle помечает соединения и пакеты (connection-mark, packet-mark, routing-mark) для последующей обработки: очередей, балансировки по каналам, маршрутизации по политике.',
      usage: [
        'PCC-балансировка двух провайдеров.',
        'Приоритизация VoIP/игр через queue tree.',
        'Маршрутизация по политике: часть трафика идёт через VPN.',
        'Ограничение полосы для группы устройств по адрес-листу.'
      ],
      steps: [
        { t: 'Пометьте соединение', d: 'chain=prerouting, in-interface-list=LAN, dst-address-list=LAN, action=mark-connection, new-connection-mark=no-mark.' },
        { t: 'Пометьте маршрут', d: 'chain=output/mangle: connection-mark=..., action=mark-routing, new-routing-mark=via-vpn (нужна отдельная таблица маршрутов).' },
        { t: 'Packet mark для очередей', d: 'chain=forward, protocol=udp, dst-port=5060, action=mark-packet, new-packet-mark=voip, passthrough=no.' },
        { t: 'Используйте метки', d: 'Queues → Queue Tree: packet-mark=voip, max-limit=5M.' },
        { t: 'Проверка', d: 'Firewall → Connections: колонки Connection Mark / Packet Mark должны быть заполнены.' }
      ],
      scenes: [{
        path: 'IP → Firewall → Mangle', win: 'Firewall', tab: 'Mangle',
        tabs: ['Filter Rules', 'NAT', 'Mangle', 'Raw', 'Connections', 'Address Lists'],
        cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 90 }, { t: 'Action', w: 130 }, { t: 'New Connection Mark', w: 130 },
          { t: 'New Packet Mark', w: 118 }, { t: 'Comment', w: 170 }],
        rows: [
          ['0', 'prerouting', { v: 'mark-connection', m: 1 }, { v: 'conn-voip', m: 2 }, '', 'voip traffic'],
          ['1', 'prerouting', 'mark-packet', '', { v: 'voip', m: 3 }, 'for queue tree'],
          ['2', 'prerouting', 'accept', '', '', 'no-mark']
        ],
        sel: 0,
        notes: ['prerouting обрабатывает трафик до маршрутизации — место для PCC',
          'Метка соединения живёт всё время сессии',
          'Метка пакета используется очередями и routing rules']
      }],
      check: [{ d: 'терминал', c: '/ip firewall mangle print stats\n/ip firewall connection print where connection-mark~"voip"' }],
      warn: 'Правила mangle выполняются для каждого пакета и нагружают CPU. На слабых моделях используйте минимум правил и FastTrack для остального трафика.'
    },
    {
      id: 'ip-firewall-raw', t: 'Firewall → Raw — фильтр до conntrack', lvl: 3,
      path: 'IP → Firewall → Raw', tags: ['raw', 'conntrack', 'anti-ddos'],
      purpose: 'Raw-правила обрабатываются до механизма отслеживания соединений. Это самый ранний и самый дешёвый способ отбросить мусор — сканеры портов, брутфорс, flood — чтобы не забивать таблицу conntrack.',
      usage: [
        'Блокировка сканеров и ботов до создания записи в conntrack.',
        'Защита от простого SYN-flood по адрес-листу.',
        'Отбрасывание трафика из «плохих» стран/подсетей.',
        'Маршрутизация без conntrack (notrack) для больших потоков.'
      ],
      steps: [
        { t: 'Drop invalid', d: 'chain=prerouting, action=drop, connection-state=invalid — дешевле, чем в filter.' },
        { t: 'Чёрный список', d: 'chain=prerouting, src-address-list=blacklist, action=drop. Наполняйте список скриптом или вручную.' },
        { t: 'Син-флуд', d: 'chain=prerouting, protocol=tcp, tcp-flags=syn, connection-limit=100,32, action=drop (в Advanced).' },
        { t: 'Notrack', d: 'chain=prerouting, action=notrack — для трафика, которому не нужен conntrack (например, GRE-туннели).' },
        { t: 'Проверка', d: 'IP → Firewall → Connections: число записей не должно расти лавинообразно.' }
      ],
      scenes: [{
        path: 'IP → Firewall → Raw', win: 'Firewall', tab: 'Raw',
        tabs: ['Filter Rules', 'NAT', 'Mangle', 'Raw', 'Connections', 'Address Lists'],
        cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 90 }, { t: 'Action', w: 80 }, { t: 'Src. Address List', w: 130 }, { t: 'Connection State', w: 120 }, { t: 'Bytes', w: 80 }],
        rows: [
          ['0', 'prerouting', { v: 'drop', c: 'no', m: 1 }, { v: 'blacklist', m: 2 }, '', '18.2 GiB'],
          ['1', 'prerouting', 'drop', '', 'invalid', '2.4 GiB']
        ],
        sel: 0,
        notes: ['Drop в raw отбрасывает пакет до создания сессии',
          'Адрес-лист с ботнетами можно наполнять автоматически']
      }],
      check: [{ d: 'терминал', c: '/ip firewall raw print stats\n/ip firewall connection tracking print' }]
    },
    {
      id: 'ip-firewall-connections', t: 'Firewall → Connections и Tracking', lvl: 2,
      path: 'IP → Firewall → Connections · IP → Firewall → Tracking',
      tags: ['conntrack', 'сессии', 'диагностика'],
      purpose: 'Таблица соединений показывает все активные сессии с адресами, портами и счётчиками. Раздел Tracking управляет механизмом conntrack: таймауты, лимиты, поведение для TCP/UDP/ICMP.',
      usage: [
        'Кто сейчас качает трафик и куда — по колонке Bytes.',
        'Проверка, установилось ли соединение через VPN.',
        'Тонкая настройка таймаутов для VoIP и игр.',
        'Быстрая очистка «залипших» сессий после смены правил.'
      ],
      steps: [
        { t: 'Откройте Connections', d: 'IP → Firewall → Connections: Src/Dst Address, Src/Dst Port, Protocol, Bytes, Connection Mark.' },
        { t: 'Фильтр', d: 'Введите адрес в поле фильтра — останутся только его сессии.' },
        { t: 'Сортировка по трафику', d: 'Клик по колонке Bytes — сразу видно самых активных потребителей.' },
        { t: 'Tracking', d: 'IP → Firewall → Tracking: TCP Established Timeout (1d), UDP Timeout (10s), ICMP Timeout (10s), Max Entries (auto).' },
        { t: 'Сброс сессий', d: 'Удаление записи кнопкой `−` разрывает соединение — иногда нужно после изменения NAT.' }
      ],
      scenes: [{
        path: 'IP → Firewall → Connections', win: 'Connections', tab: 'Connections',
        tabs: ['Filter Rules', 'NAT', 'Mangle', 'Raw', 'Connections', 'Tracking', 'Address Lists'],
        cols: [{ t: 'Src. Address', w: 130 }, { t: 'Dst. Address', w: 130 }, { t: 'Protocol', w: 70 }, { t: 'Dst. Port', w: 70 }, { t: 'Bytes', w: 96 }, { t: 'Connection Mark', w: 120 }],
        rows: [
          ['192.168.88.24', '142.250.74.14:443', 'tcp', '443', { v: '84.2 MiB', m: 1 }, 'conn-wan1'],
          ['192.168.88.31', '91.198.174.192:443', 'tcp', '443', '12.4 MiB', 'conn-wan2'],
          ['192.168.88.55', '8.8.8.8:53', 'udp', '53', '8.1 KiB', '']
        ],
        sel: 0,
        notes: ['Сортировка по Bytes мгновенно показывает «тяжёлых» клиентов']
      }],
      check: [{ d: 'терминал', c: '/ip firewall connection print count-only\n/ip firewall connection tracking print' }]
    },
    {
      id: 'ip-firewall-addresslists', t: 'Firewall → Address Lists', lvl: 2,
      path: 'IP → Firewall → Address Lists', tags: ['списки', 'firewall', 'автоматизация'],
      purpose: 'Именованные списки IP-адресов и подсетей. Правила ссылаются на список, а не на отдельные адреса — список можно наполнять вручную, динамически (из правил) и скриптами.',
      usage: [
        'Белый список администраторов для доступа к управлению.',
        'Чёрный список ботнетов, наполняемый автоматически.',
        'Список доверенных сетей для проброса портов.',
        'Группировка серверов по назначению: db, voip, cameras.'
      ],
      steps: [
        { t: 'Создайте список', d: '`+`: Name=`admin-allow`, Address=`203.0.113.5`, `198.51.100.0/24`.' },
        { t: 'Используйте в правиле', d: 'Filter Rule: chain=input, src-address-list=admin-allow, action=accept.' },
        { t: 'Динамические записи', d: 'Правило с action=add-src-to-address-list и timeout=1h наполнит список автоматически (например, после серии неудачных попыток входа).' },
        { t: 'Обновление из скрипта', d: '`/ip firewall address-list add list=blacklist address=$ip timeout=7d` — удобно для собственного «fail2ban».' },
        { t: 'Проверка', d: 'Список отображается в Address Lists; у динамических записей есть timeout.' }
      ],
      scenes: [{
        path: 'IP → Firewall → Address Lists', win: 'Address Lists', tab: 'Address Lists',
        tabs: ['Filter Rules', 'NAT', 'Mangle', 'Raw', 'Connections', 'Address Lists'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'List', w: 130 }, { t: 'Address', w: 160 }, { t: 'Timeout', w: 90 }, { t: 'Creation Time', w: 150 }, { t: 'Dynamic', w: 70 }],
        rows: [
          [{ v: 'admin-allow', m: 2 }, '203.0.113.5', '', 'nov/01/2026 10:12', 'false'],
          ['admin-allow', '198.51.100.0/24', '', 'nov/01/2026 10:13', 'false'],
          [{ v: 'blacklist', m: 3 }, '45.148.10.7', { v: '6d23h', m: 4 }, 'nov/02/2026 09:45', 'true']
        ],
        sel: 0,
        notes: ['Кнопка добавления записи',
          'Имя списка — на него ссылаются правила',
          'Список, наполненный автоматически',
          'Timeout: запись удалится сама через указанное время']
      }],
      check: [{ d: 'терминал', c: '/ip firewall address-list print\n/ip firewall address-list print where list="blacklist"' }]
    },
    {
      id: 'ip-firewall-serviceports', t: 'Firewall → Service Ports', lvl: 2,
      path: 'IP → Firewall → Service Ports', tags: ['sip', 'ftp', 'conntrack'],
      purpose: 'Раздел управляет обработчиками протоколов, которым нужен специальный разбор в conntrack: FTP, SIP, H.323, PPTP, IRC, RTSP. Включение «лишних» обработчиков — это риск и лишняя нагрузка.',
      usage: [
        'Отключить SIP/FTP на роутере, где они не нужны (безопасность).',
        'Включить SIP-обработчик, если IP-АТС за NAT и звонки «рвутся».',
        'Диагностика проблем с FTP в пассивном режиме.'
      ],
      steps: [
        { t: 'Откройте список', d: 'IP → Firewall → Service Ports: ftp, h323, irc, pptp, sip, tftp, rtsp и их порты.' },
        { t: 'Отключите ненужное', d: 'Двойной клик → Enabled=no (или кнопка ✕). Для офиса без АТС SIP обычно выключают.' },
        { t: 'SIP за NAT', d: 'Если телефония внутри и звонки не проходят — оставьте sip=enabled, проверьте таймауты UDP в Tracking.' },
        { t: 'Проверка', d: 'После изменений перезапустите сессии (Connections → удалить затронутые).' }
      ],
      scenes: [{
        path: 'IP → Firewall → Service Ports', win: 'Service Ports', noTools: true,
        cols: [{ t: 'Service', w: 120 }, { t: 'Ports', w: 120 }, { t: 'Enabled', w: 90 }, { t: 'Comment', w: 240 }],
        rows: [
          [{ v: 'ftp', m: 1 }, '21', { v: 'no', c: 'no', m: 2 }, 'FTP helper выключен'],
          ['sip', '5060', 'yes', 'телефония за NAT'],
          ['tftp', '69', 'no', 'не используется']
        ],
        sel: 0,
        notes: ['Обработчик протокола', 'Отключение убирает лишний разбор пакетов и риск эксплуатации']
      }],
      check: [{ d: 'терминал', c: '/ip firewall service-port print' }]
    },

    /* ---------------- СЕРВИСЫ ---------------- */
    {
      id: 'ip-cloud', t: 'IP → Cloud — DDNS и обнаружение', lvl: 2,
      path: 'IP → Cloud', tags: ['ddns', 'cloud', 'домен'],
      purpose: 'Сервис MikroTik Cloud даёт постоянное DNS-имя вида `xxxxx.sn.mynetname.net`, которое обновляется при смене внешнего IP. Плюс используется для NAT traversal и удалённого доступа через Winbox/WebFig.',
      usage: [
        'Удалённый доступ к роутеру с динамическим IP провайдера.',
        'Проброс сервисов по доменному имени, а не по IP.',
        'Быстрый вход через Winbox 4 по Cloud-адресу.'
      ],
      steps: [
        { t: 'Включите DDNS', d: 'IP → Cloud: DDNS Enabled=yes, Update Time=auto. Через 10–30 секунд появится DNS Name.' },
        { t: 'Запишите имя', d: 'Скопируйте его — оно и есть адрес роутера извне.' },
        { t: 'Проверьте внешний адрес', d: 'Поле Public Address должно совпадать с реальным IP (не 10.x/100.64.x — иначе CGNAT).' },
        { t: 'Защитите доступ', d: 'Winbox-порт открывайте только для своих адресов (Address List) или используйте VPN.' },
        { t: 'Отключение', d: 'DDNS Enabled=no — запись перестанет обновляться.' }
      ],
      scenes: [{
        path: 'IP → Cloud', win: 'Cloud', noTools: true,
        form: {
          title: 'Cloud', buttons: ['Apply', 'Cancel', 'Force Update'],
          fields: [
            { l: 'DDNS Enabled', v: 'yes', type: 'select', m: 1 },
            { l: 'DDNS Update Time', v: '00:01:00', type: 'select' },
            { l: 'DNS Name', v: 'a1b2c3d4e5f6.sn.mynetname.net', ro: true, m: 2 },
            { l: 'Public Address', v: '100.71.14.9', ro: true, m: 3 },
            { l: 'Update Time', v: '00:00:42', ro: true }
          ]
        },
        notes: ['Включает динамическое DNS-имя',
          'Ваш постоянный адрес — можно использовать в Winbox',
          'Публичный IP: если начинается на 100.64–100.127 — это CGNAT, извне доступа не будет']
      }],
      check: [{ d: 'терминал', c: '/ip cloud print\n/ip cloud force-update' }],
      warn: 'DDNS + открытый Winbox из интернета = постоянная цель для брутфорса. Ограничьте доступ по адрес-листу или используйте VPN.'
    },
    {
      id: 'ip-services', t: 'IP → Services — сервисы управления', lvl: 2,
      path: 'IP → Services', tags: ['безопасность', 'ssh', 'winbox'],
      purpose: 'Список сервисов, через которые можно подключиться к роутеру: winbox, ssh, www, www-ssl, api, api-ssl, telnet, ftp. Для каждого задаётся порт и разрешённые адреса.',
      usage: [
        'Закрыть telnet/ftp/www — типовое требование безопасности.',
        'Сменить порт Winbox и ограничить доступ только своей подсетью.',
        'Разрешить SSH/API только для системы мониторинга.'
      ],
      steps: [
        { t: 'Откройте Services', d: 'IP → Services: Name, Port, Available From, Certificate, Disabled.' },
        { t: 'Отключите лишнее', d: 'telnet, ftp, www, api — Disable (кнопка ✕). Оставьте winbox и ssh.' },
        { t: 'Ограничьте адреса', d: 'Available From = 192.168.88.0/24 (или адрес-лист вида `admin-allow`).' },
        { t: 'Смените порт', d: 'Для Winbox можно указать нестандартный порт, но помните: это не заменяет firewall.' },
        { t: 'SSL', d: 'www-ssl требует сертификат (System → Certificates). Без сертификата сервис не запустится.' }
      ],
      scenes: [{
        path: 'IP → Services', win: 'IP Services', tools: [{ t: '✓' }, { t: '✕', id: 'dis', m: 1 }],
        cols: [{ t: 'Name', w: 96 }, { t: 'Port', w: 66 }, { t: 'Available From', w: 150 }, { t: 'Certificate', w: 110 }, { t: 'Disabled', w: 76 }],
        rows: [
          ['winbox', '8291', { v: '192.168.88.0/24', m: 2 }, '', 'false'],
          ['ssh', '22', '192.168.88.0/24', '', 'false'],
          [{ v: 'telnet', m: 3 }, '23', '0.0.0.0/0', '', { v: 'true', c: 'ok' }],
          ['www', '80', '0.0.0.0/0', '', { v: 'true', c: 'ok' }],
          ['ftp', '21', '0.0.0.0/0', '', { v: 'true', c: 'ok' }]
        ],
        sel: 0,
        notes: ['Кнопка отключения выбранного сервиса',
          'Ограничение по адресам — даже если firewall пропустит',
          'Отключённые сервисы: telnet, www, ftp']
      }],
      check: [{ d: 'терминал', c: '/ip service print\n/ip ssh print\n/ip service set winbox address=192.168.88.0/24' }],
      warn: 'Сервис api (порт 8728) без ограничения адресов — частая причина компрометации роутера ботнетами.'
    },
    {
      id: 'ip-neighbor', t: 'IP → Neighbor Discovery', lvl: 2,
      path: 'IP → Neighbor Discovery', tags: ['mndp', 'winbox', 'обнаружение'],
      purpose: 'Протокол MNDP/CDP/LLDP позволяет видеть роутер в списке Neighbors Winbox и определять соседей по L2. Здесь задаётся, на каких интерфейсах и какими протоколами устройство себя объявляет.',
      usage: [
        'Подключение по MAC, когда IP неизвестен (главный сценарий).',
        'Определение топологии: какие устройства и на каком порту.',
        'На WAN обнаружение обычно отключают, чтобы не «светить» роутер.'
      ],
      steps: [
        { t: 'Откройте Neighbor Discovery', d: 'IP → Neighbor Discovery: Discovery Protocols, Discover Interval, Interface Lists.' },
        { t: 'Только LAN', d: 'Discovery Interface List = LAN, Discovery Protocols = MNDP,CDP,LLDP.' },
        { t: 'WAN выключить', d: 'На интерфейсе WAN в Interface → Interface: Discover = no (или не включайте WAN в список).' },
        { t: 'Neighbor Viewer', d: 'Tools → Neighbor Viewer показывает сосеей с их адресами и идентификаторами.' },
        { t: 'Проверка', d: 'Winbox → Neighbors: устройство должно появиться в списке по MAC.' }
      ],
      scenes: [{
        path: 'IP → Neighbor Discovery', win: 'Neighbor Discovery', noTools: true,
        form: {
          title: 'Neighbor Discovery Settings', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Discovery Protocols', v: 'MNDP, CDP, LLDP', type: 'select', m: 1 },
            { l: 'Discover Interval', v: '60s', type: 'select' },
            { l: 'Interface List', v: 'LAN', type: 'select', m: 2 },
            { l: 'Protocols', v: 'mndp, cdp, lldp', ro: true }
          ]
        },
        notes: ['Обнаружение включено для LAN',
          'Только интерфейсы из списка LAN объявляют себя']
      }],
      check: [{ d: 'терминал', c: '/ip neighbor print\n/ip neighbor discovery-settings print' }]
    },
    {
      id: 'ip-pool', t: 'IP → Pool — пулы адресов', lvl: 2,
      path: 'IP → Pool', tags: ['pool', 'dhcp', 'ppp'],
      purpose: 'Пул — именованный диапазон IP, который используется DHCP-сервером, PPP-профилями (PPPoE/L2TP клиенты) и другими сервисами. Позволяет централизованно управлять адресами.',
      usage: [
        'Пул для DHCP-сервера офиса.',
        'Пул адресов для VPN-клиентов (L2TP/PPTP/PPPoE).',
        'Отдельные пулы для гостей и служебных устройств.'
      ],
      steps: [
        { t: 'Создайте пул', d: 'IP → Pool → `+`: Name=`pool-lan`, Ranges=`192.168.88.10-192.168.88.254`.' },
        { t: 'Несколько диапазонов', d: 'Ranges=`10.0.0.10-10.0.0.100,10.0.0.150-10.0.0.200` — исключённые адреса останутся для статики.' },
        { t: 'Используйте в DHCP', d: 'DHCP Server → Address Pool = pool-lan.' },
        { t: 'Используйте в PPP', d: 'PPP → Profiles → Remote Address = pool-vpn (или пул напрямую).' },
        { t: 'Проверка', d: 'IP → Pool → Used / Total показывает занятость.' }
      ],
      scenes: [{
        path: 'IP → Pool', win: 'IP Pool', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }],
        cols: [{ t: 'Name', w: 120 }, { t: 'Ranges', w: 260 }, { t: 'Total', w: 66 }, { t: 'Used', w: 60 }, { t: 'Comment', w: 140 }],
        rows: [
          [{ v: 'pool-lan', m: 2 }, { v: '192.168.88.10-192.168.88.254', m: 3 }, '245', '68', 'офис'],
          ['pool-vpn', '10.99.0.10-10.99.0.200', '191', '12', 'L2TP клиенты'],
          ['pool-guest', '10.20.0.10-10.20.0.100', '91', '7', 'гости']
        ],
        sel: 0,
        notes: ['Кнопка создания пула', 'Имя пула — на него ссылаются DHCP и PPP', 'Диапазон в формате начало-конец']
      }],
      check: [{ d: 'терминал', c: '/ip pool print\n/ip pool used print' }]
    },
    {
      id: 'ip-hotspot', t: 'IP → Hotspot — авторизация Wi-Fi/кабеля', lvl: 3,
      path: 'IP → Hotspot → Hotspot Setup', tags: ['hotspot', 'гости', 'авторизация'],
      purpose: 'Hotspot — captive portal: клиент получает адрес, но до интернета доходит только после ввода логина/пароля или принятия условий. Поддерживает профили скорости, ограничения по времени и ваучеры.',
      usage: [
        'Гостевая сеть в кафе, отеле, коворкинге.',
        'Ограничение доступа в интернет для гостей с выдачей ваучеров.',
        'Авторизация по SMS/логину через RADIUS (биллинг).'
      ],
      steps: [
        { t: 'Подготовьте интерфейс', d: 'Отдельная VLAN/мост для гостей, DHCP-сервер и адрес на интерфейсе уже должны работать.' },
        { t: 'Запустите Hotspot Setup', d: 'IP → Hotspot → Hotspot Setup: Hotspot Interface=vlan20-guest, Local Address=10.20.0.1.' },
        { t: 'Адрес пула', d: 'Мастер создаст пул; убедитесь, что он не пересекается с DHCP-пулом гостевой сети.' },
        { t: 'Сертификат и DNS', d: 'На вопрос про SSL-сертификат ответьте yes для HTTPS-портала (самоподписанный) или no.' },
        { t: 'Пользователи', d: 'IP → Hotspot → Users → `+`: Name=`guest01`, Password=`...`, Profile=`default`. Для ваучеров используйте генератор паролей.' },
        { t: 'Профиль', d: 'Hotspot → User Profiles: Rate Limit=`2M/2M`, Shared Users=1, Session Timeout=8h.' },
        { t: 'Walled garden', d: 'Hotspot → Walled Garden: разрешите сайты, доступные без авторизации (оплата, банк).' },
        { t: 'Firewall', d: 'Убедитесь, что forward из гостевой VLAN в LAN запрещён, кроме адреса самого хотспота.' }
      ],
      scenes: [
        {
          path: 'IP → Hotspot', win: 'Hotspot', tabs: ['Servers', 'Users', 'User Profiles', 'Active', 'Walled Garden'],
          tools: [{ t: 'Hotspot Setup', id: 'setup', m: 1 }, { t: '+', id: 'add' }, { t: '−' }, { t: '✓' }, { t: '✕' }],
          cols: [{ t: 'Name', w: 100 }, { t: 'Interface', w: 120 }, { t: 'Address Pool', w: 120 }, { t: 'Profile', w: 100 }, { t: 'Disabled', w: 70 }],
          rows: [[{ v: 'hotspot1', m: 2 }, { v: 'vlan20-guest', m: 3 }, 'hs-pool', 'hsprof1', 'false']],
          sel: 0,
          notes: ['Кнопка мастера настройки хотспота',
            'Имя сервера',
            'Интерфейс гостевой сети (не LAN!)']
        },
        {
          path: 'IP → Hotspot → User Profiles', win: 'Hotspot User Profiles', tools: [{ t: '+', id: 'add', m: 1 }],
          cols: [{ t: 'Name', w: 110 }, { t: 'Rate Limit', w: 100 }, { t: 'Shared Users', w: 96 }, { t: 'Session Timeout', w: 110 }, { t: 'Idle Timeout', w: 100 }],
          rows: [[{ v: 'guest-2m', m: 2 }, { v: '2M/2M', m: 3 }, '1', '8h', '15m']],
          sel: 0,
          notes: ['Кнопка создания профиля', 'Профиль с ограничением 2 Мбит', 'Ограничение одновременных устройств']
        }
      ],
      check: [{
        d: 'терминал',
        c: '/ip hotspot print\n/ip hotspot user print\n/ip hotspot active print\n/ip hotspot profile print'
      }],
      warn: 'Hotspot на интерфейсе, где есть ваши админы, заблокирует и их. Всегда отдельная VLAN/SSID для гостей.'
    },
    {
      id: 'ip-kidcontrol', t: 'IP → Kid Control', lvl: 2,
      path: 'IP → Kid Control', tags: ['родительский контроль', 'расписание'],
      purpose: 'Готовый механизм ограничения доступа к интернету по устройствам и расписанию: создаётся профиль с интервалами «можно/нельзя», устройства добавляются по MAC.',
      usage: [
        'Отключение интернета детям по расписанию.',
        'Ограничение гостевых устройств по времени.',
        'Быстрый «чёрный час» для группы устройств без написания скриптов.'
      ],
      steps: [
        { t: 'Создайте профиль', d: 'IP → Kid Control: вкладка Profiles? Нет — создайте запись `+`: Name=`kids`, Mon–Fri=08:00-21:00 (интервал разрешённого времени).' },
        { t: 'Добавьте устройства', d: 'Вкладка Devices → `+`: Name=`tablet`, MAC Address=..., Profile=kids.' },
        { t: 'Проверьте', d: 'Устройство получает блокировку в запрещённые часы; в статистике видны срабатывания.' },
        { t: 'Корректировка', d: 'Меняйте интервалы в записи профиля — правила firewall обновятся автоматически.' }
      ],
      scenes: [{
        path: 'IP → Kid Control', win: 'Kid Control', tabs: ['Control', 'Devices', 'Statistics'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }],
        cols: [{ t: 'Name', w: 100 }, { t: 'Mon-Fri', w: 130 }, { t: 'Sat-Sun', w: 130 }, { t: 'Disabled', w: 70 }],
        rows: [[{ v: 'kids', m: 2 }, { v: '08:00-21:00', m: 3 }, '09:00-22:00', 'false']],
        sel: 0,
        notes: ['Кнопка добавления профиля', 'Имя профиля', 'Интервалы разрешённого доступа']
      }],
      check: [{ d: 'терминал', c: '/ip kid-control print\n/ip kid-control device print' }]
    },
    {
      id: 'ip-sntp', t: 'IP → SNTP Client — точное время', lvl: 2,
      path: 'IP → SNTP Client', tags: ['ntp', 'время', 'сертификаты'],
      purpose: 'SNTP-клиент синхронизирует часы роутера с серверами времени. Точное время критично для сертификатов, логов, расписаний и VPN.',
      usage: [
        'Обязательно при использовании SSL-сертификатов и IPsec.',
        'Корректные метки времени в логах и отчётах.',
        'Раздача времени клиентам (через DHCP option 42 или SNTP-сервер роутера).'
      ],
      steps: [
        { t: 'Включите клиент', d: 'IP → SNTP Client: Enabled=yes, Mode=unicast, Servers=`pool.ntp.org` (или свои).' },
        { t: 'Часовой пояс', d: 'System → Clock: Time Zone Name=`Europe/Minsk`, DST — по необходимости.' },
        { t: 'Проверьте время', d: 'System → Clock должен совпадать с реальным с точностью до секунд.' },
        { t: 'Раздача клиентам', d: 'System → NTP Server: Enabled=yes, Manycast=no — роутер начнёт отвечать на NTP-запросы; в DHCP Network укажите NTP Server=192.168.88.1.' }
      ],
      scenes: [{
        path: 'IP → SNTP Client', win: 'SNTP Client', noTools: true,
        form: {
          title: 'SNTP Client', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
            { l: 'Mode', v: 'unicast', type: 'select' },
            { l: 'Servers', v: 'pool.ntp.org', m: 2 },
            { l: 'Auth Key', v: 'none', ro: true }
          ]
        },
        notes: ['Включение синхронизации времени', 'Список NTP-серверов через запятую']
      }],
      check: [{ d: 'терминал', c: '/system clock print\n/ip sntp-client print\n/system ntp client print' }]
    },
    {
      id: 'ip-settings', t: 'IP → Settings — параметры стека', lvl: 3,
      path: 'IP → Settings', tags: ['forward', 'rp-filter', 'syn-cookies'],
      purpose: 'Глобальные параметры IP-стека: разрешена ли маршрутизация (ip-forward), поведение при пересылке, защита от спуфинга (rp-filter), SYN-cookies и лимиты ICMP.',
      usage: [
        'Проверка, почему роутер не форвардит трафик (ip-forward=no).',
        'Включение rp-filter для защиты от IP-спуфинга на WAN.',
        'Ограничение ICMP для защиты от флуда.',
        'TCP-syncookies против SYN-flood.'
      ],
      steps: [
        { t: 'Откройте Settings', d: 'IP → Settings: ip-forward, send-redirects, accept-redirects, rp-filter, tcp-syncookies, icmp-rate-limit.' },
        { t: 'Форвардинг', d: 'ip-forward=yes — иначе роутер не пропускает трафик между интерфейсами.' },
        { t: 'Антиспуфинг', d: 'rp-filter=strict на WAN (или loose для асимметричной маршрутизации).' },
        { t: 'Защита от флуда', d: 'tcp-syncookies=yes, icmp-rate-limit=10 — снижает эффект простых атак.' },
        { t: 'Проверка', d: 'После изменений проверьте работу NAT и доступ к ресурсам.' }
      ],
      scenes: [{
        path: 'IP → Settings', win: 'IP Settings', noTools: true,
        form: {
          title: 'IP Settings', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'IPv4 Fast Path', v: 'yes', type: 'select' },
            { l: 'IP Forward', v: 'yes', type: 'select', m: 1 },
            { l: 'Send Redirects', v: 'no', type: 'select' },
            { l: 'Accept Redirects', v: 'no', type: 'select' },
            { l: 'Rp Filter', v: 'strict', type: 'select', m: 2 },
            { l: 'TCP Syncookies', v: 'yes', type: 'select' },
            { l: 'ICMP Rate Limit', v: '10' }
          ]
        },
        notes: ['Без ip-forward роутер не будет маршрутизировать трафик', 'strict рекомендован для WAN-интерфейсов']
      }],
      check: [{ d: 'терминал', c: '/ip settings print\n/ip settings print detail' }]
    },
    {
      id: 'ip-smb', t: 'IP → SMB — доступ к файлам роутера', lvl: 2,
      path: 'IP → SMB', tags: ['smb', 'файлы', 'безопасность'],
      purpose: 'SMB-сервер даёт доступ к файлам роутера (Files) как к сетевой папке. На практике чаще используется для быстрого забора бэкапов, но является лишней поверхностью атаки.',
      usage: [
        'Забрать бэкап конфигурации по сети.',
        'Скачать supout.rif без Winbox.',
        'Быстрый обмен файлами в закрытом сегменте.'
      ],
      steps: [
        { t: 'Включите SMB', d: 'IP → SMB: Enabled=yes, Domain=WORKGROUP, Allow Guest=no.' },
        { t: 'Ограничьте доступ', d: 'В поле Address указывайте только админскую подсеть.' },
        { t: 'Пользователь', d: 'System → Users: создайте пользователя с группой read и паролем.' },
        { t: 'Подключение', d: 'Клиент: `\\\\192.168.88.1\\` (Windows) — открывается корень Files.' },
        { t: 'Выключите после использования', d: 'Enabled=no — постоянный SMB на роутере не рекомендуется.' }
      ],
      scenes: [{
        path: 'IP → SMB', win: 'SMB', noTools: true,
        form: {
          title: 'SMB', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Enabled', v: 'no', type: 'select', m: 1 },
            { l: 'Domain', v: 'WORKGROUP' },
            { l: 'Allow Guest', v: 'no', type: 'select', m: 2 },
            { l: 'Address', v: '192.168.88.0/24', m: 3 }
          ]
        },
        notes: ['Оставьте выключенным, если не используете', 'Гостевой доступ всегда выключен', 'Доступ только из админской сети']
      }],
      check: [{ d: 'терминал', c: '/ip smb print' }],
      warn: 'Уязвимости SMB — известный вектор атак на RouterOS. Держите сервис выключенным, если он не нужен.'
    },
    {
      id: 'ip-upnp', t: 'IP → UPnP', lvl: 2,
      path: 'IP → UPnP', tags: ['upnp', 'проброс', 'игры'],
      purpose: 'UPnP позволяет приложениям и игровым консолям самостоятельно открывать порты на роутере. Удобно дома, но недопустимо в офисе: любое устройство может пробросить себе порт наружу.',
      usage: [
        'Домашние игровые консоли и торренты.',
        'Временное включение на гостевом роутере.',
        'Диагностика приложения, которое просит «открыть порт автоматически».'
      ],
      steps: [
        { t: 'Включите внутренний и внешний интерфейс', d: 'IP → UPnP: Enabled=yes, Internal Interfaces=bridge-lan, External Interfaces=WAN.' },
        { t: 'Разрешите в firewall', d: 'Правило input accept для udp/tcp 1900 от LAN (или разрешите сервис для админской сети).' },
        { t: 'Смотрите пробросы', d: 'IP → UPnP → вкладка Interfaces / список mappings — видно, кто что открыл.' },
        { t: 'Выключите в продакшене', d: 'Enabled=no; используйте явные правила dst-nat.' }
      ],
      scenes: [{
        path: 'IP → UPnP', win: 'UPnP', tabs: ['General', 'Interfaces'], noTools: true,
        form: {
          title: 'UPnP', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Enabled', v: 'no', type: 'select', m: 1 },
            { l: 'Internal Interfaces', v: 'bridge-lan', m: 2 },
            { l: 'External Interfaces', v: 'WAN', m: 3 }
          ]
        },
        notes: ['По умолчанию выключен — так и оставьте в офисе', 'Интерфейсы, которым разрешено открывать порты', 'Внешний интерфейс, на котором открываются порты']
      }],
      check: [{ d: 'терминал', c: '/ip upnp print\n/ip upnp interfaces print' }],
      warn: 'UPnP + открытый WAN = устройства сами пробивают дыры в firewall. В продакшене держите выключенным.'
    },
    {
      id: 'ip-vrf', t: 'IP → VRF — изоляция маршрутов', lvl: 3,
      path: 'IP → VRF', tags: ['vrf', 'изоляция', 'mpls'],
      purpose: 'VRF создаёт независимые таблицы маршрутизации. Один роутер может обслуживать несколько несвязанных сетей с одинаковой адресацией (например, два клиента с 192.168.1.0/24).',
      usage: [
        'Провайдер обслуживает нескольких клиентов с пересекающимися адресами.',
        'Изоляция гостевой сети от корпоративной на уровне маршрутов.',
        'Лабораторные стенды с «одинаковыми» сетями.'
      ],
      steps: [
        { t: 'Создайте VRF', d: 'IP → VRF → `+`: Name=`vrf-client1`, Interfaces=`vlan100-client1`.' },
        { t: 'Маршруты в VRF', d: 'IP → Routes → `+`: Routing Table=`vrf-client1`, Dst=0.0.0.0/0, Gateway=...' },
        { t: 'Сервисы', d: 'В DHCP-сервере и правилах firewall учитывайте, что интерфейс принадлежит VRF.' },
        { t: 'Проверка', d: 'IP → Routes → вкладка Tables: в таблице VRF свои маршруты, в main их нет.' }
      ],
      scenes: [{
        path: 'IP → VRF', win: 'VRF', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }],
        cols: [{ t: 'Name', w: 130 }, { t: 'Interfaces', w: 240 }, { t: 'Disabled', w: 76 }],
        rows: [[{ v: 'vrf-client1', m: 2 }, { v: 'vlan100-client1', m: 3 }, 'false']],
        sel: 0,
        notes: ['Кнопка создания VRF', 'Имя VRF — используется в правилах маршрутизации', 'Интерфейсы, входящие в эту VRF']
      }],
      check: [{ d: 'терминал', c: '/ip vrf print\n/ip route print where routing-table=vrf-client1' }]
    },
    {
      id: 'ip-webproxy', t: 'IP → Web Proxy', lvl: 3,
      path: 'IP → Web Proxy', tags: ['proxy', 'кэш', 'фильтрация'],
      purpose: 'Встроенный HTTP-прокси с кэшем и фильтрацией URL. Позволяет экономить трафик и ограничивать сайты, но плохо работает с HTTPS и нагружает CPU.',
      usage: [
        'Кэш для экономии канала в офисе (устаревший сценарий, но встречается).',
        'Ограничение доступа к сайтам по списку.',
        'Прозрачный прокси через NAT redirect.'
      ],
      steps: [
        { t: 'Включите прокси', d: 'IP → Web Proxy: Enabled=yes, Port=8080, Cache Administrator=admin@local.' },
        { t: 'Кэш', d: 'Вкладка Cache: Cache Size=100 MiB, Max Cache Object Size=1 MiB.' },
        { t: 'Запрет сайтов', d: 'Вкладка Access: `+`: Src=192.168.88.0/24, Dst Host=... Action=deny.' },
        { t: 'Прозрачный режим', d: 'NAT: chain=dstnat, protocol=tcp, dst-port=80, in-interface-list=LAN, action=redirect, to-ports=8080.' },
        { t: 'Проверка', d: 'Log/Proxy: счётчики hits/misses, список соединений.' }
      ],
      scenes: [{
        path: 'IP → Web Proxy', win: 'Web Proxy', tabs: ['General', 'Cache', 'Access', 'Direct'],
        noTools: true,
        form: {
          title: 'Web Proxy', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
            { l: 'Port', v: '8080', m: 2 },
            { l: 'Cache Size', v: '100 MiB' },
            { l: 'Max Object Size', v: '1 MiB' }
          ]
        },
        notes: ['Включает прокси-сервер', 'Порт, на который перенаправляется HTTP-трафик']
      }],
      check: [{ d: 'терминал', c: '/ip proxy print\n/ip proxy access print\n/ip proxy cache print' }],
      warn: 'HTTPS-трафик прокси не кэширует; для фильтрации сайтов используйте DNS-фильтрацию или firewall по address-list.'
    },
    {
      id: 'ip-misc', t: 'SOCKS, TFTP и Packing', lvl: 3,
      path: 'IP → SOCKS · IP → TFTP · IP → Packing',
      tags: ['socks', 'tftp', 'packing'],
      purpose: 'Три вспомогательных сервиса: SOCKS-прокси (перенаправление TCP через роутер), TFTP-сервер (прошивки/конфиги для сетевого оборудования) и Packing (снижение объёма трафика для туннелей за счёт сжатия и объединения пакетов).',
      usage: [
        'TFTP — обновление прошивок IP-телефонов и коммутаторов по сети.',
        'SOCKS — простой прокси для доступа в сеть через роутер.',
        'Packing — экономия канала на медленных VPN-линках (VoIP, терминалы).'
      ],
      steps: [
        { t: 'TFTP', d: 'IP → TFTP: Enabled=yes (только для доверенной сети). Файлы берутся из корня Files.' },
        { t: 'SOCKS', d: 'IP → SOCKS: Enabled=yes, Port=1080, Version=5. Используйте в приложении как прокси.' },
        { t: 'Packing', d: 'IP → Packing: Enabled=yes, Max Packet Size=1500, Max Packing Count=200 — применяется на туннелях.' },
        { t: 'Безопасность', d: 'Ограничьте адреса правилом input (TCP 1080/69) по адрес-листу.' }
      ],
      scenes: [{
        path: 'IP → TFTP', win: 'TFTP', noTools: true,
        form: {
          title: 'TFTP', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Enabled', v: 'no', type: 'select', m: 1 },
            { l: 'Secured Only', v: 'yes', type: 'select' },
            { l: 'Allow Rollover', v: 'no', type: 'select' },
            { l: 'Max Block Size', v: '1428' }
          ]
        },
        notes: ['Включайте только на время обновления прошивок']
      }],
      check: [{ d: 'терминал', c: '/ip tftp print\n/ip socks print\n/ip packing print' }]
    }
  ]
});

/* ---------------- IPv6 ---------------- */
window.DATA.push({
  id: 'ipv6', name: 'IPv6', ic: 'ip',
  items: [
    {
      id: 'ipv6-address', t: 'IPv6 → Address', lvl: 3,
      path: 'IPv6 → Address', tags: ['ipv6', 'адресация'],
      purpose: 'Назначение IPv6-адресов интерфейсам. Адрес можно получить от провайдера (DHCPv6/RA), взять из своего пула или назначить статически.',
      usage: [
        'Подключение к провайдеру с IPv6 (dual-stack).',
        'Собственная IPv6-адресация в офисе (ULA fd00::/8).',
        'Маршрутизация IPv6 между VLAN.'
      ],
      steps: [
        { t: 'Назначьте адрес', d: 'IPv6 → Address → `+`: Address=`2a01:db8:1::1/64`, Interface=bridge-lan, Advertise=yes.' },
        { t: 'Для LAN — ULA', d: '`fd00:10:10::1/64` — аналог приватных адресов, удобно внутри сети.' },
        { t: 'Advertise', d: 'Флаг Advertise включает анонс префикса клиентам через RA (аналог DHCP для IPv6).' },
        { t: 'Проверка', d: 'Клиенты должны получить адрес и маршрут по умолчанию через RA.' }
      ],
      scenes: [{
        path: 'IPv6 → Address', win: 'IPv6 Address List', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Address', w: 230 }, { t: 'Interface', w: 118 }, { t: 'Advertise', w: 84 }, { t: 'Dynamic', w: 70 }],
        rows: [
          [{ v: '2a01:db8:1::1/64', m: 2 }, { v: 'bridge-lan', m: 3 }, 'yes', 'false'],
          ['fd00:10:10::1/64', 'vlan10-office', 'yes', 'false']
        ],
        sel: 0,
        notes: ['Кнопка добавления адреса', 'Адрес с префиксом /64 для LAN', 'Интерфейс LAN']
      }],
      check: [{ d: 'терминал', c: '/ipv6 address print\n/ipv6 nd print' }]
    },
    {
      id: 'ipv6-dhcp-client', t: 'IPv6 → DHCP Client', lvl: 3,
      path: 'IPv6 → DHCP Client', tags: ['ipv6', 'dhcpv6', 'wan'],
      purpose: 'Клиент DHCPv6 получает от провайдера IPv6-адрес и/или префикс для раздачи в LAN (prefix delegation).',
      usage: [
        'Провайдер выдаёт IPv6 по DHCPv6.',
        'Получение префикса /56 и разбиение на подсети VLAN.',
        'Резервный канал с IPv6.'
      ],
      steps: [
        { t: 'Создайте клиента', d: 'IPv6 → DHCP Client → `+`: Interface=WAN, Request=address,prefix, Add Default Route=yes, Pool Name=`pool6-wan`.' },
        { t: 'Раздайте префикс', d: 'IPv6 → Address → `+`: From Pool=`pool6-wan`, Interface=bridge-lan, Advertise=yes.' },
        { t: 'Проверка', d: 'IPv6 → Address покажет полученный адрес с флагом D.' },
        { t: 'Маршрут', d: 'При Add Default Route=yes появится ::/0 через провайдера.' }
      ],
      scenes: [{
        path: 'IPv6 → DHCP Client', win: 'IPv6 DHCP Client', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Interface', w: 96 }, { t: 'Address', w: 210 }, { t: 'Status', w: 90 }, { t: 'Pool Name', w: 110 }],
        rows: [[{ v: 'WAN', m: 2 }, '2a01:db8:100::7/64', { v: 'bound', c: 'ok' }, 'pool6-wan']],
        sel: 0,
        notes: ['Кнопка добавления клиента', 'WAN-интерфейс']
      }],
      check: [{ d: 'терминал', c: '/ipv6 dhcp-client print detail\n/ipv6 pool print' }]
    },
    {
      id: 'ipv6-dhcp-server', t: 'IPv6 → DHCP Server', lvl: 3,
      path: 'IPv6 → DHCP Server', tags: ['ipv6', 'dhcpv6'],
      purpose: 'DHCPv6-сервер выдаёт адреса и параметры (DNS) клиентам. В IPv6 адреса обычно приходят и по RA, поэтому DHCPv6 чаще используется для DNS и точного контроля.',
      usage: [
        'Выдача DNS-серверов клиентам IPv6.',
        'Адресация устройств, не поддерживающих SLAAC.',
        'Гостевая сеть с отдельным пулом IPv6.'
      ],
      steps: [
        { t: 'Создайте пул', d: 'IPv6 → Pool → `+`: Name=`pool6-lan`, Prefix=`2a01:db8:1::/64`, Prefix Length=64.' },
        { t: 'DHCP-сервер', d: 'IPv6 → DHCP Server → `+`: Name=`dhcp6-lan`, Interface=bridge-lan, Address Pool=pool6-lan, Address Prefix Length=64.' },
        { t: 'Bindings', d: 'Вкладка Bindings показывает выданные адреса.' },
        { t: 'RA', d: 'IPv6 → ND: включите advertise для интерфейса LAN, чтобы клиенты получали маршрут.' }
      ],
      scenes: [{
        path: 'IPv6 → DHCP Server', win: 'IPv6 DHCP Server', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Name', w: 110 }, { t: 'Interface', w: 118 }, { t: 'Address Pool', w: 120 }, { t: 'Prefix Length', w: 100 }, { t: 'Disabled', w: 70 }],
        rows: [[{ v: 'dhcp6-lan', m: 2 }, { v: 'bridge-lan', m: 3 }, 'pool6-lan', '64', 'false']],
        sel: 0,
        notes: ['Кнопка создания сервера', 'Имя сервера', 'Интерфейс раздачи']
      }],
      check: [{ d: 'терминал', c: '/ipv6 dhcp-server print\n/ipv6 dhcp-server binding print' }]
    },
    {
      id: 'ipv6-nd', t: 'IPv6 → ND — анонсы префикса', lvl: 3,
      path: 'IPv6 → ND', tags: ['nd', 'ra', 'slaac'],
      purpose: 'Neighbor Discovery — аналог ARP в IPv6 плюс Router Advertisement: роутер анонсирует префикс и себя как шлюз по умолчанию. Без RA клиенты не получат маршрут.',
      usage: [
        'Автоконфигурация клиентов (SLAAC).',
        'Раздача маршрута по умолчанию для IPv6-сети.',
        'Настройка M/O-флагов, чтобы клиенты шли за адресом в DHCPv6.'
      ],
      steps: [
        { t: 'Включите ND на интерфейсе', d: 'IPv6 → ND → `+`: Interface=bridge-lan, RA Delay=3s, RA Interval=200-600s, RA Lifetime=30m.' },
        { t: 'Префикс', d: 'Адрес интерфейса должен иметь флаг Advertise=yes (IPv6 → Address).' },
        { t: 'Флаги', d: 'Managed Address Configuration=no (SLAAC), Other Configuration=yes, если DNS выдаёт DHCPv6.' },
        { t: 'Проверка', d: 'На клиенте `ip -6 route` покажет default via адрес роутера.' }
      ],
      scenes: [{
        path: 'IPv6 → ND', win: 'IPv6 ND', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Interface', w: 118 }, { t: 'RA Interval', w: 110 }, { t: 'RA Delay', w: 80 }, { t: 'RA Lifetime', w: 96 }, { t: 'Managed', w: 78 }],
        rows: [[{ v: 'bridge-lan', m: 2 }, { v: '200s-600s' }, '3s', '30m', 'no']],
        sel: 0,
        notes: ['Кнопка добавления ND', 'Интерфейс, где анонсируется префикс']
      }],
      check: [{ d: 'терминал', c: '/ipv6 nd print detail\n/ipv6 neighbor print' }]
    },
    {
      id: 'ipv6-firewall', t: 'IPv6 → Firewall', lvl: 3,
      path: 'IPv6 → Firewall → Filter Rules', tags: ['ipv6', 'firewall'],
      purpose: 'Отдельный firewall для IPv6. Правила IPv4 здесь не действуют — если IPv6 включён, а фильтр не настроен, устройство открыто в IPv6-интернете.',
      usage: [
        'Закрыть вход на роутер по IPv6 из интернета.',
        'Разрешить ICMPv6 (критично для работы IPv6!).',
        'Сегментация IPv6-трафика между VLAN.'
      ],
      steps: [
        { t: 'Базовый набор', d: 'input: accept established,related; accept icmpv6 (типы 1,2,128,129,133-136); accept LAN; drop WAN.' },
        { t: 'Forward', d: 'accept established,related; drop invalid; accept LAN→WAN; drop всё остальное.' },
        { t: 'ICMPv6 обязателен', d: 'Без ICMPv6 (особенно type 133-136) не работает SLAAC и neighbor discovery — сеть «ломается».' },
        { t: 'Проверка', d: 'IPv6 → Firewall → счётчики; тест с внешнего адреса.' }
      ],
      scenes: [{
        path: 'IPv6 → Firewall → Filter Rules', win: 'IPv6 Firewall', tab: 'Filter Rules',
        tabs: ['Filter Rules', 'NAT', 'Mangle', 'Raw', 'Connections'],
        cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 76 }, { t: 'Action', w: 74 }, { t: 'Protocol', w: 86 }, { t: 'Connection State', w: 128 }, { t: 'Comment', w: 190 }],
        rows: [
          ['0', 'input', { v: 'accept', c: 'ok' }, '', 'established,related', 'accept established'],
          ['1', 'input', 'accept', { v: 'icmpv6', m: 1 }, '', 'ND, SLAAC, ping'],
          ['2', 'input', { v: 'drop', c: 'no', m: 2 }, '', '', 'drop from WAN']
        ],
        sel: 1,
        notes: ['ICMPv6 нельзя блокировать полностью — сломается автоконфигурация', 'Финальный drop для входа из интернета']
      }],
      check: [{ d: 'терминал', c: '/ipv6 firewall filter print stats\n/ipv6 firewall connection print count-only' }]
    },
    {
      id: 'ipv6-routes', t: 'IPv6 → Routes', lvl: 3,
      path: 'IPv6 → Routes', tags: ['ipv6', 'маршруты'],
      purpose: 'Таблица маршрутизации IPv6: маршрут по умолчанию от провайдера, статические маршруты в филиалы, маршруты через туннели.',
      usage: [
        'Маршрут по умолчанию ::/0 при статическом IPv6 от провайдера.',
        'Маршруты в IPv6-филиалы через WireGuard.',
        'Разделение трафика между двумя IPv6-каналами.'
      ],
      steps: [
        { t: 'Откройте Routes', d: 'IPv6 → Routes: флаги A/D/S, Dst. Address, Gateway.' },
        { t: 'Default route', d: '`+`: Dst=::/0, Gateway=2a01:db8:100::1, Distance=1.' },
        { t: 'Через туннель', d: '`+`: Dst=2a01:db8:50::/64, Gateway=wg-branch.' },
        { t: 'Проверка', d: 'Tools → Ping: адрес назначения IPv6.' }
      ],
      scenes: [{
        path: 'IPv6 → Routes', win: 'IPv6 Route List',
        cols: [{ t: 'A', w: 26 }, { t: 'Dst. Address', w: 190 }, { t: 'Gateway', w: 200 }, { t: 'Distance', w: 76 }, { t: 'Comment', w: 150 }],
        rows: [
          [{ v: 'AS', c: 'ok' }, { v: '::/0', m: 1 }, { v: '2a01:db8:100::1', m: 2 }, '1', 'провайдер'],
          ['AS', '2a01:db8:50::/64', 'wg-branch', '1', 'филиал']
        ],
        sel: 0,
        notes: ['Маршрут по умолчанию для всего IPv6', 'Шлюз провайдера']
      }],
      check: [{ d: 'терминал', c: '/ipv6 route print\n/ping 2606:4700:4700::1111 count=3' }]
    }
  ]
});
