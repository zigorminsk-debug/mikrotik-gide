/* Разделы: «Интерфейсы и мосты» и «Switch» */
window.DATA = window.DATA || [];
window.DATA.push({
  id: 'iface', name: 'Интерфейсы и мосты', ic: 'iface',
  items: [
    {
      id: 'if-list', t: 'Interface — список интерфейсов', lvl: 1,
      path: 'Interface → Interface', tags: ['интерфейсы', 'статус'],
      purpose: 'Главный список всех логических и физических интерфейсов: порты, мосты, VLAN, туннели, PPPoE. Отсюда видно, что включено, какой MAC, MTU, скорость и текущий трафик.',
      usage: [
        'Проверка, поднят ли линк на порту (флаг R — running, X — disabled).',
        'Просмотр текущей скорости Tx/Rx и счётчиков ошибок.',
        'Быстрое отключение порта (Disable) при инциденте и включение обратно.'
      ],
      steps: [
        { t: 'Откройте список', d: 'Interface → Interface. Колонки R (running), Name, Type, Actual MTU, L2 MTU, MAC, Tx/Rx.' },
        { t: 'Отсортируйте по имени', d: 'Клик по заголовку Name. Для удобства переименуйте порты: двойной клик → Name = `WAN`, `LAN1`.' },
        { t: 'Раскраска статусов', d: 'Красный/серый — disabled, чёрный — активен. Вкладка Traffic показывает график по выбранному интерфейсу.' },
        { t: 'Счётчики', d: 'Двойной клик → вкладка Traffic: Rx/Tx packets, drops, errors. Рост errors говорит о кабеле или скорости.' },
        { t: 'Комментарии', d: 'Поле Comment — пометьте назначение порта: «uplink провайдер», «камера 3» и т. п.' }
      ],
      scenes: [{
        path: 'Interface → Interface', win: 'Interface List', tabs: ['Interface', 'Ethernet', 'VLAN', 'Bridge', 'WireGuard'],
        cols: [{ t: 'R', w: 26 }, { t: 'Name', w: 116 }, { t: 'Type', w: 82 }, { t: 'Actual MTU', w: 78 },
          { t: 'L2 MTU', w: 64 }, { t: 'Tx', w: 74 }, { t: 'Rx', w: 74 }, { t: 'Comment', w: 170 }],
        rows: [
          [{ v: 'R', c: 'ok', m: 1 }, 'WAN', 'ether', '1500', '1598', '1.2 Gbps', '148 Mbps', 'uplink провайдер'],
          ['R', 'LAN1', 'ether', '1500', '1598', '84 Mbps', '230 Mbps', 'офисный свитч'],
          ['R', 'bridge-lan', 'bridge', '1500', '1598', '240 Mbps', '239 Mbps', ''],
          [{ v: 'X', c: 'no', m: 2 }, 'ether5', 'ether', '1500', '1598', '0 bps', '0 bps', 'резерв']
        ],
        sel: 0,
        notes: ['R — линк поднят; X — интерфейс выключен',
          'Disabled-порт: включается кнопкой ✓ или двойным кликом']
      }],
      check: [{ d: 'терминал', c: '/interface print\n/interface print stats\n/interface ethernet print' }]
    },
    {
      id: 'if-ethernet', t: 'Ethernet — физические порты', lvl: 1,
      path: 'Interface → Ethernet', tags: ['скорость', 'дуплекс', 'poe'],
      purpose: 'Настройки физического уровня: скорость и дуплекс, автосогласование, flow control, состояние SFP-модулей, PoE и кабельная диагностика.',
      usage: [
        'Проблемы со скоростью: линк поднялся на 100 Мбит вместо 1 Гбит.',
        'Диагностика SFP: температура, длина волны, уровень сигнала.',
        'Ограничение порта до 100 Мбит для старых устройств, включение PoE на порту.'
      ],
      steps: [
        { t: 'Откройте вкладку Ethernet', d: 'Interface → вкладка Ethernet. Колонки: Name, Speed, Full Duplex, Auto Negotiation, Tx/Rx Flow Control.' },
        { t: 'Двойной клик по порту', d: 'Вкладка General — общие параметры, вкладка SFP — диагностика модуля, PoE — питание.' },
        { t: 'Задайте скорость вручную', d: 'Auto Negotiation = no, Speed = 1Gbps, Full Duplex = yes. Обе стороны линка должны иметь одинаковые настройки.' },
        { t: 'Проверьте модуль', d: 'Вкладка SFP: vendor, temperature, Tx/Rx power. Нулевой Rx power = нет сигнала по волокну.' },
        { t: 'PoE', d: 'Вкладка PoE: PoE Out = auto-on / forced-on, Voltage = auto. Питание только на портах, поддерживающих PoE-out.' }
      ],
      scenes: [{
        path: 'Interface → Ethernet', win: 'Ethernet', tabs: ['Ethernet', 'SFP', 'PoE'],
        cols: [{ t: 'Name', w: 104 }, { t: 'Speed', w: 90 }, { t: 'Full Duplex', w: 86 }, { t: 'Auto Negotiation', w: 110 },
          { t: 'Tx Flow Control', w: 96 }, { t: 'Rx Flow Control', w: 96 }],
        rows: [
          [{ v: 'WAN', m: 1 }, { v: '1Gbps', c: 'ok' }, 'yes', 'yes', 'no', 'no'],
          ['LAN1', '1Gbps', 'yes', 'yes', 'no', 'no'],
          [{ v: 'ether5', m: 2 }, { v: '100Mbps', c: 'no' }, 'yes', 'no', 'no', 'no']
        ],
        sel: 0,
        notes: ['Двойной клик открывает свойства порта',
          'Порт поднялся на 100 Мбит — проверьте кабель и автосогласование']
      }],
      check: [{ d: 'терминал', c: '/interface ethernet print\n/interface ethernet monitor ether1 once' }],
      mistakes: ['Жёстко заданная скорость на одной стороне и auto на другой — линк «плавает» или не поднимается.'],
      warn: 'Принудительное 1000 Мбит без Full Duplex = yes не работает: гигабит всегда full-duplex.'
    },
    {
      id: 'if-vlan', t: 'VLAN — виртуальные сети', lvl: 2,
      path: 'Interface → VLAN', tags: ['vlan', '802.1q', 'сегментация'],
      purpose: 'VLAN-интерфейс добавляет тег 802.1Q к трафику и позволяет держать несколько независимых сетей на одном физическом линке. В RouterOS VLAN создаётся «поверх» физического порта или моста.',
      usage: [
        'Разделение офиса: гостевая сеть, сеть камер, сеть 1С — без отдельного кабеля.',
        'Транк до коммутатора: несколько VLAN через один порт.',
        'Терминация VLAN провайдера (IPTV, интернет, телефония) на одном WAN-порту.'
      ],
      steps: [
        { t: 'Создайте VLAN', d: 'Interface → VLAN → `+`: Name=`vlan10-office`, VLAN ID=10, Interface=bridge-lan (или ether1), MTU=1500.' },
        { t: 'Назначьте адрес', d: 'IP → Address → `+`: Address=10.10.10.1/24, Interface=vlan10-office.' },
        { t: 'Поднимите сервисы', d: 'DHCP Server и DNS-пул для этой VLAN настраиваются так же, как для обычной сети.' },
        { t: 'Пропустите VLAN через мост', d: 'Если VLAN нужен на нескольких портах — включите Bridge → VLANs и VLAN filtering, иначе VLAN «живёт» только на одном интерфейсе.' },
        { t: 'Проверьте теги', d: 'Interface → VLAN: колонка Current Tagged/Untagged показывает, где тег снимается.' }
      ],
      scenes: [{
        path: 'Interface → VLAN', win: 'VLAN', tabs: ['VLAN', 'Interface'],
        cols: [{ t: 'Name', w: 130 }, { t: 'VLAN ID', w: 66 }, { t: 'Interface', w: 116 }, { t: 'MTU', w: 60 },
          { t: 'Current Tagged', w: 110 }, { t: 'Current Untagged', w: 120 }],
        rows: [
          [{ v: 'vlan10-office', m: 1 }, { v: '10', m: 2 }, 'bridge-lan', '1500', 'bridge-lan', ''],
          ['vlan20-guest', '20', 'bridge-lan', '1500', 'bridge-lan', ''],
          ['vlan100-mgmt', '100', 'ether1', '1500', 'ether1', '']
        ],
        sel: 0,
        form: {
          title: 'New Interface <VLAN>', buttons: ['OK', 'Cancel', 'Apply'],
          fields: [
            { l: 'Name', v: 'vlan10-office', m: 3 },
            { l: 'VLAN ID', v: '10', m: 4 },
            { l: 'Interface', v: 'bridge-lan', type: 'select' },
            { l: 'MTU', v: '1500' },
            { l: 'ARP', v: 'enabled', type: 'select' },
            { l: 'Use Service Tag', v: false, type: 'check' }
          ]
        },
        notes: ['Имя VLAN-интерфейса — по нему он будет виден в IP → Address',
          'VLAN ID должен совпадать с настройкой на коммутаторе/провайдере',
          'Кнопка + создаёт новый VLAN',
          'ID 1 обычно зарезервирован как native']
      }],
      check: [{ d: 'терминал', c: '/interface vlan print\n/interface vlan print detail\n/ip address print where interface~"vlan"' }],
      warn: 'VLAN ID должен быть одинаковым на всех устройствах пути. Native/untagged VLAN настраивается в Bridge → Ports (PVID).'
    },
    {
      id: 'if-bonding', t: 'Bonding — агрегация каналов', lvl: 3,
      path: 'Interface → Bonding', tags: ['lacp', 'агрегация', 'отказоустойчивость'],
      purpose: 'Bonding объединяет несколько физических портов в один логический канал: увеличивает пропускную способность (LACP) или обеспечивает резервирование (active-backup).',
      usage: [
        'Подключение к коммутатору провайдера/ЦОД с агрегацией 2×1G или 4×10G.',
        'Резервирование линка между двумя коммутаторами (active-backup).',
        'Подключение сервера с двумя сетевыми картами.'
      ],
      steps: [
        { t: 'Создайте bonding', d: 'Interface → Bonding → `+`: Name=`bond-wan`, Mode=802.3ad (LACP) или active-backup, Transmit Hash Policy=layer-2-and-3.' },
        { t: 'Добавьте порты', d: 'Вкладка Slaves → `+`: выберите ether1 и ether2. Оба порта должны быть свободны (не в мосту и без адресов).' },
        { t: 'Настройте мониторинг', d: 'Вкладка General: MII Monitoring=yes, MII Interval=100ms — порт с потерянным линком выводится из работы.' },
        { t: 'Настройте коммутатор', d: 'На стороне коммутатора создайте LAG/Port-Channel с тем же режимом LACP и теми же портами.' },
        { t: 'Используйте bonding', d: 'IP → Address или Bridge → Ports указывайте интерфейс `bond-wan`, а не отдельные ether1/ether2.' }
      ],
      scenes: [{
        path: 'Interface → Bonding', win: 'Bonding', tabs: ['General', 'Slaves', 'Status'],
        cols: [{ t: 'Name', w: 120 }, { t: 'Mode', w: 120 }, { t: 'Slaves', w: 140 }, { t: 'LACP Rate', w: 92 }, { t: 'MII', w: 70 }],
        rows: [[{ v: 'bond-wan', m: 1 }, { v: '802.3ad', m: 2 }, 'ether1,ether2', '1sec', 'yes']],
        sel: 0,
        form: {
          title: 'Bonding <bond-wan>', tabs: ['General', 'Slaves'], buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Name', v: 'bond-wan' },
            { l: 'Mode', v: '802.3ad', type: 'select', m: 2 },
            { l: 'Slaves', v: 'ether1, ether2', m: 3 },
            { l: 'LACP Rate', v: '1sec', type: 'select' },
            { l: 'Transmit Hash', v: 'layer-2-and-3', type: 'select' },
            { l: 'MII Monitoring', v: 'yes', type: 'select' }
          ]
        },
        notes: ['Логический интерфейс используется везде вместо физических портов',
          'Режим должен совпадать с настройкой коммутатора',
          'Оба порта добавляются в Slaves и не должны быть заняты']
      }],
      check: [{ d: 'терминал', c: '/interface bonding print detail\n/interface bonding monitor bond-wan once' }],
      warn: 'Порты bonding должны быть в одной аппаратной группе коммутатора и с одинаковой скоростью. Проверьте, что на них не настроены VLAN/bridge.'
    },
    {
      id: 'if-bridge', t: 'Bridge — мост (основа LAN)', lvl: 1,
      path: 'Interface → Bridge', tags: ['bridge', 'lan', 'коммутация'],
      purpose: 'Мост объединяет порты в один L2-сегмент: все LAN-порты и Wi-Fi получают один адрес шлюза, единый DHCP, общий broadcast-домен. Это стандартная схема «роутер + коммутатор» в одном устройстве.',
      usage: [
        'Классическая схема: ether2–ether5 и Wi-Fi в bridge-lan, шлюз 192.168.88.1.',
        'Мост между проводной и беспроводной сетью.',
        'Основа для Bridge VLAN Filtering (сегментация на одном устройстве).'
      ],
      steps: [
        { t: 'Создайте мост', d: 'Bridge → Bridge → `+`: Name=`bridge-lan`, Protocol Mode=rstp, VLAN Filtering=no (пока), Admin MAC оставьте auto.' },
        { t: 'Добавьте порты', d: 'Bridge → Ports → `+` для ether2…ether5, interface=WAN не добавлять. Bridge=bridge-lan, PVID=1.' },
        { t: 'Добавьте Wi-Fi', d: 'Bridge → Ports → `+`: interface=wifi1 (или wlan1), bridge=bridge-lan — беспроводные клиенты попадут в ту же сеть.' },
        { t: 'Назначьте IP мосту', d: 'IP → Address → `+`: 192.168.88.1/24, interface=bridge-lan. На сами порты адреса не ставятся.' },
        { t: 'Аппаратное ускорение', d: 'На CRS/ hEX с коммутатором в Bridge → Ports поле Hw = yes — трафик между портами идёт через чип, не через CPU.' },
        { t: 'Проверьте', d: 'Bridge → Hosts должен показать MAC-адреса подключённых устройств.' }
      ],
      scenes: [
        {
          path: 'Bridge → Bridge', win: 'Bridge', tabs: ['Bridge', 'Ports', 'VLANs', 'Hosts', 'Filters'],
          cols: [{ t: 'Name', w: 120 }, { t: 'Protocol Mode', w: 108 }, { t: 'VLAN Filtering', w: 96 }, { t: 'Admin MAC', w: 136 }, { t: 'MTU', w: 60 }],
          rows: [[{ v: 'bridge-lan', m: 1 }, 'rstp', 'no', 'DC:2C:6E:A1:4F:21', 'auto']],
          sel: 0,
          notes: ['Имя моста используется в адресах, DHCP и firewall']
        },
        {
          path: 'Bridge → Ports', win: 'Bridge Ports',
          tools: [{ t: '+', id: 'add', m: 1 }, { t: '−', id: 'del' }, { t: '✓' }, { t: '✕' }, { t: '⇅' }],
          cols: [{ t: 'Interface', w: 92 }, { t: 'Bridge', w: 106 }, { t: 'PVID', w: 56 }, { t: 'Hw', w: 44 },
            { t: 'Path Cost', w: 74 }, { t: 'Edge', w: 60 }, { t: 'Comment', w: 150 }],
          rows: [
            [{ v: 'ether2', m: 2 }, 'bridge-lan', '1', { v: 'yes', c: 'ok' }, 'auto', 'auto', 'офис'],
            ['ether3', 'bridge-lan', '1', 'yes', 'auto', 'auto', 'офис'],
            ['ether4', 'bridge-lan', '1', 'yes', 'auto', 'auto', 'камеры'],
            [{ v: 'wifi1', m: 3 }, 'bridge-lan', '1', 'no', 'auto', 'auto', 'Wi-Fi']
          ],
          sel: 0,
          notes: ['Кнопка добавления порта в мост',
            'Порт в мосту: с него снимается IP-адрес, шлюз живёт на мосте',
            'Wi-Fi интерфейс тоже добавляется в мост']
        }
      ],
      check: [{ d: 'терминал', c: '/interface bridge print\n/interface bridge port print\n/interface bridge host print' }],
      warn: 'После добавления порта в мост снимите с него IP-адрес (IP → Address), иначе получите петлю/непредсказуемую маршрутизацию.',
      mistakes: [
        'Добавили WAN-порт в LAN-мост — интернет «раздаётся» из WAN и NAT не работает.',
        'Оставили STP/rstp выключенным и соединили два порта кабелем — широковещательный шторм.',
        'Назначили IP на ether2 вместо bridge-lan — при добавлении порта в мост адрес перестаёт работать.'
      ]
    },
    {
      id: 'if-bridge-ports', t: 'Bridge → Ports — порты моста', lvl: 2,
      path: 'Bridge → Ports', tags: ['bridge', 'pvid', 'edge'],
      purpose: 'Порты моста определяют, какие интерфейсы входят в L2-сегмент, с каким PVID (native VLAN) они работают, участвуют ли в STP и включено ли аппаратное ускорение.',
      usage: [
        'Назначение PVID порту доступа (access-порт в нужной VLAN).',
        'Отключение STP на порту к конечному устройству (Edge=yes) для быстрого поднятия линка.',
        'Включение/выключение аппаратной коммутации (Hw) на CRS.',
        'Настройка trunk-порта: несколько VLAN в Bridge → VLANs.'
      ],
      steps: [
        { t: 'Откройте Ports', d: 'Bridge → Ports: список «интерфейс → мост», PVID, Hw, Path Cost, Edge.' },
        { t: 'Задайте PVID', d: 'Двойной клик по порту → PVID = номер VLAN для access-порта (например 20 для гостевой сети).' },
        { t: 'Edge и BPDU', d: 'Для портов к ПК/камерам: Edge=yes, BPDU Guard=yes — защита от подключения второго коммутатора.' },
        { t: 'Trunk-порт', d: 'Для транка PVID=1, а нужные VLAN добавить тегированными в Bridge → VLANs (tagged=этот порт).' },
        { t: 'Hw offload', d: 'Hw=yes для портов коммутатора; если порт — часть bonding или VLAN-схемы, не поддерживаемой чипом, offload отключится.' }
      ],
      scenes: [{
        path: 'Bridge → Ports', win: 'Bridge Port', tabs: ['General', 'STP', 'VLAN'],
        tools: [{ t: '+', id: 'add' }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Interface', w: 92 }, { t: 'Bridge', w: 106 }, { t: 'PVID', w: 56 }, { t: 'Hw', w: 44 }, { t: 'Edge', w: 60 }, { t: 'BPDU Guard', w: 84 }],
        rows: [
          ['ether2', 'bridge-lan', '1', 'yes', 'yes', 'no'],
          [{ v: 'ether4', m: 1 }, 'bridge-lan', { v: '20', m: 2 }, 'yes', 'yes', { v: 'yes', m: 3 }]
        ],
        sel: 1,
        notes: ['Порт, который настраиваем',
          'PVID 20 — весь нетегированный трафик порта попадёт в VLAN 20',
          'BPDU Guard отключит порт при получении BPDU от чужого коммутатора']
      }],
      check: [{ d: 'терминал', c: '/interface bridge port print detail\n/interface bridge port monitor ether4 once' }]
    },
    {
      id: 'if-bridge-vlan', t: 'Bridge → VLANs и VLAN Filtering', lvl: 3,
      path: 'Bridge → VLANs · Bridge → Bridge (VLAN Filtering)',
      tags: ['vlan', 'trunk', 'native'],
      purpose: 'VLAN Filtering превращает мост в управляемый коммутатор: каждая VLAN содержит свой набор портов (tagged/untagged), а роутер получает интерфейс для маршрутизации между ними. Это основной способ сегментации на RouterOS 7.',
      usage: [
        'Офис с VLAN 10 (сотрудники), 20 (гости), 30 (камеры), 100 (управление) на одном коммутаторе.',
        'Транк до вышестоящего коммутатора со всеми VLAN.',
        'Гостевая Wi-Fi сеть, изолированная от основной.'
      ],
      steps: [
        { t: 'Подготовьте мост', d: 'Bridge → Bridge: включите VLAN Filtering=yes (пока только после настройки таблицы!), Protocol Mode=rstp.' },
        { t: 'Создайте записи VLAN', d: 'Bridge → VLANs → `+`: VLAN IDs=10, Tagged=bridge-lan (если роутер сам маршрутизирует), Untagged=ether2,ether3 (access-порты).' },
        { t: 'Задайте PVID портам', d: 'Bridge → Ports: для access-портов PVID=10, для транка PVID=1 и tagged в таблице VLAN.' },
        { t: 'Создайте VLAN-интерфейсы', d: 'Interface → VLAN поверх `bridge-lan` для каждой VLAN, где нужен шлюз, и назначьте IP → Address.' },
        { t: 'Проверьте себя', d: 'Включайте VLAN Filtering в Safe Mode: если что-то не так — доступ восстановится автоматически.' },
        { t: 'Firewall', d: 'Маршрутизацию между VLAN разрешайте/запрещайте правилами forward с in-interface/out-interface.' }
      ],
      scenes: [
        {
          path: 'Bridge → VLANs', win: 'Bridge VLAN Table',
          tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
          cols: [{ t: 'VLAN IDs', w: 76 }, { t: 'Tagged', w: 180 }, { t: 'Untagged', w: 200 }, { t: 'Current Tagged', w: 150 }, { t: 'Current Untagged', w: 150 }],
          rows: [
            [{ v: '10', m: 2 }, { v: 'bridge-lan', m: 3 }, 'ether2, ether3', 'bridge-lan', 'ether2, ether3'],
            ['20', 'bridge-lan', 'ether4', 'bridge-lan', 'ether4'],
            ['100', 'ether1, bridge-lan', '', 'ether1, bridge-lan', '']
          ],
          sel: 0,
          notes: ['Кнопка создания записи VLAN',
            'VLAN ID, который нужно пропустить',
            'bridge-lan в Tagged обязателен, если роутер должен маршрутизировать эту VLAN']
        },
        {
          path: 'Bridge → Bridge', win: 'Bridge <bridge-lan>', tabs: ['General', 'STP', 'VLAN', 'DHCP'],
          form: {
            title: 'Bridge <bridge-lan>', buttons: ['Apply', 'Cancel'],
            fields: [
              { l: 'Name', v: 'bridge-lan' },
              { l: 'VLAN Filtering', v: 'yes', type: 'select', m: 1 },
              { l: 'Protocol Mode', v: 'rstp', type: 'select' },
              { l: 'IGMP Snooping', v: 'no', type: 'select' },
              { l: 'Fast Forward', v: true, type: 'check' }
            ]
          },
          notes: ['VLAN Filtering включайте последним — после заполнения таблицы VLAN и PVID']
        }
      ],
      check: [{
        d: 'терминал',
        c: '/interface bridge vlan print\n/interface bridge port print where pvid>1\n/interface bridge vlan print detail'
      }],
      danger: 'Если включить VLAN Filtering до настройки таблицы VLAN и PVID, доступ к роутеру пропадёт — только консоль/сброс. Всегда работайте в Safe Mode или через отдельный management-порт.',
      mistakes: [
        'Забыли добавить `bridge-lan` в Tagged — шлюз VLAN не отвечает.',
        'PVID порта не совпадает с untagged VLAN — устройства не получают адреса.',
        'Создали VLAN-интерфейс поверх физического порта, а не поверх моста, при включённом VLAN Filtering — трафик не проходит.'
      ]
    },
    {
      id: 'if-bridge-hosts', t: 'Bridge → Hosts — таблица MAC', lvl: 2,
      path: 'Bridge → Hosts', tags: ['mac', 'диагностика', 'петли'],
      purpose: 'Таблица MAC-адресов моста показывает, какое устройство на каком порту видно и в какой VLAN. Это главный инструмент поиска «мигающих» адресов, петель и подключённых устройств.',
      usage: [
        'Найти, на каком порту находится конкретный MAC/IP.',
        'Диагностика петли: один MAC «мечется» между портами.',
        'Проверка, что Wi-Fi клиент попал в нужную VLAN.'
      ],
      steps: [
        { t: 'Откройте Hosts', d: 'Bridge → Hosts: MAC, VID, Interface, Age.' },
        { t: 'Найдите адрес', d: 'Кнопка поиска (⌕) или фильтр по MAC. Age уменьшается каждую секунду и обновляется трафиком.' },
        { t: 'Проверьте петлю', d: 'Если один MAC появляется на двух портах поочерёдно — в сети коммутационная петля: включите RSTP и найдите кабель.' },
        { t: 'Статические записи', d: 'Вкладка `+` с MAC и портом создаёт статическую запись — защита от подмены MAC на порту.' }
      ],
      scenes: [{
        path: 'Bridge → Hosts', win: 'Bridge Hosts', tabs: ['Hosts', 'Host'],
        cols: [{ t: 'MAC Address', w: 132 }, { t: 'VID', w: 44 }, { t: 'On Interface', w: 104 }, { t: 'Age', w: 62 }, { t: 'Local', w: 54 }],
        rows: [
          ['00:1B:44:11:3A:B7', { v: '10', m: 1 }, 'ether2', '2m18s', 'no'],
          ['D4:CA:6D:77:01:2E', '20', 'wifi1', '4m02s', 'no'],
          ['DC:2C:6E:A1:4F:21', '1', 'bridge-lan', '0s', 'yes']
        ],
        sel: 0,
        notes: ['VID показывает, в какой VLAN виден MAC — быстрый способ проверить PVID порта']
      }],
      check: [{ d: 'терминал', c: '/interface bridge host print\n/interface bridge host print where vid=20' }]
    },
    {
      id: 'if-pppoe-client', t: 'PPPoE Client — подключение к провайдеру', lvl: 2,
      path: 'Interface → PPPoE Client', tags: ['pppoe', 'провайдер', 'wan'],
      purpose: 'Клиент PPPoE поднимает сессию с провайдером (или с вышестоящим роутером), получает IP, шлюз и DNS по протоколу PPP. Стандарт для домашних и офисных подключений в СНГ.',
      usage: [
        'Подключение к провайдеру по логину/паролю (PPPoE).',
        'Резервный канал через PPPoE поверх LTE/другого линка.',
        'Терминация PPPoE от вышестоящего роутера в схеме «доступ по логину».'
      ],
      steps: [
        { t: 'Освободите порт', d: 'Убедитесь, что WAN-порт не в мосту и без адреса: Interface → Interface, а также Bridge → Ports.' },
        { t: 'Создайте клиента', d: 'Interface → PPPoE Client → `+`: Name=`pppoe-out1`, Interface=WAN, User и Password от провайдера.' },
        { t: 'Маршрут и DNS', d: 'Add Default Route=yes, Use Peer DNS=yes, Dial On Demand=no.' },
        { t: 'MTU/MRU', d: 'По умолчанию 1480/1480. Если сайты открываются частично — снизьте до 1472 и проверьте.' },
        { t: 'NAT', d: 'IP → Firewall → NAT: out-interface=`pppoe-out1`, action=masquerade (или out-interface-list=WAN).' },
        { t: 'Проверьте статус', d: 'Interface → Interface: у pppoe-out1 флаг R, в IP → Address — динамический адрес.' }
      ],
      scenes: [{
        path: 'Interface → PPPoE Client', win: 'PPPoE Client', tabs: ['General', 'Dial Out', 'Status'],
        cols: [{ t: 'Name', w: 110 }, { t: 'Interface', w: 92 }, { t: 'User', w: 130 }, { t: 'Add Default Route', w: 110 }, { t: 'Running', w: 66 }],
        rows: [[{ v: 'pppoe-out1', m: 1 }, 'WAN', 'office@provider.by', 'yes', { v: 'true', c: 'ok' }]],
        sel: 0,
        form: {
          title: 'PPPoE Client <pppoe-out1>', tabs: ['General', 'Dial Out', 'Status'], buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Name', v: 'pppoe-out1' },
            { l: 'Interface', v: 'WAN', type: 'select', m: 2 },
            { l: 'User', v: 'office@provider.by', m: 3 },
            { l: 'Password', v: '••••••••' },
            { l: 'Add Default Route', v: 'yes', type: 'select' },
            { l: 'Use Peer DNS', v: 'yes', type: 'select' },
            { l: 'MTU / MRU', v: '1480 / 1480' }
          ]
        },
        notes: ['Интерфейс клиента — его имя указывается в NAT и firewall',
          'Физический порт, в который приходит PPPoE',
          'Логин в формате провайдера, часто с доменом']
      }],
      check: [{ d: 'терминал', c: '/interface pppoe-client print detail\n/ip address print where interface~"pppoe"\n/log print where topics~"pppoe"' }],
      mistakes: ['PPPoE-порт добавляли в bridge — сессия не поднимается.', 'Забыли `add-default-route=yes` — интернет есть, но маршрута по умолчанию нет.']
    },
    {
      id: 'if-vrrp', t: 'VRRP — резервирование шлюза', lvl: 3,
      path: 'Interface → VRRP', tags: ['vrrp', 'отказоустойчивость', 'шлюз'],
      purpose: 'VRRP создаёт виртуальный шлюз с общим IP на двух роутерах: если основной выходит из строя, адрес и MAC переезжают на резервный, клиенты этого не замечают.',
      usage: [
        'Отказоустойчивый шлюз офиса на двух роутерах.',
        'Резервирование шлюза в ЦОД и на объектах с требованием непрерывности.',
        'Пара «активный/пассивный» для сегментов VLAN.'
      ],
      steps: [
        { t: 'Создайте VRRP', d: 'Interface → VRRP → `+`: Name=`vrrp-lan`, Interface=bridge-lan, VRID=1 (одинаковый на обоих), Priority=200 (больше = активный), Version=3.' },
        { t: 'Назначьте виртуальный IP', d: 'IP → Address → `+`: 192.168.88.1/24, interface=vrrp-lan. Именно этот адрес указывают клиенты как шлюз.' },
        { t: 'Реальный адрес роутера', d: 'На каждом роутере оставьте себе уникальный IP на bridge-lan, например .252 и .253.' },
        { t: 'Синхронизируйте параметры', d: 'VRID, версия, интервал (1s) и аутентификация должны совпадать. Разные VRID = два независимых VRRP.' },
        { t: 'Проверка переключения', d: 'Отключите линк на активном — резервный должен стать MASTER за 3–4 секунды, шлюз продолжит отвечать.' }
      ],
      scenes: [{
        path: 'Interface → VRRP', win: 'VRRP', tabs: ['VRRP', 'Interface'],
        cols: [{ t: 'Name', w: 96 }, { t: 'Interface', w: 104 }, { t: 'VRID', w: 56 }, { t: 'Priority', w: 66 }, { t: 'Version', w: 60 }, { t: 'State', w: 82 }],
        rows: [
          [{ v: 'vrrp-lan', m: 1 }, 'bridge-lan', { v: '1', m: 2 }, { v: '200', m: 3 }, '3', { v: 'MASTER', c: 'ok' }],
          ['vrrp-guest', 'vlan20-guest', '2', '150', '3', 'BACKUP']
        ],
        sel: 0,
        notes: ['Имя VRRP-интерфейса',
          'VRID должен совпадать на всех роутерах группы',
          'Больший приоритет = активный роутер (по умолчанию 100)']
      }],
      check: [{ d: 'терминал', c: '/interface vrrp print detail\n/interface vrrp monitor vrrp-lan once' }]
    },
    {
      id: 'if-detect', t: 'Detect Internet', lvl: 2,
      path: 'Interface → Detect Internet', tags: ['wan', 'lan', 'списки'],
      purpose: 'Функция автоматически определяет, какие интерфейсы смотрят в интернет (WAN), какие — в локальную сеть (LAN), и поддерживает списки интерфейсов для firewall, NAT и Cloud DDNS.',
      usage: [
        'Быстрое заполнение интерфейсных списков WAN/LAN без ручного перечисления портов.',
        'Правила firewall «in-interface-list=WAN» вместо конкретного имени порта.',
        'Корректная работа IP → Cloud DDNS на мульти-WAN.'
      ],
      steps: [
        { t: 'Откройте Detect Internet', d: 'Interface → Detect Internet (в списке интерфейсов кнопка Detect Internet).' },
        { t: 'Создайте списки', d: 'Interface → Interface List: создайте `WAN` и `LAN`.' },
        { t: 'Включите детект', d: 'В окне Detect Internet выберите detect-interface-list=WAN, internet-interface-list=WAN, lan-interface-list=LAN.' },
        { t: 'Добавьте порты в списки', d: 'Interface → Interface List → `+` (или вкладка List в окне интерфейса): WAN = ether1/pppoe-out1, LAN = bridge-lan.' },
        { t: 'Используйте в правилах', d: 'Firewall/NAT: in-interface-list=WAN, out-interface-list=WAN.' }
      ],
      scenes: [{
        path: 'Interface → Interface List', win: 'Interface List', tabs: ['Interface List', 'Detect Internet'],
        cols: [{ t: 'List', w: 90 }, { t: 'Interface', w: 130 }, { t: 'Dynamic', w: 80 }, { t: 'Comment', w: 200 }],
        rows: [
          [{ v: 'WAN', m: 1 }, { v: 'ether1', m: 2 }, 'false', 'провайдер'],
          ['WAN', 'pppoe-out1', 'false', 'резерв LTE'],
          ['LAN', 'bridge-lan', 'false', 'локальная сеть']
        ],
        sel: 0,
        notes: ['Список, к которому относится интерфейс',
          'Один интерфейс может быть в нескольких списках']
      }],
      check: [{ d: 'терминал', c: '/interface list print\n/interface detect-internet print' }]
    }
  ]
});

window.DATA.push({
  id: 'switch', name: 'Switch (коммутатор)', ic: 'bridge',
  items: [
    {
      id: 'sw-switch', t: 'Switch — настройки коммутатора', lvl: 3,
      path: 'Switch → Switch', tags: ['switch', 'crs', 'offload'],
      purpose: 'Раздел управления аппаратным коммутатором (для моделей с чипом, например CRS1xx/2xx и RB с Marvell/Atheros). Показывает чипы, порты, режим работы. На CRS3xx и RouterOS 7 основная коммутация настраивается через Bridge с Hw offload.',
      usage: [
        'Проверка, какие порты принадлежат какому чипу (важно для bonding и VLAN).',
        'Настройка VLAN на коммутаторах, где нет bridge offload (CRS1xx/2xx).',
        'Диагностика: почему трафик идёт через CPU, а не через чип.'
      ],
      steps: [
        { t: 'Проверьте модель', d: 'System → Resources → Board name. CRS3xx и CCR настраивают VLAN через Bridge; CRS1xx/2xx — через Switch.' },
        { t: 'Откройте Switch', d: 'Switch → Switch: список чипов, Name, Type, Ports.' },
        { t: 'Порты и группы', d: 'Switch → Ports: каждому порту назначен switch, скорость, обучение MAC, зеркалирование.' },
        { t: 'CRS3xx: bridge offload', d: 'Bridge → Ports: Hw=yes; убедитесь, что в Bridge → Bridge поле `Hardware Offload` включено.' },
        { t: 'Если offload не работает', d: 'Причины: включённый MSTP на порту, MAC-фильтры, VLAN-схема, не поддерживаемая чипом, IP на порту.' }
      ],
      scenes: [{
        path: 'Switch → Switch', win: 'Switch', tabs: ['Switch', 'Ports', 'VLANs', 'Rules', 'Hosts'],
        cols: [{ t: 'Name', w: 130 }, { t: 'Type', w: 120 }, { t: 'Ports', w: 210 }, { t: 'Comment', w: 140 }],
        rows: [[{ v: 'switch1', m: 1 }, 'Atheros-8327', 'ether1..ether5, sfp1', 'main switch']],
        sel: 0,
        notes: ['Один чип = одна группа портов; между чипами трафик идёт через CPU']
      }],
      check: [{ d: 'терминал', c: '/interface ethernet switch print\n/interface bridge port print where hw=yes' }]
    },
    {
      id: 'sw-vlan', t: 'Switch → VLAN (CRS1xx/2xx)', lvl: 3,
      path: 'Switch → VLANs', tags: ['vlan', 'switch', 'crs'],
      purpose: 'Таблица VLAN аппаратного коммутатора: какому порту какой VLAN и с каким тегом принадлежит. Используется на моделях, где VLAN настраиваются в чипе, а не через bridge.',
      usage: [
        'Настройка 802.1Q на CRS1xx/2xx и RB2011/3011.',
        'Транк между коммутатором и роутером со всеми VLAN.',
        'Изоляция портов без участия CPU.'
      ],
      steps: [
        { t: 'Создайте VLAN', d: 'Switch → VLANs → `+`: Switch=switch1, VLAN ID=10, Ports=ether2,ether3 (доступ), tagging по необходимости.' },
        { t: 'Настройте порт', d: 'Switch → Ports: для access-порта Port VLAN ID=10, VLAN Header=add if missing / remove.' },
        { t: 'Транк', d: 'Для порта к роутеру/другому свитчу: VLAN Header=keep, Port VLAN ID=1.' },
        { t: 'IP-адрессация', d: 'На CRS1xx VLAN-интерфейсы создаются в Interface → VLAN поверх bridge/порта для маршрутизации.' },
        { t: 'Проверьте', d: 'Switch → Hosts покажет VLAN для каждого MAC; Switch → Ports покажет counters.' }
      ],
      scenes: [{
        path: 'Switch → VLANs', win: 'Switch VLAN', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Switch', w: 96 }, { t: 'VLAN ID', w: 66 }, { t: 'Ports', w: 240 }, { t: 'SVL', w: 56 }],
        rows: [
          [{ v: 'switch1' }, { v: '10', m: 2 }, { v: 'ether1, ether2', m: 3 }, 'false'],
          ['switch1', '20', 'ether3, ether4', 'false'],
          ['switch1', '100', 'ether1', 'true']
        ],
        sel: 0,
        notes: ['Чип, к которому применяется правило',
          'Номер VLAN по стандарту 802.1Q',
          'Список портов этой VLAN']
      }],
      check: [{ d: 'терминал', c: '/interface ethernet switch vlan print\n/interface ethernet switch port print' }]
    },
    {
      id: 'sw-rules', t: 'Switch → Rules (ACL)', lvl: 3,
      path: 'Switch → Rules', tags: ['acl', 'switch', 'фильтр'],
      purpose: 'Аппаратные правила коммутатора: фильтрация и перенаправление кадров по MAC, VLAN, порту без нагрузки на CPU. Также используется для зеркалирования портов (port mirroring).',
      usage: [
        'Зеркалирование трафика порта на анализатор.',
        'Блокировка MAC на уровне чипа.',
        'Принудительная отправка кадров VLAN на нужный порт (изоляция).'
      ],
      steps: [
        { t: 'Откройте Rules', d: 'Switch → Rules: таблица правил с условиями (ports, src-mac, dst-mac, vlan-id) и действием.' },
        { t: 'Зеркалирование', d: '`+`: Switch=switch1, Ports=ether5 (куда смотрим), New Dst Ports=ether1 (что копируем).' },
        { t: 'Фильтрация', d: '`+`: Ports=ether2, Src MAC=00:11:22:33:44:55, Action=drop.' },
        { t: 'Порядок важен', d: 'Правила выполняются сверху вниз, первое совпадение выигрывает. Перетаскивайте строки для изменения порядка.' },
        { t: 'Проверка', d: 'Switch → Ports → counters: зеркалируемый порт должен показывать рост Tx.' }
      ],
      scenes: [{
        path: 'Switch → Rules', win: 'Switch Rule', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }, { t: '⇅' }],
        cols: [{ t: '#', w: 30 }, { t: 'Switch', w: 90 }, { t: 'Ports', w: 110 }, { t: 'Src. MAC', w: 132 }, { t: 'New Dst. Ports', w: 140 }, { t: 'Action', w: 72 }],
        rows: [
          ['0', 'switch1', { v: 'ether1', m: 2 }, '', { v: 'ether5', m: 3 }, 'copy'],
          ['1', 'switch1', 'ether2', '00:11:22:33:44:55', '', { v: 'drop', c: 'no' }]
        ],
        sel: 0,
        notes: ['Кнопка создания правила',
          'Порт-источник (откуда берём трафик)',
          'Порт, куда копируем кадры (анализатор)']
      }],
      check: [{ d: 'терминал', c: '/interface ethernet switch rule print\n/interface ethernet switch print stats' }]
    }
  ]
});
