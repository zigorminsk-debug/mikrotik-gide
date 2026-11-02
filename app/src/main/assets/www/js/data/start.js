/* Раздел «Старт»: вход в роутер, базовая настройка, бэкап, обновление, лаборатория */
window.DATA = window.DATA || [];
window.DATA.push({
  id: 'start', name: 'Старт и база', ic: 'start',
  items: [
    {
      id: 'start-first-login', t: 'Первый вход в роутер (Winbox 4)', lvl: 1,
      path: 'Winbox 4 → Neighbors → Connect',
      tags: ['подключение', 'mac', 'admin'],
      purpose: 'Winbox — основная утилита управления RouterOS. Она подключается к роутеру по IP-адресу, по MAC-адресу (если IP не настроен или потерян) или через RoMON. Это первое, что нужно сделать после распаковки роутера.',
      usage: [
        'Первичная настройка нового роутера «из коробки» — IP ещё неизвестен, а MAC виден в списке соседей.',
        'Восстановление доступа, когда адресация сбита и по IP роутер не отвечает.',
        'Управление роутером в локальной сети оператора или офиса с компьютера на Windows/macOS/Linux.'
      ],
      steps: [
        { t: 'Скачайте и запустите Winbox 4', d: 'Файл берётся только с официального сайта mikrotik.com/download. Запускать можно без установки.' },
        { t: 'Откройте вкладку Neighbors', d: 'Winbox находит роутеры широковещательными запросами MNDP. Если список пуст — проверьте, что компьютер в той же подсети или подключён к LAN-порту роутера.' },
        { t: 'Подключитесь по MAC-адресу', d: 'Нажмите на MAC в списке — адрес подставится в поле Connect To. Затем Connect.' },
        { t: 'Войдите с логином admin', d: 'На заводских настройках пароль пустой. RouterOS 7 сразу предложит задать новый пароль — сделайте это.' },
        { t: 'Смените пароль администратора', d: 'System → Users → двойной клик по admin → поле Password → Apply. Пароль длиной 12+ символов, сохраните его в менеджере паролей.' },
        { t: 'Закройте лишние сервисы управления', d: 'IP → Services: оставьте winbox и ssh (при необходимости www-ssl), остальные (telnet, ftp, www, api) выключите.' },
        { t: 'Сохраните резервную копию', d: 'Files → Backup → имя файла backups/first-config — чтобы вернуться к рабочему состоянию одной кнопкой.' }
      ],
      scenes: [
        {
          path: 'Winbox 4 → Neighbors', win: 'Winbox 4', tab: 'Neighbors', tabs: ['Neighbors', 'Saved', 'RoMON'],
          tools: [{ t: 'Connect', pri: true, id: 'connect', m: 1 }, { t: 'Connect To:', id: 'tot' }, { t: 'Refresh', id: 'refresh' }],
          cols: [{ t: 'MAC Address', w: 130 }, { t: 'Address', w: 112 }, { t: 'Identity', w: 84 },
            { t: 'Version', w: 78 }, { t: 'Board', w: 96 }, { t: 'Interface', w: 82 }],
          rows: [
            ['DC:2C:6E:A1:4F:22', { v: '192.168.88.1', m: 2 }, 'MikroTik', '7.16.2', 'hEX S', 'bridge'],
            ['DC:2C:6E:A1:4F:23', '—', 'Office-RB4011', '7.15.3', 'RB4011', 'ether3'],
            ['E4:8D:8C:11:77:90', '10.10.0.1', 'CHR-lab', '7.16.2', 'CHR', 'ether2']
          ],
          sel: 0,
          notes: ['Кнопка Connect — подключение к выбранному устройству',
            'Адрес роутера: если пусто, Winbox подключится по MAC']
        },
        {
          path: 'System → Users', win: 'Users', tab: 'Users',
          cols: [{ t: 'Name', w: 90 }, { t: 'Group', w: 84 }, { t: 'Allowed Address', w: 130 }, { t: 'Last Logged In', w: 120 }],
          rows: [[{ v: 'admin', m: 1 }, 'full', '0.0.0.0/0', '2026-11-02 09:14']],
          sel: 0,
          form: {
            title: 'User <admin>', fields: [
              { l: 'Name', v: 'admin', ro: true },
              { l: 'Password', v: '••••••••••••', m: 2 },
              { l: 'Confirm Password', v: '••••••••••••' },
              { l: 'Group', v: 'full', type: 'select' },
              { l: 'Allowed Address', v: '0.0.0.0/0' }
            ], buttons: ['Apply', 'Cancel', 'Disable']
          },
          notes: ['Двойной клик по пользователю открывает окно редактирования',
            'Задайте пароль и нажмите Apply — со следующего входа он обязателен']
        }
      ],
      check: [{
        d: 'терминал',
        c: '/system identity print\n/system resource print\n/user print\n/ip service print'
      }],
      mistakes: [
        'Подключение к порту WAN нового роутера — по умолчанию там нет DHCP-клиента на некоторых моделях, используйте LAN.',
        'Работа под admin без пароля в сети провайдера: роутер доступен всем соседям по MAC.',
        'Winbox 3 вместо Winbox 4 для RouterOS 7 — часть меню работает некорректно, берите Winbox 4.'
      ],
      links: [{ t: 'Winbox (mikrotik.com)', u: 'https://mikrotik.com/download' }]
    },

    {
      id: 'start-base-setup', t: 'Базовая настройка за 15 минут', lvl: 1,
      path: 'IP → Address · DHCP Server · DNS · Firewall',
      tags: ['wan', 'lan', 'nat', 'старт'],
      purpose: 'Минимальный рабочий набор: внешний интерфейс получает адрес от провайдера, внутренняя сеть — 192.168.88.0/24, роутер раздаёт DHCP, транслирует адреса (NAT) и закрывает вход из интернета.',
      usage: [
        'Новый офис или квартира: нужен стабильный интернет и локальная сеть за 15 минут.',
        'Типовой шаблон, с которого начинается любая дальнейшая настройка (VPN, VLAN, очереди).',
        'Быстрое восстановление после сброса конфигурации.'
      ],
      steps: [
        { t: 'Назовите интерфейсы', d: 'Interfaces → Interface: переименуйте ether1 в `WAN`, ether2–ether5 в `LAN1…LAN4` (кнопка Comment/Name в окне интерфейса).' },
        { t: 'Создайте мост для LAN', d: 'Bridge → Bridge → `+`: name=bridge-lan. Затем Bridge → Ports → `+` для каждого LAN-порта (interface=ether2…, bridge=bridge-lan).' },
        { t: 'Настройте WAN', d: 'IP → DHCP Client → `+`: Interface=WAN, Use Peer DNS=yes, Add Default Route=yes. Если провайдер даёт статику — вместо этого IP → Address.' },
        { t: 'Задайте адрес LAN', d: 'IP → Address → `+`: Address=192.168.88.1/24, Interface=bridge-lan.' },
        { t: 'Поднимите DHCP-сервер', d: 'IP → DHCP Server → DHCP Setup: выберите bridge-lan, шлюз 192.168.88.1, пул 192.168.88.10-192.168.88.254, DNS 192.168.88.1.' },
        { t: 'Включите DNS-кэш', d: 'IP → DNS: Servers = 1.1.1.1, 8.8.8.8 (или DNS провайдера), Allow Remote Requests = yes.' },
        { t: 'Закройте firewall', d: 'IP → Firewall → Filter Rules: цепочка input — accept established/related, drop invalid, accept ICMP, accept LAN, drop всё остальное; цепочка forward — accept established/related, drop invalid, accept LAN→WAN, drop всё остальное.' },
        { t: 'Включите NAT', d: 'IP → Firewall → NAT → `+`: chain=srcnat, out-interface=WAN, action=masquerade.' },
        { t: 'Проверьте и сохраните', d: 'Клиент должен получить адрес по DHCP и открывать сайты. Сделайте Files → Backup.' }
      ],
      scenes: [
        {
          path: 'IP → Address', win: 'Address List', tab: 'Address',
          cols: [{ t: 'Address', w: 150 }, { t: 'Network', w: 118 }, { t: 'Interface', w: 118 },
            { t: 'Actual Interface', w: 118 }, { t: 'Invalid', w: 60 }, { t: 'Dynamic', w: 66 }],
          rows: [
            [{ v: '192.168.88.1/24', m: 1 }, '192.168.88.0', 'bridge-lan', 'bridge-lan', 'false', 'false'],
            [{ v: '100.71.14.9/24', m: 2 }, '100.71.14.0', 'WAN', 'ether1', 'false', 'true']
          ],
          sel: 0,
          notes: ['Адрес шлюза локальной сети на мосту',
            'Адрес от провайдера получен по DHCP — он «динамический»']
        },
        {
          path: 'IP → Firewall → Filter Rules', win: 'Firewall', tab: 'Filter Rules',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'Raw', 'Connections', 'Address Lists'],
          cols: [{ t: '#', w: 30 }, { t: 'Chain', w: 74 }, { t: 'Action', w: 68 },
            { t: 'Src. Address', w: 108 }, { t: 'Dst. Port', w: 70 }, { t: 'In. Interface', w: 92 },
            { t: 'Bytes', w: 74 }, { t: 'Comment', w: 168 }],
          rows: [
            ['0', 'input', { v: 'accept', c: 'ok', m: 1 }, '', '', '', '12.4 GiB', 'accept established,related'],
            ['1', 'input', 'drop', '', '', '', '402 MiB', 'drop invalid'],
            ['2', 'input', 'accept', '', '', 'LAN', '88 MiB', 'accept LAN to router'],
            ['3', 'input', { v: 'drop', c: 'no', m: 2 }, '', '', 'WAN', '1.1 MiB', 'drop all input from WAN'],
            ['4', 'forward', 'accept', '', '', '', '90.1 GiB', 'accept established,related'],
            ['5', 'forward', 'accept', '', '', 'LAN', '88.7 GiB', 'LAN → WAN']
          ],
          sel: 3,
          notes: ['Правило принимает уже разрешённые соединения — всегда первое',
            'Ключевое правило: вход на роутер из интернета запрещён']
        }
      ],
      check: [{
        d: 'проверка по шагам',
        c: '/ip address print\n/ip route print where dst-address=0.0.0.0/0\n/ip dhcp-server lease print\n/ip firewall nat print\n/ping 1.1.1.1 count=4'
      }],
      warn: 'Правила input/forward применяйте до включения WAN — иначе роутер несколько минут будет открыт из интернета.',
      mistakes: [
        'NAT сделан с `out-interface=ether1` вместо логического имени WAN — после переименования правило «отваливается».',
        'Забыли `accept established,related` — соединения рвутся, сайты не открываются.',
        'DHCP-сервер поднят на WAN-интерфейсе — раздаются адреса наружу.'
      ],
      links: [{ t: 'First time configuration', u: 'https://help.mikrotik.com/docs/spaces/ROS/pages/328155/First+Time+Configuration' }]
    },

    {
      id: 'start-menu-map', t: 'Как устроено окно Winbox 4', lvl: 1,
      path: 'Winbox 4 → окно списка',
      tags: ['интерфейс', 'навигация'],
      purpose: 'Все окна Winbox 4 построены по одному шаблону: слева дерево меню, сверху панель инструментов со списком, ниже вкладки, в центре таблица, справа — форма свойств выбранного объекта. Поняв шаблон, вы найдёте любой пункт в любом меню.',
      usage: [
        'Быстрый поиск нужного пункта меню без заучивания путей.',
        'Понимание, какие кнопки что делают: +, −, ✓, ✕, иконка «сортировка», фильтр.',
        'Работа с таблицами: скрытие/показ колонок, сортировка, выделение нескольких строк.'
      ],
      steps: [
        { t: 'Левое дерево меню', d: 'Группы (Interface, IP, System…) раскрываются кликом. Строка поиска вверху дерева фильтрует пункты по названию.' },
        { t: 'Панель инструментов', d: '`+` добавить объект, `−` удалить, `✓` включить, `✕` отключить, `⇅` сортировка, значок воронки — фильтр.' },
        { t: 'Вкладки', d: 'Открывают разные списки одного раздела (например, Firewall: Filter Rules, NAT, Mangle, Raw, Connections, Address Lists).' },
        { t: 'Двойной клик по строке', d: 'Открывает окно свойств объекта. Изменения применяются кнопкой Apply, закрытие — OK.' },
        { t: 'Колонки', d: 'Клик по заголовку сортирует. Правый клик по заголовку — выбор отображаемых колонок и «Show Categories».' },
        { t: 'Строка состояния', d: 'Внизу окна — количество объектов и счётчик трафика выбранного интерфейса.' }
      ],
      scenes: [{
        path: 'IP → Firewall → Filter Rules', win: 'Firewall', tab: 'Filter Rules',
        tabs: ['Filter Rules', 'NAT', 'Mangle', 'Raw', 'Connections', 'Address Lists'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−', id: 'del' }, { t: '✓', id: 'en' }, { t: '✕', id: 'dis' },
          { t: '⇅', id: 'sort' }, { t: '⌕', id: 'find' }],
        cols: [{ t: '#', w: 30 }, { t: 'Chain', w: 80 }, { t: 'Action', w: 74 }, { t: 'Bytes', w: 90 }, { t: 'Comment', w: 240 }],
        rows: [
          ['0', { v: 'input', m: 2 }, 'accept', '12.4 GiB', 'established,related'],
          ['1', 'input', 'drop', '402 MiB', { v: 'invalid', m: 3 }],
          ['2', 'forward', 'accept', '90.1 GiB', 'LAN → WAN']
        ],
        sel: 0,
        tabMark: 'Filter Rules', tabMarkN: 4,
        notes: ['Кнопка «+» добавляет правило в открытую вкладку',
          'Двойной клик по строке (например по «input») открывает свойства',
          'Пример правила в списке: цепочка input, действие drop',
          'Вкладки переключают списки раздела, активная подсвечена']
      }],
      check: [{ d: 'то же самое в терминале', c: '/ip firewall filter print\n/ip firewall filter print stats' }]
    },

    {
      id: 'start-backup', t: 'Backup, Export и восстановление', lvl: 1,
      path: 'Files → Backup · Files → Export',
      tags: ['backup', 'восстановление', 'экспорт'],
      purpose: 'Два разных инструмента: Backup создаёт бинарный снимок всей конфигурации (включая пароли и сертификаты) и восстанавливается только на том же или совместимом RouterOS; Export выгружает текстовый скрипт `export`, который можно прочитать, отредактировать и применить на другом устройстве.',
      usage: [
        'Перед любым обновлением или рискованным изменением — Backup за 5 секунд.',
        'Перенос конфигурации на новый роутер — Export (текстом), с правкой имён интерфейсов.',
        'Автоматический ночной бэкап по расписанию с отправкой на FTP/почту.'
      ],
      steps: [
        { t: 'Бинарный бэкап', d: 'Files → Backup: укажите имя (например `backups/2026-11-02`), при необходимости пароль и галочку Don\'t Encrypt Config. Файл `.backup` появится в Files.' },
        { t: 'Скачайте файл', d: 'В Files выделите файл и нажмите Download (или перетащите из окна). Храните копию вне роутера.' },
        { t: 'Текстовый экспорт', d: 'Files → Export: выберите, что выгружать (или `export verbose` для полного), снимите галочку с «Hide Sensitive» только при необходимости.' },
        { t: 'Восстановление бэкапа', d: 'Files → выделить `.backup` → Restore. Роутер перезагрузится и вернёт состояние на момент снимка.' },
        { t: 'Восстановление экспорта', d: 'Files → Import (файл `.rsc`) или вставьте текст в New Terminal. Учтите, что импорт добавляет объекты к существующим.' },
        { t: 'Автоматизация', d: 'System → Scheduler → `+`: on-event=`/system backup save name=backups/auto`; Interval=1d.' }
      ],
      scenes: [
        {
          path: 'Files', win: 'Files', tabs: ['Files'],
          tools: [{ t: 'Backup', id: 'backup', m: 1 }, { t: 'Restore', id: 'restore', m: 3 }, { t: 'Export', id: 'export', m: 2 },
            { t: 'Download', id: 'download' }, { t: '⬆', id: 'upload' }],
          cols: [{ t: 'Name', w: 250 }, { t: 'Type', w: 86 }, { t: 'Size', w: 80 }, { t: 'Creation Time', w: 150 }],
          rows: [
            [{ v: 'backups/2026-11-02.backup', m: 3 }, 'backup', '182.4 KiB', 'nov/02/2026 09:22:10'],
            ['config-2026-11-02.rsc', 'script', '14.8 KiB', 'nov/02/2026 09:23:02'],
            ['supout.rif', 'supout', '1.9 MiB', 'nov/01/2026 21:10:44']
          ],
          sel: 0,
          notes: ['Кнопка Backup создаёт бинарный снимок',
            'Кнопка Export — текстовый файл конфигурации',
            'Выделенный файл восстанавливается кнопкой Restore']
        },
        {
          path: 'Files → Backup', win: 'Backup',
          form: {
            title: 'Backup', buttons: ['Backup', 'Cancel'],
            fields: [
              { l: 'Name', v: 'backups/2026-11-02', m: 1 },
              { l: 'Password', v: '' },
              { l: 'Don\'t Encrypt', v: true, type: 'check' }
            ],
            note: 'Файл сохраняется в Files → папка backups'
          },
          noTools: true,
          notes: ['Имя файла: используйте папку и дату — так проще искать']
        }
      ],
      check: [{
        d: 'терминал',
        c: '/system backup save name=backups/test dont-encrypt=yes\n/export file=config-full\n/file print where name~"backup|config"'
      }],
      warn: 'Бинарный .backup нельзя переносить между разными версиями RouterOS и на другую модель — для переноса используйте `/export`.',
      mistakes: [
        'Хранить бэкап только на самом роутере: при сбросе или выходе из строя он пропадёт.',
        'Восстанавливать .backup после крупного апгрейда — часть конфигурации может не примениться.',
        'Экспорт с `hide-sensitive` не содержит паролей — при переносе их нужно вводить заново.'
      ]
    },

    {
      id: 'start-upgrade', t: 'Обновление RouterOS и RouterBOOT', lvl: 1,
      path: 'System → Packages · System → RouterBOOT',
      tags: ['обновление', 'firmware', 'packages'],
      purpose: 'Обновления RouterOS закрывают уязвимости и добавляют функции. RouterBOOT — загрузчик устройства, его обновляют отдельно и только после обновления RouterOS.',
      usage: [
        'Плановое обслуживание раз в квартал или при выходе security-релиза.',
        'Перед переходом на новые функции (WiFi, containers, BGP templates) требуется актуальная версия.',
        'После замены major-версии (6 → 7) через netinstall или контролируемый апгрейд.'
      ],
      steps: [
        { t: 'Проверьте текущую версию', d: 'System → Resources: поле Version и Firmware Type.' },
        { t: 'Проверьте обновления', d: 'System → Packages → кнопка Check For Updates. В списке появится доступная версия (stable / long-term).' },
        { t: 'Скачайте и установите', d: 'Download & Install → роутер скачает пакеты, перезагрузится (1–3 минуты).' },
        { t: 'Обновите загрузчик', d: 'System → RouterBOOT → Upgrade → Yes → перезагрузка. Кнопка активна только если версии отличаются.' },
        { t: 'Проверьте после ребута', d: 'System → Resources: версия RouterOS и Current Firmware должны совпадать с Upgradable Firmware.' },
        { t: 'Откат при проблемах', d: 'System → Packages: выберите предыдущую версию в Downgrade, либо загрузите нужный .npk в Files и перезагрузитесь.' }
      ],
      scenes: [
        {
          path: 'System → Packages', win: 'Packages', tabs: ['Packages'],
          tools: [{ t: 'Check For Updates', id: 'check', m: 1 }, { t: 'Download & Install', id: 'di', m: 2, pri: true }, { t: 'Enable', id: 'en' }],
          cols: [{ t: 'Name', w: 210 }, { t: 'Version', w: 96 }, { t: 'Scheduled', w: 110 }, { t: 'Status', w: 120 }],
          rows: [
            ['routeros', '7.16.2', '', 'installed'],
            ['wifi-qcom', '7.16.2', '', 'installed'],
            [{ v: 'routeros-7.17.1', m: 2 }, '7.17.1', '', 'available']
          ],
          sel: 2,
          notes: ['Кнопка проверки обновлений на сервере MikroTik',
            'Установка выбранного пакета с перезагрузкой']
        },
        {
          path: 'System → RouterBOOT', win: 'RouterBOOT',
          noTools: true,
          form: {
            title: 'RouterBOOT', buttons: ['Upgrade', 'Cancel'],
            fields: [
              { l: 'RouterBOARD', v: 'RB4011iGS+', ro: true },
              { l: 'Current Firmware', v: '7.16.2', ro: true },
              { l: 'Upgrade Firmware', v: '7.16.2', ro: true, m: 1 }
            ],
            note: 'Сначала обновляется RouterOS, затем прошивка'
          },
          notes: ['Кнопка Upgrade прошивает загрузчик — роутер перезагрузится']
        }
      ],
      check: [{ d: 'терминал', c: '/system resource print\n/system routerboard print\n/system package update check-for-updates' }],
      warn: 'Обновляйтесь только из официального канала (upgrade.mikrotik.com). Перед установкой всегда делайте Backup.',
      mistakes: [
        'Обновление RouterBOOT до RouterOS — загрузчик и система должны быть одной версии, порядок обратный.',
        'Пропуск long-term ветки на продакшене: stable подходит не всем, long-term стабильнее.',
        'Обновление без резервной копии и без окна обслуживания.'
      ]
    },

    {
      id: 'start-safe', t: 'Safe Mode и восстановление доступа', lvl: 2,
      path: 'Кнопка Safe Mode · System → Reset Configuration',
      tags: ['доступ', 'сброс', 'safe mode'],
      purpose: 'Safe Mode — режим, в котором изменения не сохраняются, пока вы не нажмёте кнопку повторно: если связь с роутером потеряна, он автоматически откатит конфигурацию. Reset Configuration возвращает заводские настройки.',
      usage: [
        'Правка firewall, VLAN и bridge на удалённом устройстве — страховка от потери управления.',
        'Восстановление забытого пароля или «окирпичивания» после неверной настройки.',
        'Подготовка устройства к передаче другому владельцу.'
      ],
      steps: [
        { t: 'Включите Safe Mode', d: 'Кнопка Safe Mode в окне Winbox (или Ctrl+X). В заголовке появится предупреждение.' },
        { t: 'Внесите изменения', d: 'Например, правьте VLAN filtering. Пока режим активен, правила не записываются в конфигурацию.' },
        { t: 'Проверьте связь', d: 'Если сессия «зависла» или вы отключились — роутер сам вернёт предыдущее состояние через несколько секунд.' },
        { t: 'Зафиксируйте изменения', d: 'Нажмите Safe Mode ещё раз (или Ctrl+X) — изменения применятся и сохранятся.' },
        { t: 'Сброс конфигурации', d: 'System → Reset Configuration: отметьте No Default Configuration (чистый роутер) или Keep User Configuration. Подтвердите Reset.' },
        { t: 'Сброс кнопкой', d: 'Если доступа нет: выключите питание, зажмите Reset, включите питание и держите кнопку до мигания индикатора (около 5–10 c), отпустите.' }
      ],
      scenes: [
        {
          path: 'System → Reset Configuration', win: 'Reset Configuration',
          noTools: true,
          form: {
            title: 'Reset Configuration', buttons: ['Reset', 'Cancel'],
            fields: [
              { l: 'Reset Configuration', v: true, type: 'check', m: 1 },
              { l: 'No Default Config', v: true, type: 'check', m: 2 },
              { l: 'Keep Users', v: false, type: 'check' },
              { l: 'Run After Reset', v: '', type: 'select' }
            ],
            note: 'Устройство перезагрузится с заводскими настройками'
          },
          notes: ['Включите сброс конфигурации',
            'No Default Configuration — роутер стартует вообще без настроек (без адреса 192.168.88.1)']
        },
        {
          term: true, cap: 'Что видно в терминале при Safe Mode',
          win: 'New Terminal', path: 'Safe Mode',
          lines: [
            { t: 'safe mode taken', k: 'hl' },
            '/ip firewall filter add chain=input action=drop in-interface=WAN',
            { t: '…если связь потеряна, роутер откатит изменение автоматически', k: 'out' },
            { t: 'safe mode released', k: 'hl' }
          ]
        }
      ],
      check: [{ d: 'терминал', c: '/system backup print\n/system routerboard print\n/log print where topics~"system"' }],
      danger: 'Сброс конфигурации удалит все настройки, включая правила firewall и пароли. Сохраните Backup и Export до сброса.',
      mistakes: [
        'Нажали Reset и не удержали кнопку — устройство загрузилось в обычном режиме.',
        'No Default Configuration на устройстве без последовательного порта — доступа по IP не будет, только MAC-Winbox.',
        'Safe Mode не спасает от потери связи на уровне L2 (VLAN/bridge), если изменение применено до включения режима.'
      ]
    },

    {
      id: 'start-chr', t: 'Лаборатория: виртуальный RouterOS (CHR)', lvl: 2,
      path: 'CHR → VirtualBox / VMware / Proxmox / GNS3',
      tags: ['chr', 'лаборатория', 'тест'],
      purpose: 'Cloud Hosted Router (CHR) — образ RouterOS для виртуальных машин. Позволяет бесплатно поднять сколько угодно роутеров, ломать и пересоздавать их, проверять конфигурации перед применением на реальной технике.',
      usage: [
        'Тренировка настройки: VLAN, VPN, BGP, firewall — без риска для продакшена.',
        'Проверка скриптов и экспортов перед раскаткой на боевые устройства.',
        'Стенд для снятия собственных скриншотов и отладки схем.'
      ],
      steps: [
        { t: 'Скачайте образ', d: 'mikrotik.com/download → Cloud Hosted Router → образ для своей платформы (vmdk для VMware/VirtualBox, img для Proxmox, qcow2 для KVM).' },
        { t: 'Создайте ВМ', d: '2 vCPU, 256–512 МБ RAM, 128 МБ диска. Для VirtualBox: тип Other Linux, добавьте два сетевых адаптера.' },
        { t: 'Сеть лаборатории', d: 'Адаптер 1 — NAT/Bridged (WAN), адаптер 2 — Internal Network (LAN). Внутри второй ВМ подключите её к тому же Internal Network.' },
        { t: 'Первый вход', d: 'CHR по умолчанию имеет адрес на ether1 через DHCP. Найдите его в списке Neighbors Winbox или в консоли ВМ.' },
        { t: 'Лицензия', d: 'CHR бесплатен (free) с ограничением скорости; для тестов этого достаточно. System → License показывает уровень.' },
        { t: 'Снимки (snapshots)', d: 'Делайте снапшот ВМ до эксперимента — откат занимает секунды, в отличие от реального железа.' }
      ],
      scenes: [{
        path: 'System → Resources', win: 'Resources', noTools: true,
        tabs: ['General', 'Storage', 'Hardware'], tab: 'General',
        form: {
          title: 'Resources', buttons: false,
          fields: [
            { l: 'Uptime', v: '1w3d04:21:09', ro: true },
            { l: 'Version', v: '7.16.2 (stable)', ro: true },
            { l: 'Build Time', v: '2026-09-11 09:44:12', ro: true },
            { l: 'Factory Firmware', v: '', ro: true },
            { l: 'Current Firmware', v: '7.16.2', ro: true },
            { l: 'Model', v: 'CHR', ro: true },
            { l: 'Architecture', v: 'x86_64', ro: true },
            { l: 'CPU', v: 'QEMU Virtual CPU', ro: true },
            { l: 'CPU Count', v: '2', ro: true },
            { l: 'Free Memory', v: '312.5 MiB', ro: true }
          ]
        },
        notes: []
      }],
      check: [{ d: 'проверка образа', c: '/system resource print\n/system license print\n/interface print' }],
      warn: 'CHR не имеет коммутатора и Wi-Fi — VLAN и bridge в нём работают программно, но названия интерфейсов будут ether1…etherN.'
    },

    {
      id: 'start-rollback', t: 'Откат изменений и журнал', lvl: 2,
      path: 'System → History · Log',
      tags: ['журнал', 'откат', 'аудит'],
      purpose: 'RouterOS ведёт историю действий и журнал событий. По ним видно, кто и что менял, почему пропал доступ и какие правила сработали.',
      usage: [
        'Разбор инцидента: кто изменил firewall и когда.',
        'Поиск причины падения PPPoE/VPN по логам.',
        'Проверка, что скрипт или scheduler отработал.'
      ],
      steps: [
        { t: 'System → History', d: 'Показывает список выполненных команд и изменений в обратном порядке. Полезно сразу после неудачной правки.' },
        { t: 'Log', d: 'Окно журнала: фильтруйте по темам (firewall, pppoe, ipsec, system, error).' },
        { t: 'Настройте темы', d: 'System → Logging → `+`: topics=firewall action=memory (или disk для хранения после перезагрузки).' },
        { t: 'Отправка на syslog', d: 'System → Logging → Actions → `+`: type=remote, remote=192.168.88.50, remote-port=514, syslog-facility=local0.' },
        { t: 'Откат', d: 'Если изменение уже сохранено — восстановите Backup, сделанный до него, либо вручную отмените правило.' }
      ],
      scenes: [{
        path: 'Log', win: 'Log', tabs: ['Log'], cols: [{ t: 'Time', w: 92 }, { t: 'Topics', w: 130 }, { t: 'Message', w: 460 }],
        rows: [
          ['09:41:12', 'firewall,info', { v: 'input: in:WAN out:(unknown 0), src:203.0.113.44 dst:100.71.14.9, proto TCP (SYN), len:60', m: 1 }],
          ['09:42:03', 'system,info', 'user admin logged in from 192.168.88.24 via winbox'],
          ['09:44:51', 'pppoe,info', 'pppoe-out1: connected'],
          ['09:45:02', 'error', 'login failure for user root from 45.148.10.7 via ssh']
        ],
        sel: 0,
        notes: ['Сообщения firewall показывают, кто и по какому порту стучался — включается правилом action=log']
      }],
      check: [{ d: 'терминал', c: '/log print where topics~"error"\n/log print follow' }]
    }
  ]
});
