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
    path: 'Interfaces → PPPoE Client (PPP → Interfaces)', tags: ['pppoe', 'клиент', 'провайдер', 'wan'],
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
      { t: 'Создайте клиент', d: 'Interfaces → `+` → PPPoE Client (в Winbox 4: PPP → Interfaces → PPPoE Client): Name=`pppoe-out1`, Interface=`ether1-wan`, User=`login@provider`, Password=..., Profile=`default`.' },
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
    id: 'ppp-ovpn-server', t: 'OpenVPN на RouterOS: сертификаты, сервер и клиенты — пошагово', lvl: 3,
    path: 'System → Certificates · PPP → OVPN Server · PPP → Profiles · IP → Firewall · Files',
    tags: ['openvpn', 'ovpn', 'сертификат', 'ca', 'tls', 'vpn', 'сервер'],
    purpose: 'OVPN-сервер в RouterOS — это PPP-туннель внутри TLS. Доступ выдаётся сертификатом ' +
      'на каждое устройство: потеряли телефон — отозвали один сертификат, остальные работают. ' +
      'Сертификаты выпускаются прямо на роутере: сначала центр сертификации (CA), потом серверный ' +
      'и клиентские сертификаты, подписанные этим CA. Всё делается в System → Certificates.',
    usage: [
      'VPN для сотрудников с разными устройствами (Windows, macOS, Android, iOS, Linux).',
      'Доступ по TCP-порту 1194 или 443 в сетях, где режут «непонятные» протоколы.',
      'Точный отзыв доступа: по одному устройству, без смены пароля у остальных.'
    ],
    pros: [
      'Клиент OpenVPN Connect есть под все платформы — один профиль работает везде.',
      'Доступ отзывается сертификатом: удалили строку — устройство больше не войдёт.',
      'Можно поднять на порту 443 и пройти там, где закрыто почти всё.'
    ],
    cons: [
      'Нужен пакет ovpn в RouterOS 7 — на некоторых сборках его нет.',
      'Самый медленный VPN в RouterOS: PPP внутри TLS считается процессором.',
      'Сертификаты живут ограниченное время: истёк — туннель молча перестал работать.',
      'Нет части современных расширений OpenVPN (tls-crypt и др.).'
    ],
    warn: 'Сертификат клиента без подписи CA ничего не даёт, а сертификат с истёкшим сроком ломает ' +
      'подключение без понятной ошибки на клиенте. Сразу после выпуска запишите дату окончания ' +
      'и поставьте напоминание за месяц. И не выдавайте один клиентский сертификат на несколько ' +
      'устройств: отозвать доступ одному, не сломав остальные, будет невозможно.',
    steps: [
      {
        t: 'Что понадобится',
        d: 'Четыре части: **пакет ovpn** (без него нет меню OVPN Server), **три вида сертификатов** ' +
          '(CA, серверный, клиентские), **профиль** с адресами и **логины** PPP для входа. ' +
          'Сертификаты выпускает сам роутер — платных удостоверяющих центров не нужно, ' +
          'свой CA и есть «удостоверяющий центр» для вашей сети.',
        noScene: true
      },
      {
        t: 'Проверьте пакет ovpn',
        d: '1 — в дереве меню откройте **System**, 2 — пункт **Packages**. ' +
          '3 — в списке найдите строку **ovpn**: у неё должно быть `enabled`. ' +
          'Если строки нет — пакет не установлен: скачайте Extra packages для своей версии RouterOS ' +
          'с сайта MikroTik, загрузите в Files и перезагрузите роутер. Без пакета меню PPP → OVPN Server ' +
          'просто отсутствует.',
        sc: {
          marks: 1,
          cap: 'System → Packages: есть ли пакет ovpn',
          path: 'System → Packages', menu: { grp: 1, sub: 2 },
          win: 'Packages', noTools: true,
          cols: [{ t: 'Name', w: 190 }, { t: 'Version', w: 110 }, { t: 'Scheduled', w: 110 }, { t: 'Status', w: 130 }],
          rows: [
            [{ v: 'routeros' }, { v: '7.10.2' }, { v: '' }, { v: 'enabled', c: 'ok' }],
            [{ v: 'ovpn', m: 3 }, { v: '7.10.2' }, { v: '' }, { v: 'enabled', c: 'ok' }],
            [{ v: 'wireless' }, { v: '7.10.2' }, { v: '' }, { v: 'enabled', c: 'ok' }]
          ],
          sel: 1,
          notes: [
            '1 — группа System',
            '2 — пункт Packages',
            '3 — строка ovpn: пакет должен быть enabled'
          ]
        }
      },
      {
        t: 'Шаг 1 из сертификатов: центр сертификации (CA)',
        d: 'CA — это «печать» вашей сети: им подписывают серверный и клиентские сертификаты, ' +
          'и клиенты доверяют ему. Создаётся один раз. ' +
          '1 — откройте **System**, 2 — пункт **Certificates**, 3 — нажмите **+**. ' +
          '4 — Name = `ovpn-ca`. ' +
          '5 — Common Name = `ovpn-ca` (имя внутри сертификата). ' +
          '6 — Key Usage: отметьте **key-cert-sign** и **crl-sign**. ' +
          '7 — Days Valid = `3650` (десять лет — CA меняют редко). ' +
          '8 — OK, затем подпишите CA сам собой: кнопка **Sign**, CA = `ovpn-ca`.',
        sc: {
          marks: 1,
          cap: 'System → Certificates: создаём CA',
          path: 'System → Certificates', menu: { grp: 1, sub: 2 },
          win: 'Certificates', tabs: ['Certificates', 'CRL', 'SCEP'], tab: 'Certificates',
          cols: [{ t: 'Name', w: 130 }, { t: 'Common Name', w: 140 }, { t: 'Issuer', w: 120 },
            { t: 'Validity', w: 90 }, { t: 'Days', w: 70 }, { t: 'Trusted', w: 80 }],
          rows: [[{ v: 'ovpn-ca' }, { v: 'ovpn-ca' }, { v: 'ovpn-ca' }, { v: 'ok', c: 'ok' }, { v: '3650' }, { v: 'yes', c: 'ok' }]],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'New Certificate',
            fields: [
              { l: 'Name', v: 'ovpn-ca', m: 4 },
              { l: 'Common Name', v: 'ovpn-ca', m: 5 },
              { l: 'Key Usage', v: 'key-cert-sign, crl-sign', m: 6 },
              { l: 'Days Valid', v: '3650', m: 7 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 8 }]
          },
          notes: [
            '1 — группа System',
            '2 — пункт Certificates',
            '3 — «+»: новый сертификат',
            '4 — Name: ovpn-ca',
            '5 — Common Name: ovpn-ca',
            '6 — Key Usage: key-cert-sign, crl-sign (это признаки CA)',
            '7 — Days Valid: 3650 дней',
            '8 — OK, затем Sign этим же CA'
          ]
        }
      },
      {
        t: 'Шаг 2: серверный сертификат',
        d: '1 — снова **+** в том же окне. ' +
          '2 — Name = `ovpn-server`. ' +
          '3 — Common Name = адрес, по которому к вам подключаются: публичный IP `203.0.113.20` ' +
          'или DDNS-имя `vpn.example.com`. Клиент сверит это имя — не угадывайте. ' +
          '4 — Key Usage = **tls-server**. ' +
          '5 — Days Valid = `825` (стандарт для серверных сертификатов). ' +
          '6 — OK. Пока сертификат не подписан, он бесполезен — подписываем в следующем шаге.',
        sc: {
          marks: 1,
          cap: 'Certificates: серверный сертификат',
          path: 'System → Certificates',
          win: 'Certificates', tabs: ['Certificates', 'CRL', 'SCEP'], tab: 'Certificates',
          cols: [{ t: 'Name', w: 130 }, { t: 'Common Name', w: 160 }, { t: 'Issuer', w: 120 },
            { t: 'Validity', w: 90 }, { t: 'Days', w: 70 }, { t: 'Trusted', w: 80 }],
          rows: [
            [{ v: 'ovpn-ca' }, { v: 'ovpn-ca' }, { v: 'ovpn-ca' }, { v: 'ok', c: 'ok' }, { v: '3650' }, { v: 'yes', c: 'ok' }],
            [{ v: 'ovpn-server', m: 2 }, { v: '203.0.113.20', m: 3 }, { v: '' }, { v: 'unsigned', c: 'no' }, { v: '825' }, { v: 'no' }]
          ],
          sel: 1,
          tools: [{ t: '+', id: 'add', m: 1 }],
          form: {
            title: 'New Certificate',
            fields: [
              { l: 'Common Name', v: '203.0.113.20', m: 4 },
              { l: 'Key Usage', v: 'tls-server', m: 5 },
              { l: 'Days Valid', v: '825', m: 6 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK' }]
          },
          notes: [
            '1 — «+»: новый сертификат',
            '2 — имя строки: ovpn-server (его выберем в сервере)',
            '3 — Common Name: адрес, по которому подключаются',
            '4 — Common Name в диалоге: публичный IP или домен',
            '5 — Key Usage: tls-server',
            '6 — Days Valid: 825'
          ]
        }
      },
      {
        t: 'Шаг 3: подпишите сертификаты своим CA',
        d: 'Подпись — это и есть «выдача»: именно подписанный сертификат клиент принимает. ' +
          '1 — выделите строку `ovpn-server` в списке. ' +
          '2 — нажмите **Sign** в панели окна. ' +
          '3 — CA = `ovpn-ca`. ' +
          '4 — Sign. В колонке Issuer появится `ovpn-ca`, в Validity — `ok`. ' +
          'С CA делают то же самое один раз: CA = `ovpn-ca` и подпись им же.',
        sc: {
          marks: 1,
          cap: 'Certificates: подпись сертификата у CA',
          path: 'System → Certificates',
          win: 'Certificates', tabs: ['Certificates', 'CRL', 'SCEP'], tab: 'Certificates',
          cols: [{ t: 'Name', w: 130 }, { t: 'Common Name', w: 150 }, { t: 'Issuer', w: 110 },
            { t: 'Validity', w: 90 }, { t: 'Days', w: 70 }],
          rows: [
            [{ v: 'ovpn-ca' }, { v: 'ovpn-ca' }, { v: 'ovpn-ca' }, { v: 'ok', c: 'ok' }, { v: '3650' }],
            [{ v: 'ovpn-server', m: 1 }, { v: '203.0.113.20' }, { v: '', m: 5 }, { v: 'unsigned', c: 'no' }, { v: '825' }]
          ],
          sel: 1,
          tools: [{ t: 'Sign', id: 'sign', m: 2 }],
          form: {
            title: 'Sign',
            fields: [
              { l: 'CA', v: 'ovpn-ca', type: 'select', m: 3 },
              { l: 'Name', v: 'ovpn-server', m: 4 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Sign', m: 6 }]
          },
          notes: [
            '1 — выделите строку сертификата',
            '2 — кнопка Sign в панели окна',
            '3 — CA: ваш центр сертификации',
            '4 — Name: имя, под которым сертификат останется в списке',
            '5 — Issuer: после подписи здесь появится ovpn-ca',
            '6 — Sign: подписать'
          ]
        }
      },
      {
        t: 'Шаг 4: клиентские сертификаты (по одному на устройство)',
        d: '1 — **+** в том же окне. ' +
          '2 — Name = `cli-phone` (понятное имя: чей это телефон или ноутбук). ' +
          '3 — Common Name = `cli-phone` (можно имя сотрудника). ' +
          '4 — Key Usage = **tls-client**. ' +
          '5 — Days Valid = `365`. ' +
          '6 — OK, затем **Sign** и CA = `ovpn-ca`. Повторите для каждого устройства: ' +
          '`cli-pc-ivanov`, `cli-phone-petrova` — так доступ отзывается по одному.',
        sc: {
          marks: 1,
          cap: 'Certificates: клиентские сертификаты',
          path: 'System → Certificates',
          win: 'Certificates', tabs: ['Certificates', 'CRL', 'SCEP'], tab: 'Certificates',
          cols: [{ t: 'Name', w: 150 }, { t: 'Common Name', w: 150 }, { t: 'Issuer', w: 110 },
            { t: 'Validity', w: 90 }, { t: 'Days', w: 70 }],
          rows: [
            [{ v: 'ovpn-ca' }, { v: 'ovpn-ca' }, { v: 'ovpn-ca' }, { v: 'ok', c: 'ok' }, { v: '3650' }],
            [{ v: 'ovpn-server' }, { v: '203.0.113.20' }, { v: 'ovpn-ca' }, { v: 'ok', c: 'ok' }, { v: '825' }],
            [{ v: 'cli-phone', m: 2 }, { v: 'cli-phone', m: 3 }, { v: 'ovpn-ca' }, { v: 'ok', c: 'ok' }, { v: '365' }],
            [{ v: 'cli-pc-ivanov' }, { v: 'cli-pc-ivanov' }, { v: 'ovpn-ca' }, { v: 'ok', c: 'ok' }, { v: '365' }]
          ],
          sel: 2,
          tools: [{ t: '+', id: 'add', m: 1 }],
          form: {
            title: 'New Certificate',
            fields: [
              { l: 'Common Name', v: 'cli-phone', m: 4 },
              { l: 'Key Usage', v: 'tls-client', m: 5 },
              { l: 'Days Valid', v: '365', m: 6 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK' }]
          },
          notes: [
            '1 — «+»: сертификат для устройства',
            '2 — имя строки: cli-phone',
            '3 — Common Name: имя устройства или сотрудника',
            '4 — Common Name в диалоге',
            '5 — Key Usage: tls-client',
            '6 — Days Valid: 365'
          ]
        }
      },
      {
        t: 'Шаг 5: экспорт файлов для клиента',
        d: 'Клиенту нужны три файла: **ca.crt** (кем подписан), **client.crt** (его сертификат) ' +
          'и **client.key** (его приватный ключ). ' +
          '1 — в окне Certificates выделите `ovpn-ca` и нажмите **Export** — появится `cert_export_ovpn-ca.crt`. ' +
          '2 — выделите `cli-phone` и нажмите **Export** — появятся `cert_export_cli-phone.crt` и `.key`. ' +
          '3 — откройте **Files** в дереве меню: файлы лежат там. ' +
          '4 — скачайте их себе (кнопка Download или перетаскивание) и передайте сотруднику. ' +
          'Приватный ключ устройства никому больше не отдавайте.',
        sc: {
          marks: 1,
          cap: 'Files: что появилось после экспорта',
          path: 'Files', menu: { grp: 1 },
          win: 'Files', noTools: true,
          cols: [{ t: 'Name', w: 250 }, { t: 'Type', w: 100 }, { t: 'Size', w: 100 }, { t: 'Creation Time', w: 150 }],
          rows: [
            [{ v: 'cert_export_ovpn-ca.crt', m: 2 }, { v: 'certificate', m: 2 }, { v: '1.9 KiB' }, { v: 'nov/07 19:02' }],
            [{ v: 'cert_export_cli-phone.crt', m: 3 }, { v: 'certificate', m: 3 }, { v: '2.1 KiB' }, { v: 'nov/07 19:05' }],
            [{ v: 'cert_export_cli-phone.key', m: 4 }, { v: 'private key', m: 4 }, { v: '1.7 KiB' }, { v: 'nov/07 19:05' }]
          ],
          sel: 1,
          notes: [
            '1 — Files в дереве меню',
            '2 — ca.crt: сертификат вашего CA',
            '3 — сертификат клиента',
            '4 — приватный ключ клиента (никому больше)'
          ]
        }
      },
      {
        t: 'Профиль: адрес и DNS для клиентов',
        d: '1 — откройте **PPP**, 2 — **Profiles**, 3 — **+**. ' +
          '4 — Name = `ovpn-clients`. ' +
          '5 — Local Address = `10.98.0.1`. ' +
          '6 — Remote Address = `10.98.0.100` (клиент получит этот адрес; для нескольких клиентов ' +
          'укажите пул, например `10.98.0.100-10.98.0.150`). ' +
          '7 — DNS Server = `10.98.0.1`. 8 — OK.',
        sc: {
          marks: 1,
          cap: 'PPP → Profiles: адреса для OpenVPN-клиентов',
          path: 'PPP → Profiles', menu: { grp: 1, sub: 2 },
          win: 'PPP',
          tabs: ['Interfaces', 'Secrets', 'Profiles', 'PPPoE Server', 'L2TP Server', 'OVPN Server', 'Active Connections'],
          tab: 'Profiles',
          cols: [{ t: 'Name', w: 130 }, { t: 'Local Address', w: 116 }, { t: 'Remote Address', w: 130 }, { t: 'DNS Server', w: 120 }],
          rows: [[{ v: 'ovpn-clients' }, { v: '10.98.0.1' }, { v: '10.98.0.100' }, { v: '10.98.0.1' }]],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'New PPP Profile',
            fields: [
              { l: 'Name', v: 'ovpn-clients', m: 4 },
              { l: 'Local Address', v: '10.98.0.1', m: 5 },
              { l: 'Remote Address', v: '10.98.0.100', m: 6 },
              { l: 'DNS Server', v: '10.98.0.1', m: 7 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 8 }]
          },
          notes: [
            '1 — группа PPP',
            '2 — пункт Profiles',
            '3 — «+»: новый профиль',
            '4 — Name: ovpn-clients',
            '5 — Local Address: адрес роутера в VPN',
            '6 — Remote Address: адрес (или пул) клиентов',
            '7 — DNS Server: что пропишется клиенту',
            '8 — OK'
          ]
        }
      },
      {
        t: 'Включите OVPN-сервер',
        d: '1 — в дереве откройте **PPP**, 2 — пункт **OVPN Server**. ' +
          '3 — нажмите кнопку **OVPN Server** в панели окна. ' +
          '4 — Enabled = **yes**. 5 — Port = `1194`. ' +
          '6 — Mode = **ip** (L3-туннель; `tap` нужен только для L2-моста). ' +
          '7 — Certificate = `ovpn-server` (тот, что подписали). ' +
          '8 — Require Client Certificate = **yes** — без клиентского сертификата вход невозможен. ' +
          '9 — Default Profile = `ovpn-clients`. → Apply.',
        sc: {
          marks: 1,
          cap: 'PPP → OVPN Server: включаем сервер',
          path: 'PPP → OVPN Server', menu: { grp: 1, sub: 2 },
          win: 'PPP',
          tabs: ['Interfaces', 'Secrets', 'Profiles', 'PPPoE Server', 'L2TP Server', 'OVPN Server', 'Active Connections'],
          tab: 'OVPN Server',
          cols: [{ t: 'Name', w: 130 }, { t: 'Service', w: 110 }, { t: 'Local Address', w: 120 }],
          rows: [['main', 'ovpn', '10.98.0.1']],
          sel: 0,
          tools: [{ t: 'OVPN Server', id: 'srv', m: 3 }],
          form: {
            title: 'OVPN Server', buttons: [{ t: 'Cancel' }, { t: 'Apply', m: 9 }],
            fields: [
              { l: 'Enabled', v: 'yes', m: 4 },
              { l: 'Port', v: '1194', m: 5 },
              { l: 'Mode', v: 'ip', type: 'select', m: 6 },
              { l: 'Certificate', v: 'ovpn-server', type: 'select', m: 7 },
              { l: 'Require Client Certificate', v: 'yes', m: 8 },
              { l: 'Default Profile', v: 'ovpn-clients', type: 'select' }
            ]
          },
          notes: [
            '1 — группа PPP',
            '2 — пункт OVPN Server',
            '3 — кнопка OVPN Server: настройки',
            '4 — Enabled: yes',
            '5 — Port: 1194',
            '6 — Mode: ip',
            '7 — Certificate: серверный сертификат',
            '8 — Require Client Certificate: yes',
            '9 — Apply'
          ]
        }
      },
      {
        t: 'Firewall: откройте TCP 1194',
        d: 'OpenVPN в RouterOS работает по **TCP**. ' +
          '1 — IP → Firewall → **Filter Rules** → **+**. ' +
          '2 — Chain = **input**. 3 — Protocol = **tcp**. 4 — Dst. Port = `1194`. ' +
          '5 — вкладка **Action**: Action = **accept**. 6 — OK. ' +
          'Правило должно стоять выше общего запрета в цепочке input. ' +
          'Если поднимаете VPN на порту 443 — проверьте, что его не занял WebFig (IP → Services).',
        sc: {
          marks: 1,
          cap: 'Filter Rules: разрешаем TCP 1194',
          path: 'IP → Firewall → Filter Rules',
          win: 'IP Firewall',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
          tab: 'Filter Rules',
          cols: [{ t: '#', w: 26 }, { t: 'Chain', w: 66 }, { t: 'Protocol', w: 80 }, { t: 'Dst. Port', w: 76 },
            { t: 'Action', w: 86 }, { t: 'Comment', w: 180 }],
          rows: [[{ v: '0' }, { v: 'input' }, { v: 'tcp', m: 3 }, { v: '1194', m: 4 }, { v: 'accept', c: 'ok', m: 5 }, 'openvpn']],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 1 }],
          form: {
            title: 'New Filter Rule', tab: 'General', tabMark: 'Action', tabMarkN: 5,
            fields: [
              { l: 'Chain', v: 'input', type: 'select', t: 'General', m: 2 },
              { l: 'Protocol', v: 'tcp', type: 'select', t: 'General', m: 3 },
              { l: 'Dst. Port', v: '1194', t: 'General', m: 4 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 6 }]
          },
          notes: [
            '1 — «+»: новое правило',
            '2 — Chain: input',
            '3 — Protocol: tcp',
            '4 — Dst. Port: 1194',
            '5 — действие: вкладка Action → Action = accept',
            '6 — OK и поднять правило выше drop'
          ]
        }
      },
      {
        t: 'Клиент: OpenVPN Connect',
        d: '**Телефон и ПК**: приложение **OpenVPN Connect** (Windows, macOS, Android, iOS). ' +
          'Проще всего — импортировать профиль: в приложении «Import profile» → «File», ' +
          'выберите `.ovpn`; если профиля нет, импортируйте три файла: `ca.crt`, `клиент.crt`, ' +
          '`клиент.key`. Логин и пароль — из **PPP → Secrets** (создаётся так же, как для L2TP, ' +
          'только Service можно оставить `any` или `ovpn`). ' +
          'Сервер в профиле должен совпадать с Common Name серверного сертификата, иначе клиент ' +
          'откажется подключаться с ошибкой проверки имени.',
        noScene: true
      },
      {
        t: 'Проверка и сроки сертификатов',
        d: '1 — PPP → **Active Connections**: появилась строка с Service = `ovpn`, логином сотрудника ' +
          'и адресом из профиля. ' +
          '2 — в System → Certificates у всех строк Validity = `ok`, а в колонке Validity видны даты. ' +
          '3 — запишите, когда истекает серверный сертификат: за месяц до этого выпустите новый, ' +
          'подпишите CA и замените в OVPN Server. Просроченный сертификат выглядит как «TLS handshake ' +
          'failed» без объяснений.',
        sc: {
          marks: 1,
          cap: 'Certificates: сроки и подписи',
          path: 'System → Certificates', menu: { grp: 1 },
          win: 'Certificates', tabs: ['Certificates', 'CRL', 'SCEP'], tab: 'Certificates',
          cols: [{ t: 'Name', w: 150 }, { t: 'Issuer', w: 110 }, { t: 'Validity', w: 90 },
            { t: 'Days', w: 70 }, { t: 'Trusted', w: 80 }],
          rows: [
            [{ v: 'ovpn-ca' }, { v: 'ovpn-ca' }, { v: 'ok', c: 'ok' }, { v: '3612' }, { v: 'yes', c: 'ok' }],
            [{ v: 'ovpn-server' }, { v: 'ovpn-ca' }, { v: 'ok', c: 'ok', m: 2 }, { v: '801', m: 3 }, { v: 'no' }],
            [{ v: 'cli-phone' }, { v: 'ovpn-ca' }, { v: 'ok', c: 'ok' }, { v: '341' }, { v: 'no' }]
          ],
          sel: 1,
          notes: [
            '1 — System → Certificates',
            '2 — Validity = ok: сертификат действителен',
            '3 — Days: сколько дней осталось — планируйте замену заранее'
          ]
        }
      },
      {
        t: 'Если не подключается',
        d: '**«TLS handshake failed» / «certificate verify failed»** — клиент не доверяет серверу: ' +
          'выдан не тот `ca.crt` или Common Name серверного сертификата не совпадает с адресом в профиле. ' +
          '**«Certificate expired»** — истёк срок: перевыпустите и подпишите заново. ' +
          '**Подключается, но нет доступа в сеть** — нет маршрутов/NAT для `10.98.0.0/24` ' +
          'и правил forward между VPN и LAN. ' +
          '**Соединение рвётся сразу** — сервер не принимает клиентский сертификат: проверьте, ' +
          'что он подписан вашим CA и Key Usage = tls-client. ' +
          '**Порт «не отвечает»** — правило input для TCP 1194 отсутствует или стоит ниже drop.',
        noScene: true
      }
    ],
    scenes: [],
    check: [
      {
        d: 'сервер, сертификаты и их сроки',
        c: '/interface ovpn-server server print detail\n/certificate print detail\n/certificate print where expires-after<30d'
      },
      {
        d: 'кто подключён и что в логе',
        c: '/ppp active print where service=ovpn\n/log print where topics~"ovpn,ppp,ssl"'
      }
    ],
    mistakes: [
      'Сертификат создан, но не подписан CA — сервер его не использует, клиент получает отказ.',
      'Common Name серверного сертификата не совпадает с адресом в профиле клиента.',
      'Require Client Certificate = yes, а клиенту сертификат не выдан.',
      'Один клиентский сертификат на несколько устройств — отозвать одному невозможно.',
      'Порт 1194 закрыт в firewall или занят другим сервисом (например, WebFig на 443).',
      'Истёк срок сертификата — подключение молча перестало работать.',
      'Пакет ovpn не установлен — меню OVPN Server отсутствует, а статья не поможет.'
    ],
    next: ['ppp-l2tp-server', 'wg-server', 'vpn-ipsec-ikev2', 'vpn-wireguard']
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
