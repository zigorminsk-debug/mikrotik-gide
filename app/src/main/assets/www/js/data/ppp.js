/* Меню PPP: PPPoE, L2TP, PPTP, SSTP, OpenVPN, профили, AAA, пулы, IPv6.
   Добавляет статьи в раздел «PPP (PPPoE, L2TP, SSTP)». */
(function () {
  'use strict';
  var D = window.DATA || [];
  function group(id) {
    for (var i = 0; i < D.length; i++) if (D[i].id === id) return D[i];
    return null;
  }
  var ppp = group('ppp');
  if (!ppp) return;

  ppp.items.push({
    id: 'ppp-pppoe-client', t: 'PPP → PPPoE Client — подключение к провайдеру', lvl: 1,
    path: 'Interface → PPPoE Client (PPP → Interfaces)', tags: ['pppoe', 'клиент', 'провайдер', 'wan'],
    purpose: 'PPPoE-клиент поднимает соединение с провайдером по логину и паролю. Это самый распространённый тип подключения в СНГ: сессия PPPoE даёт внешний IP, MTU 1492 и требует MSS-clamp.',
    usage: [
      'Домашний или офисный интернет от провайдера с авторизацией PPPoE.',
      'Резервный канал через USB-LTE-модем в режиме PPPoE (редко).',
      'Подключение к вышестоящему роутеру, который раздаёт доступ по логину.'
    ],
    pros: [
      'Провайдер видит конкретного абонента и может управлять скоростью и тарифом.',
      'Не нужен статический IP: адрес выдаётся при подключении.',
      'При обрыве клиент переподключается автоматически (Dial On Demand).'
    ],
    cons: [
      'MTU 1492 вместо 1500 — обязателен MSS-clamp, иначе часть сайтов не откроется.',
      'Авторизация по паролю: при смене пароля интернет пропадает до правки настроек.',
      'Иногда провайдер привязывает сессию к MAC — при замене роутера нужен клон MAC.'
    ],
    steps: [
      { t: 'Создайте клиент', d: 'Interface → `+` → PPPoE Client (в Winbox 4: PPP → Interfaces → PPPoE Client): Name=`pppoe-out1`, Interface=`ether1-wan`, User=`login@provider`, Password=..., Profile=`default`.' },
      { t: 'Dial On Demand', d: 'Вкладка Dial Out: Dial On Demand=no, Add Default Route=yes, Use Peer DNS=yes (или свои DNS).' },
      { t: 'MTU/MSS', d: 'MTU=1492, MRU=1492. В IP → Firewall → Mangle добавьте change-mss 1400 для tcp syn по forward.' },
      { t: 'NAT', d: 'IP → Firewall → NAT: chain=srcnat, out-interface=`pppoe-out1`, action=masquerade.' },
      { t: 'Проверка', d: 'IP → Address: появился адрес на pppoe-out1. IP → Routes: маршрут 0.0.0.0/0 активен. `ping 8.8.8.8` проходит.' }
    ],
    scenes: [{
      path: 'PPP → Interfaces → PPPoE Client', win: 'PPPoE Client', tabs: ['General', 'Dial Out', 'Status'], tab: 'General', noTools: true,
      form: {
        title: 'PPPoE Client', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Name', v: 'pppoe-out1', m: 1 },
          { l: 'Interface', v: 'ether1-wan', type: 'select', m: 2 },
          { l: 'User', v: 'login@provider', m: 3 },
          { l: 'Password', v: '••••••••', m: 4 },
          { l: 'MTU', v: '1492', m: 5 },
          { l: 'Add Default Route', v: 'yes', type: 'select' }
        ],
        note: 'MTU 1492 — обязательно; иначе крупные пакеты будут теряться'
      },
      notes: [
        'Имя интерфейса, по нему строятся маршруты и NAT',
        'Физический порт, куда приходит кабель провайдера',
        'Логин из договора',
        'Пароль из договора',
        'MTU 1492 — стандарт для PPPoE'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface pppoe-client print detail\n/ip address print\n/ip route print where dst-address=0.0.0.0/0' }],
    warn: 'Если провайдер выдаёт IP через PPPoE, не настраивайте на этом же порту DHCP Client — два механизма конфликтуют, адрес будет «прыгать».',
    mistakes: [
      'MTU 1500 — «половина сайтов не открывается» именно из-за этого.',
      'Не включён Add Default Route — интернета нет, хотя сессия поднята.',
      'Use Peer DNS=yes, но провайдер отдаёт неработающий DNS.',
      'Пароль с спецсимволами введён с неверной раскладкой.'
    ]
  });

  ppp.items.push({
    id: 'ppp-l2tp-client', t: 'PPP → L2TP Client — подключение к чужому VPN', lvl: 2,
    path: 'PPP → Interfaces → L2TP Client', tags: ['l2tp', 'клиент', 'ipsec', 'vpn'],
    purpose: 'L2TP-клиент на роутере нужен, когда MikroTik сам должен подключаться к чужому VPN-серверу: к офису, к провайдеру, к корпоративной сети. С IPsec-секретом это ещё и шифрованный аплинк для всей сети за роутером.',
    usage: [
      'Филиал подключается к головному офису по L2TP/IPsec.',
      'Резервный VPN-канал, если основной WireGuard недоступен.',
      'Доступ к корпоративным сервисам, где разрешён только L2TP.'
    ],
    pros: [
      'Совместимость со всеми корпоративными шлюзами (Cisco, Kerio, pfSense).',
      'Работает через NAT (в отличие от чистого IPsec).',
      'Можно маршрутизировать отдельные подсети, а не весь трафик.'
    ],
    cons: [
      'Инкапсуляция PPP + IPsec — ниже скорость, чем у WireGuard.',
      'Нужен общий секрет IPsec или сертификат — частое место ошибок.',
      'MTU внутри туннеля меньше, нужен MSS-clamp.'
    ],
    steps: [
      { t: 'Создайте клиент', d: 'PPP → Interfaces → `+` → L2TP Client: Name=`l2tp-office`, Connect To=`vpn.office.example`, User, Password.' },
      { t: 'IPsec', d: 'Вкладка General: Use IPsec=yes, IPsec Secret=`общий секрет` (если сервер этого требует).' },
      { t: 'Маршруты', d: 'Вкладка Dial Out: Add Default Route=no. Маршруты к нужным подсетям добавьте вручную через `l2tp-office`.' },
      { t: 'NAT исключение', d: 'Чтобы трафик в офис не уходил в masquerade, добавьте в srcnat правило accept для dst-address нужной подсети (выше masquerade).' },
      { t: 'Проверка', d: 'PPP → Active Connections: сессия в статусе connected; IP → Address показывает выданный адрес; пинг до шлюза офиса.' }
    ],
    scenes: [{
      path: 'PPP → Interfaces → L2TP Client', win: 'L2TP Client', tabs: ['General', 'Dial Out', 'Status'], tab: 'General', noTools: true,
      form: {
        title: 'L2TP Client', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Name', v: 'l2tp-office', m: 1 },
          { l: 'Connect To', v: 'vpn.office.example', m: 2 },
          { l: 'User', v: 'branch-a', m: 3 },
          { l: 'Password', v: '••••••••' },
          { l: 'Use IPsec', v: 'yes', type: 'select', m: 4 },
          { l: 'IPsec Secret', v: '••••••••', m: 5 }
        ],
        note: 'Если сервер не требует IPsec, обязательно уточните это у администратора: часть серверов отклоняет «голый» L2TP'
      },
      notes: [
        'Имя интерфейса для маршрутов',
        'Адрес или домен VPN-сервера',
        'Логин, выданный администратором сервера',
        'IPsec обязателен, если сервер его требует',
        'Общий секрет IPsec — не пароль пользователя'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface l2tp-client print detail\n/ppp active print\n/ip route print where gateway~"l2tp"' }],
    warn: 'Не включайте Add Default Route=yes, если через VPN нужны только корпоративные сервисы: весь интернет пойдёт через офис и канал ляжет.',
    mistakes: [
      'Путают пароль пользователя и IPsec Secret.',
      'Не добавили маршруты к подсетям офиса.',
      'Masquerade применён к трафику туннеля — адреса не видны на другой стороне.',
      'MTU 1500 внутри L2TP — крупные пакеты теряются.'
    ]
  });

  ppp.items.push({
    id: 'ppp-pptp-server', t: 'PPP → PPTP Server — почему не включать', lvl: 1,
    path: 'PPP → PPTP Server', tags: ['pptp', 'безопасность', 'устарело'],
    purpose: 'PPTP-сервер включён по умолчанию во многих старых конфигурациях. Протокол использует MS-CHAPv2 и MPPE, которые взломаны: перехватив рукопожатие, атакующий восстанавливает пароль. Раздел нужен, чтобы правильно его отключить и перевести клиентов.',
    usage: [
      'Аудит: проверить, не включён ли PPTP-сервер.',
      'Миграция: найти активных пользователей PPTP и перевести на L2TP/IPsec или WireGuard.',
      'Единственный допустимый случай — совместимость с очень старым оборудованием во внутренней сети.'
    ],
    pros: [
      'Низкая нагрузка и максимальная совместимость со старыми ОС.',
      'Работает через любые NAT (нужен только GRE).',
      'Простая настройка: пользователь и пароль.'
    ],
    cons: [
      'Шифрование MPPE (RC4) и MS-CHAPv2 — компрометируются, пароль восстанавливается.',
      'Требует GRE, который режут провайдеры и гостиничные сети.',
      'Поддержка постепенно убирается из RouterOS.'
    ],
    steps: [
      { t: 'Откройте настройку', d: 'PPP → PPTP Server.' },
      { t: 'Выключите', d: 'Снимите галочку Enabled и нажмите Apply.' },
      { t: 'Проверьте активные сессии', d: 'PPP → Active Connections: отфильтруйте по Service=pptp — там пользователи, которых надо перевести.' },
      { t: 'Закройте порты', d: 'IP → Firewall → Filter: уберите разрешение tcp/1723 и GRE для input с WAN.' },
      { t: 'Смените пароли', d: 'PPP → Secrets: обновите пароли учётных записей, которые использовались по PPTP.' }
    ],
    scenes: [{
      path: 'PPP → PPTP Server', win: 'PPTP Server', tabs: ['General'], tab: 'General', noTools: true,
      form: {
        title: 'PPTP Server', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Enabled', v: 'no', type: 'select', m: 1 },
          { l: 'Default Profile', v: 'default-encryption', type: 'select' },
          { l: 'Authentication', v: 'mschap2', ro: true },
          { l: 'Keepalive Timeout', v: '10s' }
        ],
        note: 'Правильное состояние в современной сети — выключено'
      },
      notes: ['Единственный правильный переключатель для PPTP — «no»']
    }],
    check: [{ d: 'терминал', c: '/interface pptp-server server print\n/ppp active print where service=pptp' }],
    danger: 'Если PPTP был доступен из интернета, считайте пароли скомпрометированными: смените их и проверьте логи на посторонние входы.',
    mistakes: [
      'Выключили сервер, но оставили secret-записи с Service=any.',
      'Оставили правило firewall, разрешающее GRE.',
      'Включили PPTP «на время» и забыли выключить.'
    ]
  });

  ppp.items.push({
    id: 'ppp-sstp-server', t: 'PPP → SSTP Server — VPN по 443', lvl: 3,
    path: 'PPP → SSTP Server', tags: ['sstp', 'tls', '443', 'сертификат'],
    purpose: 'SSTP-сервер поднимает VPN поверх TLS на порту 443. Единственный вариант, когда провайдер или гостиничная сеть разрешает только HTTPS. Требует сертификат: самоподписанный придётся вручную добавить в доверенные на клиенте.',
    usage: [
      'Доступ сотрудников из сетей, где открыт только 443.',
      'Резервный канал, если UDP-протоколы блокируются.',
      'Подключение Windows-клиентов без установки дополнительного ПО.'
    ],
    pros: [
      'Маскируется под обычный HTTPS, проходит почти везде.',
      'Встроенный клиент в Windows и macOS.',
      'Шифрование стандартным TLS 1.2/1.3.'
    ],
    cons: [
      'TCP внутри TCP — скорость падает при потерях.',
      'Нет клиента в iOS, на Android нужен сторонний.',
      'Самоподписанный сертификат вызывает предупреждения и требует установки.'
    ],
    steps: [
      { t: 'Сертификат', d: 'System → Certificates: импортируйте сертификат с именем `vpn.example.com` (или создайте самоподписанный и подпишите своим CA).' },
      { t: 'Профиль', d: 'PPP → Profiles → `+`: Name=`sstp-clients`, Local Address=`10.97.0.1`, Remote Address=`10.97.0.100`, DNS Server=`10.97.0.1`.' },
      { t: 'Сервер', d: 'PPP → SSTP Server: Enabled=yes, Port=443, Certificate=`vpn.example.com`, Authentication=mschap2, Default Profile=`sstp-clients`.' },
      { t: 'Пользователи', d: 'PPP → Secrets → `+`: Name, Password, Service=`sstp`, Profile=`sstp-clients`.' },
      { t: 'Firewall', d: 'input: tcp 443 accept (по возможности с ограничением по src-address).' },
      { t: 'Проверка', d: 'С клиента: подключение, `ipconfig` — адрес из 10.97.0.0/24, `ping 10.97.0.1`.' }
    ],
    scenes: [{
      path: 'PPP → SSTP Server', win: 'SSTP Server', tabs: ['General', 'PPP'], tab: 'General', noTools: true,
      form: {
        title: 'SSTP Server', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
          { l: 'Port', v: '443', m: 2 },
          { l: 'Certificate', v: 'vpn.example.com', type: 'select', m: 3 },
          { l: 'Authentication', v: 'mschap2' },
          { l: 'Default Profile', v: 'sstp-clients', type: 'select' }
        ],
        note: 'Имя в сертификате должно совпадать с адресом, который вводит клиент'
      },
      notes: [
        'Включение SSTP-сервера',
        'Порт 443 — обход фильтров',
        'Сертификат с правильным именем'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface sstp-server server print detail\n/ppp active print where service=sstp\n/log print where topics~"sstp"' }],
    warn: 'Порт 443 может быть занят WebFig или другим сервисом роутера. Проверьте IP → Services перед включением.',
    mistakes: [
      'Сертификат выписан на другое имя — клиент не подключается.',
      'Порт 443 занят — сервер не стартует.',
      'В профиле не задан DNS — внутренние имена не резолвятся.'
    ]
  });

  ppp.items.push({
    id: 'ppp-ovpn-server', t: 'PPP → OVPN Server — OpenVPN для своих', lvl: 3,
    path: 'PPP → OVPN Server', tags: ['openvpn', 'tls', 'сертификат', 'сервер'],
    purpose: 'OVPN-сервер в RouterOS — PPP внутри TLS с отдельными сертификатами на каждого клиента. Хороший выбор, когда нужны клиенты под Linux/Android/iOS и возможность отзывать доступ по одному.',
    usage: [
      'Раздача VPN сотрудникам с разными устройствами.',
      'Доступ по TCP 443 в сетях со строгой фильтрацией.',
      'Отзыв доступа конкретного устройства без смены пароля у остальных.'
    ],
    pros: [
      'Клиенты для всех платформ, простой экспорт профиля.',
      'Отзыв по сертификату — гранулярный контроль доступа.',
      'Можно выбрать TCP или UDP и любой порт.'
    ],
    cons: [
      'Самый медленный вариант в RouterOS (PPP + TLS на CPU).',
      'Нет части современных расширений OpenVPN (tls-crypt и др.).',
      'Требуется аккуратная работа с сертификатами и сроками действия.'
    ],
    steps: [
      { t: 'CA', d: 'System → Certificates → `+` → Certificate Authority: Name=`ovpn-ca`, Key Size=2048.' },
      { t: 'Серверный сертификат', d: 'System → Certificates → `+`: Name=`ovpn-server`, Common Name=`vpn.example.com`, Days Valid=825; затем Sign → CA=`ovpn-ca`.' },
      { t: 'Клиентские сертификаты', d: 'По одному на устройство: Name=`cli-phone`, Common Name=`cli-phone`, подписать тем же CA.' },
      { t: 'Профиль', d: 'PPP → Profiles: Name=`ovpn-clients`, Local Address=`10.98.0.1`, Remote Address=`10.98.0.100`, DNS Server=`10.98.0.1`.' },
      { t: 'Сервер', d: 'PPP → OVPN Server: Enabled=yes, Port=1194, Mode=ip, Certificate=`ovpn-server`, Require Client Certificate=yes, Default Profile=`ovpn-clients`.' },
      { t: 'Клиент', d: 'Экспорт ca.crt + client.crt + client.key (или готовый .ovpn), импорт в OpenVPN Connect.' }
    ],
    scenes: [{
      path: 'PPP → OVPN Server', win: 'OVPN Server', tabs: ['General', 'PPP'], tab: 'General', noTools: true,
      form: {
        title: 'OVPN Server', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
          { l: 'Port', v: '1194', m: 2 },
          { l: 'Mode', v: 'ip', type: 'select', m: 3 },
          { l: 'Certificate', v: 'ovpn-server', type: 'select', m: 4 },
          { l: 'Require Client Certificate', v: 'yes', type: 'select', m: 5 },
          { l: 'Default Profile', v: 'ovpn-clients', type: 'select' }
        ],
        note: 'Require Client Certificate=yes — без сертификата клиента подключение невозможно'
      },
      notes: [
        'Включение OVPN-сервера',
        'Порт; 443 используют для обхода фильтров',
        'Mode=ip для L3, tap — для L2-моста',
        'Серверный сертификат',
        'Требовать сертификат клиента'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface ovpn-server server print detail\n/ppp active print where service=ovpn\n/certificate print where name~"ovpn"' }],
    warn: 'Сертификаты с истёкшим сроком ломают подключение без явной ошибки на клиенте. Ставьте напоминание до даты окончания.',
    mistakes: [
      'Require Client Certificate=yes, но клиенту сертификат не выдан.',
      'Не совпадает cipher/TLS-версия с клиентом.',
      'Порт закрыт в firewall.',
      'Один клиентский сертификат на всех — отзыв невозможен по одному устройству.'
    ]
  });

  ppp.items.push({
    id: 'ppp-aaa-radius', t: 'PPP → AAA: RADIUS для сотен клиентов', lvl: 3,
    path: 'PPP → AAA / RADIUS', tags: ['radius', 'aaa', 'биллинг', 'авторизация'],
    purpose: 'Когда пользователей больше десятка, хранить их в PPP → Secrets неудобно. PPP → AAA позволяет проверять логины на внешнем RADIUS-сервере: биллинг, ограничения, единая база для нескольких роутеров.',
    usage: [
      'Микро-провайдер с десятками PPPoE-абонентов.',
      'Единая учётная база для нескольких точек доступа.',
      'Учёт трафика и сессий во внешней системе (FreeRADIUS, billing).'
    ],
    pros: [
      'Централизованное управление пользователями и тарифами.',
      'Учёт сессий и трафика во внешней системе.',
      'Один роутер можно быстро заменить — база остаётся.'
    ],
    cons: [
      'Нужен отдельный сервер и его поддержка.',
      'Если RADIUS недоступен — авторизация не проходит (нужен fallback на локальные secrets).',
      'Сложнее диагностика: ошибка может быть на любой стороне.'
    ],
    steps: [
      { t: 'Сервер RADIUS', d: 'RADIUS → `+`: Service=`ppp`, Address=`10.10.0.5`, Secret=`общий секрет`, Authentication Port=1812, Accounting Port=1813.' },
      { t: 'Включите AAA', d: 'PPP → AAA: Use Radius=yes, Accounting=yes, Interim Update=5m (для учёта трафика).' },
      { t: 'Fallback', d: 'Оставьте локальные PPP → Secrets для сервисных учёток — если RADIUS недоступен, администратор сможет подключиться.' },
      { t: 'Профиль по умолчанию', d: 'PPP → Profiles: значения по умолчанию применяются, если сервер не передал атрибуты (адрес, скорость, DNS).' },
      { t: 'Проверка', d: 'PPP → Active Connections: сессия появилась. В логе RADIUS-сервера — Access-Accept. При ошибке смотрите Log с топиком radius.' }
    ],
    scenes: [{
      path: 'RADIUS', win: 'RADIUS', tabs: ['General'], tab: 'General', noTools: true,
      form: {
        title: 'RADIUS', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Service', v: 'ppp', type: 'select', m: 1 },
          { l: 'Address', v: '10.10.0.5', m: 2 },
          { l: 'Secret', v: '••••••••', m: 3 },
          { l: 'Authentication Port', v: '1812', m: 4 },
          { l: 'Accounting Port', v: '1813' },
          { l: 'Timeout', v: '2s' }
        ],
        note: 'Секрет RADIUS должен совпадать на роутере и сервере байт в байт'
      },
      notes: [
        'Сервис, для которого используется RADIUS',
        'Адрес RADIUS-сервера',
        'Общий секрет — не пароль пользователя',
        'Стандартный порт аутентификации 1812'
      ]
    }],
    check: [{ d: 'терминал', c: '/radius print detail\n/ppp aaa print\n/log print where topics~"radius"' }],
    warn: 'Без локального fallback при падении RADIUS вы потеряете доступ ко всем PPP-пользователям, включая себя.',
    mistakes: [
      'Не совпадает Secret — сервер молча отбрасывает запросы.',
      'Не включён Use Radius в PPP → AAA.',
      'RADIUS-сервер недоступен из-за firewall на роутере.',
      'Не заданы адреса/DNS по умолчанию — клиенты подключаются без адреса.'
    ]
  });

  ppp.items.push({
    id: 'ppp-limits', t: 'PPP → Profiles: адреса, скорость, ограничения', lvl: 2,
    path: 'PPP → Profiles', tags: ['профиль', 'rate-limit', 'адреса', 'ограничения'],
    purpose: 'Профиль PPP — это шаблон параметров подключения: адреса, DNS, скорость, шифрование, таймауты, ограничение количества сессий. Все PPP-сервисы (PPPoE, L2TP, SSTP, OVPN) ссылаются на профиль.',
    usage: [
      'Отдельные профили для сотрудников, гостей и абонентов.',
      'Ограничение скорости (Rate Limit) без очередей.',
      'Разные пулы адресов и DNS для разных групп.'
    ],
    pros: [
      'Один профиль обслуживает сотни пользователей.',
      'Rate Limit в профиле работает без настройки Simple Queues.',
      'Меняете профиль — изменения применяются ко всем клиентам.'
    ],
    cons: [
      'Индивидуальные исключения возможны только через отдельный профиль.',
      'Ошибка в профиле ломает всем клиентам сразу.',
      'Не все параметры применяются на лету — часть требует переподключения.'
    ],
    steps: [
      { t: 'Базовые адреса', d: 'PPP → Profiles → `+`: Name=`staff`, Local Address=`10.99.0.1`, Remote Address=`10.99.0.100`, DNS Server=`10.99.0.1`.' },
      { t: 'Скорость', d: 'Вкладка Limits: Rate Limit=`10M/10M` (первое число — входящая для клиента).' },
      { t: 'Ограничения', d: 'Only One=yes (одна сессия на пользователя), Add ARP Entry, Change TCP MSS=yes.' },
      { t: 'Шифрование', d: 'Вкладка Protocols: Use Encryption=yes/required в зависимости от требований.' },
      { t: 'Применение', d: 'Профиль указывается в PPP → Secrets (поле Profile) или в настройках сервера как Default Profile.' },
      { t: 'Проверка', d: 'PPP → Active Connections: у сессии видны адреса и скорость; `/ppp active print detail`.' }
    ],
    scenes: [{
      path: 'PPP → Profiles', win: 'PPP Profiles', tabs: ['General', 'Limits', 'Protocols'], tab: 'General',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: 'Name', w: 120 }, { t: 'Local Address', w: 120 }, { t: 'Remote Address', w: 130 }, { t: 'Rate Limit', w: 100 }, { t: 'DNS Server', w: 110 }],
      rows: [
        [{ v: 'staff', m: 2 }, { v: '10.99.0.1', m: 3 }, { v: '10.99.0.100', m: 4 }, { v: '10M/10M', m: 5 }, '10.99.0.1']
      ],
      sel: 0,
      notes: [
        'Кнопка создания профиля',
        'Имя профиля, на него ссылаются secrets',
        'Адрес роутера внутри VPN/PPPoE',
        'Диапазон адресов для клиентов',
        'Скорость: первое значение — для клиента'
      ]
    }],
    check: [{ d: 'терминал', c: '/ppp profile print detail\n/ppp active print detail' }],
    warn: 'Rate Limit в профиле — это ограничение PPP-сессии; для приоритизации и очередей используйте Queues. Не путайте эти механизмы.',
    mistakes: [
      'Local Address пересекается с LAN — конфликты адресов.',
      'Rate Limit указан в неверном порядке (входящая/исходящая).',
      'Один профиль и для сотрудников, и для гостей.',
      'Only One=no — один пользователь открывает десятки сессий.'
    ]
  });

  ppp.items.push({
    id: 'ppp-active', t: 'PPP → Active Connections и логи PPP', lvl: 2,
    path: 'PPP → Active Connections / Log', tags: ['диагностика', 'active', 'log', 'ppp'],
    purpose: 'Экран Active Connections показывает, кто подключён, с каким адресом и сколько трафика прошло. Вместе с логами PPP это основной инструмент поиска причин «не подключается» и «подключился, но нет интернета».',
    usage: [
      'Проверка, что клиент действительно подключён.',
      'Поиск «зависших» сессий, которые занимают адреса из пула.',
      'Разбор ошибок аутентификации по логу.'
    ],
    pros: [
      'Видно адрес, uptime и счётчики по каждой сессии.',
      'Можно принудительно отключить сессию (кнопка −).',
      'Логи с топиком ppp показывают точную причину отказа.'
    ],
    cons: [
      'Счётчики обнуляются при переподключении.',
      'Без включённого логирования история не сохраняется.',
      'Не видно, что происходит «внутри» PPP-сессии — только факт и адреса.'
    ],
    steps: [
      { t: 'Список сессий', d: 'PPP → Active Connections: проверьте Name, Service, Address, Uptime, Bytes In/Out.' },
      { t: 'Отключение', d: 'Выделите сессию и нажмите «−» — это разорвёт соединение (клиент переподключится, если настроен).' },
      { t: 'Логи', d: 'System → Logging: добавьте топики `ppp,info` и `ppp,error` на действие memory. Затем Log — ищите `login failed`, `no free address`.' },
      { t: 'Свободные адреса', d: 'IP → Pool → Used/Total: если Used=Total, новые клиенты не подключатся. Расширьте пул.' },
      { t: 'Проверка', d: '`/ppp active print` и `/log print where topics~"ppp"`.' }
    ],
    scenes: [{
      path: 'PPP → Active Connections', win: 'PPP Active Connections', tabs: ['General'], tab: 'General',
      tools: [{ t: '−', id: 'del', m: 1 }, { t: '✓' }, { t: '⌕' }],
      cols: [{ t: 'Name', w: 110 }, { t: 'Service', w: 80 }, { t: 'Address', w: 120 }, { t: 'Uptime', w: 100 }, { t: 'Bytes In', w: 100 }, { t: 'Bytes Out', w: 100 }],
      rows: [
        [{ v: 'client01', m: 2 }, { v: 'pppoe', m: 3 }, { v: '10.255.0.55', m: 4 }, '2h14m', '1.2 GiB', '340 MiB']
      ],
      sel: 0,
      notes: [
        'Кнопка отключения сессии',
        'Логин подключённого клиента',
        'Сервис, по которому подключились',
        'Адрес, выданный клиенту'
      ]
    }],
    check: [{ d: 'терминал', c: '/ppp active print detail\n/ip pool print stats\n/log print where topics~"ppp"' }],
    warn: 'Кнопка «−» разрывает сессию немедленно: у пользователя пропадёт связь. Предупреждайте, если это рабочий офис.',
    mistakes: [
      'Ищут причину в firewall, хотя в логе `login failed`.',
      'Не проверяют заполнение пула адресов.',
      'Отключают сессию вместо правки пароля — клиент переподключается снова.',
      'Смотрят логи без включённых топиков ppp.'
    ]
  });

  ppp.items.push({
    id: 'ppp-addresses', t: 'PPP → пул адресов и выдача IP клиентам', lvl: 2,
    path: 'PPP → Profiles + IP → Pool', tags: ['пул', 'адреса', 'ppp', 'ip-pool'],
    purpose: 'PPP может выдавать адреса тремя способами: из IP → Pool, из диапазона в профиле (Remote Address) или статически из секрета. Понимание этих механизмов избавляет от конфликтов адресов и «no free address».',
    usage: [
      'PPPoE-сервер для абонентов: пул на 200 адресов.',
      'VPN-клиенты: отдельный пул, не пересекающийся с LAN.',
      'Статические адреса для серверов и касс за PPPoE.'
    ],
    pros: [
      'Пулы позволяют быстро расширить диапазон без правки профиля.',
      'Статический адрес в секрете удобен для проброса портов и правил firewall.',
      'Разные пулы для разных групп — простое разделение доступа.'
    ],
    cons: [
      'Пересечение пула с LAN ломает маршрутизацию.',
      'Закончившийся пул блокирует новых клиентов.',
      'Статические адреса нужно вести вручную — легко забыть, кому что выдали.'
    ],
    steps: [
      { t: 'Создайте пул', d: 'IP → Pool → `+`: Name=`ppp-clients`, Addresses=`10.255.0.10-10.255.0.250`.' },
      { t: 'Профиль', d: 'PPP → Profiles: вкладка General, Remote Address=`ppp-clients` (имя пула) или конкретный адрес.' },
      { t: 'Статический адрес', d: 'PPP → Secrets → Remote Address=`10.255.0.55` — этот клиент всегда получает один и тот же адрес.' },
      { t: 'Исключения', d: 'Не включайте в пул адрес роутera (Local Address) и адреса, занятые статикой.' },
      { t: 'Проверка', d: 'IP → Pool: Used/Total; `/ip pool used print` — кто какой адрес занял.' }
    ],
    scenes: [{
      path: 'IP → Pool', win: 'IP Pool', tabs: ['General'], tab: 'General',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: 'Name', w: 130 }, { t: 'Ranges', w: 260 }, { t: 'Total', w: 80 }, { t: 'Used', w: 80 }, { t: 'Comment', w: 140 }],
      rows: [
        [{ v: 'ppp-clients', m: 2 }, { v: '10.255.0.10-10.255.0.250', m: 3 }, { v: '241', m: 4 }, '37', 'PPPoE и VPN']
      ],
      sel: 0,
      notes: [
        'Кнопка создания пула',
        'Имя пула — его указывают в профиле',
        'Диапазон адресов для клиентов',
        'Всего адресов и сколько занято'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip pool print\n/ip pool used print\n/ppp active print' }],
    warn: 'Адрес роутера в PPP (Local Address) не должен попадать в диапазон пула — иначе клиент получит адрес шлюза и сеть «встанет».',
    mistakes: [
      'Пул пересекается с LAN-подсетью.',
      'Пул меньше числа клиентов — «no free address».',
      'Статический адрес из пула — конфликт с динамическим.',
      'Забыли DNS в профиле — адрес выдан, интернета нет.'
    ]
  });

  ppp.items.push({
    id: 'ppp-ipv6', t: 'PPP и IPv6: адреса, делегирование префикса', lvl: 3,
    path: 'PPP → Profiles / IPv6 → Address', tags: ['ipv6', 'ppp', 'pd', 'dual-stack'],
    purpose: 'PPP-подключения могут раздавать IPv6: клиент получает адрес из пула или префикс /64 через DHCPv6-PD. Это нужно для dual-stack сетей без отдельной настройки на клиенте.',
    usage: [
      'Провайдер выдаёт IPv6 через PPPoE — роутер раздаёт его в LAN.',
      'VPN-клиенты должны получать IPv6 автоматически.',
      'Тестирование dual-stack перед переводом офиса.'
    ],
    pros: [
      'IPv6 в PPP настраивается вместе с IPv4 в том же профиле.',
      'Делегирование префикса даёт каждому клиенту полноценную /64.',
      'Не нужен NAT66 — маршрутизация прозрачна.'
    ],
    cons: [
      'Не все провайдеры поддерживают PD через PPPoE.',
      'Ошибка в firewall IPv6 открывает клиентов наружу (в IPv6 нет NAT по умолчанию).',
      'Диагностика сложнее: ICMPv6 и ND обязательны, их часто блокируют.'
    ],
    steps: [
      { t: 'Адрес на WAN', d: 'IPv6 → Address: на pppoe-out1 включите «Advertise»/dynamic; адрес приходит от провайдера автоматически.' },
      { t: 'Делегирование', d: 'IPv6 → DHCP Client → вкладка: Pool Name=`ipv6-pd`, Pool Prefix Length=56, Add Default Route=yes.' },
      { t: 'Раздача в LAN', d: 'IPv6 → Address: из пула `ipv6-pd` выдайте /64 на bridge-lan.' },
      { t: 'Клиенты', d: 'IPv6 → ND: Advertise=yes, Managed Address Configuration=yes на bridge-lan.' },
      { t: 'Firewall', d: 'IPv6 → Firewall: input drop с WAN, accept established/related; forward — по политике (не «всё разрешено»).' },
      { t: 'Проверка', d: '`/ipv6 address print`, `/ipv6 nd print`, с клиента — `ping6` до адреса роутера и внешнего адреса.' }
    ],
    scenes: [{
      path: 'IPv6 → Address', win: 'IPv6 Address', tabs: ['Address'], tab: 'Address',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: 'Address', w: 210 }, { t: 'Interface', w: 130 }, { t: 'Advertise', w: 100 }, { t: 'Dynamic', w: 90 }],
      rows: [
        [{ v: '2001:db8:10::1/64', m: 2 }, { v: 'bridge-lan', m: 3 }, { v: 'yes', m: 4 }, 'no']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления адреса',
        'Адрес из делегированного префикса',
        'Интерфейс локальной сети',
        'Advertise=yes — клиенты получат адрес через ND'
      ]
    }],
    check: [{ d: 'терминал', c: '/ipv6 address print\n/ipv6 nd print\n/ipv6 firewall filter print stats' }],
    warn: 'В IPv6 нет NAT: если в firewall нет drop-правил для input с WAN, роутер будет доступен из интернета по IPv6.',
    mistakes: [
      'Нет IPv6 firewall — роутер «светится» в интернете.',
      'Advertise выключен — клиенты не получают адрес.',
      'Заблокирован ICMPv6 — не работает neighbor discovery.',
      'Префикс /64 нарезан на части — часть устройств не сможет использовать SLAAC.'
    ]
  });

  ppp.items.push({
    id: 'ppp-keepalive-mtu', t: 'PPP: keepalive, MTU и «обрывы каждые 2 минуты»', lvl: 2,
    path: 'PPP → Profiles / Interfaces', tags: ['keepalive', 'mtu', 'mss', 'обрывы'],
    purpose: 'Типовые жалобы на PPP-подключения: «рвётся каждые несколько минут» и «сайты не открываются, хотя пинг идёт». Причины — таймауты keepalive и MTU/MSS. Раздел объясняет, как их подобрать.',
    usage: [
      'PPPoE-канал с нестабильным провайдером.',
      'VPN через мобильный интернет (высокие задержки).',
      'Диагностика «полуоткрытых» сайтов после настройки VPN.'
    ],
    pros: [
      'Правильный keepalive не даёт «зависшим» сессиям занимать адреса.',
      'MSS-clamp решает проблему с крупными пакетами в 95 % случаев.',
      'MTU 1492/1420 — небольшая потеря скорости, зато стабильность.'
    ],
    cons: [
      'Слишком частый keepalive увеличивает трафик и нагрузку.',
      'Неверный MTU снижает пропускную способность.',
      'Часть провайдеров не пропускает ICMP «fragmentation needed» — без clamp не обойтись.'
    ],
    steps: [
      { t: 'Keepalive', d: 'PPP → Profiles → вкладка General: Keepalive Timeout=30s (для мобильных каналов 60–120s).' },
      { t: 'MTU интерфейса', d: 'Для PPPoE — 1492, для WireGuard — 1420, для L2TP — 1400. Задаётся в свойствах интерфейса.' },
      { t: 'MSS', d: 'IP → Firewall → Mangle: chain=forward, protocol=tcp, tcp-flags=syn, action=change-mss, new-mss=1360–1400, passthrough=yes.' },
      { t: 'Проверка MTU', d: 'С ПК: `ping -f -l 1472 8.8.8.8` — подбирайте размер до первого «требуется фрагментация».' },
      { t: 'Логи обрывов', d: 'System → Logging: топики `ppp,info`; ищите `peer not responding` — это таймаут keepalive.' }
    ],
    scenes: [{
      path: 'IP → Firewall → Mangle', win: 'Firewall', tabs: ['Filter Rules', 'NAT', 'Mangle'], tab: 'Mangle',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: '#', w: 30 }, { t: 'Chain', w: 80 }, { t: 'Protocol', w: 80 }, { t: 'TCP Flags', w: 100 }, { t: 'Action', w: 120 }, { t: 'New MSS', w: 90 }],
      rows: [
        ['0', { v: 'forward', m: 2 }, { v: 'tcp', m: 3 }, { v: 'syn', m: 4 }, { v: 'change-mss', m: 5 }, { v: '1360', m: 6 }]
      ],
      sel: 0,
      notes: [
        'Кнопка добавления правила mangle',
        'Цепочка forward — трафик, проходящий через роутер',
        'Только TCP',
        'Только SYN-пакеты (установка соединения)',
        'Действие подмены MSS',
        'MSS 1360 безопасен для PPPoE/VPN'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip firewall mangle print stats\n/interface print where name~"pppoe|wg|l2tp"\n/log print where topics~"ppp"' }],
    warn: 'Не ставьте MSS меньше 1200: часть сервисов начнёт работать медленнее, а некоторые — отказывать.',
    mistakes: [
      'MTU 1500 на PPPoE — «сайты не открываются».',
      'MSS-clamp только в input, а нужен forward.',
      'Keepalive 5s на мобильном канале — постоянные ложные обрывы.',
      'Ищут проблему в DNS, хотя это MTU.'
    ]
  });
})();
