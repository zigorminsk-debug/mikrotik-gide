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
  ,
  {
    id: 'hap_ax2', name: 'hAP ax² (C52iG-5HaxD2HaxD)', art: 'wifi-interface',
    note: 'Wi-Fi 6, 5 гигабитных портов, PoE-in и PoE-out на ether1, 1 ГБ RAM. SSID и страна — в профиле configuration.',
    ports: [
      { n: 1, label: 'ether1', role: 'PoE', note: 'Провайдер; PoE-in и пассивный PoE-out' },
      { n: 2, label: 'ether2', role: 'LAN', note: 'Коммутатор офиса' },
      { n: 3, label: 'ether3', role: 'LAN', note: 'Точка доступа / принтер' },
      { n: 4, label: 'ether4', role: 'LAN', note: 'Камеры (отдельная VLAN)' },
      { n: 5, label: 'ether5', role: 'LAN', note: 'Гостевая сеть / резерв' }
    ],
    extras: [
      { t: 'Wi-Fi 2,4 ГГц (wifi1)', note: '802.11ax, канал 20 МГц в плотной застройке' },
      { t: 'Wi-Fi 5 ГГц (wifi2)', note: '802.11ax, каналы 36–64 и 100–144' },
      { t: 'Пакет wifi-qcom', note: '/interface wifi; country и ssid — в /interface wifi configuration' }
    ]
  },
  {
    id: 'hap_ac2', name: 'hAP ac² (RBD52G-5HacD2HnD)', art: 'wifi-capsman',
    note: 'ARM, Wi-Fi 5: пакет wireless по умолчанию, можно заменить на wifi-qcom-ac и получить /interface wifi с WPA3.',
    ports: [
      { n: 1, label: 'ether1', role: 'WAN', note: 'Провайдер, пассивный PoE-in' },
      { n: 2, label: 'ether2', role: 'LAN', note: 'Локальная сеть' },
      { n: 3, label: 'ether3', role: 'LAN', note: 'Локальная сеть' },
      { n: 4, label: 'ether4', role: 'LAN', note: 'Локальная сеть' },
      { n: 5, label: 'ether5', role: 'PoE', note: 'LAN + PoE-out для точки доступа' }
    ],
    extras: [
      { t: 'Два диапазона', note: 'wlan1/wlan2 (wireless) или wifi1/wifi2 (wifi-qcom-ac)' },
      { t: 'Замена пакета', note: 'Удалить wireless → установить wifi-qcom-ac → перезагрузка; конфиг Wi-Fi переносится вручную' }
    ]
  },
  {
    id: 'cap_ax', name: 'cAP ax (cAPGi-5HaxD2HaxD)', art: 'wifi-capsman',
    note: 'Потолочная точка доступа Wi-Fi 6: два порта, PoE-in на ether1, PoE-out на ether2.',
    ports: [
      { n: 1, label: 'ether1', role: 'PoE', note: 'Питание 802.3af/at, uplink к коммутатору' },
      { n: 2, label: 'ether2', role: 'LAN', note: 'PoE-out: запитать соседнюю камеру или точку' }
    ],
    extras: [
      { t: 'Wi-Fi 6 (wifi-qcom)', note: 'wifi1 — 2,4 ГГц, wifi2 — 5 ГГц' },
      { t: 'CAPsMAN v2', note: '/interface wifi capsman на контроллере + provisioning' }
    ]
  },
  {
    id: 'rb5009', name: 'RB5009UG+S+IN', art: 'if-bonding',
    note: 'Маршрутизатор без Wi-Fi: 7 × 1G, 2,5G и SFP+ 10G, USB 3.0, PoE-in на ether1.',
    ports: [
      { n: 1, label: 'ether1', role: 'WAN', note: 'Провайдер, PoE-in 802.3af/at' },
      { n: 2, label: 'ether2', role: 'LAN', note: 'Коммутатор' },
      { n: 3, label: 'ether3', role: 'LAN', note: 'Серверы' },
      { n: 4, label: 'ether4', role: 'LAN', note: 'Серверы' },
      { n: 5, label: 'ether5', role: 'LAN', note: 'Резерв' },
      { n: 6, label: 'ether6', role: 'LAN', note: 'Резерв' },
      { n: 7, label: 'ether7', role: 'LAN', note: 'Резерв' },
      { n: 8, label: 'ether8', role: 'LAN', note: '2,5G: NAS или второй коммутатор' },
      { n: 9, label: 'sfp-sfpplus1', role: 'Uplink', note: '10G оптика на ядро сети' }
    ],
    extras: [
      { t: 'Wi-Fi нет', note: 'беспроводку подключайте точками cAP/wAP и CAPsMAN' },
      { t: 'Производительность', note: '10G-порты и 4 ядра — для гигабитных каналов и множества VPN' }
    ]
  }
];

/* =========================================================================
   Эксклюзив: матрица совместимости ходовых моделей с мастером конфигурации.
   pkg — какой драйвер Wi-Fi и, значит, какое меню: wifi (/interface wifi),
   wireless (/interface wireless) или «—» (Wi-Fi нет).
   Данные по даташитам MikroTik; у одной модели бывают ревизии — сверяйтесь
   с наклейкой на корпусе и /system resource print.
   ========================================================================= */
window.MODEL_SPECS = [
  { id: 'hex', name: 'hEX (RB750Gr3)', pkg: '—', bands: '—', eth: '5 × 1G', sfp: '—', usb: '—',
    poeIn: '—', poeOut: '—', ram: '256 МБ',
    note: 'Рабочая лошадка офиса: 5 гигабитных портов, Wi-Fi нет. ether1 — провайдер, ether2–ether5 — LAN.' },
  { id: 'hexs', name: 'hEX S (RB760iGS)', pkg: '—', bands: '—', eth: '5 × 1G', sfp: 'есть', usb: 'есть',
    poeIn: 'ether1', poeOut: 'ether5', ram: '256 МБ',
    note: 'Тот же hEX, но с SFP, USB и PoE-out на ether5 — удобно запитать точку доступа.' },
  { id: 'hexpoe', name: 'hEX PoE (RB960PGS)', pkg: '—', bands: '—', eth: '5 × 1G', sfp: 'есть', usb: 'есть',
    poeIn: 'ether1', poeOut: 'ether2–ether5', ram: '256 МБ',
    note: 'Питает до четырёх устройств по 802.3af/at: камеры, точки доступа.' },
  { id: 'rb951g', name: 'RB951G-2HnD', pkg: 'wireless', bands: '2,4 ГГц (b/g/n)', eth: '5 × 1G', sfp: '—', usb: 'USB 2.0',
    poeIn: 'ether1', poeOut: '—', ram: '128 МБ',
    note: 'Меню /interface wifi здесь нет: только /interface wireless и радиоинтерфейс wlan1.' },
  { id: 'hap_lite', name: 'hAP lite (RB941-2nD)', pkg: 'wireless', bands: '2,4 ГГц (b/g/n)', eth: '4 × 100M', sfp: '—', usb: '—',
    poeIn: 'ether1', poeOut: '—', ram: '32 МБ',
    note: 'Порты на 100 Мбит/с. Для гостевой сети только виртуальный AP на wlan1.' },
  { id: 'hap_ac2', name: 'hAP ac² (RBD52G-5HacD2HnD)', pkg: 'wireless или wifi-qcom-ac', bands: '2,4 + 5 ГГц (n/ac)', eth: '5 × 1G', sfp: '—', usb: '—',
    poeIn: 'ether1', poeOut: 'ether5', ram: '128 МБ',
    note: 'ARM-модель: можно заменить пакет wireless на wifi-qcom-ac и настраивать через /interface wifi (WPA3, новый CAPsMAN).' },
  { id: 'hap_ac3', name: 'hAP ac³ (RBD53iG-5HacD2HnD)', pkg: 'wireless или wifi-qcom-ac', bands: '2,4 + 5 ГГц (n/ac)', eth: '5 × 1G', sfp: '—', usb: '—',
    poeIn: 'ether1', poeOut: '—', ram: '256 МБ',
    note: 'Как ac², но с усиленными антеннами и пассивным PoE-in на ether1.' },
  { id: 'hap_ax2', name: 'hAP ax² (C52iG-5HaxD2HaxD)', pkg: 'wifi-qcom', bands: '2,4 + 5 ГГц (ax)', eth: '5 × 1G', sfp: '—', usb: '—',
    poeIn: 'ether1', poeOut: 'ether1', ram: '1 ГБ',
    note: 'Wi-Fi 6: SSID и страна — в профиле configuration, PoE-in и PoE-out на одном порту ether1.' },
  { id: 'hap_ax3', name: 'hAP ax³ (C53UiG+5HPaxD2HPaxD)', pkg: 'wifi-qcom', bands: '2,4 + 5 ГГц (ax)', eth: '4 × 1G + 1 × 2,5G', sfp: '—', usb: 'USB 3.0',
    poeIn: 'ether1 (2,5G)', poeOut: 'ether1 (2,5G)', ram: '1 ГБ',
    note: 'ether1 — 2,5 Гбит/с с PoE-in и PoE-out. При мастер-конфиге WAN ставим на ether1, LAN — ether2–ether5.' },
  { id: 'cap_ax', name: 'cAP ax (cAPGi-5HaxD2HaxD)', pkg: 'wifi-qcom', bands: '2,4 + 5 ГГц (ax)', eth: '2 × 1G', sfp: '—', usb: '—',
    poeIn: 'ether1', poeOut: 'ether2', ram: '256 МБ',
    note: 'Потолочная точка доступа: два порта, второй умеет питать соседнее устройство.' },
  { id: 'cap_ac', name: 'cAP ac (RBcAPGi-5acD2nD)', pkg: 'wireless или wifi-qcom-ac', bands: '2,4 + 5 ГГц (n/ac)', eth: '2 × 1G', sfp: '—', usb: '—',
    poeIn: 'ether1', poeOut: 'ether2', ram: '128 МБ',
    note: 'На 128 МБ пакет wifi-qcom-ac заметно тяжелее — для простой точки доступа хватает wireless.' },
  { id: 'wap_ac', name: 'wAP ac (RBwAPG-5HacD2HnD)', pkg: 'wireless или wifi-qcom-ac', bands: '2,4 + 5 ГГц (n/ac)', eth: '1 × 1G', sfp: '—', usb: '—',
    poeIn: 'ether1', poeOut: '—', ram: '128 МБ',
    note: 'Один порт: в мастер-конфиге LAN-портов нет, устройство работает как точка доступа с брижджем.' },
  { id: 'l009', name: 'L009UiGS-2HaxD', pkg: 'wifi-qcom', bands: '2,4 ГГц (ax)', eth: '8 × 1G', sfp: 'есть', usb: 'есть',
    poeIn: 'ether1', poeOut: '—', ram: '512 МБ',
    note: 'Много портов и SFP при Wi-Fi только 2,4 ГГц — профиль для 5 ГГц мастер не создаёт.' },
  { id: 'rb4011', name: 'RB4011iGS+', pkg: '—', bands: '—', eth: '10 × 1G + SFP+ 10G', sfp: 'SFP+ 10G', usb: 'USB 3.0',
    poeIn: 'ether1', poeOut: '—', ram: '1 ГБ',
    note: 'Без Wi-Fi. Версия с Wi-Fi (RB4011iGS+5HacQ2HnD) — MIPSBE: только пакет wireless, и 2,4 ГГц не поддерживается wifi-qcom-ac.' },
  { id: 'rb5009', name: 'RB5009UG+S+IN', pkg: '—', bands: '—', eth: '7 × 1G + 1 × 2,5G + SFP+ 10G', sfp: 'SFP+ 10G', usb: 'USB 3.0',
    poeIn: 'ether1', poeOut: '—', ram: '1 ГБ',
    note: 'Маршрутизатор для гигабитных каналов: Wi-Fi нет, подключайте cAP/wAP.' }
];
