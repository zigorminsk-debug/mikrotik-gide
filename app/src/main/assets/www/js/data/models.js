/* Раскладка портов типовых моделей: что где находится и для чего. */
window.MODEL_MAPS = [
  {
    id: 'hex', name: 'hEX / hEX S (RB750Gr3)', art: 'if-ethernet',
    note: '5 гигабитных портов, SFP только у hEX S. Питание 12–57 В, PoE-out нет.',
    ports: [
      { n: 1, label: 'ether1', role: 'WAN', note: 'Провайдер; на hEX S рядом порт SFP' },
      { n: 2, label: 'ether2', role: 'LAN', note: 'Локальная сеть, коммутатор' },
      { n: 3, label: 'ether3', role: 'LAN', note: 'Локальная сеть' },
      { n: 4, label: 'ether4', role: 'LAN', note: 'Точка доступа / камера' },
      { n: 5, label: 'ether5', role: 'LAN', note: 'Гостевая VLAN или резерв' }
    ],
    extras: [
      { t: 'SFP (hEX S)', note: 'Оптика или медь на 1G, альтернатива ether1' },
      { t: 'USB', note: 'hEX S — для LTE-модема как резервного канала' },
      { t: 'Кнопка Reset', note: 'Удержание при включении — сброс или Netinstall' }
    ]
  },
  {
    id: 'ax3', name: 'hAP ax3 (C53UiG+5HPaxD2HPaxD)', art: 'wifi-interface',
    note: 'Wi-Fi 6 (2,4 + 5 ГГц), 5 портов 1G, порт ether1 умеет PoE-in.',
    ports: [
      { n: 1, label: 'ether1', role: 'WAN', note: 'Провайдер, PoE-in 802.3af/at' },
      { n: 2, label: 'ether2', role: 'LAN', note: 'Коммутатор офиса' },
      { n: 3, label: 'ether3', role: 'LAN', note: 'Точка доступа / принтер' },
      { n: 4, label: 'ether4', role: 'LAN', note: 'Камеры (отдельная VLAN)' },
      { n: 5, label: 'ether5', role: 'LAN', note: 'Гостевая сеть / резерв' }
    ],
    extras: [
      { t: 'Wi-Fi 2,4 ГГц', note: 'Дальность и IoT; канал 20 МГц' },
      { t: 'Wi-Fi 5 ГГц', note: 'Скорость; каналы 36–64 и 100–144' },
      { t: 'USB 3.0', note: 'LTE-модем или накопитель' }
    ]
  },
  {
    id: 'rb951g', name: 'RB951G-2HnD (5 портов + 802.11n)', art: 'wifi-interface',
    note: 'Старая добрая рабочая лошадка: 5 гигабитных портов, один диапазон 2,4 ГГц, пакет wireless (wlan1). Пакета wifi и меню /interface wifi здесь нет — вся настройка Wi-Fi через /interface wireless.',
    ports: [
      { n: 1, label: 'ether1', role: 'WAN', note: 'Провайдер; PoE-in нет, питание от БП 24 В' },
      { n: 2, label: 'ether2', role: 'LAN', note: 'Локальная сеть (в заводском конфиге — с 192.168.88.1)' },
      { n: 3, label: 'ether3', role: 'LAN', note: 'Коммутатор или точка доступа' },
      { n: 4, label: 'ether4', role: 'LAN', note: 'Принтер, ТВ-приставка' },
      { n: 5, label: 'ether5', role: 'LAN', note: 'Гостевая VLAN или резерв' }
    ],
    extras: [
      { t: 'Wi-Fi 2,4 ГГц (wlan1)', note: '802.11b/g/n, один диапазон: 5 ГГц нет' },
      { t: 'Пакет wireless', note: 'SSID и страна задаются на интерфейсе: /interface wireless set wlan1 ssid=… country=…' },
      { t: 'USB', note: 'USB 2.0 — LTE-модем или флешка для бэкапов' },
      { t: 'Питание', note: '24 В, 1,2 А; PoE-out на портах нет' }
    ]
  },
  {
    id: 'rb4011', name: 'RB4011iGS+ (10 портов)', art: 'if-bonding',
    note: 'Мощный роутер без Wi-Fi: 10 портов 1G, SFP+ 10G, два блока питания.',
    ports: [
      { n: 1, label: 'ether1', role: 'WAN', note: 'Основной провайдер' },
      { n: 2, label: 'ether2', role: 'WAN2', note: 'Второй провайдер или LTE-шлюз' },
      { n: 3, label: 'ether3', role: 'LAN', note: 'Коммутатор ядра' },
      { n: 4, label: 'ether4', role: 'LAN', note: '' },
      { n: 5, label: 'ether5', role: 'LAN', note: '' },
      { n: 6, label: 'ether6', role: 'LAN', note: '' },
      { n: 7, label: 'ether7', role: 'LAN', note: '' },
      { n: 8, label: 'ether8', role: 'LAN', note: '' },
      { n: 9, label: 'ether9', role: 'LAN', note: '' },
      { n: 10, label: 'ether10', role: 'LAN', note: 'Часто — гостевая сеть' }
    ],
    extras: [
      { t: 'SFP+ (10G)', note: 'Uplink к ядру или серверу' },
      { t: 'Два питания', note: 'Резервирование по питанию' },
      { t: 'Консоль', note: 'Serial для восстановления доступа' }
    ]
  },
  {
    id: 'crs328', name: 'CRS328-24P-4S+ (коммутатор)', art: 'sw-switch',
    note: '24 порта 1G с PoE-out (до 500 Вт), 4 SFP+ 10G. Роутером работает, но чаще — коммутатор.',
    ports: [
      { n: 1, label: 'ether1', role: 'UPLINK', note: 'К роутеру или в ядро' },
      { n: 2, label: 'ether2', role: 'PoE', note: 'Точка доступа 802.3af/at' },
      { n: 3, label: 'ether3', role: 'PoE', note: 'Камера' },
      { n: 4, label: 'ether4', role: 'PoE', note: 'Телефон IP' },
      { n: 5, label: 'ether5…23', role: 'LAN', note: 'Рабочие места и устройства' },
      { n: 24, label: 'ether24', role: 'PoE', note: 'Резервный порт' }
    ],
    extras: [
      { t: 'SFP+ 1–4', note: '10G до сервера или соседнего коммутатора' },
      { t: 'PoE-out', note: 'Питание точек и камер; смотрите бюджет PoE' },
      { t: 'Switch chip', note: 'VLAN на чипе — быстрее, чем через CPU' }
    ]
  }
];
