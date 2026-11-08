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
  // Путь окна в статьях иногда перечисляет несколько вариантов через «·»:
  // «WireGuard → WireGuard · IP → Address». Для привязки берём первый.
  return String(p || '').split('·')[0]
    .replace(/\s*→\s*/g, ' → ').replace(/\s+/g, ' ').trim();
}

/* Кадры, которым не нашлось статьи: Quick Set показываем в статье о первом
   входе (это первое окно после подключения), Mesh не показываем вовсе —
   статей про mesh в учебнике нет, а «прицепить» его некуда. */
const FORCE_ARTICLE = { quickset: 'start-first-login' };
const SKIP = new Set(['mesh']);

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
  const jpgs = dir => (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
    .filter(f => /\.jpg$/i.test(f)).map(f => f.replace(/\.jpg$/i, ''));
  // кадры, снятые в этом прогоне, плюс уже лежащие в приложении
  const have = new Set([...jpgs(SRC), ...jpgs(DST)]);
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
    if (!have.has(row.name) || SKIP.has(row.name)) return;
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
    shots.forEach(s => {
      const from = path.join(SRC, s.src || s.f);
      if (fs.existsSync(from)) fs.copyFileSync(from, path.join(DST, s.f));
    });
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
  const articles = [];
  (win.DATA || []).forEach(g => (g.items || []).forEach(a => {
    // Путь окна шага лежит и в a.scenes (старый формат), и прямо в шаге
    // (s.sc.path — так записано большинство статей). Важно, чтобы номер
    // элемента совпадал с номером шага: под каждым шагом свой кадр.
    const stepArr = a.steps || [];
    const scenes = stepArr.map((st, i) => {
      if (st && typeof st === 'object' && st.sc && st.sc.path) return norm(st.sc.path);
      const old = (a.scenes || [])[i];
      return norm(old && old.path);
    });
    if (!stepArr.length) (a.scenes || []).forEach(sc => scenes.push(norm(sc && sc.path)));
    articles.push({
      id: a.id,
      path: norm(a.path),
      scenes: scenes,
      steps: Math.max(stepArr.length, (a.scenes || []).length),
    });
  }));

  // Во сколько «стоит» совпадение пути снимка и пути окна в статье
  function score(shotPath, scenePath) {
    if (!shotPath || !scenePath) return 0;
    if (shotPath === scenePath) return 100;
    const sp = shotPath.split(' → '), sc = scenePath.split(' → ');
    // путь снимка — начало пути окна (Bridge → Bridge ↔ Bridge → Bridge → New)
    let n = 0;
    while (n < sp.length && n < sc.length && sp[n] === sc[n]) n++;
    if (n === sp.length) return 60 + n;
    if (n === sc.length) return 50 + n;
    return n >= 2 ? 20 + n : (n === 1 ? 10 : 0);
  }

  const mapping = {};
  const bound = new Set();
  let steps = 0;
  let exactSteps = 0;

  /* Каждый шаг получает СВОЙ кадр: для шага берём окно с лучшим совпадением
     пути. Ничего не размазываем по свободным шагам — иначе под шагом про
     DHCP Client оказывался VLAN. Точное окно (совпал весь путь) — строка,
     окно того же раздела — объект { f, w } с честной подписью. */
  const shotByPath = shots.map(s => ({ f: s.f, p: norm(s.appPath), t: s.t }));
  const rootShots = {};
  shotByPath.forEach(sh => {
    if (!sh.p) return;
    const r = sh.p.split(' → ')[0];
    (rootShots[r] = rootShots[r] || []).push(sh);
  });
  articles.forEach(a => {
    a.scenes.forEach((sc, i) => {
      if (!sc) return;
      let best = null, bestV = 0;
      shotByPath.forEach(sh => {
        const v = score(sh.p, sc);
        if (v > bestV) { bestV = v; best = sh; }
      });
      // ниже 20 — это уже «просто общий корень», такие совпадения не берём:
      // лучше схема, чем чужое окно
      if (!best || bestV < 20) return;
      const m = mapping[a.id] || (mapping[a.id] = {});
      if (m[i] !== undefined) return;
      if (bestV >= 50) {
        m[i] = best.f;
        exactSteps++;
      } else {
        // запасной вариант: настоящее окно того же раздела меню; чтобы под
        // шагами не повторялась одна и та же картинка, чередуем кадры раздела
        const root = sc.split(' → ')[0];
        const pool = rootShots[root] || [];
        const pick2 = pool.length ? pool[i % pool.length] : best;
        m[i] = { f: pick2.f, w: pick2.t };
      }
      bound.add(best.f);
      steps++;
    });
  });

  // каждый кадр галереи должен быть хотя бы где-то показан: иначе он «висит»
  const unboundShots = shots.filter(s => !bound.has(s.f));
  unboundShots.forEach(s => {
    const p = norm(s.appPath);
    const name = s.f.replace(/\.jpg$/, '');
    const a = (FORCE_ARTICLE[name] && articles.find(x => x.id === FORCE_ARTICLE[name]))
      || articles.find(x => x.path && (x.path.startsWith(p) || p.startsWith(x.path)))
      || articles.find(x => x.id === 'start-first-login');
    if (!a) return;
    const m = mapping[a.id] || (mapping[a.id] = {});
    // ищем свободный шаг; если свободных нет — заменяем повтор (один и тот же
    // кадр, показанный дважды, лучше заменить другим окном)
    let step = -1;
    const n = Math.max(1, a.steps || 1);
    for (let i = 0; i < n; i++) if (m[i] === undefined) { step = i; break; }
    if (step < 0) {
      const seen = {};
      for (let i = 0; i < n; i++) {
        if (seen[m[i]]) { step = i; break; }
        seen[m[i]] = 1;
      }
    }
    if (step < 0) return;
    // это окно того же раздела, а не окно шага — подписываем его честно
    m[step] = { f: s.f, w: s.t };
    bound.add(s.f);
    steps++;
  });

  /* 2b) шаги без точного кадра: если раздел снят (Interfaces, WiFi,
     Bridge, PPP…), показываем настоящее окно этого раздела и честно
     подписываем, какое именно окно на снимке. Схема остаётся только там,
     где такого раздела в снимках нет вовсе. */
  const rootOf = p => (p ? p.split(' → ')[0] : '');
  const byRoot = {};
  shots.forEach(s => {
    const r = rootOf(norm(s.appPath));
    if (!r) return;
    const depth = norm(s.appPath).split(' → ').length;
    if (!byRoot[r] || depth < byRoot[r].depth) {
      byRoot[r] = { f: s.f, t: s.t, depth: depth };
    }
  });

  // Последний проход: шагам, у которых нет своего описания окна (просто текст),
  // тоже даём настоящее окно раздела статьи — с подписью, какое это окно.
  // Последний проход: всё, что осталось без кадра (шаги-строки, окна, которых
  // ещё не сняли), получает настоящее окно того же раздела с честной подписью.
  // Кадры раздела чередуем, чтобы под шагами не повторялась одна картинка.
  articles.forEach(a => {
    const rootA = rootOf(a.path);
    const n = Math.max(a.steps || 0, a.scenes.length);
    for (let i = 0; i < n; i++) {
      const m = mapping[a.id] || (mapping[a.id] = {});
      if (m[i] !== undefined) continue;
      const full = a.scenes[i] || a.path || '';
      const root = rootOf(full) || rootA;
      let pool = rootShots[root];
      if (!pool && rootA) pool = rootShots[rootA];
      if (!pool) {
        // окно живёт не в первом разделе: WireGuard снимается через
        // Interfaces → WireGuard, поэтому ищем кадры с общим словом пути
        const segs = full.toLowerCase().split(' → ');
        const near = shotByPath
          .map(sh => {
            const ss = sh.p.toLowerCase().split(' → ');
            const same = ss.filter(x => segs.indexOf(x) >= 0).length;
            return { sh: sh, same: same };
          })
          .filter(v => v.same > 0)
          .sort((x, y) => y.same - x.same);
        pool = near.length ? near.map(v => v.sh) : null;
      }
      if (!pool || !pool.length) continue;
      const sh = pool[i % pool.length];
      m[i] = { f: sh.f, w: sh.t };
      steps++;
    }
  });

  const arts = Object.keys(mapping);

  const photos = '/* Настоящие снимки Winbox 4, привязанные к шагам статей.\n' +
    '   Ключ — id статьи, значение — { «номер шага с нуля»: «файл в img/shots» }.\n' +
    '   Такой шаг показывает живое окно Winbox 4, снятое в CI на настоящем\n' +
    '   RouterOS 7.24.6, а не векторную схему. Остальные шаги подписаны\n' +
    '   «Схема окна Winbox 4». Файл создаёт scripts/win4-import.js. */\n' +
    'window.SHOT_STEPS = ' + JSON.stringify(mapping, null, 2) + ';\n';

  const exact = exactSteps;

  if (!dry) {
    fs.writeFileSync(path.join(DATA, 'win4.js'), win4, 'utf8');
    fs.writeFileSync(path.join(DATA, 'photos.js'), photos, 'utf8');
  }

  console.log('Галерея: ' + shots.length + ' снимков, групп: ' +
    new Set(shots.map(s => s.g)).size);
  console.log('Статей с живым кадром: ' + arts.length + ', шагов со снимком: ' + steps +
    ' (точное окно: ' + exact + ')');
}

main();
