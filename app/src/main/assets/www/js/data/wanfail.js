/* wanfail.js — резервный интернет с проверкой каждого канала своим пингом.
   Это «взрослая» версия задачи task-failover: там netwatch пингует один адрес
   и дёргает distance, из-за чего роутер не знает, жив ли резерв, и возвращается
   на первом же ответе (получаются «качели»). Здесь у каждого канала своя проба
   (1.1.1.1 — основной, 8.8.8.8 — резервный), привязанная к каналу через mangle
   и отдельные таблицы маршрутизации, а возврат — только после устойчивой связи.
   Тот же конфиг собирает мастер: «Резервный интернет» → два провайдера. */
(function () {
  'use strict';
  if (!window.DATA) window.DATA = [];
  if (!window.DATA[0]) window.DATA.push({ id: 'wan', t: 'Сеть и интернет', items: [] });
  if (!window.DATA[1]) window.DATA.push({ id: 'task', t: 'Задачи', items: [] });

  const SCRIPT = [
    '# wan-failover: переключение на резервный канал по пингу, без «качелей».',
    '# Проба каждого канала идёт через свою таблицу (mangle + probe-wan1/2),',
    '# поэтому видно, какой провайдер жив, даже когда трафик идёт через другой.',
    ':local wan1If "ether1"',
    ':local wan2If "lte1"',
    ':local p1a "1.1.1.1"',
    ':local p2a "8.8.8.8"',
    '# fails — сколько проверок подряд без ответа считается падением (2 × 10 с = 20 с)',
    '# ups — сколько проверок подряд с ответом нужно для возврата (6 × 10 с = 60 с)',
    ':local fails 2',
    ':local ups 6',
    ':global wanMode',
    ':global wanBad',
    ':global wanGood',
    ':if ([:typeof $wanMode] = "nothing") do={:set wanMode "main"}',
    ':if ([:typeof $wanBad] = "nothing") do={:set wanBad 0}',
    ':if ([:typeof $wanGood] = "nothing") do={:set wanGood 0}',
    '# 1. Шлюз канала знает только сам роутер, поэтому служебный маршрут',
    '#    для пробы скрипт создаёт и обновляет сам.',
    ':local gw ""',
    ':local pz ""',
    ':do {',
    ':foreach r in=[/ip route find where dst-address="0.0.0.0/0" and gateway~$wan1If] do={',
    ':set pz [/ip route get $r gateway]',
    '}',
    '} on-error={}',
    ':if ([:typeof $pz] = "str") do={',
    ':local cut [:find $pz "%"]',
    ':if ([:typeof $cut] = "num") do={:set gw [:pick $pz 0 $cut]} else={:set gw $pz}',
    '}',
    ':local gw2 ""',
    ':local pz2 ""',
    ':do {',
    ':foreach r in=[/ip route find where dst-address="0.0.0.0/0" and gateway~$wan2If] do={',
    ':set pz2 [/ip route get $r gateway]',
    '}',
    '} on-error={}',
    ':if ([:typeof $pz2] = "str") do={',
    ':local cut2 [:find $pz2 "%"]',
    ':if ([:typeof $cut2] = "num") do={:set gw2 [:pick $pz2 0 $cut2]} else={:set gw2 $pz2}',
    '}',
    ':if ($gw != "") do={',
    ':local rt [/ip route find where routing-table="probe-wan1"]',
    ':if ([:len $rt] = 0) do={',
    '/ip route add dst-address=0.0.0.0/0 gateway=$gw routing-table=probe-wan1 distance=1 comment="wan-failover probe-route 1"',
    '} else={',
    ':if ([/ip route get ($rt->0) gateway] != $gw) do={/ip route set ($rt->0) gateway=$gw}',
    '}',
    '}',
    ':if ($gw2 != "") do={',
    ':local rt2 [/ip route find where routing-table="probe-wan2"]',
    ':if ([:len $rt2] = 0) do={',
    '/ip route add dst-address=0.0.0.0/0 gateway=$gw2 routing-table=probe-wan2 distance=1 comment="wan-failover probe-route 2"',
    '} else={',
    ':if ([/ip route get ($rt2->0) gateway] != $gw2) do={/ip route set ($rt2->0) gateway=$gw2}',
    '}',
    '}',
    '# 2. Параллельная проверка: каждый пинг уходит в свой канал',
    ':local p1 0',
    ':local p2 0',
    ':if ($gw != "") do={:set p1 [/ping $p1a count=3 interval=200ms]}',
    ':if ($gw2 != "") do={:set p2 [/ping $p2a count=3 interval=200ms]}',
    '# 3. Серии: любой промах обнуляет счётчик возврата (защита от «качелей»)',
    ':if ($p1 > 0) do={:set wanGood ($wanGood + 1); :set wanBad 0} else={:set wanBad ($wanBad + 1); :set wanGood 0}',
    '# 4. Переключение: упал основной и жив резервный — уходим на резерв',
    ':if ($wanMode = "main") do={',
    ':if ($wanBad >= $fails) do={',
    ':if ($p2 > 0) do={',
    '/ip dhcp-client set [find interface=ether1] default-route-distance=20',
    ':set wanMode "backup"',
    ':log warning "wan-failover: основной канал не отвечает — включён резервный"',
    '} else={',
    ':log error "wan-failover: не отвечает ни основной, ни резервный канал"',
    '}',
    '}',
    '} else={',
    '# вернулись, только когда основной отвечает $ups проверок подряд',
    ':if ($wanGood >= $ups) do={',
    '/ip dhcp-client set [find interface=ether1] default-route-distance=1',
    ':set wanMode "main"',
    ':log info "wan-failover: основной канал устойчив — вернулся на него"',
    '}',
    '}'
  ];

  const item = {
    id: 'task-wan-failover',
    t: 'Резервный интернет: два провайдера, переключение по пингу',
    lvl: 2,
    path: 'Routing → Tables · IP → Firewall → Mangle · IP → Routes · System → Scripts · System → Scheduler',
    tags: ['failover', 'резервный канал', 'два провайдера', 'lte', 'pppoe', 'routing table', 'mangle', 'пинг'],
    purpose: 'Два интернет-канала: основной и резервный. Роутер постоянно пингует по одному ' +
      'адресу через основной канал и по другому — через резервный. Если по основному ответов нет ' +
      'двадцать секунд, трафик уходит на резерв. Возврат — только когда основной отвечает ' +
      'непрерывно целую минуту. Так роутер не «дёргается» туда-обратно и не тратит трафик ' +
      'резервного канала на бесконечные проверки: проверка каждого канала идёт своим путём ' +
      'одновременно с работой.',
    usage: [
      'Офис или магазин, где простой интернета дороже второго канала.',
      'Основной канал — кабель (DHCP или PPPoE), резервный — LTE-модем.',
      'Два проводных провайдера: оба по DHCP или один из них PPPoE.',
      'Случай, когда провайдер «теряет» интернет, но линк остаётся поднятым — обрыв видно только по пингу.'
    ],
    pros: [
      'Проверяется реальная доступность интернета, а не только наличие линка.',
      'Каждый канал проверяется отдельно и постоянно: сразу видно, какой провайдер виноват.',
      'Возврат после устойчивой связи — нет «качелей» при плавающем канале.',
      'Работает с DHCP, PPPoE и LTE: шлюз скрипт находит сам.',
      'Никаких внешних сервисов и лишних пакетов — только RouterOS.'
    ],
    cons: [
      'Служебный пинг раз в 10 секунд расходует немного трафика (на LTE это считанные мегабайты в месяц).',
      'Переключение не мгновенное: по умолчанию 20 секунд — это плата за отсутствие ложных срабатываний.',
      'Нужно один раз аккуратно скопировать скрипт: ошибка в нём оставит без интернета оба канала.'
    ],
    warn: 'Не проверяйте оба канала одним и тем же адресом: тогда пинг нельзя направить в два ' +
      'разных канала, и «резервный» окажется непроверенным. Основной адрес — 1.1.1.1, резервный — ' +
      '8.8.8.8 (или адрес шлюза провайдера, если он не блокирует ICMP).',
    steps: [
      {
        t: 'Как это работает: две дороги и два разведчика',
        d: 'Из дома в город ведут две дороги: главная (основной провайдер) и запасная (резервный). ' +
          'Раз в 10 секунд роутер отправляет разведчика по главной дороге (пинг 1.1.1.1) и второго — ' +
          'по запасной (пинг 8.8.8.8). Разведчики идут одновременно, поэтому роутер всегда знает, ' +
          'жива ли каждая дорога, даже когда весь трафик идёт по одной из них. ' +
          'Главный разведчик не вернулся 2 раза подряд (20 секунд) — трафик уходит на запасную дорогу. ' +
          'Вернулся 6 раз подряд (60 секунд) — трафик возвращается на главную. ' +
          'Такая задержка возврата и есть защита от «качелей»: канал должен доказать, что он стабилен.',
        noScene: true
      },
      {
        t: 'Найдите в Winbox оба канала',
        d: 'Сначала выясните имена интерфейсов — они понадобятся дальше. ' +
          '1 — откройте в дереве слева группу **Interfaces**. ' +
          '2 — пункт **Interface**: здесь список всех портов. ' +
          '3 — основной канал: почти всегда `ether1` (если вход по PPPoE, интерфейс будет называться ' +
          '`wan-pppoe`, а `ether1` останется «под ним»). ' +
          '4 — порт, куда воткнут резервный кабель: возьмите свободный, например `ether5`. ' +
          '5 — вставленный LTE-модем виден как `lte1`. ' +
          '6 — кнопка Find понадобится, если интерфейсов много. Запишите имена: дальше в статье — ' +
          '`ether1` и `lte1`, подставьте свои.',
        sc: {
          marks: 1,
          cap: 'Interfaces: где смотреть имена каналов',
          path: 'Interfaces → Interface', menu: { grp: 1, sub: 2 },
          win: 'Interfaces',
          tabs: ['Interface', 'Interface List', 'Ethernet', 'VLAN', 'Bonding', 'Bridge', 'LTE'],
          tab: 'Interface',
          cols: [{ t: 'Name', w: 104 }, { t: 'Type', w: 70 }, { t: 'Actual MTU', w: 88 },
            { t: 'Running', w: 74 }, { t: 'Comment', w: 214 }],
          rows: [
            [{ v: 'ether1', m: 3 }, { v: 'ether' }, { v: '1500' }, { v: 'yes', c: 'ok' }, 'основной провайдер — кабель'],
            [{ v: 'ether5', m: 4 }, { v: 'ether' }, { v: '1500' }, { v: 'yes' }, 'свободный порт под резервный кабель'],
            [{ v: 'lte1', m: 5 }, { v: 'lte' }, { v: '1500' }, { v: 'yes' }, 'резерв — LTE-модем'],
            ['bridge-lan', 'bridge', '1500', 'yes', 'локальная сеть']
          ],
          sel: 0,
          tools: [{ t: '⌕', m: 6 }],
          notes: [
            '1 — откройте группу Interfaces в дереве меню',
            '2 — пункт Interface: список портов и туннелей',
            '3 — основной канал (обычно ether1)',
            '4 — порт под резервный кабель',
            '5 — LTE-модем определяется как lte1',
            '6 — Find: быстрый поиск интерфейса по имени'
          ]
        }
      },
      {
        t: 'Резервный канал № 1 — кабель с DHCP',
        d: 'Самый частый случай: второй провайдер выдаёт адрес автоматически. ' +
          '1 — в дереве меню откройте **IP**. ' +
          '2 — пункт **DHCP Client**. ' +
          '3 — в списке уже есть строка основного канала: у неё Default Route Distance = 1. ' +
          '4 — нажмите **+** в панели окна — откроется New DHCP Client. ' +
          '5 — Interface: порт резерва (`ether5`). ' +
          '6 — Add Default Route: **yes**, иначе резерв не станет маршрутом по умолчанию. ' +
          '7 — Default Route Distance: **2** — резерв всегда «второй». ' +
          '8 — OK. Через несколько секунд в строке появится адрес и слово bound.',
        sc: {
          marks: 1,
          cap: 'IP → DHCP Client: включаем резервный канал',
          path: 'IP → DHCP Client', menu: { grp: 1, sub: 2 },
          win: 'DHCP Client',
          cols: [{ t: 'Interface', w: 92 }, { t: 'Address', w: 122 }, { t: 'Gateway', w: 108 },
            { t: 'Default Route Distance', w: 146 }, { t: 'Status', w: 92 }],
          rows: [[{ v: 'ether1' }, { v: '203.0.113.45/24' }, { v: '203.0.113.1' }, { v: '1', m: 3 }, { v: 'bound', c: 'ok' }]],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 4 }],
          form: {
            title: 'New DHCP Client',
            fields: [
              { l: 'Interface', v: 'ether5', type: 'select', m: 5 },
              { l: 'Add Default Route', v: 'yes', m: 6 },
              { l: 'Default Route Distance', v: '2', m: 7 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 8 }]
          },
          notes: [
            '1 — группа IP в дереве меню',
            '2 — пункт DHCP Client',
            '3 — основной канал: Distance = 1',
            '4 — кнопка «+»: новый DHCP-клиент',
            '5 — Interface: порт резерва',
            '6 — Add Default Route: yes',
            '7 — Default Route Distance: 2 (резерв второй)',
            '8 — OK: применить'
          ]
        }
      },
      {
        t: 'Резервный канал № 2 — PPPoE (логин и пароль)',
        d: 'Если второй провайдер выдаёт логин и пароль, канал поднимается через PPPoE. ' +
          '1 — в дереве откройте **PPP**, 2 — пункт **Interfaces**. ' +
          '3 — нажмите **+** — откроется диалог, выберите тип **PPPoE Client**. ' +
          '4 — сначала вкладка **General**: Name (например `wan2-pppoe`) и Interface (`ether5`). ' +
          '5 — затем вкладка **Dial Out**, там логин и пароль: 6 — User, 7 — Password. ' +
          '8 — Add Default Route: **yes**. ' +
          '9 — Default Route Distance: **2**. ' +
          '10 — OK. Если логин верный, интерфейс станет running, а в IP → Address появится адрес.',
        sc: {
          marks: 1,
          cap: 'PPP: клиент PPPoE для резервного канала',
          path: 'PPP → Interfaces', menu: { grp: 1, sub: 2 },
          win: 'PPP',
          tabs: ['Interfaces', 'Secrets', 'Profiles', 'PPPoE Server', 'L2TP Server', 'Active Connections'],
          tab: 'Interfaces',
          cols: [{ t: 'Name', w: 116 }, { t: 'Type', w: 84 }, { t: 'MTU', w: 60 },
            { t: 'Running', w: 74 }, { t: 'Comment', w: 200 }],
          rows: [[{ v: 'wan2-pppoe' }, { v: 'pppoe-out' }, { v: '1480' }, { v: 'yes', c: 'ok' }, 'резерв — PPPoE']],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'PPPoE Client', tab: 'Dial Out', tabMarks: { General: 4, 'Dial Out': 5 },
            fields: [
              { l: 'Name', v: 'wan2-pppoe', t: 'General' },
              { l: 'Interface', v: 'ether5', type: 'select', t: 'General' },
              { l: 'User', v: 'login-ot-provaydera', t: 'Dial Out', m: 6 },
              { l: 'Password', v: '••••••••', t: 'Dial Out', m: 7 },
              { l: 'Add Default Route', v: 'yes', t: 'Dial Out', m: 8 },
              { l: 'Default Route Distance', v: '2', t: 'Dial Out', m: 9 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 10 }]
          },
          notes: [
            '1 — группа PPP в дереве меню',
            '2 — пункт Interfaces',
            '3 — «+»: создать подключение',
            '4 — вкладка General: имя и порт',
            '5 — вкладка Dial Out: здесь логин и пароль',
            '6 — User из договора',
            '7 — Password из договора',
            '8 — Add Default Route: yes',
            '9 — Default Route Distance: 2 (резерв второй)',
            '10 — OK'
          ]
        }
      },
      {
        t: 'Резервный канал № 3 — LTE-модем',
        d: 'Модем вставляют в USB, он определяется как `lte1`. ' +
          'Откройте **Interfaces**, вкладка **LTE**: там задаётся APN (имя точки доступа) провайдера, ' +
          'а у некоторых модемов — PIN. Без APN модем не выйдет в интернет. ' +
          'Дальше два варианта, оба рабочие. ' +
          '**Проще** — IP → DHCP Client → `+`, Interface=`lte1`, Add Default Route=yes, ' +
          'Default Route Distance=**2** (как в шаге 3, только интерфейс другой). ' +
          '**Если адрес выдаёт сам модем** (статический) — статический маршрут, как на картинке: ' +
          '1 — откройте **IP**, 2 — пункт **Routes**. ' +
          '3 — нажмите **+** → New Route. ' +
          '4 — Dst. Address=`0.0.0.0/0` («весь интернет»). ' +
          '5 — Gateway=`lte1` (для LTE и PPPoE вместо IP-шлюза пишут имя интерфейса). ' +
          '6 — Distance=**2**. 7 — OK.',
        sc: {
          marks: 1,
          cap: 'IP → Routes: маршрут в интернет через LTE-модем',
          path: 'IP → Routes', menu: { grp: 1, sub: 2 },
          win: 'Route List', tabs: ['Routes', 'Nexthops'], tab: 'Routes',
          cols: [{ t: 'A', w: 24 }, { t: 'Dst. Address', w: 110 }, { t: 'Gateway', w: 130 },
            { t: 'Distance', w: 76 }, { t: 'Routing Table', w: 104 }, { t: 'Comment', w: 176 }],
          rows: [
            [{ v: 'AS', c: 'ok' }, { v: '0.0.0.0/0' }, { v: '203.0.113.1' }, { v: '1' }, 'main', 'основной канал'],
            [{ v: 'AS', c: 'ok' }, { v: '0.0.0.0/0' }, { v: 'lte1' }, { v: '2' }, 'main', 'резерв — LTE']
          ],
          sel: 1,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'New Route',
            fields: [
              { l: 'Dst. Address', v: '0.0.0.0/0', m: 4 },
              { l: 'Gateway', v: 'lte1', m: 5 },
              { l: 'Distance', v: '2', m: 6 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 7 }]
          },
          notes: [
            '1 — группа IP',
            '2 — пункт Routes: таблица маршрутов',
            '3 — «+» → New Route',
            '4 — Dst. Address: 0.0.0.0/0 — весь интернет',
            '5 — Gateway: имя LTE-интерфейса',
            '6 — Distance = 2: резерв уступает основному каналу',
            '7 — OK'
          ]
        }
      },
      {
        t: 'Проверьте два маршрута по умолчанию',
        d: 'IP → Routes. Должно быть две строки `0.0.0.0/0` в таблице main: ' +
          '1 — у основного Distance = 1, 2 — у резервного Distance = 2. ' +
          '3 — буква A слева = маршрут активен; активен всегда тот, у кого меньше Distance. ' +
          '4 — колонка Routing Table: обычный трафик живёт в main, пробы пойдут в отдельные таблицы ' +
          '(создадим их в следующем шаге). Если у обоих маршрутов Distance = 1, сначала исправьте ' +
          'это — иначе скрипту нечего переключать.',
        sc: {
          marks: 1,
          cap: 'IP → Routes: два маршрута — основной и резервный',
          path: 'IP → Routes',
          win: 'Route List', tabs: ['Routes', 'Nexthops'], tab: 'Routes',
          cols: [{ t: 'A', w: 24 }, { t: 'Dst. Address', w: 110 }, { t: 'Gateway', w: 128 },
            { t: 'Distance', w: 76 }, { t: 'Routing Table', w: 104 }, { t: 'Comment', w: 176 }],
          rows: [
            [{ v: 'AS', c: 'ok', m: 3 }, { v: '0.0.0.0/0' }, { v: '203.0.113.1' }, { v: '1', m: 1 }, { v: 'main', m: 4 }, 'основной канал'],
            [{ v: 'S' }, { v: '0.0.0.0/0' }, { v: 'lte1' }, { v: '2', m: 2 }, 'main', 'резервный канал']
          ],
          sel: 0,
          notes: [
            '1 — основной маршрут: Distance = 1',
            '2 — резервный маршрут: Distance = 2',
            '3 — A = активен, S = статический',
            '4 — таблица main: по ней ходит весь обычный трафик'
          ]
        }
      },
      {
        t: 'Создайте две таблицы для проб',
        d: 'Проба каждого канала должна идти своим путём, поэтому нужны две отдельные таблицы маршрутизации. ' +
          '1 — в дереве меню откройте **Routing**, 2 — пункт **Table**. ' +
          '3 — в окне уже есть строка main — это обычный трафик, её не трогаем. ' +
          '4 — нажмите **+**: 5 — Name=`probe-wan1`, 6 — FIB включён (галочка), 7 — OK. ' +
          'Повторите ещё раз для `probe-wan2`. Это не «второй интернет»: в этих таблицах будут жить ' +
          'только служебные пинги-разведчики.',
        sc: {
          marks: 1,
          cap: 'Routing → Table: две таблицы только для проб',
          path: 'Routing → Table', menu: { grp: 1, sub: 2 },
          win: 'Routing', tabs: ['Table', 'Rules', 'Nexthops', 'Filters', 'BGP', 'OSPF'], tab: 'Table',
          cols: [{ t: 'Name', w: 150 }, { t: 'FIB', w: 70 }, { t: 'Comment', w: 300 }],
          rows: [
            [{ v: 'main', m: 3 }, { v: 'yes' }, 'обычный трафик'],
            [{ v: 'probe-wan1' }, { v: 'yes' }, 'проба основного канала (1.1.1.1)'],
            [{ v: 'probe-wan2' }, { v: 'yes' }, 'проба резервного канала (8.8.8.8)']
          ],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 4 }],
          form: {
            title: 'New Table',
            fields: [
              { l: 'Name', v: 'probe-wan1', m: 5 },
              { l: 'FIB', v: 'yes', m: 6 },
              { l: 'Comment', v: 'проба основного канала' }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 7 }]
          },
          notes: [
            '1 — группа Routing',
            '2 — пункт Table',
            '3 — main: рабочая таблица, её не меняем',
            '4 — «+»: новая таблица',
            '5 — Name: probe-wan1 (для второй — probe-wan2)',
            '6 — FIB включён',
            '7 — OK'
          ]
        }
      },
      {
        t: 'Правило mangle: какой пинг куда отправить',
        d: 'Теперь скажем роутеру: «пинг на 1.1.1.1 — в таблицу probe-wan1». ' +
          '1 — в дереве откройте **IP**, 2 — пункт **Firewall**, вкладка **Mangle** уже перед вами. ' +
          '3 — нажмите **+** — откроется New Mangle Rule. ' +
          '4 — вкладка General, Chain = **output** (это трафик самого роутера, то есть наши пинги; ' +
          'forward здесь был бы ошибкой). ' +
          '5 — Dst. Address = `1.1.1.1`. ' +
          '6 — дальше вкладка **Action**: действие задаётся там, переходим в следующем шаге.',
        sc: {
          marks: 1,
          cap: 'IP → Firewall → Mangle: New Mangle Rule, вкладка General',
          path: 'IP → Firewall → Mangle', menu: { grp: 1, sub: 2 },
          win: 'IP Firewall',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
          tab: 'Mangle', tabMark: 'Action', tabMarkN: 6,
          cols: [{ t: 'Chain', w: 72 }, { t: 'Dst. Address', w: 112 }, { t: 'Action', w: 104 },
            { t: 'New Routing Mark', w: 124 }, { t: 'Comment', w: 176 }],
          rows: [['output', '1.1.1.1', 'mark routing', 'probe-wan1', 'wan-failover probe 1']],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'New Mangle Rule', tab: 'General',
            fields: [
              { l: 'Chain', v: 'output', type: 'select', t: 'General', m: 4 },
              { l: 'Dst. Address', v: '1.1.1.1', t: 'General', m: 5 },
              { l: 'Action', v: 'mark routing', type: 'select', t: 'Action' },
              { l: 'New Routing Mark', v: 'probe-wan1', type: 'select', t: 'Action' },
              { l: 'Passthrough', v: 'no', t: 'Action' }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK' }]
          },
          notes: [
            '1 — группа IP',
            '2 — пункт Firewall, вкладка Mangle',
            '3 — «+»: новое правило',
            '4 — Chain = output: трафик самого роутера',
            '5 — Dst. Address = 1.1.1.1: адрес пробы',
            '6 — вкладка Action: там задаём действие'
          ]
        }
      },
      {
        t: 'Действие правила: пометить маршрут',
        d: 'На вкладке **Action** того же диалога: ' +
          '1 — Action = **mark routing** («пометить маршрут»), ' +
          '2 — New Routing Mark = `probe-wan1` (таблица из шага 6), ' +
          '3 — Passthrough = **no** (правило решает само, дальше не передаём), ' +
          '4 — OK. Второе правило делается так же, но с адресом `8.8.8.8` и меткой `probe-wan2`.',
        sc: {
          marks: 1,
          cap: 'New Mangle Rule, вкладка Action: mark routing',
          path: 'IP → Firewall → Mangle',
          win: 'IP Firewall',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
          tab: 'Mangle',
          cols: [{ t: 'Chain', w: 72 }, { t: 'Dst. Address', w: 112 }, { t: 'Action', w: 104 },
            { t: 'New Routing Mark', w: 124 }, { t: 'Comment', w: 176 }],
          rows: [['output', '1.1.1.1', 'mark routing', 'probe-wan1', 'wan-failover probe 1']],
          sel: 0,
          form: {
            title: 'New Mangle Rule', tab: 'Action',
            fields: [
              { l: 'Chain', v: 'output', type: 'select', t: 'General' },
              { l: 'Dst. Address', v: '1.1.1.1', t: 'General' },
              { l: 'Action', v: 'mark routing', type: 'select', t: 'Action', m: 1 },
              { l: 'New Routing Mark', v: 'probe-wan1', type: 'select', t: 'Action', m: 2 },
              { l: 'Passthrough', v: 'no', t: 'Action', m: 3 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 4 }]
          },
          notes: [
            '1 — Action = mark routing',
            '2 — New Routing Mark = probe-wan1',
            '3 — Passthrough = no',
            '4 — OK: правило готово'
          ]
        }
      },
      {
        t: 'Второе правило и проверка списка',
        d: 'Вернитесь в список Mangle: 1 — должно быть первое правило (output, 1.1.1.1, mark routing, ' +
          'probe-wan1), 2 — второе, точно такое же, но с 8.8.8.8 и probe-wan2. ' +
          'Быстрее не заполнять второе вручную, а выделить первое и нажать **Copy** в правой панели окна, ' +
          'затем поправить два поля. Пустой счётчик Bytes — нормально: пинг пойдёт, когда заработает скрипт.',
        sc: {
          marks: 1,
          cap: 'Mangle: два правила для двух проб',
          path: 'IP → Firewall → Mangle',
          win: 'IP Firewall',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
          tab: 'Mangle',
          cols: [{ t: 'Chain', w: 66 }, { t: 'Dst. Address', w: 106 }, { t: 'Action', w: 100 },
            { t: 'New Routing Mark', w: 118 }, { t: 'Bytes', w: 76 }, { t: 'Comment', w: 160 }],
          rows: [
            [{ v: 'output', m: 1 }, { v: '1.1.1.1' }, { v: 'mark routing' }, { v: 'probe-wan1' }, { v: '0 B' }, 'wan-failover probe 1'],
            [{ v: 'output', m: 2 }, { v: '8.8.8.8' }, { v: 'mark routing' }, { v: 'probe-wan2' }, { v: '0 B' }, 'wan-failover probe 2']
          ],
          sel: 0,
          rightTools: [{ t: 'Copy', i: '⧉', m: 3 }, { t: 'Find', i: '⌕' }],
          notes: [
            '1 — проба основного канала: 1.1.1.1 → probe-wan1',
            '2 — проба резервного: 8.8.8.8 → probe-wan2',
            '3 — Copy: скопировать правило и поправить два поля'
          ]
        }
      },
      {
        t: 'Скрипт проверки: System → Scripts',
        d: 'Скрипт — это «мозг» схемы: пингует, считает серии и переключает маршруты. ' +
          '1 — откройте **System**, 2 — пункт **Scripts**, 3 — нажмите **+**. ' +
          '4 — Name = `wan-failover`. ' +
          '5 — Policy отметьте **read**, **write**, **test** (без write скрипт не сможет менять маршрут). ' +
          '6 — поле **Source**: вставьте туда тело скрипта из блока «Готовый конфиг» внизу статьи ' +
          '(всё, что начинается с `# wan-failover`). Копируйте целиком: RouterOS строг к кавычкам. ' +
          '7 — OK. Кнопка Run Script запускает скрипт один раз вручную.',
        sc: {
          marks: 1,
          cap: 'System → Scripts: куда вставить тело скрипта',
          path: 'System → Scripts', menu: { grp: 1, sub: 2 },
          win: 'System', tabs: ['Scripts', 'Scheduler', 'Logging', 'Users', 'Files'], tab: 'Scripts',
          cols: [{ t: 'Name', w: 130 }, { t: 'Owner', w: 76 }, { t: 'Policy', w: 150 },
            { t: 'Run Count', w: 80 }, { t: 'Comment', w: 180 }],
          rows: [[{ v: 'wan-failover' }, { v: 'admin' }, { v: 'read,write,test' }, { v: '0' }, 'переключение каналов']],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'New Script',
            fields: [
              { l: 'Name', v: 'wan-failover', m: 4 },
              { l: 'Policy', v: 'read, write, test', m: 5 },
              { l: 'Source', v: '# wan-failover: переключение на резервный канал по пингу\n:local wan1If "ether1"\n:local wan2If "lte1"\n:local fails 2\n:local ups 6\n… тело скрипта целиком из блока «Готовый конфиг» …', type: 'area', m: 6 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 7 }]
          },
          notes: [
            '1 — группа System',
            '2 — пункт Scripts',
            '3 — «+»: новый скрипт',
            '4 — Name: wan-failover',
            '5 — Policy: read, write, test',
            '6 — Source: тело скрипта из блока «Готовый конфиг»',
            '7 — OK'
          ]
        }
      },
      {
        t: 'Планировщик: запускать каждые 10 секунд',
        d: 'Скрипт сам по себе не работает — его надо запускать по расписанию. ' +
          '1 — откройте **System**, 2 — пункт **Scheduler**, 3 — нажмите **+**. ' +
          '4 — Name = `wan-failover`. ' +
          '5 — Start Time = **startup** (задача стартует сразу после включения роутера). ' +
          '6 — Interval = `00:00:10`. ' +
          '7 — On Event = `wan-failover` (имя скрипта из прошлого шага). ' +
          '8 — OK. С этого момента роутер проверяет оба канала круглосуточно.',
        sc: {
          marks: 1,
          cap: 'System → Scheduler: запуск скрипта по таймеру',
          path: 'System → Scheduler', menu: { grp: 1, sub: 2 },
          win: 'System', tabs: ['Scripts', 'Scheduler', 'Logging', 'Users', 'Files'], tab: 'Scheduler',
          cols: [{ t: 'Name', w: 124 }, { t: 'Start Time', w: 100 }, { t: 'Interval', w: 92 },
            { t: 'On Event', w: 124 }, { t: 'Run Count', w: 86 }, { t: 'Comment', w: 150 }],
          rows: [[{ v: 'wan-failover' }, { v: 'startup' }, { v: '00:00:10' }, { v: 'wan-failover' }, { v: '8640' }, 'проверка каналов']],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'New Scheduler',
            fields: [
              { l: 'Name', v: 'wan-failover', m: 4 },
              { l: 'Start Time', v: 'startup', m: 5 },
              { l: 'Interval', v: '00:00:10', m: 6 },
              { l: 'On Event', v: 'wan-failover', m: 7 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 8 }]
          },
          notes: [
            '1 — группа System',
            '2 — пункт Scheduler',
            '3 — «+»: новая задача',
            '4 — Name: wan-failover',
            '5 — Start Time: startup',
            '6 — Interval: 00:00:10 (раз в 10 секунд)',
            '7 — On Event: имя скрипта',
            '8 — OK'
          ]
        }
      },
      {
        t: 'Первый запуск и чтение лога',
        d: 'Нажмите в System → Scripts кнопку **Run Script** (или выполните `:execute wan-failover` ' +
          'в терминале), затем откройте **Log** в дереве меню. ' +
          '1 — строки с меткой `wan-failover` пишет наш скрипт: они появляются только при смене состояния. ' +
          '2 — topics подсказывают важность: info — вернулись на основной канал, warning — ушли на резерв, ' +
          'error — не отвечают оба канала. ' +
          '3 — время события: по нему видно, через сколько секунд роутер среагировал. ' +
          'Пустой лог после первого запуска — это хорошо: оба канала живы, переключаться некуда.',
        sc: {
          marks: 1,
          cap: 'Log: что пишет скрипт',
          path: 'Log',
          win: 'Log', noTools: true,
          cols: [{ t: 'Time', w: 96 }, { t: 'Topics', w: 120 }, { t: 'Message', w: 556 }],
          rows: [
            [{ v: 'nov/07 09:14:02' }, { v: 'script,info ', m: 2 }, { v: 'wan-failover: основной канал устойчив — вернулся на него', m: 1 }],
            [{ v: 'nov/07 09:12:48', m: 3 }, { v: 'script,warning', m: 2 }, { v: 'wan-failover: основной канал не отвечает — включён резервный', m: 1 }]
          ],
          sel: 0,
          notes: [
            '1 — сообщения скрипта wan-failover',
            '2 — topics: info — вернулись, warning — ушли на резерв',
            '3 — время: сколько секунд роутер думал'
          ]
        }
      },
      {
        t: 'Испытание: выдерните кабель',
        d: 'Проверка на живом роутере важнее любых настроек. ' +
          '1 — выдерните кабель основного провайдера и засеките время: примерно через 20 секунд ' +
          '(две неудачные проверки) в логе появится «основной канал не отвечает — включён резервный», ' +
          'и страницы продолжат открываться через резерв. ' +
          '2 — вставьте кабель обратно: возврат случится не сразу, а примерно через минуту ' +
          '(шесть успешных проверок подряд) — в логе будет «основной канал устойчив — вернулся на него». ' +
          '3 — время в строках покажет точную реакцию. Если канал «мигает», возврат будет отложен — ' +
          'именно этого мы и добивались.',
        sc: {
          marks: 1,
          cap: 'Log после двух испытаний: уход на резерв и возврат',
          path: 'Log',
          win: 'Log', noTools: true,
          cols: [{ t: 'Time', w: 96 }, { t: 'Topics', w: 120 }, { t: 'Message', w: 556 }],
          rows: [
            [{ v: 'nov/07 10:03:11', m: 3 }, { v: 'script,info' }, { v: 'wan-failover: основной канал устойчив — вернулся на него', m: 2 }],
            [{ v: 'nov/07 10:01:08', m: 3 }, { v: 'script,warning' }, { v: 'wan-failover: основной канал не отвечает — включён резервный', m: 1 }]
          ],
          sel: 0,
          notes: [
            '1 — уход на резерв: 20 секунд без ответа',
            '2 — возврат: минута успешных пингов подряд',
            '3 — время события'
          ]
        }
      },
      {
        t: 'Пороги под себя: 20 секунд и минута',
        d: 'В теле скрипта всего две настройки: `:local fails 2` — сколько проверок подряд без ответа ' +
          'считать падением (2 × 10 с = 20 с), и `:local ups 6` — сколько успешных проверок подряд нужно ' +
          'для возврата (6 × 10 с = 60 с). Хотите реакцию быстрее — уменьшайте `fails`, но не до единицы: ' +
          'один потерянный пакет не должен ронять канал. Хотите спокойнее — увеличивайте `ups`. ' +
          'Правило простое: `ups` всегда больше `fails`, иначе получатся «качели».',
        noScene: true
      }
    ],
    scenes: [],
    configTitle: 'Тело скрипта — вставить в System → Scripts → New → Source',
    config: SCRIPT,
    check: [
      {
        d: 'оба канала и их пробы',
        c: '/routing table print\n/ip firewall mangle print where comment~"wan-failover"\n/ip route print where routing-table="probe-wan1"'
      },
      {
        d: 'кто сейчас главный и что в логе',
        c: '/log print where message~"wan-failover"\n/ip route print where dst-address=0.0.0.0/0 and routing-table=main\n:global wanMode; :put $wanMode'
      },
      {
        d: 'занят ли резерв (на LTE видно расход)',
        c: '/interface lte print detail\n/interface monitor-traffic lte1 once'
      }
    ],
    mistakes: [
      'Оба канала проверяются одним адресом — тогда оба пинга идут в один канал, и резервный остаётся непроверенным.',
      'Chain в mangle выбран `forward` вместо `output` — пинги самого роутера не помечаются, проверка идёт «не туда».',
      'У основного и резервного маршрута одинаковая Distance: маршруты прыгают, скрипт ни на что не влияет.',
      'Порог возврата меньше порога падения (`ups` < `fails`) — получаются «качели» на плавающем канале.',
      'Адрес проверки, который провайдер блокирует (ICMP), — постоянные ложные переключения. Возьмите 1.1.1.1 или шлюз провайдера.',
      'Тело скрипта вставлено в терминал как команда, а не в System → Scripts → Source: RouterOS поймёт его как набор отдельных команд. Копируйте тело в редактор скрипта либо соберите конфиг мастером.'
    ],
    next: ['task-failover', 'tool-netwatch-script', 'task-nat']
  };

  /* тело скрипта показываем отдельной статьёй-справкой: его удобно копировать
     в System → Scripts, не выдёргивая из большой строки конфига */
  item.scriptBody = SCRIPT.join('\n');
  window.DATA[1].items.push(item);
})();
