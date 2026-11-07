/* Готовые примеры конфигураций: задача → команды → проверка → грабли.
   Каждый пример самодостаточен, копируется целиком в New Terminal. */
window.EXAMPLES = [
  {
    id: 'ex-internet-static',
    t: 'Интернет со статическим IP',
    d: 'Провайдер выдал адрес, шлюз и DNS. Настраиваем WAN, LAN, NAT и минимальный firewall.',
    ic: 'start',
    cat: 'internet',
    art: 'task-lan-internet',
    blocks: [
      { h: 'WAN и маршрут', c: '# адрес, шлюз и DNS от провайдера\n/interface list add name=WAN\n/interface list add name=LAN\n/interface list member add interface=ether1 list=WAN\n/ip address add address=203.0.113.10/24 interface=ether1\n/ip route add gateway=203.0.113.1\n/ip dns set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes' },
      { h: 'LAN, DHCP и NAT', c: '/interface bridge add name=bridge-lan\n/interface bridge port add bridge=bridge-lan interface=ether2\n/interface bridge port add bridge=bridge-lan interface=ether3\n/interface list member add interface=bridge-lan list=LAN\n/ip address add address=192.168.88.1/24 interface=bridge-lan\n/ip pool add name=lan-pool ranges=192.168.88.100-192.168.88.200\n/ip dhcp-server add name=dhcp-lan interface=bridge-lan address-pool=lan-pool lease-time=1d\n/ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=192.168.88.1\n/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade' },
      { h: 'Firewall: минимум', c: '/ip firewall filter add chain=input connection-state=established,related action=accept comment="established"\n/ip firewall filter add chain=input connection-state=invalid action=drop comment="invalid"\n/ip firewall filter add chain=input protocol=icmp action=accept comment="icmp"\n/ip firewall filter add chain=input in-interface-list=WAN action=drop comment="drop wan input"\n/ip firewall filter add chain=forward connection-state=established,related action=accept\n/ip firewall filter add chain=forward in-interface-list=LAN out-interface-list=WAN action=accept\n/ip firewall filter add chain=forward in-interface-list=WAN action=drop' }
    ],
    check: '/ip address print\n/ip route print where dst-address=0.0.0.0/0\n/ping 8.8.8.8 count=4\n/ping google.com count=4',
    tips: [
      'Порядок правил firewall важен: established и ICMP должны идти раньше drop.',
      'Если провайдер выдаёт адрес по DHCP — замените статику на /ip dhcp-client add interface=ether1 add-default-route=yes use-peer-dns=yes.',
      'Проверка NAT: на клиенте откройте 2ip.ru — адрес должен быть внешним, а не 192.168.x.x.'
    ],
    pitfall: 'Не включайте masquerade для LAN→LAN: это лишняя нагрузка. NAT нужен только на выход в WAN.'
  },
  {
    id: 'ex-dual-wan',
    t: 'Два провайдера с резервом',
    d: 'Основной канал и резервный: маршрут по умолчанию с расстоянием 1 и 2, netwatch переключает при падении.',
    ic: 'down',
    cat: 'internet',
    art: 'rt-ecmp',
    blocks: [
      { h: 'Интерфейсы и адреса', c: '/interface list add name=WAN\n/interface list member add interface=ether1 list=WAN\n/interface list member add interface=ether2 list=WAN\n/ip dhcp-client add interface=ether1 add-default-route=yes default-route-distance=1 use-peer-dns=yes\n/ip dhcp-client add interface=ether2 add-default-route=yes default-route-distance=2 use-peer-dns=no' },
      { h: 'Проверка каналов', c: '/tool netwatch add host=8.8.8.8 interval=30s comment="wan1 up" \\\n  down-script="/ip route set [find dst-address=0.0.0.0/0 gateway=203.0.113.1] distance=10" \\\n  up-script="/ip route set [find dst-address=0.0.0.0/0 gateway=203.0.113.1] distance=1"' },
      { h: 'NAT для обоих каналов', c: '/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade\n/ip firewall filter add chain=forward in-interface-list=LAN out-interface-list=WAN action=accept' }
    ],
    check: '/ip route print where dst-address=0.0.0.0/0\n/tool netwatch print\n/ip route check 8.8.8.8',
    tips: [
      'Расстояние (distance) меньше — маршрут приоритетнее. Переключение происходит по факту недоступности шлюза.',
      'Если адреса статические — добавьте оба маршрута вручную с distance=1 и 2 и check-gateway=ping.',
      'Для распределения нагрузки (а не резерва) используйте ECMP или PCC — это отдельная схема.'
    ],
    pitfall: 'Не указывайте в netwatch адрес, который провайдер блокирует: получите ложные переключения. Лучше проверять шлюз провайдера или 1.1.1.1.'
  },
  {
    id: 'ex-lte-failover',
    t: 'LTE как резервный канал',
    d: 'USB-модем или встроенный LTE поднимает интерфейс lte1 и включается только при падении основного канала.',
    ic: 'down',
    cat: 'internet',
    art: 'task-failover',
    blocks: [
      { h: 'LTE-интерфейс', c: '/interface lte apn add name=internet apn=internet.beeline.by\n/interface lte set [find] apn-profiles=internet name=lte1\n/ip dhcp-client add interface=lte1 add-default-route=yes default-route-distance=2 use-peer-dns=no disabled=no\n/interface list member add interface=lte1 list=WAN' },
      { h: 'Проверка и переключение', c: '/tool netwatch add host=1.1.1.1 interval=20s comment="main wan" \\\n  down-script="/interface lte set [find name=lte1] disabled=no; /ip route set [find dst-address=0.0.0.0/0 gateway=203.0.113.1] distance=20" \\\n  up-script="/ip route set [find dst-address=0.0.0.0/0 gateway=203.0.113.1] distance=1"' },
      { h: 'NAT', c: '/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade' }
    ],
    check: '/interface lte print detail\n/ip address print where interface=lte1\n/ip route print where dst-address=0.0.0.0/0',
    tips: [
      'APN, логин и пароль уточните у оператора: без APN интерфейс не поднимется.',
      'Определите, какой интерфейс создаёт модем: lte1, ppp-out1 или usb1 — смотрите /interface print.',
      'При постоянном резерве следите за трафиком: некоторые операторы считают служебный пинг в пакет.'
    ],
    pitfall: 'Если LTE и основной канал имеют одинаковую distance, маршруты начнут «прыгать». Резерв всегда с большей distance.'
  },
  {
    id: 'ex-wan-probe-failover',
    t: 'Резервный интернет: у каждого канала своя проба',
    d: 'Два провайдера в любых сочетаниях (DHCP/PPPoE/LTE). Каждый канал проверяется своим ' +
      'пингом через отдельную таблицу маршрутизации, возврат на основной — после минуты ' +
      'устойчивых ответов, поэтому роутер не «качелит».',
    ic: 'down',
    cat: 'internet',
    art: 'task-wan-failover',
    blocks: [
      { h: '1. Таблицы и привязка проб', c: ':if ([:len [/routing table find where name="probe-wan1"]] = 0) do={/routing table add name=probe-wan1 fib}\n:if ([:len [/routing table find where name="probe-wan2"]] = 0) do={/routing table add name=probe-wan2 fib}\n/ip firewall mangle add chain=output dst-address=1.1.1.1 action=mark-routing new-routing-mark=probe-wan1 passthrough=no comment="wan-failover probe 1"\n/ip firewall mangle add chain=output dst-address=8.8.8.8 action=mark-routing new-routing-mark=probe-wan2 passthrough=no comment="wan-failover probe 2"' },
      { h: '2. Подключение резерва (пример: LTE)', c: ':do {/interface lte set [find] disabled=no} on-error={}\n/ip dhcp-client add interface=lte1 add-default-route=yes default-route-distance=2 use-peer-dns=no disabled=no\n/interface list member add interface=lte1 list=WAN' },
      { h: '3. Скрипт и планировщик', c: '# тело скрипта целиком — в статье «Резервный интернет: два провайдера»\n# затем:\n/system scheduler add name=wan-failover interval=10s start-time=startup on-event=wan-failover' },
      { h: '4. NAT на оба канала', c: '/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade' }
    ],
    check: '/routing table print\n/ip firewall mangle print where comment~"wan-failover"\n/ip route print where dst-address=0.0.0.0/0\n/log print where message~"wan-failover"',
    tips: [
      'Адреса проб должны различаться: 1.1.1.1 для основного, 8.8.8.8 для резервного.',
      'Chain в mangle — output: это пинги самого роутера, а не трафик клиентов.',
      'Пороги: fails=2 (20 с) и ups=6 (60 с) — начало хорошее для офиса.',
      'Для PPPoE вместо /ip dhcp-client в скрипте используется /interface pppoe-client set … default-route-distance.'
    ],
    pitfall: 'Если оба маршрута по умолчанию имеют одинаковую distance, скрипт ничего не изменит: ' +
      'резерв должен быть с distance 2, иначе трафик идёт по обоим «как получится».'
  },
  {
    id: 'ex-wifi-guest',
    t: 'Гостевая сеть Wi-Fi с изоляцией',
    d: 'Отдельный SSID, VLAN 20, свой DHCP и полная изоляция от рабочей сети, но с доступом в интернет.',
    ic: 'wifi',
    cat: 'wifi',
    art: 'task-guest-wifi',
    blocks: [
      { h: 'VLAN и адрес', c: '/interface bridge set bridge-lan vlan-filtering=yes\n/interface bridge vlan add bridge=bridge-lan vlan-ids=20 tagged=bridge-lan\n/interface vlan add name=vlan-guest vlan-id=20 interface=bridge-lan\n/ip address add address=192.168.20.1/24 interface=vlan-guest\n/ip pool add name=guest-pool ranges=192.168.20.100-192.168.20.200\n/ip dhcp-server add name=dhcp-guest interface=vlan-guest address-pool=guest-pool lease-time=1h\n/ip dhcp-server network add address=192.168.20.0/24 gateway=192.168.20.1 dns-server=1.1.1.1' },
      { h: 'Wi-Fi сеть (пакет wifi)', c: '/interface wifi security add name=sec-guest authentication-types=wpa2-psk,wpa3-psk passphrase="Guest-Pass-2026" wps=disable\n/interface wifi datapath add name=dp-guest bridge=bridge-lan vlan-id=20\n/interface wifi configuration add name=cfg-guest ssid="Office-Guest" country=belarus security=sec-guest datapath=dp-guest\n/interface wifi add name=wifi-guest master-interface=wifi1 configuration=cfg-guest disabled=no\n# для 802.11n (RB951G-2HnD) — пакет wireless:\n# /interface wireless security-profiles add name=sec-guest mode=dynamic-keys authentication-types=wpa2-psk wpa2-pre-shared-key="Guest-Pass-2026"\n# /interface wireless add name=wlan-guest master-interface=wlan1 ssid="Office-Guest" security-profile=sec-guest disabled=no\n# /interface bridge port add bridge=bridge-lan interface=wlan-guest pvid=20' },
      { h: 'Изоляция', c: '/ip firewall filter add chain=forward in-interface=vlan-guest out-interface=bridge-lan action=drop comment="guest to lan"\n/ip firewall filter add chain=forward in-interface=vlan-guest out-interface-list=WAN action=accept comment="guest to wan"\n/ip firewall filter add chain=forward in-interface=vlan-guest action=drop comment="guest rest"' }
    ],
    check: '/interface bridge vlan print\n/ip dhcp-server lease print where server=dhcp-guest\n/ip firewall filter print stats',
    tips: [
      'Ширину канала можно ограничить: /queue simple add target=192.168.20.0/24 max-limit=10M/10M.',
      'Отдельный пароль и смена SSID раз в сезон — простая гигиена гостевой сети.',
      'Если гостям нужен только интернет, портал не обязателен: хватит изоляции.'
    ],
    pitfall: 'Не забудьте bridge vlan с untagged=wifi-guest: без него точка не передаст трафик в VLAN 20.'
  },
  {
    id: 'ex-capsman',
    t: 'CAPsMAN: несколько точек, один SSID',
    d: 'Контроллер раздаёт профиль Wi-Fi всем точкам: одинаковый SSID, пароль и каналы, роуминг между этажами.',
    ic: 'wifi',
    cat: 'wifi',
    art: 'wifi-capsman',
    blocks: [
      { h: 'Контроллер (новая точка с winbox)', c: '/interface wifi security add name=sec-corp authentication-types=wpa2-psk,wpa3-psk passphrase="Corp-Pass-2026"\n/interface wifi configuration add name=cfg-corp ssid="Office" security=sec-corp country=belarus\n/interface wifi provisioning add action=create-dynamic-enabled master-configuration=cfg-corp' },
      { h: 'CAP: отдать управление', c: '/interface wifi set wifi1 disabled=yes\n/interface wifi capsman set enabled=yes interfaces=bridge-lan\n# точка найдёт контроллер по discovery, либо укажите адрес:\n# /interface wifi capsman set enabled=yes interfaces=bridge-lan' },
      { h: 'Проверка', c: '/interface wifi capsman remote-cap print\n/interface wifi registration-table print' }
    ],
    check: '/interface wifi capsman print\n/interface wifi capsman remote-cap print\n/interface wifi registration-table print count-only',
    tips: [
      'Разные каналы соседним точкам: контроллер умеет auto, но в плотной застройке лучше задать вручную.',
      'Если CAP не находится — проверьте, что он в той же L2-сети и пакет wifi не отключён.',
      'Для гостевой сети добавьте второй configuration с другой security-профилью и отдельным VLAN.'
    ],
    pitfall: 'Не оставляйте на CAP собственную конфигурацию Wi-Fi включённой — получите два SSID и конфликт каналов.'
  },
  {
    id: 'ex-vlan-office',
    t: 'Офис на три VLAN с trunk к коммутатору',
    d: 'Рабочие, телефоны и гости в разных подсетях; к коммутатору идёт trunk, к устройствам — access-порты.',
    ic: 'bridge',
    cat: 'vlan',
    art: 'if-vlan',
    blocks: [
      { h: 'Мосты и VLAN-интерфейсы', c: '/interface bridge set bridge-lan vlan-filtering=yes\n/interface vlan add name=vlan-10 vlan-id=10 interface=bridge-lan\n/interface vlan add name=vlan-20 vlan-id=20 interface=bridge-lan\n/interface vlan add name=vlan-30 vlan-id=30 interface=bridge-lan\n/ip address add address=10.10.10.1/24 interface=vlan-10\n/ip address add address=10.10.20.1/24 interface=vlan-20\n/ip address add address=10.10.30.1/24 interface=vlan-30' },
      { h: 'Trunk и access-порты', c: '# ether5 — trunk к коммутатору (все VLAN тегированные)\n/interface bridge vlan add bridge=bridge-lan vlan-ids=10,20,30 tagged=bridge-lan,ether5\n# ether2 — access-порт для рабочего ПК (VLAN 10)\n/interface bridge port set [find interface=ether2] pvid=10\n/interface bridge vlan add bridge=bridge-lan vlan-ids=10 untagged=ether2' },
      { h: 'DHCP для каждой сети', c: '/ip pool add name=pool-10 ranges=10.10.10.100-10.10.10.200\n/ip pool add name=pool-20 ranges=10.10.20.100-10.10.20.200\n/ip pool add name=pool-30 ranges=10.10.30.100-10.10.30.200\n/ip dhcp-server add name=dhcp-10 interface=vlan-10 address-pool=pool-10\n/ip dhcp-server add name=dhcp-20 interface=vlan-20 address-pool=pool-20\n/ip dhcp-server add name=dhcp-30 interface=vlan-30 address-pool=pool-30\n/ip dhcp-server network add address=10.10.10.0/24 gateway=10.10.10.1 dns-server=10.10.10.1\n/ip dhcp-server network add address=10.10.20.0/24 gateway=10.10.20.1 dns-server=10.10.10.1\n/ip dhcp-server network add address=10.10.30.0/24 gateway=10.10.30.1 dns-server=10.10.10.1' },
      { h: 'Правила между сетями', c: '/ip firewall filter add chain=forward in-interface=vlan-10 out-interface=vlan-20 action=accept comment="рабочие к телефонам"\n/ip firewall filter add chain=forward in-interface=vlan-20 out-interface=vlan-10 action=accept comment="ответ телефонов"\n/ip firewall filter add chain=forward in-interface=vlan-30 action=drop comment="гости изолированы"\n/ip firewall filter add chain=forward in-interface=vlan-30 out-interface-list=WAN action=accept comment="гости в интернет"' }
    ],
    check: '/interface bridge vlan print\n/interface bridge port print\n/ip dhcp-server lease print',
    tips: [
      'На коммутаторе порт к роутеру должен быть tagged для 10/20/30, порты к устройствам — untagged с PVID нужного VLAN.',
      'PVID ставится на вход: тегированный трафик от коммутатора в VLAN-интерфейсы попадает без него.',
      'Сначала создайте vlan-интерфейсы и адреса, и только потом включайте vlan-filtering — меньше риска потерять доступ.'
    ],
    pitfall: 'Если забыть vlan-ids=... tagged=bridge-lan, адреса на VLAN-интерфейсах не поднимутся: CPU не увидит тегированный трафик.'
  },
  {
    id: 'ex-port-forward',
    t: 'Проброс портов и hairpin',
    d: 'Доступ к камерам и веб-серверу из интернета, а изнутри — по внешнему адресу.',
    ic: 'svc',
    cat: 'security',
    art: 'task-port-forward',
    blocks: [
      { h: 'Проброс', c: '/ip firewall nat add chain=dstnat protocol=tcp dst-port=8080 in-interface-list=WAN \\\n  action=dst-nat to-addresses=192.168.88.50 to-ports=80 comment="web camera"\n/ip firewall nat add chain=dstnat protocol=tcp dst-port=3389 in-interface-list=WAN \\\n  action=dst-nat to-addresses=192.168.88.60 to-ports=3389 comment="rdp"' },
      { h: 'Hairpin (доступ изнутри)', c: '/ip firewall nat add chain=srcnat src-address=192.168.88.0/24 dst-address=192.168.88.50 \\\n  protocol=tcp dst-port=80 action=masquerade comment="hairpin"' },
      { h: 'Firewall для проброса', c: '/ip firewall filter add chain=forward protocol=tcp dst-address=192.168.88.50 dst-port=80 \\\n  in-interface-list=WAN action=accept comment="allow web"\n/ip firewall filter add chain=forward connection-nat-state=dstnat connection-state=new action=accept comment="dstnat"' }
    ],
    check: '/ip firewall nat print\n/ip firewall filter print stats\n/ip firewall connection print where dst-port~"8080"',
    tips: [
      'RDP (3389) в интернет — плохая идея: используйте VPN и не открывайте порт.',
      'Проверяйте проброс с внешней сети (мобильный интернет), а не изнутри.',
      'Hairpin нужен, только если внутренние клиенты ходят по внешнему IP; по внутреннему IP он не требуется.'
    ],
    pitfall: 'Если провайдер даёт «серый» адрес (CGNAT), проброс не заработает — нужен белый IP или туннель.'
  },
  {
    id: 'ex-iptv',
    t: 'IPTV через IGMP proxy',
    d: 'Провайдер отдаёт multicast-телевидение: настраиваем IGMP proxy, чтобы поток шёл только заказавшим.',
    ic: 'task',
    cat: 'services',
    art: 'task-iptv',
    blocks: [
      { h: 'IGMP proxy', c: '/routing igmp-proxy interface add interface=ether1 alternative-subnets=0.0.0.0/0 upstream=yes\n/routing igmp-proxy interface add interface=bridge-lan upstream=no\n/routing igmp-proxy set query-interval=30s' },
      { h: 'Если провайдер требует IGMP-запрос от клиента', c: '# некоторые провайдеры отдают поток только после join от приставки\n# проверка, что группа приходит:\n/tool sniffer quick interface=ether1 ip-protocol=igmp duration=10' },
      { h: 'Изоляция multicast в LAN', c: '/interface bridge set bridge-lan igmp-snooping=yes\n/interface bridge set bridge-lan mcast-snooping=yes' }
    ],
    check: '/routing igmp-proxy interface print\n/routing igmp-proxy mfc print\n/interface bridge print detail',
    tips: [
      'Если у провайдера VLAN для IPTV — создайте vlan-интерфейс и укажите его в igmp-proxy вместо ether1.',
      'Приставка должна быть в том же L2-сегменте, что и downstream-интерфейс.',
      'Без igmp-snooping multicast штормит все порты, особенно Wi-Fi.'
    ],
    pitfall: 'Не включайте proxy на Wi-Fi без snooping: поток телевидения займёт весь эфир и «положит» сеть.'
  },
  {
    id: 'ex-wg-roadwarrior',
    t: 'WireGuard: доступ сотрудника в офис',
    d: 'Сервер на роутере, клиент на ноутбуке; сотрудник получает доступ к офисной сети и интернету через офис.',
    ic: 'vpn',
    cat: 'vpn',
    art: 'wg-server',
    blocks: [
      { h: 'Сервер', c: '/interface wireguard add name=wg0 listen-port=13231\n/ip address add address=10.10.10.1/24 interface=wg0\n/ip pool add name=wg-pool ranges=10.10.10.2-10.10.10.10\n/ip firewall filter add chain=input protocol=udp dst-port=13231 action=accept comment="wireguard" place-before=[find where comment="drop wan input"]' },
      { h: 'Ключи и пир', c: '# приватный ключ смотрите так: /interface wireguard print detail\n/interface wireguard peers add interface=wg0 public-key="КЛЮЧ_КЛИЕНТА" \\\n  allowed-address=10.10.10.2/32 comment="laptop-ivan"\n# на клиенте: Address = 10.10.10.2/24, DNS = 10.10.10.1' },
      { h: 'Доступ к офису и интернету', c: '/ip firewall filter add chain=forward in-interface=wg0 out-interface=bridge-lan action=accept comment="wg to lan"\n/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade\n# если нужен интернет через офис:\n# AllowedIPs на клиенте = 0.0.0.0/0, DNS = 10.10.10.1' }
    ],
    check: '/interface wireguard peers print\n/interface wireguard peers print detail where interface=wg0\n/ip firewall filter print stats',
    tips: [
      'Ключи генерируйте на клиенте: приватный ключ никогда не покидает устройство.',
      'Один пир — одно устройство; не копируйте конфиг между ноутбуками.',
      'Для доступа только к офису в AllowedIPs клиента укажите офисную подсеть 192.168.88.0/24.'
    ],
    pitfall: 'Если забыть правило input для UDP-порта, handshake не пройдёт: клиент будет молча висеть в «connecting».'
  },
  {
    id: 'ex-wg-site2site',
    t: 'WireGuard между двумя офисами',
    d: 'Два роутера соединяются туннелем, сети 192.168.10.0/24 и 192.168.20.0/24 видят друг друга.',
    ic: 'vpn',
    cat: 'vpn',
    art: 'wg-site',
    blocks: [
      { h: 'Офис A', c: '/interface wireguard add name=wg0 listen-port=13231\n/ip address add address=10.99.0.1/30 interface=wg0\n/interface wireguard peers add interface=wg0 public-key="КЛЮЧ_ОФИСА_B" \\\n  endpoint-address=203.0.113.20 endpoint-port=13231 allowed-address=10.99.0.2/32,192.168.20.0/24 \\\n  persistent-keepalive=25s\n/ip route add dst-address=192.168.20.0/24 gateway=10.99.0.2' },
      { h: 'Офис B', c: '/interface wireguard add name=wg0 listen-port=13231\n/ip address add address=10.99.0.2/30 interface=wg0\n/interface wireguard peers add interface=wg0 public-key="КЛЮЧ_ОФИСА_A" \\\n  endpoint-address=203.0.113.10 endpoint-port=13231 allowed-address=10.99.0.1/32,192.168.10.0/24 \\\n  persistent-keepalive=25s\n/ip route add dst-address=192.168.10.0/24 gateway=10.99.0.1' },
      { h: 'Firewall', c: '/ip firewall filter add chain=input protocol=udp dst-port=13231 action=accept comment="wg"\n/ip firewall filter add chain=forward in-interface=wg0 action=accept comment="из туннеля"\n/ip firewall filter add chain=forward out-interface=wg0 action=accept comment="в туннель"' }
    ],
    check: '/interface wireguard peers print detail\n/ping 192.168.20.1 src-address=192.168.10.1 count=4\n/ip route print where dst-address=192.168.20.0/24',
    tips: [
      'allowed-address — это и есть маршрутизация: без сети собеседника трафик не пойдёт.',
      'Endpoint нужен только на одной стороне, если вторая за NAT; persistent-keepalive держит туннель.',
      'MTU туннеля по умолчанию 1420 — при проблемах с большими пакетами уменьшите до 1380.'
    ],
    pitfall: 'Если обе сети используют одинаковую подсеть (192.168.88.0/24), маршрутизация невозможна: переделайте адресацию одного офиса.'
  },
  {
    id: 'ex-backup-script',
    t: 'Автобэкап и выгрузка копии',
    d: 'Ежедневный бэкап конфигурации и отправка файла на почту или FTP — чтобы восстановиться после сбоя.',
    ic: 'svc',
    cat: 'services',
    art: 'task-backup-automation',
    blocks: [
      { h: 'Локальный бэкап по расписанию', c: '/system backup save name=auto-config dont-encrypt=no\n/export file=auto-export\n/system scheduler add name=daily-backup interval=1d start-time=03:30 \\\n  on-event="/system backup save name=auto-config; /export file=auto-export" comment="ежедневный бэкап"' },
      { h: 'Отправка на e-mail', c: '/tool e-mail set server=smtp.yandex.ru port=587 from=router@example.com tls=yes \\\n  user=router@example.com password="ПАРОЛЬ_ПРИЛОЖЕНИЯ"\n/system scheduler add name=mail-backup interval=1d start-time=04:00 \\\n  on-event="/tool e-mail send to=admin@example.com subject=\\"backup \\$[/system identity get name]\\" \\\n  file=auto-export.backup" comment="копия на почту"' },
      { h: 'Проверка', c: '/system backup print\n/file print where name~"auto"' }
    ],
    check: '/system scheduler print detail\n/file print where name~"auto"\n/system backup load name=auto-config',
    tips: [
      'Бинарный .backup восстанавливается только на ту же модель и версию RouterOS; .rsc (export) — универсальный, но без паролей.',
      'Храните копии вне роутера: почта, FTP, облако — что-то одно должно пережить замену железа.',
      'Пароль на .backup обязателен, если файл уходит за пределы устройства.'
    ],
    pitfall: 'Не сохраняйте бэкап только во flash роутера: при замене железа он останется в старом устройстве.'
  }
];
