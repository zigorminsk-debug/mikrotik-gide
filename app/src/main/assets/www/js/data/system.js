/* Разделы «System» и «Tools» */
window.DATA = window.DATA || [];

window.DATA.push({
  id: 'system', name: 'System', ic: 'system',
  items: [
    {
      id: 'sys-identity', t: 'System → Identity', lvl: 1,
      path: 'System → Identity', tags: ['имя', 'идентификация'],
      purpose: 'Имя устройства, которое видно в Winbox, Neighbors, DHCP-клиентах, логах и мониторинге. Первое, что стоит изменить в новом устройстве.',
      usage: [
        'Различить устройства в списке Neighbors («MikroTik» у всех — путаница).',
        'Понятные имена в мониторинге и логах.',
        'Единая схема имён: `by-minsk-core-01`, `by-vitebsk-ap-02`.'
      ],
      steps: [
        { t: 'Откройте Identity', d: 'System → Identity: поле Identity Name.' },
        { t: 'Задайте имя', d: 'Например `office-gw-01`; Apply.' },
        { t: 'Проверка', d: 'Имя появится в заголовке Winbox и в списке Neighbors.' }
      ],
      scenes: [{
        path: 'System → Identity', win: 'Identity', noTools: true,
        form: { title: 'Identity', buttons: ['Apply', 'Cancel'], fields: [{ l: 'Identity', v: 'office-gw-01', m: 1 }] },
        notes: ['Имя устройства — используйте схему с городом/ролью/номером']
      }],
      check: [{ d: 'терминал', c: '/system identity print\n/system identity set name=office-gw-01' }]
    },
    {
      id: 'sys-clock', t: 'System → Clock и NTP', lvl: 2,
      path: 'System → Clock · NTP Client · NTP Server', tags: ['время', 'ntp', 'часовой пояс'],
      purpose: 'Часы роутера и их синхронизация. Точное время нужно для сертификатов, IPsec, логов, расписаний и биллинга.',
      usage: [
        'Обязательно при использовании HTTPS-сертификатов и IPsec.',
        'Корректные временные метки в логах и статистике.',
        'Раздача времени клиентам через NTP-сервер роутера.'
      ],
      steps: [
        { t: 'Часовой пояс', d: 'System → Clock: Time Zone Name=`Europe/Minsk`, DST — по необходимости.' },
        { t: 'NTP-клиент', d: 'System → NTP Client: Enabled=yes, Mode=unicast, Servers=`pool.ntp.org` или серверы провайдера.' },
        { t: 'Проверка синхронизации', d: 'System → Clock: время совпадает с реальным; статус synced.' },
        { t: 'NTP-сервер для LAN', d: 'System → NTP Server: Enabled=yes, Manycast=no, Broadcast=no. В DHCP → Networks укажите NTP Server=192.168.88.1.' }
      ],
      scenes: [{
        path: 'System → NTP Client', win: 'NTP Client', noTools: true,
        form: {
          title: 'NTP Client', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
            { l: 'Mode', v: 'unicast', type: 'select' },
            { l: 'Servers', v: 'pool.ntp.org', m: 2 },
            { l: 'VRF', v: 'main', type: 'select' }
          ]
        },
        notes: ['Включение синхронизации', 'Список NTP-серверов']
      }],
      check: [{ d: 'терминал', c: '/system clock print\n/system ntp client print\n/system ntp server print' }]
    },
    {
      id: 'sys-users', t: 'System → Users и Groups', lvl: 2,
      path: 'System → Users · Groups', tags: ['пользователи', 'права', 'безопасность'],
      purpose: 'Управление доступом к роутеру: пользователи, их пароли, группы прав (full, read, write, api, …), ограничение по адресам и сервисам.',
      usage: [
        'Разделение прав: администратор, мониторинг, только чтение.',
        'Персональные учётные записи вместо общего admin.',
        'Защита: отключение неиспользуемых учётных записей и групп.'
      ],
      steps: [
        { t: 'Создайте группу', d: 'System → Groups → `+`: Name=`monitoring`, Policy: read, winbox, api, test, ssh — без write/policy.' },
        { t: 'Создайте пользователя', d: 'System → Users → `+`: Name=`zabbix`, Password=..., Group=`monitoring`, Allowed Address=192.168.88.50.' },
        { t: 'Смените пароль admin', d: 'Двойной клик по admin → Password → Apply.' },
        { t: 'Ограничьте admin', d: 'Allowed Address = ваша админская подсеть.' },
        { t: 'Проверка', d: 'Вход пользователем с группой read не должен позволять изменять конфигурацию.' }
      ],
      scenes: [{
        path: 'System → Users', win: 'Users', tabs: ['Users', 'Groups', 'Active Users'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 110 }, { t: 'Group', w: 100 }, { t: 'Allowed Address', w: 160 }, { t: 'Last Logged In', w: 150 }, { t: 'Disabled', w: 70 }],
        rows: [
          [{ v: 'admin', m: 2 }, 'full', '192.168.88.0/24', '2026-11-02 09:14', 'false'],
          ['zabbix', { v: 'monitoring', m: 3 }, '192.168.88.50', '2026-11-02 09:01', 'false'],
          ['backup-bot', 'read', '192.168.88.0/24', '2026-11-01 23:00', 'false']
        ],
        sel: 1,
        notes: ['Кнопка добавления пользователя', 'Учётная запись администратора', 'Группа прав — определяет, что можно делать']
      }],
      check: [{ d: 'терминал', c: '/user print\n/user group print\n/user active print' }],
      mistakes: ['Пользователь в группе full без Allowed Address — потенциальная дыра.', 'Общий admin на всех сотрудниках — невозможно понять, кто изменил конфигурацию.']
    },
    {
      id: 'sys-certificates', t: 'System → Certificates', lvl: 3,
      path: 'System → Certificates', tags: ['ssl', 'сертификат', 'https'],
      purpose: 'Сертификаты для HTTPS (www-ssl), SSTP/OVPN VPN, IPsec и CAPsMAN. RouterOS умеет создавать самоподписанные сертификаты и подписывать их собственным CA.',
      usage: [
        'Включение www-ssl вместо http.',
        'SSTP VPN (сервер предъявляет клиенту сертификат).',
        'IPsec с аутентификацией по сертификату (rsa-signature).'
      ],
      steps: [
        { t: 'Создайте CA', d: 'Certificates → `+`: Name=`ca`, Common Name=`office-ca`, Key Usage=`key-cert-sign, crl-sign`, Days Valid=3650.' },
        { t: 'Подпишите CA', d: 'Выделите → кнопка Sign → CA=no → Start (подпись собственной CA ещё раз для self-signed).' },
        { t: 'Создайте серверный сертификат', d: '`+`: Name=`srv-web`, Common Name=`gw.office.lan` (или внешнее имя), Key Usage=`tls-server`, Days Valid=730.' },
        { t: 'Подпишите его CA', d: 'Sign → CA=`ca` → Start. Появится флаг T (trusted) у CA и у сертификата.' },
        { t: 'Примените', d: 'IP → Services → www-ssl: Certificate=`srv-web`, включите сервис. Или SSTP Server → Certificate.' },
        { t: 'Проверка', d: 'Колонка Trusted = yes, Expired = no. Браузер покажет предупреждение, если CA не установлен у клиента.' }
      ],
      scenes: [{
        path: 'System → Certificates', win: 'Certificates',
        tools: [{ t: '+', id: 'add', m: 1 }, { t: 'Sign', id: 'sign', m: 2 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 110 }, { t: 'Common Name', w: 150 }, { t: 'Key Usage', w: 150 }, { t: 'Trusted', w: 76 }, { t: 'Expired', w: 70 }],
        rows: [
          [{ v: 'ca', m: 3 }, 'office-ca', 'key-cert-sign, crl-sign', { v: 'yes', c: 'ok' }, 'no'],
          [{ v: 'srv-web', m: 4 }, 'gw.office.lan', 'tls-server', { v: 'yes', c: 'ok' }, 'no']
        ],
        sel: 0,
        notes: ['Кнопка создания сертификата', 'Кнопка подписи сертификата собственной CA', 'Корневой сертификат (CA)', 'Серверный сертификат для HTTPS/VPN']
      }],
      check: [{ d: 'терминал', c: '/certificate print\n/certificate print detail where name="srv-web"\n/ip service print where name="www-ssl"' }],
      warn: 'Самоподписанные сертификаты вызывают предупреждение у клиентов. Для публичных сервисов используйте сертификат от внешнего CA (Let\'s Encrypt → import).'
    },
    {
      id: 'sys-files', t: 'System → Files', lvl: 2,
      path: 'System → Files', tags: ['файлы', 'бэкап', 'пакеты'],
      purpose: 'Файловая система роутера: бэкапы, экспорт конфигурации, пакеты .npk, supout.rif, сертификаты. Отсюда файлы скачиваются на компьютер и загружаются обратно.',
      usage: [
        'Скачать/восстановить бэкап.',
        'Загрузить пакет .npk или лицензию.',
        'Хранить скрипты и конфиги для импорта.'
      ],
      steps: [
        { t: 'Откройте Files', d: 'System → Files: список файлов с размером и датой. Папки создаются кнопкой Create.' },
        { t: 'Загрузка', d: 'Перетащите файл в окно (в Windows/Linux Winbox) или кнопка Upload.' },
        { t: 'Скачивание', d: 'Выделите файл → Download. Для больших файлов удобнее SMB/FTP или fetch с другой стороны.' },
        { t: 'Запуск файла', d: 'Кнопка Run для `.npk` (установка пакета), `.rsc` (скрипт) — с осторожностью.' },
        { t: 'Очистка', d: 'Удалите старые бэкапы и supout.rif — они занимают флеш-память (см. System → Resources → Free HDD).' }
      ],
      scenes: [{
        path: 'System → Files', win: 'Files',
        tools: [{ t: '⬆', id: 'up', m: 1 }, { t: '⬇', id: 'down', m: 2 }, { t: 'Run', id: 'run' }, { t: 'Create', id: 'mkdir' }, { t: '−' }],
        cols: [{ t: 'Name', w: 260 }, { t: 'Type', w: 90 }, { t: 'Size', w: 90 }, { t: 'Creation Time', w: 150 }],
        rows: [
          [{ v: 'backups/office-2026-11-02.backup', m: 3 }, 'backup', '186.2 KiB', 'nov/02/2026 09:22:10'],
          ['config-2026-11-02.rsc', 'script', '14.8 KiB', 'nov/02/2026 09:23:02'],
          ['routeros-7.17.1-mipsbe.npk', 'package', '12.4 MiB', 'nov/01/2026 20:52:31']
        ],
        sel: 0,
        notes: ['Кнопка загрузки файла на роутер', 'Кнопка скачивания файла на компьютер', 'Выбранный файл бэкапа']
      }],
      check: [{ d: 'терминал', c: '/file print\n/file print detail where name~"backup"' }]
    },
    {
      id: 'sys-logging', t: 'System → Logging', lvl: 2,
      path: 'System → Logging', tags: ['логи', 'syslog', 'мониторинг'],
      purpose: 'Настройка журналирования: какие темы писать, куда (память, диск, syslog) и с какой детализацией. Без правильной настройки логи теряются при перезагрузке.',
      usage: [
        'Отправка логов на syslog-сервер (ELK, Graylog, Zabbix).',
        'Хранение логов firewall/PPPoE для разбора инцидентов.',
        'Разделение тем: ошибки — на почту, трафик — на диск.'
      ],
      steps: [
        { t: 'Действия', d: 'Logging → вкладка Actions → `+`: Name=`syslog-srv`, Type=`remote`, Remote=`192.168.88.50`, Remote Port=514, Syslog Facility=local0.' },
        { t: 'Правила', d: 'Вкладка Log Rules → `+`: Topics=`firewall,info`, Action=`syslog-srv`; ещё одно правило для `error` → `memory`.' },
        { t: 'Диск', d: 'Для долгого хранения: Action с Type=`disk`, File Name=`disk1/log.txt`, File Count=5, Max File Size=1M.' },
        { t: 'Просмотр', d: 'Log (отдельное окно) или System → Logging → кнопка Show Logs.' },
        { t: 'Проверка', d: 'В окне Log появляются записи выбранных тем; на сервере — принятые сообщения.' }
      ],
      scenes: [{
        path: 'System → Logging', win: 'Logging', tabs: ['Log Rules', 'Actions'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '⇅' }],
        cols: [{ t: 'Topics', w: 190 }, { t: 'Action', w: 130 }, { t: 'Prefix', w: 90 }, { t: 'Disabled', w: 70 }],
        rows: [
          [{ v: 'firewall,info', m: 2 }, { v: 'syslog-srv', m: 3 }, '', 'false'],
          ['error', 'memory', '', 'false'],
          ['pppoe,info', 'disk', 'pppoe:', 'false']
        ],
        sel: 0,
        notes: ['Кнопка добавления правила логирования', 'Темы, которые пишем в журнал', 'Действие: куда отправлять']
      }],
      check: [{ d: 'терминал', c: '/system logging print\n/system logging action print\n/log print where topics~"error"' }]
    },
    {
      id: 'sys-packages', t: 'System → Packages', lvl: 2,
      path: 'System → Packages', tags: ['пакеты', 'обновление', 'функции'],
      purpose: 'Управление установленными пакетами RouterOS: routeros, wifi, container, iot, user-manager (в 6), а также проверка и установка обновлений.',
      usage: [
        'Включить/отключить дополнительный пакет (например, `container`).',
        'Проверить и установить обновления RouterOS.',
        'Откатиться на предыдущую версию (Downgrade).'
      ],
      steps: [
        { t: 'Список пакетов', d: 'System → Packages: Name, Version, Scheduled, Status (installed/available).' },
        { t: 'Проверка обновлений', d: 'Кнопка Check For Updates → выберите канал (stable/long-term/testing).' },
        { t: 'Установка', d: 'Download & Install → роутер скачает и перезагрузится.' },
        { t: 'Дополнительный пакет', d: 'Скачайте .npk в Files → перезагрузка → пакет появится в списке; включается/выключается кнопками ✓/✕.' },
        { t: 'Откат', d: 'Downgrade → выберите предыдущую версию (доступна, если файлы остались в памяти).' }
      ],
      scenes: [{
        path: 'System → Packages', win: 'Packages',
        tools: [{ t: 'Check For Updates', id: 'check', m: 1 }, { t: 'Download & Install', id: 'di', m: 2 }, { t: 'Downgrade', id: 'down' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 190 }, { t: 'Version', w: 100 }, { t: 'Scheduled', w: 110 }, { t: 'Status', w: 130 }],
        rows: [
          ['routeros', '7.16.2', '', 'installed'],
          ['wifi-qcom', '7.16.2', '', 'installed'],
          [{ v: 'routeros-7.17.1', m: 3 }, '7.17.1', '', { v: 'available', m: 4 }]
        ],
        sel: 2,
        notes: ['Проверка наличия обновлений', 'Загрузка и установка обновления', 'Доступная версия', 'Статус пакета']
      }],
      check: [{ d: 'терминал', c: '/system package print\n/system package update check-for-updates\n/system resource print' }]
    },
    {
      id: 'sys-routerboard', t: 'System → RouterBOOT', lvl: 2,
      path: 'System → RouterBOOT', tags: ['firmware', 'загрузчик', 'booter'],
      purpose: 'Обновление и настройка загрузчика RouterBOOT (firmware). Также здесь включают защиту загрузчика (protected routerboot) и меняют порядок загрузки.',
      usage: [
        'Обновление прошивки после обновления RouterOS.',
        'Защита от сброса конфигурации кнопкой (protected routerboot).',
        'Настройка последовательной консоли и порядка загрузки.'
      ],
      steps: [
        { t: 'Проверьте версии', d: 'System → RouterBOOT: Current Firmware и Upgrade Firmware. Кнопка Upgrade активна при различии.' },
        { t: 'Обновите', d: 'Upgrade → Yes → роутер перезагрузится. Не выключайте питание.' },
        { t: 'Защита', d: 'После обновления: System → RouterBOOT → Settings → Protected RouterBOOT=yes (запрещает netinstall и сброс кнопкой).' },
        { t: 'Проверка', d: 'System → Resources: Current Firmware совпадает с версией RouterOS.' }
      ],
      scenes: [{
        path: 'System → RouterBOOT', win: 'RouterBOOT', tabs: ['RouterBOOT', 'Settings'], noTools: true,
        form: {
          title: 'RouterBOOT', buttons: ['Upgrade', 'Cancel'],
          fields: [
            { l: 'RouterBOARD', v: 'RB4011iGS+', ro: true },
            { l: 'Current Firmware', v: '7.16.2', ro: true },
            { l: 'Upgrade Firmware', v: '7.16.2', ro: true, m: 1 },
            { l: 'Boot Delay', v: '2s' }
          ]
        },
        notes: ['Кнопка прошивки загрузчика — после обновления RouterOS']
      }],
      check: [{ d: 'терминал', c: '/system routerboard print\n/system routerboard settings print' }],
      warn: 'Забытый пароль при Protected RouterBOOT=yes — только сервисный центр. Включайте, только если понимаете последствия.'
    },
    {
      id: 'sys-scheduler', t: 'System → Scheduler — расписание', lvl: 2,
      path: 'System → Scheduler', tags: ['cron', 'автоматизация', 'бэкап'],
      purpose: 'Планировщик запускает команды и скрипты по расписанию: ночной бэкап, проверка обновлений, перезагрузка по таймеру, ротация логов.',
      usage: [
        'Ежедневный бэкап конфигурации в 03:00.',
        'Перезагрузка зависших PPP-сессий по расписанию.',
        'Автоматическое включение/выключение Wi-Fi для гостей.',
        'Проверка обновлений раз в неделю.'
      ],
      steps: [
        { t: 'Создайте задачу', d: 'System → Scheduler → `+`: Name=`nightly-backup`, Start Time=`03:00:00`, Interval=`1d`, On Event=`/system backup save name=backups/auto`.' },
        { t: 'Политики', d: 'Policy: ftp, reboot, policy, read, test, write — должны покрывать то, что делает скрипт.' },
        { t: 'Несколько задач', d: 'Можно добавить несколько строк через `+` или использовать `Start Date`/`Interval`.' },
        { t: 'Отладка', d: 'Кнопка Run Now в окне задачи или `/system scheduler print` + проверка файла.' },
        { t: 'Проверка', d: 'System → Log: записи о выполнении; в Files появляется новый бэкап.' }
      ],
      scenes: [{
        path: 'System → Scheduler', win: 'Scheduler', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }, { t: 'Run Now', id: 'run' }],
        cols: [{ t: 'Name', w: 140 }, { t: 'Start Time', w: 110 }, { t: 'Interval', w: 90 }, { t: 'On Event', w: 300 }],
        rows: [
          [{ v: 'nightly-backup', m: 2 }, { v: '03:00:00', m: 3 }, { v: '1d', m: 4 }, '/system backup save name=backups/auto'],
          ['update-check', '04:30:00', '7d', '/system package update check-for-updates'],
          ['reboot-night', '05:00:00', '1d', '/system reboot']
        ],
        sel: 0,
        notes: ['Кнопка создания задачи', 'Имя задачи', 'Время первого запуска', 'Периодичность: 1d = раз в сутки']
      }],
      check: [{ d: 'терминал', c: '/system scheduler print\n/system scheduler print detail\n/log print where topics~"script"' }]
    },
    {
      id: 'sys-scripts', t: 'System → Scripts', lvl: 3,
      path: 'System → Scripts', tags: ['скрипты', 'автоматизация'],
      purpose: 'Хранилище собственных скриптов RouterOS (собственный язык с командами меню). Скрипты вызываются из scheduler, netwatch, кнопок Winbox и других скриптов.',
      usage: [
        'Резервное копирование с отправкой на сервер (fetch + FTP/SFTP).',
        'Автоматическая блокировка IP после серии неудачных логинов.',
        'Сбор инвентаризации: список интерфейсов, адресов, версий.',
        'Переключение провайдера по событию Netwatch.'
      ],
      steps: [
        { t: 'Создайте скрипт', d: 'System → Scripts → `+`: Name=`backup-send`, Policy: read, write, ftp, test.' },
        { t: 'Напишите код', d: 'Например: `/system backup save name=auto; /tool fetch address=10.0.0.5 src-path=auto.backup user=u password=p upload=yes mode=ftp`.' },
        { t: 'Проверка синтаксиса', d: 'Кнопка Run Script — ошибки видны в окне вывода и в Log.' },
        { t: 'Автозапуск', d: 'System → Scheduler: On Event=`/system script run backup-send`.' },
        { t: 'Отладка', d: '`:log info "step 1"` и просмотр Log — простейший способ понять, где остановился скрипт.' }
      ],
      scenes: [{
        path: 'System → Scripts', win: 'Script', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−', }, { t: 'Run Script', id: 'run', m: 4 }],
        cols: [{ t: 'Name', w: 150 }, { t: 'Owner', w: 90 }, { t: 'Policy', w: 130 }, { t: 'Run Count', w: 90 }],
        rows: [[{ v: 'backup-send', m: 2 }, 'admin', { v: 'read,write,ftp,test', m: 3 }, '12']],
        sel: 0,
        form: {
          title: 'Script <backup-send>', buttons: ['OK', 'Cancel', 'Run Script'],
          fields: [
            { l: 'Name', v: 'backup-send' },
            { l: 'Source', v: '/system backup save name=auto; /tool fetch ...' },
            { l: 'Policy', v: 'read,write,ftp,test' }
          ]
        },
        notes: ['Кнопка создания скрипта', 'Имя скрипта', 'Политики должны разрешать вызываемые команды', 'Запуск скрипта для проверки']
      }],
      check: [{ d: 'терминал', c: '/system script print\n/system script run backup-send\n/log print where topics~"script"' }]
    },
    {
      id: 'sys-backup-menu', t: 'System → Backup / Restore', lvl: 1,
      path: 'Files → Backup · Restore', tags: ['бэкап', 'восстановление'],
      purpose: 'Пункт меню, через который создаётся бинарный снимок конфигурации и восстанавливается состояние роутера. Подробный разбор — в статье «Backup, Export и восстановление» раздела «Старт».',
      usage: [
        'Перед обновлением RouterOS.',
        'Перед изменением firewall/VLAN.',
        'Для быстрого возврата к рабочему состоянию.'
      ],
      steps: [
        { t: 'Создание', d: 'Files → Backup: имя файла, пароль (опционально), Don\'t Encrypt.' },
        { t: 'Восстановление', d: 'Files → выбрать файл → Restore → подтвердить перезагрузку.' },
        { t: 'Автоматизация', d: 'Scheduler + `/system backup save name=backups/auto`.' },
        { t: 'Перенос на другой роутер', d: 'Используйте `/export` (текст), а не .backup.' }
      ],
      scenes: [{
        path: 'Files → Backup', win: 'Backup', noTools: true,
        form: {
          title: 'Backup', buttons: ['Backup', 'Cancel'],
          fields: [
            { l: 'Name', v: 'backups/office-2026-11-02', m: 1 },
            { l: 'Password', v: '' },
            { l: 'Don\'t Encrypt', v: false, type: 'check' }
          ]
        },
        notes: ['Имя файла: папка + дата + назначение']
      }],
      check: [{ d: 'терминал', c: '/system backup save name=backups/test\n/file print where name~"backup"' }],
      links: [{ t: 'Полная статья: backup и export', u: '#/start-backup' }]
    },
    {
      id: 'sys-resources', t: 'System → Resources', lvl: 1,
      path: 'System → Resources', tags: ['cpu', 'память', 'версия'],
      purpose: 'Паспорт устройства и текущая нагрузка: модель, архитектура, версия RouterOS и прошивки, uptime, загрузка CPU, свободная память и место на диске.',
      usage: [
        'Быстрая проверка версий перед обновлением.',
        'Диагностика нехватки памяти (частые перезагрузки, падение сервисов).',
        'Определение причины высокой загрузки CPU.'
      ],
      steps: [
        { t: 'Откройте Resources', d: 'System → Resources: вкладки General, Storage, Hardware.' },
        { t: 'Проверьте версии', d: 'Version и Current Firmware — должны совпадать после обновления.' },
        { t: 'CPU', d: 'CPU Load в процентах; вкладка Hardware показывает частоту и ядра.' },
        { t: 'Память/диск', d: 'Free Memory и Free HDD Space: если HDD < 10%, удалите старые файлы и supout.rif.' },
        { t: 'Uptime', d: 'Сброс uptime без причины = спонтанная перезагрузка (watchdog, питание, kernel panic).' }
      ],
      scenes: [{
        path: 'System → Resources', win: 'Resources', tabs: ['General', 'Storage', 'Hardware'], noTools: true,
        form: {
          title: 'Resources', buttons: false,
          fields: [
            { l: 'Uptime', v: '12w1d07:22:51', ro: true },
            { l: 'Version', v: '7.16.2 (stable)', ro: true, m: 1 },
            { l: 'Current Firmware', v: '7.16.2', ro: true, m: 2 },
            { l: 'Model', v: 'RB4011iGS+', ro: true },
            { l: 'Architecture', v: 'arm', ro: true },
            { l: 'CPU Load', v: '7%', ro: true, m: 3 },
            { l: 'Free Memory', v: '612.4 MiB', ro: true },
            { l: 'Free HDD Space', v: '812.0 MiB', ro: true }
          ]
        },
        notes: ['Версия RouterOS', 'Версия прошивки — должна совпадать с RouterOS', 'Загрузка CPU в реальном времени']
      }],
      check: [{ d: 'терминал', c: '/system resource print\n/system resource hardware print' }]
    },
    {
      id: 'sys-health', t: 'System → Health', lvl: 2,
      path: 'System → Health', tags: ['температура', 'напряжение', 'питание'],
      purpose: 'Датчики устройства: температура, напряжение питания, иногда ток и обороты вентилятора. Помогает выявить проблемы питания и перегрева до отказа.',
      usage: [
        'Диагностика перезагрузок из-за нестабильного питания (PoE, БП).',
        'Контроль температуры в шкафу/на улице.',
        'Мониторинг через SNMP/OID.'
      ],
      steps: [
        { t: 'Откройте Health', d: 'System → Health: список датчиков с текущими значениями.' },
        { t: 'Оцените значения', d: 'Температура 40–60 °C — норма; >75 °C — проверьте вентиляцию. Напряжение должно быть в пределах ±10% от номинала.' },
        { t: 'Мониторинг', d: 'SNMP: OID из MIKROTIK-MIB (`mtxrHealth*`) или Zabbix-шаблон MikroTik.' },
        { t: 'Действия', d: 'При перегреве — очистка, замена термопасты, перенос в проветриваемое место.' }
      ],
      scenes: [{
        path: 'System → Health', win: 'Health', noTools: true,
        form: {
          title: 'Health', buttons: false,
          fields: [
            { l: 'Temperature', v: '48 °C', ro: true, m: 1 },
            { l: 'Voltage', v: '24.1 V', ro: true, m: 2 },
            { l: 'CPU Temperature', v: '54 °C', ro: true },
            { l: 'Fan 1 Speed', v: '3120 RPM', ro: true }
          ]
        },
        notes: ['Температура корпуса', 'Напряжение питания — просадки вызывают перезагрузки']
      }],
      check: [{ d: 'терминал', c: '/system health print\n/system health print detail' }]
    },
    {
      id: 'sys-watchdog', t: 'System → Watchdog', lvl: 3,
      path: 'System → Watchdog', tags: ['watchdog', 'перезагрузка', 'отказоустойчивость'],
      purpose: 'Автоматическая перезагрузка или восстановление при зависании: watchdog проверяет CPU, адрес шлюза (ping), таймеры и при отказе перезагружает роутер, сохраняя supout.rif.',
      usage: [
        'Удалённые объекты без физического доступа.',
        'Защита от зависания при перегрузке или ошибке драйвера.',
        'Восстановление при пропадании связи с шлюзом провайдера.'
      ],
      steps: [
        { t: 'Настройте таймер', d: 'System → Watchdog: Watchdog Timer=yes, Watchdog Timer Timeout=00:05:00.' },
        { t: 'Проверка адреса', d: 'Watch Address=8.8.8.8 (или шлюз провайдера), Ping Timeout=60s — если пинг не проходит, роутер перезагрузится.' },
        { t: 'Диагностика', d: 'Automatic Supout=yes — перед перезагрузкой сохраняется supout.rif для анализа.' },
        { t: 'Проверка', d: 'System → Log: записи «watchdog» о срабатывании.' }
      ],
      scenes: [{
        path: 'System → Watchdog', win: 'Watchdog', noTools: true,
        form: {
          title: 'Watchdog', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Watchdog Timer', v: 'yes', type: 'select' },
            { l: 'Watch Address', v: '8.8.8.8', m: 1 },
            { l: 'Ping Timeout', v: '60s', m: 2 },
            { l: 'Automatic Supout', v: 'yes', type: 'select' },
            { l: 'No Ping Delay', v: '5m' }
          ]
        },
        notes: ['Адрес для проверки доступности', 'Если пинг не проходит дольше этого времени — перезагрузка']
      }],
      check: [{ d: 'терминал', c: '/system watchdog print\n/log print where topics~"watchdog"' }],
      warn: 'Watchdog по ping может вызвать «перезагрузочный цикл», если проблема на стороне провайдера. Увеличьте таймаут и используйте несколько адресов.'
    },
    {
      id: 'sys-autoupgrade', t: 'System → Auto Upgrade', lvl: 2,
      path: 'System → Auto Upgrade', tags: ['обновление', 'автоматизация'],
      purpose: 'Автоматическая проверка и установка обновлений RouterOS в заданное время. Удобно для парка устройств, но требует осторожности на продакшене.',
      usage: [
        'Парк офисных роутеров с обслуживанием по расписанию.',
        'Устройства без регулярного администрирования.',
        'Тестовые площадки для проверки новых версий.'
      ],
      steps: [
        { t: 'Включите', d: 'System → Auto Upgrade: Enabled=yes, Choose Update Channel=`stable` (или long-term).' },
        { t: 'Расписание', d: 'Укажите время проверки (например, 04:00) — обновление поставится в окно обслуживания.' },
        { t: 'Проверьте место', d: 'System → Resources: достаточно свободного места для пакетов.' },
        { t: 'Резервная копия', d: 'Перед автообновлением обязательно настройте Scheduler с бэкапом.' },
        { t: 'Проверка', d: 'System → Log: записи о загрузке и установке; версия изменится после перезагрузки.' }
      ],
      scenes: [{
        path: 'System → Auto Upgrade', win: 'Auto Upgrade', noTools: true,
        form: {
          title: 'Auto Upgrade', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
            { l: 'Update Channel', v: 'stable', type: 'select', m: 2 }
          ]
        },
        notes: ['Включение автоматических обновлений', 'Канал: stable / long-term / testing']
      }],
      check: [{ d: 'терминал', c: '/system package update print\n/system package update check-for-updates' }],
      warn: 'На продакшене сначала тестируйте версию на одном устройстве: stable-релизы иногда содержат регрессии.'
    },
    {
      id: 'sys-license', t: 'System → License', lvl: 3,
      path: 'System → License', tags: ['лицензия', 'chr', 'уровень'],
      purpose: 'Просмотр и активация лицензии RouterOS: уровень (free, p1, p10, unlimited), срок, ограничения. Для CHR лицензия определяет скорость интерфейсов.',
      usage: [
        'Проверка уровня лицензии перед включением функций (например, количества PPP-сессий).',
        'Активация CHR-лицензии по ключу.',
        'Планирование апгрейда лицензии.'
      ],
      steps: [
        { t: 'Откройте License', d: 'System → License: Software ID, Level, Features (restrictions).' },
        { t: 'Активация', d: 'Купите ключ на mikrotik.com, введите в поле License Key → Start/Apply.' },
        { t: 'CHR', d: 'Free-лицензия ограничивает скорость 1 Мбит/с на интерфейс; p1 — 1 Гбит, unlimited — без ограничений.' },
        { t: 'Проверка', d: 'После активации уровень обновится без перезагрузки.' }
      ],
      scenes: [{
        path: 'System → License', win: 'License', noTools: true,
        form: {
          title: 'License', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Software ID', v: 'A1B2-C3D4-E5F6-7890', ro: true },
            { l: 'Level', v: 'free', ro: true, m: 1 },
            { l: 'Features', v: '1 Mbit/s per interface', ro: true, m: 2 },
            { l: 'License Key', v: '', m: 3 }
          ]
        },
        notes: ['Текущий уровень лицензии', 'Ограничения уровня', 'Поле для ввода ключа активации']
      }],
      check: [{ d: 'терминал', c: '/system license print\n/system license print detail' }]
    },
    {
      id: 'sys-note-leds', t: 'System → Note и LEDs', lvl: 1,
      path: 'System → Note · LEDs', tags: ['заметка', 'индикаторы'],
      purpose: 'Note — сообщение, которое показывается при входе (полезно для контактов ответственного). LEDs — настройка индикаторов: что показывает каждый светодиод.',
      usage: [
        'Оставить контакты администратора и дату последнего изменения.',
        'Настроить LED на активность интерфейса/PPPoE.',
        'Погасить индикаторы, мешающие ночью (для домашних моделей).'
      ],
      steps: [
        { t: 'Note', d: 'System → Note: введите текст и включите Show At Login+CLI — сообщение появится при подключении.' },
        { t: 'LEDs', d: 'System → LEDs: выбор интерфейса и типа активности (link, tx, rx, wireless).' },
        { t: 'Настройки LED', d: 'System → LEDs Settings: All LEDs Off, LED Dark Mode — отключение подсветки.' },
        { t: 'Проверка', d: 'Переподключитесь — примечание отображается; индикаторы реагируют на трафик.' }
      ],
      scenes: [{
        path: 'System → Note', win: 'Note', noTools: true,
        form: {
          title: 'Note', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Show At Startup', v: true, type: 'check' },
            { l: 'Show At Login', v: true, type: 'check' },
            { l: 'Note', v: 'Админ: +375 29 000-00-00. Изменено 02.11.2026', m: 1 }
          ]
        },
        notes: ['Текст примечания — контакты и дата последнего изменения']
      }],
      check: [{ d: 'терминал', c: '/system note print\n/system leds print\n/system leds settings print' }]
    },
    {
      id: 'sys-history', t: 'System → History', lvl: 2,
      path: 'System → History', tags: ['история', 'аудит', 'undo'],
      purpose: 'История изменений конфигурации: список выполненных команд с возможностью отмены последних действий. Быстрый способ понять, что изменили перед инцидентом.',
      usage: [
        'Отменить ошибочное изменение, сделанное минуту назад.',
        'Понять, кто и когда менял firewall.',
        'Разбор после потери доступа.'
      ],
      steps: [
        { t: 'Откройте History', d: 'System → History: список команд в обратном порядке.' },
        { t: 'Найдите изменение', d: 'Прокрутите до нужного момента; колонка с командой показывает текст.' },
        { t: 'Отмена', d: 'Выберите действие → Undo (если доступно) или примените обратную команду вручную.' },
        { t: 'Проверка', d: 'После отмены проверьте работу сервисов и сохраните Backup.' }
      ],
      scenes: [{
        path: 'System → History', win: 'History', noTools: true,
        cols: [{ t: '#', w: 30 }, { t: 'Command', w: 560 }, { t: 'Time', w: 150 }],
        rows: [
          ['1', { v: '/ip firewall filter add chain=input action=drop in-interface=WAN', m: 1 }, '09:44:12'],
          ['2', '/ip address add address=192.168.88.1/24 interface=bridge-lan', '09:38:51']
        ],
        sel: 0,
        notes: ['Последнее изменение — его можно отменить кнопкой Undo']
      }],
      check: [{ d: 'терминал', c: '/system history print' }]
    }
  ]
});

window.DATA.push({
  id: 'tools', name: 'Tools (диагностика)', ic: 'system',
  items: [
    {
      id: 'tool-ping', t: 'Tools → Ping', lvl: 1,
      path: 'Tools → Ping', tags: ['ping', 'диагностика'],
      purpose: 'Проверка доступности узла ICMP-запросами и измерение задержки/потерь. Самый быстрый способ понять, есть ли связь и на каком участке проблема.',
      usage: [
        'Проверка интернета после настройки WAN.',
        'Локализация обрыва: шлюз провайдера ↔ внешний адрес.',
        'Проверка качества канала (потери, джиттер).'
      ],
      steps: [
        { t: 'Откройте Ping', d: 'Tools → Ping: Address, Interface (для источника), Count, Size, Interval.' },
        { t: 'Запустите', d: 'Start. В таблице — время ответа, TTL, потери.' },
        { t: 'Источник', d: 'Укажите Interface или Src. Address, чтобы проверить доступность именно из нужной сети (например, из VLAN).' },
        { t: 'Интерпретация', d: 'Нет ответа, но traceroute идёт — фильтр ICMP у цели. Растущее время — перегрузка канала.' },
        { t: 'Stop/Clear', d: 'Остановить и очистить результаты.' }
      ],
      scenes: [{
        path: 'Tools → Ping', win: 'Ping', noTools: true,
        form: {
          title: 'Ping', buttons: ['Start', 'Stop', 'Clear'],
          fields: [
            { l: 'Address', v: '8.8.8.8', m: 1 },
            { l: 'Interface', v: 'WAN', type: 'select', m: 2 },
            { l: 'Count', v: '10' },
            { l: 'Packet Size', v: '56' }
          ]
        },
        notes: ['Адрес цели', 'Интерфейс-источник — проверка именно из этой сети']
      }],
      check: [{ d: 'терминал', c: '/ping adressee=8.8.8.8 count=5\n/ping 1.1.1.1 interface=WAN count=5' }]
    },
    {
      id: 'tool-traceroute', t: 'Tools → Traceroute', lvl: 2,
      path: 'Tools → Traceroute', tags: ['traceroute', 'маршрут'],
      purpose: 'Показывает путь пакетов до узла: список промежуточных роутеров и задержки. Помогает найти, где именно теряется трафик.',
      usage: [
        'Определить, где обрыв: у провайдера или дальше.',
        'Проверить, через какого провайдера идёт маршрут при мультихоминге.',
        'Обнаружить асимметричную маршрутизацию.'
      ],
      steps: [
        { t: 'Задайте адрес', d: 'Tools → Traceroute: Address, Interface (источник), Use ICMP=yes (если UDP блокируется).' },
        { t: 'Запустите', d: 'Start. Каждая строка — хоп с задержкой; `*` означает отсутствие ответа.' },
        { t: 'Анализ', d: 'Обрыв на одном из первых хопов — проблема у провайдера; в середине — транзит; в конце — цель блокирует ICMP.' },
        { t: 'Сравнение', d: 'Запустите traceroute с разных источников (WAN/LAN), чтобы увидеть разницу маршрутов.' }
      ],
      scenes: [{
        path: 'Tools → Traceroute', win: 'Traceroute', noTools: true,
        form: {
          title: 'Traceroute', buttons: ['Start', 'Stop'],
          fields: [
            { l: 'Address', v: '8.8.8.8', m: 1 },
            { l: 'Interface', v: 'WAN', type: 'select' },
            { l: 'Use ICMP', v: 'yes', type: 'select', m: 2 }
          ]
        },
        notes: ['Адрес назначения', 'ICMP-режим помогает, если UDP-пробы фильтруются']
      }],
      check: [{ d: 'терминал', c: '/tool traceroute 8.8.8.8 count=3\n/tool traceroute 8.8.8.8 use-icmp=yes' }]
    },
    {
      id: 'tool-torch', t: 'Tools → Torch — кто грузит канал', lvl: 2,
      path: 'Tools → Torch', tags: ['torch', 'трафик', 'диагностика'],
      purpose: 'Мониторинг трафика в реальном времени с разбивкой по адресам, портам и протоколам. Показывает, кто именно «съедает» канал.',
      usage: [
        'Найти устройство, которое качает трафик.',
        'Понять, какой сервис вызывает нагрузку (порты).',
        'Проверить, идёт ли трафик через нужный интерфейс.'
      ],
      steps: [
        { t: 'Выберите интерфейс', d: 'Tools → Torch → Interface=`bridge-lan` (или WAN), Start.' },
        { t: 'Колонки', d: 'Src. Address, Dst. Address, Protocol, Src/Dst Port, Tx/Rx Rate.' },
        { t: 'Фильтры', d: 'Port=none, Protocol=any, Src/Dst Address — сузьте область.' },
        { t: 'Сортировка', d: 'Клик по Rate — сверху самые активные.' },
        { t: 'Дальше', d: 'Найденный адрес ограничьте Simple Queue или временно заблокируйте в firewall.' }
      ],
      scenes: [{
        path: 'Tools → Torch', win: 'Torch', noTools: true,
        form: {
          title: 'Torch', buttons: ['Start', 'Stop'],
          fields: [
            { l: 'Interface', v: 'bridge-lan', type: 'select', m: 1 },
            { l: 'Src. Address', v: '', m: 2 },
            { l: 'Protocol', v: 'any', type: 'select' }
          ]
        },
        notes: ['Интерфейс, трафик которого смотрим', 'Фильтр по адресу источника']
      }],
      check: [{ d: 'терминал', c: '/tool torch interface=bridge-lan duration=10' }]
    },
    {
      id: 'tool-profiler', t: 'Tools → Profiler', lvl: 3,
      path: 'Tools → Profiler', tags: ['cpu', 'производительность'],
      purpose: 'Профилировщик показывает, какие задачи RouterOS нагружают CPU: firewall, queues, bridging, wireless, управление. Позволяет найти узкое место.',
      usage: [
        'Высокая загрузка CPU: что именно её вызывает.',
        'Оценка, тянет ли модель включение новых функций.',
        'Проверка влияния mangle/queues на производительность.'
      ],
      steps: [
        { t: 'Запустите', d: 'Tools → Profiler → Start. Таблица обновляется в реальном времени.' },
        { t: 'Колонки', d: 'Name (задача), CPU %, а также время в прерываниях.' },
        { t: 'Анализ', d: 'firewall — много правил/сложные mangle; queues — очереди; bridging — не работает offload.' },
        { t: 'Оптимизация', d: 'FastTrack, отключение лишних правил, аппаратный offload, перенос QoS на коммутатор.' }
      ],
      scenes: [{
        path: 'Tools → Profiler', win: 'Profiler', noTools: true,
        cols: [{ t: 'Name', w: 260 }, { t: 'CPU', w: 90 }, { t: 'Used', w: 100 }],
        rows: [
          [{ v: 'firewall', m: 1 }, { v: '38.4%', m: 2 }, '0.384'],
          ['queues', '12.1%', '0.121'],
          ['ethernet', '8.2%', '0.082'],
          ['management', '1.1%', '0.011']
        ],
        sel: 0,
        notes: ['Задача, нагружающая процессор', 'Доля CPU — главный кандидат на оптимизацию']
      }],
      check: [{ d: 'терминал', c: '/tool profile duration=10\n/tool profile cpu=all duration=5' }]
    },
    {
      id: 'tool-sniffer', t: 'Tools → Sniffer — дамп трафика', lvl: 3,
      path: 'Tools → Sniffer', tags: ['sniffer', 'pcap', 'анализ'],
      purpose: 'Захват пакетов на интерфейсе в формате pcap для анализа в Wireshark. Незаменим, когда нужно понять, почему сервис не работает.',
      usage: [
        'Разбор проблем с SIP/VoIP, DHCP, PPPoE.',
        'Проверка, приходят ли пакеты на роутер.',
        'Анализ ARP-конфликтов и петель.'
      ],
      steps: [
        { t: 'Вкладка General', d: 'Tools → Sniffer: Interface=`ether1` или `bridge-lan`, Filter Stream=all, File Name=`sniff.pcap`, File Limit=10000.' },
        { t: 'Фильтры', d: 'Вкладка Filter: MAC/IP/Port/Protocol — сузьте захват, чтобы файл не разросся.' },
        { t: 'Запуск', d: 'Start/Stop. Файл появится в Files — скачайте и откройте в Wireshark.' },
        { t: 'Streaming (опционально)', d: 'Можно отправлять поток сразу на удалённый анализатор (TZSP) — вкладка Streaming.' },
        { t: 'Удаление', d: 'После анализа удалите файл: захват занимает флеш-память.' }
      ],
      scenes: [{
        path: 'Tools → Sniffer', win: 'Sniffer', tabs: ['General', 'Filter', 'Streaming'], noTools: true,
        form: {
          title: 'Sniffer', buttons: ['Start', 'Stop'],
          fields: [
            { l: 'Interface', v: 'bridge-lan', type: 'select', m: 1 },
            { l: 'File Name', v: 'sniff.pcap', m: 2 },
            { l: 'File Limit', v: '10000' },
            { l: 'Memory Limit', v: '10000' },
            { l: 'Filter Stream', v: 'all', type: 'select' }
          ]
        },
        notes: ['Интерфейс захвата', 'Имя файла в Files (pcap для Wireshark)']
      }],
      check: [{ d: 'терминал', c: '/tool sniffer print\n/tool sniffer quick interface=bridge-lan duration=10\n/file print where name~"pcap"' }]
    },
    {
      id: 'tool-netwatch', t: 'Tools → Netwatch — мониторинг и реакция', lvl: 2,
      path: 'Tools → Netwatch', tags: ['netwatch', 'failover', 'скрипты'],
      purpose: 'Netwatch следит за доступностью адреса и выполняет скрипты при изменении состояния: переключение на резервный канал, отправка уведомления, перезапуск интерфейса.',
      usage: [
        'Автоматический failover на резервного провайдера.',
        'Уведомление в Telegram/почту о падении канала.',
        'Перезапуск «зависшего» PPPoE-интерфейса.'
      ],
      steps: [
        { t: 'Создайте запись', d: 'Tools → Netwatch → `+`: Host=`8.8.8.8`, Type=icmp, Interval=10s, Timeout=1s.' },
        { t: 'Скрипт Down', d: 'Вкладка Down: `/ip route disable [find comment="main-isp"]` и включение резервного.' },
        { t: 'Скрипт Up', d: 'Вкладка Up: обратные команды — вернуть основной канал.' },
        { t: 'Уведомления', d: 'В скрипте используйте `/tool fetch` для вебхука (Telegram через Bot API).' },
        { t: 'Проверка', d: 'Колонка Status (up/down) и лог: записи «netwatch» при переключении.' }
      ],
      scenes: [{
        path: 'Tools → Netwatch', win: 'Netwatch', tabs: ['Host', 'Down', 'Up'],
        tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Host', w: 130 }, { t: 'Interval', w: 84 }, { t: 'Status', w: 84 }, { t: 'Since', w: 130 }, { t: 'Comment', w: 160 }],
        rows: [[{ v: '8.8.8.8', m: 2 }, { v: '10s' }, { v: 'up', c: 'ok', m: 3 }, 'nov/02 09:10:44', 'основной канал']],
        sel: 0,
        form: {
          title: 'Netwatch <8.8.8.8>', tabs: ['Host', 'Down', 'Up'], buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Host', v: '8.8.8.8' },
            { l: 'Type', v: 'icmp', type: 'select' },
            { l: 'Interval', v: '00:00:10' },
            { l: 'Down', v: '/ip route disable [find comment="main"]', m: 4 }
          ]
        },
        notes: ['Кнопка добавления наблюдения', 'Адрес, доступность которого проверяем', 'Текущее состояние', 'Скрипт, выполняемый при падении']
      }],
      check: [{ d: 'терминал', c: '/tool netwatch print\n/tool netwatch print detail\n/log print where topics~"netwatch"' }]
    },
    {
      id: 'tool-graphing', t: 'Tools → Graphing', lvl: 2,
      path: 'Tools → Graphing', tags: ['графики', 'мониторинг'],
      purpose: 'Встроенные графики нагрузки: ресурсы, интерфейсы, очереди, firewall. Позволяют посмотреть историю без внешнего мониторинга.',
      usage: [
        'Увидеть, когда канал был перегружен.',
        'Проверить историю CPU и памяти при поиске причин перезагрузок.',
        'Быстрый отчёт по трафику интерфейса.'
      ],
      steps: [
        { t: 'Включите сбор', d: 'Tools → Graphing → Settings: Interface Graphs=all, Queue Graphs, Resource Graphs=yes.' },
        { t: 'Откройте график', d: 'Tools → Graphing → вкладка Interface/Resources → выберите объект → кнопка Graph.' },
        { t: 'Период', d: 'Переключайте 30 мин / 1 день / 1 неделю / 1 месяц.' },
        { t: 'Ограничения', d: 'Графики живут в памяти и пропадают после перезагрузки; для долгой истории — SNMP + Zabbix/LibreNMS.' }
      ],
      scenes: [{
        path: 'Tools → Graphing', win: 'Graphing', tabs: ['Interface', 'Resources', 'Queue', 'Settings'], noTools: true,
        form: {
          title: 'Graphing Settings', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Interface Graphs', v: 'all', type: 'select', m: 1 },
            { l: 'Resource Graphs', v: 'yes', type: 'select', m: 2 },
            { l: 'Store Graphs on Disk', v: 'no', type: 'select' }
          ]
        },
        notes: ['Сбор графиков по всем интерфейсам', 'Сбор по CPU/памяти/диску']
      }],
      check: [{ d: 'терминал', c: '/tool graphing print\n/tool graphing interface print' }]
    },
    {
      id: 'tool-bwtest', t: 'Tools → Bandwidth Test', lvl: 2,
      path: 'Tools → Bandwidth Test', tags: ['скорость', 'btest'],
      purpose: 'Замер пропускной способности между двумя MikroTik (или между MikroTik и BTest-сервером). Показывает реальную скорость канала, а не «спидтест из браузера».',
      usage: [
        'Проверка скорости канала провайдера.',
        'Тест VPN-туннеля (WireGuard/IPsec).',
        'Сравнение скорости до/после настройки очередей.'
      ],
      steps: [
        { t: 'На дальней стороне', d: 'Tools → Bandwidth Server: Enabled=yes (или разрешите в firewall tcp 2000).' },
        { t: 'Клиент', d: 'Tools → Bandwidth Test: Address=<IP теста>, Protocol=tcp, Direction=both, Duration=10s, User/Password — от аккаунта на сервере.' },
        { t: 'Запуск', d: 'Start: колонки Tx/Rx Current и Total.' },
        { t: 'Ограничения', d: 'Тест нагружает CPU (особенно на слабых моделях) и канал — не запускайте в рабочие часы.' }
      ],
      scenes: [{
        path: 'Tools → Bandwidth Test', win: 'Bandwidth Test', noTools: true,
        form: {
          title: 'Bandwidth Test', buttons: ['Start', 'Stop'],
          fields: [
            { l: 'Address', v: '203.0.113.20', m: 1 },
            { l: 'Protocol', v: 'tcp', type: 'select' },
            { l: 'Direction', v: 'both', type: 'select' },
            { l: 'Duration', v: '10' },
            { l: 'User', v: 'admin' }
          ]
        },
        notes: ['Адрес второй стороны (BTest-сервера)']
      }],
      check: [{ d: 'терминал', c: '/tool bandwidth-server print\n/tool bandwidth-test address=203.0.113.20 direction=both duration=10' }]
    },
    {
      id: 'tool-trafficgen', t: 'Tools → Traffic Generator', lvl: 3,
      path: 'Tools → Traffic Generator', tags: ['нагрузка', 'тест'],
      purpose: 'Генератор трафика для проверки канала и оборудования под нагрузкой: задаёт размер пакетов, скорость, потоки.',
      usage: [
        'Проверка стабильности VPN/канала под нагрузкой.',
        'Тестирование QoS и очередей.',
        'Проверка, держит ли роутер заявленную скорость.'
      ],
      steps: [
        { t: 'Создайте поток', d: 'Tools → Traffic Generator → `+`: Name=`test1`, Interface=WAN, Dst. Address=203.0.113.20, Header Size=32, Frame Size=1500, Tx Size=1000 kbps.' },
        { t: 'Запуск', d: '✓ Enable (или кнопка Start) — трафик пойдёт сразу.' },
        { t: 'Мониторинг', d: 'Interface → Traffic и Queues показывают фактическую скорость.' },
        { t: 'Остановка', d: 'Disable потока или ✕. Не оставляйте включённым.' }
      ],
      scenes: [{
        path: 'Tools → Traffic Generator', win: 'Traffic Generator', tools: [{ t: '+', id: 'add', m: 1 }, { t: '−' }, { t: '✓' }, { t: '✕' }],
        cols: [{ t: 'Name', w: 100 }, { t: 'Interface', w: 100 }, { t: 'Dst. Address', w: 130 }, { t: 'Frame Size', w: 90 }, { t: 'Tx Size', w: 100 }],
        rows: [[{ v: 'test1', m: 2 }, { v: 'WAN', m: 3 }, { v: '203.0.113.20' }, { v: '1500' }, { v: '1000 kbps' }]],
        sel: 0,
        notes: ['Кнопка создания потока', 'Имя потока', 'Интерфейс, через который генерируется трафик']
      }],
      check: [{ d: 'терминал', c: '/tool traffic-generator print\n/tool traffic-generator quick interface=WAN data-size=1500 tx-speed=1M duration=10' }]
    },
    {
      id: 'tool-email-wol', t: 'Tools → Email и Wake on LAN', lvl: 2,
      path: 'Tools → Email · Wake on LAN', tags: ['email', 'wol', 'уведомления'],
      purpose: 'Email отправляет письмо через SMTP (для уведомлений из скриптов), Wake on LAN включает компьютер по MAC-адресу из локальной сети.',
      usage: [
        'Уведомления о падении канала через скрипт + email.',
        'Отправка бэкапа на почту.',
        'Удалённое включение ПК/сервера.'
      ],
      steps: [
        { t: 'Email', d: 'Tools → Email: Server=`smtp.example.com`, Port=587, From=`router@example.com`, User/Password, TLS=yes.' },
        { t: 'Проверка', d: 'Кнопка Send Email: To=ваш ящик, Subject/Body — письмо должно прийти.' },
        { t: 'WoL', d: 'Tools → Wake on LAN: MAC Address=..., Interface=bridge-lan → кнопка Wake on LAN.' },
        { t: 'Из скрипта', d: '`/tool e-mail send to=admin@example.com subject="WAN down" body=$message`.' }
      ],
      scenes: [{
        path: 'Tools → Wake on LAN', win: 'Wake on LAN', noTools: true,
        form: {
          title: 'Wake on LAN', buttons: ['Wake on LAN', 'Cancel'],
          fields: [
            { l: 'MAC Address', v: '00:1B:44:11:3A:B7', m: 1 },
            { l: 'Interface', v: 'bridge-lan', type: 'select', m: 2 }
          ]
        },
        notes: ['MAC целевого устройства', 'Интерфейс, в котором находится устройство']
      }],
      check: [{ d: 'терминал', c: '/tool e-mail print\n/tool wol interface=bridge-lan mac=00:1B:44:11:3A:B7' }]
    },
    {
      id: 'tool-romon', t: 'Tools → RoMON', lvl: 3,
      path: 'Tools → RoMON', tags: ['romon', 'управление', 'l2'],
      purpose: 'RoMON — протокол управления MikroTik-устройствами на канальном уровне. Позволяет «достучаться» до роутера за несколькими другими, если IP-доступ потерян.',
      usage: [
        'Доступ к устройству без IP в цепочке MikroTik.',
        'Восстановление доступа после ошибки в адресации.',
        'Управление сетью MikroTik без маршрутизации между сегментами.'
      ],
      steps: [
        { t: 'Включите RoMON', d: 'Tools → RoMON → Settings: Enabled=yes, Secrets=... (пароль RoMON).' },
        { t: 'На всех устройствах', d: 'Должен быть включён RoMON и одинаковый секрет (или пусто).' },
        { t: 'Winbox', d: 'В Winbox 4 вкладка RoMON → найдите устройство → Connect.' },
        { t: 'Безопасность', d: 'Ограничьте RoMON только доверенными портами: на WAN отключайте (в Interface → Interface поле Discover/или firewall).' }
      ],
      scenes: [{
        path: 'Tools → RoMON', win: 'RoMON', noTools: true,
        form: {
          title: 'RoMON Settings', buttons: ['Apply', 'Cancel'],
          fields: [
            { l: 'Enabled', v: 'yes', type: 'select', m: 1 },
            { l: 'Secrets', v: '••••••••', m: 2 },
            { l: 'Current ID', v: 'DC:2C:6E:A1:4F:22', ro: true }
          ]
        },
        notes: ['Включение RoMON', 'Пароль RoMON (должен совпадать в сети)']
      }],
      check: [{ d: 'терминал', c: '/tool romon print\n/tool romon discover' }]
    },
    {
      id: 'tool-fetch', t: 'Tools → Fetch', lvl: 2,
      path: 'Tools → Fetch', tags: ['fetch', 'скрипты', 'файлы'],
      purpose: 'Загрузка файлов по HTTP/HTTPS/FTP/TFTP прямо с роутера. Используется в скриптах для бэкапов, отправки данных и обновления списков.',
      usage: [
        'Автоматическая отправка бэкапа на сервер.',
        'Скачивание актуального списка адресов для firewall.',
        'Получение конфигурации с центрального сервера.'
      ],
      steps: [
        { t: 'Параметры', d: 'Tools → Fetch: Address, Src-Path, Mode=http, User/Password, Dst Path (куда сохранить).' },
        { t: 'Загрузка', d: 'Start. Файл появится в Files.' },
        { t: 'Отправка (upload)', d: 'Upload=yes и Src Path = путь локального файла.' },
        { t: 'В скрипте', d: '`/tool fetch url="https://backup.example.com/put" http-method=post http-data=[...]`.' },
        { t: 'Проверка', d: 'Status: finished; при ошибке — сообщение в окне и в логе.' }
      ],
      scenes: [{
        path: 'Tools → Fetch', win: 'Fetch', noTools: true,
        form: {
          title: 'Fetch', buttons: ['Start', 'Cancel'],
          fields: [
            { l: 'Address', v: 'https://backup.example.com', m: 1 },
            { l: 'Src. Path', v: '/upload', m: 2 },
            { l: 'Mode', v: 'https', type: 'select' },
            { l: 'User', v: 'router' },
            { l: 'Password', v: '••••••••' },
            { l: 'Upload', v: true, type: 'check' }
          ]
        },
        notes: ['Адрес сервера', 'Путь на сервере', 'Upload=yes — отправка файла с роутера']
      }],
      check: [{ d: 'терминал', c: '/tool fetch url="https://example.com/file.txt" dst-path=file.txt\n/file print where name~"file"' }]
    }
  ]
});
