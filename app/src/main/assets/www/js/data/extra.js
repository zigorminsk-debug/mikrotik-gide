/* Дополнение разделов «Старт», «Интерфейсы», «Switch», «IP», «IPv6», «Routing». */
(function () {
  'use strict';
  var D = window.DATA || [];
  function group(id) {
    for (var i = 0; i < D.length; i++) if (D[i].id === id) return D[i];
    return null;
  }
  var start = group('start'), iface = group('iface'), sw = group('switch'),
    ip = group('ip'), ipv6 = group('ipv6'), rt = group('routing');
  if (!start || !iface || !sw || !ip || !ipv6 || !rt) return;

  /* ---------------- Старт ---------------- */
  start.items.push({
    id: 'start-passwords', t: 'Пароли и первичная защита роутера', lvl: 1,
    path: 'System → Users / IP → Services', tags: ['безопасность', 'пароли', 'users'],
    purpose: 'Свежий роутер без пароля — открытая дверь: админ по умолчанию admin без пароля, Winbox и WebFig слушают все интерфейсы. Правильный первый шаг после сброса — закрыть доступ и поставить сильные пароли.',
    usage: [
      'Первичная настройка нового роутера до подключения к интернету.',
      'Аудит: проверка, не остались ли учётки с пустым паролем.',
      'Подготовка роутера к работе в чужой сети (гость, подрядчик).'
    ],
    pros: [
      'Отключение лишних сервисов убирает 90 % атак «на удачу».',
      'Отдельная учётка для мониторинга без права записи.',
      'Привязка входа к адресам сети — защита даже при утечке пароля.'
    ],
    cons: [
      'Слишком строгие ограничения доступа мешают восстановлению.',
      'Забытый пароль администратора = сброс и потеря конфига.',
      'Ограничение по адресам мешает, если сеть админского ПК поменялась.'
    ],
    steps: [
      { t: 'Задайте пароль admin', d: 'System → Users → выберите admin → Password: длинный пароль, сохраните в менеджере секретов.' },
      { t: 'Отдельные учётки', d: 'System → Users → `+`: Name=`monitor`, Group=`read`, Allowed Address=`192.168.10.0/24`.' },
      { t: 'Закройте сервисы', d: 'IP → Services: winbox, www, ssh — Available From=`192.168.10.0/24`; telnet, ftp, api, api-ssl — Disabled.' },
      { t: 'Отключите discovery наружу', d: 'IP → Neighbor Discovery: discovery-interface=bridge-lan (только LAN).' },
      { t: 'Проверка', d: 'С внешнего адреса порт 8291/80/22 не отвечает; `/user print` показывает учётки и группы.' }
    ],
    scenes: [{
      path: 'IP → Services', win: 'IP Services', tabs: ['Services'], tab: 'Services', noTools: true,
      cols: [{ t: 'Name', w: 110 }, { t: 'Port', w: 80 }, { t: 'Available From', w: 170 }, { t: 'Disabled', w: 90 }],
      rows: [
        [{ v: 'winbox', m: 1 }, { v: '8291', m: 2 }, { v: '192.168.10.0/24', m: 3 }, 'false'],
        ['www', '80', '192.168.10.0/24', 'false'],
        ['telnet', '23', '', 'true'],
        ['ftp', '21', '', 'true']
      ],
      sel: 0,
      notes: [
        'Сервис Winbox — основной доступ администратора',
        'Порт 8291 по умолчанию',
        'Доступ разрешён только из локальной сети'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip service print\n/user print detail\n/ip neighbor discovery-settings print' }],
    danger: 'Если роутер уже стоял в интернете с пустым паролем или открытым Winbox — считайте его скомпрометированным: проверьте System → Scheduler, Scripts, Users на посторонние записи.',
    mistakes: [
      'Оставили пароль admin пустым «пока настраиваю».',
      'Закрыли www, но оставили api и ftp.',
      'Один пароль на все устройства сети.',
      'Не ограничили доступ по адресам в публичных сетях.'
    ]
  });

  start.items.push({
    id: 'start-remote-access', t: 'Удалённый доступ к роутеру без открытия Winbox в интернет', lvl: 2,
    path: 'VPN + IP → Services', tags: ['удалённый доступ', 'vpn', 'безопасность'],
    purpose: 'Открывать Winbox/SSH «наружу» — плохая практика: сканеры находят порт 8291 за минуты, а брутфорс не прекращается никогда. Правильный путь — туннель или временный доступ с ограничением по адресу.',
    usage: [
      'Администрирование роутера из дома.',
      'Помощь клиенту, когда физического доступа нет.',
      'Резервный канал на случай потери основного.'
    ],
    pros: [
      'VPN-доступ не виден сканерам и не поддаётся брутфорсу.',
      'Один туннель закрывает сразу Winbox, WebFig, SSH, API.',
      'Можно выдать доступ подрядчику и отключить его одной командой.'
    ],
    cons: [
      'Нужно сначала настроить VPN — это лишний шаг.',
      'Если VPN упал, доступа нет (нужен второй путь).',
      'Пользователь VPN получает доступ ко всей сети, если не ограничить firewall.'
    ],
    steps: [
      { t: 'Поднимите WireGuard', d: 'Interfaces → WireGuard → `+` (порт 13231), адрес 10.99.0.1/24, пир для своего устройства.' },
      { t: 'Ограничьте сервисы LAN', d: 'IP → Services: winbox/ssh Available From=`192.168.10.0/24,10.99.0.0/24`.' },
      { t: 'Закройте порты', d: 'IP → Firewall → Filter: в конце input — drop для всего, кроме установленных соединений и VPN-порта.' },
      { t: 'Временный доступ', d: 'Если VPN невозможен: создайте address-list `admin-temp` с адресом подрядчика и правило accept tcp/8291 только для него, с таймаутом в комментарии и датой отключения.' },
      { t: 'Проверка', d: 'Сканирование снаружи (например, через внешний сервис) не находит 8291/22/80; подключение по VPN работает.' }
    ],
    scenes: [{
      path: 'IP → Services', win: 'IP Services', tabs: ['Services'], tab: 'Services', noTools: true,
      cols: [{ t: 'Name', w: 110 }, { t: 'Port', w: 80 }, { t: 'Available From', w: 230 }, { t: 'Disabled', w: 90 }],
      rows: [
        [{ v: 'winbox', m: 1 }, '8291', { v: '192.168.10.0/24,10.99.0.0/24', m: 2 }, 'false'],
        ['ssh', '22', '192.168.10.0/24,10.99.0.0/24', 'false'],
        ['www', '80', '192.168.10.0/24', 'false']
      ],
      sel: 0,
      notes: [
        'Winbox доступен только из локальной сети и из VPN',
        'Список разрешённых сетей через запятую'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip service print\n/ip firewall filter print stats\n/interface wireguard peers print' }],
    warn: 'Не оставляйте «временный» доступ навсегда: заведите напоминание и удаляйте правило и учётку после работ.',
    mistakes: [
      'Открыли 8291 на весь интернет «на пять минут», а забыли закрыть.',
      'Сменили порт Winbox и считают это защитой — сканеры перебирают порты.',
      'Выдали VPN-доступ без ограничения firewall — подрядчик видит всю сеть.',
      'Нет резервного пути доступа при падении VPN.'
    ]
  });

  /* ---------------- Интерфейсы ---------------- */
  iface.items.push({
    id: 'if-lte', t: 'LTE-интерфейс: резервный канал и внешний IP', lvl: 2,
    path: 'Interfaces → LTE', tags: ['lte', 'резерв', 'wan', 'модем', 'apn'],
    purpose: 'LTE-интерфейс RouterOS поднимает модем (встроенный или USB) и даёт резервный канал. Часто это единственный способ быстро восстановить связь, когда проводной провайдер недоступен.',
    usage: [
      'Резервный WAN с автоматическим переключением при падении основного.',
      'Роутер на объекте без проводного интернета.',
      'Резервный доступ к оборудованию, если основной канал упал.'
    ],
    pros: [
      'Полностью автономный резерв, не зависит от кабеля.',
      'Переключение занимает секунды при правильных маршрутах.',
      'Работает с большинством USB-модемов без драйверов.'
    ],
    cons: [
      'Мобильный интернет обычно за NAT: проброса портов нет, нужен VPN наружу.',
      'Трафик лимитирован — нельзя пускать через резерв весь офис.',
      'Задержки и потери выше, чем у провода.'
    ],
    steps: [
      { t: 'Вставьте модем', d: 'Interfaces → LTE: интерфейс `lte1` появляется автоматически (для USB-модема нужен System → Ports/реестр или PPP-клиент).' },
      { t: 'Профиль APN', d: 'Interfaces → LTE → вкладка LTE: APN по данным оператора (например `internet`), PIN при необходимости, Network Mode=auto.' },
      { t: 'Маршрут', d: 'IP → Routes: `0.0.0.0/0` через `lte1` с Distance=20 (основной — 1). Add Default Route в LTE-интерфейсе лучше выключить, чтобы не перебивать основной.' },
      { t: 'Watchdog', d: 'Вкладка LTE/Apartment: включите проверку соединения (Ping/APN), чтобы модем переподнимался при зависании.' },
      { t: 'NAT и firewall', d: 'NAT: masquerade for out-interface=lte1. Firewall: разрешите forward только нужным адресам (админ, касса), остальное — drop, чтобы не жечь трафик.' }
    ],
    scenes: [{
      path: 'Interfaces → LTE', win: 'LTE', tabs: ['General', 'LTE', 'Traffic'], tab: 'General', noTools: true,
      cols: [{ t: 'Name', w: 90 }, { t: 'MTU', w: 80 }, { t: 'APN', w: 130 }, { t: 'Status', w: 120 }, { t: 'Disabled', w: 80 }],
      rows: [
        [{ v: 'lte1', m: 1 }, { v: '1500' }, { v: 'internet', m: 2 }, { v: 'connected', m: 3 }, 'false']
      ],
      sel: 0,
      notes: [
        'Автоматически появившийся LTE-интерфейс',
        'APN оператора — без него нет подключения',
        'Состояние канала: connected / searching'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface lte print detail\n/ip route print where gateway~"lte"\n/interface lte monitor lte1 once' }],
    warn: 'Проверьте тариф: при переключении на LTE весь трафик пойдёт через мобильный канал. Ограничьте forward заранее — иначе за день можно выжечь пакет.',
    mistakes: [
      'Два маршрута по умолчанию с одинаковой Distance — трафик «прыгает».',
      'Через резерв пущен весь офис — счёт за трафик.',
      'Не задан APN — интерфейс не поднимается.',
      'Не учли, что из-за NAT снаружи нельзя подключиться напрямую.'
    ]
  });

  iface.items.push({
    id: 'if-lists', t: 'Interface Lists — порядок в правилах firewall', lvl: 1,
    path: 'Interfaces → Interface List', tags: ['interface-list', 'firewall', 'lan', 'wan'],
    purpose: 'Interface List группирует порты по роли (LAN, WAN, VPN). Правила пишутся по списку, а не по каждому порту — при замене или добавлении интерфейса достаточно поправить один список.',
    usage: [
      'Разделение LAN/WAN для правил firewall и NAT.',
      'Отдельный список для VPN-интерфейсов.',
      'Гостевой список с урезанными правилами.'
    ],
    pros: [
      'Правило по списку не нужно дублировать для каждого порта.',
      'Легко добавить новый VLAN или туннель в существующую политику.',
      'Меньше шансов забыть порт и открыть лишнее.'
    ],
    cons: [
      'Неверная привязка списка ломает сразу всю политику.',
      'Списки не видны в правилах как отдельная сущность — нужен опыт.',
      'Динамические интерфейсы (PPP) требуют отдельного внимания.'
    ],
    steps: [
      { t: 'Создайте списки', d: 'Interfaces → Interface List → `+`: List=`LAN`, Interface=`bridge-lan`; второй: List=`WAN`, Interface=`ether1-wan`.' },
      { t: 'Добавьте VPN', d: 'Отдельно: List=`VPN`, Interface=`wg-vpn` (и другие туннели).' },
      { t: 'Используйте в правилах', d: 'IP → Firewall: in-interface-list=`WAN` для защиты, out-interface-list=`WAN` для NAT, in-interface-list=`LAN` для разрешений.' },
      { t: 'Проверка', d: '`/interface list print`, `/interface list member print`. Правила со списками должны увеличивать счётчики.' }
    ],
    scenes: [{
      path: 'Interfaces → Interface List', win: 'Interface List', tabs: ['Interface List', 'Members'], tab: 'Members', noTools: true,
      cols: [{ t: 'List', w: 100 }, { t: 'Interface', w: 160 }, { t: 'Dynamic', w: 90 }, { t: 'Disabled', w: 90 }],
      rows: [
        [{ v: 'LAN', m: 1 }, { v: 'bridge-lan', m: 2 }, 'false', 'false'],
        ['WAN', 'ether1-wan', 'false', 'false'],
        ['VPN', 'wg-vpn', 'false', 'false']
      ],
      sel: 0,
      notes: [
        'Имя списка используется в правилах firewall',
        'Интерфейс, включённый в список'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface list print\n/interface list member print\n/ip firewall filter print stats' }],
    warn: 'Не добавляйте WAN-порт в список LAN «чтобы заработало»: это открывает локальную сеть в интернет.',
    mistakes: [
      'Интерфейс добавлен в два списка одновременно.',
      'Правило ссылается на список, которого нет.',
      'Новый VLAN не добавлен в LAN — устройство без доступа.'
    ]
  });

  /* ---------------- Switch ---------------- */
  sw.items.push({
    id: 'sw-hw-offload', t: 'Аппаратный оффлоад и fast-path', lvl: 3,
    path: 'Bridge → Settings / Switch', tags: ['hw-offload', 'fast-path', 'производительность'],
    purpose: 'Без аппаратного ускорения весь трафик между портами проходит через CPU. На моделях с коммутатором можно включить HW Offload и fast-path — тогда пересылка идёт на чипе, а процессор занимается firewall и NAT.',
    usage: [
      'Гигабитные сети, где CPU упирается в 300–500 Мбит.',
      'Проверка, почему скорость между портами ниже ожидаемой.',
      'Оптимизация перед установкой сложных правил firewall.'
    ],
    pros: [
      'Скорость между портами растёт до линейной.',
      'Снижается загрузка CPU и нагрев.',
      'NAT по fast-path работает почти без потерь.'
    ],
    cons: [
      'Часть функций (mangle, queue tree, hotspot, VRF) отключает fast-path.',
      'На некоторых моделях offload требует определённой схемы портов.',
      'Диагностика сложнее: счётчики по правилам могут не расти.'
    ],
    steps: [
      { t: 'Проверьте поддержку', d: 'Bridge → Ports: в колонке Hw. Offload должно быть yes у портов коммутатора.' },
      { t: 'Включите в бридже', d: 'Bridge → Settings: Hardware Offload=yes, Fast Forward=yes (если доступно).' },
      { t: 'Проверьте загрузку', d: 'System → Resources: CPU Load при копировании между портами LAN должен оставаться низким.' },
      { t: 'Тест скорости', d: 'Tools → Bandwidth Test между двумя ПК или iperf3 между устройствами.' },
      { t: 'Что отключает', d: 'Если используется mangle/queue tree/hotspot — offload для этого трафика отключается автоматически, ожидайте падение скорости.' }
    ],
    scenes: [{
      path: 'Bridge → Settings', win: 'Bridge', tabs: ['General', 'VLAN', 'STP'], tab: 'General', noTools: true,
      form: {
        title: 'Bridge Settings', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Hardware Offload', v: 'yes', type: 'select', m: 1 },
          { l: 'Fast Forward', v: 'yes', type: 'select', m: 2 },
          { l: 'STP', v: 'none' },
          { l: 'MTU', v: '1500' }
        ],
        note: 'HW Offload работает только для портов коммутатора, не для VLAN поверх программного моста'
      },
      notes: [
        'Аппаратная пересылка между портами',
        'Fast Forward — ускоренный путь для уже установленных соединений'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface bridge print detail\n/interface bridge port print detail\n/system resource print' }],
    warn: 'После включения offload счётчики правил firewall могут перестать расти — трафик идёт мимо CPU. Не считайте это ошибкой.',
    mistakes: [
      'Ждут линейной скорости при включённом queue tree.',
      'Включили offload на портах разных чипов — эффекта нет.',
      'Не проверили CPU Load до и после — «не помогло» без измерений.'
    ]
  });

  sw.items.push({
    id: 'sw-storm', t: 'Защита от петель и широковещательных штормов', lvl: 2,
    path: 'Bridge → STP / Switch → Rules', tags: ['stp', 'петля', 'broadcast', 'шторм'],
    purpose: 'Один случайно замкнутый кабель в офисе валит всю сеть: широковещательные пакеты ходят по кругу, CPU загружен на 100 %. Спасают STP/RSTP, storm control и BPDU guard на портах доступа.',
    usage: [
      'Офис с розетками, куда сотрудники включают свои свитчи.',
      'Гостевой Wi-Fi с точками доступа в мосту.',
      'Проверка после «сеть легла, перезагрузили — заработало».'
    ],
    pros: [
      'RSTP сходится за секунды и режет петли автоматически.',
      'Storm control ограничивает broadcast/multicast на порту.',
      'BPDU guard отключает порт, если в него включили чужой свитч.'
    ],
    cons: [
      'STP не защищает от петель на неуправляемых свитчах за портом.',
      'Слишком жёсткий storm-limit режет нормальный трафик.',
      'Диагностика требует понимания топологии.'
    ],
    steps: [
      { t: 'Включите RSTP', d: 'Bridge → Settings: Protocol Mode=`rstp` (или mstp для нескольких VLAN).' },
      { t: 'Приоритеты', d: 'Bridge → Settings: Priority=4096 на основном коммутаторе, выше — на резервном.' },
      { t: 'Порты доступа', d: 'Bridge → Ports: Edge=`yes` для портов к ПК, BPDU Guard=`yes`.' },
      { t: 'Storm control', d: 'Switch → Rules (или Bridge → Ports → Storm Control): ограничьте broadcast/multicast на портах пользователей.' },
      { t: 'Проверка', d: '`/interface bridge monitor 0`, `/interface bridge port print` — состояние forwarding/discarding, счётчики BPDU.' }
    ],
    scenes: [{
      path: 'Bridge → Ports', win: 'Bridge Ports', tabs: ['General', 'STP', 'VLAN'], tab: 'STP',
      tools: [{ t: '✓', id: 'en' }, { t: '✕' }],
      cols: [{ t: 'Interface', w: 110 }, { t: 'Bridge', w: 110 }, { t: 'Edge', w: 80 }, { t: 'BPDU Guard', w: 100 }, { t: 'Role', w: 100 }],
      rows: [
        [{ v: 'ether3', m: 1 }, { v: 'bridge-lan' }, { v: 'yes', m: 2 }, { v: 'yes', m: 3 }, 'designated']
      ],
      sel: 0,
      notes: [
        'Порт, куда подключён пользователь',
        'Edge=yes — порт оконечного устройства',
        'BPDU Guard отключит порт, если придёт BPDU'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface bridge monitor [find]\n/interface bridge port print detail\n/log print where topics~"stp"' }],
    danger: 'Не включайте STP на портах, которые смотрят в сторону провайдера, без согласования: можно получить петлю между сетями разных организаций.',
    mistakes: [
      'STP выключен, потому что «мешал» — сеть падает от одного кабеля.',
      'Edge=yes на магистральном порту — STP не сходится.',
      'Storm control на 1 % — режет нормальный трафик.'
    ]
  });

  /* ---------------- IP ---------------- */
  ip.items.push({
    id: 'ip-arp-modes', t: 'IP → ARP: режимы и защита от подмены', lvl: 2,
    path: 'IP → ARP', tags: ['arp', 'безопасность', 'proxy-arp'],
    purpose: 'ARP-таблица связывает IP и MAC. Режимы ARP (enabled, reply-only, proxy-arp, disabled) решают задачи: защита от подмены шлюза, работа с PPPoE, публичные подсети. Неверный режим — классическая причина «интернет есть у роутера, но не у клиентов».',
    usage: [
      'Постоянные записи ARP для шлюза и серверов — защита от ARP-спуфинга.',
      'reply-only на интерфейсе PPPoE-сервера: клиенты получают адрес только из DHCP.',
      'proxy-arp, когда провайдер выдаёт публичную подсеть на один порт.'
    ],
    pros: [
      'Статические ARP делают подмену шлюза бессмысленной.',
      'reply-only исключает конфликт адресов от «самоназначенных» IP.',
      'Диагностика: видно, какой MAC занял адрес.'
    ],
    cons: [
      'Ошибка в режиме ARP полностью ломает связь.',
      'Статические записи нужно поддерживать вручную.',
      'proxy-arp может «расшарить» адреса, которые не должны быть доступны.'
    ],
    steps: [
      { t: 'Проверьте таблицу', d: 'IP → ARP: флаги D (dynamic), C (complete). Ищите дубли адресов.' },
      { t: 'Статическая запись шлюза', d: 'IP → ARP → `+`: Address=`192.168.10.1`, MAC Address=фактический MAC роутера, Interface=bridge-lan.' },
      { t: 'Режим интерфейса', d: 'Interfaces → выбрать интерфейс → вкладка ARP: для сегмента с DHCP-сервером удобно reply-only (клиентам нужна запись из DHCP).' },
      { t: 'pppoe', d: 'Для PPPoE-сервера на интерфейсе включите ARP=reply-only, чтобы клиенты не назначали адреса сами.' },
      { t: 'Проверка', d: '`/ip arp print`, `/interface print where arp!="enabled"`.' }
    ],
    scenes: [{
      path: 'IP → ARP', win: 'IP ARP', tabs: ['ARP'], tab: 'ARP',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '⌕' }],
      cols: [{ t: 'Address', w: 130 }, { t: 'MAC Address', w: 150 }, { t: 'Interface', w: 120 }, { t: 'Dynamic', w: 90 }, { t: 'Complete', w: 90 }],
      rows: [
        [{ v: '192.168.10.1', m: 2 }, { v: 'DC:2C:6E:A1:4F:22', m: 3 }, { v: 'bridge-lan', m: 4 }, 'false', 'true']
      ],
      sel: 0,
      notes: [
        'Кнопка «Add New» — статическая запись ARP',
        'Адрес шлюза, который защищаем',
        'Реальный MAC роутера — подменить его нельзя',
        'Интерфейс локальной сети'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip arp print\n/interface print where arp!="enabled"\n/ip dhcp-server lease print' }],
    warn: 'reply-only без DHCP-сервера оставит клиентов без связи: они не смогут получить ARP-запись.',
    mistakes: [
      'Включили reply-only на LAN без DHCP.',
      'Статический ARP с неверным MAC — адрес «не отвечает».',
      'proxy-arp включён «для интернета» и открывает лишние адреса.',
      'Не проверили дубли адресов при жалобах на «плавающий» интернет.'
    ]
  });

  ip.items.push({
    id: 'ip-dhcp-options', t: 'DHCP: опции, резервирование и чужие серверы', lvl: 2,
    path: 'IP → DHCP Server', tags: ['dhcp', 'опции', 'резерв', 'option82'],
    purpose: 'DHCP-сервер в RouterOS умеет больше, чем «выдать адрес»: статические привязки по MAC, дополнительные опции (121 для маршрутов, 43 для телефонов, 66/67 для PXE), lease-время и защиту от появления второго DHCP в сети.',
    usage: [
      'Принтеры, камеры и кассы должны всегда получать один адрес.',
      'IP-телефоны и точки доступа требуют опцию 43/66.',
      'Разные lease-время для гостевой и рабочей сети.'
    ],
    pros: [
      'Резервирование по MAC не требует ручной настройки на устройстве.',
      'Опции позволяют раздать маршруты и адреса серверов автоматически.',
      'Короткий lease для гостей освобождает адреса.'
    ],
    cons: [
      'Опечатка в опции ломает конкретную группу устройств.',
      'Несколько DHCP-серверов в сегменте дают случайные адреса.',
      'Резервирование по MAC ломается после замены сетевой карты.'
    ],
    steps: [
      { t: 'Резервирование', d: 'IP → DHCP Server → вкладка Leases: выберите аренду → кнопка Make Static (или `+` с нужным MAC).' },
      { t: 'Опции', d: 'IP → DHCP Server → вкладка Options → `+`: Name=`opt-121`, Code=121, Value=`0x0af0c0a80a` (маршрут) — затем привяжите к сети.' },
      { t: 'Группы сетей', d: 'IP → DHCP Server → Networks: разные DNS/Gateway/lease для VLAN гостей и офиса.' },
      { t: 'Защита от чужого DHCP', d: 'Bridge → Filters: drop по `dhcp-server` с портов пользователей (или используйте DHCP Snooping в Switch → Rules).' },
      { t: 'Проверка', d: 'На клиенте: `ipconfig /all` — адрес, DNS, шлюз из вашей сети. `/ip dhcp-server lease print`.' }
    ],
    scenes: [{
      path: 'IP → DHCP Server → Leases', win: 'DHCP Leases', tabs: ['Leases', 'Options', 'Networks'], tab: 'Leases',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '⌕' }],
      cols: [{ t: 'Address', w: 130 }, { t: 'MAC Address', w: 150 }, { t: 'Host Name', w: 120 }, { t: 'Status', w: 110 }, { t: 'Dynamic', w: 90 }],
      rows: [
        [{ v: '192.168.10.50', m: 2 }, { v: 'DC:2C:6E:A1:4F:30', m: 3 }, { v: 'printer-hp', m: 4 }, { v: 'bound', m: 5 }, 'false']
      ],
      sel: 0,
      notes: [
        'Кнопка создания статической аренды',
        'Адрес, закреплённый за устройством',
        'MAC устройства — по нему работает привязка',
        'Имя устройства для удобства',
        'Статус bound — адрес выдан'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip dhcp-server lease print\n/ip dhcp-server network print\n/ip dhcp-server option print' }],
    warn: 'Два DHCP-сервера в одном сегменте (роутер и чужой Wi-Fi-роутер, включённый LAN-портом) — самая частая причина «интернета нет только у половины».',
    mistakes: [
      'Резервирование по MAC, а устройство сменило адаптер.',
      'Статический адрес попал в диапазон пула — конфликт.',
      'Опция 3 (gateway) добавлена вручную и перекрыла Network.',
      'Гостям выдан lease на 7 дней — адреса заканчиваются.'
    ]
  });

  /* ---------------- IPv6 ---------------- */
  ipv6.items.push({
    id: 'ipv6-pd', t: 'IPv6: делегирование префикса от провайдера', lvl: 3,
    path: 'IPv6 → DHCP Client / Address', tags: ['ipv6', 'pd', 'dual-stack', 'провайдер'],
    purpose: 'Провайдер выдаёт не один адрес, а префикс (например /56), который роутер нарезает на /64 для каждой сети. Это стандартный способ раздать IPv6 в LAN и гостевой VLAN одновременно.',
    usage: [
      'Провайдер поддерживает IPv6 через DHCPv6-PD.',
      'Нужен dual-stack: IPv4 и IPv6 одновременно.',
      'Отдельные префиксы для гостевой сети и офиса.'
    ],
    pros: [
      'Каждой сети — свой /64, без NAT и хитростей.',
      'Устройства получают адрес автоматически (SLAAC).',
      'Не нужно помнить адреса: они формируются из MAC.'
    ],
    cons: [
      'Не все провайдеры делегируют префикс.',
      'Без firewall IPv6-адреса доступны из интернета напрямую.',
      'Смена префикса ломает статические правила и DNS-записи.'
    ],
    steps: [
      { t: 'DHCPv6-клиент', d: 'IPv6 → DHCP Client → `+`: Interface=`ether1-wan` (или pppoe-out1), Request=prefix, Pool Name=`pd-pool`, Pool Prefix Length=56, Add Default Route=yes.' },
      { t: 'Адрес в LAN', d: 'IPv6 → Address → `+`: Address=`::1/64` из пула (или `from-pool=pd-pool`), Interface=`bridge-lan`, Advertise=yes.' },
      { t: 'Анонс', d: 'IPv6 → ND: Interface=bridge-lan, Advertise=yes, Managed Address Configuration=yes.' },
      { t: 'Firewall', d: 'IPv6 → Firewall → Filter: input drop с WAN, forward established/related accept, остальное — по политике.' },
      { t: 'Проверка', d: '`/ipv6 address print`, `/ipv6 dhcp-client print detail` — полученный префикс; с ПК `ping6 google.com`.' }
    ],
    scenes: [{
      path: 'IPv6 → DHCP Client', win: 'DHCPv6 Client', tabs: ['General'], tab: 'General', noTools: true,
      form: {
        title: 'DHCPv6 Client', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Interface', v: 'ether1-wan', type: 'select', m: 1 },
          { l: 'Request', v: 'prefix', type: 'select', m: 2 },
          { l: 'Pool Name', v: 'pd-pool', m: 3 },
          { l: 'Pool Prefix Length', v: '56', m: 4 },
          { l: 'Add Default Route', v: 'yes', type: 'select' }
        ],
        note: 'Префикс /56 позволяет нарезать до 256 сетей /64'
      },
      notes: [
        'Интерфейс, смотрящий в сторону провайдера',
        'Запрашиваем именно префикс, а не адрес',
        'Имя пула для нарезки префикса',
        'Длина пула: /56 достаточно для офиса'
      ]
    }],
    check: [{ d: 'терминал', c: '/ipv6 dhcp-client print detail\n/ipv6 address print\n/ipv6 nd print' }],
    warn: 'Если провайдер меняет префикс (часто раз в сутки), адреса в LAN будут меняться. Для серверов используйте постоянные адреса из отдельного статического префикса.',
    mistakes: [
      'Запросили адрес вместо префикса — LAN остаётся без IPv6.',
      'Нет IPv6-firewall — все устройства видны из интернета.',
      'Advertise выключен — устройства не формируют адрес.',
      'Нарезали /64 на подсети мельче — SLAAC не работает.'
    ]
  });

  ipv6.items.push({
    id: 'ipv6-dualstack-check', t: 'Dual-stack: проверка IPv6 в сети', lvl: 2,
    path: 'IPv6 → Firewall / Tools → Ping', tags: ['ipv6', 'диагностика', 'dual-stack', 'icmpv6'],
    purpose: 'После включения IPv6 нужно убедиться, что он не «полуработает»: адрес есть, а сайты не открываются. Чаще всего виноваты firewall, ICMPv6 и MTU — у IPv6 нет фрагментации на маршрутизаторах.',
    usage: [
      'Приёмка после настройки IPv6 у провайдера.',
      'Жалоба «часть сайтов не открывается» в dual-stack сети.',
      'Плановый аудит безопасности IPv6.'
    ],
    pros: [
      'Проверка по шагам отсекает 90 % проблем за 10 минут.',
      'Счётчики правил показывают, что именно отбрасывается.',
      'MTU-проверка выявляет классическую проблему «большие страницы висят».'
    ],
    cons: [
      'Нужен внешний IPv6-адрес для проверки.',
      'Часть провайдеров отдаёт IPv6 «наполовину» (без маршрута).',
      'Некоторые приложения игнорируют IPv6 и маскируют проблему.'
    ],
    steps: [
      { t: 'Адрес и маршрут', d: '`/ipv6 address print`, `/ipv6 route print` — есть глобальный адрес и маршрут по умолчанию.' },
      { t: 'Пинг с роутера', d: 'Tools → Ping → Address=`2606:4700:4700::1111`, Interface=WAN.' },
      { t: 'ICMPv6', d: 'Убедитесь, что firewall не режет ICMPv6 (нужны types 1,2,3,4,133,134,135,136).' },
      { t: 'MTU', d: 'IPv6 не фрагментирует на роутерах: при PPPoE поставьте MTU 1492 и MSS-clamp.' },
      { t: 'С клиента', d: '`ping6`, `tracert -6`, открытие сайта с IPv6 (например ipv6.google.com).' }
    ],
    scenes: [{
      path: 'IPv6 → Firewall → Filter Rules', win: 'IPv6 Firewall', tabs: ['Filter Rules', 'NAT', 'Mangle'], tab: 'Filter Rules',
      tools: [{ t: '+', id: 'add', m: 1 }],
      cols: [{ t: '#', w: 30 }, { t: 'Chain', w: 80 }, { t: 'Protocol', w: 90 }, { t: 'Action', w: 90 }, { t: 'Comment', w: 200 }],
      rows: [
        ['0', { v: 'input', m: 2 }, { v: 'icmpv6', m: 3 }, { v: 'accept', m: 4 }, 'ND, PMTU, echo'],
        ['1', 'forward', 'tcp', 'accept', 'established,related'],
        ['2', 'input', 'all', 'drop', 'закрываем роутер снаружи']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления правила',
        'Цепочка input — трафик к роутеру',
        'ICMPv6 обязателен для работы IPv6',
        'Разрешение ICMPv6 должно стоять выше drop'
      ]
    }],
    check: [{ d: 'терминал', c: '/ipv6 firewall filter print stats\n/ipv6 address print\n/tool ping 2606:4700:4700::1111 count=4' }],
    warn: 'Полный запрет ICMPv6 ломает neighbor discovery: сеть «работает», но адреса не выдаются и соединения рвутся.',
    mistakes: [
      'Drop all в input выше правил для ICMPv6.',
      'MTU 1500 при PPPoE — крупные ответы не доходят.',
      'Смотрят только на IPv4-адрес и считают, что IPv6 не нужен.',
      'Нет IPv6-firewall вообще — устройства открыты наружу.'
    ]
  });

  /* ---------------- Routing ---------------- */
  rt.items.push({
    id: 'rt-ecmp', t: 'Два провайдера: ECMP и распределение трафика', lvl: 3,
    path: 'IP → Routes / Routing → Tables', tags: ['ecmp', 'два провайдера', 'балансировка'],
    purpose: 'ECMP позволяет держать два равнозначных маршрута по умолчанию и распределять соединения между провайдерами. Проще, чем PCC, но без sticky-сессий: один и тот же сайт может получать пакеты через разные каналы.',
    usage: [
      'Два канала одинаковой скорости, нужно сложить полосу.',
      'Один канал дешёвый, второй — резервный (лучше failover с Distance).',
      'Тестирование перед переходом на PCC/mangle.'
    ],
    pros: [
      'Настраивается в пару кликов: два маршрута с одинаковой Distance и разными Check Gateway.',
      'Суммарная полоса растёт без mangle-правил.',
      'Отказ одного канала обрабатывается автоматически.'
    ],
    cons: [
      'Нет привязки сессии к каналу — банки и госсервисы могут «выкидывать».',
      'Асимметричный трафик ломает NAT и некоторые firewall-сценарии.',
      'Сложнее диагностировать, какой канал использовался.'
    ],
    steps: [
      { t: 'Маршруты', d: 'IP → Routes → `+` дважды: Dst. Address=`0.0.0.0/0`, Gateway=`ether1-wan`, Distance=1, Check Gateway=ping; второй — Gateway=`lte1`, Distance=1, Check Gateway=ping.' },
      { t: 'Проверка шлюзов', d: 'Включите Check Gateway=ping или arp, иначе мёртвый канал останется «активным».' },
      { t: 'NAT', d: 'Masquerade для обоих out-интерфейсов.' },
      { t: 'Если нужен sticky', d: 'Переходите на PCC в mangle: per-connection-classifier=both-addresses-and-ports, routing-mark + отдельные таблицы.' },
      { t: 'Проверка', d: '`/ip route print where dst-address=0.0.0.0/0` — оба маршрута активны (A S, не A S c флагом inactive).' }
    ],
    scenes: [{
      path: 'IP → Routes', win: 'Route List', tabs: ['Routes', 'Nexthops'], tab: 'Routes',
      tools: [{ t: '+', id: 'add', m: 1 }],
      cols: [{ t: 'A', w: 32 }, { t: 'Dst. Address', w: 120 }, { t: 'Gateway', w: 130 }, { t: 'Distance', w: 80 }, { t: 'Check Gateway', w: 120 }],
      rows: [
        [{ v: 'AS', c: 'ok' }, { v: '0.0.0.0/0', m: 2 }, { v: 'ether1-wan', m: 3 }, { v: '1', m: 4 }, { v: 'ping', m: 5 }],
        [{ v: 'AS', c: 'ok' }, '0.0.0.0/0', 'lte1', '1', 'ping']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления маршрута',
        'Маршрут по умолчанию',
        'Первый провайдер',
        'Одинаковая Distance включает ECMP',
        'Проверка живости шлюза'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip route print where dst-address=0.0.0.0/0\n/ip route check 8.8.8.8\n/ip firewall connection print count-only' }],
    warn: 'ECMP без проверки gateway оставит «полуживой» маршрут: половина соединений будет уходить в мёртвый канал.',
    mistakes: [
      'Разные Distance — получается failover, а не балансировка.',
      'Один masquerade только для одного WAN.',
      'Ждут стабильной работы банковских сайтов при ECMP.',
      'Не учитывают, что скорость канала складывается только для параллельных соединений.'
    ]
  });

  rt.items.push({
    id: 'rt-ospf-areas', t: 'OSPF: зоны, стоимости и сходимость', lvl: 3,
    path: 'Routing → OSPF', tags: ['ospf', 'зоны', 'динамическая маршрутизация'],
    purpose: 'OSPF сам строит карту сети и восстанавливает маршруты при обрыве. В офисной сети достаточно одной зоны (backbone 0), в распределённой — нескольких, чтобы изменения не расходились по всей сети.',
    usage: [
      'Сеть из нескольких MikroTik с резервными линками.',
      'Несколько VLAN, между которыми нужна маршрутизация с автоматическим восстановлением.',
      'Подключение к чужому оборудованию (Cisco, Huawei) по OSPF.'
    ],
    pros: [
      'Маршруты появляются сами — не нужно писать статику.',
      'Сходимость за секунды при обрыве линка.',
      'Метрики (cost) позволяют выбрать лучший путь.'
    ],
    cons: [
      'Ошибка в area/network может «утопить» сеть в служебном трафике.',
      'Сложнее в диагностике, чем статика.',
      'Требует одинаковых MTU и аккуратной настройки hello/dead.'
    ],
    steps: [
      { t: 'Включите экземпляр', d: 'Routing → OSPF → `+` (Instance): Name=`default`, Router ID=`192.168.10.1`, Version=2.' },
      { t: 'Зона', d: 'Вкладка Areas → `+`: Name=`backbone`, Area ID=`0.0.0.0`, Type=default.' },
      { t: 'Сети', d: 'Вкладка Networks → `+`: Network=`192.168.10.0/24`, Area=`backbone`; отдельно — подсети транзитных линков.' },
      { t: 'Интерфейсы', d: 'Вкладка Interface Templates: Interface=`wg-site` (или VLAN), Cost вручную для приоритета пути, Network Type=`point-to-point` для туннелей.' },
      { t: 'Проверка', d: 'Routing → OSPF → Neighbors: соседи в состоянии Full. IP → Routes: появились OSPF-маршруты (флаг o).' }
    ],
    scenes: [{
      path: 'Routing → OSPF → Networks', win: 'OSPF', tabs: ['Instances', 'Areas', 'Networks', 'Neighbors'], tab: 'Networks',
      tools: [{ t: '+', id: 'add', m: 1 }],
      cols: [{ t: 'Network', w: 160 }, { t: 'Area', w: 120 }, { t: 'Passive', w: 100 }, { t: 'Disabled', w: 90 }],
      rows: [
        [{ v: '192.168.10.0/24', m: 2 }, { v: 'backbone', m: 3 }, { v: 'yes', m: 4 }, 'false']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления сети',
        'Подсеть, которую анонсируем',
        'Зона OSPF (0.0.0.0 — backbone)',
        'Passive=yes для сетей без OSPF-соседей'
      ]
    }],
    check: [{ d: 'терминал', c: '/routing ospf neighbor print\n/routing ospf network print\n/ip route print where ospf=yes' }],
    warn: 'Не включайте OSPF на WAN-интерфейсе без необходимости: соседство с провайдером может привести к утечке маршрутов.',
    mistakes: [
      'Разные hello/dead интервалы на сторонах.',
      'MTU не совпадает — соседство застревает в ExStart.',
      'Пассивные интерфейсы без passive=yes — лишние hello-пакеты.',
      'Пересекающиеся Router ID.'
    ]
  });
})();
