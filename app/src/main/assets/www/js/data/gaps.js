/* Закрываем пробелы меню: Routing (Nexthops, Prefix Lists, BGP Templates, IGMP Proxy, Settings),
   IP (SSH/TFTP, secondary address, PXE), IPv6 (Pool, Settings). */
(function () {
  'use strict';
  var D = window.DATA || [];
  function group(id) {
    for (var i = 0; i < D.length; i++) if (D[i].id === id) return D[i];
    return null;
  }
  var rt = group('routing'), ip = group('ip'), ipv6 = group('ipv6');
  if (!rt || !ip || !ipv6) return;

  /* ================= Routing ================= */
  rt.items.push({
    id: 'rt-nexthops', t: 'Routing → Nexthops — запасные шлюзы', lvl: 3,
    path: 'Routing → Nexthops', tags: ['nexthop', 'маршруты', 'резерв'],
    purpose: 'Nexthop — это именованный «следующий узел» с несколькими адресами шлюзов. Маршрут ссылается не на один IP, а на nexthop: если первый шлюз недоступен, роутер возьмёт второй. Удобно, когда шлюз меняется или их несколько.',
    usage: [
      'Два шлюза оператора в одной подсети (VRRP-адреса).',
      'Резервный путь в филиал через другой туннель.',
      'Единая точка правки: сменили шлюз в nexthop — поменялись все маршруты.'
    ],
    pros: [
      'Не нужно дублировать маршруты для каждого шлюза.',
      'Check Gateway на nexthop отключает мёртвый шлюз автоматически.',
      'Маршруты читаются понятнее: Gateway = имя, а не IP.'
    ],
    cons: [
      'Ещё один уровень абстракции — новичку сложнее.',
      'Ошибка в nexthop ломает все ссылающиеся маршруты.',
      'Не заменяет BFD при быстром переключении.'
    ],
    steps: [
      { t: 'Создайте nexthop', d: 'Routing → Nexthops → `+`: Name=`nh-wan`, Gateway=`203.0.113.1`, Check Gateway=ping, Distance=1.' },
      { t: 'Второй шлюз', d: 'В том же окне добавьте второй Gateway: `203.0.113.2` — роутер будет использовать его при отказе первого.' },
      { t: 'Маршрут', d: 'IP → Routes → `+`: Dst. Address=`0.0.0.0/0`, Gateway=`nh-wan` (имя, не IP).' },
      { t: 'Проверка', d: '`/routing nexthop print detail`, `/ip route print where gateway~"nh"`.' }
    ],
    scenes: [{
      path: 'Routing → Nexthops', win: 'Nexthops', tabs: ['Nexthops'], tab: 'Nexthops',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: 'Name', w: 120 }, { t: 'Gateway', w: 170 }, { t: 'Check Gateway', w: 120 }, { t: 'Distance', w: 90 }],
      rows: [
        [{ v: 'nh-wan', m: 2 }, { v: '203.0.113.1', m: 3 }, { v: 'ping', m: 4 }, { v: '1' }]
      ],
      sel: 0,
      notes: [
        'Кнопка создания nexthop',
        'Имя, на него ссылаются маршруты',
        'Адрес шлюза (можно добавить второй)',
        'Проверка живости шлюза'
      ]
    }],
    check: [{ d: 'терминал', c: '/routing nexthop print detail\n/ip route print where gateway~"nh"' }],
    mistakes: [
      'Маршрут указывает на удалённый nexthop — трафик уходит «в никуда».',
      'Нет Check Gateway — мёртвый шлюз остаётся в таблице.',
      'Одинаковые имена nexthop в разных VRF.'
    ]
  });

  rt.items.push({
    id: 'rt-prefix-lists', t: 'Routing → Prefix Lists — фильтрация анонсов', lvl: 3,
    path: 'Routing → Prefix Lists / Filters', tags: ['bgp', 'ospf', 'фильтры', 'префиксы'],
    purpose: 'Prefix List — это набор правил «какие сети принимать и отдавать». Без него BGP-сосед может анонсировать вам весь интернет или, наоборот, вы можете случайно отдать ему приватные сети. Фильтры обязательны в любой BGP-схеме.',
    usage: [
      'Защита от аварии «сосед прислал 900 000 маршрутов».',
      'Публикация только своих сетей и запрет приватных.',
      'Приём default-маршрута от провайдера и больше ничего.'
    ],
    pros: [
      'Жёстко ограничивает, что попадёт в таблицу маршрутизации.',
      'Одно правило переиспользуется в нескольких фильтрах.',
      'Защищает от ошибок соседа и от собственных опечаток.'
    ],
    cons: [
      'Синтаксис правил требует аккуратности: порядок важен.',
      'Слишком строгий фильтр «съедает» нужные анонсы.',
      'Ошибки видны только в логах BGP.'
    ],
    steps: [
      { t: 'Список «свои сети»', d: 'Routing → Prefix Lists → `+`: Name=`pl-own`, Prefix=`203.0.113.0/24`, Action=accept; второе правило: Prefix=`0.0.0.0/0`, Prefix Length=`0-32`, Action=reject.' },
      { t: 'Список входящих', d: '`+`: Name=`pl-in`, Prefix=`0.0.0.0/0`, Prefix Length=`0-24`, Action=accept; затем reject всё остальное.' },
      { t: 'Фильтр', d: 'Routing → Filters → `+`: Chain=`bgp-in`, Rule: Prefix List=`pl-in`, Action=accept; второе правило с пустым условием → Action=reject.' },
      { t: 'Применение', d: 'Routing → BGP → Connections: вкладка Input/Output Filter укажите `bgp-in`/`bgp-out`.' },
      { t: 'Проверка', d: '`/routing prefix-list print`, `/routing filter print`, `/routing bgp session print`.' }
    ],
    scenes: [{
      path: 'Routing → Prefix Lists', win: 'Prefix Lists', tabs: ['Prefix Lists'], tab: 'Prefix Lists',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: 'Name', w: 120 }, { t: 'Prefix', w: 150 }, { t: 'Prefix Length', w: 120 }, { t: 'Action', w: 100 }],
      rows: [
        [{ v: 'pl-own', m: 2 }, { v: '203.0.113.0/24', m: 3 }, { v: '24-24', m: 4 }, { v: 'accept', m: 5 }],
        ['pl-own', '0.0.0.0/0', '0-32', 'reject']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления правила',
        'Имя списка — на него ссылается фильтр',
        'Сеть, которую разрешаем анонсировать',
        'Длина префикса: 24-24 означает ровно /24',
        'Accept для своей сети, reject для всего остального'
      ]
    }],
    check: [{ d: 'терминал', c: '/routing prefix-list print\n/routing filter print\n/routing bgp session print detail' }],
    warn: 'Правило reject в конце обязательно. Без него фильтр «пропускает всё», и вы принимаете любой мусор от соседа.',
    mistakes: [
      'Нет завершающего reject.',
      'Фильтр создан, но не привязан к BGP-соединению.',
      'Разрешили анонсировать приватные сети (10/8, 192.168/16).'
    ]
  });

  rt.items.push({
    id: 'rt-bgp-templates', t: 'Routing → BGP: templates и connections', lvl: 3,
    path: 'Routing → BGP → Templates / Connections', tags: ['bgp', 'шаблоны', 'пиры'],
    purpose: 'В RouterOS 7 BGP настраивается через шаблоны (templates) и соединения (connections). Шаблон хранит общие параметры — AS, таймеры, политики; соединение описывает конкретного соседа. Так 20 пиров не требуют 20 копий настроек.',
    usage: [
      'Несколько аплинков с одинаковой политикой.',
      'iBGP-соседства внутри сети из нескольких роутеров.',
      'Разные шаблоны для клиентов (private AS) и провайдеров.'
    ],
    pros: [
      'Одна правка политики применяется ко всем пирам шаблона.',
      'Меньше шансов ошибиться в параметрах таймеров и адресов.',
      'Читаемая структура: шаблон — политика, соединение — адрес.'
    ],
    cons: [
      'Понимание шаблонов приходит не сразу: ошибки наследования.',
      'Соединение может переопределять параметры — неочевидно.',
      'Диагностика требует смотреть и шаблон, и соединение.'
    ],
    steps: [
      { t: 'Шаблон', d: 'Routing → BGP → вкладка Templates → `+`: Name=`tpl-uplink`, AS=`65000`, Output Network=`203.0.113.0/24`, Output Filter=`bgp-out`, Input Filter=`bgp-in`.' },
      { t: 'Соединение', d: 'Вкладка Connections → `+`: Name=`peer-isp1`, Template=`tpl-uplink`, Remote Address=`198.51.100.1`, Remote AS=`64500`.' },
      { t: 'Сеть', d: 'Вкладка Networks: добавьте свою сеть, иначе анонс не уйдёт даже при фильтре accept.' },
      { t: 'Проверка', d: '`/routing bgp connection print`, `/routing bgp session print` — состояние established.' }
    ],
    scenes: [{
      path: 'Routing → BGP → Connections', win: 'BGP', tabs: ['Templates', 'Connections', 'Networks', 'Sessions'], tab: 'Connections',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: 'Name', w: 120 }, { t: 'Template', w: 130 }, { t: 'Remote Address', w: 150 }, { t: 'Remote AS', w: 100 }],
      rows: [
        [{ v: 'peer-isp1', m: 2 }, { v: 'tpl-uplink', m: 3 }, { v: '198.51.100.1', m: 4 }, { v: '64500' }]
      ],
      sel: 0,
      notes: [
        'Кнопка создания соединения',
        'Шаблон с общими параметрами',
        'Адрес BGP-соседа',
        'AS соседа — должен совпадать с реальным'
      ]
    }],
    check: [{ d: 'терминал', c: '/routing bgp template print\n/routing bgp connection print detail\n/routing bgp session print' }],
    mistakes: [
      'Сеть добавлена, но не попала в Output Network шаблона.',
      'Remote AS не совпадает — сессия висит в Active.',
      'Нет input-фильтра — приняли 900 000 маршрутов.'
    ]
  });

  rt.items.push({
    id: 'rt-igmp-proxy', t: 'Routing → IGMP Proxy: multicast IPTV', lvl: 3,
    path: 'Routing → IGMP Proxy', tags: ['iptv', 'multicast', 'igmp', 'udp'],
    purpose: 'Если провайдер отдаёт IPTV по multicast, один поток легко забивает канал всем. IGMP Proxy передаёт поток только тем, кто его запросил: роутер «слушает» запросы в LAN и подписывается на группу на WAN.',
    usage: [
      'IPTV от провайдера через приставку за роутером.',
      'Корпоративное видеовещание в несколько подсетей.',
      'Экономия канала: без подписки поток не идёт в сеть.'
    ],
    pros: [
      'Полоса расходуется только при наличии зрителя.',
      'Работает с обычными приставками без настройки.',
      'Легко проверить: счётчики групп показывают активность.'
    ],
    cons: [
      'Multicast не проходит через NAT — нужен корректный routing.',
      'Wi-Fi плохо переносит multicast: картинка «рассыпается».',
      'Часть провайдеров требует IGMP snooping на коммутаторе.'
    ],
    steps: [
      { t: 'Включите proxy', d: 'Routing → IGMP Proxy → `+`: Interface=`ether1-wan` (интерфейс в сторону источника, Upstream), затем второй `+` для `bridge-lan` с признаком Downstream.' },
      { t: 'Alternative subnets', d: 'Если в LAN несколько подсетей, перечислите их в свойстве Alternative Subnets на downstream-интерфейсе.' },
      { t: 'Firewall', d: 'Разрешите forward для protocol=udp с адресов групп (обычно 224.0.0.0/4) из WAN в LAN — только для этих адресов.' },
      { t: 'Проверка', d: '`/routing igmp-proxy interface print`, `/routing igmp-proxy mfc print` — при просмотре появляется активная группа.' }
    ],
    scenes: [{
      path: 'Routing → IGMP Proxy', win: 'IGMP Proxy', tabs: ['Interfaces', 'MFC'], tab: 'Interfaces', noTools: true,
      cols: [{ t: 'Interface', w: 150 }, { t: 'Upstream', w: 100 }, { t: 'Threshold', w: 110 }, { t: 'Alternative Subnets', w: 180 }],
      rows: [
        [{ v: 'ether1-wan', m: 1 }, { v: 'yes', m: 2 }, { v: '1', }, ''],
        [{ v: 'bridge-lan', m: 3 }, { v: 'no' }, { v: '1' }, { v: '192.168.10.0/24', m: 4 }]
      ],
      sel: 0,
      notes: [
        'Интерфейс в сторону источника multicast',
        'Upstream=yes — откуда берём поток',
        'Downstream-интерфейс, куда отдаём',
        'Подсети, которым разрешено принимать поток'
      ]
    }],
    check: [{ d: 'терминал', c: '/routing igmp-proxy interface print\n/routing igmp-proxy mfc print\n/ip firewall filter print where protocol=udp' }],
    warn: 'Не включайте multicast без ограничений в firewall: поток может прийти на все порты, включая гостевой Wi-Fi.',
    mistakes: [
      'Upstream и downstream перепутаны.',
      'Нет правила firewall для UDP-мультикаста — поток не проходит.',
      'Просмотр по Wi-Fi — картинка рвётся при плохом сигнале.'
    ]
  });

  rt.items.push({
    id: 'rt-settings', t: 'Routing → Settings: router-id и перераспределение', lvl: 2,
    path: 'Routing → Settings', tags: ['routing', 'router-id', 'redistribute'],
    purpose: 'Глобальные настройки маршрутизации: Router ID, перераспределение маршрутов между протоколами, поведение при нескольких путях. Ошибки здесь отражаются на всей динамической маршрутизации сразу.',
    usage: [
      'Подготовка к OSPF/BGP: задать стабильный Router ID.',
      'Разрешить перераспределение connected/static в OSPF.',
      'Управление ECMP и выбором пути.'
    ],
    pros: [
      'Один Router ID для всех протоколов — меньше путаницы.',
      'Перераспределение позволяет не прописывать статику на каждом роутере.',
      'Настройки в одном месте, а не в каждом экземпляре протокола.'
    ],
    cons: [
      'Смена Router ID требует перезапуска сессий.',
      'Бесконтрольное перераспределение приводит к петлям маршрутов.',
      'Не все протоколы используют эти настройки.'
    ],
    steps: [
      { t: 'Router ID', d: 'Routing → Settings: Router ID=`10.255.255.1` (обычно адрес loopback).' },
      { t: 'Перераспределение', d: 'Включите нужные источники (connected, static) для OSPF в настройках экземпляра OSPF, а не «всё подряд».' },
      { t: 'ECMP', d: 'Для балансировки нескольких путей убедитесь, что маршруты имеют одинаковую distance и протокол.' },
      { t: 'Проверка', d: '`/routing settings print`, `/routing ospf instance print detail`.' }
    ],
    scenes: [{
      path: 'Routing → Settings', win: 'Routing Settings', tabs: ['Settings'], tab: 'Settings', noTools: true,
      form: {
        title: 'Routing Settings', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Router ID', v: '10.255.255.1', m: 1 },
          { l: 'Dynamic-in', v: 'yes', type: 'select' },
          { l: 'Check Gateway', v: 'ping' },
          { l: 'Fib Multipath Hash Policy', v: 'L3', type: 'select' }
        ],
        note: 'Router ID должен быть уникальным в пределах домена маршрутизации'
      },
      notes: ['Router ID — идентификатор роутера во всех протоколах']
    }],
    check: [{ d: 'терминал', c: '/routing settings print\n/routing ospf instance print detail\n/ip route print where active=yes' }],
    mistakes: [
      'Router ID совпадает с другим роутером — соседство не устанавливается.',
      'Перераспределены все источники — петли между OSPF и BGP.',
      'Сменили Router ID без перезапуска протоколов.'
    ]
  });

  /* ================= IP ================= */
  ip.items.push({
    id: 'ip-ssh-tftp', t: 'IP → SSH и TFTP — сервисы роутера', lvl: 2,
    path: 'IP → SSH / IP → TFTP', tags: ['ssh', 'tftp', 'сервисы', 'pxe'],
    purpose: 'RouterOS может быть SSH-сервером (администрирование, туннели) и TFTP-сервером (передача образов, конфигов, PXE-загрузка). Оба сервиса по умолчанию стоит ограничить локальной сетью.',
    usage: [
      'SSH-доступ вместо Winbox для скриптов и автоматизации.',
      'Резервное копирование конфигов по SCP/SFTP.',
      'Раздача файлов прошивки или PXE-загрузка по TFTP.'
    ],
    pros: [
      'SSH позволяет выполнять команды из скриптов и CI.',
      'TFTP — самый простой способ отдать файл старому оборудованию.',
      'Оба сервиса уже в системе, ничего ставить не нужно.'
    ],
    cons: [
      'TFTP без шифрования и аутентификации — только для доверенной сети.',
      'Открытый SSH в интернет = постоянный брутфорс.',
      'TFTP не поддерживает большие файлы и каталоги.'
    ],
    steps: [
      { t: 'SSH', d: 'IP → Services → ssh: Available From=`192.168.10.0/24`, Port=22; при необходимости смените порт.' },
      { t: 'Ключи', d: 'System → Users → admin → SSH Keys: импортируйте публичный ключ и отключите вход по паролю для автоматизации.' },
      { t: 'TFTP', d: 'IP → TFTP: IP Address=`192.168.10.1`, Allow Rollover=yes, Max Block Size=1428; каталог — Files.' },
      { t: 'Проверка', d: '`ssh admin@192.168.10.1`, `tftp -g -r file.txt 192.168.10.1` с клиента.' }
    ],
    scenes: [{
      path: 'IP → Services', win: 'IP Services', tabs: ['Services'], tab: 'Services', noTools: true,
      cols: [{ t: 'Name', w: 100 }, { t: 'Port', w: 80 }, { t: 'Available From', w: 170 }, { t: 'Disabled', w: 90 }],
      rows: [
        [{ v: 'ssh', m: 1 }, { v: '22', m: 2 }, { v: '192.168.10.0/24', m: 3 }, 'false'],
        ['tftp', '69', '192.168.10.0/24', 'false']
      ],
      sel: 0,
      notes: [
        'Служба SSH',
        'Порт по умолчанию 22',
        'Разрешённые адреса — никогда не «any» для WAN'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip service print\n/ip tftp print\n/user ssh-keys print' }],
    warn: 'TFTP не проверяет пароль: любой в сети может скачать файлы роутера. Включайте только на время работ.',
    mistakes: [
      'SSH открыт для Any — брутфорс круглосуточно.',
      'TFTP оставлен включённым после прошивки.',
      'Вход по паролю при наличии ключей.'
    ]
  });

  ip.items.push({
    id: 'ip-secondary-address', t: 'Несколько адресов на интерфейсе и подсети', lvl: 1,
    path: 'IP → Address', tags: ['адреса', 'secondary', 'миграция'],
    purpose: 'На один интерфейс можно повесить несколько адресов — например, старую и новую подсеть при миграции или адрес для отдельной услуги. RouterOS отвечает на все адреса интерфейса, а источник ответа выбирается по таблице маршрутов.',
    usage: [
      'Плавная смена подсети: обе работают, пока устройства переезжают.',
      'Адрес для публичных сервисов на том же порту.',
      'Второй шлюз для отдельной группы устройств.'
    ],
    pros: [
      'Миграция без «одного окна простоя».',
      'Один порт обслуживает несколько сетей.',
      'Не требует VLAN, если сегмент физически один.'
    ],
    cons: [
      'Маршрутизация становится неочевидной: с какого адреса уйдёт ответ.',
      'Firewall-правила нужно дублировать для новых подсетей.',
      'DHCP-сервер и ARP придётся настраивать отдельно.'
    ],
    steps: [
      { t: 'Добавьте адрес', d: 'IP → Address → `+`: Address=`192.168.20.1/24`, Interface=`bridge-lan`.' },
      { t: 'DNS/DHCP', d: 'Для новой подсети создайте отдельный пул и сеть в DHCP, иначе клиенты её не получат.' },
      { t: 'Firewall', d: 'Проверьте правила: если разрешения привязаны к 192.168.10.0/24, добавьте новую подсеть в address-list.' },
      { t: 'Проверка', d: '`/ip address print`, пинг с обеих подсетей, `/tool torch` для контроля источника.' }
    ],
    scenes: [{
      path: 'IP → Address', win: 'Address List', tabs: ['Address'], tab: 'Address',
      tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
      cols: [{ t: 'Address', w: 150 }, { t: 'Network', w: 120 }, { t: 'Interface', w: 120 }, { t: 'Dynamic', w: 90 }],
      rows: [
        [{ v: '192.168.10.1/24', m: 2 }, { v: '192.168.10.0', m: 3 }, { v: 'bridge-lan', m: 4 }, 'false'],
        ['192.168.20.1/24', '192.168.20.0', 'bridge-lan', 'false']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления адреса',
        'Адрес роутера в подсети',
        'Сеть вычисляется автоматически по маске',
        'Интерфейс, на котором адрес доступен'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip address print\n/ip route print where dst-address~"192.168"\n/ip dhcp-server network print' }],
    mistakes: [
      'Вторая подсеть без DHCP-сети — устройства получают адрес из первой.',
      'Правила firewall не покрывают новую подсеть.',
      'Адрес добавлен поверх пересекающейся сети.'
    ]
  });

  ip.items.push({
    id: 'ip-tftp-pxe', t: 'PXE-загрузка и раздача файлов через TFTP', lvl: 3,
    path: 'IP → TFTP + IP → DHCP Server → Options', tags: ['pxe', 'tftp', 'dhcp', 'развёртывание'],
    purpose: 'Чтобы установить систему по сети, DHCP должен подсказать клиенту адрес TFTP-сервера (опции 66/67), а TFTP — отдать загрузчик. RouterOS подходит на роль такого сервера для небольшой сети.',
    usage: [
      'Установка ОС на новые ПК без флешек.',
      'Загрузка прошивок IP-телефонов и точек доступа.',
      'Восстановление устройства, у которого слетела система.'
    ],
    pros: [
      'Не нужен отдельный сервер.',
      'Один DHCP + TFTP на роутере покрывает небольшую сеть.',
      'Быстро настраивается и так же быстро отключается.'
    ],
    cons: [
      'TFTP медленный и без шифрования — только локальная сеть.',
      'Ошибки в опциях 66/67 трудно диагностировать.',
      'Ограничение по объёму файлов и скорости.'
    ],
    steps: [
      { t: 'Файлы', d: 'Files: загрузите загрузчик (например `pxelinux.0`) и конфиг в корень.' },
      { t: 'TFTP', d: 'IP → TFTP: IP Address=`192.168.10.1`, Allow Rollover=yes.' },
      { t: 'Опции DHCP', d: 'IP → DHCP Server → Options → `+`: Code=66, Value=`192.168.10.1` (TFTP-сервер); второй: Code=67, Value=`pxelinux.0` (имя файла).' },
      { t: 'Привязка', d: 'IP → DHCP Server → Networks: в нужной сети укажите DHCP Option Set с этими опциями.' },
      { t: 'Проверка', d: 'Загрузите ПК по сети: он получит адрес и файл загрузчика; смотрите `/ip tftp print` — счётчики запросов.' }
    ],
    scenes: [{
      path: 'IP → DHCP Server → Options', win: 'DHCP Options', tabs: ['Options'], tab: 'Options',
      tools: [{ t: '+', id: 'add', m: 1 }],
      cols: [{ t: 'Name', w: 110 }, { t: 'Code', w: 70 }, { t: 'Value', w: 200 }],
      rows: [
        [{ v: 'pxe-server', m: 2 }, { v: '66', m: 3 }, { v: '192.168.10.1', m: 4 }],
        ['pxe-file', '67', 'pxelinux.0']
      ],
      sel: 0,
      notes: [
        'Кнопка добавления опции',
        'Имя набора опций',
        'Код 66 — адрес TFTP-сервера',
        'Значение: адрес роутера'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip tftp print\n/ip dhcp-server option print\n/ip dhcp-server network print' }],
    warn: 'Не включайте TFTP «наружу»: файлы роутера и конфиги станут доступны любому в сети.',
    mistakes: [
      'Опции созданы, но не привязаны к сети через Option Set.',
      'Неверное имя файла в опции 67.',
      'TFTP включён, а firewall режет UDP 69.'
    ]
  });

  /* ================= IPv6 ================= */
  ipv6.items.push({
    id: 'ipv6-pool', t: 'IPv6 → Pool: адреса для клиентов', lvl: 3,
    path: 'IPv6 → Pool', tags: ['ipv6', 'pool', 'dhcpv6'],
    purpose: 'IPv6 Pool хранит префиксы для раздачи клиентам: DHCPv6-серверу, PPP-профилям, туннелям. Без пула адреса выдаются только вручную.',
    usage: [
      'DHCPv6-сервер для гостевой сети.',
      'Раздача адресов PPPoE-клиентам по IPv6.',
      'Делегирование /64 клиентским роутерам.'
    ],
    pros: [
      'Один пул используется несколькими механизмами выдачи.',
      'Легко расширить: меняется только пул.',
      'Видно, сколько адресов занято.'
    ],
    cons: [
      'Без ND/RA клиенты адрес не используют.',
      'Пулы не заменяют маршрутизацию.',
      'Ошибка с длиной префикса ломает SLAAC.'
    ],
    steps: [
      { t: 'Пул', d: 'IPv6 → Pool → `+`: Name=`v6-clients`, Prefix=`2001:db8:10:10::/64`, Prefix Length=64.' },
      { t: 'DHCPv6-сервер', d: 'IPv6 → DHCP Server: Interface=`bridge-lan`, Address Pool=`v6-clients`, Address Pool Prefix Length=64.' },
      { t: 'ND', d: 'IPv6 → ND на bridge-lan: Advertise=yes, Other Configuration=yes.' },
      { t: 'Проверка', d: '`/ipv6 pool print stats`, на клиенте — глобальный адрес из префикса.' }
    ],
    scenes: [{
      path: 'IPv6 → Pool', win: 'IPv6 Pool', tabs: ['Pool'], tab: 'Pool',
      tools: [{ t: '+', id: 'add', m: 1 }],
      cols: [{ t: 'Name', w: 130 }, { t: 'Prefix', w: 220 }, { t: 'Prefix Length', w: 120 }, { t: 'Used', w: 80 }],
      rows: [
        [{ v: 'v6-clients', m: 2 }, { v: '2001:db8:10:10::/64', m: 3 }, { v: '64', m: 4 }, '3']
      ],
      sel: 0,
      notes: [
        'Кнопка создания пула',
        'Имя пула',
        'Префикс, который раздаём',
        'Длина префикса для клиентов — обычно 64'
      ]
    }],
    check: [{ d: 'терминал', c: '/ipv6 pool print\n/ipv6 dhcp-server print\n/ipv6 nd print' }],
    mistakes: [
      'Префикс /128 вместо /64 — SLAAC не работает.',
      'Пул не привязан к DHCPv6-серверу.',
      'Нет ND — клиенты не знают о префиксе.'
    ]
  });

  ipv6.items.push({
    id: 'ipv6-settings', t: 'IPv6 → Settings: глобальные параметры', lvl: 3,
    path: 'IPv6 → Settings', tags: ['ipv6', 'settings', 'forwarding'],
    purpose: 'Глобальные настройки IPv6 влияют на всю сеть: разрешена ли маршрутизация, как обрабатываются пакеты без маршрута, таймеры. Ошибка здесь делает IPv6 «неработающим» при формально настроенных адресах.',
    usage: [
      'Проверка, что forwarding включён (иначе IPv6 не маршрутизируется).',
      'Управление ответами ICMPv6 и поведением при отсутствии маршрута.',
      'Подготовка сети к dual-stack.'
    ],
    pros: [
      'Один экран для ключевых параметров.',
      'Позволяет быстро отключить IPv6, если он мешает.',
      'Помогает диагностировать «адрес есть, интернета нет».'
    ],
    cons: [
      'Часть параметров дублируется в ND и firewall.',
      'Неверное значение ломает работу без явной ошибки.',
      'Мало документации на русском.'
    ],
    steps: [
      { t: 'Forwarding', d: 'IPv6 → Settings: Forwarding=yes (без этого роутер не пересылает IPv6 между интерфейсами).' },
      { t: 'Маршрут по умолчанию', d: 'Убедитесь, что он есть: IPv6 → Routes, флаг AS.' },
      { t: 'ICMP', d: 'Не блокируйте ICMPv6 в firewall — без него не работает ND.' },
      { t: 'Проверка', d: '`/ipv6 settings print`, `/ipv6 route print`, `ping6` с клиента.' }
    ],
    scenes: [{
      path: 'IPv6 → Settings', win: 'IPv6 Settings', tabs: ['Settings'], tab: 'Settings', noTools: true,
      form: {
        title: 'IPv6 Settings', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'IPv6 Forwarding', v: 'yes', type: 'select', m: 1 },
          { l: 'Accept Redirects', v: 'no', type: 'select' },
          { l: 'Accept Router Advertisements', v: 'no', type: 'select', m: 2 },
          { l: 'Multicast Forwarding', v: 'no', type: 'select' }
        ],
        note: 'Accept Router Advertisements включают только на интерфейсе, смотрящем к провайдеру'
      },
      notes: [
        'Forwarding обязателен для маршрутизации IPv6',
        'RA принимаем только с WAN, иначе можно получить чужой префикс'
      ]
    }],
    check: [{ d: 'терминал', c: '/ipv6 settings print\n/ipv6 route print\n/ipv6 nd print' }],
    warn: 'Accept Router Advertisements на LAN позволяет любому устройству объявить себя роутером и увести трафик. Включайте только на WAN.',
    mistakes: [
      'Forwarding=no и ждут маршрутизации между VLAN.',
      'RA принимаются на LAN.',
      'ICMPv6 заблокирован firewall.'
    ]
  });
})();
