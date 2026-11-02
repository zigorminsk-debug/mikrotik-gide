/* Диагностика по симптому: «что проверить, если…».
   id — часть адреса #/diag/<id>, art — статья для подробностей. */
window.DIAG = [
  {
    id: 'no-internet', t: 'Нет интернета на всех устройствах', ic: 'ip', art: 'task-lan-internet',
    why: 'Сначала отделяем проблему провайдера от своей конфигурации: линк → адрес → маршрут → DNS → NAT → firewall.',
    steps: [
      { t: 'Есть ли линк и адрес на WAN: Winbox → Interfaces, колонка Running, и IP → Addresses', cmd: '/ip address print\n/interface print where running', art: 'ip-address' },
      { t: 'Пинг шлюза провайдера и внешнего адреса из терминала роутера', cmd: '/ping 8.8.8.8 count=4', art: 'tool-ping' },
      { t: 'Маршрут по умолчанию существует и активен (флаг AS)', cmd: '/ip route print where dst-address=0.0.0.0/0', art: 'ip-routes' },
      { t: 'Если WAN по PPPoE — сессия в статусе connected', cmd: '/interface pppoe-client monitor 0 once', art: 'if-pppoe-client' },
      { t: 'NAT включён и счётчики правила растут', cmd: '/ip firewall nat print stats', art: 'ip-firewall-nat' },
      { t: 'Firewall не режет forward раньше разрешающих правил', cmd: '/ip firewall filter print stats', art: 'ip-firewall-filter' },
      { t: 'DNS: роутер сам разрешает имена и отвечает клиентам', cmd: '/ip dns set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes\n/ip dns cache print', art: 'ip-dns' }
    ]
  },
  {
    id: 'no-dhcp', t: 'Устройства не получают IP-адрес', ic: 'svc', art: 'ip-dhcp-server',
    why: 'Почти всегда дело в трёх вещах: сервер на другом интерфейсе, пул пуст или нет записи network.',
    steps: [
      { t: 'Сервер включён и висит на нужном интерфейсе (обычно bridge, не ether)', cmd: '/ip dhcp-server print', art: 'ip-dhcp-server' },
      { t: 'В пуле есть свободные адреса и он не пересекается с адресом роутера', cmd: '/ip pool print\n/ip pool used print', art: 'ip-pool' },
      { t: 'Есть запись network для этой подсети — без неё клиент не получит шлюз и DNS', cmd: '/ip dhcp-server network print', art: 'ip-dhcp-server' },
      { t: 'Аренды выдаются, в логах видно discover/offer', cmd: '/ip dhcp-server lease print\n/log print where topics~"dhcp"', art: 'ip-dhcp-server' },
      { t: 'В сегменте нет второго DHCP-сервера (роутер соседа, «умный» коммутатор)', cmd: '/tool ip-scan address=192.168.88.0/24', art: 'tool-ipscan' },
      { t: 'Порт клиента в правильной VLAN: PVID и VLAN Filtering на мосту', cmd: '/interface bridge port print\n/interface bridge vlan print', art: 'if-bridge-vlan' }
    ]
  },
  {
    id: 'wifi-no-net', t: 'Wi-Fi подключён, но интернета нет', ic: 'iface', art: 'task-guest-wifi',
    why: 'Клиент получает адрес, но его трафик упирается в изоляцию, VLAN или DNS.',
    steps: [
      { t: 'Какой адрес получил клиент: из LAN (192.168.88.x) или из гостевой сети (192.168.20.x)', cmd: '/ip dhcp-server lease print where status=bound', art: 'ip-dhcp-server' },
      { t: 'Для гостевого SSID нет доступа в LAN — это норма; проверьте выход в WAN', cmd: '/ip firewall filter print where comment~"guest"', art: 'ip-firewall-filter' },
      { t: 'Клиент видит шлюз и DNS (обычно адрес роутера)', cmd: '/ip dns print', art: 'ip-dns' },
      { t: 'Wi-Fi интерфейс добавлен в bridge и не «висит» отдельно', cmd: '/interface bridge port print where interface~"wifi"', art: 'wifi-interface' },
      { t: 'Сигнал и скорость клиента: −60 dBm хорошо, −80 dBm уже проблема', cmd: '/interface wifi registration-table print', art: 'wifi-interface' },
      { t: 'Если точек несколько — профиль и роуминг через CAPsMAN', cmd: '/caps-man remote-cap print', art: 'wifi-capsman' }
    ]
  },
  {
    id: 'pppoe-fail', t: 'PPPoE-клиент не поднимается', ic: 'down', art: 'ppp-pppoe-client',
    why: 'Провайдеры чаще всего отбрасывают сессию из-за логина, VLAN-тега или привязки по MAC.',
    steps: [
      { t: 'Статус сессии: connecting, authenticating или disconnected', cmd: '/interface pppoe-client monitor 0 once', art: 'if-pppoe-client' },
      { t: 'Логин и пароль без лишних пробелов, service-name совпадает с провайдерским', cmd: '/interface pppoe-client print detail', art: 'ppp-pppoe-client' },
      { t: 'Нужен ли VLAN-тег провайдера: PPPoE поверх vlan, а не напрямую на ether', cmd: '/interface vlan add name=isp vlan-id=100 interface=ether1\n/interface pppoe-client set [find] interface=isp', art: 'if-vlan' },
      { t: 'MTU/MRU 1492 — иначе часть сайтов «висит» после подключения', cmd: '/interface pppoe-client set [find] mtu=1492 mru=1492', art: 'ppp-keepalive-mtu' },
      { t: 'Провайдер привязал доступ к MAC старого роутера — клонируйте MAC', cmd: '/interface ethernet set ether1 mac-address=AA:BB:CC:DD:EE:FF', art: 'if-ethernet' },
      { t: 'Что говорит лог: authentication failed, terminating…, no echo reply', cmd: '/log print where topics~"ppp"', art: 'sys-logging' }
    ]
  },
  {
    id: 'vpn-fail', t: 'VPN не подключается', ic: 'down', art: 'vpn-troubleshoot',
    why: 'Проверяем по цепочке: порт снаружи → сервис включён → ключи/PSK → маршруты и firewall для туннеля.',
    steps: [
      { t: 'Правило accept для порта VPN стоит до блокировки WAN', cmd: '/ip firewall filter print stats where comment~"wg|l2tp|ipsec"', art: 'vpn-firewall' },
      { t: 'Сервис включён: WireGuard слушает, L2TP/IPsec — enabled', cmd: '/interface wireguard print\n/interface l2tp-server server print', art: 'vpn-ipsec-ikev2' },
      { t: 'WireGuard: публичный ключ пира и allowed-address на обеих сторонах', cmd: '/interface wireguard peers print detail', art: 'wg-troubleshoot' },
      { t: 'L2TP/IPsec: PSK совпадает, порты UDP 500/4500/1701 открыты', cmd: '/log print where topics~"ipsec|ppp"', art: 'ppp-l2tp-server' },
      { t: 'Клиент получает адрес из пула и видит DNS', cmd: '/ppp active print\n/ppp secret print', art: 'ppp-active' },
      { t: 'Маршрут до сети за туннелем и разрешение forward для VPN-интерфейса', cmd: '/ip route print\n/ip firewall filter print where chain=forward', art: 'vpn-site2site' }
    ]
  },
  {
    id: 'slow', t: 'Низкая скорость и «лаги»', ic: 'system', art: 'tool-torch',
    why: 'Сначала находим, кто ест канал и что грузит CPU. Кабель и дуплекс проверяем раньше, чем настройки.',
    steps: [
      { t: 'Загрузка CPU и памяти — не упирается ли роутер в процессор', cmd: '/system resource print', art: 'sys-resources' },
      { t: 'Кто прямо сейчас занимает канал', cmd: '/tool torch interface=ether1 duration=10', art: 'tool-torch' },
      { t: 'Очереди не режут скорость сильнее, чем нужно', cmd: '/queue simple print stats', art: 'q-simple' },
      { t: 'FastTrack включён для established — он снимает нагрузку с CPU', cmd: '/ip firewall filter print where action=fasttrack-connection', art: 'ip-firewall-filter' },
      { t: 'Ошибки и дропы на портах: rx-error, tx-drop — кабель, дуплекс, скорость', cmd: '/interface ethernet print stats', art: 'if-ethernet' },
      { t: 'Wi-Fi: ширина канала, загруженность частот, число клиентов на точке', cmd: '/interface wifi monitor 0 once', art: 'wifi-interface' },
      { t: 'Профилировщик покажет, какая подсистема RouterOS ест процессор', cmd: '/tool profile duration=10', art: 'tool-profiler' }
    ]
  },
  {
    id: 'port-fwd', t: 'Проброс порта не работает', ic: 'iface', art: 'task-port-forward',
    why: 'Проброс ломается по четырём причинам: правило, firewall forward, шлюз сервера и CGNAT у провайдера.',
    steps: [
      { t: 'Правило dstnat: chain=dstnat, in-interface-list=WAN, protocol, dst-port, action=dst-nat', cmd: '/ip firewall nat print where chain=dstnat', art: 'ip-firewall-nat' },
      { t: 'Счётчики правила растут, когда вы стучитесь снаружи', cmd: '/ip firewall nat print stats', art: 'ip-firewall-nat' },
      { t: 'Сервис на внутреннем хосте слушает и доступен из LAN', cmd: '/tool fetch url="http://192.168.88.50/" mode=http', art: 'tool-fetch' },
      { t: 'Firewall forward разрешает соединение (dst-nat или отдельное правило)', cmd: '/ip firewall filter print stats', art: 'ip-firewall-filter' },
      { t: 'У сервера шлюз — роутер, иначе ответы уходят мимо', cmd: '/ip arp print', art: 'ip-arp' },
      { t: 'WAN-адрес публичный: если 10.x/100.64.x/192.168.x — вы за CGNAT', cmd: '/ip address print', art: 'ip-cloud' },
      { t: 'Доступ изнутри по внешнему адресу требует hairpin-NAT', cmd: '/ip firewall nat add chain=srcnat dst-address=192.168.88.50 protocol=tcp dst-port=80 action=masquerade', art: 'task-port-forward' }
    ]
  },
  {
    id: 'lost-access', t: 'Потерян доступ к роутеру', ic: 'gear', art: 'task-recover-access',
    why: 'Не спешите сбрасывать конфиг: сначала MAC-подключение и консоль — они работают без IP.',
    steps: [
      { t: 'Winbox → Neighbors: устройство видно по MAC даже с «неправильным» IP', cmd: '', art: 'start-first-login' },
      { t: 'Подключение по MAC через RoMON или MAC-Telnet', cmd: '/tool romon print\n/tool mac-telnet 00:11:22:33:44:55', art: 'tool-romon' },
      { t: 'Если есть serial/console — вход через терминал и откат последних правил', cmd: '/ip firewall filter print\n/ip service print', art: 'task-protect-router' },
      { t: 'Проверьте, не сменился ли адрес: DHCP-клиент на порту управления', cmd: '/ip dhcp-client print', art: 'ip-dhcp-client' },
      { t: 'Правило firewall могло закрыть управление — отключите его из консоли', cmd: '/ip firewall filter disable [find where comment~"drop"]', art: 'ip-firewall-filter' },
      { t: 'Крайний вариант: reset с кнопки (конфиг сохранится) или Netinstall', cmd: '', art: 'task-recover-access' }
    ]
  },
  {
    id: 'loop', t: 'Сеть «легла»: петля или конфликт адресов', ic: 'bridge', art: 'if-bridge',
    why: 'Шторм и конфликт IP выглядят одинаково: всё тормозит, часть устройств пропадает. Смотрим MAC и широковещательный трафик.',
    steps: [
      { t: 'Один MAC виден на разных портах моста — признак петли', cmd: '/interface bridge host print', art: 'if-bridge-hosts' },
      { t: 'Включите STP/RSTP на мосту, если его нет', cmd: '/interface bridge set [find name=bridge] protocol-mode=rstp', art: 'if-bridge' },
      { t: 'Широковещательный шторм виден в Torch и счётчиках портов', cmd: '/tool torch interface=bridge', art: 'tool-torch' },
      { t: 'Второй DHCP-сервер в сети: ищите лишний роутер или «умный» коммутатор', cmd: '/tool ip-scan address=192.168.88.0/24', art: 'tool-ipscan' },
      { t: 'Конфликт адресов: IP Scan покажет два ответа на один адрес', cmd: '/ip arp print', art: 'ip-arp' },
      { t: 'Петля через Wi-Fi: клиент-репитер подключён к своей же точке', cmd: '/interface wifi registration-table print', art: 'wifi-capsman' }
    ]
  },
  {
    id: 'double-nat', t: 'Двойной NAT и «странные» проблемы с портами и VPN', ic: 'ip', art: 'ip-firewall-nat',
    why: 'Если WAN-адрес приватный, вы уже за чужим NAT: проброс и часть VPN так не заработают.',
    steps: [
      { t: 'Проверьте адрес WAN: 10.x, 172.16–31.x, 192.168.x или 100.64–127.x — это не публичный IP', cmd: '/ip address print', art: 'ip-address' },
      { t: 'Сравните с адресом, который видит интернет (2ip.ru, whatismyip)', cmd: '', art: 'ip-cloud' },
      { t: 'Порт WAN не должен быть в bridge с LAN — частая ошибка при настройке', cmd: '/interface bridge port print', art: 'if-bridge' },
      { t: 'Маршрут по умолчанию один и указывает на правильный шлюз', cmd: '/ip route print where dst-address=0.0.0.0/0', art: 'ip-routes' },
      { t: 'За двойным NAT проброс делают на внешнем роутере, а внутри — DMZ на этот адрес', cmd: '', art: 'task-port-forward' },
      { t: 'Для VPN выбирайте обходной вариант: SSTP/443, WireGuard за NAT или туннель наружу', cmd: '', art: 'vpn-choose' }
    ]
  }
];
