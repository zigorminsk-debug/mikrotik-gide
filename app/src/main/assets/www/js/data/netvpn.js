/* netvpn.js — раздел «Резервный интернет и VPN».
   Зачем отдельный раздел: раньше настройка резервного канала и WireGuard лежали
   внутри больших групп, и их было трудно найти. Здесь одна группа, три сценария
   WireGuard (сервер на MikroTik, клиенты ПК и телефон, MikroTik как клиент)
   и статья про резервный интернет, перенесённая сюда из «Задач».

   Все схемы в разделе — сцена-инструкция (marks: 1): под окном стоит список
   «1 — нажмите…, 2 — впишите…», и те же номера нарисованы на кнопках и полях. */
(function () {
  'use strict';
  if (!window.DATA) window.DATA = [];

  function findArticle(id) {
    for (let i = 0; i < window.DATA.length; i++) {
      const its = window.DATA[i].items || [];
      for (let j = 0; j < its.length; j++) if (its[j].id === id) return its[j];
    }
    return null;
  }

  const PUB = 'q3Jd9kLm2WvT8pR4sXc1hYn6aQe0bFz=';   /* пример публичного ключа */
  const PUB_PC = 'Nv7tR2xQ…9dKp=';

  /* ---------------------------------------------------------------- хаб --- */
  const START = {
    id: 'netvpn-start',
    t: 'Резервный интернет и VPN: с чего начать',
    lvl: 1,
    path: 'Routing → Table · IP → Firewall · IP → Routes · WireGuard',
    tags: ['резервный интернет', 'failover', 'wireguard', 'vpn', 'раздел'],
    purpose: 'Этот раздел — про две вещи, которые чаще всего нужны «прямо сейчас»: ' +
      'чтобы интернет не пропадал (резервный канал) и чтобы был безопасный доступ в свою сеть ' +
      'из любого места (VPN WireGuard). Здесь же — та самая настройка резервного интернета: ' +
      'она больше не спрятана в общих статьях, а лежит отдельным пунктом.',
    usage: [
      'Резервный интернет — два провайдера, роутер сам переключается по пингу (кабель + LTE).',
      'WireGuard-сервер на MikroTik — домой/в офис с телефона или ноутбука.',
      'MikroTik как клиент WireGuard — филиал подключается к серверу в офисе (site-to-site).',
      'L2TP/IPsec — VPN без установки приложений: клиент уже встроен в Windows, Android и iOS.',
      'OpenVPN — VPN по сертификатам: свой центр сертификации, отзыв доступа по устройству.'
    ],
    steps: [
      {
        t: 'Выберите, что вам нужно',
        d: '**Резервный интернет** — когда провайдер пропадает, а работать надо. ' +
          'Нужны две линии связи и 15 минут на настройку: статья «Резервный интернет: ' +
          'два провайдера, переключение по пингу» (16 шагов с картинками). ' +
          '**VPN-сервер** — когда нужен доступ к домашней/офисной сети снаружи, но без ' +
          'проброса портов к компьютерам: статья «WireGuard: MikroTik как сервер для ПК и телефона». ' +
          '**VPN-клиент** — когда ваш роутер, наоборот, должен подключиться к чужому серверу: ' +
          'статья «WireGuard: MikroTik как клиент». ' +
          '**L2TP/IPsec** — когда на устройствах сотрудников не хочется ставить приложение: ' +
          'такой VPN встроен в Windows, Android и iPhone. **OpenVPN** — когда нужен доступ по ' +
          'сертификатам и отзыв по одному устройству. ' +
          'Не хочется вводить команды руками — откройте «Мастер конфигурации»: в нём есть блок ' +
          '«Резервный интернет» (два провайдера, пороги, типы подключения) и он собирает готовый .rsc.',
        noScene: true
      },
      {
        t: 'Проверьте фундамент',
        d: 'Для любой из этих схем нужны три вещи: роутер с RouterOS 7, интернет на WAN ' +
          'и доступ в веб-интерфейс (Winbox). Для WireGuard внешний адрес должен быть публичным ' +
          'или проброшенным — если провайдер даёт «серый» адрес (CGNAT), сервер за ним не поднимется: ' +
          'в этом случае роутер может быть только клиентом. Для резервного интернета нужен второй ' +
          'канал: LTE-модем, второй кабель или PPPoE-подключение.',
        noScene: true
      },
      {
        t: 'Держите под рукой проверку',
        d: 'После любой настройки открывайте **Log** и смотрите строки по теме: ' +
          '`wan-failover` для резервного канала, `wireguard` для туннелей. ' +
          'Если в логе тихо, а связи нет — проблема в firewall, адресах или маршрутах, ' +
          'а не в самом протоколе.',
        noScene: true
      }
    ],
    warn: 'WireGuard работает по UDP: если провайдер или корпоративная сеть блокируют UDP, ' +
      'туннель не поднимется. Тогда пробуют нестандартный порт (например 51820 → 443/UDP) ' +
      'или другой тип VPN.',
    next: ['task-wan-failover', 'wg-server', 'wg-client-config', 'wg-site']
  };

  /* ------------------------------------------------------- WG-сервер --- */
  const SERVER = {
    id: 'wg-server',
    t: 'WireGuard: MikroTik как сервер для ПК и телефона',
    lvl: 2,
    path: 'WireGuard → WireGuard · WireGuard → Peers · IP → Address · IP → Firewall · IP → DNS',
    tags: ['wireguard', 'vpn', 'сервер', 'qr', 'удалённый доступ', 'ключи'],
    purpose: 'Роутер становится VPN-сервером WireGuard: вы включаете туннель на телефоне или ' +
      'ноутбуке и оказываетесь в своей домашней сети — как будто сидите рядом с роутером. ' +
      'Никаких пробросов портов к компьютерам, только один UDP-порт на роутере. ' +
      'WireGuard встроен в RouterOS 7, ставить ничего не нужно.',
    usage: [
      'Доступ к домашним файлам и камерам из поездки.',
      'Удалённая работа: офисная сеть через телефон или ноутбук.',
      'Безопасный интернет в чужом Wi-Fi (весь трафик идёт через свой роутер).'
    ],
    pros: [
      'Один UDP-порт на роутере и понятные ключи вместо паролей.',
      'Быстро: WireGuard работает в ядре RouterOS, скорость почти как без VPN.',
      'Телефон подключается сканированием QR-кода — ничего вписывать руками.',
      'Есть в RouterOS 7 «из коробки», без пакетов и лицензий.'
    ],
    cons: [
      'Нужен публичный (или проброшенный) адрес — за CGNAT сервер не поднимется.',
      'Ключи надо хранить аккуратно: у кого приватный ключ — у того и доступ.',
      'Без DNS и NAT клиент получит туннель, но «интернета через роутер» не будет.',
      'UDP-порт иногда блокируют гостиничные и корпоративные сети.'
    ],
    warn: 'Не открывайте порт WireGuard всему интернету «на всякий случай» и не раздавайте ' +
      'один ключ на всех: у каждого устройства должен быть свой пир. Потеряли телефон — ' +
      'удалите его пир, доступ сразу закроется.',
    steps: [
      {
        t: 'Что должно получиться',
        d: 'Роутер: интерфейс `wg0` с адресом `10.10.10.1/24`, открытый UDP-порт 13231 ' +
          'и по одному пиру на каждое устройство (`10.10.10.2` — телефон, `10.10.10.3` — ноутбук). ' +
          'Устройства получают конфиг с публичным ключом роутера и адресом сервера. ' +
          'Всё общение идёт по одному порту, ключи — вместо логинов и паролей.',
        noScene: true
      },
      {
        t: 'Создайте интерфейс WireGuard',
        d: '1 — в дереве меню откройте группу **WireGuard**, 2 — пункт **WireGuard**. ' +
          '3 — нажмите **+**: откроется New WireGuard. ' +
          '4 — Name = `wg0` (имя пригодится в адресах и маршрутах). ' +
          '5 — Listen Port = `13231` (можно любой свободный UDP-порт). ' +
          '6 — OK. Приватный ключ роутер создаст сам, а публичный покажет в списке — ' +
          'его мы передадим клиентам.',
        sc: {
          marks: 1,
          cap: 'WireGuard → WireGuard: создаём серверный интерфейс',
          path: 'WireGuard → WireGuard', menu: { grp: 1, sub: 2 },
          win: 'WireGuard', tabs: ['WireGuard', 'Peers', 'Private Keys'], tab: 'WireGuard',
          cols: [{ t: 'Name', w: 76 }, { t: 'Listen Port', w: 88 }, { t: 'Public Key', w: 300 }, { t: 'MTU', w: 60 }],
          rows: [[{ v: 'wg0' }, { v: '13231' }, { v: PUB }, { v: '1420' }]],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'New WireGuard',
            fields: [
              { l: 'Name', v: 'wg0', m: 4 },
              { l: 'Listen Port', v: '13231', m: 5 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 6 }]
          },
          notes: [
            '1 — группа WireGuard в дереве меню',
            '2 — пункт WireGuard: список интерфейсов',
            '3 — «+»: новый интерфейс',
            '4 — Name: wg0',
            '5 — Listen Port: 13231 (UDP)',
            '6 — OK: ключи создадутся сами'
          ]
        }
      },
      {
        t: 'Дайте туннелю адрес',
        d: 'Туннель — это отдельная маленькая сеть. Роутер в ней всегда `.1`. ' +
          '1 — откройте **IP**, 2 — пункт **Address**. ' +
          '3 — нажмите **+**. ' +
          '4 — Address = `10.10.10.1/24`. ' +
          '5 — Interface = `wg0` (тот, что создали в прошлом шаге). ' +
          '6 — OK. Без этого адреса клиентам некуда подключаться: у них будет свой адрес ' +
          'из этой же сети (`10.10.10.2`, `10.10.10.3` …).',
        sc: {
          marks: 1,
          cap: 'IP → Address: адрес роутера внутри туннеля',
          path: 'IP → Address', menu: { grp: 1, sub: 2 },
          win: 'Address',
          cols: [{ t: 'Address', w: 150 }, { t: 'Network', w: 140 }, { t: 'Interface', w: 130 }, { t: 'Comment', w: 190 }],
          rows: [
            [{ v: '10.10.10.1/24' }, { v: '10.10.10.0' }, { v: 'wg0' }, 'VPN-сервер'],
            [{ v: '192.168.88.1/24' }, { v: '192.168.88.0' }, { v: 'bridge-lan' }, 'локальная сеть']
          ],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'New Address',
            fields: [
              { l: 'Address', v: '10.10.10.1/24', m: 4 },
              { l: 'Interface', v: 'wg0', type: 'select', m: 5 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 6 }]
          },
          notes: [
            '1 — группа IP',
            '2 — пункт Address',
            '3 — «+»: новый адрес',
            '4 — Address: 10.10.10.1/24',
            '5 — Interface: wg0',
            '6 — OK'
          ]
        }
      },
      {
        t: 'Откройте UDP-порт в firewall',
        d: 'По умолчанию firewall роутера закрывает всё снаружи — значит, и наш порт. ' +
          '1 — в окне IP → Firewall перейдите на вкладку **Filter Rules**, нажмите **+**. ' +
          '2 — Chain = **input** (трафик «на роутер», а не «через роутер»). ' +
          '3 — Protocol = **udp**. ' +
          '4 — Dst. Port = `13231` (тот же, что Listen Port). ' +
          '5 — вкладка **Action**, там выберите Action = **accept**. ' +
          '6 — OK. Важно: правило должно стоять **выше** общего drop в цепочке input, ' +
          'иначе оно никогда не сработает — перетащите его вверх мышью.',
        sc: {
          marks: 1,
          cap: 'IP → Firewall → Filter Rules: разрешаем UDP 13231',
          path: 'IP → Firewall → Filter Rules',
          win: 'IP Firewall',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
          tab: 'Filter Rules',
          cols: [{ t: '#', w: 26 }, { t: 'Chain', w: 66 }, { t: 'Protocol', w: 70 }, { t: 'Dst. Port', w: 72 },
            { t: 'Action', w: 86 }, { t: 'Comment', w: 170 }],
          rows: [
            [{ v: '0' }, { v: 'input' }, { v: 'udp' }, { v: '13231' }, { v: 'accept', c: 'ok' }, 'wireguard'],
            [{ v: '1' }, { v: 'input' }, { v: 'tcp' }, { v: '8291' }, { v: 'accept' }, 'winbox from LAN'],
            [{ v: '2' }, { v: 'input' }, { v: '' }, { v: '' }, { v: 'drop', c: 'no' }, 'drop all from WAN']
          ],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 1 }],
          form: {
            title: 'New Filter Rule', tab: 'General', tabMark: 'Action', tabMarkN: 5,
            fields: [
              { l: 'Chain', v: 'input', type: 'select', t: 'General', m: 2 },
              { l: 'Protocol', v: 'udp', type: 'select', t: 'General', m: 3 },
              { l: 'Dst. Port', v: '13231', t: 'General', m: 4 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 6 }]
          },
          notes: [
            '1 — «+»: новое правило в текущей вкладке',
            '2 — Chain = input',
            '3 — Protocol = udp',
            '4 — Dst. Port = 13231',
            '5 — вкладка Action: там Action = accept',
            '6 — OK и поднять правило выше drop'
          ]
        }
      },
      {
        t: 'Добавьте пир для телефона',
        d: 'Пир — это одно устройство с правом входа. Сначала телефон должен создать свой ключ: ' +
          'в приложении WireGuard нажмите **+** → «Создать туннель» (ключ появится сразу), ' +
          'скопируйте оттуда **Public key**. Затем на роутере: ' +
          '1 — в дереве откройте **WireGuard**, 2 — вкладка **Peers**, 3 — нажмите **+**. ' +
          '4 — Name = `phone` (понятное имя устройства). ' +
          '5 — Interface = `wg0`. ' +
          '6 — Public Key = ключ из телефона. ' +
          '7 — Allowed Address = `10.10.10.2/32` — адрес телефона внутри туннеля. ' +
          '8 — OK.',
        sc: {
          marks: 1,
          cap: 'WireGuard → Peers: пир для телефона',
          path: 'WireGuard → Peers', menu: { grp: 1, sub: 2 },
          win: 'WireGuard', tabs: ['WireGuard', 'Peers', 'Private Keys'], tab: 'Peers',
          cols: [{ t: 'Name', w: 70 }, { t: 'Interface', w: 74 }, { t: 'Public Key', w: 210 },
            { t: 'Allowed Address', w: 130 }, { t: 'Last Handshake', w: 100 }],
          rows: [[{ v: 'phone' }, { v: 'wg0' }, { v: PUB_PC }, { v: '10.10.10.2/32' }, { v: '12s ago', c: 'ok' }]],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'New WireGuard Peer',
            fields: [
              { l: 'Name', v: 'phone', m: 4 },
              { l: 'Interface', v: 'wg0', type: 'select', m: 5 },
              { l: 'Public Key', v: 'x7LmR2…2QpE=', m: 6 },
              { l: 'Allowed Address', v: '10.10.10.2/32', type: 'multi', m: 7 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 8 }]
          },
          notes: [
            '1 — группа WireGuard',
            '2 — вкладка Peers',
            '3 — «+»: новый пир',
            '4 — Name: понятное имя устройства',
            '5 — Interface: wg0',
            '6 — Public Key: ключ из приложения на телефоне',
            '7 — Allowed Address: адрес телефона в туннеле',
            '8 — OK'
          ]
        }
      },
      {
        t: 'Отдайте телефону готовый конфиг (QR-код)',
        d: 'Чтобы не вписывать на телефоне шесть строк руками, RouterOS 7.9 и новее умеет ' +
          'собирать конфиг сам: дважды щёлкните по пиру `phone` → кнопка **Show Client Config**. ' +
          '1 — Client Address = `10.10.10.2/32` (адрес в туннеле). ' +
          '2 — Client DNS = `10.10.10.1` (пусть телефон спрашивает имена у роутера). ' +
          '3 — Client Endpoint = `203.0.113.20:13231` — публичный адрес вашего роутера и порт. ' +
          '4 — Client Allowed Address = `0.0.0.0/0` — весь трафик телефона идёт через вас ' +
          '(если нужен только доступ к домашней сети — впишите `10.10.10.0/24, 192.168.88.0/24`). ' +
          '5 — внизу появится текст конфига и QR-код: на телефоне WireGuard → **+** → ' +
          '«Сканировать QR-код». Всё, туннель создан.',
        sc: {
          marks: 1,
          cap: 'Client Config: телефону — QR, ноутбуку — текст',
          path: 'WireGuard → Peers → Client Config',
          win: 'WireGuard', noTools: true,
          cols: [{ t: 'Name', w: 70 }, { t: 'Interface', w: 74 }, { t: 'Public Key', w: 150 },
            { t: 'Allowed Address', w: 110 }],
          rows: [[{ v: 'phone' }, { v: 'wg0' }, { v: PUB_PC }, { v: '10.10.10.2/32' }]],
          sel: 0,
          form: {
            title: 'Client Config',
            fields: [
              { l: 'Client Address', v: '10.10.10.2/32', m: 1 },
              { l: 'Client DNS', v: '10.10.10.1', m: 2 },
              { l: 'Client Endpoint', v: '203.0.113.20:13231', m: 3 },
              { l: 'Client Allowed Address', v: '0.0.0.0/0', m: 4 },
              { l: 'Config', v: '[Interface]\nPrivateKey = <ключ устройства>\nAddress = 10.10.10.2/32\nDNS = 10.10.10.1\n\n[Peer]\nPublicKey = ' + PUB + '\nEndpoint = 203.0.113.20:13231\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25', type: 'area', m: 5 }
            ],
            buttons: [{ t: 'Close' }]
          },
          notes: [
            '1 — Client Address: адрес телефона в туннеле',
            '2 — Client DNS: адрес роутера в туннеле',
            '3 — Client Endpoint: публичный адрес роутера и порт',
            '4 — Client Allowed Address: 0.0.0.0/0 — весь трафик через VPN',
            '5 — готовый текст конфига и QR-код для приложения'
          ]
        }
      },
      {
        t: 'Пир для ноутбука',
        d: 'Ноутбук подключают так же, но конфиг удобнее вставить текстом. ' +
          '1 — на ПК откройте приложение WireGuard → **Add Tunnel** → «Add empty tunnel»: ' +
          'оно сразу покажет ваш публичный ключ — скопируйте его. ' +
          '2 — на роутере: WireGuard → Peers → **+**, Name = `pc`, Interface = `wg0`, ' +
          'Public Key = ключ ноутбука, Allowed Address = `10.10.10.3/32`, OK. ' +
          '3 — в свойствах пира `pc` снова откройте **Client Config**: Client Address = `10.10.10.3/32`, ' +
          'Client DNS = `10.10.10.1`, Client Endpoint и Client Allowed Address — как для телефона. ' +
          '4 — скопируйте текст конфига и вставьте его в окно приложения на ноутбуке, ' +
          'заменив заготовку. 5 — нажмите **Activate** (или Save).',
        sc: {
          marks: 1,
          cap: 'WireGuard → Peers: два устройства, у каждого свой ключ',
          path: 'WireGuard → Peers',
          win: 'WireGuard', tabs: ['WireGuard', 'Peers', 'Private Keys'], tab: 'Peers',
          cols: [{ t: 'Name', w: 70 }, { t: 'Interface', w: 74 }, { t: 'Allowed Address', w: 130 },
            { t: 'Rx', w: 80 }, { t: 'Tx', w: 80 }, { t: 'Last Handshake', w: 110 }],
          rows: [
            [{ v: 'phone', m: 1 }, { v: 'wg0' }, { v: '10.10.10.2/32' }, { v: '1.2 MiB' }, { v: '8.4 MiB' }, { v: '12s ago', c: 'ok' }],
            [{ v: 'pc', m: 2 }, { v: 'wg0' }, { v: '10.10.10.3/32' }, { v: '0 B' }, { v: '0 B' }, { v: 'never', c: 'no' }]
          ],
          sel: 1,
          rightTools: [{ t: 'Copy', i: '⧉', m: 3 }, { t: 'Find', i: '⌕' }],
          notes: [
            '1 — телефон: свой ключ и адрес',
            '2 — ноутбук: свой ключ и другой адрес',
            '3 — Copy: скопировать пир, если устройств много'
          ]
        }
      },
      {
        t: 'DNS и интернет для клиентов',
        d: 'Если в Client Allowed Address стоит `0.0.0.0/0`, телефон ходит в интернет через роутер. ' +
          'Тогда нужны две вещи. ' +
          '**DNS**: IP → DNS → Allow Remote Requests = **yes** (иначе телефон не получит имена, ' +
          'даже если пинги идут). ' +
          '**NAT**: в IP → Firewall → NAT должна быть строка `chain=srcnat action=masquerade` — ' +
          'обычно она уже есть от базовой настройки; если её нет, добавьте: ' +
          'Chain=srcnat, Out. Interface List=WAN, Action=masquerade. ' +
          'И одно правило forward: разрешить из `wg0` в LAN (и обратно) — иначе туннель поднимется, ' +
          'а до домашних устройств не достучится.',
        sc: {
          marks: 1,
          cap: 'IP → DNS: разрешаем клиентам спрашивать имена у роутера',
          path: 'IP → DNS',
          win: 'DNS', noTools: true,
          cols: [{ t: 'Name', w: 120 }, { t: 'Value', w: 300 }],
          rows: [
            [{ v: 'Servers' }, { v: '1.1.1.1, 8.8.8.8' }],
            [{ v: 'Dynamic Servers' }, { v: '203.0.113.1' }],
            [{ v: 'Allow Remote Requests', m: 1 }, { v: 'yes', c: 'ok', m: 2 }]
          ],
          sel: 2,
          notes: [
            '1 — строка Allow Remote Requests',
            '2 — значение yes: клиенты VPN могут пользоваться DNS роутера'
          ]
        }
      },
      {
        t: 'Проверка: поднялся ли туннель',
        d: '1 — на телефоне включите туннель и откройте приложение: должен появиться ' +
          '**Latest handshake** (пара секунд назад) и расти **Transfer**. ' +
          '2 — на роутере: WireGuard → Peers — у пира `phone` тоже обновится Last Handshake. ' +
          '3 — дальше проверьте связь: `ping 10.10.10.1`, затем `ping 192.168.88.1` и откройте ' +
          'веб-интерфейс роутера по адресу `192.168.88.1`. Если рукопожатие есть, а пингов нет — ' +
          'дело в firewall (правила forward) или в Allowed Address.',
        sc: {
          marks: 1,
          cap: 'WireGuard → Peers: рукопожатие и трафик',
          path: 'WireGuard → Peers',
          win: 'WireGuard', tabs: ['WireGuard', 'Peers', 'Private Keys'], tab: 'Peers',
          cols: [{ t: 'Name', w: 70 }, { t: 'Interface', w: 74 }, { t: 'Allowed Address', w: 120 },
            { t: 'Rx', w: 76 }, { t: 'Tx', w: 76 }, { t: 'Last Handshake', w: 120 }],
          rows: [[{ v: 'phone' }, { v: 'wg0' }, { v: '10.10.10.2/32' }, { v: '1.2 MiB', m: 2 }, { v: '8.4 MiB', m: 3 }, { v: '12s ago', c: 'ok', m: 1 }]],
          sel: 0,
          notes: [
            '1 — Last Handshake: «12s ago» — туннель живой',
            '2 — Rx: сколько пришло от телефона',
            '3 — Tx: сколько ушло на телефон'
          ]
        }
      }
    ],
    scenes: [],
    check: [
      {
        d: 'интерфейс, адрес и пиры',
        c: '/interface wireguard print\n/ip address print where interface~"wg"\n/interface wireguard peers print detail'
      },
      {
        d: 'открыт ли порт и живы ли рукопожатия',
        c: '/ip firewall filter print where dst-port=13231\n/interface wireguard peers print terse where last-handshake>0'
      },
      {
        d: 'служебный конфиг клиента (RouterOS 7.9+)',
        c: '/interface wireguard peers show-client-config [find name=phone]'
      }
    ],
    mistakes: [
      'Порт 13231 не открыт в цепочке input — телефон молчит, в логе пусто.',
      'Правило accept для UDP 13231 стоит ниже общего drop — оно никогда не срабатывает.',
      'Пиру задан Allowed Address = 0.0.0.0/0 — тогда роутер ждёт от клиента любые адреса и путается в маршрутах; клиенту нужен его /32.',
      'Нет DNS или NAT для клиентов: туннель есть, «интернета через роутер» нет.',
      'Один приватный ключ скопирован на несколько устройств — у каждого должен быть свой.',
      'Сервер поднимают за CGNAT (серый адрес) — снаружи порт недоступен, нужен публичный адрес или туннель к провайдеру.'
    ],
    next: ['wg-client-config', 'wg-site', 'task-wan-failover', 'vpn-wireguard']
  };

  /* ------------------------------------------------------- клиенты --- */
  const CLIENTS = {
    id: 'wg-client-config',
    t: 'WireGuard на телефоне и ПК: подключение за 5 минут',
    lvl: 1,
    path: 'Приложение WireGuard · QR-код · Client Config',
    tags: ['wireguard', 'клиент', 'телефон', 'windows', 'qr', 'vpn'],
    purpose: 'Вторая половина настройки: на роутере сервер уже есть, теперь подключаем устройства — ' +
      'телефон на Android/iOS и компьютер на Windows. Всё, что нужно, — приложение и конфиг ' +
      '(QR-код или текст), который роутер отдаёт сам.',
    usage: [
      'Телефон: подключение к домашней сети из любой точки.',
      'Ноутбук: рабочий доступ к офисной сети через чужой Wi-Fi.',
      'Планшет для камер и файлов — тот же конфиг, другой ключ.'
    ],
    steps: [
      {
        t: 'Установите приложение',
        d: '**Телефон**: Android — Google Play → «WireGuard» (официальное, разработчик WireGuard Development Team); ' +
          'iOS — App Store → «WireGuard». **Компьютер**: wireguard.com → Download → Windows. ' +
          'Ставьте именно официальное приложение: конфиг от роутера подходит только ему.',
        noScene: true
      },
      {
        t: 'Возьмите конфиг на роутере',
        d: '1 — на роутере откройте **WireGuard → Peers**. ' +
          '2 — дважды щёлкните по своему пиру (например `phone`). ' +
          '3 — нажмите кнопку **Show Client Config** — откроется окно Client Config ' +
          'с готовыми параметрами, текстом конфига и QR-кодом.',
        sc: {
          marks: 1,
          cap: 'WireGuard → Peers: открываем конфиг клиента',
          path: 'WireGuard → Peers', menu: { grp: 1 },
          win: 'WireGuard', tabs: ['WireGuard', 'Peers', 'Private Keys'], tab: 'Peers',
          tabMark: 'Peers', tabMarkN: 2,
          cols: [{ t: 'Name', w: 76 }, { t: 'Interface', w: 78 }, { t: 'Allowed Address', w: 130 },
            { t: 'Last Handshake', w: 120 }],
          rows: [[{ v: 'phone', m: 3 }, { v: 'wg0' }, { v: '10.10.10.2/32' }, { v: 'never' }]],
          sel: 0,
          notes: [
            '1 — группа WireGuard в дереве меню',
            '2 — вкладка Peers',
            '3 — двойной щелчок по строке своего пира'
          ]
        }
      },
      {
        t: 'Телефон: сканируйте QR-код',
        d: '1 — в приложении WireGuard нажмите **+** (внизу справа). ' +
          '2 — выберите «Сканировать QR-код» (Scan from QR code). ' +
          '3 — наведите камеру на QR-код из окна Client Config на экране компьютера. ' +
          '4 — приложение спросит имя туннеля — назовите, например, `home`. ' +
          '5 — переведите переключатель туннеля в положение «включён».',
        sc: {
          marks: 1,
          cap: 'Client Config: здесь QR-код для телефона',
          path: 'WireGuard → Peers → Client Config',
          win: 'WireGuard', noTools: true,
          cols: [{ t: 'Name', w: 76 }, { t: 'Interface', w: 78 }],
          rows: [[{ v: 'phone' }, { v: 'wg0' }]],
          sel: 0,
          form: {
            title: 'Client Config',
            fields: [
              { l: 'Client Address', v: '10.10.10.2/32', m: 1 },
              { l: 'Client DNS', v: '10.10.10.1', m: 2 },
              { l: 'Client Endpoint', v: '203.0.113.20:13231', m: 3 },
              { l: 'Config', v: '[Interface]\nAddress = 10.10.10.2/32\nDNS = 10.10.10.1\n\n[Peer]\nEndpoint = 203.0.113.20:13231\nAllowedIPs = 0.0.0.0/0', type: 'area', m: 4 }
            ],
            buttons: [{ t: 'Close' }]
          },
          notes: [
            '1 — адрес, который получит телефон',
            '2 — DNS, который будет использовать телефон',
            '3 — адрес сервера: публичный IP роутера и порт',
            '4 — текст конфига и QR-код: сканируйте его телефоном'
          ]
        }
      },
      {
        t: 'Компьютер: вставьте текст конфига',
        d: '1 — в приложении WireGuard на ПК нажмите **Add Tunnel** → «Add empty tunnel…». ' +
          '2 — приложение покажет ваш **Public key** — скопируйте его и добавьте пир на роутере ' +
          '(WireGuard → Peers → +, Allowed Address = `10.10.10.3/32`). ' +
          '3 — вернитесь в Client Config этого пира и скопируйте текст конфига целиком. ' +
          '4 — вставьте его в окно на ПК вместо заготовки (строку PrivateKey оставьте свою, ' +
          'её выдало приложение) и нажмите **Save**. ' +
          '5 — включите туннель кнопкой **Activate**.',
        noScene: true
      },
      {
        t: 'Проверка на устройстве',
        d: '1 — в приложении должно появиться **Latest handshake** (не «never») и счётчики ' +
          'приёма-передачи. 2 — откройте браузер и адрес `192.168.88.1` — откроется Winbox вашего ' +
          'роутера, значит вы «внутри» сети. 3 — если нужен весь интернет через VPN, проверьте ' +
          'адрес на сайте 2ip.ru: он должен совпадать с домашним.',
        noScene: true
      },
      {
        t: 'Если не работает',
        d: '**Handshake «never»** — не доходит UDP: проверьте публичный адрес и порт (Client Endpoint), ' +
          'правило accept udp 13231 в цепочке input, не блокирует ли UDP мобильный оператор или Wi-Fi. ' +
          '**Handshake есть, сайты не открываются** — Allowed Address на клиенте и NAT/DNS на роутере. ' +
          '**Открывается роутер, но не домашние устройства** — правила forward между `wg0` и LAN. ' +
          '**Туннель отваливается в мобильной сети** — включите Persistent Keepalive = 25s в пире.',
        noScene: true
      }
    ],
    scenes: [],
    check: [
      { d: 'рукопожатия и трафик по пирам', c: '/interface wireguard peers print detail' },
      { d: 'что видит роутер о клиенте', c: '/interface wireguard peers print where last-handshake>0\n/log print where topics~"wireguard"' }
    ],
    mistakes: [
      'В Client Endpoint указан локальный адрес (192.168.x.x) вместо публичного — снаружи он недоступен.',
      'Конфиг скопирован на два устройства: работать будет только одно, второе «выбьет» первое.',
      'AllowedIPs = 0.0.0.0/0 на клиенте, а NAT/DNS на роутере не настроены — «туннель есть, интернета нет».',
      'Забыли Persistent Keepalive — туннель засыпает в мобильной сети и не поднимается сам.'
    ],
    next: ['wg-server', 'wg-site', 'vpn-wireguard']
  };

  /* ------------------------------------------- MikroTik как клиент --- */
  const MTCLIENT = {
    id: 'wg-site',
    t: 'WireGuard: MikroTik как клиент (филиал к серверу офиса)',
    lvl: 3,
    path: 'WireGuard → WireGuard · WireGuard → Peers · IP → Address · IP → Routes · IP → Firewall',
    tags: ['wireguard', 'клиент', 'site-to-site', 'филиал', 'vpn'],
    purpose: 'Обратная задача: не к нам подключаются, а мы подключаемся к чужому (или своему) ' +
      'WireGuard-серверу. Так соединяют офис и филиал: обе сети видят друг друга, а наружу ' +
      'не открыт ни один порт со стороны филиала — он сам инициирует туннель.',
    usage: [
      'Филиал с «серым» адресом подключается к серверу в офисе с белым адресом.',
      'Резервный путь к офисной сети через LTE-модем.',
      'Подключение к чужому VPN-серверу (хостинг, партнёр) по выданным ключам.'
    ],
    pros: [
      'Со стороны филиала не нужен публичный адрес и проброс портов.',
      'Туннель поднимается сам и держится за счёт keepalive.',
      'Один и тот же WireGuard: и в роли сервера, и в роли клиента.'
    ],
    cons: [
      'Нужны ключи и адрес сервера от его владельца.',
      'Маршруты надо прописать руками — автоматически сети не появятся.',
      'Сервер должен разрешать forward между пирами, иначе сети не увидят друг друга.'
    ],
    warn: 'Allowed Address на клиенте — это не «что мне разрешено», а «какие адреса живут за ' +
      'этим пиром». Для всей сети офиса это `192.168.10.0/24`, а не `0.0.0.0/0`, иначе весь ' +
      'интернет поедет в туннель (а если сервер этого не ждёт — просто пропадёт).',
    steps: [
      {
        t: 'Запросите у сервера четыре вещи',
        d: 'Без них не начать: **публичный ключ сервера**, **адрес и порт сервера** (например ' +
          '`203.0.113.20:13231`), **какие подсети живут за сервером** (например `192.168.10.0/24`) ' +
          'и **какой адрес в туннеле** выдан вашему роутеру (например `10.10.10.5/32`). ' +
          'Взамен вы отдаёте свой публичный ключ — он появится, как только создадите интерфейс.',
        noScene: true
      },
      {
        t: 'Создайте интерфейс на своём роутере',
        d: '1 — в дереве откройте **WireGuard**, 2 — пункт **WireGuard**, 3 — нажмите **+**. ' +
          '4 — Name = `wg-office`. 5 — Listen Port можно оставить пустым: клиенту не нужен входящий порт. ' +
          '6 — OK. 7 — скопируйте **Public Key** этой строки и передайте владельцу сервера: ' +
          'без него вас не пустят.',
        sc: {
          marks: 1,
          cap: 'WireGuard → WireGuard: наш интерфейс-клиент',
          path: 'WireGuard → WireGuard', menu: { grp: 1, sub: 2 },
          win: 'WireGuard', tabs: ['WireGuard', 'Peers', 'Private Keys'], tab: 'WireGuard',
          cols: [{ t: 'Name', w: 90 }, { t: 'Listen Port', w: 90 }, { t: 'Public Key', w: 290 }, { t: 'MTU', w: 60 }],
          rows: [[{ v: 'wg-office' }, { v: '' }, { v: 'Hk4mPz…7RqU=', m: 7 }, { v: '1420' }]],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 3 }],
          form: {
            title: 'New WireGuard',
            fields: [
              { l: 'Name', v: 'wg-office', m: 4 },
              { l: 'Listen Port', v: '', m: 5 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 6 }]
          },
          notes: [
            '1 — группа WireGuard',
            '2 — пункт WireGuard',
            '3 — «+»: новый интерфейс',
            '4 — Name: wg-office',
            '5 — Listen Port можно не заполнять (мы клиент)',
            '6 — OK',
            '7 — Public Key этого интерфейса отдаём серверу'
          ]
        }
      },
      {
        t: 'Добавьте пир — это сервер',
        d: 'Для клиента «пир» — это сервер, к которому мы подключаемся. ' +
          '1 — вкладка **Peers**, 2 — нажмите **+**. ' +
          '3 — Interface = `wg-office`. ' +
          '4 — Public Key = ключ сервера (его дал владелец). ' +
          '5 — Endpoint = `203.0.113.20:13231` — адрес и порт сервера. ' +
          '6 — Allowed Address = `10.10.10.0/24, 192.168.10.0/24` — туннельная сеть и сеть за сервером. ' +
          '7 — Persistent Keepalive = `25s`: без него туннель засыпает за NAT. ' +
          '8 — OK. Через пару секунд в строке появится Last Handshake.',
        sc: {
          marks: 1,
          cap: 'WireGuard → Peers: сервер как пир',
          path: 'WireGuard → Peers',
          win: 'WireGuard', tabs: ['WireGuard', 'Peers', 'Private Keys'], tab: 'Peers',
          tabMark: 'Peers', tabMarkN: 1,
          cols: [{ t: 'Name', w: 84 }, { t: 'Interface', w: 92 }, { t: 'Public Key', w: 150 },
            { t: 'Endpoint', w: 150 }, { t: 'Allowed Address', w: 160 }, { t: 'Last Handshake', w: 110 }],
          rows: [[{ v: 'office' }, { v: 'wg-office' }, { v: PUB }, { v: '203.0.113.20:13231' }, { v: '10.10.10.0/24, 192.168.10.0/24' }, { v: '8s ago', c: 'ok' }]],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 2 }],
          form: {
            title: 'New WireGuard Peer',
            fields: [
              { l: 'Interface', v: 'wg-office', type: 'select', m: 3 },
              { l: 'Public Key', v: PUB, m: 4 },
              { l: 'Endpoint', v: '203.0.113.20:13231', type: 'plus', m: 5 },
              { l: 'Allowed Address', v: '10.10.10.0/24, 192.168.10.0/24', type: 'multi', m: 6 },
              { l: 'Persistent Keepalive', v: '25s', type: 'plus', m: 7 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 8 }]
          },
          notes: [
            '1 — вкладка Peers',
            '2 — «+»: новый пир',
            '3 — Interface: наш интерфейс-клиент',
            '4 — Public Key: ключ сервера',
            '5 — Endpoint: адрес и порт сервера',
            '6 — Allowed Address: туннель и сеть за сервером',
            '7 — Persistent Keepalive: 25s',
            '8 — OK'
          ]
        }
      },
      {
        t: 'Адрес в туннеле',
        d: '1 — откройте **IP → Address**, нажмите **+**. ' +
          '2 — Address = `10.10.10.5/32` — тот, что выдал сервер. ' +
          '3 — Interface = `wg-office`. ' +
          '4 — OK. Маска `/32` — это нормально: у клиента WireGuard обычно один адрес.',
        sc: {
          marks: 1,
          cap: 'IP → Address: адрес клиента в туннеле',
          path: 'IP → Address',
          win: 'Address',
          cols: [{ t: 'Address', w: 150 }, { t: 'Network', w: 140 }, { t: 'Interface', w: 130 }, { t: 'Comment', w: 160 }],
          rows: [[{ v: '10.10.10.5/32' }, { v: '10.10.10.5' }, { v: 'wg-office' }, 'туннель в офис']],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 1 }],
          form: {
            title: 'New Address',
            fields: [
              { l: 'Address', v: '10.10.10.5/32', m: 2 },
              { l: 'Interface', v: 'wg-office', type: 'select', m: 3 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 4 }]
          },
          notes: [
            '1 — «+»: новый адрес',
            '2 — Address: 10.10.10.5/32',
            '3 — Interface: wg-office',
            '4 — OK'
          ]
        }
      },
      {
        t: 'Маршрут в сеть офиса',
        d: 'Пир уже знает про `192.168.10.0/24`, но маршрут всё равно нужен явно — ' +
          'так надёжнее и понятнее. 1 — откройте **IP → Routes**, нажмите **+**. ' +
          '2 — Dst. Address = `192.168.10.0/24`. ' +
          '3 — Gateway = `wg-office`. ' +
          '4 — Distance = 1 (для резервного пути ставят больше). ' +
          '5 — OK. Проверка: в списке маршрутов появится строка с флагом A.',
        sc: {
          marks: 1,
          cap: 'IP → Routes: маршрут в сеть офиса через туннель',
          path: 'IP → Routes',
          win: 'Route List', tabs: ['Routes', 'Nexthops'], tab: 'Routes',
          cols: [{ t: 'A', w: 24 }, { t: 'Dst. Address', w: 130 }, { t: 'Gateway', w: 130 },
            { t: 'Distance', w: 76 }, { t: 'Comment', w: 180 }],
          rows: [
            [{ v: 'AS', c: 'ok' }, { v: '192.168.10.0/24' }, { v: 'wg-office' }, { v: '1' }, 'сеть офиса'],
            [{ v: 'AS', c: 'ok' }, { v: '0.0.0.0/0' }, { v: '203.0.113.1' }, { v: '1' }, 'интернет']
          ],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 1 }],
          form: {
            title: 'New Route',
            fields: [
              { l: 'Dst. Address', v: '192.168.10.0/24', m: 2 },
              { l: 'Gateway', v: 'wg-office', m: 3 },
              { l: 'Distance', v: '1', m: 4 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 5 }]
          },
          notes: [
            '1 — «+»: новый маршрут',
            '2 — Dst. Address: сеть офиса',
            '3 — Gateway: имя туннельного интерфейса',
            '4 — Distance: 1',
            '5 — OK'
          ]
        }
      },
      {
        t: 'Firewall: разрешите туннель',
        d: 'Туннель поднимется и без этого, но данные внутрь не пойдут. ' +
          '1 — IP → Firewall → **Filter Rules** → **+**. ' +
          '2 — Chain = **forward**. ' +
          '3 — In. Interface = `wg-office`. ' +
          '4 — вкладка **Action**: Action = **accept**. ' +
          '5 — OK. Второе такое же правило сделайте для Out. Interface = `wg-office`, ' +
          'чтобы ответы тоже проходили. Порядок важен: разрешения — выше запретов.',
        sc: {
          marks: 1,
          cap: 'Filter Rules: пропускаем трафик из туннеля',
          path: 'IP → Firewall → Filter Rules',
          win: 'IP Firewall',
          tabs: ['Filter Rules', 'NAT', 'Mangle', 'RAW', 'Service Ports', 'Connections', 'Address Lists', 'Layer7'],
          tab: 'Filter Rules',
          cols: [{ t: '#', w: 26 }, { t: 'Chain', w: 72 }, { t: 'In. Interface', w: 130 },
            { t: 'Out. Interface', w: 130 }, { t: 'Action', w: 90 }, { t: 'Comment', w: 150 }],
          rows: [
            [{ v: '0' }, { v: 'forward' }, { v: 'wg-office' }, { v: '' }, { v: 'accept', c: 'ok' }, 'from office tunnel'],
            [{ v: '1' }, { v: 'forward' }, { v: '' }, { v: 'wg-office' }, { v: 'accept', c: 'ok' }, 'to office tunnel']
          ],
          sel: 0,
          tools: [{ t: '+', id: 'add', m: 1 }],
          form: {
            title: 'New Filter Rule', tab: 'General', tabMark: 'Action', tabMarkN: 4,
            fields: [
              { l: 'Chain', v: 'forward', type: 'select', t: 'General', m: 2 },
              { l: 'In. Interface', v: 'wg-office', type: 'select', t: 'General', m: 3 }
            ],
            buttons: [{ t: 'Cancel' }, { t: 'Apply' }, { t: 'OK', m: 5 }]
          },
          notes: [
            '1 — «+»: новое правило',
            '2 — Chain = forward',
            '3 — In. Interface = wg-office',
            '4 — вкладка Action: Action = accept',
            '5 — OK и повторить для Out. Interface'
          ]
        }
      },
      {
        t: 'Отдайте серверу свой ключ',
        d: 'На стороне сервера ваш роутер должен стать пиром, иначе он не пустит ваш ключ. ' +
          'Владельцу сервера нужно передать: 1 — ваш **Public Key** (WireGuard → WireGuard), ' +
          '2 — ваш адрес в туннеле `10.10.10.5/32` (Allowed Address на сервере), ' +
          '3 — вашу локальную подсеть `192.168.88.0/24`, если офис должен видеть ваш филиал ' +
          '(это тоже Allowed Address, но уже на стороне сервера). ' +
          'Если сервер ваш — сделайте это сами: Peers → + и заполните поля, как в статье ' +
          '«WireGuard: MikroTik как сервер».',
        sc: {
          marks: 1,
          cap: 'WireGuard → WireGuard: отсюда берём свой публичный ключ',
          path: 'WireGuard → WireGuard',
          win: 'WireGuard', tabs: ['WireGuard', 'Peers', 'Private Keys'], tab: 'WireGuard',
          cols: [{ t: 'Name', w: 96 }, { t: 'Listen Port', w: 90 }, { t: 'Public Key', w: 300 }, { t: 'MTU', w: 60 }],
          rows: [[{ v: 'wg-office' }, { v: '' }, { v: 'Hk4mPz…7RqU=', m: 1 }, { v: '1420' }]],
          sel: 0,
          notes: [
            '1 — Public Key: его передают владельцу сервера'
          ]
        }
      },
      {
        t: 'Проверка туннеля и сети',
        d: '1 — WireGuard → Peers: у пира `office` обновляется **Last Handshake**, растут Rx/Tx. ' +
          '2 — `ping 10.10.10.1` (адрес сервера в туннеле) — отвечает. ' +
          '3 — `ping 192.168.10.1` (роутер офиса) — отвечает, значит маршрут и forward в порядке. ' +
          '4 — если первый пинг идёт, а второй нет — смотрите маршруты и firewall на стороне сервера: ' +
          'он тоже должен разрешать forward между пирами и знать вашу подсеть.',
        sc: {
          marks: 1,
          cap: 'WireGuard → Peers: рукопожатие с сервером',
          path: 'WireGuard → Peers',
          win: 'WireGuard', tabs: ['WireGuard', 'Peers', 'Private Keys'], tab: 'Peers',
          cols: [{ t: 'Interface', w: 96 }, { t: 'Endpoint', w: 150 }, { t: 'Rx', w: 80 },
            { t: 'Tx', w: 80 }, { t: 'Last Handshake', w: 120 }],
          rows: [[{ v: 'wg-office' }, { v: '203.0.113.20:13231' }, { v: '4.1 MiB', m: 2 }, { v: '1.7 MiB', m: 3 }, { v: '8s ago', c: 'ok', m: 1 }]],
          sel: 0,
          notes: [
            '1 — Last Handshake: туннель на связи',
            '2 — Rx: сколько пришло из офиса',
            '3 — Tx: сколько ушло в офис'
          ]
        }
      }
    ],
    scenes: [],
    check: [
      {
        d: 'интерфейс, пир и маршрут',
        c: '/interface wireguard print\n/interface wireguard peers print detail\n/ip route print where gateway~"wg"'
      },
      {
        d: 'связность через туннель',
        c: '/ping 10.10.10.1 count=4\n/ping 192.168.10.1 count=4\n/tool traceroute 192.168.10.1'
      }
    ],
    mistakes: [
      'Allowed Address на клиенте = 0.0.0.0/0 — весь интернет ушёл в туннель, и связь пропала.',
      'Забыт Persistent Keepalive — за NAT туннель засыпает и не поднимается сам.',
      'Не добавлен маршрут в сеть офиса — туннель есть, а до сети не дойти.',
      'Нет правил forward для wg-office — пакеты молча отбрасываются.',
      'Свой публичный ключ не передан на сервер — сервер не отвечает на рукопожатие.',
      'Одинаковый адрес в туннеле у двух клиентов — соединения «перекидываются» между ними.'
    ],
    next: ['wg-server', 'wg-client-config', 'task-wan-failover', 'vpn-tunnels']
  };

  /* --- собираем раздел: забираем статьи из старых групп --- */
  const failover = findArticle('task-wan-failover');
  const wgInterface = findArticle('wg-interface');
  const wgPeers = findArticle('wg-peers');
  const wgTrouble = findArticle('wg-troubleshoot');
  const l2tp = findArticle('ppp-l2tp-server');
  const ovpn = findArticle('ppp-ovpn-server');

  /* наши три статьи заменяют старые версии с теми же id */
  const replaced = [SERVER, CLIENTS, MTCLIENT].map(function (a) { return a.id; });
  window.DATA.forEach(function (g) {
    if (!g || !g.items) return;
    g.items = g.items.filter(function (x) {
      if (!x) return false;
      if (x === failover || x === wgInterface || x === wgPeers || x === wgTrouble) return false;
      if (x === l2tp || x === ovpn) return false;
      return replaced.indexOf(x.id) < 0;
    });
  });

  const group = { id: 'netvpn', name: 'Резервный интернет и VPN', ic: 'svc', items: [] };
  group.items.push(START);
  if (failover) group.items.push(failover);
  group.items.push(SERVER, CLIENTS, MTCLIENT);
  [l2tp, ovpn].forEach(function (a) { if (a) group.items.push(a); });
  [wgInterface, wgPeers, wgTrouble].forEach(function (a) { if (a) group.items.push(a); });

  /* пустая группа WireGuard больше не нужна: всё переехало в раздел.
     Правим массив на месте — другие файлы держат ссылку на window.DATA. */
  for (let i = window.DATA.length - 1; i >= 0; i--) {
    const g = window.DATA[i];
    if (g && g.id === 'wg' && !(g.items || []).length) window.DATA.splice(i, 1);
  }

  /* раздел первым: его видно сразу на главной странице и в дереве меню */
  window.DATA.unshift(group);
})();
