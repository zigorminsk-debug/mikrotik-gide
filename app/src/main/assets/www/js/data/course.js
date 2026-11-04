/* Курс «7 дней до уверенной настройки»: что читать и что сделать руками. */
window.COURSE = [
  {
    day: 1, title: 'База: вход, безопасность, бэкап', hours: 1,
    goal: 'Подключиться к роутеру, не потерять доступ и сохранить исходный конфиг.',
    items: ['start-first-login', 'start-base-setup', 'sys-identity', 'start-backup', 'start-safe'],
    task: 'Сбросьте тестовый роутер, войдите через Winbox, задайте имя, пароль и сохраните экспорт и бэкап. Проверьте, что после перезагрузки настройки на месте.',
    check: '# /export file=day1\n# Файл появился в Files, вход по паролю работает.'
  },
  {
    day: 2, title: 'Интернет: адреса, маршруты, NAT, DNS', hours: 1,
    goal: 'Поднять WAN, раздать интернет в LAN и понять, где смотреть проблему.',
    items: ['ip-address', 'ip-routes', 'ip-dns', 'ip-firewall-nat', 'task-lan-internet'],
    task: 'Настройте WAN (DHCP или PPPoE), LAN на bridge, DHCP-сервер и NAT. Проверьте ping, DNS и tracert с клиента.',
    check: '/ip route print where dst-address=0.0.0.0/0\n/ip firewall nat print stats'
  },
  {
    day: 3, title: 'Firewall и защита роутера', hours: 1.5,
    goal: 'Закрыть роутер от интернета и не сломать при этом работу клиентов.',
    items: ['ip-firewall-filter', 'ip-firewall-raw', 'ip-firewall-addresslists', 'ip-services', 'task-protect-router'],
    task: 'Соберите базовый firewall из приложения, отключите telnet/ftp, ограничьте Winbox адресом LAN и проверьте сканирование портов снаружи.',
    check: '/ip firewall filter print stats\n/ip service print'
  },
  {
    day: 4, title: 'Локальная сеть: bridge, VLAN, DHCP', hours: 1.5,
    goal: 'Разделить офис на сегменты и понять, как работает VLAN на мосту.',
    items: ['if-bridge', 'if-bridge-vlan', 'if-vlan', 'ip-dhcp-server', 'task-vlan-office'],
    task: 'Сделайте гостевую VLAN 20 и VLAN камер с изоляцией от LAN. Проверьте, что из гостевой сети LAN недоступен.',
    check: '/interface bridge vlan print\n/interface bridge host print'
  },
  {
    day: 5, title: 'Wi-Fi и покрытие', hours: 1,
    goal: 'Настроить безопасный Wi-Fi и понять, как им управлять на нескольких точках.',
    items: ['wifi-interface', 'wifi-security', 'wifi-accesslist', 'task-guest-wifi', 'wifi-capsman'],
    task: 'Настройте основной и гостевой SSID, WPA2/WPA3, проверьте уровень сигнала и изоляцию гостей.',
    check: '/interface wifi registration-table print\n/interface wifi monitor 0 once'
  },
  {
    day: 6, title: 'VPN: удалённый доступ и площадки', hours: 1.5,
    goal: 'Понять, какой VPN выбрать, и поднять его без дыр в firewall.',
    items: ['vpn-choose', 'wg-server', 'wg-peers', 'ppp-l2tp-server', 'task-wg-site'],
    task: 'Поднимите WireGuard-сервер, подключите телефон и проверьте доступ к LAN. Сравните с L2TP/IPsec.',
    check: '/interface wireguard peers print\n/ppp active print'
  },
  {
    day: 7, title: 'Надёжность: резерв, мониторинг, диагностика', hours: 1.5,
    goal: 'Сделать так, чтобы сеть переживала сбои, и уметь быстро находить причину.',
    items: ['task-failover', 'task-backup-automation', 'tool-netwatch', 'tool-torch', 'task-monitoring'],
    task: 'Настройте резервный канал с netwatch, автобэкап, отправку логов и проверьте переключение, отключив основной линк.',
    check: '/tool netwatch print\n/log print where topics~"netwatch"'
  }
];
