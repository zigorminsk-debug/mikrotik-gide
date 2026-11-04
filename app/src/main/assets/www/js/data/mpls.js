/* Раздел MPLS: метки, LDP, L2VPN (VPLS) и Traffic Engineering.
   Добавляет группу меню «MPLS» — она есть в Winbox 4, но раньше отсутствовала в учебнике. */
(function () {
  'use strict';
  var D = window.DATA || [];

  var mpls = {
    id: 'mpls', name: 'MPLS (LDP, VPLS)', ic: 'system',
    items: [
      {
        id: 'mpls-basics', t: 'MPLS → MPLS и Forwarding — включение', lvl: 3,
        path: 'MPLS → MPLS / Forwarding', tags: ['mpls', 'метки', 'forwarding'],
        purpose: 'MPLS добавляет к пакету короткую метку вместо анализа IP-заголовка. Роутер принимает решение по метке за один шаг — это ускоряет пересылку и позволяет строить L2VPN/VPLS. Включение состоит из двух шагов: разрешить MPLS на нужных интерфейсах и задать транспортный адрес (обычно loopback).',
        usage: [
          'Построение L2VPN между площадками провайдера или крупного офиса.',
          'Транспорт для VPLS, где нужно передать Ethernet-кадры между городами.',
          'Разделение трафика нескольких клиентов по одной магистрали (VRF + метки).'
        ],
        pros: [
          'Пересылка по метке быстрее и предсказуемее, чем по IP-таблице.',
          'VPLS даёт полноценный L2-сегмент поверх IP-сети.',
          'Метки не зависят от IP-адреса клиента — удобно для многоарендных схем.'
        ],
        cons: [
          'Сложнее диагностика: без MPLS-опыта метки выглядят «магией».',
          'Требует одинаковых MTU и аккуратной адресации транспортной сети.',
          'Не нужно в обычном офисе — это инструмент для сетей с L2-связностью.'
        ],
        steps: [
          { t: 'Транспортный адрес', d: 'Создайте loopback: Interface → `+` → Bridge (или VRF) как loopback — проще всего IP → Address на отдельном bridge без портов, например `10.255.255.1/32`.' },
          { t: 'Включите MPLS', d: 'MPLS → MPLS → вкладка Interface → `+`: Interface=`ether1-transit`, Input=yes (для интерфейсов магистрали).' },
          { t: 'LDP на адрес', d: 'MPLS → LDP: Enabled=yes, LSR ID=`10.255.255.1`, Transport Address=`10.255.255.1`.' },
          { t: 'Проверка', d: 'MPLS → Forwarding: появились записи (динамические — полученные от соседей).' }
        ],
        scenes: [{
          path: 'MPLS → MPLS', win: 'MPLS', tabs: ['MPLS', 'Forwarding', 'LDP', 'Traffic Eng'], tab: 'MPLS',
          tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
          cols: [{ t: 'Interface', w: 160 }, { t: 'Input', w: 90 }, { t: 'Disabled', w: 90 }],
          rows: [
            [{ v: 'ether1-transit', m: 2 }, { v: 'yes', m: 3 }, 'false']
          ],
          sel: 0,
          notes: [
            'Кнопка добавления интерфейса в MPLS',
            'Интерфейс магистрали (смотрит в сторону провайдера)',
            'Input=yes — принимать и обрабатывать метки'
          ]
        }],
        check: [{ d: 'терминал', c: '/mpls interface print\n/mpls forwarding-table print\n/mpls ldp print' }],
        warn: 'Включайте MPLS только на транзитных интерфейсах. На портах к клиентам это лишняя нагрузка и потенциальная ошибка.',
        mistakes: [
          'MPLS включён без LDP и транспортного адреса — таблица меток пуста.',
          'Разные MTU на магистрали — большие пакеты теряются.',
          'Транспортный адрес анонсируется через OSPF/BGP в клиентскую сеть.'
        ]
      },
      {
        id: 'mpls-ldp', t: 'MPLS → LDP: сессии и распределение меток', lvl: 3,
        path: 'MPLS → LDP / MPLS → Forwarding', tags: ['mpls', 'ldp', 'метки'],
        purpose: 'LDP автоматически договаривается с соседями, какую метку использовать для каждого IP-префикса. После установления сессии записи появляются в Forwarding Table — это и есть «коммутация по меткам».',
        usage: [
          'Две и более площадки с MPLS-транзитом между ними.',
          'Подготовка базы для VPLS (L2VPN).',
          'Диагностика: понять, какой путь выбрали метки.'
        ],
        pros: [
          'Метки распределяются автоматически, вручную ничего не задаётся.',
          'Сессии видны в интерфейсе: состояние, адрес соседа, uptime.',
          'Работает поверх любой IGP (OSPF, ISIS, статические маршруты).'
        ],
        cons: [
          'Нужна IP-связность между loopback-адресами до включения LDP.',
          'Сессия может подняться, а меток не быть — расхождение фильтров.',
          'Ошибки видны только в Log с топиком ldp.'
        ],
        steps: [
          { t: 'IP-связность', d: 'Убедитесь, что `ping 10.255.255.2` (loopback соседа) проходит — без этого LDP не поднимется.' },
          { t: 'LDP', d: 'MPLS → LDP: Enabled=yes, LSR ID=`10.255.255.1`, Transport Address=`10.255.255.1`, Distribution=unsolicited, Path Vector Limit=255.' },
          { t: 'Соседи', d: 'MPLS → LDP → вкладка Neighbors (или `/mpls ldp neighbor print`): состояние operational.' },
          { t: 'Таблица меток', d: 'MPLS → Forwarding: для префиксов соседа появились метки; проверьте Destination и Label.' }
        ],
        scenes: [{
          path: 'MPLS → LDP', win: 'LDP', tabs: ['LDP', 'Neighbors', 'Local Mapping'], tab: 'LDP', noTools: true,
          form: {
            title: 'LDP', buttons: ['Apply', 'Cancel'],
            fields: [
              { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
              { l: 'LSR ID', v: '10.255.255.1', m: 2 },
              { l: 'Transport Address', v: '10.255.255.1', m: 3 },
              { l: 'Distribution', v: 'unsolicited', type: 'select' },
              { l: 'Path Vector Limit', v: '255' }
            ],
            note: 'LSR ID и Transport Address должны быть постоянными — обычно это адрес loopback'
          },
          notes: [
            'Включение LDP',
            'Уникальный идентификатор роутера в MPLS-домене',
            'Адрес, по которому строятся сессии с соседями'
          ]
        }],
        check: [{ d: 'терминал', c: '/mpls ldp neighbor print\n/mpls ldp local-mapping print\n/mpls forwarding-table print' }],
        warn: 'Если LSR ID совпадает у двух роутеров, сессии будут рваться с непонятными ошибками. Проверяйте уникальность.',
        mistakes: [
          'LDP включён, но loopback не анонсируется в IGP.',
          'Разные Transport Address и LSR ID после смены адресации.',
          'Firewall блокирует UDP 646 и TCP 646 между роутерами.'
        ]
      },
      {
        id: 'mpls-vpls', t: 'MPLS → L2VPN (VPLS): единый L2 между площадками', lvl: 3,
        path: 'MPLS → L2VPN / Bridge', tags: ['vpls', 'l2vpn', 'mpls', 'l2'],
        purpose: 'VPLS переносит Ethernet-кадры между площадками поверх MPLS: удалённые порты выглядят как один коммутатор. Это нужно, когда приложение работает с широковещанием или не умеет маршрутизироваться (старые АТС, кассы, промышленное оборудование).',
        usage: [
          'Единый L2-сегмент между офисом и дата-центром.',
          'Подключение оборудования, которому нужен «один провод» между площадками.',
          'Миграция сервисов без смены IP-адресов.'
        ],
        pros: [
          'Полноценный L2: работает broadcast, ARP, DHCP, discovery.',
          'Прозрачно для приложений — ничего не нужно перенастраивать.',
          'Мультиплексирование: несколько VPLS на одной магистрали.'
        ],
        cons: [
          'Широковещательные штормы переносятся между площадками — нужны фильтры.',
          'MTU: кадр + метки, легко получить фрагментацию.',
          'Диагностика сложнее, чем у L3-туннеля (EoIP/GRE).'
        ],
        steps: [
          { t: 'База', d: 'Сначала MPLS + LDP между PE-роутерами (см. статьи про MPLS и LDP), проверьте Forwarding Table.' },
          { t: 'VPLS-интерфейс', d: 'MPLS → L2VPN → `+`: Name=`vpls-office`, Remote Peer=`10.255.255.2`, VPLS ID=`10.255.255.1:100`, MTU=1500.' },
          { t: 'Мост', d: 'Bridge → Ports: добавьте `vpls-office` и локальный порт в один bridge (например `bridge-l2`).' },
          { t: 'MTU', d: 'На магистрали MTU 1508–1520, чтобы кадр 1500 с метками проходил без фрагментации.' },
          { t: 'Проверка', d: '`/mpls ldp neighbor print`, `/interface vpls print`, ARP между площадками, ping внутри одного L2.' }
        ],
        scenes: [{
          path: 'MPLS → L2VPN', win: 'L2VPN', tabs: ['L2VPN', 'VPLS'], tab: 'L2VPN',
          tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
          cols: [{ t: 'Name', w: 130 }, { t: 'Remote Peer', w: 140 }, { t: 'VPLS ID', w: 160 }, { t: 'MTU', w: 80 }],
          rows: [
            [{ v: 'vpls-office', m: 2 }, { v: '10.255.255.2', m: 3 }, { v: '10.255.255.1:100', m: 4 }, { v: '1500' }]
          ],
          sel: 0,
          notes: [
            'Кнопка создания VPLS',
            'Имя интерфейса — добавляется в bridge',
            'Loopback-адрес второго PE-роутера',
            'VPLS ID должен совпадать на обеих сторонах'
          ]
        }],
        check: [{ d: 'терминал', c: '/interface vpls print detail\n/mpls ldp neighbor print\n/interface bridge port print' }],
        warn: 'VPLS без фильтрации широковещания легко устраивает шторм на две площадки сразу. Включите Bridge → Filters или storm control.',
        mistakes: [
          'VPLS ID не совпадает на сторонах — туннель не поднимается.',
          'MTU 1500 на магистрали — крупные кадры теряются.',
          'VPLS добавлен в bridge с STP, отсутствующим на другой стороне — петля.'
        ]
      },
      {
        id: 'mpls-troubleshoot', t: 'MPLS: почему не поднимается и как смотреть', lvl: 3,
        path: 'MPLS → Forwarding / Log', tags: ['mpls', 'диагностика', 'ldp', 'vpls'],
        purpose: 'MPLS ломается тихо: интерфейс включён, а трафик идёт по IP. Проверка идёт по цепочке: IP-связность loopback → сессия LDP → таблица меток → интерфейс VPLS → bridge.',
        usage: [
          'Метки не появляются после включения LDP.',
          'VPLS поднят, но ARP между площадками не работает.',
          'После смены адресации перестал работать MPLS-транзит.'
        ],
        pros: [
          'Проверка по шагам отсекает 90 % причин за 10 минут.',
          'Счётчики интерфейсов показывают, доходят ли пакеты.',
          'Лог с топиком ldp/mpls содержит точную причину отказа.'
        ],
        cons: [
          'Нет визуального «статуса туннеля» как у WireGuard.',
          'Часть ошибок видна только на обеих сторонах сразу.',
          'Требует понимания транспортной сети.'
        ],
        steps: [
          { t: 'Связность', d: '`/ping 10.255.255.2 src-address=10.255.255.1` — если не проходит, дальше смотреть бессмысленно.' },
          { t: 'LDP', d: '`/mpls ldp neighbor print` — состояние operational? Если нет, проверьте firewall UDP/TCP 646.' },
          { t: 'Метки', d: '`/mpls forwarding-table print` — есть ли записи для префиксов соседа.' },
          { t: 'VPLS', d: '`/interface vpls print` — состояние running, счётчики Rx/Tx растут.' },
          { t: 'Логи', d: 'System → Logging: включите топики `ldp` и `mpls`; в Log ищите `session down`, `no route to transport address`.' }
        ],
        scenes: [{
          path: 'MPLS → Forwarding', win: 'MPLS', tabs: ['MPLS', 'Forwarding', 'LDP'], tab: 'Forwarding', noTools: true,
          cols: [{ t: 'Label', w: 90 }, { t: 'Destination', w: 170 }, { t: 'Nexthop', w: 150 }, { t: 'Interface', w: 140 }],
          rows: [
            [{ v: '17', m: 1 }, { v: '192.168.20.0/24', m: 2 }, { v: '10.255.255.2', m: 3 }, { v: 'ether1-transit', m: 4 }]
          ],
          sel: 0,
          notes: [
            'Локальная метка для префикса',
            'Удалённая подсеть',
            'Адрес следующего узла (loopback соседа)',
            'Транзитный интерфейс магистрали'
          ]
        }],
        check: [{ d: 'терминал', c: '/mpls ldp neighbor print detail\n/mpls forwarding-table print\n/interface vpls print stats\n/log print where topics~"ldp"' }],
        warn: 'Не включайте топик debug на MPLS в рабочее время — объём лога может забить диск за минуты.',
        mistakes: [
          'Проверяют VPLS, не проверив ping до loopback соседа.',
          'LDP-сессия поднята, но firewall режет метки на транзитном интерфейсе.',
          'MTU не согласован — «работает ping, не работает передача файлов».'
        ]
      }
    ]
  };

  // вставляем MPLS после MPLS-зависимых разделов (после WireGuard, перед WiFi)
  var at = -1;
  for (var i = 0; i < D.length; i++) if (D[i].id === 'wg') { at = i; break; }
  if (at >= 0) D.splice(at + 1, 0, mpls);
  else D.push(mpls);
})();
