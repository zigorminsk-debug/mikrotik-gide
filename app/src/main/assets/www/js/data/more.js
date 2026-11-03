/* Дополнительные статьи: добавляются к уже созданным разделам */
(function () {
  'use strict';
  var D = window.DATA || [];
  function group(id) {
    for (var i = 0; i < D.length; i++) if (D[i].id === id) return D[i];
    return null;
  }
  var tasks = group('tasks');
  var start = group('start');
  if (!tasks || !start) return;

  tasks.items.push({
    id: 'task-dns-security', t: 'DNS: DoH, защита от подмены и фильтрация', lvl: 2,
    path: 'IP → DNS · Firewall → NAT', tags: ['dns', 'doh', 'фильтрация', 'безопасность'],
    purpose: 'Аккуратная настройка DNS в продакшене: шифрование запросов (DoH), запрет «утечки» DNS мимо роутера, защита от подмены ответов и блокировка нежелательных доменов через статические записи.',
    usage: [
      'Офис, где нужно, чтобы все устройства использовали корпоративный DNS.',
      'Защита от подмены DNS провайдером или локальными атаками.',
      'Блокировка рекламных доменов без внешнего сервера.',
      'Обязательное требование при работе с публичными Wi-Fi сетями.'
    ],
    steps: [
      { t: 'DoH-клиент', d: 'IP → DNS: Use DoH Server=yes, DoH Server=`https://cloudflare-dns.com/dns-query` (или свой), Verify DoH Certificate=yes. Servers можно оставить как fallback.' },
      { t: 'Разрешите клиентам', d: 'Allow Remote Requests=yes; DNS в DHCP → Networks = адрес роутера.' },
      { t: 'Запретите обход', d: 'NAT: chain=dstnat, protocol=udp, dst-port=53, in-interface-list=LAN, action=redirect to-ports=53; второе правило для tcp 53. Теперь любой DNS-запрос идёт через роутер.' },
      { t: 'Закройте снаружи', d: 'Firewall input: drop udp/tcp 53 с WAN. Открытый резолвер — участник DNS-amplification атак.' },
      { t: 'Статические записи', d: 'IP → DNS → Static: внутренние имена (`1c.lan`, `nas.lan`), при необходимости Regexp=yes для блокировки доменов (`.*doubleclick\\.net`).' },
      { t: 'Блокировка домена', d: 'Static: Name=`ads.example.com`, Address=`0.0.0.0` — клиент получит нерабочий адрес вместо рекламы.' },
      { t: 'Кэш', d: 'Cache Size=4096 KiB, Cache Max TTL=1d. Очищайте кэш после смены upstream-серверов.' },
      { t: 'Проверка', d: 'На клиенте: `nslookup mikrotik.com` — отвечает роутер; при выключенном WAN запросы не уходят напрямую; лог DNS показывает ошибки.' }
    ],
    scenes: [{
      path: 'IP → DNS', win: 'DNS', tabs: ['Settings', 'Cache', 'Static'], noTools: true,
      form: {
        title: 'DNS Settings', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Servers', v: '1.1.1.1, 8.8.8.8', m: 1 },
          { l: 'Use DoH Server', v: 'yes', type: 'select', m: 2 },
          { l: 'DoH Server', v: 'https://cloudflare-dns.com/dns-query', m: 3 },
          { l: 'Verify DoH Certificate', v: 'yes', type: 'select', m: 4 },
          { l: 'Allow Remote Requests', v: 'yes', type: 'select' },
          { l: 'Cache Size', v: '4096 KiB' },
          { l: 'Cache Max TTL', v: '1d' }
        ]
      },
      notes: ['Классические DNS-серверы (fallback)',
        'Включает DNS over HTTPS',
        'Адрес DoH-сервера',
        'Проверка сертификата DoH — защита от подмены сервера']
    }],
    check: [{
      d: 'проверка DNS',
      c: '/ip dns print\n/ip dns cache print\n/ip firewall nat print where dst-port=53\n:put [:resolve "mikrotik.com"]'
    }],
    warn: 'DoH не работает, если на роутере неверное время: сначала настройте NTP. Иначе проверка сертификата провалится и DNS «умрёт».'
  });

  tasks.items.push({
    id: 'task-rogue-dhcp', t: 'Защита от левого DHCP и ARP-спуфинга', lvl: 3,
    path: 'Bridge → Filters · IP → ARP · DHCP Server', tags: ['безопасность', 'arp', 'dhcp', 'l2'],
    purpose: 'В общих сетях (общежитие, коворкинг, гостевой Wi-Fi) любой пользователь может подключить свой роутер и раздавать адреса, или подменить шлюз через ARP. Набор правил ниже это предотвращает.',
    usage: [
      'Общежития, гостиницы, коворкинги — недоверенные устройства в одном L2.',
      'Офис, где сотрудники приносят свои роутеры и «расширяют» сеть.',
      'Гостевые сети с общим доступом.'
    ],
    steps: [
      { t: 'Зафиксируйте шлюз в ARP', d: 'Interface → Interface → bridge-lan: ARP=reply-only. Тогда роутер отвечает только на записи из DHCP/статики.' },
      { t: 'DHCP add-arp', d: 'IP → DHCP Server: Add ARP=yes — каждый выданный адрес автоматически становится статической ARP-записью.' },
      { t: 'Критичные устройства', d: 'IP → ARP: статические записи для серверов и шлюза (Address + MAC + Interface), чтобы их нельзя было подменить.' },
      { t: 'Фильтр DHCP на мосте', d: 'Bridge → Filters → `+`: chain=forward, ip-protocol=udp, src-port=67, in-bridge-port=<недоверенные порты>, action=drop — блокирует ответы чужих DHCP-серверов.' },
      { t: 'BPDU Guard', d: 'Bridge → Ports: для клиентских портов Edge=yes, BPDU Guard=yes — порт отключится, если подключить коммутатор с STP.' },
      { t: 'Ограничение MAC', d: 'При необходимости: Bridge → Ports → Allowed MAC / или WiFi → Access List по MAC.' },
      { t: 'Проверка', d: 'Подключите тестовый роутер с включённым DHCP — клиенты не должны получать его адреса; в логе видны срабатывания фильтра.' }
    ],
    scenes: [{
      path: 'Bridge → Filters', win: 'Bridge Filters', tools: [{ t: '+', id: 'add', m: 1 }],
      cols: [{ t: '#', w: 28 }, { t: 'Chain', w: 80 }, { t: 'In. Bridge Port', w: 140 }, { t: 'IP Protocol', w: 100 }, { t: 'Src. Port', w: 90 }, { t: 'Action', w: 80 }, { t: 'Comment', w: 190 }],
      rows: [
        ['0', { v: 'forward', m: 2 }, { v: 'ether3, ether4, ether5', m: 3 }, { v: 'udp', m: 4 }, { v: '67', m: 5 }, { v: 'drop', c: 'no', m: 6 }, 'чужой DHCP-сервер'],
        ['1', 'forward', 'ether3', 'udp', '68', 'drop', 'чужой DHCP-клиент (опционально)']
      ],
      sel: 0,
      notes: ['Кнопка создания фильтра моста', 'forward — кадры, проходящие через мост', 'Недоверенные порты', 'Протокол UDP', 'Порт источника 67 = ответ DHCP-сервера', 'Отбрасываем такие кадры']
    }],
    check: [{
      d: 'проверка защиты',
      c: '/interface bridge filter print\n/interface bridge port print\n/ip arp print where dynamic=no\n/log print where topics~"bridge"'
    }],
    warn: 'Фильтр по src-port=67 заблокирует и ваш собственный DHCP-сервер, если он работает на другом устройстве сети. Доверенный порт (к серверу) в правило не включайте.'
  });

  start.items.push({
    id: 'start-winbox4', t: 'Winbox 4: что нового и как перейти', lvl: 1,
    path: 'Winbox 4 → интерфейс', tags: ['winbox4', 'интерфейс', 'переход'],
    purpose: 'Winbox 4 — новое десктопное приложение MikroTik (2024) с современным интерфейсом: переработанное дерево меню, поиск, тёмная тема, поддержка нескольких окон и вкладок. Работает с RouterOS 7; для старых версий остаётся Winbox 3.',
    usage: [
      'Ежедневное администрирование RouterOS 7.',
      'Быстрый поиск пункта меню через строку поиска в дереве.',
      'Работа с несколькими роутерами в одном окне (tabs).'
    ],
    steps: [
      { t: 'Где скачать', d: 'mikrotik.com/download → Winbox 4. Доступны сборки для Windows, macOS и Linux.' },
      { t: 'Дерево меню', d: 'Слева — все разделы. Строка поиска фильтрует пункты: наберите `nat`, `vlan`, `dhcp`.' },
      { t: 'Вкладки вместо окон', d: 'Каждый раздел открывается в своей вкладке; можно держать несколько подключений одновременно.' },
      { t: 'Оформление', d: 'Настройки (иконка шестерёнки) → тема светлая/тёмная, размер шрифта, масштаб интерфейса.' },
      { t: 'Совместимость', d: 'Winbox 4 работает с RouterOS 7.13+ полноценно; для RouterOS 6 и ранних 7 используйте Winbox 3.x.' },
      { t: 'Перенос привычек', d: 'Логика та же: список → `+`/`−`/✓/✕ → вкладки → двойной клик по строке открывает свойства.' }
    ],
    scenes: [{
      path: 'IP → Firewall → Filter Rules', win: 'Winbox 4', tab: 'Filter Rules',
      tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
      cols: [{ t: '#', w: 30 }, { t: 'Chain', w: 80 }, { t: 'Action', w: 76 }, { t: 'Bytes', w: 90 }, { t: 'Comment', w: 250 }],
      rows: [
        ['0', 'input', 'accept', '12.4 GiB', 'established'],
        [{ v: '1', m: 1 }, 'input', { v: 'drop', c: 'no' }, '402 MiB', { v: 'invalid', m: 2 }]
      ],
      sel: 1,
      notes: ['Строка списка выделяется кликом — детали справа/в диалоге', 'Тёмная тема включается в настройках приложения']
    }],
    check: [{ d: 'что показывает та же команда в терминале', c: '/ip firewall filter print\n/system resource print' }],
    links: [{ t: 'Winbox 4 (скачать)', u: 'https://mikrotik.com/download' }]
  });
})();
