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
      id: 'ppp-l2tp-server', t: 'L2TP/IPsec: VPN-сервер для сотрудников — пошагово', lvl: 3,
      path: 'PPP → L2TP Server · PPP → Secrets · PPP → Profiles · IP → Pool · IP → Firewall',
      tags: ['l2tp', 'ipsec', 'vpn', 'сервер', 'сотрудники', 'psk'],
      purpose: 'Роутер принимает VPN-подключения от сотрудников по L2TP, а трафик внутри туннеля ' +
        'шифруется IPsec. Логин и пароль — обычные PPP-секреты, шифрование — общий ключ IPsec (PSK), ' +
        'никаких сертификатов. Windows, Android и iPhone умеют этот тип VPN из коробки, ' +
        'поэтому ставить клиентам ничего не нужно.',
      usage: [
        'Сотрудник с ноутбука подключается к офисной сети из дома или из кафе.',
        'Доступ к 1С, файлам и камерам без публикации портов наружу.',
        'Резервный путь в офис, когда основной канал лёг.',
        'Простой VPN для небольшой команды: один логин на человека.'
      ],
      pros: [
        'Клиент уже встроен в Windows, Android и iOS — ставить ничего не нужно.',
        'Нет сертификатов: только логин, пароль и общий ключ IPsec.',
        'Доступ отзывается удалением одного PPP-секрета.',
        'Работает за NAT: IPsec сам переходит на udp 4500 (NAT-T).'
      ],
      cons: [
        'Без IPsec трафик не шифруется вообще: L2TP сам по себе — только туннель.',
        'Общий ключ IPsec знают все клиенты — при утечке его меняют всем сразу.',
        'Некоторые провайдеры и гостиничные сети блокируют IPsec.',
        'Нет «родного» клиента для Linux — нужен NetworkManager-l2tp.'
      ],
      warn: 'L2TP без IPsec — это туннель без шифрования: логин и пароль уходят открытым текстом. ' +
        'Обязательно включайте Use IPsec и задавайте длинный IPsec Secret. И не ставьте ' +
        'Use IPsec = yes «наполовину»: в RouterOS 7 нужен режим required, иначе клиент может ' +
        'подключиться без шифрования.',
      steps: [
        {
          t: 'Как это устроено',
          d: 'Клиент подключается к роутеру по L2TP (это туннель PPP поверх IP), а IPsec шифрует ' +
            'весь этот туннель общим ключом. Внутри PPP клиент проходит проверку по логину и паролю ' +
            'из **PPP → Secrets** и получает адрес из пула — как будто он в офисе. ' +
            'Нужны четыре вещи: пул адресов, профиль, логины и включённый L2TP-сервер, плюс два ' +
            'правила firewall для IPsec (udp 500 и udp 4500).',
          noScene: true
        },
        {
          t: 'Создайте пул адресов для клиентов',
          d: '1 — в дереве меню откройте **IP**, 2 — пункт **Pool**. ' +
            '3 — нажмите **+**. 4 — Name = `vpn-pool`. ' +
            '5 — Addresses = `10.99.0.100-10.99.0.199` (сто адресов — с запасом). ' +
            '6 — OK. Эти адреса клиенты получат внутри офисной сети; они не должны пересекаться ' +
            'с вашей LAN (обычно 192.168.88.0/24).',
          sc: {
            marks: 1,
            cap: 'IP → Pool: адреса для VPN-клиентов',
            path: 'IP → Pool', menu: { grp: 1, sub: 2 },
            win: 'IP Pool',
            cols: [{ t: 'Name', w: 150 }, { t: 'Addresses', w: 260 }, { t: 'Used', w: 90 }, { t: 'Comment', w: 180 }],
            rows: [[{ v: 'vpn-pool' }, { v: '10.99.0.100-10.99.0.199' }, { v: '0' }, 'адреса для L2TP/OVPN']],
            sel: 0,
            tools: [{ t: '+', id: 'add', m: 3 }],
            form: {
              title: 'New IP Pool',
              fields: [
                { l: 'Name', v: 'vpn-pool', m: 4 },
                { l: 'Addresses', v: '10.99.0.100-10.99.0.199', m: 5 }
              ],
              buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 6 }]
            },
            notes: [
              '1 — группа IP в дереве меню',
              '2 — пункт Pool',
              '3 — «+»: новый пул',
              '4 — Name: vpn-pool',
              '5 — Addresses: 10.99.0.100-10.99.0.199',
              '6 — OK'
            ]
          }
        },
        {
          t: 'Профиль: адрес шлюза и DNS для клиентов',
          d: 'Профиль описывает, что клиент получит после входа. ' +
            '1 — откройте **PPP**, 2 — пункт **Profiles**, 3 — нажмите **+**. ' +
            '4 — Name = `vpn-staff`. ' +
            '5 — Local Address = `10.99.0.1` (адрес роутера внутри VPN-сети). ' +
            '6 — Remote Address = `vpn-pool` (пул из прошлого шага). ' +
            '7 — DNS Server = `192.168.88.1` (адрес роутера в LAN, чтобы работали внутренние имена). ' +
            '8 — OK.',
          sc: {
            marks: 1,
            cap: 'PPP → Profiles: что получает клиент после входа',
            path: 'PPP → Profiles', menu: { grp: 1, sub: 2 },
            win: 'PPP',
            tabs: ['Interfaces', 'Secrets', 'Profiles', 'PPPoE Server', 'L2TP Server', 'Active Connections'],
            tab: 'Profiles',
            cols: [{ t: 'Name', w: 130 }, { t: 'Local Address', w: 116 }, { t: 'Remote Address', w: 120 }, { t: 'DNS Server', w: 120 }],
            rows: [[{ v: 'vpn-staff' }, { v: '10.99.0.1' }, { v: 'vpn-pool' }, { v: '192.168.88.1' }]],
            sel: 0,
            tools: [{ t: '+', id: 'add', m: 3 }],
            form: {
              title: 'New PPP Profile',
              fields: [
                { l: 'Name', v: 'vpn-staff', m: 4 },
                { l: 'Local Address', v: '10.99.0.1', m: 5 },
                { l: 'Remote Address', v: 'vpn-pool', m: 6 },
                { l: 'DNS Server', v: '192.168.88.1', m: 7 }
              ],
              buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 8 }]
            },
            notes: [
              '1 — группа PPP',
              '2 — пункт Profiles',
              '3 — «+»: новый профиль',
              '4 — Name: vpn-staff',
              '5 — Local Address: адрес роутера в VPN',
              '6 — Remote Address: пул для клиентов',
              '7 — DNS Server: адрес роутера в LAN',
              '8 — OK'
            ]
          }
        },
        {
          t: 'Логин и пароль сотрудника',
          d: '1 — вкладка **Secrets**, 2 — нажмите **+**. ' +
            '3 — Name = `ivanov` (логин). 4 — Password: сложный пароль, запишите. ' +
            '5 — Service = **l2tp** (этим вы разрешаете вход только по L2TP). ' +
            '6 — Profile = `vpn-staff`. 7 — OK. ' +
            'На каждого сотрудника — свой секрет: так доступ отзывается удалением одной строки.',
          sc: {
            marks: 1,
            cap: 'PPP → Secrets: логин и пароль для входа',
            path: 'PPP → Secrets',
            win: 'PPP',
            tabs: ['Interfaces', 'Secrets', 'Profiles', 'PPPoE Server', 'L2TP Server', 'Active Connections'],
            tab: 'Secrets', tabMark: 'Secrets', tabMarkN: 1,
            cols: [{ t: 'Name', w: 110 }, { t: 'Service', w: 90 }, { t: 'Profile', w: 110 }, { t: 'Remote Address', w: 130 }, { t: 'Comment', w: 150 }],
            rows: [[{ v: 'ivanov' }, { v: 'l2tp' }, { v: 'vpn-staff' }, { v: 'vpn-pool' }, 'бухгалтер']],
            sel: 0,
            tools: [{ t: '+', id: 'add', m: 2 }],
            form: {
              title: 'New PPP Secret',
              fields: [
                { l: 'Name', v: 'ivanov', m: 3 },
                { l: 'Password', v: 'S3cret-2026', m: 4 },
                { l: 'Service', v: 'l2tp', type: 'select', m: 5 },
                { l: 'Profile', v: 'vpn-staff', type: 'select', m: 6 }
              ],
              buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 7 }]
            },
            notes: [
              '1 — вкладка Secrets',
              '2 — «+»: новый логин',
              '3 — Name: логин сотрудника',
              '4 — Password: пароль для входа',
              '5 — Service: l2tp',
              '6 — Profile: vpn-staff',
              '7 — OK'
            ]
          }
        },
        {
          t: 'Включите L2TP-сервер и IPsec',
          d: '1 — в дереве откройте **PPP**, 2 — пункт **L2TP Server**. ' +
            '3 — в панели окна нажмите кнопку **L2TP Server** — откроется диалог настроек. ' +
            '4 — Enabled = **yes**. ' +
            '5 — Use IPsec = **required** (именно required: с `no` туннель будет без шифрования). ' +
            '6 — IPsec Secret = длинный ключ, например `d83n2-officE-vpn`. Его вы введёте на каждом ' +
            'клиенте — это общий ключ, а не пароль сотрудника. ' +
            '7 — Default Profile = `vpn-staff`. ' +
            '8 — Apply. Сервер готов принимать подключения.',
          sc: {
            marks: 1,
            cap: 'PPP → L2TP Server: включаем сервер и шифрование',
            path: 'PPP → L2TP Server', menu: { grp: 1, sub: 2 },
            win: 'PPP',
            tabs: ['Interfaces', 'Secrets', 'Profiles', 'PPPoE Server', 'L2TP Server', 'Active Connections'],
            tab: 'L2TP Server',
            cols: [{ t: 'Name', w: 130 }, { t: 'Service', w: 110 }, { t: 'Local Address', w: 120 }],
            rows: [['main', 'l2tp', '10.99.0.1']],
            sel: 0,
            tools: [{ t: 'L2TP Server', id: 'srv', m: 3 }],
            form: {
              title: 'L2TP Server', buttons: [{ t: 'Cancel' }, { t: 'Apply', m: 8 }],
              fields: [
                { l: 'Enabled', v: 'yes', m: 4 },
                { l: 'Use IPsec', v: 'required', type: 'select', m: 5 },
                { l: 'IPsec Secret', v: 'd83n2-officE-vpn', m: 6 },
                { l: 'Default Profile', v: 'vpn-staff', type: 'select', m: 7 }
              ]
            },
            notes: [
              '1 — группа PPP',
              '2 — пункт L2TP Server',
              '3 — кнопка L2TP Server: настройки сервера',
              '4 — Enabled: yes',
              '5 — Use IPsec: required',
              '6 — IPsec Secret: общий ключ IPsec',
              '7 — Default Profile: vpn-staff',
              '8 — Apply'
            ]
          }
        },
        {
          t: 'Firewall: пропустите IPsec',
          d: 'Без этих правил клиент «висит на подключении». 1 — откройте IP → Firewall → ' +
            'вкладку **Filter Rules** и нажмите **+**. ' +
            '2 — первое правило: Chain=**input**, Protocol=**udp**, Dst. Port=**500**, Action=**accept**. ' +
            '3 — второе такое же, но Dst. Port=**4500** (это NAT-T: им пользуется почти всё, ' +
            'что стоит за домашним роутером). ' +
            '4 — третье: Chain=input, Protocol=**esp**, Action=accept (нужно, если NAT-T не используется). ' +
            'Все три должны стоять выше общего запрета в цепочке input.',
          sc: {
            marks: 1,
            cap: 'Filter Rules: три правила для IPsec',
            path: 'IP → Firewall → Filter Rules',
            win: 'IP Firewall',
            tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
            tab: 'Filter Rules',
            cols: [{ t: '#', w: 26 }, { t: 'Chain', w: 66 }, { t: 'Protocol', w: 80 }, { t: 'Dst. Port', w: 76 },
              { t: 'Action', w: 86 }, { t: 'Comment', w: 190 }],
            rows: [
              [{ v: '0' }, { v: 'input' }, { v: 'udp' }, { v: '500', m: 2 }, { v: 'accept', c: 'ok' }, 'ipsec ike'],
              [{ v: '1' }, { v: 'input' }, { v: 'udp' }, { v: '4500', m: 3 }, { v: 'accept', c: 'ok' }, 'ipsec nat-t'],
              [{ v: '2' }, { v: 'input' }, { v: 'esp' }, { v: '', m: 4 }, { v: 'accept', c: 'ok' }, 'ipsec esp']
            ],
            sel: 0,
            tools: [{ t: '+', id: 'add', m: 1 }],
            notes: [
              '1 — «+»: новое правило (Action=accept на вкладке Action)',
              '2 — udp 500: согласование IPsec (IKE)',
              '3 — udp 4500: NAT-T, нужен почти всегда',
              '4 — esp: сам шифрованный трафик'
            ]
          }
        },
        {
          t: 'NAT: клиенты выходят в интернет через офис',
          d: 'Если сотруднику нужен не только доступ в LAN, но и интернет через офисный канал: ' +
            '1 — откройте IP → Firewall → вкладку **NAT**, нажмите **+**. ' +
            '2 — Chain = **srcnat**. ' +
            '3 — Src. Address = `10.99.0.0/24` (адреса VPN-клиентов). ' +
            '4 — Out. Interface List = `WAN`. ' +
            '5 — вкладка **Action**: Action = **masquerade**. ' +
            '6 — OK. Правило «маскирует» VPN-адреса под адрес роутера — так же, как обычную LAN.',
          sc: {
            marks: 1,
            cap: 'IP → Firewall → NAT: маскарад для VPN-клиентов',
            path: 'IP → Firewall → NAT',
            win: 'IP Firewall',
            tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
            tab: 'NAT',
            cols: [{ t: 'Chain', w: 76 }, { t: 'Src. Address', w: 130 }, { t: 'Out. Interface List', w: 150 },
              { t: 'Action', w: 110 }, { t: 'Comment', w: 170 }],
            rows: [
              [{ v: 'srcnat' }, { v: '' }, { v: 'WAN' }, { v: 'masquerade', c: 'ok' }, 'интернет для LAN'],
              [{ v: 'srcnat' }, { v: '10.99.0.0/24' }, { v: 'WAN' }, { v: 'masquerade', c: 'ok' }, 'интернет для VPN']
            ],
            sel: 1,
            tools: [{ t: '+', id: 'add', m: 1 }],
            form: {
              title: 'New NAT Rule', tab: 'General', tabMark: 'Action', tabMarkN: 5,
              fields: [
                { l: 'Chain', v: 'srcnat', type: 'select', t: 'General', m: 2 },
                { l: 'Src. Address', v: '10.99.0.0/24', t: 'General', m: 3 },
                { l: 'Out. Interface List', v: 'WAN', type: 'select', t: 'General', m: 4 }
              ],
              buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 6 }]
            },
            notes: [
              '1 — «+»: новое правило NAT',
              '2 — Chain: srcnat',
              '3 — Src. Address: адреса VPN-клиентов',
              '4 — Out. Interface List: WAN',
              '5 — вкладка Action: там Action = masquerade',
              '6 — OK'
            ]
          }
        },
        {
          t: 'Клиент Windows: встроенный VPN',
          d: 'Ставить ничего не нужно. **Параметры → Сеть и Интернет → VPN → Добавить подключение → ' +
            'VPN (Windows)**. Провайдер = Windows (встроенный), Имя = офис. ' +
            'Далее: **Тип VPN = L2TP/IPsec со стандартным ключом**, ключ = тот самый IPsec Secret ' +
            '(`d83n2-officE-vpn`), имя сервера = публичный адрес роутера (или DDNS-имя), ' +
            'Тип входа = **имя пользователя и пароль** (логин `ivanov` из PPP → Secrets). ' +
            'После сохранения — «Подключиться». За роутером с NAT Windows иногда требует правку ' +
            'реестра (AssumeUDPEncapsulationContextOnSendRule=2) — в современных сборках обычно не нужно.',
          noScene: true
        },
        {
          t: 'Клиент Android и iPhone',
          d: '**Android**: Настройки → Сеть и интернет → VPN → Добавить VPN → тип **L2TP/IPSec PSK**. ' +
            'Сервер: публичный адрес роутера; IPsec pre-shared key: IPsec Secret; логин и пароль — ' +
            'из PPP → Secrets. **iPhone**: Настройки → Основные → VPN и управление устройством → VPN → ' +
            'Добавить конфигурацию → L2TP, туда же сервер, ключ, логин и пароль. ' +
            'Роутер отдаёт адрес из пула, DNS — из профиля, поэтому внутренние имена работают сразу.',
          noScene: true
        },
        {
          t: 'Проверка: кто подключён',
          d: '1 — в окне PPP перейдите на вкладку **Active Connections**: там видно логин, службу l2tp, ' +
            'выданный адрес и время сессии. ' +
            '2 — первая строка — ваш вход, у неё растёт Uptime. ' +
            '3 — там же видно, с какого адреса пришёл клиент — удобно, если подключается не тот, кто должен. ' +
            'Если строки нет — вкладка IP → IPsec → **Active Peers** покажет, дошло ли дело до шифрования: ' +
            'без пира IPsec дальше не пойдёт.',
          sc: {
            marks: 1,
            cap: 'PPP → Active Connections: сессии VPN',
            path: 'PPP → Active Connections',
            win: 'PPP',
            tabs: ['Interfaces', 'Secrets', 'Profiles', 'PPPoE Server', 'L2TP Server', 'Active Connections'],
            tab: 'Active Connections', tabMark: 'Active Connections', tabMarkN: 1,
            cols: [{ t: 'Name', w: 100 }, { t: 'Service', w: 90 }, { t: 'Address', w: 120 }, { t: 'Uptime', w: 100 }, { t: 'Caller ID', w: 150 }],
            rows: [
              [{ v: 'ivanov', m: 2 }, { v: 'l2tp' }, { v: '10.99.0.100' }, { v: '00:12:44', m: 3 }, { v: '203.0.113.77', m: 4 }],
              [{ v: 'petrova' }, { v: 'l2tp' }, { v: '10.99.0.101' }, { v: '00:02:10' }, { v: '198.51.100.9' }]
            ],
            sel: 0,
            notes: [
              '1 — вкладка Active Connections',
              '2 — логин сотрудника',
              '3 — время сессии: растёт, значит связь есть',
              '4 — с какого адреса пришёл клиент'
            ]
          }
        },
        {
          t: 'Если не подключается',
          d: '**«Ошибка 789» в Windows** — IPsec не проходит: проверьте правила udp 500/4500 в цепочке ' +
            'input и что Use IPsec = required, а ключ на клиенте совпадает с IPsec Secret. ' +
            '**Ошибка 691** — неверный логин или пароль, либо в секрете Service не `l2tp`. ' +
            '**Подключается, но нет доступа в LAN** — клиентам нужны маршруты: проще всего поставить ' +
            'masquerade для `10.99.0.0/24` (шаг 7) либо разрешить forward между VPN-пулом и LAN. ' +
            '**Работает дома, не работает в мобильной сети** — оператор блокирует IPsec: попробуйте ' +
            'другую сеть, это ограничение провайдера, а не настройки.',
          noScene: true
        }
      ],
      scenes: [],
      check: [
        {
          d: 'сервер, второй пир IPsec и сессии',
          c: '/ppp l2tp-server print detail\n/ip ipsec active-peers print\n/ppp active print'
        },
        {
          d: 'правила firewall и секреты',
          c: '/ip firewall filter print where comment~"ipsec"\n/ppp secret print'
        },
        {
          d: 'что пишет лог при подключении',
          c: '/log print where topics~"l2tp,ipsec,ppp"'
        }
      ],
      mistakes: [
        'Use IPsec = no — туннель поднимается, но трафик не шифруется.',
        'Нет правила udp 4500 — за домашним NAT клиент не подключается (ошибка 789).',
        'В PPP-секрете Service = any вместо l2tp — вход открыт и по другим службам.',
        'Один логин на всех сотрудников — невозможно понять, кто подключён, и отозвать доступ одному.',
        'Пул VPN пересекается с LAN — маршруты «путаются», часть сети становится недоступной.',
        'IPsec Secret короткий или совпадает с паролем сотрудника — ключ видят все клиенты.'
      ],
      next: ['ppp-ovpn-server', 'wg-server', 'task-wan-failover', 'vpn-ipsec-ikev2']
    },
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
