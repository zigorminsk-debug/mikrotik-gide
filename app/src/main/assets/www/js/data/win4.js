/* Настоящие снимки окон Winbox 4.
   Сделаны автоматически в GitHub Actions: CHR RouterOS 7.24.6 в QEMU +
   Winbox 4.4 под Xvfb. Ничего не дорисовано — это окна живой программы.
   Файлы лежат в img/shots/ (JPEG, ширина 900 px), всего 49.

   Поля: f — файл, t — заголовок окна, g — группа, d — что видно и зачем.
   Файл создаёт scripts/win4-import.js, руками не править. */
window.WIN4_SHOTS = [
  {
    f: "login.jpg", t: "Вход: Connect to и Neighbors", g: "Вход",
    d: "Стартовое окно Winbox 4: поле Connect to, кнопка Connect, вкладки Saved / Neighbors / RoMON Neighbors. Если адрес роутера потерян, его выбирают в Neighbors по MAC."
  },
  {
    f: "desktop.jpg", t: "Рабочий стол после входа", g: "Вход",
    d: "Слева дерево меню, сверху рабочая область и поиск, снизу — адрес, версия RouterOS, загрузка CPU и память. Так выглядит вход на живой CHR 7.24.6."
  },
  {
    f: "quickset.jpg", t: "Quick Set", g: "Быстрый старт",
    d: "Быстрая настройка: Mode (Router/Bridge), Configuration (Static, Automatic, PPPoE), адрес, шлюз, DNS и беспроводная сеть. Годится для первого запуска — firewall и сервисы здесь не настраиваются."
  },
  {
    f: "wifi.jpg", t: "WiFi", g: "Wi-Fi",
    d: "Точки доступа и клиенты: SSID, канал, ширина канала, безопасность, трафик по каждому интерфейсу. Отсюда видно, включено ли радио и на какой частоте."
  },
  {
    f: "wifi-new.jpg", t: "WiFi → New", g: "Wi-Fi",
    d: "Создание точки доступа: вкладки General, Configuration, Security, Advanced. Здесь задают имя сети, канал и профиль безопасности."
  },
  {
    f: "wifi-security.jpg", t: "WiFi → Security", g: "Wi-Fi",
    d: "Профили безопасности: режим (WPA2/WPA3), шифры и пароли. Один профиль можно повесить на несколько точек доступа."
  },
  {
    f: "wifi-access-list.jpg", t: "WiFi → Access List", g: "Wi-Fi",
    d: "Список доступа по MAC: разрешение и запрет клиентов, привязка к профилю безопасности."
  },
  {
    f: "wifi-wps.jpg", t: "WiFi → WPS", g: "Wi-Fi",
    d: "Настройка WPS: включение и режимы push-button и PIN. Для офиса WPS обычно выключают."
  },
  {
    f: "wifi-sniffer.jpg", t: "WiFi → Sniffer", g: "Wi-Fi",
    d: "Беспроводной сниффер: какие каналы слушать и куда складывать перехваченные пакеты."
  },
  {
    f: "interfaces.jpg", t: "Interfaces", g: "Интерфейсы",
    d: "Все интерфейсы в одном окне: ether-порты, loopback, мосты, туннели, VLAN. Колонки MTU, Tx/Rx и Tx Packet — сразу видно, что порт живёт."
  },
  {
    f: "eth.jpg", t: "Interfaces → Ethernet", g: "Интерфейсы",
    d: "Ethernet: скорость, автосогласование, дуплекс и состояние линка по каждому порту."
  },
  {
    f: "vlan.jpg", t: "Interfaces → VLAN", g: "Интерфейсы",
    d: "VLAN-интерфейсы: VLAN ID, родительский интерфейс, MTU. Нужны, когда один кабель несёт несколько сетей."
  },
  {
    f: "bonding.jpg", t: "Interfaces → Bonding", g: "Интерфейсы",
    d: "Агрегация каналов: режим (balance-xor, LACP, active-backup), список портов и мониторинг линков."
  },
  {
    f: "vrrp.jpg", t: "Interfaces → VRRP", g: "Интерфейсы",
    d: "VRRP: виртуальный адрес, приоритет и интервал объявлений. Два роутера делят один шлюз."
  },
  {
    f: "lte.jpg", t: "Interfaces → LTE", g: "Интерфейсы",
    d: "LTE-модем: профиль APN, уровень сигнала, регистрация в сети и IP от оператора."
  },
  {
    f: "vxlan.jpg", t: "Interfaces → VXLAN", g: "Интерфейсы",
    d: "VXLAN: VNI, удалённые концы туннеля и порт. Растягивает L2-сеть через L3."
  },
  {
    f: "wireguard.jpg", t: "WireGuard", g: "WireGuard",
    d: "WireGuard-интерфейс в Winbox 4: MTU, Listen Port, Private Key и Public Key. Публичный ключ копируют на вторую сторону."
  },
  {
    f: "wg-peers.jpg", t: "WireGuard → Peers", g: "WireGuard",
    d: "Пиры WireGuard: публичный ключ, Allowed Address, Endpoint, keepalive и счётчики трафика. Здесь видно, поднялся ли туннель."
  },
  {
    f: "wg-new.jpg", t: "WireGuard → Peers → New", g: "WireGuard",
    d: "Новый пир: ключ, Allowed Address (какие сети пускать в туннель), Endpoint (адрес второй стороны), Persistent Keepalive."
  },
  {
    f: "bridge.jpg", t: "Bridge", g: "Мост",
    d: "Окно Bridge: список мостов, вкладки Ports, VLANs, Hosts, Filters, NAT, Settings. Здесь включают vlan-filtering."
  },
  {
    f: "bridge-ports.jpg", t: "Bridge → Ports", g: "Мост",
    d: "Порты моста: интерфейс, PVID, фильтрация, приоритет. PVID определяет, в какой VLAN попадёт нетегированный трафик."
  },
  {
    f: "bridge-vlans.jpg", t: "Bridge → VLANs", g: "Мост",
    d: "VLAN в мосту: tagged/untagged порты и VLAN ID. Так один мост обслуживает несколько сетей."
  },
  {
    f: "bridge-hosts.jpg", t: "Bridge → Hosts", g: "Мост",
    d: "Таблица MAC-адресов моста: какой MAC на каком порту и в каком VLAN. Помогает найти «петлю» и лишний коммутатор."
  },
  {
    f: "bridge-filters.jpg", t: "Bridge → Filters", g: "Мост",
    d: "Фильтры моста: правила по MAC, VLAN и портам. Нужны, чтобы резать трафик до попадания в firewall."
  },
  {
    f: "bridge-new.jpg", t: "Bridge → New", g: "Мост",
    d: "Создание моста: General, STP, VLAN, IGMP, MLAG, Status, Traffic. Имя, MTU, ARP, Ageing Time и включение STP."
  },
  {
    f: "ppp.jpg", t: "PPP", g: "PPP",
    d: "Окно PPP: вкладки Interfaces, Secrets, Profiles, PPPoE Server, L2TP Server, OVPN Server, Active Connections."
  },
  {
    f: "ppp-profiles.jpg", t: "PPP → Profiles", g: "PPP",
    d: "Профили PPP: локальный адрес, DNS, rate-limit, только один адрес на пользователя. Один профиль на всех клиентов."
  },
  {
    f: "ppp-secrets.jpg", t: "PPP → Secrets", g: "PPP",
    d: "Учётные записи PPP: имя, пароль, профиль, сервис (pppoe, l2tp, ovpn) и привязанный адрес."
  },
  {
    f: "ppp-active.jpg", t: "PPP → Active Connections", g: "PPP",
    d: "Активные подключения: кто вошёл, с какого адреса, время сессии и полученный IP."
  },
  {
    f: "pppoe-server.jpg", t: "PPP → PPPoE Server", g: "PPP",
    d: "PPPoE-сервер: на каком интерфейсе слушать, пул адресов, профиль по умолчанию и authentication."
  },
  {
    f: "l2tp-server.jpg", t: "PPP → L2TP Server", g: "PPP",
    d: "L2TP-сервер: включение, адрес для клиентов, IPSec Secret и профиль по умолчанию."
  },
  {
    f: "ovpn-server.jpg", t: "PPP → OVPN Server", g: "PPP",
    d: "OVPN-сервер: порт, режим, сертификат и требования к клиентам."
  },
  {
    f: "ip-address.jpg", t: "IP → Addresses", g: "IP",
    d: "Адреса интерфейсов: адрес/маска, сеть, интерфейс и пометка D (dynamic). Первое, что проверяют, когда «нет сети»."
  },
  {
    f: "ip-dhcp-server.jpg", t: "IP → DHCP Server", g: "IP",
    d: "DHCP-сервер: вкладки Leases, Networks, Options, DHCP Setup. Пул адресов, шлюз и DNS для клиентов сети."
  },
  {
    f: "ip-dns.jpg", t: "IP → DNS", g: "IP",
    d: "DNS: адреса серверов, галочка Allow Remote Requests и кэш. Без Allow Remote Requests клиенты не получат DNS."
  },
  {
    f: "ip-routes.jpg", t: "IP → Routes", g: "IP",
    d: "Маршруты: DAS-признаки, адрес назначения, шлюз и интерфейс. Активный маршрут помечен A, динамический — D."
  },
  {
    f: "ip-services.jpg", t: "IP → Services", g: "IP",
    d: "Сервисы роутера: telnet, ftp, www, ssh, winbox, api и с каких адресов они доступны. Лишнее — отключают."
  },
  {
    f: "routing.jpg", t: "Routing", g: "Маршрутизация",
    d: "Окно Routing: Tables, Rules, Nexthops, Filters, BFD, RIP, OSPF, BGP, Prefix Lists."
  },
  {
    f: "system.jpg", t: "System", g: "Система",
    d: "Системное окно: Identity, Clock, NTP Client, Users, Certificates, Logging, Packages, RouterBOOT, Scheduler, Scripts, Backup, Resources."
  },
  {
    f: "files.jpg", t: "Files", g: "Система",
    d: "Files: резервные копии .backup, экспорт .rsc, сертификаты и пакеты. Отсюда скачивают бэкап на компьютер."
  },
  {
    f: "backup.jpg", t: "Files → Backup", g: "Система",
    d: "Кнопка Backup: имя файла, пароль и шифрование резервной копии."
  },
  {
    f: "log.jpg", t: "Log", g: "Система",
    d: "Log: сообщения роутера по топикам с временем. Здесь видно перезагрузки, ошибки PPP и входы в Winbox."
  },
  {
    f: "terminal.jpg", t: "New Terminal", g: "Система",
    d: "New Terminal: консоль RouterOS внутри Winbox. Сюда вставляют конфиг из приложения — команды видны в правой части окна."
  },
  {
    f: "queues.jpg", t: "Queues → Simple Queues", g: "Очереди",
    d: "Simple Queues: правила «кто и с какой скоростью» — цель, лимиты up/down и счётчики."
  },
  {
    f: "simple-new.jpg", t: "Queues → Simple Queues → New", g: "Очереди",
    d: "Новая очередь: General (цель, адреса, интерфейс), Advanced, Statistics, Traffic, Burst."
  },
  {
    f: "queue-types.jpg", t: "Queues → Queue Types", g: "Очереди",
    d: "Типы очередей: алгоритм (pfifo, sfq, cake), размер буфера и лимиты."
  },
  {
    f: "queue-iface.jpg", t: "Queues → Interface Queues", g: "Очереди",
    d: "Очереди на интерфейсе: ограничение всего порта целиком."
  },
  {
    f: "dot1x.jpg", t: "Dot1X", g: "Прочее",
    d: "802.1X: серверные настройки, клиент на порту и списки. Порт открывается только после аутентификации."
  },
  {
    f: "radius.jpg", t: "RADIUS", g: "Прочее",
    d: "RADIUS: адреса серверов аутентификации, секрет и таймауты. Нужен для PPP AAA и корпоративного Wi-Fi."
  }
];
