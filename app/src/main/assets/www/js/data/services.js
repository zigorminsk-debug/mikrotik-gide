/* Разделы «Routing» и «Queues» */
window.DATA = window.DATA || [];

window.DATA.push({
  id: 'routing', name: 'Routing (BGP, OSPF)', ic: 'ip',
  items: [
    {
      id: 'rt-tables', t: 'Routing → Tables', lvl: 3,
      path: 'Routing → Tables', tags: ['таблицы', 'pbr', 'vrf'],
      purpose: 'Таблица маршрутизации — отдельный набор маршрутов. Кроме main (по умолчанию) можно создать свои таблицы: для policy-based routing, для VRF клиентов или для туннелей.',
      usage: [
        'Отправка трафика части клиентов в VPN-туннель (маршрутизация по политике).',
        'Разделение маршрутов между VRF.',
        'Несколько маршрутов по умолчанию для разных групп пользователей.'
      ],
      steps: [
        { t: 'Создайте таблицу', d: 'Routing → Tables → `+`: Name=`via-vpn`, FIB=yes (для аппаратного ускорения).' },
        { t: 'Добавьте маршрут', d: 'IP → Routes → `+`: Dst=0.0.0.0/0, Gateway=`wg0`, Routing Table=`via-vpn`.' },
        { t: 'Пометьте трафик', d: 'IP → Firewall → Mangle: chain=prerouting, src-address-list=`vpn-users`, action=mark-routing, new-routing-mark=`via-vpn`.' },
        { t: 'Проверка', d: 'IP → Routes → вкладка Tables: маршрут виден в своей таблице; трафик пользователей уходит в туннель.' }
      ],
      scenes: [{
        path: 'Routing → Tables', win: 'Routing Tables', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Name', w: 130 }, { t: 'FIB', w: 60 }, { t: 'Comment', w: 260 }],
        rows: [[{ v: 'via-vpn', m: 2 }, { v: 'yes', m: 3 }, 'трафик группы vpn-users'], ['main', 'yes', 'основная таблица']],
        sel: 0,
        notes: ['Кнопка создания таблицы', 'Имя таблицы — используется в маршрутах и mangle', 'FIB=yes включает аппаратное ускорение (Cisco-like)']
      }],
      check: [{ d: 'терминал', c: '/routing table print\n/ip route print where routing-table=via-vpn' }]
    },
    {
      id: 'rt-rules', t: 'Routing → Rules', lvl: 3,
      path: 'Routing → Rules', tags: ['pbr', 'правила', 'маршруты'],
      purpose: 'Правила выбора таблицы маршрутизации по адресу источника/назначения, без маркировки в mangle. Более простой способ policy-based routing.',
      usage: [
        'Трафик конкретной подсети — через второй провайдер.',
        'Исключение из VPN для банковских сайтов.',
        'Разделение маршрутов по src-address без mangle.'
      ],
      steps: [
        { t: 'Создайте таблицу', d: 'Routing → Tables: `via-lte` (или используйте main).' },
        { t: 'Правило', d: 'Routing → Rules → `+`: Src. Address=`192.168.50.0/24`, Action=lookup, Table=`via-lte`.' },
        { t: 'Маршрут в таблице', d: 'IP → Routes: 0.0.0.0/0 через LTE, Routing Table=`via-lte`.' },
        { t: 'Проверка', d: 'Tools → Traceroute с адреса из подсети — путь должен идти через нужный канал.' }
      ],
      scenes: [{
        path: 'Routing → Rules', win: 'Routing Rules', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '⇅' }],
        cols: [{ t: '#', w: 28 }, { t: 'Src. Address', w: 150 }, { t: 'Dst. Address', w: 130 }, { t: 'Action', w: 90 }, { t: 'Table', w: 110 }],
        rows: [['0', { v: '192.168.50.0/24', m: 2 }, '', { v: 'lookup', m: 3 }, { v: 'via-lte', m: 4 }]],
        sel: 0,
        notes: ['Кнопка добавления правила', 'Подсеть, чей трафик уйдёт в другую таблицу', 'Действие lookup — искать маршрут в указанной таблице', 'Имя таблицы маршрутов']
      }],
      check: [{ d: 'терминал', c: '/routing rule print\n/routing rule print where table=via-lte' }]
    },
    {
      id: 'rt-ospf', t: 'Routing → OSPF', lvl: 3,
      path: 'Routing → OSPF (Instance, Area, Interface Template)', tags: ['ospf', 'динамическая маршрутизация'],
      purpose: 'OSPF автоматически обменивается маршрутами между роутерами внутри одной организации. Позволяет строить сеть из десятков филиалов без ручного прописывания маршрутов.',
      usage: [
        'Сеть офисов с резервными каналами между ними.',
        'Быстрое перестроение маршрутов при падении линка (секунды).',
        'Обмен маршрутами между L3-коммутаторами и роутерами.'
      ],
      steps: [
        { t: 'Instance', d: 'Routing → OSPF → вкладка Instances → `+`: Name=`default`, Router ID=`10.255.255.1`, Version=2.' },
        { t: 'Area', d: 'Вкладка Areas → `+`: Name=`backbone`, Area ID=`0.0.0.0`, Instance=`default`, Type=default.' },
        { t: 'Interface Template', d: 'Вкладка Interface Templates → `+`: Area=`backbone`, Interfaces=`ether2` (или список), Type=`ptp`, Cost=10, Passive=no.' },
        { t: 'Сети', d: 'Анонсируются сети интерфейсов, попавших в шаблон. Убедитесь, что на них есть IP-адреса.' },
        { t: 'Пассивные интерфейсы', d: 'Для LAN-интерфейсов без соседей: Passive=yes — чтобы не рассылать hello в клиентскую сеть.' },
        { t: 'Проверка', d: 'Routing → OSPF → Neighbors: соседи в состоянии Full; IP → Routes: появились OSPF-маршруты (флаг o).' }
      ],
      scenes: [{
        path: 'Routing → OSPF → Neighbors', win: 'OSPF Neighbors', tabs: ['Instances', 'Areas', 'Interface Templates', 'Neighbors'],
        cols: [{ t: 'Instance', w: 96 }, { t: 'Area', w: 100 }, { t: 'Address', w: 130 }, { t: 'State', w: 100 }, { t: 'Priority', w: 76 }],
        rows: [[{ v: 'default' }, { v: 'backbone' }, { v: '10.0.0.2', m: 1 }, { v: 'Full', c: 'ok', m: 2 }, '1']],
        sel: 0,
        notes: ['Адрес соседнего роутера', 'Состояние Full — соседство установлено и маршруты обмениваются']
      }],
      check: [{ d: 'терминал', c: '/routing ospf neighbor print\n/routing ospf interface print\n/ip route print where ospf' }],
      mistakes: ['Router ID должен быть уникальным в домене.', 'Интерфейс в шаблоне без IP-адреса — соседство не поднимется.']
    },
    {
      id: 'rt-bgp', t: 'Routing → BGP', lvl: 3,
      path: 'Routing → BGP → Connections', tags: ['bgp', 'провайдер', 'as'],
      purpose: 'BGP обменивается маршрутами между автономными системами: подключение к двум провайдерам, анонс своих подсетей, приём полной таблицы интернета. В RouterOS 7 конфигурация BGP переработана.',
      usage: [
        'Мультихоминг: два провайдера и своя AS.',
        'Анонс публичной подсети провайдеру.',
        'Обмен маршрутами с ЦОД или партнёром (eBGP/iBGP).'
      ],
      steps: [
        { t: 'Создайте шаблон (Template)', d: 'Routing → BGP → Templates → `+`: Name=`tpl-as65001`, AS=`65001`, Router ID=`203.0.113.10`.' },
        { t: 'Соединение', d: 'Вкладка Connections → `+`: Name=`peer-isp1`, Remote Address=`198.51.100.1`, Remote AS=`64500`, Template=`tpl-as65001`, Multihop=no (для прямого линка), Hold Time=90.' },
        { t: 'Address Family', d: 'Вкладка Connection → в параметрах afi=ip (IPv4). Для IPv6 — отдельное соединение с afi=ipv6.' },
        { t: 'Что анонсировать', d: 'Output → Network: вкладка Networks (`+`: 203.0.113.0/24) и Default Originate=never. Для приёма полной таблицы включите Input Filter.' },
        { t: 'Фильтры', d: 'Routing → BGP → вкладка Filters: запретите приём private/bogon-подсетей, ограничьте количество префиксов (max-prefix).' },
        { t: 'Проверка', d: 'BGP → Sessions: state=established; IP → Routes: маршруты с флагом b.' }
      ],
      scenes: [{
        path: 'Routing → BGP → Connections', win: 'BGP Connection',
        tabs: ['Connections', 'Templates', 'Sessions', 'Networks', 'Filters'],
        cols: [{ t: 'Name', w: 110 }, { t: 'Remote Address', w: 130 }, { t: 'Remote AS', w: 90 }, { t: 'Local AS', w: 90 }, { t: 'Multihop', w: 76 }, { t: 'State', w: 110 }],
        rows: [[{ v: 'peer-isp1', m: 1 }, { v: '198.51.100.1', m: 2 }, { v: '64500', m: 3 }, '65001', 'no', { v: 'established', c: 'ok', m: 4 }]],
        sel: 0,
        notes: ['Имя BGP-соединения', 'IP-адрес BGP-соседа (провайдера)', 'AS провайдера', 'established — сессия установлена']
      }],
      check: [{
        d: 'терминал',
        c: '/routing bgp connection print\n/routing bgp session print\n/ip route print where bgp\n/routing bgp advertisements print'
      }],
      warn: 'Никогда не анонсируйте в интернет private-подсети и не принимайте маршруты без фильтра: ошибка в анонсах может «уронить» чужую сеть.'
    },
    {
      id: 'rt-rip', t: 'Routing → RIP', lvl: 3,
      path: 'Routing → RIP', tags: ['rip', 'legacy'],
      purpose: 'RIP — простой протокол дистанционно-векторной маршрутизации (по числу хопов). В современных сетях используется редко, но встречается в устаревшем оборудовании.',
      usage: [
        'Совместимость со старым оборудованием, где нет OSPF.',
        'Простые сети из 2–3 роутеров без альтернатив.',
        'Учебные стенды.'
      ],
      steps: [
        { t: 'Instance', d: 'Routing → RIP → Instances → `+`: Name=`rip1`, Version=2.' },
        { t: 'Интерфейсы', d: 'Вкладка Interfaces → `+`: Interface=`ether2`, Instance=`rip1`, Receive=v2, Send=v2.' },
        { t: 'Networks', d: 'Вкладка Networks: перечислите сети для анонса (в v7 — по интерфейсам).' },
        { t: 'Проверка', d: 'IP → Routes: маршруты с флагом r.' }
      ],
      scenes: [{
        path: 'Routing → RIP → Interfaces', win: 'RIP Interfaces', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Interface', w: 110 }, { t: 'Instance', w: 100 }, { t: 'Receive', w: 80 }, { t: 'Send', w: 80 }, { t: 'Cost', w: 60 }],
        rows: [[{ v: 'ether2', m: 2 }, { v: 'rip1' }, 'v2', 'v2', '1']],
        sel: 0,
        notes: ['Кнопка добавления интерфейса', 'Интерфейс, на котором работает RIP']
      }],
      check: [{ d: 'терминал', c: '/routing rip interface print\n/routing rip neighbor print' }]
    },
    {
      id: 'rt-filters', t: 'Routing → Filters и Prefix Lists', lvl: 3,
      path: 'Routing → Filters · Prefix Lists', tags: ['фильтры', 'bgp', 'безопасность'],
      purpose: 'Фильтры принимаемых и анонсируемых маршрутов. Критично для BGP: защищают от анонса мусора, ограничивают количество префиксов и предотвращают утечку приватных сетей.',
      usage: [
        'Ограничение приёма: только сети провайдера и default.',
        'Запрет анонса private-подсетей.',
        'Ограничение числа префиксов (защита от «BGP-флуда»).'
      ],
      steps: [
        { t: 'Prefix List', d: 'Routing → Prefix Lists → `+`: Name=`pl-isp1-in`, Prefix=`0.0.0.0/0`, Prefix Length Range=`0-24`.' },
        { t: 'Filter', d: 'Routing → Filters → `+`: Chain=`isp1-in`, Rule=... Select Rules: if (dst in pl-isp1-in) accept; if (dst == 10.0.0.0/8) reject.' },
        { t: 'Примените', d: 'В BGP Connection → Input → Filter=`isp1-in`, Output Filter=`isp1-out`.' },
        { t: 'Проверка', d: 'BGP → Sessions → Received/Accepted prefixes; лог показывает отброшенные маршруты.' }
      ],
      scenes: [{
        path: 'Routing → Prefix Lists', win: 'Prefix Lists', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Name', w: 130 }, { t: 'Prefix', w: 150 }, { t: 'Prefix Length Range', w: 150 }, { t: 'Comment', w: 170 }],
        rows: [[{ v: 'pl-isp1-in', m: 2 }, { v: '0.0.0.0/0', m: 3 }, { v: '0-24', m: 4 }, 'только реальные префиксы']],
        sel: 0,
        notes: ['Кнопка создания списка', 'Имя списка для ссылки из фильтра', 'Префикс, который разрешаем', 'Диапазон длины маски']
      }],
      check: [{ d: 'терминал', c: '/routing filter print\n/routing filter rule print' }]
    },
    {
      id: 'rt-bfd', t: 'Routing → BFD', lvl: 3,
      path: 'Routing → BFD', tags: ['bfd', 'отказоустойчивость'],
      purpose: 'BFD — протокол быстрого обнаружения отказа линка (сотни миллисекунд) для OSPF/BGP. Позволяет переключаться на резерв раньше, чем сработает стандартный таймаут.',
      usage: [
        'Быстрое переключение BGP на резервный канал.',
        'OSPF в сетях с требованием высокой доступности.',
        'Обнаружение проблем на промежуточном оборудовании.'
      ],
      steps: [
        { t: 'Включите BFD', d: 'Routing → BFD → Settings/Interfaces: добавьте интерфейсы, где нужен BFD (обычно WAN).' },
        { t: 'Параметры', d: 'Min Tx=200ms, Min Rx=200ms, Multiplier=3 — компромисс между скоростью и ложными срабатываниями.' },
        { t: 'Примените', d: 'В OSPF Interface Template: Use BFD=yes. В BGP Connection: Use BFD=yes.' },
        { t: 'Проверка', d: 'Routing → BFD → Sessions: состояние up; при обрыве — down за доли секунды.' }
      ],
      scenes: [{
        path: 'Routing → BFD → Sessions', win: 'BFD Sessions', tabs: ['Sessions', 'Settings'],
        cols: [{ t: 'Interface', w: 110 }, { t: 'Peer', w: 130 }, { t: 'State', w: 90 }, { t: 'Uptime', w: 90 }, { t: 'Tx/Rx Interval', w: 120 }],
        rows: [[{ v: 'ether1' }, { v: '198.51.100.1', m: 1 }, { v: 'up', c: 'ok', m: 2 }, '4d2h', '200ms/200ms']],
        sel: 0,
        notes: ['Адрес BFD-соседа', 'Состояние сессии BFD']
      }],
      check: [{ d: 'терминал', c: '/routing bfd session print\n/routing bfd configuration print' }]
    }
  ]
});

window.DATA.push({
  id: 'queues', name: 'Queues (скорость)', ic: 'system',
  items: [
    {
      id: 'q-simple', t: 'Queues → Simple Queues', lvl: 2,
      path: 'Queues → Simple Queues', tags: ['ограничение', 'скорость', 'qos'],
      purpose: 'Simple Queues ограничивают скорость по адресу, подсети или интерфейсу. Простейший способ «обрезать» скорость клиенту или приоритизировать группу устройств.',
      usage: [
        'Ограничение скорости гостям или арендаторам.',
        'Приоритет бухгалтерии над гостевым Wi-Fi.',
        'Гарантированная полоса для видеонаблюдения.'
      ],
      steps: [
        { t: 'Создайте очередь', d: 'Queues → Simple Queues → `+`: Name=`guest-limit`, Target=`10.20.0.0/24`, Max Limit=`20M/20M` (upload/download).' },
        { t: 'Приоритет', d: 'Priority=8 (1 — самый высокий) — такой трафик уступает остальным.' },
        { t: 'Burst', d: 'Burst Limit=40M/40M, Burst Time=8s/8s — короткие всплески на полной скорости.' },
        { t: 'Time', d: 'Вкладка Advanced: Time — расписание действия (например, только в рабочие часы).' },
        { t: 'Проверка', d: 'Queues: колонки Rate и Bytes должны расти; тест speedtest покажет ограничение.' }
      ],
      scenes: [{
        path: 'Queues → Simple Queues', win: 'Simple Queues', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 110 }, { t: 'Target', w: 130 }, { t: 'Max Limit', w: 110 }, { t: 'Burst Limit', w: 110 }, { t: 'Priority', w: 70 }, { t: 'Rate', w: 90 }],
        rows: [
          [{ v: 'guest-limit', m: 2 }, { v: '10.20.0.0/24', m: 3 }, { v: '20M/20M', m: 4 }, '40M/40M', '8', '18.4 Mbps'],
          ['voip-prio', '192.168.88.40/32', '10M/10M', '', '1', '210 kbps']
        ],
        sel: 0,
        notes: ['Кнопка создания очереди', 'Имя очереди', 'Цель: адрес, подсеть или интерфейс', 'Ограничение upload/download']
      }],
      check: [{ d: 'терминал', c: '/queue simple print stats\n/queue simple print\n/queue tree print' }],
      mistakes: ['Target указан как `192.168.88.0/24` без интерфейса — очередь может не сработать на NAT-трафике; используйте target с interface.', 'Ограничение на WAN-интерфейсе без учёта направления upload/download.']
    },
    {
      id: 'q-tree', t: 'Queues → Queue Tree', lvl: 3,
      path: 'Queues → Queue Tree', tags: ['qos', 'приоритет', 'mangle'],
      purpose: 'Queue Tree строит иерархию очередей с приоритетами: родитель ограничивает общий канал, дочерние делят его по меткам пакетов из mangle. Гибкий инструмент QoS.',
      usage: [
        'Приоритизация VoIP и видеозвонков над загрузками.',
        'Разделение канала между отделами с гарантиями.',
        'Ограничение P2P и торрентов в рабочее время.'
      ],
      steps: [
        { t: 'Пометьте трафик', d: 'IP → Firewall → Mangle: mark-packet для VoIP (udp 5060, RTP 10000-20000), torrents, others.' },
        { t: 'Создайте родителя', d: 'Queue Tree → `+`: Name=`total-upload`, Parent=`WAN`, Max Limit=`100M`.' },
        { t: 'Дочерние очереди', d: '`+`: Name=`voip`, Parent=`total-upload`, Packet Mark=`voip`, Priority=1, Max Limit=`10M`, Limit At=`5M`.' },
        { t: 'Остальное', d: '`+`: Name=`bulk`, Parent=`total-upload`, Packet Mark=`bulk`, Priority=8.' },
        { t: 'Проверка', d: 'Колонки Rate по каждой очереди; при перегрузке канала VoIP сохраняет качество.' }
      ],
      scenes: [{
        path: 'Queues → Queue Tree', win: 'Queue Tree', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 110 }, { t: 'Parent', w: 110 }, { t: 'Packet Mark', w: 110 }, { t: 'Max Limit', w: 100 }, { t: 'Priority', w: 70 }, { t: 'Rate', w: 90 }],
        rows: [
          [{ v: 'total-upload', m: 1 }, { v: 'WAN', m: 2 }, '', '100M', '8', '62 Mbps'],
          [{ v: 'voip', m: 3 }, 'total-upload', { v: 'voip', m: 4 }, '10M', '1', '1.8 Mbps'],
          ['bulk', 'total-upload', 'bulk', '80M', '8', '58 Mbps']
        ],
        sel: 1,
        notes: ['Родительская очередь — общий канал', 'Parent — интерфейс (WAN/LAN) или другая очередь', 'Дочерняя очередь для голоса', 'Packet Mark из mangle определяет, какой трафик попадает в очередь']
      }],
      check: [{ d: 'терминал', c: '/queue tree print stats\n/queue type print\n/ip firewall mangle print where action=mark-packet' }]
    },
    {
      id: 'q-types', t: 'Queues → Queue Types', lvl: 3,
      path: 'Queues → Queue Types', tags: ['fq-codel', 'cake', 'buffer'],
      purpose: 'Типы очередей определяют алгоритм обработки: FIFO, SFQ, PCQ, RED, CAKE, fq_codel. От алгоритма зависит задержка (bufferbloat) и справедливость распределения.',
      usage: [
        'fq_codel/cake — против «раздувания буфера» и просадок пинга под нагрузкой.',
        'PCQ — равномерное деление канала между пользователями.',
        'Приоритетные очереди для VoIP.'
      ],
      steps: [
        { t: 'Откройте Queue Types', d: 'Queues → Queue Types: список типов с параметрами.' },
        { t: 'Создайте тип', d: '`+`: Name=`cake-bulk`, Kind=`cake`, Cake Bandwidth=`100M`, Diffserv=diffserv4.' },
        { t: 'Для PCQ', d: 'Kind=`pcq`, PCQ Rate=`1M`, PCQ Classifier=`src-address` — деление между адресами.' },
        { t: 'Примените', d: 'В Simple Queue/Queue Tree вкладка Advanced → Queue Type (upload/download) = созданный тип.' },
        { t: 'Проверка', d: 'Пинг под нагрузкой не должен расти с 10 мс до 300 мс (проверяйте waveform bufferbloat тестом).' }
      ],
      scenes: [{
        path: 'Queues → Queue Types', win: 'Queue Types', tools: [{ t: '+', id: 'add', m: 1 }],
        cols: [{ t: 'Name', w: 130 }, { t: 'Kind', w: 110 }, { t: 'Cake Bandwidth', w: 110 }, { t: 'Diffserv', w: 100 }, { t: 'Comment', w: 150 }],
        rows: [
          [{ v: 'cake-bulk', m: 2 }, { v: 'cake', m: 3 }, { v: '100M', m: 4 }, 'diffserv4', 'против bufferbloat'],
          ['pcq-users', 'pcq', '', '', 'деление по src-address'],
          ['default-small', 'fq_codel', '', '', 'по умолчанию']
        ],
        sel: 0,
        notes: ['Кнопка создания типа очереди', 'Имя типа', 'Алгоритм: cake, fq_codel, pcq, red, sfq, fifo', 'Полоса, которую cake считает доступной']
      }],
      check: [{ d: 'терминал', c: '/queue type print\n/queue simple print detail' }]
    },
    {
      id: 'q-interface', t: 'Queues → Interface Queues', lvl: 3,
      path: 'Queues → Interface Queues', tags: ['интерфейс', 'очередь', 'ethernet'],
      purpose: 'Очередь на интерфейсе ограничивает исходящий трафик порта целиком, без разбора по адресам. Быстрый способ не перегрузить аплинк и снизить потери.',
      usage: [
        'Ограничение аплинка до фактической скорости канала.',
        'Защита от переполнения буфера на WAN.',
        'Простое ограничение порта к оборудованию.'
      ],
      steps: [
        { t: 'Откройте Interface Queues', d: 'Queues → Interface Queues: список интерфейсов и типов очередей.' },
        { t: 'Выберите тип', d: 'Для интерфейса укажите Queue Type, например `ethernet-default` или `cake`.' },
        { t: 'Ограничьте скорость', d: 'Лучше через Simple Queue на интерфейсе (`target=WAN`), т. к. Interface Queue только выбирает алгоритм.' },
        { t: 'Проверка', d: 'Interfaces → Traffic: исходящая скорость не превышает настроенную.' }
      ],
      scenes: [{
        path: 'Queues → Interface Queues', win: 'Interface Queues',
        cols: [{ t: 'Interface', w: 120 }, { t: 'Queue Type', w: 160 }, { t: 'Comment', w: 200 }],
        rows: [[{ v: 'ether1' }, { v: 'ethernet-default', m: 1 }, 'WAN']],
        sel: 0,
        notes: ['Тип очереди, применяемый к исходящему трафику интерфейса']
      }],
      check: [{ d: 'терминал', c: '/queue interface print\n/interface ethernet print' }]
    }
  ]
});
