#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   win4-import.js — переносит настоящие снимки Winbox 4 из CI в приложение.

   Что делает:
     1) берёт docs/shots/jpg/<имя>.jpg (их снимает workflow winbox-shots.yml
        на живом RouterOS CHR 7.24.6 в QEMU + Winbox 4.4 под Xvfb) и кладёт
        в app/src/main/assets/www/img/shots/;
     2) собирает js/data/win4.js — галерею «Окна Winbox 4» (файл, заголовок,
        группа, что видно);
     3) собирает js/data/photos.js — привязку снимков к статьям: если шаг
        статьи показывает окно «IP → Firewall → Filter Rules», а такой кадр
        есть, шаг показывает живое окно вместо схемы;
     4) печатает сводку: сколько кадров, сколько статей получили снимок.

   Путь меню и путь в приложении берутся из .github/scripts/shot-list.txt,
   подписи — из scripts/win4-titles.js.

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

const titles = require('./win4-titles.js');
const GROUPS = ['Вход', 'Быстрый старт', 'Wi-Fi', 'Интерфейсы', 'WireGuard', 'Мост',
  'PPP', 'IP', 'IPv6', 'MPLS', 'Маршрутизация', 'Система', 'Очереди', 'Прочее', 'Инструменты'];

function norm(p) {
  return String(p || '').replace(/\s*→\s*/g, ' → ').replace(/\s+/g, ' ').trim();
}

function shotList() {
  const file = path.join(ROOT, '.github/scripts/shot-list.txt');
  const rows = [];
  fs.readFileSync(file, 'utf8').split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const f = line.split('|');
    rows.push({
      name: f[0].trim(),
      menu: norm(f[1] || ''),
      isNew: (f[2] || '').trim().toLowerCase() === 'new',
      appPath: norm(f[3] || f[1] || ''),
    });
  });
  return rows;
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
  const have = new Set(fs.readdirSync(SRC).filter(f => /\.jpg$/i.test(f)).map(f => f.replace(/\.jpg$/i, '')));
  const list = shotList();
  const shots = [];
  const noTitle = [];

  // Вход и рабочий стол снимает скрипт съёмки, они не в списке меню.
  // В CI файлы называются 00-login.jpg и 03-desktop.jpg.
  [['login', ['login', '00-login']], ['desktop', ['desktop', '03-desktop']]].forEach(pair => {
    const n = pair[0];
    const src = pair[1].find(x => have.has(x));
    if (src && titles[n]) {
      shots.push({ src: src + '.jpg', f: n + '.jpg',
        t: titles[n][0], g: titles[n][1], d: titles[n][2], appPath: 'Winbox 4' });
    }
  });

  list.forEach(row => {
    if (!have.has(row.name)) return;
    const t = titles[row.name];
    if (!t) { noTitle.push(row.name); return; }
    shots.push({ f: row.name + '.jpg', t: t[0], g: t[1], d: t[2], appPath: row.appPath });
  });

  // порядок: как в GROUPS, внутри группы — как в списке съёмки
  shots.sort((a, b) => {
    const ga = GROUPS.indexOf(a.g), gb = GROUPS.indexOf(b.g);
    return ga === gb ? 0 : ga - gb;
  });

  const used = new Set(shots.map(s => s.src || s.f));
  const unknown = [...have].filter(n => !used.has(n + '.jpg'));

  console.log('Снимков в CI: ' + have.size + ', вошло в приложение: ' + shots.length);
  if (noTitle.length) console.log('Без подписи (пропущены): ' + noTitle.join(', '));
  if (unknown.length) console.log('Вне списка: ' + unknown.join(', '));
  if (!shots.length) { console.error('Нечего импортировать'); process.exit(1); }

  if (!dry) {
    fs.mkdirSync(DST, { recursive: true });
    shots.forEach(s => fs.copyFileSync(path.join(SRC, s.src || s.f), path.join(DST, s.f)));
  }

  /* 1) галерея */
  const win4 = '/* Настоящие снимки окон Winbox 4.\n' +
    '   Сделаны автоматически в GitHub Actions: CHR RouterOS 7.24.6 в QEMU +\n' +
    '   Winbox 4.4 под Xvfb. Ничего не дорисовано — это окна живой программы.\n' +
    '   Файлы лежат в img/shots/ (JPEG, ширина 900 px), всего ' + shots.length + '.\n\n' +
    '   Поля: f — файл, t — заголовок окна, g — группа, d — что видно и зачем.\n' +
    '   Файл создаёт scripts/win4-import.js, руками не править. */\n' +
    'window.WIN4_SHOTS = [\n' + shots.map(s =>
      '  {\n' +
      '    f: ' + JSON.stringify(s.f) + ', t: ' + JSON.stringify(s.t) + ', g: ' + JSON.stringify(s.g) + ',\n' +
      '    d: ' + JSON.stringify(s.d) + '\n  }'
    ).join(',\n') + '\n];\n';

  /* 2) привязка «шаг статьи → кадр» по пути окна */
  const win = loadData();
  const byPath = new Map();
  shots.forEach(s => {
    const k = norm(s.appPath);
    if (k && !byPath.has(k)) byPath.set(k, s.f);
  });

  const mapping = {};
  let arts = [], steps = 0;
  (win.DATA || []).forEach(g => (g.items || []).forEach(a => {
    const m = {};
    const take = (i, p) => {
      const f = byPath.get(norm(p));
      if (f && m[i] === undefined) m[i] = f;
    };
    // сцены статьи задают путь окна для каждого шага
    if (Array.isArray(a.scenes)) a.scenes.forEach((sc, i) => sc && take(i, sc.path));
    // если окон больше, чем шагов, добиваем шаги сценами по порядку
    (a.steps || []).forEach((st, i) => {
      if (m[i] === undefined && a.scenes && a.scenes.length) take(i, (a.scenes[i] || a.scenes[0] || {}).path);
    });
    if (Object.keys(m).length) {
      mapping[a.id] = m;
      arts.push(a.id);
      steps += Object.keys(m).length;
    }
  }));

  const photos = '/* Настоящие снимки Winbox 4, привязанные к шагам статей.\n' +
    '   Ключ — id статьи, значение — { «номер шага с нуля»: «файл в img/shots» }.\n' +
    '   Такой шаг показывает живое окно Winbox 4, снятое в CI на настоящем\n' +
    '   RouterOS 7.24.6, а не векторную схему. Остальные шаги подписаны\n' +
    '   «Схема окна Winbox 4». Файл создаёт scripts/win4-import.js. */\n' +
    'window.SHOT_STEPS = ' + JSON.stringify(mapping, null, 2) + ';\n';

  if (!dry) {
    fs.writeFileSync(path.join(DATA, 'win4.js'), win4, 'utf8');
    fs.writeFileSync(path.join(DATA, 'photos.js'), photos, 'utf8');
  }

  console.log('Галерея: ' + shots.length + ' снимков, групп: ' +
    new Set(shots.map(s => s.g)).size);
  console.log('Статей с живым кадром: ' + arts.length + ', шагов со снимком: ' + steps);
}

main();
