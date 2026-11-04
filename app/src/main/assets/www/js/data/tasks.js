/* Раздел «Реальные задачи продакшн» */
window.DATA = window.DATA || [];
window.DATA.push({
  id: 'tasks', name: 'Задачи PROD', ic: 'task',
  items: [
    {
      id: 'task-lan-internet', t: 'Офис: интернет, NAT и firewall «под ключ»', lvl: 1,
      path: 'IP → Address · DHCP · Firewall', tags: ['офис', 'nat', 'firewall', 'база'],
      purpose: 'Полный продакшн-сценарий «с нуля»: роутер получает адрес от провайдера, раздаёт 192.168.88.0/24, транслирует адреса и закрывает всё лишнее. Это тот шаблон, который в 90% случаев просят «настроить интернет в офисе».',
      usage: [
        'Новый офис на 5–50 человек.',
        'Замена старого роутера с сохранением схемы адресации.',
        'Типовой шаблон для быстрого развёртывания филиалов.'
      ],
      steps: [
        { t: 'Сброс и базовые имена', d: 'System → Reset Configuration (No Default Config) → System → Identity=`by-minsk-office-gw` → Interface: ether1=`WAN`, ether2–5=`LAN1…LAN4`.' },
        { t: 'Мост LAN', d: 'Bridge → Bridge `+` name=bridge-lan (rstp) → Bridge → Ports: ether2–ether5 → bridge-lan.' },
        { t: 'WAN', d: 'IP → DHCP Client `+` Interface=WAN, Use Peer DNS=yes, Add Default Route=yes. Если статика — IP → Address + Route 0.0.0.0/0.' },
        { t: 'LAN-адрес и DHCP', d: 'IP → Address `+` 192.168.88.1/24 на bridge-lan → IP → DHCP Server → DHCP Setup (интерфейс bridge-lan, пул .10–.254, DNS 192.168.88.1).' },
        { t: 'DNS', d: 'IP → DNS: Servers=1.1.1.1,8.8.8.8, Allow Remote Requests=yes.' },
        { t: 'Firewall input', d: 'accept established,related → drop invalid → accept icmp (limit 10/s) → accept in-interface-list=LAN → drop in-interface-list=WAN.' },
        { t: 'Firewall forward', d: 'accept established,related → drop invalid → fasttrack established,related → accept LAN→WAN → drop всё остальное.' },
        { t: 'NAT', d: 'IP → Firewall → NAT `+`: chain=srcnat, out-interface-list=WAN, action=masquerade.' },
        { t: 'Сервисы управления', d: 'IP → Services: winbox/ssh только из 192.168.88.0/24, telnet/ftp/www/api — disable.' },
        { t: 'Финализация', d: 'IP → Cloud DDNS=yes, System → Note с контактами, NTP Client=yes, Files → Backup + export, Scheduler с ночным бэкапом.' }
      ],
      scenes: [
        {
          path: 'IP → Firewall → Filter Rules', win: 'Firewall', tab: 'Filter Rules',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
          cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 68 }, { t: 'Action', w: 124 }, { t: 'Connection State', w: 118 }, { t: 'In. Interface List', w: 116 }, { t: 'Comment', w: 230 }],
          rows: [
            ['0', 'input', { v: 'accept', c: 'ok' }, 'established,related', '', 'established'],
            ['1', 'input', 'drop', 'invalid', '', 'invalid'],
            ['2', 'input', 'accept', '', '', 'icmp (limit)'],
            ['3', 'input', 'accept', '', 'LAN', 'LAN to router'],
            ['4', 'input', { v: 'drop', c: 'no' }, '', 'WAN', 'drop WAN'],
            ['5', 'forward', 'accept', 'established,related', '', 'established'],
            ['6', 'forward', 'fasttrack-connection', 'established,related', '', 'fasttrack'],
            ['7', 'forward', { v: 'drop', c: 'no' }, '', '', 'drop all else']
          ],
          sel: 4,
          notes: []
        }
      ],
      check: [{
        d: 'финальная проверка',
        c: '/ip address print\n/ip route print where dst-address=0.0.0.0/0\n/ip firewall filter print stats\n/ip firewall nat print\n/ip dhcp-server lease print\n/ping 1.1.1.1 count=3'
      }],
      mistakes: [
        'Правило drop стоит выше accept — доступ пропадает у всех.',
        'FastTrack добавляется раньше фильтрации — трафик обходит часть правил.',
        'DNS Allow Remote Requests без закрытого порта 53 из интернета.'
      ],
      links: [{ t: 'Building Advanced Firewall', u: 'https://help.mikrotik.com/docs/spaces/ROS/pages/48660587/Building+Advanced+Firewall' }]
    },
    {
      id: 'task-port-forward', t: 'Проброс портов: камера, NAS, RDP', lvl: 1,
      path: 'IP → Firewall → NAT (dstnat)', tags: ['проброс', 'nat', 'camera'],
      purpose: 'Публикация внутреннего сервиса в интернет: одна или несколько внешних портов перенаправляются на внутренний адрес. Чаще всего просят для видеонаблюдения, NAS, RDP и IP-АТС.',
      usage: [
        'Доступ к веб-интерфейсу видеорегистратора.',
        'RDP/SSH к офисному серверу (лучше через VPN).',
        'FTP/SFTP на NAS.',
        'Hairpin — доступ к сервису изнутри по внешнему адресу.'
      ],
      steps: [
        { t: 'Зафиксируйте IP сервера', d: 'IP → DHCP Server → Leases: найдите устройство → Make Static, или задайте статический адрес на самом устройстве.' },
        { t: 'Правило dstnat', d: 'IP → Firewall → NAT `+`: Chain=dstnat, Protocol=tcp, Dst. Port=`8080`, In. Interface List=WAN, Action=`dst-nat`, To Addresses=`192.168.88.50`, To Ports=`80`.' },
        { t: 'Hairpin NAT', d: 'Второе правило: Chain=srcnat, Src. Address=`192.168.88.0/24`, Dst. Address=`192.168.88.50`, Protocol=tcp, Dst. Port=80, Action=masquerade.' },
        { t: 'Firewall forward', d: 'Разрешающее правило: chain=forward, dst-address=192.168.88.50, protocol=tcp, dst-port=80, in-interface-list=WAN, action=accept. Ставьте его до финального drop.' },
        { t: 'Ограничьте источники', d: 'Если сервис нужен только своим: Src. Address List=`admin-allow` вместо открытого доступа.' },
        { t: 'Проверьте снаружи', d: 'С мобильного интернета откройте http://<внешний IP>:8080. Если не работает — проверьте CGNAT у провайдера (внешний адрес 100.64.0.0/10 или 10.x).' }
      ],
      scenes: [{
        path: 'IP → Firewall → NAT', win: 'Firewall', tab: 'NAT',
        tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
        cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 68 }, { t: 'Protocol', w: 66 }, { t: 'Dst. Port', w: 68 }, { t: 'In. Interface List', w: 112 }, { t: 'Action', w: 88 }, { t: 'To Addresses', w: 120 }, { t: 'To Ports', w: 70 }],
        rows: [
          ['0', 'srcnat', '', '', '', { v: 'masquerade', c: 'ok' }, '', ''],
          ['1', { v: 'dstnat', m: 1 }, 'tcp', { v: '8080', m: 2 }, { v: 'WAN', m: 3 }, { v: 'dst-nat', m: 4 }, { v: '192.168.88.50', m: 5 }, '80'],
          ['2', 'srcnat', 'tcp', '80', '', 'masquerade', '192.168.88.0/24', '']
        ],
        sel: 1,
        notes: ['Правило входящих подключений', 'Внешний порт', 'Только с WAN', 'Действие dst-nat', 'Внутренний адрес устройства']
      }],
      check: [{
        d: 'диагностика проброса',
        c: '/ip firewall nat print\n/ip firewall connection print where dst-port~"8080"\n/ip firewall filter print where comment~"8080"'
      }],
      warn: 'RDP и веб-интерфейсы камер — самые атакуемые сервисы. Используйте нестандартные порты, ограничение по адресам и VPN вместо проброса.',
      mistakes: [
        'Забыли разрешающее правило forward — соединение не устанавливается.',
        'Проброс работает изнутри, но не снаружи: нужен hairpin для внутренних проверок.',
        'Провайдер в CGNAT — внешний порт недоступен, нужен публичный IP или VPN.'
      ]
    },
    {
      id: 'task-guest-wifi', t: 'Гостевая Wi-Fi сеть с изоляцией', lvl: 2,
      path: 'WiFi → Security · Bridge VLAN · Firewall', tags: ['гости', 'wifi', 'изоляция'],
      purpose: 'Отдельный SSID для гостей, который не видит корпоративную сеть, но имеет интернет через тот же роутер. Классическая задача для офиса, кафе, коворкинга.',
      usage: [
        'Гостевой доступ в офисе без доступа к файлам и серверам.',
        'Клиентская сеть в кафе с ограничением скорости.',
        'Изоляция устройств IoT от рабочей сети.'
      ],
      steps: [
        { t: 'Создайте VLAN', d: 'Interface → VLAN `+`: name=vlan20-guest, VLAN ID=20, interface=bridge-lan. IP → Address `+`: 10.20.0.1/24.' },
        { t: 'DHCP для гостей', d: 'IP → Pool `+` pool-guest 10.20.0.10–10.20.0.100 → DHCP Server `+` interface=vlan20-guest, network=10.20.0.0/24, gateway=10.20.0.1, DNS=10.20.0.1.' },
        { t: 'SSID', d: 'WiFi → Security `+` sec-guest (wpa2-psk, пароль) → WiFi → WiFi `+`: master=radio1, SSID=`Office-Guest`, security=sec-guest, datapath: VLAN ID=20 (или бридж через vlan20).' },
        { t: 'Изоляция клиентов', d: 'В конфигурации/datapath включите Client Isolation (или default-forwarding=no), чтобы гости не видели друг друга.' },
        { t: 'Firewall', d: 'forward: drop in=vlan20-guest out=bridge-lan; accept in=vlan20-guest out-interface-list=WAN; drop in=vlan20-guest (остальное).' },
        { t: 'Ограничение скорости', d: 'Queues → Simple Queues `+`: target=10.20.0.0/24, max-limit=10M/10M.' },
        { t: 'DNS и блокировки', d: 'Гостям выдавайте внешний DNS или отдельный фильтр; при необходимости DNS redirect в NAT.' }
      ],
      scenes: [
        {
          path: 'IP → Firewall → Filter Rules', win: 'Firewall', tab: 'Filter Rules',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
          cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 70 }, { t: 'Action', w: 70 }, { t: 'In. Interface', w: 108 }, { t: 'Out. Interface', w: 108 }, { t: 'Comment', w: 220 }],
          rows: [
            ['0', 'forward', { v: 'drop', c: 'no', m: 1 }, { v: 'vlan20-guest', m: 2 }, { v: 'bridge-lan', m: 3 }, 'guest → LAN запрещён'],
            ['1', 'forward', 'accept', 'vlan20-guest', 'WAN', 'guest → internet'],
            ['2', 'forward', 'drop', 'vlan20-guest', '', 'остальное запрещено']
          ],
          sel: 0,
          notes: ['Правило изоляции гостей от корпоративной сети', 'Интерфейс гостевой VLAN', 'Корпоративный мост — доступ закрыт']
        },
        {
          path: 'WiFi → WiFi', win: 'WiFi Interfaces', tabs: ['WiFi', 'Security', 'Access List', 'Registration'],
          cols: [{ t: 'Name', w: 96 }, { t: 'Master Interface', w: 124 }, { t: 'SSID', w: 130 }, { t: 'Security', w: 110 }, { t: 'Datapath', w: 120 }, { t: 'Disabled', w: 70 }],
          rows: [
            ['wifi1', 'radio1', 'Office', 'sec-office', 'bridge=bridge-lan', 'false'],
            [{ v: 'wifi-guest', m: 1 }, { v: 'radio1', m: 2 }, { v: 'Office-Guest', m: 3 }, { v: 'sec-guest', m: 4 }, { v: 'vlan-id=20', m: 5 }, 'false']
          ],
          sel: 1,
          notes: ['Гостевой интерфейс', 'То же радио — можно вешать несколько SSID', 'Имя гостевой сети', 'Отдельный пароль', 'Гостевой трафик уходит в VLAN 20']
        }
      ],
      check: [{
        d: 'проверка изоляции',
        c: '/interface bridge vlan print\n/ip firewall filter print stats\n/ping 192.168.88.1 interface=vlan20-guest count=2\n/ping 8.8.8.8 interface=vlan20-guest count=2'
      }],
      warn: 'Гостевая сеть без изоляции клиентов превращается в рассадник атак: включите default-forwarding=no и запретите forward в LAN.'
    },
    {
      id: 'task-vlan-office', t: 'VLAN-сегментация офиса (10/20/30/100)', lvl: 3,
      path: 'Bridge → VLANs · Interface → VLAN · Firewall', tags: ['vlan', 'сегментация', 'офис'],
      purpose: 'Разделение офиса на изолированные сегменты: сотрудники, гости, камеры/IoT, управление. Каждый сегмент — своя подсеть, свой DHCP, свои правила доступа. Работает на одном коммутаторе и одной точке доступа.',
      usage: [
        'Офис, где гости не должны видеть серверы, а камеры — рабочие станции.',
        'Соблюдение требований безопасности (PCI/ISO): сегментация сетей.',
        'Подготовка к внедрению VoIP: отдельная VLAN для телефонов с приоритетом.'
      ],
      steps: [
        { t: 'План VLAN', d: '10 — сотрудники 10.10.10.0/24; 20 — гости 10.20.0.0/24; 30 — камеры 10.30.0.0/24; 100 — управление 10.100.0.0/24.' },
        { t: 'Bridge VLAN Filtering', d: 'Bridge → Ports: access-порты получают PVID 10/20/30; транк к коммутатору — PVID 1. Bridge → VLANs: записи 10/20/30/100 с tagged=bridge-lan для маршрутизации роутером.' },
        { t: 'VLAN-интерфейсы', d: 'Interface → VLAN `+` для каждой VLAN поверх bridge-lan → IP → Address `+` .1/24.' },
        { t: 'DHCP для каждой VLAN', d: 'IP → DHCP Server `+` по серверу на VLAN, свой пул и DNS.' },
        { t: 'Wi-Fi', d: 'Отдельные SSID с datapath VLAN ID (10 для сотрудников, 20 для гостей).' },
        { t: 'Правила forward', d: 'Разрешите: сотрудники → все сегменты (кроме управления); гости → WAN; камеры → только регистратор; управление → только админская подсеть.' },
        { t: 'Проверка и откат', d: 'Работайте в Safe Mode. Проверьте: `Bridge → Hosts` (VID у MAC), ping между VLAN, доступ в интернет.' }
      ],
      scenes: [{
        path: 'Bridge → VLANs', win: 'Bridge VLAN Table',
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'VLAN IDs', w: 76 }, { t: 'Tagged', w: 150 }, { t: 'Untagged', w: 190 }, { t: 'Comment', w: 160 }],
        rows: [
          [{ v: '10', m: 2 }, { v: 'bridge-lan', m: 3 }, { v: 'ether2, ether3', m: 4 }, 'сотрудники'],
          ['20', 'bridge-lan', 'ether4', 'гости'],
          ['30', 'bridge-lan', 'ether5', 'камеры'],
          ['100', 'bridge-lan, ether1', '', 'управление']
        ],
        sel: 0,
        notes: ['Кнопка создания записи VLAN', 'VLAN ID', 'Мост тегируется — роутер сможет маршрутизировать эту VLAN', 'Порты доступа (нетегированные)']
      }],
      check: [{
        d: 'проверка сегментации',
        c: '/interface bridge vlan print\n/interface bridge port print where pvid>1\n/ip address print where interface~"vlan"\n/ip firewall filter print stats'
      }],
      danger: 'Включение VLAN Filtering с неполной таблицей VLAN отрезает доступ. Управление держите в отдельной VLAN с untagged-портом либо используйте консоль/Safe Mode.'
    },
    {
      id: 'task-failover', t: 'Два провайдера: резервный канал (failover)', lvl: 2,
      path: 'IP → Routes · Tools → Netwatch', tags: ['failover', 'два провайдера', 'резерв'],
      purpose: 'Основной канал работает, резервный включается автоматически при аварии. Простое и надёжное решение без PCC: маршруты по умолчанию с разной distance и проверкой шлюза.',
      usage: [
        'Офис с требованием непрерывного интернета.',
        'Магазин/склад: резерв через LTE-модем.',
        'Переключение на второго провайдера при аварии у первого.'
      ],
      steps: [
        { t: 'Настройте оба WAN', d: 'WAN1 — ether1 (DHCP/PPPoE), WAN2 — ether2 или lte1. Убедитесь, что у каждого свой DHCP-клиент/адрес.' },
        { t: 'Списки интерфейсов', d: 'Interface → Interface List: WAN = ether1, lte1. Так правила будут едиными.' },
        { t: 'Маршруты', d: 'IP → Routes: 0.0.0.0/0 gateway=WAN1 distance=1 check-gateway=ping; второй 0.0.0.0/0 gateway=WAN2 distance=10 check-gateway=ping.' },
        { t: 'NAT на оба', d: 'Firewall → NAT: srcnat out-interface-list=WAN masquerade (одно правило на оба канала).' },
        { t: 'Netwatch для уведомлений', d: 'Tools → Netwatch host=8.8.8.8: on-down → `/tool e-mail send ...` и запись в лог. Переключение маршрутов произойдёт само.' },
        { t: 'Проверка', d: 'Отключите кабель WAN1: маршрут через WAN2 станет активным (флаг A), интернет должен продолжить работать через 5–20 секунд.' }
      ],
      scenes: [{
        path: 'IP → Routes', win: 'Route List', tabs: ['Routes', 'Nexthops'],
        cols: [{ t: 'A', w: 26 }, { t: 'Dst. Address', w: 120 }, { t: 'Gateway', w: 170 }, { t: 'Distance', w: 76 }, { t: 'Check Gateway', w: 110 }, { t: 'Comment', w: 130 }],
        rows: [
          [{ v: 'AS', c: 'ok' }, { v: '0.0.0.0/0', m: 1 }, { v: '203.0.113.1 reachable', m: 2 }, { v: '1', m: 3 }, { v: 'ping', m: 4 }, 'основной'],
          [{ v: 'S', c: 'no' }, '0.0.0.0/0', '10.71.14.9 reachable', '10', 'ping', 'резерв LTE']
        ],
        sel: 0,
        notes: ['Маршрут по умолчанию', 'Шлюз провайдера', 'Меньшая distance — приоритет', 'Проверка шлюза пингом: при отказе маршрут станет неактивным']
      }],
      check: [{
        d: 'проверка переключения',
        c: '/ip route print where dst-address=0.0.0.0/0\n/ip route print where active=yes\n/log print where topics~"netwatch"'
      }],
      mistakes: ['Оба маршрута с одинаковой distance — трафик пойдёт «как получится».', 'Нет check-gateway: маршрут остаётся активным, даже когда шлюз не отвечает.', 'Разные правила NAT для каждого WAN — забыли один.']
    },
    {
      id: 'task-pcc', t: 'Балансировка двух провайдеров (PCC)', lvl: 3,
      path: 'IP → Firewall → Mangle (PCC)', tags: ['pcc', 'балансировка', 'два провайдера'],
      purpose: 'PCC (Per Connection Classifier) распределяет новые соединения между двумя каналами, суммируя скорость. Каждое соединение остаётся на своём канале — сайты и банки не «отваливаются».',
      usage: [
        'Офис, которому нужна суммарная полоса двух каналов.',
        'Домашний роутер с двумя провайдерами.',
        'Резерв + балансировка одновременно.'
      ],
      steps: [
        { t: 'Подготовьте каналы', d: 'Два WAN с адресами, оба в списке WAN, NAT masquerade на out-interface-list=WAN.' },
        { t: 'Маркируйте вход', d: 'Mangle: chain=prerouting, in-interface-list=LAN, dst-address-type=!local, per-connection-classifier=both-addresses:2/0, action=mark-connection, new-connection-mark=conn-wan1. Второе правило с 2/1 → conn-wan2.' },
        { t: 'Маркируйте маршрут', d: 'Mangle: chain=prerouting, in-interface-list=LAN, connection-mark=conn-wan1, action=mark-routing, new-routing-mark=to-wan1 (и аналогично wan2).' },
        { t: 'Таблицы и маршруты', d: 'Routing → Tables: `to-wan1`, `to-wan2`. IP → Routes: 0.0.0.0/0 через шлюз WAN1 в таблице to-wan1, через WAN2 — в to-wan2. Каждый с check-gateway=ping.' },
        { t: 'Резервирование', d: 'Distance: у основного 1, у второго 10 в каждой таблице — если один канал упал, трафик уходит на второй.' },
        { t: 'Исключения', d: 'Банковские сайты, VPN и почту лучше закрепить на одном канале через address-list + отдельное правило.' },
        { t: 'Проверка', d: 'Firewall → Connections: у новых сессий разные connection-mark; замер скорости показывает суммарный канал.' }
      ],
      scenes: [{
        path: 'IP → Firewall → Mangle', win: 'Firewall', tab: 'Mangle',
        tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Connections'],
        cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 80 }, { t: 'Per Connection Classifier', w: 190 }, { t: 'Action', w: 130 }, { t: 'New Conn. Mark', w: 120 }, { t: 'New Routing Mark', w: 120 }],
        rows: [
          ['0', { v: 'prerouting', m: 1 }, { v: 'both-addresses:2/0', m: 2 }, { v: 'mark-connection', m: 3 }, { v: 'conn-wan1', m: 4 }, ''],
          ['1', 'prerouting', 'both-addresses:2/1', 'mark-connection', 'conn-wan2', ''],
          ['2', 'prerouting', 'connection-mark=conn-wan1', 'mark-routing', '', { v: 'to-wan1', m: 5 }]
        ],
        sel: 0,
        notes: ['Prerouting — до выбора маршрута', 'Делит соединения 50/50 по адресам', 'Помечает соединение', 'Метка первого канала', 'Правило маршрутизации в таблицу канала']
      }],
      check: [{
        d: 'проверка PCC',
        c: '/ip firewall mangle print stats\n/ip firewall connection print where connection-mark~"conn"\n/ip route print where routing-table~"to-wan"'
      }],
      warn: 'PCC не суммирует скорость одного соединения: одно скачивание идёт по одному каналу. Для одного потока нужен bonding/multipath на стороне провайдера.'
    },
    {
      id: 'task-qos', t: 'QoS: приоритет VoIP и ограничение загрузок', lvl: 3,
      path: 'Mangle · Queue Tree · Queue Types', tags: ['qos', 'voip', 'приоритет'],
      purpose: 'Настройка приоритетов: голос и видеозвонки всегда проходят первыми, торренты и обновления уступают. Убирает «кваканье» в звонках и просадки отзывчивости при загрузке канала.',
      usage: [
        'Офис с IP-телефонией и видеоконференциями.',
        'Многоквартирный дом с общим каналом.',
        'Филиал с тонким каналом и критичным трафиком.'
      ],
      steps: [
        { t: 'Определите полосу', d: 'Реальная скорость канала (Bandwidth Test) минус 10% — это Max Limit родительской очереди. Важно: не завышать.' },
        { t: 'Пометьте VoIP', d: 'Mangle: chain=forward, protocol=udp, dst-port=5060,10000-20000, action=mark-packet, new-packet-mark=voip, passthrough=no.' },
        { t: 'Пометьте загрузки', d: 'Mangle: chain=forward, protocol=tcp, dst-port=443, action=mark-packet, new-packet-mark=bulk (или по адрес-листу торрент-портов).' },
        { t: 'Родительская очередь', d: 'Queue Tree `+`: name=wan-up, parent=WAN, max-limit=90M (реальная скорость × 0.9).' },
        { t: 'Дочерние', d: '`+` voip: parent=wan-up, packet-mark=voip, priority=1, limit-at=5M, max-limit=10M. `+` bulk: priority=8, max-limit=80M.' },
        { t: 'Тип очереди', d: 'Queues → Queue Types: для bulk используйте cake или fq_codel — это убирает bufferbloat.' },
        { t: 'Проверка', d: 'Запустите speedtest и одновременно ping: задержка не должна расти в разы. Разговоры не должны прерываться.' }
      ],
      scenes: [{
        path: 'Queues → Queue Tree', win: 'Queue Tree', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 96 }, { t: 'Parent', w: 96 }, { t: 'Packet Mark', w: 100 }, { t: 'Limit At', w: 84 }, { t: 'Max Limit', w: 92 }, { t: 'Priority', w: 70 }, { t: 'Rate', w: 84 }],
        rows: [
          [{ v: 'wan-up', m: 2 }, { v: 'WAN', m: 3 }, '', '', { v: '90M', m: 4 }, '8', '61 Mbps'],
          [{ v: 'voip', m: 5 }, 'wan-up', { v: 'voip', m: 6 }, '5M', { v: '10M', m: 7 }, '1', '1.9 Mbps'],
          ['bulk', 'wan-up', 'bulk', '', '80M', '8', '58 Mbps']
        ],
        sel: 1,
        notes: ['Кнопка создания очереди', 'Родительская очередь', 'Parent — интерфейс канала', '90% реальной скорости', 'Очередь голоса', 'Метка из mangle', 'Приоритет 1 — самый высокий']
      }],
      check: [{
        d: 'проверка QoS',
        c: '/queue tree print stats\n/ip firewall mangle print where action=mark-packet\n/queue type print where name~"cake"'
      }],
      mistakes: ['Max Limit родителя выше реальной скорости канала — очередь не работает.', 'Метки ставятся после fasttrack — трафик уходит мимо очередей.', 'Слишком много мелких очередей — нагрузка на CPU.']
    },
    {
      id: 'task-wg-site', t: 'Site-to-site WireGuard: офис ↔ филиал', lvl: 3,
      path: 'WireGuard · IP → Address · Routes', tags: ['wireguard', 'site-to-site', 'филиал'],
      purpose: 'Постоянный зашифрованный туннель между двумя офисами: сети видят друг друга как напрямую, без публикации сервисов в интернет.',
      usage: [
        'Доступ филиала к серверам 1С/файлам в главном офисе.',
        'Объединение нескольких объектов в одну сеть.',
        'Резервный путь на случай падения основного канала.'
      ],
      steps: [
        { t: 'Адресация туннеля', d: 'Выберите подсеть туннеля, например 10.10.10.0/30: офис .1, филиал .2.' },
        { t: 'Офис: интерфейс', d: 'Interface → WireGuard `+`: name=wg-branch, listen-port=13231. Скопируйте публичный ключ (вкладка Private Keys).' },
        { t: 'Офис: адрес и пир', d: 'IP → Address `+` 10.10.10.1/30 на wg-branch. Peers `+`: public-key=<ключ филиала>, allowed-address=`10.10.10.2/32, 192.168.50.0/24`, endpoint=..., persistent-keepalive=25s.' },
        { t: 'Филиал: зеркально', d: 'Свой wg-office, адрес 10.10.10.2/30, пир с ключом офиса, allowed-address=`10.10.10.1/32, 192.168.88.0/24`.' },
        { t: 'Firewall', d: 'На обоих: input accept udp 13231 (лучше — только с адреса пира), forward accept между LAN и wg-интерфейсом.' },
        { t: 'Маршруты', d: 'IP → Routes: в офис 192.168.50.0/24 gateway=wg-branch; в филиале 192.168.88.0/24 gateway=wg-office.' },
        { t: 'MTU', d: 'MTU=1420 на wg (или 1380 при PPPoE). Проверьте большие пакеты: ping -f -l 1400.' },
        { t: 'Проверка', d: 'WireGuard → Peers: handshake обновляется; ping между LAN-адресами офисов проходит.' }
      ],
      scenes: [
        {
          path: 'Interface → WireGuard → Peers', win: 'WireGuard Peers', tools: [{ t: '+', id: 'add', m: 1 }],
          cols: [{ t: 'Interface', w: 86 }, { t: 'Public Key', w: 190 }, { t: 'Allowed Address', w: 210 }, { t: 'Endpoint', w: 150 }, { t: 'Keepalive', w: 84 }],
          rows: [[{ v: 'wg-branch' }, { v: 'x7Lm…2QpE=', m: 2 }, { v: '10.10.10.2/32, 192.168.50.0/24', m: 3 }, '203.0.113.77:13231', { v: '25s', m: 4 }]],
          sel: 0,
          notes: ['Кнопка добавления пира', 'Публичный ключ филиала', 'Туннельный адрес и LAN филиала', 'Keepalive держит NAT-сессию открытой']
        },
        {
          path: 'IP → Routes', win: 'Route List',
          cols: [{ t: 'A', w: 26 }, { t: 'Dst. Address', w: 150 }, { t: 'Gateway', w: 170 }, { t: 'Distance', w: 76 }, { t: 'Comment', w: 150 }],
          rows: [
            [{ v: 'AS', c: 'ok' }, { v: '192.168.50.0/24', m: 1 }, { v: 'wg-branch', m: 2 }, '1', 'филиал Витебск'],
            ['AS', '0.0.0.0/0', '203.0.113.1', '1', 'интернет']
          ],
          sel: 0,
          notes: ['Сеть филиала', 'Маршрут через WireGuard-интерфейс']
        }
      ],
      check: [{
        d: 'проверка туннеля',
        c: '/interface wireguard peers print detail\n/ping 10.10.10.2 count=3\n/ping 192.168.50.1 count=3\n/ip route print where interface~"wg"'
      }],
      mistakes: ['Allowed Address не включает LAN второй стороны — маршрута не будет.', 'Забыт firewall input для UDP-порта — handshake не проходит.', 'MTU 1500 — большие пакеты теряются, «сайты не открываются».']
    },
    {
      id: 'task-l2tp-vpn', t: 'Удалённый доступ сотрудников (L2TP/IPsec)', lvl: 2,
      path: 'PPP → L2TP Server · IP → IPsec', tags: ['vpn', 'l2tp', 'сотрудники'],
      purpose: 'Сотрудники подключаются к офисной сети с ноутбуков и телефонов через встроенный VPN-клиент. Простая и совместимая схема: логин/пароль + общий ключ IPsec.',
      usage: [
        'Удалённая работа с доступом к файлам и 1С.',
        'Доступ к камерам и оборудованию из дома.',
        'Резервный путь управления роутером, если Winbox закрыт.'
      ],
      steps: [
        { t: 'Профиль', d: 'PPP → Profiles `+`: name=vpn-staff, Local Address=10.99.0.1, Remote Address=pool-vpn, DNS Server=10.10.10.10.' },
        { t: 'Пул', d: 'IP → Pool `+`: pool-vpn 10.99.0.10–10.99.0.200.' },
        { t: 'Пользователи', d: 'PPP → Secrets `+` для каждого сотрудника: Service=l2tp, Profile=vpn-staff, пароль.' },
        { t: 'Сервер', d: 'PPP → L2TP Server: Enabled=yes, Default Profile=vpn-staff, Use IPsec=yes, IPsec Secret=<ключ>, Authentication=mschap2.' },
        { t: 'Firewall', d: 'input: accept udp 500 и udp 4500 от любых (или от адрес-листа). Ничего больше не открывать.' },
        { t: 'Доступ к LAN', d: 'forward: accept in-interface=<l2tp> или src-address=10.99.0.0/24 → dst 192.168.88.0/24 (только нужные серверы).' },
        { t: 'Клиент', d: 'Windows: «Добавить VPN» → L2TP/IPsec с ключом. macOS/iOS/Android — встроенные клиенты с тем же типом.' },
        { t: 'Проверка', d: 'PPP → Active Connections: сессия connected; IP → IPsec → Active Peers: пир установлен.' }
      ],
      scenes: [{
        path: 'PPP → L2TP Server', win: 'L2TP Server', noTools: true,
        form: {
          title: 'L2TP Server', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
            { l: 'Default Profile', v: 'vpn-staff', type: 'select', m: 2 },
            { l: 'Use IPsec', v: 'yes', type: 'select', m: 3 },
            { l: 'IPsec Secret', v: '••••••••••••', m: 4 },
            { l: 'Authentication', v: 'mschap2', type: 'select' }
          ]
        },
        notes: ['Включение сервера', 'Профиль для сотрудников', 'Шифрование обязательно', 'Общий ключ — передайте сотрудникам отдельно от пароля']
      }],
      check: [{
        d: 'мониторинг подключений',
        c: '/ppp active print\n/ppp active print detail where service=l2tp\n/ip ipsec active-peers print\n/log print where topics~"l2tp,ipsec"'
      }],
      warn: 'L2TP без IPsec передаёт пароли в открытом виде. Всегда Use IPsec=yes и сильный ключ (12+ символов).'
    },
    {
      id: 'task-pppoe-isp', t: 'PPPoE-сервер для абонентов (мини-ISP)', lvl: 3,
      path: 'PPP → PPPoE Server · Secrets · Profiles', tags: ['pppoe', 'провайдер', 'биллинг'],
      purpose: 'Организация доступа в интернет по логину/паролю: роутер работает как сервер доступа (BRAS) — авторизует абонентов, выдаёт адреса и ограничивает скорость.',
      usage: [
        'Общежитие, офисный центр, ЖК с раздачей интернета.',
        'Раздача доступа арендаторам с учётом каждого.',
        'Лабораторный стенд «провайдер + абонент» на одном устройстве.'
      ],
      steps: [
        { t: 'Топология', d: 'Клиентский порт/мост (`bridge-clients`) — в него приходят PPPoE-запросы; отдельный порт/интерфейс — WAN в интернет.' },
        { t: 'Пул и профиль', d: 'IP → Pool `+` pool-pppoe 10.255.0.10–10.255.0.250. PPP → Profiles `+` pppoe-clients: Local Address=10.255.0.1, Remote Address=pool-pppoe, DNS=1.1.1.1, Rate Limit=`10M/10M`, Change TCP MSS=yes.' },
        { t: 'Сервер', d: 'PPP → PPPoE Server `+`: Service Name=`isp`, Interface=bridge-clients, Default Profile=pppoe-clients, Authentication=pap,chap,mschap2, One Session Per Host=yes.' },
        { t: 'Абоненты', d: 'PPP → Secrets `+`: имя, пароль, service=pppoe, profile (тариф), remote-address (статический адрес при необходимости).' },
        { t: 'NAT', d: 'Firewall → NAT: masquerade для 10.255.0.0/24 в WAN. Firewall filter: forward accept из pppoe-интерфейсов в WAN, drop в LAN.' },
        { t: 'Биллинг', d: 'RADIUS: AAA → `+` (адрес сервера, secret), в PPP-профиле Use Radius=yes. Так тарифы и учёт ведутся централизованно.' },
        { t: 'Мониторинг', d: 'PPP → Active Connections: кто онлайн, сколько трафика. Log topics=pppoe для разбора отключений.' }
      ],
      scenes: [{
        path: 'PPP → PPPoE Server', win: 'PPPoE Server', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Service Name', w: 110 }, { t: 'Interface', w: 130 }, { t: 'Default Profile', w: 120 }, { t: 'Authentication', w: 160 }, { t: 'Max Sessions', w: 100 }],
        rows: [[{ v: 'isp', m: 2 }, { v: 'bridge-clients', m: 3 }, { v: 'pppoe-clients', m: 4 }, 'pap,chap,mschap2', '500']],
        sel: 0,
        notes: ['Кнопка добавления сервера', 'Имя сервиса', 'Интерфейс абонентов', 'Профиль с пулом, DNS и скоростью']
      }],
      check: [{
        d: 'проверка сервера',
        c: '/interface pppoe-server server print\n/ppp secret print count-only\n/ppp active print\n/ip pool used print'
      }],
      mistakes: ['Интерфейс абонентов в LAN-мосту — PPPoE-сервер и LAN конфликтуют.', 'Нет Change TCP MSS=yes — часть сайтов не открывается через PPPoE.', 'Абонентский интерфейс доступен из LAN без firewall — абоненты видят сеть.']
    },
    {
      id: 'task-hotspot-vouchers', t: 'Hotspot с ваучерами для гостей', lvl: 3,
      path: 'IP → Hotspot', tags: ['hotspot', 'ваучеры', 'гости'],
      purpose: 'Гостевая авторизация с выдачей временных логинов (ваучеров): гость вводит код на странице и получает доступ на N часов с ограничением скорости.',
      usage: [
        'Кафе, отель, коворкинг, общежитие.',
        'Гостевая сеть с учётом трафика и времени.',
        'Мероприятия: временный доступ на день.'
      ],
      steps: [
        { t: 'Гостевая сеть', d: 'Отдельная VLAN/мост `guest-net` с адресом 10.20.0.1/24 и DHCP (или мастер Hotspot сделает пул сам).' },
        { t: 'Мастер', d: 'IP → Hotspot → Hotspot Setup: Interface=`vlan20-guest`, Local Address=10.20.0.1, адрес пула — отдельный, SSL — по желанию.' },
        { t: 'Профиль', d: 'Hotspot → User Profiles `+` `voucher-2h`: Shared Users=1, Rate Limit=2M/2M, Session Timeout=2h, Idle Timeout=10m.' },
        { t: 'Ваучеры', d: 'Hotspot → Users → `+`: Name=`v-0001`… по числу гостей; кнопка Generate создаёт пароли. Профиль=`voucher-2h`.' },
        { t: 'Страница входа', d: 'Hotspot → Server Profiles: HTML Directory=hotspot (можно заменить логотип и текст). Walled Garden — сайты, доступные без входа.' },
        { t: 'Изоляция', d: 'Firewall: из guest-net в LAN — drop; в WAN — только после авторизации (правила hotspot добавляются автоматически).' },
        { t: 'Проверка', d: 'Подключитесь к гостевой сети → откроется портал → введите ваучер → интернет появится, скорость ограничена.' }
      ],
      scenes: [{
        path: 'IP → Hotspot → Users', win: 'Hotspot Users', tools: [{ t: '+', id: 'add', m: 1 }, { t: 'Generate', id: 'gen', m: 2 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 110 }, { t: 'Password', w: 100 }, { t: 'Profile', w: 120 }, { t: 'Limit Uptime', w: 110 }, { t: 'Comment', w: 130 }],
        rows: [
          [{ v: 'v-0001', m: 3 }, { v: 'k7f2q', m: 4 }, { v: 'voucher-2h', m: 5 }, '2h', 'гость 02.11'],
          ['v-0002', 'p3m9x', 'voucher-2h', '2h', 'гость 02.11']
        ],
        sel: 0,
        notes: ['Кнопка создания пользователя', 'Кнопка генерации логинов/паролей списком', 'Логин ваучера', 'Пароль ваучера', 'Профиль с лимитами']
      }],
      check: [{ d: 'проверка', c: '/ip hotspot user print\n/ip hotspot active print\n/ip hotspot cookie print' }],
      warn: 'Hotspot на интерфейсе с администраторами заблокирует и их. Только отдельная гостевая сеть.'
    },
    {
      id: 'task-capsman', t: 'Wi-Fi офиса на CAPsMAN (несколько точек)', lvl: 3,
      path: 'WiFi → CAPsMAN · Provisioning', tags: ['capsman', 'wifi', 'роуминг'],
      purpose: 'Централизованное управление точками доступа: единые SSID и пароли, автоматическая настройка новых точек, бесшовный роуминг между этажами.',
      usage: [
        'Офис с 3+ точками доступа.',
        'Склад/производство с большой площадью.',
        'Гостиница с единой гостевой сетью.'
      ],
      steps: [
        { t: 'Контроллер', d: 'На главном роутере: WiFi → CAPsMAN: Enabled=yes, Interfaces=bridge-lan.' },
        { t: 'Конфигурация', d: 'WiFi → Configuration `+` `cfg-5g`: SSID=`Office`, Security=`sec-office`, Channel Band=5ghz-ax Width=80MHz, Country=belarus, Datapath Bridge=bridge-lan.' },
        { t: 'Provisioning', d: 'WiFi → Provisioning `+`: Action=create-enabled, Master Configuration=`cfg-5g`, Supported Bands=5ghz-ax, Country=BY, Identity Regexp (если нужно).' },
        { t: 'Точки', d: 'На каждой точке: WiFi → CAP: Enabled=yes, Discovery Interface=bridge-lan, CapsMan Addresses=`192.168.88.1` (или auto).' },
        { t: 'Каналы', d: 'Задайте разные частоты для соседних точек (36/52/100) — меньше интерференции. Width 80MHz только там, где мало соседей.' },
        { t: 'Питание и порты', d: 'Точки подключайте в управляемый коммутатор с PoE; трафик клиентов — в bridge-lan (local forwarding) или туннелем на контроллер.' },
        { t: 'Проверка', d: 'CAPsMAN → Remote CAP: точки connected; Registration: клиенты с хорошим сигналом; тест роуминга при переходе между этажами.' }
      ],
      scenes: [{
        path: 'WiFi → CAPsMAN → Remote CAP', win: 'CAPsMAN Remote CAP', tabs: ['Remote CAP', 'Provisioning', 'Configuration', 'Registration'],
        cols: [{ t: 'Identity', w: 120 }, { t: 'Address', w: 130 }, { t: 'State', w: 100 }, { t: 'Radios', w: 130 }, { t: 'Board', w: 110 }],
        rows: [
          [{ v: 'AP-1floor', m: 1 }, { v: '192.168.88.11', m: 2 }, { v: 'connected', c: 'ok', m: 3 }, '2 (2.4/5GHz)', 'cAP ax'],
          ['AP-2floor', '192.168.88.12', 'connected', '2', 'cAP ax'],
          ['AP-3floor', '192.168.88.13', 'connected', '2', 'cAP ax']
        ],
        sel: 0,
        notes: ['Идентификатор точки', 'Адрес точки', 'Точка подключена к контроллеру']
      }],
      check: [{ d: 'проверка', c: '/interface wifi remote-cap print\n/interface wifi registration-table print\n/interface wifi provisioning print' }]
    },
    {
      id: 'task-lte-backup', t: 'LTE-резерв с автопереключением', lvl: 2,
      path: 'Interface → LTE · Routes · Netwatch', tags: ['lte', 'резерв', 'модем'],
      purpose: 'Резервный интернет через LTE-модем: работает автоматически при аварии основного канала, не требует участия администратора.',
      usage: [
        'Магазины и склады без второго проводного провайдера.',
        'Удалённые объекты с нестабильным каналом.',
        'Резерв для кассового оборудования.'
      ],
      steps: [
        { t: 'Установите модем', d: 'USB-модем из списка совместимых MikroTik → появится интерфейс `lte1`. Проверьте Interface → LTE: Registration=registered, Signal.' },
        { t: 'Профиль APN', d: 'Interface → LTE → вкладка APN Profiles: APN оператора, User/Password (если нужны), IP Type=ipv4.' },
        { t: 'Адрес и NAT', d: 'Обычно LTE получает адрес по DHCP автоматически. Добавьте lte1 в список WAN и убедитесь, что NAT покрывает out-interface-list=WAN.' },
        { t: 'Маршруты', d: 'Основной: distance=1 check-gateway=ping. LTE: distance=10 check-gateway=ping. При падении основного трафик уйдёт на LTE.' },
        { t: 'Проверка канала', d: 'Tools → Netwatch на 8.8.8.8 с уведомлением (email/Telegram) при down/up.' },
        { t: 'Экономия трафика', d: 'Очереди/лимиты для гостевых устройств, чтобы LTE не «съедался» обновлениями.' },
        { t: 'Проверка', d: 'Отключите основной WAN: интернет продолжает работать через lte1 (проверьте по IP → Cloud → Public Address).' }
      ],
      scenes: [{
        path: 'Interface → LTE', win: 'LTE', tabs: ['General', 'APN Profiles', 'Status'], noTools: true,
        form: {
          title: 'LTE <lte1>', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Name', v: 'lte1', ro: true },
            { l: 'APN Profiles', v: 'default', type: 'select', m: 1 },
            { l: 'APN', v: 'internet.operator.by', m: 2 },
            { l: 'IP Type', v: 'ipv4', type: 'select' },
            { l: 'Pin', v: '****' },
            { l: 'Registration', v: 'registered', ro: true, m: 3 }
          ]
        },
        notes: ['Профиль APN модема', 'Точка доступа оператора (APN)', 'Модем зарегистрирован в сети']
      }],
      check: [{ d: 'проверка LTE', c: '/interface lte print detail\n/interface lte monitor lte1 once\n/ip route print where dst-address=0.0.0.0/0' }],
      mistakes: ['Модем не поддерживается RouterOS — интерфейс lte1 не появится.', 'Неверный APN — регистрация есть, интернета нет.', 'Нет check-gateway — трафик остаётся на мёртвом канале.']
    },
    {
      id: 'task-protect-router', t: 'Защита роутера от ботов и брутфорса', lvl: 2,
      path: 'Firewall · Services · Address Lists', tags: ['безопасность', 'ботнет', 'fail2ban'],
      purpose: 'Комплекс мер против типовых атак на MikroTik: закрытые сервисы управления, ограничение по адресам, автоматическая блокировка сканеров и брутфорса через address-list.',
      usage: [
        'Любой роутер, доступный из интернета (DDNS, проброс портов).',
        'Парк устройств на объектах без постоянного админа.',
        'Инцидент: в логах видны попытки подбора пароля.'
      ],
      steps: [
        { t: 'Сервисы управления', d: 'IP → Services: winbox/ssh только из админской сети, telnet/ftp/www/api/api-ssl — disable. Available From вместо 0.0.0.0/0.' },
        { t: 'Пароли и пользователи', d: 'System → Users: пароли 12+ символов, отдельные учётки, отключить лишние. Сменить пароль admin.' },
        { t: 'Базовые правила', d: 'input: accept established,related; drop invalid; drop WAN; accept LAN.' },
        { t: 'Список блокировки', d: 'Address Lists `+` list=`blacklist`. Raw: prerouting src-address-list=blacklist action=drop.' },
        { t: 'Детект брутфорса', d: 'Filter: chain=input, protocol=tcp, dst-port=22,82* (или все), src-address-list=`stage1`, action=add-src-to-address-list address-list=`stage2` timeout=1d, затем добавить в `blacklist`.' },
        { t: 'Сканеры портов', d: 'Filter: chain=input, protocol=tcp, tcp-flags=fin,syn,rst,psh,ack,urg, action=add-src-to-address-list list=blacklist timeout=1d.' },
        { t: 'RAW для мусора', d: 'prerouting: drop invalid; drop входящие SYN на закрытые порты (набор правил «port scanners»).' },
        { t: 'Мониторинг', d: 'Logging topics=firewall,info → email/syslog; периодически смотреть `/log print where topics~"firewall"' }, 
        { t: 'Проверка', d: '`/ip firewall address-list print where list=blacklist` — список должен наполняться; сервисы из интернета недоступны.' }
      ],
      scenes: [{
        path: 'IP → Firewall → Address Lists', win: 'Address Lists', tab: 'Address Lists',
        tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
        cols: [{ t: 'List', w: 120 }, { t: 'Address', w: 150 }, { t: 'Timeout', w: 90 }, { t: 'Creation Time', w: 150 }, { t: 'Dynamic', w: 70 }],
        rows: [
          [{ v: 'blacklist', m: 1 }, { v: '45.148.10.7', m: 2 }, { v: '23h59m', m: 3 }, 'nov/02/2026 09:45', 'true'],
          ['blacklist', '193.32.162.11', '1d', 'nov/02/2026 08:12', 'true'],
          ['admin-allow', '203.0.113.5', '', 'nov/01/2026 10:12', 'false']
        ],
        sel: 0,
        notes: ['Список заблокированных адресов', 'IP нарушителя', 'Время до автоматической разблокировки']
      }],
      check: [{
        d: 'аудит безопасности',
        c: '/ip service print\n/user print\n/ip firewall address-list print where list=blacklist\n/ip firewall filter print where action=drop\n/log print where topics~"firewall"'
      }],
      danger: 'Не блокируйте свой адрес управления. Всегда оставляйте доступ через LAN и проверяйте правила в Safe Mode.'
    },
    {
      id: 'task-tenants', t: 'Арендаторы: отдельные сети и лимиты', lvl: 3,
      path: 'VLAN · DHCP · Queues · Firewall', tags: ['арендаторы', 'биллинг', 'ограничение'],
      purpose: 'Бизнес-центр или офис, где несколько арендаторов должны быть изолированы друг от друга и иметь собственные лимиты скорости. Каждый арендатор — своя VLAN и подсеть.',
      usage: [
        'Бизнес-центр с несколькими компаниями.',
        'Жилой дом с раздачей интернета по квартирам.',
        'Коворкинг с отдельными сетями для команд.'
      ],
      steps: [
        { t: 'Нумерация', d: 'Арендатор N: VLAN 100+N, подсеть 10.N.0.0/24, шлюз 10.N.0.1. Ведите таблицу — это ваша документация.' },
        { t: 'VLAN и адрес', d: 'Interface → VLAN `+` vlan-N (interface=bridge-lan) → IP → Address 10.N.0.1/24.' },
        { t: 'DHCP и DNS', d: 'DHCP Server `+` на vlan-N: пул 10.N.0.10–10.N.0.200, шлюз и DNS = 10.N.0.1.' },
        { t: 'Изоляция', d: 'Firewall forward: drop между vlan-N и другими vlan, accept vlan-N → WAN. Одно правило на интерфейс или address-list «тенанты».' },
        { t: 'Лимит скорости', d: 'Queues → Simple Queues `+`: target=10.N.0.0/24, max-limit по тарифу. Или PPPoE-профиль с rate-limit.' },
        { t: 'Учёт', d: 'Для биллинга — RADIUS, для простого учёта — графики/SNMP и `/queue simple print stats`.' },
        { t: 'Проверка', d: 'Из сети арендатора: ping своей сети, нет доступа к соседям, скорость соответствует тарифу.' }
      ],
      scenes: [{
        path: 'IP → Firewall → Filter Rules', win: 'Firewall', tab: 'Filter Rules',
        tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
        cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 70 }, { t: 'Action', w: 70 }, { t: 'Src. Address List', w: 130 }, { t: 'Dst. Address List', w: 130 }, { t: 'Comment', w: 200 }],
        rows: [
          ['0', 'forward', { v: 'accept', c: 'ok' }, { v: 'tenants', m: 1 }, '', 'тенанты в интернет'],
          ['1', 'forward', { v: 'drop', c: 'no', m: 2 }, { v: 'tenants', m: 3 }, { v: 'tenants', m: 4 }, 'изоляция между арендаторами'],
          ['2', 'forward', 'drop', 'tenants', 'LAN', 'тенанты не видят офис']
        ],
        sel: 1,
        notes: ['Список всех сетей арендаторов', 'Запрет взаимного доступа', 'Источник — список арендаторов', 'Назначение — тоже арендаторы']
      }],
      check: [{ d: 'проверка', c: '/ip firewall address-list print where list=tenants\n/queue simple print stats\n/ip dhcp-server lease print count-only' }]
    },
    {
      id: 'task-monitoring', t: 'Мониторинг: SNMP, Zabbix и логи', lvl: 2,
      path: 'IP → SNMP · System → Logging', tags: ['snmp', 'zabbix', 'мониторинг'],
      purpose: 'Подключение роутера к системе мониторинга: графики загрузки, алерты о падении интерфейсов, температура, доступность сервисов. Без этого инциденты обнаруживаются «когда позвонили».',
      usage: [
        'Парк из 5+ устройств.',
        'Требование SLA: контроль доступности каналов.',
        'Планирование нагрузки по историческим графикам.'
      ],
      steps: [
        { t: 'SNMP', d: 'IP → SNMP: Enabled=yes, Contact/Description, Location. Communities (v2c) — read-only community с ограничением Address=IP мониторинга.' },
        { t: 'Либо SNMPv3', d: 'Безопаснее: Authentication Protocol=sha1/sha256, Encryption=aes, пароли. На Zabbix — соответствующий интерфейс.' },
        { t: 'Syslog', d: 'System → Logging → Actions `+`: remote 192.168.88.50:514; правила: topics=`error,critical` и `firewall,info` (по необходимости).' },
        { t: 'Zabbix-шаблон', d: 'В Zabbix примените шаблон `MikroTik by SNMP` — придут интерфейсы, CPU, память, температура, uptime.' },
        { t: 'Алерты', d: 'Триггеры: интерфейс down, CPU > 85% на 5 мин, температура > 70 °C, uptime < 10 мин (перезагрузка).' },
        { t: 'Проверка', d: '`snmpwalk -v2c -c <community> <ip> 1.3.6.1.2.1.1` — данные приходят; графики в Zabbix строятся.' }
      ],
      scenes: [{
        path: 'IP → SNMP', win: 'SNMP', tabs: ['SNMP', 'Communities'], noTools: true,
        form: {
          title: 'SNMP', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
            { l: 'Contact', v: 'noc@example.com', m: 2 },
            { l: 'Location', v: 'Minsk, office 2 floor', m: 3 },
            { l: 'Trap Community', v: 'public' },
            { l: 'Trap Target', v: '192.168.88.50' }
          ]
        },
        notes: ['Включение SNMP', 'Контакты администратора', 'Расположение устройства']
      }],
      check: [{ d: 'терминал', c: '/snmp print\n/snmp community print\n/system logging print' }],
      warn: 'SNMP v2c передаёт community открытым текстом и без ограничений даёт читать конфигурацию. Всегда задавайте Address=IP мониторинга или используйте v3.'
    },
    {
      id: 'task-backup-automation', t: 'Автобэкап с выгрузкой на сервер', lvl: 2,
      path: 'Scheduler · Scripts · Fetch', tags: ['бэкап', 'автоматизация', 'скрипты'],
      purpose: 'Ночью роутер сам создаёт бэкап и отправляет его на внешний сервер. Это защищает от потери конфигурации при выходе устройства из строя.',
      usage: [
        'Парк устройств, где ручной бэкап забывается.',
        'Объекты без регулярного обслуживания.',
        'Требование восстановления после сбоя за минуты.'
      ],
      steps: [
        { t: 'Проверьте место', d: 'System → Resources: Free HDD Space. Бэкап занимает 100–500 КБ.' },
        { t: 'Скрипт', d: 'System → Scripts `+` name=`backup-upload`: `/system backup save name=auto; /export file=auto-export; /tool fetch address=192.168.88.5 src-path=auto.backup user=backup password=*** upload=yes mode=ftp`.' },
        { t: 'Расписание', d: 'System → Scheduler `+` name=`nightly`, interval=1d, start-time=03:30, on-event=`/system script run backup-upload`.' },
        { t: 'Ротация', d: 'В скрипте удаляйте старые файлы: `/file remove [find name~"auto"]` перед новым сохранением или используйте дату в имени.' },
        { t: 'Проверка', d: 'Files: появился auto.backup; на сервере — файл с сегодняшней датой; System → Log — запись о выполнении.' },
        { t: 'Тест восстановления', d: 'Раз в квартал восстанавливайте бэкап на тестовом устройстве. Бэкап, который не проверяли, — не бэкап.' }
      ],
      scenes: [{
        path: 'System → Scheduler', win: 'Scheduler', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: 'Run Now', id: 'run', m: 4 }],
        cols: [{ t: 'Name', w: 130 }, { t: 'Start Time', w: 110 }, { t: 'Interval', w: 86 }, { t: 'On Event', w: 330 }],
        rows: [[{ v: 'nightly', m: 2 }, { v: '03:30:00', m: 3 }, { v: '1d', m: 5 }, '/system script run backup-upload']],
        sel: 0,
        notes: ['Кнопка создания задачи', 'Имя задачи', 'Время запуска', 'Запуск вручную для проверки', 'Периодичность']
      }],
      check: [{ d: 'проверка', c: '/system script print\n/system scheduler print\n/file print where name~"auto"\n/log print where topics~"script"' }]
    },
    {
      id: 'task-recover-access', t: 'Восстановление доступа к роутеру', lvl: 2,
      path: 'MAC-Winbox · Reset · Netinstall', tags: ['восстановление', 'авария', 'netinstall'],
      purpose: 'Порядок действия, когда доступ к роутеру потерян: неправильный firewall, VLAN, адрес или забытый пароль. От самого безопасного способа к самому радикальному.',
      usage: [
        'После неудачной правки firewall/VLAN.',
        'Забыт пароль администратора.',
        'Устройство «не отвечает» после обновления.'
      ],
      steps: [
        { t: 'Проверьте L1/L2', d: 'Кабель, питание, индикаторы. Подключитесь в тот порт, который точно в LAN (или в любой порт, если сброшен конфиг).' },
        { t: 'MAC-Winbox', d: 'Winbox → Neighbors: устройство находится по MAC даже без IP. Подключение по MAC работает, если discovery разрешён на этом порту.' },
        { t: 'RoMON', d: 'Если есть цепочка MikroTik: Winbox → вкладка RoMON → найти устройство по цепочке.' },
        { t: 'Последовательная консоль', d: 'Для устройств с портом console: 115200 8N1, вход без пароля (если конфигурация позволяет) → правка конфигурации.' },
        { t: 'Сброс кнопкой', d: 'Выключить питание → зажать Reset → включить, держать до мигания LED (5–10 с) → отпустить. Роутер сбросит конфигурацию к default.' },
        { t: 'Netinstall', d: 'Крайний случай: netinstall на ПК + режим загрузки по сети (зажать Reset при включении / кнопка Netinstall в RouterBOOT). Переустанавливает RouterOS полностью.' },
        { t: 'После восстановления', d: 'Смените пароли, включите сервисы только в LAN, восстановите конфигурацию из Backup/Export, проверьте firewall.' }
      ],
      scenes: [{
        path: 'System → Reset Configuration', win: 'Reset Configuration', noTools: true,
        form: {
          title: 'Reset Configuration', buttons: ['Reset', 'Cancel'],
          fields: [
            { l: 'Reset Configuration', v: true, type: 'check', m: 1 },
            { l: 'No Default Config', v: false, type: 'check', m: 2 },
            { l: 'Keep Users', v: true, type: 'check', m: 3 }
          ]
        },
        notes: ['Сброс конфигурации', 'Без default-конфига роутер стартует без адреса 192.168.88.1', 'Сохранить пользователей (если пароль известен)']
      }],
      check: [{
        d: 'после восстановления',
        c: '/system identity print\n/ip address print\n/ip service print\n/ip firewall filter print\n/interface print'
      }],
      danger: 'Сброс и netinstall удаляют конфигурацию. Если есть хоть малейшая возможность войти по MAC — используйте её, а не сброс.'
    },
    {
      id: 'task-bgp-multihome', t: 'BGP мультихоминг с двумя провайдерами', lvl: 3,
      path: 'Routing → BGP · Filters · Prefix Lists', tags: ['bgp', 'мультихоминг', 'as'],
      purpose: 'Подключение к двум провайдерам с собственной автономной системой: анонс своих подсетей и приём маршрутов. Даёт независимость от одного оператора и оптимальный путь.',
      usage: [
        'Компания с собственным блоком IP (PI-адреса) и AS.',
        'ЦОД с требованием резервирования на уровне маршрутизации.',
        'Хостинг/провайдер с несколькими аплинками.'
      ],
      steps: [
        { t: 'Подготовка', d: 'Получите AS и блок адресов (RIPE/локальный регистратор), договоритесь о BGP-сессиях с двумя провайдерами.' },
        { t: 'Шаблон', d: 'Routing → BGP → Templates `+`: name=`tpl-as64500`, AS=64500 (ваша), Router ID=публичный IP.' },
        { t: 'Соединения', d: 'Connections `+` для каждого провайдера: name=peer-isp1, Remote Address, Remote AS, Template, Multihop (если через несколько хопов), Hold Time=90.' },
        { t: 'Анонсы', d: 'Networks: добавьте свои префиксы (например 203.0.113.0/24). Они уйдут в BGP только при наличии активного маршрута к ним.' },
        { t: 'Фильтры in', d: 'Prefix Lists + Filters: принимайте только префиксы провайдера и default; запрет private/bogon (10/8, 172.16/12, 192.168/16, 127/8, 224/4).' },
        { t: 'Фильтры out', d: 'Анонсируйте только свои префиксы; всё остальное reject. Ошибка здесь анонсирует «весь интернет» и вас отключат.' },
        { t: 'Проверка', d: 'BGP → Sessions: established для обеих сессий; `/routing bgp advertisements print` показывает ваши анонсы; looking glass провайдера подтверждает приём.' }
      ],
      scenes: [{
        path: 'Routing → BGP → Sessions', win: 'BGP Sessions', tabs: ['Connections', 'Templates', 'Sessions', 'Networks', 'Filters'],
        cols: [{ t: 'Name', w: 110 }, { t: 'Remote Address', w: 130 }, { t: 'Remote AS', w: 90 }, { t: 'State', w: 110 }, { t: 'Uptime', w: 90 }, { t: 'Prefixes', w: 80 }],
        rows: [
          [{ v: 'peer-isp1', m: 1 }, { v: '198.51.100.1', m: 2 }, { v: '64501', m: 3 }, { v: 'established', c: 'ok', m: 4 }, '12d4h', '2'],
          ['peer-isp2', '203.0.113.9', '64502', { v: 'established', c: 'ok' }, '12d4h', '3']
        ],
        sel: 0,
        notes: ['Имя сессии', 'Адрес BGP-соседа', 'AS провайдера', 'Сессия установлена']
      }],
      check: [{
        d: 'проверка BGP',
        c: '/routing bgp session print\n/routing bgp advertisements print\n/ip route print where bgp\n/routing filter print stats'
      }],
      danger: 'Неверный фильтр out может анонсировать в интернет чужие префиксы — это приведёт к блокировке со стороны провайдеров и аварии у других сетей. Проверяйте фильтры перед включением сессии.'
    },
    {
      id: 'task-iptv', t: 'IPTV и multicast (IGMP proxy)', lvl: 3,
      path: 'Routing → IGMP Proxy · Bridge', tags: ['iptv', 'multicast', 'igmp'],
      purpose: 'Настройка корректной работы IPTV и multicast-сервисов провайдера: IGMP proxy передаёт группы из WAN в LAN без «широковещательного» мусора.',
      usage: [
        'Провайдер отдаёт IPTV по multicast на отдельной VLAN.',
        'Корпоративные видеотрансляции внутри офиса.',
        'Приставки за роутером не показывают каналы.'
      ],
      steps: [
        { t: 'VLAN провайдера', d: 'Interface → VLAN `+`: IPTV VLAN ID (уточните у провайдера), interface=WAN. Отдельный порт/мост под приставку.' },
        { t: 'IGMP Proxy', d: 'Routing → IGMP Proxy → `+`: Interface=IPTV-VLAN (upstream), Interface=bridge-iptv (downstream).' },
        { t: 'Мультикаст-маршруты', d: 'IP → Routes: 224.0.0.0/4 → интерфейс приставки (если требуется).' },
        { t: 'IGMP Snooping', d: 'Bridge → Bridge: IGMP Snooping=yes — коммутатор не будет флудить multicast во все порты.' },
        { t: 'Firewall', d: 'input accept igmp (protocol=igmp) с WAN-интерфейса IPTV; forward accept multicast в порт приставки.' },
        { t: 'Проверка', d: 'Приставка получает каналы; в Interface → Traffic виден multicast-поток только на порту приставки.' }
      ],
      scenes: [{
        path: 'Routing → IGMP Proxy', win: 'IGMP Proxy', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Interface', w: 160 }, { t: 'Upstream', w: 110 }, { t: 'Alternative Subnets', w: 160 }, { t: 'Comment', w: 130 }],
        rows: [[{ v: 'vlan-iptv', m: 2 }, { v: 'yes', m: 3 }, '', 'от провайдера'], ['bridge-iptv', { v: 'no', m: 4 }, '', 'к приставкам']],
        sel: 0,
        notes: ['Кнопка добавления интерфейса', 'Интерфейс со стороны провайдера', 'Upstream=yes — откуда приходит multicast', 'Downstream=no — куда раздаём']
      }],
      check: [{ d: 'проверка', c: '/routing igmp-proxy print\n/routing igmp-proxy interface print\n/interface bridge print' }]
    }
  ]
});
