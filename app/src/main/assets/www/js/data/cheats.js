/* Шпаргалки: короткие наборы команд RouterOS 7, которые нужны чаще всего. */
window.CHEATS = [
  {
    id: 'base',
    t: 'Базовый конфиг за 5 минут',
    d: 'Мост LAN, адрес, DHCP, DNS и NAT — минимальный набор, после которого есть интернет.',
    ic: 'start',
    blocks: [
      {
        h: 'Мост и адрес',
        c: '/interface bridge add name=bridge-lan\n' +
          '/interface bridge port add bridge=bridge-lan interface=ether2\n' +
          '/interface bridge port add bridge=bridge-lan interface=ether3\n' +
          '/ip address add address=192.168.88.1/24 interface=bridge-lan'
      },
      {
        h: 'DHCP и DNS',
        c: '/ip pool add name=lan-pool ranges=192.168.88.100-192.168.88.200\n' +
          '/ip dhcp-server add name=dhcp-lan interface=bridge-lan address-pool=lan-pool lease-time=1d disabled=no\n' +
          '/ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=192.168.88.1\n' +
          '/ip dns set allow-remote-requests=yes servers=1.1.1.1,8.8.8.8'
      },
      {
        h: 'WAN и NAT',
        c: '/interface list add name=WAN\n' +
          '/interface list member add list=WAN interface=ether1\n' +
          '/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade'
      }
    ],
    tips: [
      'ether1 обычно WAN, ether2–ether5 — LAN. Если порт уже в bridge по умолчанию, сначала /interface bridge port print и уберите лишнее.',
      'После настройки firewall из следующей шпаргалки доступ к Winbox останется только из LAN — это нормально.'
    ]
  },
  {
    id: 'firewall',
    t: 'Firewall input: шесть правил',
    d: 'Закрывает роутер от WAN, оставляя established, ICMP и доступ из LAN.',
    ic: 'svc',
    blocks: [
      {
        h: 'Порядок важен',
        c: '/interface list add name=WAN\n' +
          '/interface list member add list=WAN interface=ether1\n' +
          '/ip firewall filter add chain=input connection-state=established,related action=accept comment="established"\n' +
          '/ip firewall filter add chain=input connection-state=invalid action=drop comment="invalid"\n' +
          '/ip firewall filter add chain=input protocol=icmp action=accept comment="icmp"\n' +
          '/ip firewall filter add chain=input in-interface-list=LAN action=accept comment="lan"\n' +
          '/ip firewall filter add chain=input action=drop comment="drop rest"'
      },
      {
        h: 'Проверить, что не заперли себя',
        c: '/ip firewall filter print\n' +
          '/ip service print\n' +
          '/ip service disable telnet,ftp,www,api\n' +
          '/ip service set winbox address=192.168.88.0/24'
      }
    ],
    tips: [
      'Если нужен VPN или WireGuard — добавьте accept для их порта ДО правила drop.',
      'Правило drop в конце обязательно: без него всё остальное бесполезно.'
    ]
  },
  {
    id: 'nat',
    t: 'NAT и проброс порта',
    d: 'Маскарадинг для выхода в интернет и dst-nat для камеры, сервера или NAS.',
    ic: 'iface',
    blocks: [
      {
        h: 'Выход в интернет',
        c: '/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="masquerade"'
      },
      {
        h: 'Проброс 8080 → камера 192.168.88.50:80',
        c: '/ip firewall nat add chain=dstnat in-interface-list=WAN protocol=tcp dst-port=8080 action=dst-nat to-addresses=192.168.88.50 to-ports=80 comment="cam web"'
      },
      {
        h: 'Hairpin NAT: доступ изнутри по внешнему адресу',
        c: '/ip firewall nat add chain=srcnat src-address=192.168.88.0/24 dst-address=192.168.88.50 protocol=tcp dst-port=80 action=masquerade comment="hairpin"'
      }
    ],
    tips: [
      'Не пробрасывайте Winbox, SSH и API наружу — для удалённого доступа используйте VPN.',
      'Проверка: /ip firewall nat print stats и /log print where topics~"firewall".'
    ]
  },
  {
    id: 'vlan',
    t: 'VLAN на bridge',
    d: 'Гостевая сеть и офис на одном железе, с изоляцией друг от друга.',
    ic: 'bridge',
    blocks: [
      {
        h: 'Порты: теги и pvid',
        c: '/interface bridge port set [find interface=ether5] pvid=20\n' +
          '/interface bridge vlan add bridge=bridge-lan vlan-ids=10 tagged=bridge-lan untagged=ether2,ether3\n' +
          '/interface bridge vlan add bridge=bridge-lan vlan-ids=20 tagged=bridge-lan\n' +
          '/interface bridge set bridge-lan vlan-filtering=yes'
      },
      {
        h: 'Интерфейс, адрес и DHCP для гостей',
        c: '/interface vlan add name=vlan20-guest interface=bridge-lan vlan-id=20\n' +
          '/ip address add address=192.168.20.1/24 interface=vlan20-guest\n' +
          '/ip pool add name=guest-pool ranges=192.168.20.100-192.168.20.200\n' +
          '/ip dhcp-server add name=dhcp-guest interface=vlan20-guest address-pool=guest-pool lease-type=regular disabled=no\n' +
          '/ip dhcp-server network add address=192.168.20.0/24 gateway=192.168.20.1 dns-server=192.168.20.1'
      },
      {
        h: 'Изоляция гостей от LAN',
        c: '/ip firewall filter add chain=forward src-address=192.168.20.0/24 dst-address=192.168.88.0/24 action=drop comment="guest to lan"\n' +
          '/ip firewall filter add chain=forward connection-state=established,related action=accept comment="fwd established"\n' +
          '/ip firewall filter add chain=forward in-interface=vlan20-guest out-interface-list=WAN action=accept comment="guest to wan"'
      }
    ],
    tips: [
      'Порядок: сначала pvid и vlan-таблица, только потом vlan-filtering=yes. Иначе потеряете доступ.',
      'trunk-порт (обычно ether5 к другой точке) должен быть tagged для всех VLAN.'
    ]
  },
  {
    id: 'wg',
    t: 'WireGuard: сервер и клиент',
    d: 'Быстрый VPN до офиса: интерфейс, адрес, пир и одно правило firewall.',
    ic: 'iface',
    blocks: [
      {
        h: 'На роутере (сервер)',
        c: '/interface wireguard add name=wg0 listen-port=51820 private-key="ВАШ_КЛЮЧ"\n' +
          '/ip address add address=10.10.10.1/24 interface=wg0\n' +
          '/interface wireguard peers add interface=wg0 public-key="КЛЮЧ_КЛИЕНТА" allowed-address=10.10.10.2/32\n' +
          '/ip firewall filter add chain=input protocol=udp dst-port=51820 action=accept comment="wireguard"'
      },
      {
        h: 'Клиент (телефон или ноутбук)',
        c: '[Interface]\nAddress = 10.10.10.2/32\nPrivateKey = КЛЮЧ_КЛИЕНТА\n\n[Peer]\nPublicKey = КЛЮЧ_РОУТЕРА\nEndpoint = ваш.внешний.адрес:51820\nAllowedIPs = 192.168.88.0/24, 10.10.10.0/24\nPersistentKeepalive = 25'
      },
      {
        h: 'Проверка',
        c: '/interface wireguard peers print\n' +
          '/ip route print where dst-address=10.10.10.0/24\n' +
          '/ping 10.10.10.2 count=3'
      }
    ],
    tips: [
      'Ключи можно сгенерировать в приложении: Инструменты → Пароли и ключи → WireGuard.',
      'Если за роутером NAT провайдера — нужен проброс UDP 51820 или облачный relay.'
    ]
  },
  {
    id: 'backup',
    t: 'Бэкап, экспорт и обновление',
    d: 'Что сохранить перед изменениями и как откатиться за минуту.',
    ic: 'down',
    blocks: [
      {
        h: 'Перед любыми изменениями',
        c: '/export file=cfg-before\n' +
          '/system backup save name=before-change\n' +
          '/file print where name~"before"'
      },
      {
        h: 'Обновление RouterOS',
        c: '/system package update check-for-updates\n' +
          '/system package update download\n' +
          '/system reboot'
      },
      {
        h: 'Откат',
        c: '/system backup load name=before-change\n' +
          '/import file-name=cfg-before.rsc'
      }
    ],
    tips: [
      'Файл .backup восстанавливается только на ту же модель и версию, .rsc — переносится.',
      'Скачайте файлы на компьютер: Files → перетащите или Winbox → Files → Download.',
      'Вставьте /export в «Аудит конфига» — приложение проверит 24 типовые ошибки.'
    ]
  },
  {
    id: 'diag',
    t: 'Пять команд диагностики',
    d: 'Нет интернета, тормозит или непонятно, куда уходит трафик.',
    ic: 'task',
    blocks: [
      {
        h: 'Связность и маршруты',
        c: '/ping 8.8.8.8 count=5\n' +
          '/ping 192.168.88.1 count=3\n' +
          '/tool traceroute 8.8.8.8\n' +
          '/ip route print where active=yes'
      },
      {
        h: 'Кто ест канал',
        c: '/tool torch interface=ether1\n' +
          '/interface print stats\n' +
          '/ip firewall connection print count-only'
      },
      {
        h: 'Логи и адреса',
        c: '/log print where topics~"error"\n' +
          '/ip address print\n' +
          '/ip dhcp-server lease print'
      }
    ],
    tips: [
      'Ping по IP работает, а сайты не открываются — проверьте /ip dns и allow-remote-requests.',
      'Ping не идёт даже до шлюза провайдера — смотрите линк и /interface print.',
      'Подробные сценарии — в разделе «Диагностика по симптому».'
    ]
  }
];
