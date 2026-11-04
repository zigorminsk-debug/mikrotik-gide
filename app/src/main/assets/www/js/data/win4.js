/* Настоящие снимки окон Winbox 4.
   Сделаны автоматически в GitHub Actions: CHR RouterOS 7.24.6 в QEMU +
   Winbox 4.4 под Xvfb. Ничего не дорисовано — это окна живой программы.
   Файлы лежат в img/shots/ (JPEG, ширина 900 px).

   Поля: f — файл, t — заголовок окна, g — группа, d — что видно и зачем. */
window.WIN4_SHOTS = [
  {
    f: 'login.jpg', t: 'Вход: Connect to и Neighbors', g: 'Вход',
    d: 'Стартовое окно Winbox 4: сверху поле Connect to с адресом, кнопка Connect, список Neighbors ' +
      'с роутерами, найденными по MAC, и сохранённые адреса. Сюда вводят 192.168.88.1, ' +
      'а если адрес потерян — выбирают роутер в Neighbors двойным щелчком.'
  },
  {
    f: 'desktop.jpg', t: 'Рабочий стол после входа', g: 'Вход',
    d: 'Слева дерево меню (Quick Set, Interfaces, WireGuard, Bridge, PPP, Switch, Mesh, IP, IPv6, ' +
      'MPLS, Routing, System, Queues, Dot1X, Files, Log, New Terminal, RADIUS, Tools), сверху — ' +
      'рабочие области и строка поиска, снизу — состояние подключения и версия RouterOS.'
  },
  {
    f: 'quickset.jpg', t: 'Quick Set', g: 'Быстрый старт',
    d: 'Быстрая настройка: Mode (Router/Bridge), Configuration (Address Acquisition: Static, ' +
      'Automatic, PPPoE), поля адреса, шлюза, DNS и беспроводной сети. Подходит для первого запуска, ' +
      'но firewall и сервисы здесь не настраиваются.'
  },
  {
    f: 'interfaces.jpg', t: 'Interfaces', g: 'Интерфейсы',
    d: 'Вкладки Interface, Interface List, Ethernet, IP Tunnel, GRE Tunnel, VLAN, VXLAN, VRRP, ' +
      'MACsec, MACVLAN, Bonding, LTE: порты ether, мосты, VLAN и туннели в одном окне. ' +
      'Сюда смотрят, когда не работает «кабель» или не поднимается VLAN.'
  },
  {
    f: 'bridge.jpg', t: 'Bridge', g: 'Интерфейсы',
    d: 'Вкладки Bridge, Ports, VLANs, MSTIs, Port MST Overrides, Filters, NAT, Hosts, MDB: ' +
      'создание моста, добавление портов и VLAN-фильтрация (vlan-filtering). ' +
      'Колонки Actual MTU, L2 MTU и MAC Address помогают поймать проблемы с MTU и петлями.'
  },
  {
    f: 'bridge-new.jpg', t: 'Bridge → New (создание моста)', g: 'Интерфейсы',
    d: 'Диалог создания интерфейса: General, STP, VLAN, IGMP, MLAG, Status, Traffic. ' +
      'Здесь включают Enabled, задают имя (bridge1), MTU, ARP, Ageing Time, Max Learned Entries, ' +
      'DHCP Snooping и RA Guard.'
  },
  {
    f: 'wireguard.jpg', t: 'Interfaces → WireGuard', g: 'Интерфейсы',
    d: 'Вкладки Interface, WireGuard и Peers: создание WireGuard-интерфейса, ключи и список пиров ' +
      'с Allowed IPs и Endpoint. Рядом видно, как окна накладываются друг на друга — ' +
      'в Winbox 4 одновременно может быть открыто много окон.'
  },
  {
    f: 'ip-address.jpg', t: 'IP → Address', g: 'IP',
    d: 'Адреса на интерфейсах: Address (10.0.2.15/24), Network, Interface (ether1), VRF. ' +
      'Здесь проверяют, есть ли адрес на LAN и WAN, и не висит ли адрес дважды.'
  },
  {
    f: 'dhcp-server.jpg', t: 'IP → DHCP Server', g: 'IP',
    d: 'Вкладки DHCP, Networks, Leases, Options, Option Sets, Option Matcher, Alerts: ' +
      'адресные пулы, сети и аренды. Кнопка DHCP Setup в панели Actions запускает мастер настройки ' +
      'сети и пула за семь шагов.'
  },
  {
    f: 'ip-routes.jpg', t: 'IP → Routes', g: 'IP',
    d: 'Таблица маршрутов: Dst. Address, Gateway, Distance, Routing Table, Pref. Source. ' +
      'Флаги DAc (динамический, активный) и DAD (например 10.0.2.2) показывают, куда реально уходит трафик.'
  },
  {
    f: 'ip-services.jpg', t: 'IP → Services', g: 'IP',
    d: 'Сервисы роутера и их порты: api 8728, api-ssl 8729, ftp 21, ssh 22, telnet 23, winbox 8291, ' +
      'www 80, www-ssl 443, discover 5678. Колонка Available From ограничивает источник подключения, ' +
      'а серые строки — отключённые сервисы.'
  },
  {
    f: 'ip-dns.jpg', t: 'IP → DNS → Settings', g: 'IP',
    d: 'Настройки DNS: Servers (1.1.1.1, 8.8.8.8), Dynamic Servers, Use DoH Server, а также ' +
      'кнопки Static, Cache, Reset. Здесь же включают Allow Remote Requests, если роутер должен ' +
      'отвечать на DNS-запросы из LAN.'
  },
  {
    f: 'ppp.jpg', t: 'PPP', g: 'Сервисы',
    d: 'Вкладки Interface, PPPoE Servers, OVPN Servers, Secrets, Profiles, Active Connections, ' +
      'L2TP Ethernet, L2TP Secrets: поднятие PPPoE-клиента и сервера, профили и учётные записи.'
  },
  {
    f: 'files.jpg', t: 'Files', g: 'Система',
    d: 'Файлы роутера: backup и rsc-экспорт, Cloud Backup. Здесь же удаляют старые бэкапы ' +
      'и загружают пакеты вручную.'
  },
  {
    f: 'dot1x.jpg', t: 'Dot1X → Client', g: 'Система',
    d: '802.1X-клиент: Server, State, Active. Нужен в корпоративных сетях с авторизацией портов.'
  }
];
