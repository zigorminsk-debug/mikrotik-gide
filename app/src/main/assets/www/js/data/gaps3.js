/* Дополнительные статьи: IPv6, политики маршрутизации, очереди, DHCP relay,
   контейнеры и восстановление через RoMON/Netinstall. */
(function () {
  'use strict';
  var D = window.DATA || [];
  function group(id) {
    for (var i = 0; i < D.length; i++) if (D[i].id === id) return D[i];
    return null;
  }
  var ipv6 = group('ipv6'), routing = group('routing'), queues = group('queues'),
    ip = group('ip'), tools = group('tools');
  if (!ipv6 || !routing || !queues || !ip || !tools) return;

  ipv6.items.push({
    id: 'ipv6-slaac',
    t: 'IPv6 → Addresses и ND: адреса, SLAAC и firewall',
    lvl: 2,
    path: 'IPv6 → IPv6 → Addresses, ND, Firewall',
    tags: ['ipv6', 'slaac', 'nd', 'адреса', 'firewall'],
    purpose: 'IPv6 в RouterOS включается двумя вещами: адресом на интерфейсе с advertise=yes и раздачей через Neighbor Discovery (ND). ' +
      'Клиенты сами собирают адрес из префикса — DHCPv6 для этого не нужен. Отдельная задача — firewall: в IPv6 нет NAT, ' +
      'поэтому правила пишутся явно, а ICMPv6 нельзя блокировать целиком.',
    usage: [
      'Провайдер выдал /64 или /56 — нужно раздать в LAN.',
      'Домашние устройства (Apple, Android, ТВ) сами берут IPv6 и хотят его использовать.',
      'Проверка, почему IPv6 «есть на роутере, но не на телефоне».',
      'Сайты с AAAA-записями открываются медленно — типичный симптом сломанного IPv6.'
    ],
    pros: [
      'SLAAC работает без DHCP-сервера и почти без настройки.',
      'Каждому устройству — уникальный адрес, NAT не нужен.',
      'Один /64 на сегмент — стандартная практика.'
    ],
    cons: [
      'Без firewall устройство в LAN доступно из интернета напрямую.',
      'Префикс от провайдера может меняться — нужен DHCPv6-PD и advertise из пула.',
      'Не все сервисы и мониторинги дружат с IPv6.'
    ],
    steps: [
      { t: 'Получить префикс', d: 'Если провайдер выдаёт префикс: /ipv6 dhcp-client add interface=ether1 pool-name=wan6 request=prefix add-default-route=yes. Пул появится в /ipv6 pool.', cmd: '/ipv6 dhcp-client add interface=ether1 pool-name=wan6 request=prefix add-default-route=yes\n/ipv6 pool print' },
      { t: 'Назначить адрес шлюза', d: 'Статический вариант: свой /64 на мосту. Из пула: from-pool=wan6 — адрес будет меняться вместе с префиксом провайдера.', cmd: '/ipv6 address add address=2001:db8:10::1/64 interface=bridge-lan advertise=yes\n# или из пула:\n# /ipv6 address add from-pool=wan6 interface=bridge-lan advertise=yes' },
      { t: 'Включить раздачу (ND)', d: 'Neighbor Discovery рассылает префикс и шлюз. ra-lifetime больше ra-interval, иначе клиенты будут терять маршрут.', cmd: '/ipv6 nd add interface=bridge-lan ra-interval=30s-60s ra-lifetime=1800s' },
      { t: 'Разобраться с типами адресов', d: 'fe80::/10 — link-local (есть всегда), 2001:db8::/32 — пример глобального, fc00::/7 — ULA для внутренних сетей, ::1 — loopback.' },
      { t: 'Закрыть firewall', d: 'Порядок: established/related → ICMPv6 → drop из WAN в input → forward: established, LAN, drop из WAN. Без последнего правила LAN-адреса открыты наружу.', cmd: '/ipv6 firewall filter add chain=input connection-state=established,related action=accept\n/ipv6 firewall filter add chain=input protocol=icmpv6 action=accept comment="ICMPv6 обязателен"\n/ipv6 firewall filter add chain=input in-interface-list=WAN action=drop\n/ipv6 firewall filter add chain=forward connection-state=established,related action=accept\n/ipv6 firewall filter add chain=forward in-interface-list=LAN action=accept\n/ipv6 firewall filter add chain=forward in-interface-list=WAN action=drop' },
      { t: 'Проверить клиента', d: 'На компьютере: ipconfig /all (Windows) или ip -6 addr (Linux). Должен быть адрес 2001:… и шлюз fe80::… роутера. На телефоне IPv6 виден в свойствах Wi-Fi.' },
      { t: 'Диагностика', d: 'Пинг с роутера, затем traceroute6, затем проверка, что в firewall нет общего drop до ICMPv6. Частая ошибка — правило drop all в input выше ICMPv6.' }
    ],
    table: {
      title: 'Адреса IPv6, которые встречаются чаще всего',
      head: ['Префикс', 'Что это', 'Где используется'],
      rows: [
        ['2000::/3', 'глобальные адреса', 'интернет, адреса провайдера'],
        ['fe80::/10', 'link-local', 'автоматически на каждом интерфейсе, шлюз по умолчанию'],
        ['fc00::/7', 'ULA (аналог приватных)', 'внутренние сети без выхода наружу'],
        ['ff02::1', 'все узлы сегмента', 'multicast, служебные рассылки'],
        ['::1/128', 'loopback', 'адрес самого роутера'],
        ['2001:db8::/32', 'документация', 'примеры в инструкциях, в реальной сети не используется']
      ]
    },
    config: [
      '# Вариант 1: свой префикс /64',
      '/ipv6 address add address=2001:db8:10::1/64 interface=bridge-lan advertise=yes',
      '/ipv6 nd add interface=bridge-lan ra-interval=30s-60s ra-lifetime=1800s',
      '',
      '# Вариант 2: префикс от провайдера',
      '/ipv6 dhcp-client add interface=ether1 pool-name=wan6 request=prefix add-default-route=yes disabled=no',
      '/ipv6 address add from-pool=wan6 interface=bridge-lan advertise=yes',
      '',
      '# Firewall (порядок важен)',
      '/ipv6 firewall filter add chain=input connection-state=established,related action=accept',
      '/ipv6 firewall filter add chain=input protocol=icmpv6 action=accept',
      '/ipv6 firewall filter add chain=input in-interface-list=WAN action=drop',
      '/ipv6 firewall filter add chain=forward connection-state=established,related action=accept',
      '/ipv6 firewall filter add chain=forward in-interface-list=LAN action=accept',
      '/ipv6 firewall filter add chain=forward in-interface-list=WAN action=drop'
    ],
    check: [
      { d: 'терминал', c: '/ipv6 address print\n/ipv6 nd print\n/ipv6 firewall filter print stats\n/ping 2001:4860:4860::8888 count=4' }
    ],
    warn: 'ICMPv6 — не «лишний» протокол: без него не работает обнаружение соседей, SLAAC и PMTU. Блокировать нужно выборочно (например, echo-request из WAN), а не весь протокол. И не забудьте правило drop в forward: в IPv6 NAT не прикрывает LAN.',
    mistakes: [
      'Включают IPv6 и не пишут firewall — устройства из LAN доступны из интернета.',
      'Ставят drop all в input выше правила ICMPv6 — сеть «ломается» через минуту.',
      'advertise=yes, но ra-lifetime=0 — клиенты не получают маршрут по умолчанию.',
      'Ждут DHCPv6-адреса на Android: Android берёт только SLAAC.',
      'Раздают /64, полученный от провайдера, и удивляются, что адреса меняются раз в сутки.'
    ]
  });

  routing.items.push({
    id: 'routing-policy',
    t: 'Routing → Tables: политика маршрутизации (mangle + routing-mark)',
    lvl: 3,
    path: 'IP → Firewall → Mangle + Routing → Tables',
    tags: ['routing', 'policy', 'mangle', 'таблицы', 'два провайдера'],
    purpose: 'Обычная таблица маршрутизации выбирает путь по адресу назначения. Политика маршрутизации позволяет выбрать путь по ' +
      'источнику, порту, типу трафика: бухгалтерия через один канал, гости через второй, VoIP — через резервный. ' +
      'В RouterOS 7 это связка «mangle помечает соединение → отдельная таблица /routing table → маршрут в этой таблице».',
    usage: [
      'Два провайдера: часть сотрудников принудительно через второй канал.',
      'Гостевая сеть выходит в интернет через резервный LTE.',
      'Трафик к партнёру идёт через отдельный туннель, а не через общий шлюз.',
      'Проверка, почему маршрут по умолчанию игнорирует метку.'
    ],
    pros: [
      'Гибко: критерий — что угодно из mangle (адрес, порт, protocol, DSCP).',
      'Основная таблица остаётся нетронутой.',
      'Легко откатить: удалили метку — вернулось стандартное поведение.'
    ],
    cons: [
      'Метка ставится до решения о маршруте, поэтому только в prerouting/output.',
      'FastTrack отключает обработку mangle для соединения.',
      'Нужен маршрут внутри таблицы, иначе трафик уйдёт в default или пропадёт.'
    ],
    steps: [
      { t: 'Создать таблицу', d: 'Таблица — отдельный набор маршрутов. Имя произвольное, fib — тип FIB (обычный).', cmd: '/routing table add name=via-lte fib\n/routing table print' },
      { t: 'Добавить маршруты в таблицу', d: 'В таблице должен быть свой default route (и при необходимости маршрут до сети шлюза).', cmd: '/ip route add dst-address=0.0.0.0/0 gateway=192.168.100.1 routing-table=via-lte check-gateway=ping comment="LTE default"' },
      { t: 'Пометить трафик', d: 'Mangle ← prerouting, критерий (src-address, порт, protocol), action=mark-routing, new-routing-mark=via-lte, passthrough=no.', cmd: '/ip firewall mangle add chain=prerouting src-address=192.168.88.128/26 action=mark-routing new-routing-mark=via-lte passthrough=no comment="телефоны через LTE"' },
      { t: 'Трафик самого роутера', d: 'Пакеты, рождённые роутером (обновления, DNS-запросы), идут через output. Метьте отдельно, если нужно.', cmd: '/ip firewall mangle add chain=output dst-address=8.8.8.8 action=mark-routing new-routing-mark=via-lte passthrough=no' },
      { t: 'Проверить, что маршрут выбран', d: 'Смотрите счётчики правил mangle и таблицу маршрутов. Не работает — проверьте порядок: правило с меткой должно стоять до дропов.', cmd: '/ip firewall mangle print stats\n/ip route print where routing-table=via-lte\n/ip route check 8.8.8.8' },
      { t: 'Не забыть NAT', d: 'Masquerade по out-interface-list=WAN уже покрывает оба канала. Если NAT привязан к конкретному интерфейсу — добавьте второй канал.' },
      { t: 'Метка на соединение, а не на пакет', d: 'Для стабильности сначала пометьте соединение (connection-mark), а затем маршрут по метке соединения: так обратный трафик пойдёт по тому же пути.' }
    ],
    config: [
      '# 1. Таблица и маршрут в ней',
      '/routing table add name=via-lte fib',
      '/ip route add dst-address=0.0.0.0/0 gateway=192.168.100.1 routing-table=via-lte check-gateway=ping',
      '',
      '# 2. Кого отправить в эту таблицу (телефоны — VLAN 40)',
      '/ip firewall mangle add chain=prerouting src-address=192.168.88.128/26 \\',
      '    action=mark-routing new-routing-mark=via-lte passthrough=no',
      '',
      '# 3. Трафик самого роутера (по необходимости)',
      '/ip firewall mangle add chain=output dst-address=8.8.8.8 action=mark-routing new-routing-mark=via-lte passthrough=no',
      '',
      '# 4. NAT для обоих каналов',
      '/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade'
    ],
    check: [
      { d: 'терминал', c: '/routing table print\n/ip route print detail where routing-table=via-lte\n/ip firewall mangle print stats\n/tool traceroute 8.8.8.8' }
    ],
    warn: 'FastTrack ускоряет соединения, но пропускает их мимо mangle: если включён fasttrack-connection для LAN, метка не поставится. Либо исключите нужные адреса из fasttrack, либо используйте connection-mark до fasttrack.',
    mistakes: [
      'Ставят метку в forward вместо prerouting — маршрут уже выбран, метка не работает.',
      'Создают таблицу, но не добавляют в неё default route — трафик пропадает.',
      'Забывают про FastTrack и ищут, почему метка не появляется.',
      'Метят каждый пакет (passthrough=yes) и получают петли с обратным трафиком.'
    ]
  });

  queues.items.push({
    id: 'queue-cake',
    t: 'Queues → fq-codel и CAKE: честная очередь без настройки',
    lvl: 3,
    path: 'Queues → Queue Types, Queue Tree',
    tags: ['очереди', 'qos', 'fq-codel', 'cake', 'буферbloat'],
    purpose: 'Когда канал загружен, растёт очередь в буфере провайдера — пинг взлетает до сотен миллисекунд, хотя скорость «есть». ' +
      'Современные алгоритмы (fq-codel, CAKE) дробят поток на множество очередей и отбрасывают лишнее раньше, чем буфер переполнится. ' +
      'В большинстве случаев это лучше, чем ручные приоритеты PCQ.',
    usage: [
      'Видеозвонки «квакают», когда кто-то качает файлы.',
      'Игры: пинг скачет с 20 до 300 мс при загрузке канала.',
      'Домашний интернет 50–100 Мбит/с без сложного QoS.',
      'Хочется обойтись без классификаторов и приоритетов.'
    ],
    pros: [
      'Работает «из коробки»: один тип очереди и два правила.',
      'Не нужно описывать классы трафика.',
      'Снижает буферbloat — пинг остаётся ровным под нагрузкой.'
    ],
    cons: [
      'Не различает приоритеты приложений (для этого нужны классы/PCQ).',
      'Требует ограничения чуть ниже реальной скорости канала.',
      'CAKE заметно нагружает слабые CPU при больших скоростях.'
    ],
    steps: [
      { t: 'Измерить скорость', d: 'Speedtest даёт примерно 95/45 Мбит/с — берите 90 % от каждого значения. Ограничение выше реального канала бесполезно: буфер провайдера всё равно переполнится.' },
      { t: 'Создать типы очередей', d: 'fq-codel есть в RouterOS давно; CAKE — в 7.x на большинстве платформ. Начните с fq-codel.', cmd: '/queue type add name=fq-up kind=fq-codel fq-codel-limit=1024 fq-codel-interval=100ms\n/queue type add name=fq-down kind=fq-codel fq-codel-limit=1024 fq-codel-interval=100ms' },
      { t: 'Очередь на отдачу', d: 'Отдачу формируем на WAN-интерфейсе: parent — ether1 (или pppoe-out1).', cmd: '/queue tree add name=upload parent=ether1 max-limit=20M queue=fq-up' },
      { t: 'Очередь на приём', d: 'Приём нельзя формировать на WAN — трафик уже пришёл. Родителем ставят LAN-интерфейс или bridge.', cmd: '/queue tree add name=download parent=bridge-lan max-limit=90M queue=fq-down' },
      { t: 'Проверить под нагрузкой', d: 'Запустите скачивание и одновременно ping 8.8.8.8. Пинг должен остаться в пределах 30–60 мс, а не улетать в 300+.' },
      { t: 'Вариант CAKE', d: 'Если нужна ещё и честность между хостами: /queue type add name=cake-up kind=cake cake-bandwidth=20M. Проверьте, что тип доступен на вашей модели: /queue type print where kind=cake.' }
    ],
    config: [
      '# Типы очередей',
      '/queue type add name=fq-up kind=fq-codel fq-codel-limit=1024 fq-codel-interval=100ms',
      '/queue type add name=fq-down kind=fq-codel fq-codel-limit=1024',
      '',
      '# Формирование: отдача на WAN, приём на LAN',
      '/queue tree add name=upload parent=ether1 max-limit=20M queue=fq-up',
      '/queue tree add name=download parent=bridge-lan max-limit=90M queue=fq-down',
      '',
      '# CAKE (если поддерживается моделью)',
      '# /queue type add name=cake-up kind=cake cake-bandwidth=20M',
      '# /queue tree add name=upload-cake parent=ether1 max-limit=20M queue=cake-up'
    ],
    check: [
      { d: 'терминал', c: '/queue type print\n/queue tree print stats\n/ping 8.8.8.8 count=20' }
    ],
    warn: 'Лимит ставьте на 10–15 % ниже измеренной скорости: 100 Мбит/с по Speedtest — значит 85–90 Мбит/с в очереди. Если поставить ровно 100, очередь не будет успевать и пинг всё равно вырастет. И не включайте одновременно simple queues и queue tree на один и тот же интерфейс.',
    mistakes: [
      'Ставят max-limit равным тарифу — эффекта нет.',
      'Формируют download на WAN-интерфейсе: трафик там уже входящий.',
      'Включают fasttrack и удивляются, что очереди не считают трафик.',
      'Ждут от fq-codel приоритетов для VoIP — их там нет, нужны классы.'
    ]
  });

  ip.items.push({
    id: 'dhcp-relay-deep',
    t: 'IP → DHCP Relay: один сервер на много подсетей',
    lvl: 2,
    path: 'IP → DHCP Relay (и DHCP Server на другом роутере)',
    tags: ['dhcp', 'relay', 'подсети', 'сервер'],
    purpose: 'Когда DHCP-сервер один (например, на центральном роутере или Windows-сервере), а подсетей много, ' +
      'на каждом сегменте ставят relay: он пересылает широковещательные DHCP-запросы на сервер и возвращает ответ. ' +
      'Так адреса выдаёт одно устройство, а не десять роутеров.',
    usage: [
      'Офис с несколькими VLAN и одним сервером адресов.',
      'Гостевая сеть, где адреса выдаёт отдельный контроллер.',
      'Переезд с DHCP на роутере на Windows Server без смены схемы.',
      'Нужно централизованно видеть все аренды.'
    ],
    pros: [
      'Одна точка управления арендами и опциями.',
      'Работает через L3-границы, не нужно тянуть L2.',
      'Можно раздавать разные опции по подсетям.'
    ],
    cons: [
      'Нужен маршрут от сервера до удалённой подсети.',
      'Сервер должен знать про все сети (записи network).',
      'При поломке сервера адреса не получит никто.'
    ],
    steps: [
      { t: 'Убедиться, что на интерфейсе нет своего DHCP-сервера', d: 'Relay и сервер на одном интерфейсе несовместимы: сначала /ip dhcp-server print и отключите сервер на этом сегменте.' },
      { t: 'Добавить relay', d: 'interface — сегмент с клиентами, dhcp-server — адрес сервера, local-address — адрес роутера в этом сегменте (по нему сервер выбирает пул).', cmd: '/ip dhcp-relay add name=relay-30 interface=vlan-30 dhcp-server=192.168.88.2 local-address=192.168.88.1' },
      { t: 'Описать сеть на сервере', d: 'На DHCP-сервере должна быть запись network для удалённой подсети с правильным шлюзом — иначе клиент получит адрес без маршрута.', cmd: '/ip dhcp-server network add address=192.168.30.0/24 gateway=192.168.30.1 dns-server=192.168.88.2' },
      { t: 'Проверить маршрут до сервера', d: 'Relay шлёт unicast на сервер и ждёт ответ. Между ними должен быть маршрут в обе стороны.' },
      { t: 'Опции и задержка', d: 'delay-threshold отсекает «шумных» клиентов, relay-info добавляет option 82 (агент), чтобы сервер различал сегменты. Для IP-телефонов нужны опции 66 и 67.' },
      { t: 'Проверка', d: 'На клиенте ipconfig /release и /renew. На роутере — /log print where topics~"dhcp", на сервере — список аренд.' }
    ],
    config: [
      '# Relay на удалённом сегменте',
      '/ip dhcp-relay add name=relay-30 interface=vlan-30 dhcp-server=192.168.88.2 local-address=192.168.88.1 disabled=no',
      '',
      '# На сервере: сеть и пул для удалённого сегмента',
      '/ip pool add name=pool-30 ranges=192.168.30.100-192.168.30.200',
      '/ip dhcp-server add name=dhcp-30 interface=vlan-30 address-pool=pool-30 disabled=no',
      '/ip dhcp-server network add address=192.168.30.0/24 gateway=192.168.30.1 dns-server=192.168.30.1',
      '',
      '# Опции для IP-телефонов',
      '/ip dhcp-server option add name=tftp code=66 value="\'192.168.30.5\'"',
      '/ip dhcp-server option add name=bootfile code=67 value="\'phone.cfg\'"'
    ],
    check: [
      { d: 'терминал', c: '/ip dhcp-relay print\n/ip dhcp-server lease print\n/log print where topics~"dhcp"' }
    ],
    warn: 'Если сервер и клиентская подсеть соединены через NAT, relay не заработает: адрес источника подменяется и ответ не находит путь назад. Relay требует «прозрачной» маршрутизации между сегментами.',
    mistakes: [
      'Оставляют включённым DHCP-сервер на том же интерфейсе, что и relay.',
      'Не добавляют запись network на сервере — клиент получает адрес без шлюза.',
      'Забывают маршрут от сервера до удалённой подсети.',
      'Ставят relay за NAT.'
    ]
  });

  tools.items.push({
    id: 'container-basics',
    t: 'Tools → Containers: AdGuard Home и другие сервисы на роутере',
    lvl: 3,
    path: 'System → Packages (+ /container)',
    tags: ['container', 'docker', 'adguard', 'dns', 'сервисы'],
    purpose: 'RouterOS 7 умеет запускать OCI-контейнеры (Docker-образы) прямо на роутере: DNS-фильтр AdGuard Home, ' +
      'Pi-hole, небольшие прокси и боты. Контейнер получает виртуальный интерфейс veth и отдельный адрес, ' +
      'а наружу выходит через NAT роутера.',
    usage: [
      'Блокировка рекламы на уровне сети без отдельного сервера.',
      'Локальный DNS с фильтрацией для всей квартиры или офиса.',
      'Тест образа перед тем, как ставить его на сервер.',
      'Небольшие сервисы: uptime-проверки, вебхуки, прокси.'
    ],
    pros: [
      'Один корпус вместо роутера и мини-ПК.',
      'Изоляция: контейнер не трогает основную систему.',
      'Образы берутся из Docker Hub как есть.'
    ],
    cons: [
      'Нужны ARM64/ARMv7, 256+ МБ RAM и диск (USB или внутренний).',
      'Требуется пакет container и подтверждение device-mode кнопкой.',
      'Производительность и надёжность ниже, чем у отдельного сервера.'
    ],
    steps: [
      { t: 'Проверить модель и ресурсы', d: 'Нужны ARM64/ARMv7 (hAP ax2/ax3, RB5009), свободное место и пакет container. На MIPS (hEX) контейнеры не работают.' },
      { t: 'Разрешить контейнеры', d: 'Device-mode меняется только физическим подтверждением: команда ждёт нажатия reset в течение 5 минут.', cmd: '/system/device-mode/update container=yes' },
      { t: 'Настроить хранилище и реестр', d: 'tmpdir — куда качать слои, registry-url — Docker Hub по умолчанию.', cmd: '/container config set registry-url=https://registry-1.docker.io tmpdir=disk1/pull' },
      { t: 'Создать сеть контейнера', d: 'veth-интерфейс + bridge + адрес роутера в этой сети + NAT для выхода в интернет.', cmd: '/interface veth add name=veth-adg address=172.18.0.2/24 gateway=172.18.0.1\n/interface bridge add name=containers\n/interface bridge port add bridge=containers interface=veth-adg\n/ip address add address=172.18.0.1/24 interface=containers\n/ip firewall nat add chain=srcnat src-address=172.18.0.0/24 action=masquerade' },
      { t: 'Добавить и запустить контейнер', d: 'root-dir — папка данных (обязательно на диске, не в памяти).', cmd: '/container add remote-image=adguard/adguardhome:latest interface=veth-adg root-dir=disk1/adguard logging=yes\n/container start [find]' },
      { t: 'Настроить сервис', d: 'Откройте веб-интерфейс контейнера (для AdGuard — порт 3000 при первом запуске), задайте логин и включите DNS-фильтр на порту 53.' },
      { t: 'Переключить DNS на контейнер', d: 'В DHCP-сервере укажите dns-server=172.18.0.2, а в /ip dns — forwarders на него или оставьте кэш роутера.', cmd: '/ip dhcp-server network set [find address~"192.168.88.0/24"] dns-server=172.18.0.2' }
    ],
    config: [
      '# 1. Разрешение (нажать reset на роутере в течение 5 минут)',
      '/system/device-mode/update container=yes',
      '',
      '# 2. Общие настройки',
      '/container config set registry-url=https://registry-1.docker.io tmpdir=disk1/pull',
      '',
      '# 3. Сеть контейнера',
      '/interface veth add name=veth-adg address=172.18.0.2/24 gateway=172.18.0.1',
      '/interface bridge add name=containers',
      '/interface bridge port add bridge=containers interface=veth-adg',
      '/ip address add address=172.18.0.1/24 interface=containers',
      '/ip firewall nat add chain=srcnat src-address=172.18.0.0/24 action=masquerade',
      '',
      '# 4. Контейнер AdGuard Home',
      '/container add remote-image=adguard/adguardhome:latest interface=veth-adg root-dir=disk1/adguard logging=yes',
      '/container start [find]'
    ],
    check: [
      { d: 'терминал', c: '/container print\n/container logs [find] tail=50\n/ip address print where interface=containers' }
    ],
    warn: 'На моделях с 128 МБ RAM (hAP ac2, hEX) контейнеры либо недоступны, либо уронят роутер по памяти. Проверьте /system resource print: свободно должно быть минимум 150–200 МБ, а root-dir — на внешнем диске, иначе flash быстро износится.',
    mistakes: [
      'Запускают контейнер на MIPS-модели — платформа не поддерживается.',
      'Кладут root-dir во внутреннюю flash и убивают её записью.',
      'Забывают NAT для сети контейнера — образ не скачивается.',
      'Меняют device-mode без доступа к кнопке reset.'
    ]
  });

  tools.items.push({
    id: 'romon-netinstall',
    t: 'Tools → RoMON и Netinstall: доступ и восстановление',
    lvl: 2,
    path: 'Tools → RoMON, Netinstall',
    tags: ['romon', 'netinstall', 'восстановление', 'доступ', 'сброс'],
    purpose: 'RoMON — отдельный протокол управления MikroTik-устройствами на канальном уровне: он работает без IP и ' +
      'проходит через несколько коммутаторов, поэтому им находят роутеры «потерявшие» адрес. Netinstall — крайняя мера: ' +
      'переустановка RouterOS на устройство, которое не отвечает.',
    usage: [
      'Роутер настроен с ошибкой и недоступен по IP.',
      'Нужно найти устройство в сети без адреса.',
      'Массовая установка RouterOS на новые устройства.',
      'Восстановление после неудачного апгрейда.'
    ],
    pros: [
      'Работает до появления IP и маршрутизации.',
      'Один список на всю L2-сеть MikroTik.',
      'Netinstall возвращает устройство к жизни без сервиса.'
    ],
    cons: [
      'RoMON виден только в пределах L2-домена.',
      'Netinstall требует физического доступа и Windows.',
      'Настройки при Netinstall теряются.'
    ],
    steps: [
      { t: 'Включить RoMON', d: 'На управляющем роутере и на устройствах. Секрет обязателен, если хотите ограничить доступ.', cmd: '/tool romon set enabled=yes\n/tool romon port add interface=bridge-lan' },
      { t: 'Найти устройства', d: 'Winbox → Tools → RoMON Neighbors или в терминале: видно имя, MAC, версию и платформу.', cmd: '/tool romon discover' },
      { t: 'Подключиться', d: 'Winbox → Connect To → RoMON → выбрать устройство. MAC-адрес нужен, если IP потерян.' },
      { t: 'Подготовить Netinstall', d: 'Скачайте Netinstall и пакет RouterOS нужной архитектуры с mikrotik.com. Запустите Netinstall от администратора, отключите все сетевые адаптеры кроме одного.' },
      { t: 'Режим Netboot на устройстве', d: 'Зажмите reset, подайте питание, держите до мигания индикатора (примерно 5–10 секунд), отпустите. Устройство ищет Netinstall-сервер.' },
      { t: 'Установка', d: 'В Netinstall задайте адрес 192.168.88.1/24 на ПК, выберите пакет и «Keep old configuration» при необходимости, нажмите Install.' },
      { t: 'После установки', d: 'Устройство поднимется с чистым RouterOS: адрес 192.168.88.1, логин admin без пароля. Сразу смените пароль и восстановите бэкап.' }
    ],
    config: [
      '# RoMON на управляющем роутере',
      '/tool romon set enabled=yes',
      '/tool romon port add interface=bridge-lan',
      '',
      '# Проверка: список соседей',
      '/tool romon discover',
      '',
      '# Ограничение секретом (одинаковый на всех устройствах)',
      '/tool romon set secrets=ChangeMe-2026'
    ],
    check: [
      { d: 'терминал', c: '/tool romon print\n/tool romon discover\n/ip neighbor print detail' }
    ],
    warn: 'Netinstall стирает конфигурацию, если не включена опция сохранения. Перед процедурой сохраните бэкап: /export file=before && /system backup save name=before. RoMON не включайте на WAN — это дополнительный канал управления.',
    mistakes: [
      'Включают RoMON на WAN-интерфейсе — доступ к устройству снаружи.',
      'Ищут Netinstall через Wi-Fi: процедура работает только по кабелю.',
      'Забывают сменить пароль admin после переустановки.',
      'Пытаются сделать Netinstall на устройстве, у которого неисправен загрузчик.'
    ]
  });
})();
