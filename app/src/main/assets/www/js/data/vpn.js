/* VPN и WireGuard: подробный разбор каждого типа — плюсы, минусы, настройка.
   Подключается после js/data/more.js, добавляет статьи в раздел «VPN и туннели»
   и создаёт отдельный раздел меню «WireGuard». */
(function () {
  'use strict';
  var D = window.DATA || [];
  function group(id) {
    for (var i = 0; i < D.length; i++) if (D[i].id === id) return D[i];
    return null;
  }
  var vpn = group('vpn');
  if (!vpn) return;

  vpn.items.push({
    id: 'vpn-choose', t: 'Какой VPN выбрать: сравнение всех типов', lvl: 1,
    path: 'VPN → выбор технологии', tags: ['vpn', 'сравнение', 'выбор', 'wireguard', 'ipsec'],
    purpose: 'Шесть технологий VPN в RouterOS решают разные задачи. Ниже — честное сравнение по шифрованию, скорости, сложности настройки, совместимости и типичным сценариям, чтобы вы не переделывали сеть через месяц.',
    usage: [
      'Сотрудники работают из дома и должны попадать в офисную сеть.',
      'Нужно соединить два офиса или офис с облаком в одну подсеть.',
      'Публичный Wi-Fi, недоверенные сети — весь трафик должен идти через свой сервер.',
      'Требуется совместимость со штатными клиентами Windows, macOS, Android, iOS.'
    ],
    table: {
      title: 'Сравнение технологий VPN в RouterOS 7',
      head: ['Тип', 'Шифрование', 'Скорость', 'Сложность', 'Клиенты', 'Когда выбирать'],
      rows: [
        ['**WireGuard**', 'ChaCha20-Poly1305', 'высокая (ядро, без аллокаций)', 'низкая', 'все ОС, приложение', 'Основной выбор: филиалы, сотрудники, mesh'],
        ['**IPsec (IKEv2)**', 'AES-GCM / AES-CBC', 'средняя-высокая', 'высокая', 'встроен в Windows, iOS, Android', 'Нужен «из коробки» без установки ПО'],
        ['**L2TP/IPsec**', 'IPsec (AES) + PPP', 'средняя', 'средняя', 'встроен везде', 'Старые устройства, простой road-warrior'],
        ['**SSTP**', 'TLS 1.2/1.3 (443/tcp)', 'средняя', 'средняя', 'Windows, macOS, Android (не iOS)', 'Провайдер режет GRE/ESP, нужен только 443'],
        ['**OpenVPN**', 'TLS + AES', 'низкая-средняя', 'средняя', 'все ОС, клиент OpenVPN', 'Совместимость и обход блокировок'],
        ['**PPTP**', 'MPPE — взломан', 'высокая', 'низкая', 'везде', 'Только для совместимости с древним железом'],
        ['**EoIP / GRE / IPIP**', 'нет своего шифрования', 'очень высокая', 'низкая', 'только RouterOS', 'L2-связность между MikroTik + IPsec сверху']
      ]
    },
    pros: [
      'WireGuard в RouterOS 7 работает в ядре и держит сотни мегабит на слабом железе.',
      'Все типы, кроме PPTP, можно усилить сертификатами и ограничениями в firewall.',
      'Один роутер может одновременно держать несколько типов VPN для разных задач.'
    ],
    cons: [
      'PPTP и «голый» L2TP без IPsec — небезопасны, использовать нельзя.',
      'EoIP/GRE сами по себе не шифруют трафик: без IPsec это передача данных открытым текстом.',
      'IPsec сложнее в диагностике: ошибки видны только в логах и счётчиках, а не в интерфейсе.'
    ],
    steps: [
      { t: 'Определите задачу', d: 'Соединить офисы (site-to-site) → WireGuard или IPsec. Пустить сотрудников (road-warrior) → WireGuard, при запрете установки ПО → IPsec IKEv2 или L2TP/IPsec.' },
      { t: 'Проверьте, что нужно клиентам', d: 'Windows без стороннего ПО умеет IKEv2, L2TP/IPsec, SSTP и PPTP. Для WireGuard и OpenVPN нужен клиент.' },
      { t: 'Оцените ограничения провайдера', d: 'Если не проходят GRE/ESP — остаются SSTP и OpenVPN (443/tcp), WireGuard по UDP 51820/свой порт.' },
      { t: 'Спланируйте адресацию', d: 'Отдельная подсеть для VPN (например 10.99.0.0/24), пул адресов и маршруты. Не пересекайте её с LAN.' },
      { t: 'Заложите резерв', d: 'Держите второй тип VPN на другом порту — если один заблокируют, доступ останется.' },
      { t: 'Задокументируйте', d: 'Сохраните конфиг (`/export`), пароли и ключи в менеджере секретов — без них восстановление займёт часы.' }
    ],
    scenes: [{
      path: 'PPP → L2TP Server', win: 'L2TP Server', tabs: ['General', 'L2TP', 'PPP', 'Secrets'], tab: 'General', noTools: true,
      form: {
        title: 'L2TP Server', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
          { l: 'Use IPsec', v: 'yes', type: 'select', m: 2 },
          { l: 'IPsec Secret', v: '••••••••', m: 3 },
          { l: 'Default Profile', v: 'vpn-staff', type: 'select' },
          { l: 'Authentication', v: 'mschap2' },
          { l: 'Keepalive Timeout', v: '30s' }
        ],
        note: 'Если Use IPsec = yes, клиент обязан поднимать L2TP поверх IPsec, иначе подключение отклоняется'
      },
      notes: [
        'Сервер L2TP включается одним переключателем',
        'IPsec обязателен: «голый» L2TP не шифрует трафик',
        'Общий секрет IPsec — он же вводится в клиенте'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface l2tp-server server print\n/ip ipsec active-peers print\n/ppp active print' }],
    mistakes: [
      'Пересечение подсетей: VPN 192.168.88.0/24 и офис 192.168.88.0/24 — маршрутизация ломается.',
      'Открытый L2TP без IPsec — пароли и трафик передаются в открытом виде.',
      'Забыли разрешить 500/4500/udp и ESP на WAN — рукопожатие не проходит.',
      'Один пул адресов на всех: клиенты получают адреса из LAN и конфликтуют с ней.'
    ],
    links: [{ t: 'Документация: VPN', u: 'https://help.mikrotik.com/docs/display/ROS/VPN' }]
  });

  /* ---------------- IPsec ---------------- */
  vpn.items.push({
    id: 'vpn-ipsec-policy', t: 'IPsec: Policies, Peers, Proposals — как это устроено', lvl: 3,
    path: 'IP → IPsec', tags: ['ipsec', 'ikev2', 'esp', 'site-to-site'],
    purpose: 'IPsec в RouterOS состоит из четырёх уровней: Profiles/Proposals (набор алгоритмов), Peers (кто с кем и как аутентифицируется), Policies (какой трафик шифровать) и Identities (свои сертификаты/PSK). Ошибка на любом уровне — и трафик идёт открытым текстом либо не идёт вовсе.',
    usage: [
      'Соединение офис-офис через публичный интернет с шифрованием L3.',
      'Подключение оборудования, которое умеет только IPsec (АТС, кассы, камеры).',
      'Транспортный режим для EoIP/GRE-туннелей.',
      'Требование безопасности: весь трафик между площадками должен быть зашифрован.'
    ],
    table: {
      title: 'Из чего состоит IPsec',
      head: ['Уровень', 'Где в Winbox', 'За что отвечает'],
      rows: [
        ['Proposal', 'IP → IPsec → Proposals', 'Набор алгоритмов: шифрование, хеш, DH-группа, время жизни SA'],
        ['Peer', 'IP → IPsec → Peers', 'Партнёр: адрес, PSK или сертификат, режим обмена (IKEv1/IKEv2)'],
        ['Policy', 'IP → IPsec → Policies', 'Правило: какой src/dst шифровать, какой peer, tunnel/transport'],
        ['Identity', 'IP → IPsec → Identities', 'Локальный сертификат или PSK для пира']
      ]
    },
    pros: [
      'Стандарт де-факто: совместим с любым оборудованием (Cisco, Huawei, Keenetic, Windows, iOS).',
      'Аппаратное ускорение AES на современных моделях — почти линейная скорость.',
      'Гибко: можно шифровать только нужные подсети, остальное пускать напрямую.'
    ],
    cons: [
      'Сложная диагностика: ошибки видны только в Log с топиком ipsec.',
      'Много параметров, которые должны совпасть с другой стороной (алгоритмы, DH, lifetime).',
      'NAT между площадками требует NAT-T и дополнительных правил.'
    ],
    steps: [
      { t: 'Proposal', d: 'IP → IPsec → Proposals → `+`: Name=`prop-aes`, Auth Algorithms=sha256, Encr Algorithms=aes-256-cbc (или aes-256-gcm), PFS Group=modp2048, Lifetime=1h.' },
      { t: 'Profile', d: 'IP → IPsec → Profiles → `+`: Name=`prof-site`, Hash Algorithm=sha256, Encryption Algorithm=aes-256-gcm, DH Group=modp2048, Lifetime=1h. Профиль указывается в Peer.' },
      { t: 'Peer', d: 'IP → IPsec → Peers → `+`: Address=`203.0.113.10` (адрес второй площадки), Exchange Mode=`ike2`, Secret=`сильный пароль` или Certificate, Proposal Check=obey.' },
      { t: 'Policy', d: 'IP → IPsec → Policies → `+`: Src. Address=`192.168.10.0/24`, Dst. Address=`192.168.20.0/24`, Protocol=all, Action=encrypt, Level=require, Tunnel=yes, SA Src. Address=`203.0.113.20`, SA Dst. Address=`203.0.113.10`, Peer=`site-b`.' },
      { t: 'Зеркальная политика', d: 'На второй стороне создают симметричную policy и peer с адресом первой площадки.' },
      { t: 'Проверка', d: 'IP → IPsec → Installed SAs: появились строки — туннель поднялся. В активных политиках Ph2 State = established.' }
    ],
    scenes: [{
      path: 'IP → IPsec → Policies', win: 'IPsec', tabs: ['Policies', 'Peers', 'Proposals', 'Installed SAs'], tab: 'Policies',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }, { t: '⌕' }],
      cols: [{ t: 'Src. Address', w: 150 }, { t: 'Dst. Address', w: 150 }, { t: 'Protocol', w: 80 }, { t: 'Action', w: 84 }, { t: 'Level', w: 80 }, { t: 'Peer', w: 110 }],
      rows: [
        [{ v: '192.168.10.0/24', m: 2 }, { v: '192.168.20.0/24', m: 3 }, 'all', { v: 'encrypt', m: 4 }, 'require', 'site-b'],
        ['192.168.20.0/24', '192.168.10.0/24', 'all', 'encrypt', 'require', 'site-b']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления политики',
        'Локальная подсеть, которую шифруем',
        'Подсеть второй площадки',
        'Action=encrypt + Level=require — без туннеля трафик не пойдёт вовсе'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip ipsec policy print\n/ip ipsec installed-sa print\n/log print where topics~"ipsec"' }],
    warn: 'Политика должна совпасть на обеих сторонах по src/dst. Асимметричная политика (LAN→LAN на одной стороне и LAN→LAN на другой) не поднимется — на второй стороне src/dst меняются местами.',
    mistakes: [
      'Level=unique вместо require: трафик уходит в обход, если SA не поднялся.',
      'Разные Proposal на сторонах — IKE не согласует параметры.',
      'Политика перекрывает NAT: dstnat срабатывает раньше IPsec, и трафик уходит не туда.',
      'Не разрешены 500/4500/udp, ESP и AH во входной цепочке firewall.'
    ],
    links: [{ t: 'Документация: IPsec', u: 'https://help.mikrotik.com/docs/display/ROS/IPsec' }]
  });

  vpn.items.push({
    id: 'vpn-ipsec-keys', t: 'IPsec: PSK или сертификаты, уровни шифрования', lvl: 3,
    path: 'IP → IPsec → Identities / Peers', tags: ['ipsec', 'psk', 'сертификат', 'шифрование'],
    purpose: 'Аутентификация в IPsec бывает двух видов: общий секрет (PSK) — быстро, но все площадки знают один пароль; сертификаты — сложнее, но каждый узел подтверждает личность криптографией и PSK можно менять без перенастройки всех.',
    usage: [
      'PSK — 2–3 площадки, быстрый старт, есть контроль за обеими сторонами.',
      'Сертификаты — много площадок, road-warrior, соответствие требованиям безопасности.',
      'Усиление: AES-GCM вместо CBC, DH-группа modp2048+, lifetime 1h.'
    ],
    pros: [
      'PSK: настройка за 5 минут, ничего не нужно выпускать и продлевать.',
      'Сертификаты: компрометация одного устройства не раскрывает остальные.',
      'AES-GCM даёт шифрование и проверку целостности одним проходом — быстрее, чем CBC+SHA.'
    ],
    cons: [
      'PSK: утечка пароля на одной площадке = компрометация всех туннелей с этим секретом.',
      'Сертификаты: нужен свой CA, следить за сроками действия и отзывом.',
      'Слабые алгоритмы (sha1, 3des, modp1024) до сих пор стоят по умолчанию в старых профилях.'
    ],
    steps: [
      { t: 'Свой CA', d: 'System → Certificates → `+` → Certificate Authority: Name=`vpn-ca`, Key Size=2048, Days Valid=3650; затем Add → Sign с CA.' },
      { t: 'Сертификаты узлов', d: 'System → Certificates → `+`: Name=`site-b`, Common Name=`site-b`; подпишите своим CA, экспортируйте и установите на вторую площадку.' },
      { t: 'Identity', d: 'IP → IPsec → Identities: для PSK используйте Peer с полем Secret, для сертификата — Peer с Certificate=`site-b`.' },
      { t: 'Современные алгоритмы', d: 'Proposals: Auth=sha256, Encr=aes-256-gcm, PFS=modp2048. Уберите sha1/3des/modp1024.' },
      { t: 'Проверка', d: 'IP → IPsec → Installed SAs: в колонках Encr/Auth должны быть ваши алгоритмы, а не aes-cbc-128/sha1.' }
    ],
    scenes: [{
      path: 'IP → IPsec → Identities', win: 'IPsec', tabs: ['Identities', 'Peers', 'Proposals'], tab: 'Identities', noTools: true,
      form: {
        title: 'Identity', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Peer', v: 'site-b', type: 'select', m: 1 },
          { l: 'Auth. Method', v: 'digital signature', type: 'select', m: 2 },
          { l: 'Certificate', v: 'site-b', type: 'select', m: 3 },
          { l: 'Remote Certificate', v: 'request', type: 'select' },
          { l: 'Generate Policy', v: 'port-strict', type: 'select' }
        ],
        note: 'Для PSK поле Auth. Method = pre-shared key и заполняется Secret в Peer'
      },
      notes: [
        'Пир, к которому применяется идентичность',
        'Способ аутентификации: PSK или цифровая подпись',
        'Сертификат этого узла'
      ]
    }],
    check: [{ d: 'терминал', c: '/certificate print where name~"vpn"\n/ip ipsec identity print detail\n/ip ipsec proposal print' }],
    warn: 'Срок действия сертификата истёк — туннель падает молча, в логе только «certificate expired». Ставьте напоминание за месяц до даты окончания.',
    mistakes: [
      'Common Name сертификата не совпадает с remote-id — peer не аутентифицируется.',
      'CA не установлен на второй стороне — цепочка не проверяется.',
      'Оставили PSK в конфиге после перехода на сертификаты.',
      'Разные lifetime в proposal (1h и 8h) — пересогласование рвётся.'
    ]
  });

  /* ---------------- PPTP ---------------- */
  vpn.items.push({
    id: 'vpn-pptp', t: 'PPTP — почему нельзя и как выключить', lvl: 1,
    path: 'PPP → PPTP Server / Interface → PPTP Client', tags: ['pptp', 'устарело', 'безопасность'],
    purpose: 'PPTP — самый старый VPN-протокол в RouterOS. Аутентификация MS-CHAPv2 и шифрование MPPE взломаны: перехваченное рукопожатие позволяет восстановить пароль за минуты. Оставлять его включённым — значит держать открытую дверь в сеть.',
    usage: [
      'Единственный оставшийся вариант — совместимость с очень старым оборудованием, которое не умеет ничего другого.',
      'Правильное действие для действующей сети: найти, кто использует PPTP, и перевести на WireGuard или L2TP/IPsec.',
      'Проверка конфигурации при аудите: включён ли PPTP-сервер.'
    ],
    pros: [
      'Работает везде и без настройки на клиенте (Windows, Android).',
      'Очень низкая нагрузка на процессор.',
      'Проходит через многие NAT — используется только TCP 1723 и GRE.'
    ],
    cons: [
      'Шифрование MPPE с RC4-40/128 — ломается, пароль восстанавливается из перехвата.',
      'MS-CHAPv2 уязвим к атакам на дайджест — это доказано с 2012 года.',
      'Требует GRE (протокол 47) — многие провайдеры и отели его режут.',
      'В современном RouterOS считается устаревшим, поддержка может быть удалена.'
    ],
    steps: [
      { t: 'Проверьте, включён ли', d: 'PPP → PPTP Server: если Enabled=yes, посмотрите PPP → Active Connections — кто подключён.' },
      { t: 'Выключите', d: 'PPP → PPTP Server → Enabled=no (или снимите галочку и нажмите Apply).' },
      { t: 'Уберите правила', d: 'IP → Firewall → Filter: удалите разрешения для tcp/1723 и цепочки, пропускающие GRE.' },
      { t: 'Переведите клиентов', d: 'Создайте PPP → Secrets для L2TP/IPsec или WireGuard-конфиг, раздайте сотрудникам и объясните, как подключиться заново.' },
      { t: 'Проверка', d: 'В логе больше нет записей «pptp logged in», снаружи порт 1723 не отвечает.' }
    ],
    scenes: [{
      path: 'PPP → PPTP Server', win: 'PPTP Server', noTools: true, tabs: ['General'], tab: 'General',
      form: {
        title: 'PPTP Server', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Enabled', v: 'no', type: 'select', m: 1, ro: true },
          { l: 'Default Profile', v: 'default-encryption', type: 'select' },
          { l: 'Authentication', v: 'mschap2', ro: true },
          { l: 'Keepalive Timeout', v: '10s' }
        ],
        note: 'Правильное состояние для современной сети — Enabled: no'
      },
      notes: ['Выключенный сервер PPTP — базовая гигиена безопасности']
    }],
    check: [{ d: 'терминал', c: '/interface pptp-server server print\n/ppp active print where service=pptp\n/log print where message~"pptp"' }],
    danger: 'Если PPTP включён и смотрит в интернет, считайте, что пароли пользователей уже могли быть перехвачены. После выключения смените пароли этих учётных записей.',
    mistakes: [
      'Выключили сервер, но оставили secret-записи с Service=any — клиент подключается по другому сервису.',
      'Забыли правило firewall, разрешающее GRE — «вроде выключили», а порт открыт.',
      'Считают, что PPTP «нормально, потому что быстрый».'
    ]
  });

  /* ---------------- SSTP ---------------- */
  vpn.items.push({
    id: 'vpn-sstp', t: 'SSTP — VPN по TCP 443, когда всё остальное режут', lvl: 3,
    path: 'PPP → SSTP Server / Interface → SSTP Client', tags: ['sstp', 'tls', '443', 'обход блокировок'],
    purpose: 'SSTP — это PPP внутри TLS. Трафик выглядит как обычный HTTPS на порту 443, поэтому проходит там, где запрещены GRE, ESP и UDP. Встроен в Windows и macOS, на iOS отсутствует.',
    usage: [
      'Гостиничные и корпоративные сети, где открыт только 443/tcp.',
      'Провайдер блокирует L2TP/IPsec и WireGuard по порту/протоколу.',
      'Нужен VPN строго по HTTPS-порту с валидным сертификатом.'
    ],
    pros: [
      'Работает через любой NAT и прокси, где разрешён только HTTPS.',
      'Шифрование стандартным TLS 1.2/1.3 — надёжно при валидном сертификате.',
      'Встроенный клиент в Windows/macOS — не нужно ставить ПО.'
    ],
    cons: [
      'Инкапсуляция TCP в TCP — потери скорости при плохом канале (TCP meltdown).',
      'Высокий CPU-расход: TLS + PPP на каждое подключение.',
      'Нет клиента на iOS/Android по умолчанию — нужен сторонний.',
      'Самоподписанный сертификат требует ручного доверия на клиенте.'
    ],
    steps: [
      { t: 'Сертификат', d: 'System → Certificates: создайте/импортируйте сертификат для имени `vpn.example.com`, подписанный публичным CA (или своим).' },
      { t: 'Профиль PPP', d: 'PPP → Profiles → `+`: Name=`sstp-clients`, Local Address=`10.99.0.1`, Remote Address=`10.99.0.100`, DNS Server=`10.99.0.1`.' },
      { t: 'Сервер', d: 'PPP → SSTP Server: Enabled=yes, Certificate=`vpn.example.com`, Authentication=mschap2, Default Profile=`sstp-clients`, Port=443.' },
      { t: 'Учётные записи', d: 'PPP → Secrets → `+`: Name, Password, Service=`sstp`, Profile=`sstp-clients`.' },
      { t: 'Firewall', d: 'Разрешите tcp/443 на input с WAN (только для этого сервиса). Если 443 занят веб-сервером — используйте другой порт и укажите его в клиенте.' },
      { t: 'Клиент Windows', d: 'Параметры → Сеть → VPN → Добавить → Windows (встроенный) → адрес `vpn.example.com`, тип «SSTP».' }
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
          { l: 'Default Profile', v: 'sstp-clients', type: 'select', m: 4 },
          { l: 'Keepalive Timeout', v: '60s' }
        ],
        note: 'Клиент указывает тот же адрес и порт; сертификат должен быть доверенным на клиенте'
      },
      notes: [
        'Включение SSTP-сервера',
        'Порт 443 — маскировка под HTTPS',
        'Сертификат с именем, совпадающим с адресом подключения',
        'Профиль с адресами и DNS для клиентов'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface sstp-server server print detail\n/ppp active print where service=sstp\n/log print where topics~"sstp"' }],
    warn: 'Не оставляйте порт 443 открытым для всех: добавьте в input правило с ограничением по src-address-list, если VPN нужен только своим.',
    mistakes: [
      'Имя в сертификате не совпадает с адресом — Windows отказывается подключаться.',
      'Порт 443 уже занят (WebFig/другой сервис) — сервер не стартует.',
      'Не задан DNS в профиле — клиент получает адрес, но не резолвит имена.'
    ]
  });

  /* ---------------- OpenVPN ---------------- */
  vpn.items.push({
    id: 'vpn-openvpn', t: 'OpenVPN — совместимость и обход блокировок', lvl: 3,
    path: 'PPP → OVPN Server / Interface → OVPN Client', tags: ['openvpn', 'tls', '443', 'клиент'],
    purpose: 'OpenVPN в RouterOS — PPP-сервер внутри TLS, как SSTP, но с собственным протоколом и клиентом OpenVPN на любой платформе. Даёт гибкость: TCP или UDP, любой порт, отдельные сертификаты клиентов.',
    usage: [
      'Нужен клиент на Linux/Android/iOS, где SSTP не поддерживается системно.',
      'Требуется режим TCP для сетей со строгим фильтром.',
      'Отдельные сертификаты каждому устройству (отзыв по одному).'
    ],
    pros: [
      'Клиенты для всех платформ, огромное сообщество и гайды.',
      'Можно поднять на любом порту, включая 443/tcp.',
      'Отзыв доступа через отзыв сертификата — без смены пароля у всех.'
    ],
    cons: [
      'Самый медленный из списка в RouterOS: PPP + TLS на CPU.',
      'Настройка сертификатов обязательна, PSK-режим ограничен.',
      'На iOS нужен платный клиент, на Android — стороннее приложение.',
      'Сложные ошибки: несовпадение cipher/TLS-версии диагностируется только по логу.'
    ],
    steps: [
      { t: 'CA и серверный сертификат', d: 'System → Certificates: свой CA, затем сертификат для сервера с Common Name, совпадающим с адресом.' },
      { t: 'Сертификаты клиентов', d: 'Каждому устройству — свой сертификат, подписанный тем же CA. Экспортируйте вместе с ключом.' },
      { t: 'Профиль', d: 'PPP → Profiles: Name=`ovpn-clients`, Local Address=`10.98.0.1`, Remote Address=`10.98.0.100`, DNS Server=`10.98.0.1`.' },
      { t: 'Сервер', d: 'PPP → OVPN Server: Enabled=yes, Port=1194, Mode=ip, Certificate=`ovpn-server`, Require Client Certificate=yes, Auth=sha1, Cipher=aes256-cbc (или aes-256-gcm в новых версиях), Default Profile=`ovpn-clients`.' },
      { t: 'Пользователи', d: 'PPP → Secrets: Service=`ovpn`, логин и пароль (в клиенте нужны и сертификат, и пароль, если так настроено).' },
      { t: 'Клиент', d: 'Экспортируйте `.ovpn`-профиль (или соберите вручную: ca.crt, client.crt, client.key) и импортируйте в OpenVPN Connect.' }
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
          { l: 'Require Client Certificate', v: 'yes', type: 'select' },
          { l: 'Cipher', v: 'aes256-cbc', type: 'select' },
          { l: 'Default Profile', v: 'ovpn-clients', type: 'select' }
        ],
        note: 'Режим ip — L3-туннель (обычный VPN), tap — L2-мост (нужен для широковещательных игр и старых протоколов)'
      },
      notes: [
        'Включение сервера OpenVPN',
        'Порт по умолчанию 1194; для обхода фильтров ставят 443/tcp',
        'Mode=ip для обычного VPN, tap — для L2',
        'Серверный сертификат, подписанный вашим CA'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface ovpn-server server print\n/ppp active print where service=ovpn\n/log print where topics~"ovpn"' }],
    warn: 'RouterOS не поддерживает часть современных функций OpenVPN (например, tls-crypt). Если клиент требует их — используйте контейнер с OpenVPN-сервером или другой тип VPN.',
    mistakes: [
      'Не совпадает cipher/TLS-версия клиента и сервера — соединение сбрасывается сразу.',
      'Клиенту не выдан сертификат, а Require Client Certificate=yes.',
      'Порт закрыт в firewall — клиент видит таймаут.',
      'Один сертификат на всех — при утере устройства отзывать придётся всем.'
    ]
  });

  /* ---------------- Site-to-site ---------------- */
  vpn.items.push({
    id: 'vpn-site2site', t: 'Соединяем два офиса: три рабочих схемы', lvl: 3,
    path: 'VPN → site-to-site', tags: ['site-to-site', 'филиал', 'wireguard', 'ipsec', 'eoip'],
    purpose: 'Задача «два офиса должны видеть друг друга» решается по-разному: WireGuard (просто и быстро), IPsec (совместимость), EoIP+IPsec (когда нужен единый L2-сегмент). Выбор зависит от того, какие сервисы должны работать через канал.',
    usage: [
      'Общий файловый сервер, 1С, кассы в двух офисах.',
      'Единая подсеть 192.168.88.0/24 в обоих офисах (требуется L2 — только EoIP).',
      'Резервный канал в облако или к хостингу.'
    ],
    table: {
      title: 'Три схемы site-to-site',
      head: ['Схема', 'Что получаем', 'Плюсы', 'Минусы'],
      rows: [
        ['**WireGuard**', 'L3-маршрутизация между подсетями', 'Быстро, просто, стабильно', 'Нужны статические маршруты, нет L2'],
        ['**IPsec (IKEv2)**', 'L3-шифрование между подсетями', 'Совместимо с любым вендором', 'Сложные политики, хуже диагностика'],
        ['**EoIP + IPsec**', 'Единый L2-сегмент (мост)', 'Работает широковещание, DHCP, discovery', 'Осторожно с петлями, MTU, скорость ниже']
      ]
    },
    pros: [
      'WireGuard-туннель поднимается за 10 минут и почти не грузит CPU.',
      'IPsec-схема пригодится, если вторая сторона — не MikroTik.',
      'EoIP решает задачи, которые L3-маршрутизация не решает вовсе (единый broadcast-домен).'
    ],
    cons: [
      'Пересечение подсетей ломает любую схему — планируйте адреса заранее.',
      'EoIP без IPsec передаёт трафик открытым текстом.',
      'При L2-мосте через интернет легко получить широковещательный шторм.'
    ],
    steps: [
      { t: 'Спланируйте адреса', d: 'Офис A: LAN 192.168.10.0/24, транспорт 203.0.113.20. Офис B: LAN 192.168.20.0/24, транспорт 203.0.113.10. Подсети не должны пересекаться.' },
      { t: 'WireGuard-туннель', d: 'На обоих роутерах: Interface → WireGuard → `+` (порт 13231), затем Peers: публичный ключ партнёра, Allowed Address=`192.168.20.0/24`, Endpoint=`203.0.113.10:13231`, Keepalive=25s на «клиентской» стороне.' },
      { t: 'Маршруты', d: 'IP → Routes → `+`: Dst. Address=`192.168.20.0/24`, Gateway=`wg-tunnel` (имя интерфейса). Симметрично на другой стороне.' },
      { t: 'Firewall', d: 'Разрешите UDP-порт туннеля на input только с адреса партнёра; forward между LAN и wg-интерфейсом — в обе стороны.' },
      { t: 'Если нужен L2', d: 'Вместо маршрутов создайте EoIP-туннель (Interface → EoIP Tunnel) с remote-address партнёра и tunnel-id, добавьте оба конца в bridge. Обязательно зашейте IPsec-политикой между адресами туннелей.' },
      { t: 'Проверка', d: 'С офиса A: `ping 192.168.20.1`, `traceroute`, затем доступ к конкретному сервису (SMB/1С) — именно он и должен работать.' }
    ],
    scenes: [{
      path: 'Interface → WireGuard → Peers', win: 'WireGuard', tabs: ['WireGuard', 'Peers'], tab: 'Peers',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: 'Interface', w: 90 }, { t: 'Public Key', w: 170 }, { t: 'Allowed Address', w: 170 }, { t: 'Endpoint', w: 150 }, { t: 'Keepalive', w: 80 }],
      rows: [
        [{ v: 'wg-site', m: 2 }, 'kQ2v…8hY=', { v: '192.168.20.0/24', m: 3 }, { v: '203.0.113.10:13231', m: 4 }, '25s']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления пира',
        'Интерфейс туннеля, созданный во вкладке WireGuard',
        'Подсеть второй площадки, доступная через этого пира',
        'Публичный адрес и порт второй площадки'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface wireguard peers print\n/ip route print where dst-address~"192.168.20"\n/ping 192.168.20.1 count=4' }],
    warn: 'Если обе площадки за NAT, хотя бы у одной должен быть публичный адрес или проброшенный порт. Два NAT без проброса не соединятся без промежуточного сервера.',
    mistakes: [
      'Одинаковые LAN-подсети в офисах — маршруты не строятся.',
      'Allowed Address не включает LAN партнёра — handshake есть, трафика нет.',
      'Keepalive не задан на стороне за NAT — туннель «засыпает» через 2 минуты.',
      'EoIP добавлен в bridge с STP выключенным — петля и шторм.'
    ]
  });

  /* ---------------- firewall для VPN ---------------- */
  vpn.items.push({
    id: 'vpn-firewall', t: 'Firewall и NAT для VPN: что открывать', lvl: 2,
    path: 'IP → Firewall → Filter / NAT / Mangle', tags: ['firewall', 'nat', 'esp', 'mss', 'vpn'],
    purpose: 'Большинство «VPN не работает» — это firewall и NAT. Нужно открыть только нужные порты, разрешить forward между LAN и VPN, не применять masquerade к туннельному трафику и привести MTU/MSS в порядок.',
    usage: [
      'Проверка после настройки любого VPN: не блокирует ли input-цепочка рукопожатие.',
      'Решение «страницы открываются, а большие файлы — нет» (MSS/MTU).',
      'Несколько VPN на одном роутере — раздельные правила.'
    ],
    table: {
      title: 'Порты и протоколы по типам VPN',
      head: ['VPN', 'Протокол/порт', 'Что открыть в input'],
      rows: [
        ['WireGuard', 'UDP 13231 (или свой)', 'udp dst-port=13231 in-interface=WAN'],
        ['IPsec IKEv2', 'UDP 500, 4500', 'udp dst-port=500,4500 in-interface=WAN'],
        ['L2TP/IPsec', 'UDP 500/4500 + ESP(50)', 'udp 500,4500 + protocol=ipsec-esp'],
        ['SSTP', 'TCP 443', 'tcp dst-port=443 in-interface=WAN'],
        ['OpenVPN', 'TCP/UDP 1194 (или 443)', 'tcp/udp dst-port=1194'],
        ['PPTP', 'TCP 1723 + GRE(47)', 'не открывать: протокол небезопасен']
      ]
    },
    pros: [
      'Точечные правила вместо «разрешить всё» — резко снижают поверхность атаки.',
      'MSS-clamp убирает классическую проблему «маленькое грузится, большое — нет».',
      'Отдельная address-list для VPN-подсетей упрощает поддержку правил.'
    ],
    cons: [
      'Правила надо дублировать для каждого нового VPN-интерфейса.',
      'Ошибка в порядке правил (accept выше drop) сводит защиту к нулю.',
      'MSS-clamp добавляет нагрузку на CPU (но небольшую).'
    ],
    steps: [
      { t: 'Input: разрешите рукопожатие', d: 'IP → Firewall → Filter → `+`, chain=input, protocol=udp, dst-port=13231, in-interface-list=WAN, action=accept. Отдельные правила для 500/4500 и ESP, если используете IPsec.' },
      { t: 'Address list', d: 'IP → Firewall → Address Lists: добавьте `vpn-nets` = 10.99.0.0/24, 10.98.0.0/24 — так проще писать правила.' },
      { t: 'Forward', d: 'Разрешите forward: in-interface=wg-vpn (или src-address-list=vpn-nets) → out-interface=bridge-lan, и симметрично обратно. Только нужные порты, если доступ узкий.' },
      { t: 'NAT', d: 'Если клиенты VPN должны выходить в интернет через офис — masquerade для src-address-list=vpn-nets out-interface=WAN. Между площадками NAT не нужен: он ломает адресацию.' },
      { t: 'MSS/MTU', d: 'IP → Firewall → Mangle → `+`: chain=forward, protocol=tcp, tcp-flags=syn, action=change-mss, new-mss=1360, passthrough=yes. Для PPPoE/WireGuard часто нужен MSS 1380–1400.' },
      { t: 'Проверка', d: 'Счётчики правил в Filter (колонка Bytes) должны расти. Если правило не считает — трафик идёт другим путём.' }
    ],
    scenes: [{
      path: 'IP → Firewall → Filter Rules', win: 'Firewall', tabs: ['Filter Rules', 'NAT', 'Mangle', 'Raw'], tab: 'Filter Rules',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }, { t: '⌕' }],
      cols: [{ t: '#', w: 30 }, { t: 'Chain', w: 80 }, { t: 'Protocol', w: 80 }, { t: 'Dst. Port', w: 86 }, { t: 'In. Interface', w: 110 }, { t: 'Action', w: 90 }],
      rows: [
        ['0', { v: 'input', m: 2 }, { v: 'udp', m: 3 }, { v: '13231', m: 4 }, 'ether1-wan', { v: 'accept', m: 5 }],
        ['1', 'input', 'udp', '500,4500', 'ether1-wan', 'accept'],
        ['2', 'input', 'ipsec-esp', '', 'ether1-wan', 'accept'],
        ['3', 'forward', 'tcp', '', 'wg-vpn', 'accept']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления правила',
        'Цепочка input — трафик к самому роутеру',
        'Протокол туннеля',
        'Порт WireGuard (замените на свой)',
        'Разрешение только для этого порта'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip firewall filter print stats\n/ip firewall mangle print stats\n/ip firewall connection print where dst-port~"13231"' }],
    warn: 'Не ставьте «accept all» в начале input. VPN-порт должен быть единственным открытым исключением, всё остальное — drop в конце цепочки.',
    mistakes: [
      'Правило drop all стоит выше accept для VPN — рукопожатие не проходит.',
      'Masquerade применён и к туннельному трафику — вторая сторона видит один адрес и маршруты ломаются.',
      'Не сделан MSS-clamp — HTTPS открывается, но загрузка файлов зависает.',
      'Открыли порт для всех src, хотя достаточно адресов партнёров.'
    ]
  });

  /* ---------------- split tunnel ---------------- */
  vpn.items.push({
    id: 'vpn-split-tunnel', t: 'Маршруты и DNS для VPN: split или full tunnel', lvl: 2,
    path: 'PPP → Profiles / IP → Routes / IP → DNS', tags: ['vpn', 'маршруты', 'dns', 'split-tunnel'],
    purpose: 'После подключения VPN нужно решить: гнать через туннель весь трафик (full tunnel) или только корпоративные подсети (split tunnel). От этого зависят скорость, нагрузка на канал и то, будет ли работать локальный интернет сотрудника.',
    usage: [
      'Full tunnel — требование безопасности: весь трафик через офис, включая проверку на шлюзе.',
      'Split tunnel — сотрудник смотрит YouTube напрямую, а в офис ходит только по рабочим адресам.',
      'Split DNS — внутренние имена резолвятся офисным DNS, остальные — публичным.'
    ],
    pros: [
      'Split tunnel экономит канал офиса и снижает задержки.',
      'Full tunnel даёт единый контроль и защиту в чужих сетях.',
      'Правильные маршруты убирают «сайты не открываются после подключения VPN».'
    ],
    cons: [
      'Split tunnel требует ручного списка подсетей — новый сервис забудут добавить.',
      'Full tunnel упирается в скорость офисного канала.',
      'Split DNS на разных ОС ведёт себя по-разному, нужен тест на каждом клиенте.'
    ],
    steps: [
      { t: 'Адресация клиентов', d: 'PPP → Profiles → `+`: Local Address=`10.99.0.1`, Remote Address=`10.99.0.100`, DNS Server=`10.99.0.1`. Профиль назначается в secret или в настройках сервера.' },
      { t: 'Маршруты к офису', d: 'IP → Routes: Dst. Address=`192.168.10.0/24`, Gateway=`wg-vpn` (или адрес клиента в PPP). Для PPP-клиентов достаточно push-маршрутов через profile.' },
      { t: 'Full tunnel', d: 'Для PPP-серверов включите в профиле `Change TCP MSS=yes` и задайте Remote Address так, чтобы шлюзом по умолчанию был роутер: клиент получит default route через VPN автоматически.' },
      { t: 'Split tunnel', d: 'На клиенте снимите «использовать шлюз по умолчанию» (Windows) или в конфиге WireGuard укажите Allowed IPs = только офисные подсети.' },
      { t: 'DNS', d: 'IP → DNS: Allow Remote Requests=yes. Клиентам выдавайте 10.99.0.1 через профиль. Внутренние имена — статические записи или зона на внутреннем DNS.' },
      { t: 'Проверка', d: 'С клиента: `tracert 192.168.10.10` идёт через туннель, `tracert 8.8.8.8` — напрямую (split) или через офис (full).' }
    ],
    scenes: [{
      path: 'PPP → Profiles', win: 'PPP Profiles', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: 'Name', w: 130 }, { t: 'Local Address', w: 120 }, { t: 'Remote Address', w: 120 }, { t: 'DNS Server', w: 120 }, { t: 'Change TCP MSS', w: 110 }],
      rows: [
        [{ v: 'vpn-staff', m: 2 }, { v: '10.99.0.1', m: 3 }, { v: '10.99.0.100', m: 4 }, { v: '10.99.0.1', m: 5 }, 'yes']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления профиля',
        'Имя профиля, на него ссылаются secrets и серверы',
        'Адрес роутера внутри VPN — он станет шлюзом',
        'Диапазон адресов, выдаваемых клиентам',
        'DNS, который получит клиент: адрес роутера внутри VPN'
      ]
    }],
    check: [{ d: 'терминал', c: '/ppp profile print detail\n/ip route print where gateway~"wg"\n/ip dns print' }],
    warn: 'Не выдавайте VPN-клиентам адреса из LAN-подсети (192.168.10.0/24): они начнут конфликтовать с настоящими устройствами и ломать ARP.',
    mistakes: [
      'DNS клиентам не выдан — внутренние имена не открываются.',
      'Full tunnel без MSS-clamp — крупные ответы не проходят.',
      'Split tunnel, но маршрут к внутреннему серверу забыт.',
      'Профиль с Local Address, который пересекается с LAN.'
    ]
  });

  /* ---------------- диагностика ---------------- */
  vpn.items.push({
    id: 'vpn-troubleshoot', t: 'Диагностика VPN: где смотреть и что проверять', lvl: 2,
    path: 'Log / Tools → Torch / IP → IPsec → Installed SAs', tags: ['диагностика', 'log', 'vpn', 'netwatch'],
    purpose: 'VPN ломается молча: интерфейс есть, трафика нет. Правильный порядок проверки — от физики к приложению: есть ли пакеты, поднялось ли рукопожатие, согласовались ли параметры, появились ли маршруты, работает ли DNS.',
    usage: [
      '«Подключился, но ничего не открывается».',
      '«Работало, перестало после смены провайдера».',
      'Плановый контроль: логи, счётчики, время жизни SA.'
    ],
    pros: [
      'Единый порядок проверки экономит часы: 5 шагов вместо перебора настроек.',
      'Логи с топиками ipsec/wireguard показывают причину отказа дословно.',
      'Netwatch и Graphing заранее предупреждают о деградации канала.'
    ],
    cons: [
      'Логи по умолчанию не пишутся — нужно включить нужные топики.',
      'В WireGuard нет «состояния туннеля»: только счётчики handshake.',
      'Ошибки IPsec часто означают расхождение конфигов, а не поломку.'
    ],
    steps: [
      { t: 'Счётчики и пакеты', d: 'Interfaces: у wg/ppp-интерфейса растёт Rx/Tx? Если Rx=0 — пакеты не доходят: firewall, NAT провайдера, неверный адрес/порт.' },
      { t: 'Рукопожатие WireGuard', d: 'Interface → WireGuard → Peers: колонка Last Handshake. Пусто или старше 3 минут — ключи/Endpoint неверны.' },
      { t: 'IPsec', d: 'IP → IPsec → Installed SAs: есть ли SA, в каком состоянии. Пусто — смотрите Log с топиком ipsec.' },
      { t: 'Логи', d: 'System → Logging: добавьте топики `ipsec,error`, `wireguard`, `ppp` на действие `memory` или `disk`. Затем Log: ищите `phase1 negotiation failed`, `no matching peer`, `invalid key`.' },
      { t: 'Маршруты и DNS', d: 'IP → Routes: маршрут активен (флаг A)? Пингуется ли адрес роутера на другой стороне? Резолвится ли внутреннее имя (`:resolve`).' },
      { t: 'Точечно трафик', d: 'Tools → Torch на нужном интерфейсе: видно, идут ли пакеты и с какими адресами. Tools → Ping с src-address из туннеля.' }
    ],
    scenes: [{
      path: 'System → Logging', win: 'Logging', tabs: ['Rules', 'Actions'], tab: 'Rules',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: 'Topics', w: 150 }, { t: 'Action', w: 110 }, { t: 'Prefix', w: 120 }, { t: 'Disabled', w: 80 }],
      rows: [
        [{ v: 'ipsec,error', m: 2 }, { v: 'memory', m: 3 }, 'ipsec', 'false'],
        ['wireguard', 'memory', 'wg', 'false'],
        ['ppp', 'disk', '', 'false']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления правила логирования',
        'Топики IPsec — ошибки рукопожатия и политик',
        'Действие: memory (в память) или disk (в файл)'
      ]
    }],
    check: [{ d: 'терминал', c: '/log print where topics~"ipsec"\n/ip ipsec installed-sa print\n/interface wireguard peers print detail\n/tool torch interface=wg-vpn duration=5' }],
    warn: 'Топик `debug` на реальном трафике может забить диск и процессор за минуты. Включайте его только на 10–20 секунд.',
    mistakes: [
      'Смотрят только на «интерфейс поднят» и не проверяют маршруты.',
      'Проверяют доступность по DNS-имени, хотя DNS не работает.',
      'Тестируют с того же роутера, где настроен VPN — трафик идёт не по туннелю.',
      'Не сравнивают конфиги сторон: Proposal/Allowed-IP отличаются.'
    ]
  });

  /* ================= раздел меню WireGuard ================= */
  var wg = {
    id: 'wg', name: 'WireGuard', ic: 'svc',
    items: [
      {
        id: 'wg-interface', t: 'WireGuard → интерфейс и ключи', lvl: 1,
        path: 'Interface → WireGuard', tags: ['wireguard', 'ключи', 'интерфейс'],
        purpose: 'WireGuard-интерфейс — это виртуальный порт со своей парой ключей (приватный/публичный) и списком пиров. Порт прослушивания, адрес и MTU задаются в одном окне; ключи генерируются на роутере автоматически.',
        usage: [
          'Создание основы для VPN-сервера или клиента.',
          'Site-to-site между офисами и облаком.',
          'Резервный канал к роутеру, если основной доступ потерян.'
        ],
        pros: [
          'Ключи можно сгенерировать прямо в Winbox — копировать приватный наружу не нужно.',
          'Нет фаз согласования: туннель «просто работает» после добавления пира.',
          'Один интерфейс держит любое число пиров.'
        ],
        cons: [
          'Нет встроенного DHCP — адреса задаются вручную или через Allowed Address.',
          'Нет понятия «подключён/отключён»: состояние определяется по handshake.',
          'Приватный ключ, попавший в чужие руки, даёт полный доступ без пароля.'
        ],
        steps: [
          { t: 'Создайте интерфейс', d: 'Interface → WireGuard → вкладка WireGuard → `+`: Name=`wg-vpn`, Listen Port=13231, MTU=1420.' },
          { t: 'Адрес интерфейса', d: 'IP → Address → `+`: Address=`10.99.0.1/24`, Interface=`wg-vpn`. Этот адрес станет шлюзом для клиентов.' },
          { t: 'Ключи', d: 'Откройте созданный интерфейс → кнопка Private Key: нажмите «Generate», скопируйте Public Key — он понадобится партнёру.' },
          { t: 'Проверка', d: 'Interface → WireGuard: интерфейс в состоянии running(R), IP → Address показывает адрес.' }
        ],
        scenes: [{
          path: 'Interface → WireGuard', win: 'WireGuard', tabs: ['WireGuard', 'Peers'], tab: 'WireGuard',
          tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
          cols: [{ t: 'Name', w: 140 }, { t: 'Listen Port', w: 110 }, { t: 'MTU', w: 90 }, { t: 'Private Key', w: 150 }, { t: 'Public Key', w: 170 }],
          rows: [
            [{ v: 'wg-vpn', m: 2 }, { v: '13231', m: 3 }, { v: '1420', m: 4 }, '••••••••••••', { v: 'kQ2v…8hY=', m: 5 }]
          ],
          sel: 0,
          notes: [
            'Кнопка создания интерфейса',
            'Имя интерфейса — по нему пишутся маршруты и правила firewall',
            'Порт прослушивания UDP; по умолчанию 13231',
            'MTU 1420 безопасен для большинства каналов (1500 минус заголовки)',
            'Публичный ключ интерфейса — его передают партнёру'
          ]
        }],
        check: [{ d: 'терминал', c: '/interface wireguard print detail\n/ip address print where interface=wg-vpn' }],
        warn: 'Не публикуйте приватный ключ и не пересылайте его в мессенджерах. Партнёру передаётся только публичный ключ.',
        mistakes: [
          'MTU 1500 — крупные пакеты теряются, сайты «полуоткрываются».',
          'Не задан адрес на интерфейсе — туннель есть, маршрутизировать некуда.',
          'Порт занят другим сервисом — интерфейс не поднимается.'
        ]
      },
      {
        id: 'wg-peers', t: 'WireGuard → Peers: кто и куда', lvl: 2,
        path: 'Interface → WireGuard → Peers', tags: ['wireguard', 'peers', 'allowed-address', 'keepalive'],
        purpose: 'Пир — это вторая сторона туннеля: её публичный ключ, разрешённые адреса и, для клиента, Endpoint. Allowed Address работает и как маршрут: пакеты к этим адресам уходят этому пиру, а от него принимаются только с них.',
        usage: [
          'Подключение сотрудника (по одному пиру на устройство).',
          'Соединение с филиалом или облаком.',
          'Разные наборы прав: одним пирам — вся сеть, другим — одна подсеть.'
        ],
        pros: [
          'Всё в одной строке: ключ, адреса, endpoint, keepalive.',
          'Разные Allowed Address дают гибкое разграничение доступа.',
          'Persistent Keepalive решает проблему NAT и «заснувших» туннелей.'
        ],
        cons: [
          'Забыли Allowed Address — handshake проходит, а трафик не ходит.',
          'Один ключ на несколько устройств — не различить, кто подключён.',
          'Без Endpoint пир работает только после входящего пакета.'
        ],
        steps: [
          { t: 'Создайте пира', d: 'Interface → WireGuard → вкладка Peers → `+`: Interface=`wg-vpn`, Public Key=ключ партнёра, Allowed Address=`10.99.0.2/32` (клиент) или `192.168.20.0/24` (филиал).' },
          { t: 'Endpoint', d: 'Для сервера Endpoint оставляют пустым; для клиента — `203.0.113.20:13231`. Если партнёр за NAT, Endpoint на «серверной» стороне не нужен — он появится после первого пакета.' },
          { t: 'Keepalive', d: 'Persistent Keepalive=25s ставится на стороне за NAT, чтобы туннель не «засыпал».' },
          { t: 'Права', d: 'Allowed Address задаёт и маршрут, и маску доступа: `10.99.0.2/32` — только этот адрес, `0.0.0.0/0` — весь трафик через туннель.' },
          { t: 'Проверка', d: 'Peers → колонка Last Handshake обновляется каждые ~2 минуты; `Rx/Tx` растут при трафике.' }
        ],
        scenes: [{
          path: 'Interface → WireGuard → Peers', win: 'WireGuard', tabs: ['WireGuard', 'Peers'], tab: 'Peers',
          tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
          cols: [{ t: 'Interface', w: 90 }, { t: 'Public Key', w: 160 }, { t: 'Allowed Address', w: 150 }, { t: 'Endpoint', w: 150 }, { t: 'Keepalive', w: 80 }, { t: 'Last Handshake', w: 110 }],
          rows: [
            [{ v: 'wg-vpn', m: 2 }, { v: 'pX4r…7bQ=', m: 3 }, { v: '10.99.0.2/32', m: 4 }, { v: '198.51.100.7:51820', m: 5 }, '25s', '12s ago']
          ],
          sel: 0,
          notes: [
            'Кнопка добавления пира',
            'Интерфейс, к которому привязан пир',
            'Публичный ключ партнёра (не приватный!)',
            'Адрес клиента внутри туннеля',
            'Endpoint — публичный адрес и порт партнёра'
          ]
        }],
        check: [{ d: 'терминал', c: '/interface wireguard peers print detail\n/interface wireguard peers print stats' }],
        warn: 'Никогда не выдавайте двум устройствам один ключ: отозвать доступ одному, не сломав второе, будет невозможно.',
        mistakes: [
          'В Allowed Address указан LAN партнёра, но не адрес самого туннеля.',
          'Endpoint задан с портом сервера, а не клиента (и наоборот).',
          'Keepalive включён на обеих сторонах — лишний трафик, но не ошибка.',
          'Пир отключён (Disabled), а firewall-правило осталось открытым.'
        ]
      },
      {
        id: 'wg-server', t: 'WireGuard-сервер для сотрудников за 10 минут', lvl: 2,
        path: 'Interface → WireGuard + PPP / IP → Firewall', tags: ['wireguard', 'сервер', 'road-warrior'],
        purpose: 'Самый быстрый способ дать сотрудникам доступ в офис: один WireGuard-интерфейс на роутере, по пиру на устройство, masquerade для выхода в интернет и правила firewall. Никаких PPP-профилей и сертификатов.',
        usage: [
          'Удалённая работа с офисными сервисами (1С, файлы, камеры).',
          'Администрирование роутеров через туннель вместо открытого Winbox.',
          'Резервный доступ, если основной канал или IP «упал».'
        ],
        pros: [
          'Настройка одного устройства — 2 минуты, конфиг переносится QR-кодом.',
          'Работает на слабом железе, держит десятки клиентов.',
          'Переживает смену IP клиента — NAT traversal встроен.'
        ],
        cons: [
          'Нет встроенной выдачи адресов: каждому пиру — свой Allowed Address.',
          'Нет учётных записей и паролей: доступ = наличие ключа.',
          'Отзыв доступа = удалить пир, иначе ключ продолжит работать.'
        ],
        steps: [
          { t: 'Интерфейс', d: 'Interface → WireGuard → `+`: Name=`wg-vpn`, Listen Port=13231.' },
          { t: 'Адрес', d: 'IP → Address → `+`: `10.99.0.1/24` на wg-vpn.' },
          { t: 'Пир сотрудника', d: 'Peers → `+`: Public Key клиента, Allowed Address=`10.99.0.2/32`. Ключ клиента удобно сгенерировать в приложении WireGuard на телефоне и скопировать.' },
          { t: 'Выход в интернет', d: 'IP → Firewall → NAT: chain=srcnat, src-address=`10.99.0.0/24`, out-interface=WAN, action=masquerade (если нужен full tunnel).' },
          { t: 'Firewall', d: 'input: udp 13231 accept; forward: in-interface=wg-vpn accept (или только нужные порты и адреса).' },
          { t: 'Раздача конфигов', d: 'Клиенту нужны: его приватный ключ, публичный ключ сервера, Endpoint=`ваш-ip:13231`, Allowed IPs=`10.99.0.0/24` (split) или `0.0.0.0/0` (full).' }
        ],
        scenes: [{
          path: 'IP → Firewall → NAT', win: 'Firewall', tabs: ['Filter Rules', 'NAT', 'Mangle'], tab: 'NAT',
          tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
          cols: [{ t: '#', w: 30 }, { t: 'Chain', w: 80 }, { t: 'Src. Address', w: 130 }, { t: 'Out. Interface', w: 120 }, { t: 'Action', w: 100 }],
          rows: [
            ['0', { v: 'srcnat', m: 2 }, { v: '10.99.0.0/24', m: 3 }, { v: 'ether1-wan', m: 4 }, { v: 'masquerade', m: 5 }],
            ['1', 'srcnat', '192.168.10.0/24', 'ether1-wan', 'masquerade']
          ],
          sel: 0,
          notes: [
            'Кнопка добавления правила NAT',
            'Цепочка srcnat — подмена адреса источника',
            'Подсеть VPN-клиентов',
            'Интерфейс провайдера',
            'Masquerade даёт клиентам выход в интернет через офис'
          ]
        }],
        check: [{ d: 'терминал', c: '/interface wireguard peers print\n/ip firewall nat print stats\n/ip route print where dst-address~"10.99"' }],
        warn: 'Не открывайте Winbox/SSH «наружу» вместо VPN. WireGuard-порт открывается одним UDP-правилом и не отвечает сканерам.',
        mistakes: [
          'Забыт masquerade — клиент видит офис, но не интернет.',
          'Allowed Address клиента `0.0.0.0/0` на сервере — сервер отправит весь трафик этому пиру.',
          'Порт отличается в интерфейсе и в конфиге клиента.',
          'Не добавлен forward-accept — пинг до роутера идёт, дальше нет.'
        ]
      },
      {
        id: 'wg-client-config', t: 'WireGuard-конфиг для телефона и ноутбука (QR)', lvl: 1,
        path: 'Interface → WireGuard → Peers → Show Client Config', tags: ['wireguard', 'qr', 'клиент', 'конфиг'],
        purpose: 'Winbox 4 умеет экспортировать готовый клиентский конфиг (и QR-код) прямо из окна пира. Это исключает опечатки в ключах и адресах — телефон подключается сканированием кода.',
        usage: [
          'Выдать доступ сотруднику за минуту.',
          'Подключить телефон/планшет без ручного ввода ключей.',
          'Восстановить конфиг на новом устройстве.'
        ],
        pros: [
          'Никаких опечаток: ключи и адреса копируются автоматически.',
          'QR-код удобно отправить в защищённый чат или показать лично.',
          'Конфиг сразу содержит Endpoint и Allowed IPs.'
        ],
        cons: [
          'Экспорт возможен только если у пира есть приватный ключ на роутере (сгенерирован здесь).',
          'Конфиг — секрет: попав в чужой чат, он даёт доступ.',
          'QR-код со экрана легко сфотографировать постороннему.'
        ],
        steps: [
          { t: 'Сгенерированный пир', d: 'Пары ключей клиента удобно создавать на роутере: Peers → `+` → кнопка Generate рядом с Private Key.' },
          { t: 'Экспорт', d: 'Откройте пир → кнопка «Show Client Config» (или Client Config в меню окна). Winbox покажет готовый текст и QR.' },
          { t: 'Раздача', d: 'В приложении WireGuard: «Импорт из файла/QR» → отсканируйте код. В Windows: «Импорт туннеля из файла» → вставьте текст `.conf`.' },
          { t: 'Проверка', d: 'На роутере: Peers → Last Handshake обновился, счётчик Rx/Tx растёт; в приложении виден обмен данными.' }
        ],
        scenes: [{
          path: 'Interface → WireGuard → Peers', win: 'Peer', tabs: ['General', 'Client Config'], tab: 'Client Config', noTools: true,
          form: {
            title: 'wg-client-phone', buttons: ['Close'],
            fields: [
              { l: 'Client Address', v: '10.99.0.2/32', m: 1 },
              { l: 'DNS Server', v: '10.99.0.1', m: 2 },
              { l: 'Allowed IPs', v: '10.99.0.0/24', m: 3 },
              { l: 'Endpoint', v: 'vpn.example.com:13231', m: 4 },
              { l: 'Persistent Keepalive', v: '25', type: 'select' }
            ],
            note: 'Кнопка «Show QR» выводит код для приложения WireGuard на телефоне'
          },
          notes: [
            'Адрес устройства внутри туннеля',
            'DNS, который получит клиент (адрес роутера в VPN)',
            'Какие сети пойдут через туннель',
            'Публичный адрес и порт сервера'
          ]
        }],
        check: [{ d: 'терминал', c: '/interface wireguard peers print detail\n/interface wireguard peers print stats where interface=wg-vpn' }],
        warn: 'После показа QR-кода обязательно проверьте, кто находится рядом. При утечке — удалите пир и выдайте новый ключ.',
        mistakes: [
          'В Allowed IPs клиента указан только адрес сервера, а не подсеть — офисные адреса не откроются.',
          'Endpoint задан локальным адресом (192.168…), который из интернета недоступен.',
          'Пир создан без приватного ключа на роутере — экспорт конфига недоступен.'
        ]
      },
      {
        id: 'wg-site', t: 'WireGuard между офисами: маршруты и firewall', lvl: 3,
        path: 'Interface → WireGuard + IP → Routes', tags: ['wireguard', 'site-to-site', 'маршруты'],
        purpose: 'Для связи двух площадок через WireGuard нужны три вещи: пир с Allowed Address партнёрской подсети, статический маршрут на этот туннель и разрешение forward. Адреса туннеля (10.99.0.1/30) — это транспорт, а LAN-подсети маршрутизируются поверх.',
        usage: [
          'Офис ↔ офис, офис ↔ облако, офис ↔ дата-центр.',
          'Резервный путь для основного IPsec-канала.',
          'Соединение с чужим MikroTik, где нет доверия IPsec-конфигу.'
        ],
        pros: [
          'Маршрутизация L3: широковещательный мусор не проходит между площадками.',
          'Туннель настраивается с двух сторон за 10 минут.',
          'Легко добавить третью площадку (hub-and-spoke или mesh).'
        ],
        cons: [
          'Нужно вручную прописывать маршруты к каждой подсети.',
          'Нет автоматического обнаружения подсетей: новая сеть — новый маршрут.',
          'При пересечении подсетей схема не заработает без NAT между площадками.'
        ],
        steps: [
          { t: 'Транспортные адреса', d: 'Сторона A: `10.99.0.1/30` на wg-site. Сторона B: `10.99.0.2/30`. Эти адреса — только для туннеля.' },
          { t: 'Пиры', d: 'A: Public Key B, Allowed Address=`10.99.0.2/32, 192.168.20.0/24`, Endpoint=`203.0.113.10:13231`. B: зеркально, Allowed Address=`10.99.0.1/32, 192.168.10.0/24`.' },
          { t: 'Маршруты', d: 'IP → Routes: A: Dst. Address=`192.168.20.0/24`, Gateway=`wg-site`. B: Dst. Address=`192.168.10.0/24`, Gateway=`wg-site`.' },
          { t: 'Firewall', d: 'input: udp 13231 accept (можно ограничить src-address партнёра). forward: accept между bridge-lan и wg-site в обе стороны.' },
          { t: 'NAT', d: 'Между площадками NAT не нужен и вреден. Masquerade применяйте только к выходу в интернет.' },
          { t: 'Проверка', d: 'С ПК офиса A: `ping 192.168.20.10`, `tracert` должен идти через 10.99.0.2.' }
        ],
        scenes: [{
          path: 'IP → Routes', win: 'Route List', tabs: ['Routes', 'Nexthops'], tab: 'Routes',
          tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
          cols: [{ t: 'A', w: 32 }, { t: 'Dst. Address', w: 150 }, { t: 'Gateway', w: 130 }, { t: 'Distance', w: 80 }, { t: 'Comment', w: 160 }],
          rows: [
            [{ v: 'AS', c: 'ok' }, { v: '192.168.20.0/24', m: 2 }, { v: 'wg-site', m: 3 }, { v: '1', m: 4 }, 'филиал B']
          ],
          sel: 0,
          notes: [
            'Кнопка добавления маршрута',
            'Подсеть второй площадки',
            'Шлюз — имя WireGuard-интерфейса',
            'Distance 1; резервный канал можно сделать с Distance 10'
          ]
        }],
        check: [{ d: 'терминал', c: '/ip route print where gateway~"wg"\n/interface wireguard peers print\n/ping 192.168.20.1 src-address=192.168.10.1' }],
        warn: 'Если подсети площадок пересекаются, маршрут «в филиал» будет указывать на локальную сеть. Планируйте адресацию до развёртывания.',
        mistakes: [
          'Маршрут есть, но forward запрещён — пинг с роутера идёт, с ПК нет.',
          'Allowed Address не включает LAN партнёра — handshake есть, трафик отбрасывается.',
          'Обе стороны используют один и тот же транспортный /30 адрес.',
          'Masquerade к туннельному трафику — партнёр видит один адрес и не может ответить нужному хосту.'
        ]
      },
      {
        id: 'wg-troubleshoot', t: 'WireGuard не поднимается: 7 причин', lvl: 2,
        path: 'Interface → WireGuard → Peers / Tools → Torch', tags: ['wireguard', 'диагностика', 'handshake'],
        purpose: 'WireGuard молча отбрасывает некорректные пакеты — сообщений об ошибке нет. Диагностика строится на трёх показателях: есть ли Last Handshake, растут ли Rx/Tx и доходят ли пакеты до порта.',
        usage: [
          'Туннель «есть», но трафика нет.',
          'Подключается с телефона, но не с ноутбука.',
          'После смены провайдера/роутера перестал работать доступ.'
        ],
        pros: [
          'Handshake в интерфейсе сразу показывает, дошёл ли пакет до партнёра.',
          'Torch и firewall-счётчики точно указывают, где теряется трафик.',
          'Проблема почти всегда в ключах, порту или Allowed Address — три проверки.'
        ],
        cons: [
          'Нет логов с причиной отказа — только косвенные признаки.',
          'Ошибку в криптоключе невозможно увидеть «глазами», только сравнением.',
          'NAT провайдера может менять порт, и Endpoint придётся уточнять.'
        ],
        steps: [
          { t: 'Handshake пустой', d: 'Пакеты не доходят или ключ неверный. Проверьте: публичный ключ на одной стороне = приватному на другой; порт в Listen Port и в Endpoint совпадает.' },
          { t: 'Handshake есть, трафика нет', d: 'Проблема в Allowed Address: на приёмной стороне должен быть указан адрес/подсеть отправителя, иначе пакеты отбрасываются.' },
          { t: 'Порт закрыт', d: 'Torch на WAN: приходят ли udp на 13231? Если нет — firewall input или NAT провайдера. Проверьте правило и его счётчик.' },
          { t: 'MTU', d: 'Пинг проходит, HTTPS «висит» — уменьшите MTU интерфейса до 1380 или включите MSS-clamp в mangle.' },
          { t: 'Один ключ на двух устройствах', d: 'Handshake «прыгает» между ними, трафик рвётся. Каждому устройству — своя пара ключей.' },
          { t: 'Смена IP', d: 'Endpoint с доменным именем обновится сам; со статическим IP — задайте новый в пире.' },
          { t: 'Проверка с другой сети', d: 'Попробуйте с мобильного интернета: если работает — проблема в сети клиента (фильтрация UDP).' }
        ],
        scenes: [{
          path: 'Interface → WireGuard → Peers', win: 'WireGuard', tabs: ['WireGuard', 'Peers'], tab: 'Peers', noTools: true,
          cols: [{ t: 'Public Key', w: 160 }, { t: 'Allowed Address', w: 180 }, { t: 'Endpoint', w: 150 }, { t: 'Rx', w: 90 }, { t: 'Tx', w: 90 }, { t: 'Last Handshake', w: 120 }],
          rows: [
            [{ v: 'pX4r…7bQ=', m: 1 }, { v: '10.99.0.2/32', m: 2 }, { v: '198.51.100.7:51820', m: 3 }, '1.2 MiB', '3.4 MiB', { v: '18s ago', m: 4 }]
          ],
          sel: 0,
          notes: [
            'Публичный ключ партнёра должен совпадать с его приватным',
            'Allowed Address: и адрес в туннеле, и подсеть за пиром',
            'Endpoint — публичный адрес; у сервера он может быть пустым',
            'Last Handshake обновляется каждые ~2 минуты'
          ]
        }],
        check: [{ d: 'терминал', c: '/interface wireguard peers print stats\n/tool torch interface=ether1-wan port=any\n/log print where topics~"wireguard"' }],
        warn: 'Если Last Handshake есть, но Rx=0 — трафик отбрасывает firewall или Allowed Address. Не начинайте с переустановки ключей.',
        mistakes: [
          'Проверяют «пинг до 8.8.8.8» вместо адреса внутри туннеля.',
          'Оставляют MTU 1500 и ищут проблему в DNS.',
          'Меняют конфиг сразу с двух сторон — не понимают, что помогло.',
          'Открывают порт в input, но забывают forward.'
        ]
      }
    ]
  };

  var at = -1;
  for (var i = 0; i < D.length; i++) if (D[i].id === 'vpn') { at = i; break; }
  if (at >= 0) D.splice(at + 1, 0, wg);
  else D.push(wg);
})();
