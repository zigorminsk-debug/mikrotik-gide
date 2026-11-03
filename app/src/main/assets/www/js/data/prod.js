/* Прод-сценарии с готовыми конфигами (блок «Готовый конфиг» с копированием). */
(function () {
  'use strict';
  var D = window.DATA || [];
  function group(id) {
    for (var i = 0; i < D.length; i++) if (D[i].id === id) return D[i];
    return null;
  }
  var tasks = group('tasks');
  if (!tasks) return;

  tasks.items.push({
    id: 'task-office-from-scratch', t: 'Офис с нуля: полный конфиг MikroTik', lvl: 3,
    path: 'Весь роутер', tags: ['конфиг', 'офис', 'с-нуля', 'firewall', 'nat'],
    purpose: 'Готовый базовый конфиг офисного роутера: два порта WAN/LAN, подсеть 192.168.10.0/24, DHCP, NAT, защитный firewall, NTP и SNMP. Подставьте свои адреса и вставьте целиком в New Terminal — останется проверить доступ и пароли.',
    usage: [
      'Новый офис: роутер из коробки, нужно «просто чтобы работало» и было защищено.',
      'Шаблон для парка однотипных роутеров.',
      'Восстановление конфигурации после сброса.'
    ],
    pros: [
      'Весь набор правил в одном месте — не забудете про firewall.',
      'Порядок правил уже правильный: established → ICMP → drop.',
      'Легко адаптировать: меняются адреса и порты.'
    ],
    cons: [
      'Требует понимания, иначе сложно поддерживать.',
      'Не учитывает особенности конкретного провайдера (PPPoE, VLAN).',
      'После вставки нужны проверки: доступ, DNS, скорость.'
    ],
    steps: [
      { t: 'Сбросьте и подключитесь', d: 'Winbox → подключение по MAC. Затем System → Reset Configuration (No Default Configuration) — если роутер не новый.' },
      { t: 'Задайте адреса', d: 'Проверьте имена портов: `ether1` обычно WAN, `ether2-ether5` — LAN. Поправьте конфиг под свою модель.' },
      { t: 'Вставьте конфиг', d: 'New Terminal → вставьте блок «Готовый конфиг» целиком. Роутер может кратко потерять связь — это нормально.' },
      { t: 'Проверьте', d: 'С ПК в LAN: адрес из 192.168.10.0/24, интернет, DNS, Winbox по 192.168.10.1.' },
      { t: 'Закройте доступ', d: 'System → Users: смените пароль admin. IP → Services: ограничьте доступ локальной сетью.' }
    ],
    config: [
      '# ---------- 1. Имена портов и списки ----------',
      '/interface list',
      'add name=LAN',
      'add name=WAN',
      '/interface list member',
      'add interface=bridge-lan list=LAN',
      'add interface=ether1 list=WAN',
      '',
      '# ---------- 2. Мост и адреса ----------',
      '/interface bridge add name=bridge-lan',
      '/interface bridge port add bridge=bridge-lan interface=ether2',
      '/interface bridge port add bridge=bridge-lan interface=ether3',
      '/interface bridge port add bridge=bridge-lan interface=ether4',
      '/interface bridge port add bridge=bridge-lan interface=ether5',
      '/ip address add address=192.168.10.1/24 interface=bridge-lan',
      '/ip address add address=203.0.113.20/24 interface=ether1',
      '/ip route add gateway=203.0.113.1',
      '',
      '# ---------- 3. DHCP и DNS ----------',
      '/ip pool add name=lan-pool ranges=192.168.10.100-192.168.10.200',
      '/ip dhcp-server add name=dhcp-lan interface=bridge-lan address-pool=lan-pool lease-time=1d',
      '/ip dhcp-server network add address=192.168.10.0/24 gateway=192.168.10.1 dns-server=192.168.10.1',
      '/ip dns set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes',
      '',
      '# ---------- 4. NAT ----------',
      '/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="internet"',
      '',
      '# ---------- 5. Firewall ----------',
      '/ip firewall filter',
      'add chain=input connection-state=established,related action=accept comment="established"',
      'add chain=input connection-state=invalid action=drop comment="invalid"',
      'add chain=input protocol=icmp action=accept comment="icmp"',
      'add chain=input in-interface-list=WAN action=drop comment="drop wan input"',
      'add chain=forward connection-state=established,related action=accept comment="fwd established"',
      'add chain=forward connection-state=invalid action=drop',
      'add chain=forward in-interface-list=LAN out-interface-list=WAN action=accept comment="lan to wan"',
      'add chain=forward in-interface-list=WAN action=drop comment="drop wan forward"',
      '',
      '# ---------- 6. Сервисы ----------',
      '/ip service set winbox address=192.168.10.0/24',
      '/ip service set ssh address=192.168.10.0/24',
      '/ip service disable telnet,ftp,www,api,api-ssl',
      '/system ntp client set enabled=yes servers=by.pool.ntp.org,time.google.com',
      '/system clock set time-zone-name=Europe/Minsk',
      '/system identity set name=office-gw'
    ],
    configTitle: 'Офис 192.168.10.0/24 · WAN 203.0.113.20 · RouterOS 7',
    scenes: [{
      path: 'IP → Firewall → Filter Rules', win: 'Firewall', tabs: ['Filter Rules', 'NAT', 'Mangle'], tab: 'Filter Rules', noTools: true,
      cols: [{ t: '#', w: 30 }, { t: 'Chain', w: 80 }, { t: 'Connection State', w: 140 }, { t: 'In. Interface List', w: 130 }, { t: 'Action', w: 90 }],
      rows: [
        ['0', { v: 'input', m: 1 }, { v: 'established,related', m: 2 }, '', { v: 'accept', m: 3 }],
        ['1', 'input', 'invalid', '', 'drop'],
        ['2', 'input', '', 'WAN', 'drop'],
        ['3', 'forward', 'established,related', '', 'accept']
      ],
      sel: 0,
      notes: [
        'Цепочка input — трафик к самому роутеру',
        'Установленные соединения разрешаем всегда',
        'Порядок важен: accept для established должен быть первым'
      ]
    }],
    check: [{ d: 'терминал', c: '/ip address print\n/ip route print where dst-address=0.0.0.0/0\n/ip firewall filter print stats\n/ping 8.8.8.8 count=4' }],
    warn: 'Перед вставкой конфига сохраните текущий (`/export`). Если вы подключены через ether1, после назначения WAN-адреса связь может прерваться — держите доступ по другому порту или через консоль.',
    mistakes: [
      'Вставили конфиг с чужими адресами и удивляются отсутствию интернета.',
      'Правило drop для WAN стоит выше разрешений — ничего не работает.',
      'Забыли сменить пароль admin после настройки.'
    ]
  });

  tasks.items.push({
    id: 'task-guest-iot-vlan', t: 'Гостевая сеть и IoT: изоляция через VLAN', lvl: 3,
    path: 'Bridge → VLAN + IP → Firewall', tags: ['vlan', 'гости', 'iot', 'изоляция', 'конфиг'],
    purpose: 'Три сети на одном роутере: офис (доверенная), гостевая (только интернет) и IoT (камеры, принтеры, датчики — без выхода наружу). Разделение через VLAN и firewall, готовый конфиг ниже.',
    usage: [
      'Офис с гостевым Wi-Fi и умными устройствами.',
      'Требование безопасности: камеры не должны видеть рабочие ПК.',
      'Быстрое развёртывание без отдельного оборудования.'
    ],
    pros: [
      'Один роутер вместо трёх.',
      'Правила firewall ограничивают каждую сеть явно.',
      'IoT не может «позвонить домой» и не виден из офиса.'
    ],
    cons: [
      'Нужен управляемый коммутатор или отдельные порты под VLAN.',
      'Больше правил — сложнее поддерживать.',
      'Ошибка в PVID оставляет порт в неправильной сети.'
    ],
    steps: [
      { t: 'VLAN на мосту', d: 'Создайте VLAN 10 (office), 20 (guest), 30 (iot) и добавьте мост как tagged-порт.' },
      { t: 'Порты', d: 'Каждому порту задайте PVID и untagged VLAN — порт попадёт в нужную сеть.' },
      { t: 'Адреса и DHCP', d: 'Для каждой сети — свой адрес роутера, пул и DHCP-сервер.' },
      { t: 'Firewall', d: 'guest → только WAN; iot → только ответы, никаких переходов в office.' },
      { t: 'Проверка', d: 'С гостевого устройства ping до 192.168.10.x не проходит, до интернета — проходит.' }
    ],
    config: [
      '# ---------- VLAN и порты ----------',
      '/interface bridge add name=bridge-lan vlan-filtering=yes',
      '/interface vlan add name=vlan-office vlan-id=10 interface=bridge-lan',
      '/interface vlan add name=vlan-guest vlan-id=20 interface=bridge-lan',
      '/interface vlan add name=vlan-iot vlan-id=30 interface=bridge-lan',
      '/interface bridge port',
      'add bridge=bridge-lan interface=ether2 pvid=10',
      'add bridge=bridge-lan interface=ether3 pvid=20',
      'add bridge=bridge-lan interface=ether4 pvid=30',
      'add bridge=bridge-lan interface=ether5 pvid=10',
      '/interface bridge vlan',
      'add bridge=bridge-lan tagged=bridge-lan untagged=ether2,ether5 vlan-ids=10',
      'add bridge=bridge-lan tagged=bridge-lan untagged=ether3 vlan-ids=20',
      'add bridge=bridge-lan tagged=bridge-lan untagged=ether4 vlan-ids=30',
      '',
      '# ---------- Адреса и DHCP ----------',
      '/ip address add address=192.168.10.1/24 interface=vlan-office',
      '/ip address add address=192.168.20.1/24 interface=vlan-guest',
      '/ip address add address=192.168.30.1/24 interface=vlan-iot',
      '/ip pool add name=p-office ranges=192.168.10.100-192.168.10.200',
      '/ip pool add name=p-guest ranges=192.168.20.100-192.168.20.200',
      '/ip pool add name=p-iot ranges=192.168.30.100-192.168.30.150',
      '/ip dhcp-server add name=d-office interface=vlan-office address-pool=p-office lease-time=1d',
      '/ip dhcp-server add name=d-guest interface=vlan-guest address-pool=p-guest lease-time=1h',
      '/ip dhcp-server add name=d-iot interface=vlan-iot address-pool=p-iot lease-time=1d',
      '/ip dhcp-server network',
      'add address=192.168.10.0/24 gateway=192.168.10.1 dns-server=192.168.10.1',
      'add address=192.168.20.0/24 gateway=192.168.20.1 dns-server=1.1.1.1',
      'add address=192.168.30.0/24 gateway=192.168.30.1 dns-server=192.168.10.1',
      '',
      '# ---------- Firewall: изоляция ----------',
      '/ip firewall filter',
      'add chain=forward connection-state=established,related action=accept',
      'add chain=forward in-interface=vlan-guest out-interface-list=LAN action=drop comment="guest isolated"',
      'add chain=forward in-interface=vlan-iot out-interface=vlan-office action=drop comment="iot cannot reach office"',
      'add chain=forward in-interface=vlan-office out-interface=vlan-iot action=accept comment="office manages iot"',
      'add chain=forward in-interface=vlan-guest out-interface-list=WAN action=accept',
      '/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade'
    ],
    configTitle: 'VLAN 10/20/30 · гостевая изоляция · IoT без доступа в офис',
    scenes: [{
      path: 'Bridge → VLANs', win: 'Bridge VLAN', tabs: ['VLANs', 'Ports', 'VLAN'], tab: 'VLANs', noTools: true,
      cols: [{ t: 'Bridge', w: 110 }, { t: 'VLAN IDs', w: 90 }, { t: 'Tagged', w: 140 }, { t: 'Untagged', w: 160 }],
      rows: [
        [{ v: 'bridge-lan' }, { v: '10', m: 1 }, { v: 'bridge-lan', m: 2 }, { v: 'ether2,ether5', m: 3 }],
        ['bridge-lan', '20', 'bridge-lan', 'ether3'],
        ['bridge-lan', '30', 'bridge-lan', 'ether4']
      ],
      sel: 0,
      notes: [
        'Номер VLAN для сети',
        'Мост помечает кадры тегом',
        'Нетегированные порты — устройства без VLAN'
      ]
    }],
    check: [{ d: 'терминал', c: '/interface bridge vlan print\n/interface bridge port print\n/ip firewall filter print stats\n/ip address print' }],
    warn: 'При включении vlan-filtering мост перезагружает таблицу — подключение по Winbox может прерваться. Настройте адрес на VLAN-интерфейсе заранее.',
    mistakes: [
      'PVID не совпадает с untagged VLAN — порт «мёртвый».',
      'Без правила established/related гостевая сеть не работает даже в интернет.',
      'Мост без vlan-filtering=yes — теги игнорируются.'
    ]
  });

  tasks.items.push({
    id: 'task-snmp-zabbix', t: 'Мониторинг: SNMP и Zabbix для роутера', lvl: 2,
    path: 'IP → SNMP + System → Logging', tags: ['snmp', 'zabbix', 'мониторинг', 'конфиг'],
    purpose: 'Чтобы узнать об аварии раньше пользователей, роутер должен отдавать метрики. SNMP + Zabbix дают графики трафика, температуры, загрузки CPU, состояния интерфейсов и тревоги при падении канала.',
    usage: [
      'Парк из нескольких роутеров и один Zabbix.',
      'Отчёт «когда и почему падал канал».',
      'Контроль температуры и напряжения на объекте без людей.'
    ],
    pros: [
      'Стандартный протокол, шаблоны для MikroTik готовы.',
      'Видно деградацию до аварии (рост ошибок, температуры).',
      'Уведомления почтой/в мессенджер.'
    ],
    cons: [
      'SNMP v1/v2c не шифруется — только в доверенной сети.',
      'Нужен внешний сервер.',
      'Некоторые метрики требуют OID-исследования.'
    ],
    steps: [
      { t: 'SNMP', d: 'IP → SNMP: Enabled=yes, Contact/ Location, Community=`public` (лучше свою), доступ только с адреса Zabbix.' },
      { t: 'Traps', d: 'Там же: Trap Community, Trap Version=2, Trap Generators (temp, interface).' },
      { t: 'Zabbix', d: 'В Zabbix добавьте узел, интерфейс SNMP, шаблон «MikroTik RouterOS by SNMP».' },
      { t: 'Проверка', d: '`/tool snmp-get` с роутера или snmpwalk с сервера — данные приходят.' }
    ],
    config: [
      '# ---------- SNMP ----------',
      '/snmp set enabled=yes contact=admin@example.com location="office Minsk"',
      '/snmp community set [find default=yes] name=monitoring',
      '# доступ только с сервера мониторинга',
      '/ip firewall filter add chain=input protocol=udp src-address=192.168.10.50 dst-port=161 action=accept comment="snmp from zabbix"',
      '/ip firewall filter add chain=input protocol=udp dst-port=161 action=drop comment="snmp deny others"',
      '',
      '# ---------- Логи на сервер ----------',
      '/system logging action add name=remote target=remote remote=192.168.10.50',
      '/system logging add topics=critical,error action=remote',
      '/system logging add topics=ipsec,error action=remote',
      '',
      '# ---------- Netwatch на шлюз провайдера ----------',
      '/tool netwatch add host=203.0.113.1 interval=30s timeout=1s'
    ],
    configTitle: 'SNMP v2c + syslog + Netwatch · сервер 192.168.10.50',
    scenes: [{
      path: 'IP → SNMP', win: 'SNMP', tabs: ['General', 'Communities'], tab: 'General', noTools: true,
      form: {
        title: 'SNMP', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
          { l: 'Contact', v: 'admin@example.com', m: 2 },
          { l: 'Location', v: 'office Minsk' },
          { l: 'Trap Community', v: 'monitoring', m: 3 },
          { l: 'Trap Version', v: '2', type: 'select' }
        ],
        note: 'Коммьюнити — это фактически пароль только на чтение: не используйте public'
      },
      notes: [
        'Включение SNMP',
        'Контакт администратора',
        'Строка community для трапов'
      ]
    }],
    check: [{ d: 'терминал', c: '/snmp print\n/snmp community print\n/system logging print\n/tool snmp-get address=192.168.10.50 oid=1.3.6.1.2.1.1.1.0' }],
    warn: 'SNMP на WAN-интерфейсе с community «public» — классическая утечка: через него читают таблицы интерфейсов и ARP.',
    mistakes: [
      'SNMP открыт наружу.',
      'Community по умолчанию.',
      'Zabbix не может опросить узел из-за firewall.'
    ]
  });

  tasks.items.push({
    id: 'task-config-versioning', t: 'Версии конфигов: автовыгрузка на сервер', lvl: 3,
    path: 'System → Scripts + Scheduler + Tools → Fetch', tags: ['бэкап', 'конфиг', 'автоматизация', 'конфиг-версии'],
    purpose: 'Ежедневный экспорт конфигурации с датой в имени на внешний сервер даёт историю изменений и способ откатиться. Скрипт делает `/export`, складывает файл в Files и отправляет по FTP/SFTP; старые копии удаляются.',
    usage: [
      'Парк роутеров: единая точка хранения конфигов.',
      'Аудит «кто и когда менял правила».',
      'Быстрое восстановление после сброса.'
    ],
    pros: [
      'Текстовый экспорт читаем и переносим между версиями.',
      'История по дням — видно, что изменилось.',
      'Автоматизация исключает человеческий фактор.'
    ],
    cons: [
      'В экспорте нет секретов в открытом виде, но есть ключи и хеши — храните защищённо.',
      'Бинарный backup не переносится между версиями RouterOS.',
      'Нужен сервер (FTP/SFTP) и учётка.'
    ],
    steps: [
      { t: 'Скрипт', d: 'System → Scripts → `+`: Name=`export-daily`, Policy=read,write,ftp, затем вставьте код из конфига ниже.' },
      { t: 'Расписание', d: 'System → Scheduler → `+`: On Event=`/system script run export-daily`, Start Time=03:30, Interval=1d.' },
      { t: 'Хранение', d: 'На сервере держите 30 дней, дальше — архив. Удаление старых файлов делает скрипт.' },
      { t: 'Проверка', d: 'Запустите скрипт вручную и проверьте Files и папку на сервере; `/log print where topics~"script"`.' }
    ],
    config: [
      '# ---------- Скрипт ежедневного экспорта ----------',
      '/system script add name=export-daily policy=read,write,ftp source={',
      '  :local d [/system clock get date]',
      '  :local name ("cfg-" . [:pick $d 0 3] . [:pick $d 4 6] . "-" . [:pick $d 7 11] . ".rsc")',
      '  /export file=$name',
      '  :delay 5s',
      '  /tool fetch address=192.168.10.50 src-path=$name user=backup password="StrongPass" mode=ftp upload=yes',
      '  :delay 3s',
      '  /file remove $name',
      '  :log info ("export uploaded: " . $name)',
      '}',
      '',
      '# ---------- Расписание ----------',
      '/system scheduler add name=daily-export start-time=03:30:00 interval=1d on-event="/system script run export-daily"',
      '',
      '# ---------- Ручной бэкап перед изменениями ----------',
      '# /system backup save name=before-change',
      '# /export file=before-change'
    ],
    configTitle: 'Экспорт конфига по расписанию на FTP · хранить 30 дней',
    scenes: [{
      path: 'System → Scheduler', win: 'Scheduler', tabs: ['Scheduler'], tab: 'Scheduler', noTools: true,
      cols: [{ t: 'Name', w: 150 }, { t: 'Start Time', w: 110 }, { t: 'Interval', w: 90 }, { t: 'On Event', w: 220 }],
      rows: [
        [{ v: 'daily-export', m: 1 }, { v: '03:30:00', m: 2 }, { v: '1d', m: 3 }, { v: '/system script run export-daily', m: 4 }]
      ],
      sel: 0,
      notes: [
        'Имя задачи',
        'Время запуска — ночью, вне рабочих часов',
        'Раз в сутки',
        'Команда запуска скрипта'
      ]
    }],
    check: [{ d: 'терминал', c: '/system script print\n/system scheduler print\n/file print where name~"cfg-"\n/log print where topics~"script"' }],
    warn: 'Пароль FTP в скрипте хранится открытым текстом. Используйте отдельную учётку только для записи бэкапов и меняйте её при уходе сотрудника.',
    mistakes: [
      'Скрипт без policy=ftp — fetch не имеет прав.',
      'Файл не удаляется и занимает флеш.',
      'Проверка никогда не выполняется: бэкап «есть», но пустой.'
    ]
  });

  tasks.items.push({
    id: 'task-corp-wifi-8021x', t: 'Корпоративный Wi-Fi: 802.1X и гостевой SSID', lvl: 3,
    path: 'WiFi → Security + RADIUS', tags: ['wifi', '802.1x', 'radius', 'гости', 'конфиг'],
    purpose: 'Два SSID на одной точке: рабочий с аутентификацией по логину (WPA2/WPA3-Enterprise через RADIUS) и гостевой с паролем и изоляцией. Сотрудники входят своим доменным логином, гости — только в интернет.',
    usage: [
      'Офис с доменом и RADIUS (NPS/FreeRADIUS).',
      'Требование «не хранить общий пароль Wi-Fi у всех».',
      'Гостевая сеть для посетителей без доступа к внутренним ресурсам.'
    ],
    pros: [
      'Нет общего пароля: доступ у каждого свой, отзыв — отключение учётки.',
      'Гости изолированы и не видят офисную сеть.',
      'Один SSID для всех устройств сотрудников.'
    ],
    cons: [
      'Нужен RADIUS-сервер и сертификат для сервера.',
      'Старые устройства без 802.1X не подключатся.',
      'Диагностика сложнее: ошибки видны только в RADIUS-логах.'
    ],
    steps: [
      { t: 'RADIUS', d: 'RADIUS → `+`: Service=`wireless`, Address=сервер, Secret — общий секрет с NPS/FreeRADIUS.' },
      { t: 'Профили безопасности', d: 'WiFi → Security → `+`: `sec-corp` (WPA2-Enterprise, Authentication Types=dot1x), `sec-guest` (WPA2-PSK с паролем).' },
      { t: 'SSID', d: 'WiFi → WiFi: `wifi-corp` с `sec-corp`, `wifi-guest` с `sec-guest` на отдельном VLAN.' },
      { t: 'Изоляция гостей', d: 'Гостевой VLAN без маршрута в офис + firewall (см. сценарий «Гостевая сеть и IoT»).' },
      { t: 'Проверка', d: 'Подключение доменной учёткой; в RADIUS-логе — Access-Accept; гость получает адрес только из гостевого пула.' }
    ],
    config: [
      '# ---------- RADIUS ----------',
      '/radius add service=wireless address=192.168.10.60 secret="RadiusSecret" authentication-port=1812 accounting-port=1813',
      '',
      '# ---------- Профили безопасности ----------',
      '/interface wifi security add name=sec-corp authentication-types=wpa2-eap,wpa3-eap eap-methods=peap management-protection=allowed',
      '/interface wifi security add name=sec-guest authentication-types=wpa2-psk,wpa3-psk passphrase="GuestPass-2026"',
      '',
      '# ---------- SSID: в пакете wifi ssid и country живут в профиле configuration ----------',
      '/interface wifi datapath add name=dp-guest bridge=bridge-lan vlan-id=20',
      '/interface wifi configuration add name=cfg-corp ssid="Corp" country=belarus security=sec-corp',
      '/interface wifi configuration add name=cfg-guest ssid="Guest" country=belarus security=sec-guest datapath=dp-guest',
      '/interface wifi set [find where name="wifi1"] configuration=cfg-corp disabled=no',
      '/interface wifi add name=wifi-guest master-interface=wifi1 configuration=cfg-guest disabled=no',
      '',
      '# ---------- Гостевой VLAN и изоляция ----------',
      '/ip firewall filter add chain=forward in-interface=vlan-guest out-interface-list=LAN action=drop comment="guest isolated"'
    ],
    configTitle: 'WPA2/WPA3-Enterprise для сотрудников + гостевой SSID',
    scenes: [{
      path: 'WiFi → Security', win: 'WiFi Security', tabs: ['Security'], tab: 'Security', noTools: true,
      form: {
        title: 'sec-corp', buttons: ['Apply', 'Cancel'],
        fields: [
          { l: 'Authentication Types', v: 'wpa2-eap, wpa3-eap', type: 'select', m: 1 },
          { l: 'EAP Methods', v: 'peap', type: 'select', m: 2 },
          { l: 'Management Protection', v: 'allowed', type: 'select' },
          { l: 'RADIUS Server', v: '192.168.10.60', m: 3 }
        ],
        note: 'Для гостевого SSID используйте отдельный профиль с WPA2-PSK'
      },
      notes: [
        'Тип аутентификации: Enterprise',
        'Метод EAP должен поддерживаться клиентами',
        'RADIUS-сервер, который проверяет логины'
      ]
    }],
    check: [{ d: 'терминал', c: '/radius print\n/interface wifi security print\n/interface wifi print detail\n/log print where topics~"radius"' }],
    warn: 'Для 802.1X нужен сертификат сервера RADIUS. Без него клиенты будут показывать предупреждение и часть устройств откажется подключаться.',
    mistakes: [
      'Secret на роутере и RADIUS не совпадает.',
      'Гостевой SSID в той же VLAN, что офис.',
      'Нет правила изоляции — гости видят внутренние ресурсы.'
    ]
  });

  tasks.items.push({
    id: 'task-migration', t: 'Миграция на новый роутер без простоя', lvl: 3,
    path: 'System → Backup / Export', tags: ['миграция', 'бэкап', 'переход', 'чек-лист'],
    purpose: 'Замена роутера — операция, которую легко превратить в аварию. Правильный порядок: снять конфиг, подготовить новый роутер рядом, проверить на тестовом канале, переключить кабели и только потом выключать старый.',
    usage: [
      'Плановая замена оборудования.',
      'Апгрейд на модель с другим набором портов.',
      'Переезд офиса с сохранением настроек.'
    ],
    pros: [
      'Простой сокращается до минут.',
      'Есть точка возврата — старый роутер остаётся настроенным.',
      'Все изменения проверены до переключения.'
    ],
    cons: [
      'Бинарный бэкап не переносится между версиями/моделями.',
      'Часть настроек (интерфейсы) приходится править вручную.',
      'Нужен физический доступ к кабелям.'
    ],
    steps: [
      { t: 'Снимок', d: 'На старом роутере: `/export file=old-full` и System → Backup. Скачайте оба файла на ПК.' },
      { t: 'Подготовка', d: 'Новый роутер обновите до той же (или новее) версии RouterOS, сбросьте конфигурацию.' },
      { t: 'Перенос', d: 'Импортируйте текстовый экспорт (`/import file=old-full.rsc`) и вручную поправьте имена интерфейсов, если модель другая.' },
      { t: 'Проверка на тесте', d: 'Подключите новый роутер к тестовому каналу/отдельной сети, проверьте NAT, firewall, VPN, DHCP.' },
      { t: 'Переключение', d: 'В окно обслуживания переставьте кабели, проверьте интернет, телефонию, VPN. Старый роутер не выключайте сутки.' },
      { t: 'Финал', d: 'Смените пароли, обновите документацию и мониторинг (SNMP/адреса), включите автобэкап.' }
    ],
    config: [
      '# ---------- На старом роутере ----------',
      '/export file=old-full',
      '/system backup save name=old-binary',
      '',
      '# ---------- На новом: импорт ----------',
      '# /import file=old-full.rsc',
      '',
      '# ---------- Ручная правка после импорта ----------',
      '# 1. имена портов: /interface print',
      '# 2. адреса: /ip address print',
      '# 3. VLAN/мосты: /interface bridge vlan print',
      '# 4. VPN-ключи: /interface wireguard print, /ppp secret print',
      '',
      '# ---------- Проверка после переключения ----------',
      '/ip address print',
      '/ip route print where dst-address=0.0.0.0/0',
      '/ip firewall filter print stats',
      '/ping 8.8.8.8 count=4',
      '/interface wireguard peers print'
    ],
    configTitle: 'Экспорт/импорт и проверки при замене роутера',
    scenes: [{
      path: 'Files', win: 'Files', tabs: ['Files'], tab: 'Files', noTools: true,
      cols: [{ t: 'Name', w: 190 }, { t: 'Type', w: 100 }, { t: 'Size', w: 100 }, { t: 'Creation Time', w: 160 }],
      rows: [
        [{ v: 'old-full.rsc', m: 1 }, { v: 'script', m: 2 }, { v: '14.8 KiB', m: 3 }, { v: 'nov/03/2026 03:30:10' }]
      ],
      sel: 0,
      notes: [
        'Текстовый экспорт конфигурации',
        'Тип script — открывается как текст',
        'Размер; скачайте файл на ПК до переключения'
      ]
    }],
    check: [{ d: 'терминал', c: '/export\n/system backup save name=check\n/file print\n/system resource print' }],
    warn: 'Бинарный бэкап можно восстановить только на том же или совместимом устройстве с той же версией RouterOS. Для переноса между моделями используйте текстовый `/export`.',
    mistakes: [
      'Переносят бинарный бэкап на другую модель — устройство не стартует.',
      'Выключают старый роутер сразу после переключения.',
      'Забывают поправить имена интерфейсов после импорта.'
    ]
  });
})();
