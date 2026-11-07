#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   win4-import.js — переносит настоящие снимки Winbox 4 из CI в приложение.

   Что делает:
     1) берёт docs/shots/jpg/*.jpg (их снимает workflow winbox-shots.yml на живом
        RouterOS CHR + Winbox 4) и кладёт в app/src/main/assets/www/img/shots/;
     2) генерирует js/data/win4.js — галерею «Окна Winbox 4»;
     3) генерирует js/data/photos.js — привязку снимков к шагам статей по пути
        меню: если шаг показывает окно «IP → Firewall → Filter Rules», а такой
        снимок есть, шаг показывает живой кадр вместо схемы;
     4) печатает сводку: сколько снимков, к скольким статьям привязано.

   Запуск: node scripts/win4-import.js [--dry]
   --------------------------------------------------------------------------- */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'app/src/main/assets/www');
const SRC = path.join(ROOT, 'docs/shots/jpg');
const DST = path.join(WWW, 'img/shots');
const DATA = path.join(WWW, 'js/data');
const dry = process.argv.includes('--dry');

/* Каталог снимков: имя файла → окно, путь меню и что в нём видно.
   Имя файла совпадает с именем из .github/scripts/shot-list.txt. */
const CATALOG = [
  { f: 'login', t: 'Вход: Connect to и Neighbors', g: 'Вход', path: 'Winbox 4',
    d: 'Стартовое окно Winbox 4: поле Connect to, кнопка Connect, вкладки Saved / Neighbors / RoMON Neighbors. ' +
      'Если адрес потерян — роутер выбирают в Neighbors двойным щелчком по MAC.' },
  { f: 'desktop', t: 'Рабочий стол после входа', g: 'Вход', path: 'Winbox 4',
    d: 'Слева дерево меню Winbox 4, сверху рабочие области и поиск, снизу состояние подключения и версия RouterOS.' },
  { f: 'quickset', t: 'Quick Set', g: 'Быстрый старт', path: 'Quick Set',
    d: 'Быстрая настройка: режим (Router/Bridge), получение адреса (Static, Automatic, PPPoE), адрес, шлюз, DNS и Wi-Fi.' },
  { f: 'wifi', t: 'WiFi', g: 'Wi-Fi', path: 'WiFi',
    d: 'Точки доступа и клиенты: SSID, канал, ширина, безопасность. Вкладки Security, Access List, Registration, CAPsMAN.' },
  { f: 'interfaces', t: 'Interfaces', g: 'Интерфейсы', path: 'Interfaces',
    d: 'Все интерфейсы в одном окне: ether-порты, мосты, VLAN, туннели. Вкладки Interface List, Ethernet, VLAN, Bonding, LTE.' },
  { f: 'wireguard', t: 'Interfaces → WireGuard', g: 'Интерфейсы', path: 'Interfaces → WireGuard',
    d: 'WireGuard-интерфейсы и пиры: Listen Port, публичный ключ, Allowed Address и Endpoint.' },
  { f: 'bridge', t: 'Bridge', g: 'Интерфейсы', path: 'Bridge',
    d: 'Мосты: вкладки Bridge, Ports, VLANs, Hosts, Filters, NAT. Здесь включают vlan-filtering и добавляют порты.' },
  { f: 'bridge-new', t: 'Bridge → New', g: 'Интерфейсы', path: 'Bridge',
    d: 'Диалог создания моста: General, STP, VLAN, IGMP, MLAG, Status, Traffic. Enabled, имя, MTU, ARP, Ageing Time.' },
  { f: 'ppp', t: 'PPP', g: 'PPP', path: 'PPP',
    d: 'PPP: интерфейсы, Secrets, Profiles, PPPoE Server, L2TP Server, OVPN Server, Active Connections.' },
  { f: 'switch', t: 'Switch', g: 'Коммутатор', path: 'Switch',
    d: 'Аппаратная коммутация: вкладки Switch, Ports, VLANs, Rules — трафик между портами идёт мимо CPU.' },
  { f: 'mesh', t: 'Mesh', g: 'Прочее', path: 'Mesh',
    d: 'Mesh-сети MikroTik: список mesh-интерфейсов и соседей, если используется динамическая маршрутизация по Wi-Fi.' },
  { f: 'ip', t: 'IP', g: 'IP', path: 'IP',
    d: 'Раздел IP целиком: Address, ARP, Cloud, DHCP Client/Server, DNS, Firewall, Pool, Routes, Services и остальное.' },
  { f: 'ipv6', t: 'IPv6', g: 'IPv6', path: 'IPv6',
    d: 'IPv6: Address, DHCP Client/Server, ND, Firewall, Routes — то же, что в IP, но для IPv6.' },
  { f: 'mpls', t: 'MPLS', g: 'Прочее', path: 'MPLS',
    d: 'MPLS: MPLS, Forwarding, LDP, Traffic Eng. Включают на всех узлах, если нужны метки и VPLS.' },
  { f: 'routing', t: 'Routing', g: 'Маршрутизация', path: 'Routing',
    d: 'Routing: Table, Rules, Nexthops, Filters, BGP, OSPF, RIP, Prefix Lists, BFD.' },
  { f: 'system', t: 'System', g: 'Система', path: 'System',
    d: 'System: Identity, Clock, NTP Client, Users, Certificates, Files, Logging, Packages, RouterBOOT, Scheduler, Scripts, Backup, Resources, Health, Watchdog, Note.' },
  { f: 'queues', t: 'Queues', g: 'Очереди', path: 'Queues',
    d: 'Очереди: Simple Queues, Queue Tree, Queue Types, Interface Queues — лимиты и приоритеты трафика.' },
  { f: 'dot1x', t: 'Dot1X', g: 'Прочее', path: 'Dot1X',
    d: '802.1X: серверные и клиентские настройки, RADIUS и списки доступа по портам.' },
  { f: 'files', t: 'Files', g: 'Система', path: 'Files',
    d: 'Files: резервные копии, экспорт конфигурации, сертификаты и прошивки. Здесь лежат .backup и .rsc.' },
  { f: 'log', t: 'Log', g: 'Система', path: 'Log',
    d: 'Log: сообщения роутера с топиками и временем. Отсюда видно причину перезагрузки и ошибки PPP.' },
  { f: 'terminal', t: 'New Terminal', g: 'Система', path: 'New Terminal',
    d: 'New Terminal: консоль RouterOS внутри Winbox — сюда вставляют готовые конфиги из приложения.' },
  { f: 'radius', t: 'RADIUS', g: 'Прочее', path: 'RADIUS',
    d: 'RADIUS: серверы аутентификации, секрет и таймауты — нужен для PPP AAA и корпоративного Wi-Fi.' },
  { f: 'tools', t: 'Tools', g: 'Инструменты', path: 'Tools',
    d: 'Tools: Ping, Traceroute, Torch, Profiler, Sniffer, Netwatch, Graphing, Bandwidth Test, Fetch, Email.' },
];

function norm(p) {
  return String(p || '').replace(/\s*→\s*/g, ' → ').replace(/\s+/g, ' ').trim();
}

function loadData() {
  global.window = {};
  const html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
  const re = /<script\s+src="js\/data\/([^"]+)"/g;
  let m;
  const files = [];
  while ((m = re.exec(html)) !== null) files.push(m[1]);
  files.forEach(f => require(path.join(DATA, f)));
  return global.window;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Нет ' + SRC + ' — сначала запустите workflow «Winbox 4 — настоящие скриншоты окон».');
    process.exit(2);
  }
  const have = fs.readdirSync(SRC).filter(f => /\.jpg$/i.test(f)).map(f => f.replace(/\.jpg$/i, ''));
  const known = new Set(CATALOG.map(c => c.f));
  const shots = CATALOG.filter(c => have.indexOf(c.f) >= 0);
  const extra = have.filter(f => !known.has(f));

  console.log('Снимков в CI: ' + have.length + ', описано в каталоге: ' + shots.length);
  if (extra.length) console.log('Без описания (пропущены): ' + extra.join(', '));

  /* 1) файлы */
  if (!dry) {
    fs.mkdirSync(DST, { recursive: true });
    shots.forEach(c => {
      fs.copyFileSync(path.join(SRC, c.f + '.jpg'), path.join(DST, c.f + '.jpg'));
    });
  }

  /* 2) галерея */
  const win4 = '/* Настоящие снимки окон Winbox 4.\n' +
    '   Сделаны автоматически в GitHub Actions: CHR RouterOS в QEMU + Winbox 4 под Xvfb.\n' +
    '   Ничего не дорисовано — это окна живой программы.\n' +
    '   Файл создаёт scripts/win4-import.js, руками не править.\n\n' +
    '   Поля: f — файл, t — заголовок окна, g — группа, d — что видно и зачем. */\n' +
    'window.WIN4_SHOTS = [\n' + shots.map(c =>
      '  {\n' +
      "    f: " + JSON.stringify(c.f + '.jpg') + ', t: ' + JSON.stringify(c.t) + ', g: ' + JSON.stringify(c.g) + ',\n' +
      "    d: " + JSON.stringify(c.d) + '\n  }'
    ).join(',\n') + '\n];\n';

  /* 3) привязка к шагам и статьям по пути меню */
  const win = loadData();
  const byPath = new Map();
  shots.forEach(c => { if (byPath.has(norm(c.path))) byPath.set(norm(c.path) + '#' + c.f, c.f); else byPath.set(norm(c.path), c.f); });

  const mapping = {};
  let stepsMapped = 0, artsMapped = 0;
  (win.DATA || []).forEach(g => (g.items || []).forEach(a => {
    const m = {};
    const assign = (i, sc) => {
      if (!sc || !sc.path) return;
      const f = byPath.get(norm(sc.path));
      if (f && !m[i]) m[i] = f + '.jpg';
    };
    (a.steps || []).forEach((st, i) => { if (st && typeof st === 'object') assign(i, st.sc); });
    if (!Object.keys(m).length && a.scenes && a.scenes.length) {
      // своей сцены у шага нет — берём первое окно статьи
      assign(0, a.scenes[0]);
    }
    if (Object.keys(m).length) { mapping[a.id] = m; artsMapped++; stepsMapped += Object.keys(m).length; }
  }));

  const photos = '/* Настоящие снимки Winbox 4, привязанные к шагам статей.\n' +
    '   Ключ — id статьи, значение — { «номер шага с нуля»: «файл в img/shots» }.\n' +
    '   Такой шаг показывает живое окно Winbox 4, снятое в CI на настоящем RouterOS,\n' +
    '   а не векторную схему. Остальные шаги подписаны «Схема окна Winbox 4».\n' +
    '   Файл создаёт scripts/win4-import.js, руками не править. */\n' +
    'window.SHOT_STEPS = ' + JSON.stringify(mapping, null, 2).replace(/"(\d+)":/g, '"$1":') + ';\n';

  if (!dry) {
    fs.writeFileSync(path.join(DATA, 'win4.js'), win4, 'utf8');
    fs.writeFileSync(path.join(DATA, 'photos.js'), photos, 'utf8');
  }

  console.log('Галерея: ' + shots.length + ' снимков');
  console.log('Привязано к статьям: ' + artsMapped + ', шагов с живым кадром: ' + stepsMapped);
  if (!shots.length) { console.error('Ни одного снимка из каталога — нечего импортировать'); process.exit(1); }
}

main();
