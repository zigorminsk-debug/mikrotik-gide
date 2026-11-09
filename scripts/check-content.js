#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   Проверка контента учебника:
   - все статьи имеют уникальные id и обязательные поля;
   - у каждой схемы (scene) количество заметок совпадает с количеством
     размеченных элементов (data-m), иначе стрелка будет указывать «в пустоту»;
   - все внутренние ссылки (#/id) ведут на существующие статьи.
   Запуск: node scripts/check-content.js
   --------------------------------------------------------------------------- */
'use strict';

const path = require('path');
const fs = require('fs');

const WWW = path.resolve(__dirname, '../app/src/main/assets/www');
const DATA_DIR = path.join(WWW, 'js/data');

// порядок загрузки берём из index.html — он же используется в приложении
const html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
const files = [];
const re = /<script\s+src="js\/data\/([^"]+)"/g;
let m;
while ((m = re.exec(html)) !== null) files.push(m[1]);

if (!files.length) {
  console.error('Не найдены файлы данных в index.html');
  process.exit(1);
}

global.window = {};
files.forEach(f => require(path.join(DATA_DIR, f)));

const DATA = global.window.DATA || [];
const errors = [];
const ids = new Set();
/* Дерево меню Winbox 4 берём из самого рендерера: схема окна обязана
   открываться по существующему пункту меню, иначе это уже не Winbox 4. */
let WINBOX_MENU = new Set();
try {
  /* scene.js при загрузке вешает слушатель resize — в Node его надо заглушить */
  global.window.addEventListener = global.window.addEventListener || function () {};
  global.window.removeEventListener = global.window.removeEventListener || function () {};
  require(path.join(WWW, 'js/scene.js'));
  WINBOX_MENU = new Set(((global.window.Scene && global.window.Scene._menu) || []).map(g => g.g));
} catch (e) {
  errors.push('scene.js не загрузился: ' + e.message);
}
/* Особые пути: это не пункты меню, а окна/режимы самой программы Winbox 4. */
const SPECIAL_PATHS = new Set(['Winbox 4', 'Safe Mode', 'Wireless', 'ZeroTier']);

let articles = 0, scenes = 0, notes = 0, mappedSteps = 0, totalSteps = 0;

/* Каждая картинка шага — окно Winbox 4: у него есть заголовок как в программе
   и путь по настоящему дереву меню. Терминал тоже окно, но с командами. */
function checkWinboxScene(a, sc, where) {
  if (!sc || typeof sc !== 'object') { errors.push(`${a.id} ${where}: пустая схема`); return; }
  if (!sc.win) errors.push(`${a.id} ${where}: у окна нет заголовка (win)`);
  if (sc.term) {
    if (!Array.isArray(sc.lines) || !sc.lines.length) errors.push(`${a.id} ${where}: терминал без строк`);
  } else if (!sc.path) {
    errors.push(`${a.id} ${where}: нет пути по меню Winbox 4`);
  } else {
    const top = String(sc.path).split('→')[0].trim();
    if (!SPECIAL_PATHS.has(top) && !WINBOX_MENU.has(top)) {
      errors.push(`${a.id} ${where}: «${top}» нет в дереве Winbox 4 (${sc.path})`);
    }
  }
  if (sc.win && /(схем|рисун|макет|пример окна)/i.test(String(sc.win))) {
    errors.push(`${a.id} ${where}: заголовок «${sc.win}» — это не название окна Winbox 4`);
  }
}

DATA.forEach(g => {
  if (!g.id || !g.name) errors.push('Группа без id/name');
  (g.items || []).forEach(a => {
    articles++;
    if (!a.id) errors.push(`Статья без id: ${a.t}`);
    if (ids.has(a.id)) errors.push(`Дублирующийся id: ${a.id}`);
    ids.add(a.id);
    if (!a.t) errors.push(`${a.id}: нет заголовка`);
    if (!a.purpose) errors.push(`${a.id}: нет блока «Назначение»`);
    if (!a.steps || !a.steps.length) errors.push(`${a.id}: нет инструкции`);

    // привязка шагов к окнам: индекс должен существовать, фокус — попадать в элемент
    let mapped = 0;
    (a.steps || []).forEach((st, i) => {
      if (!st || typeof st !== 'object') return;
      /* шаг со своей сценой-инструкцией (st.sc): окно задано прямо в шаге */
      if (st.sc) {
        mapped++;
        const sc = st.sc;
        checkWinboxScene(a, sc, `шаг ${i + 1}`);
        if (!sc.marks) errors.push(`${a.id}: шаг ${i + 1} — у своей сцены нет marks:1`);
        const nums = [];
        const walk = (o) => {
          if (!o || typeof o !== 'object') return;
          if (Array.isArray(o)) { o.forEach(walk); return; }
          if (o.m) nums.push(Number(o.m));
          for (const k in o) if (k !== 'm' && typeof o[k] === 'object') walk(o[k]);
        };
        walk(sc.rows); walk(sc.tools); walk(sc.rightTools);
        if (sc.menu) { if (sc.menu.grp) nums.push(Number(sc.menu.grp)); if (sc.menu.sub) nums.push(Number(sc.menu.sub)); }
        if (sc.tabMark) nums.push(Number(sc.tabMarkN || 1));
        if (sc.form) {
          const tabMode = (sc.form.fields || []).some(f => f && f.t);
          const vis = tabMode ? (sc.form.fields || []).filter(f => !f.t || f.t === sc.form.tab) : (sc.form.fields || []);
          walk(vis);
          const rest = {};
          for (const k in sc.form) if (k !== 'fields') rest[k] = sc.form[k];
          walk(rest);
          /* номера на вкладках диалога: tabMark/tabMarkN и tabMarks{вкладка:номер} */
          if (sc.form.tabMark) nums.push(Number(sc.form.tabMarkN || 1));
          if (sc.form.tabMarks) Object.keys(sc.form.tabMarks).forEach(k => nums.push(Number(sc.form.tabMarks[k])));
        }
        const n = (sc.notes || []).length;
        for (let k = 1; k <= n; k++) {
          if (nums.indexOf(k) < 0) errors.push(`${a.id}: шаг ${i + 1} — номер ${k} без цели на окне`);
        }
        return;
      }
      if (st.s == null) return;
      mapped++;
      const sc = (a.scenes || [])[st.s];
      if (!sc) {
        errors.push(`${a.id}: шаг ${i + 1} ссылается на несуществующую схему ${st.s}`);
        return;
      }
      const f = st.shot;
      if (!f) return;
      if (f.field != null && !((sc.form && sc.form.fields) || [])[f.field]) {
        errors.push(`${a.id}: шаг ${i + 1} — поле ${f.field} вне схемы ${st.s}`);
      }
      if (f.row != null && !(sc.rows || [])[f.row]) {
        errors.push(`${a.id}: шаг ${i + 1} — строка ${f.row} вне схемы ${st.s}`);
      }
      if (f.tab != null && !(sc.tabs || [])[f.tab]) {
        errors.push(`${a.id}: шаг ${i + 1} — вкладка ${f.tab} вне схемы ${st.s}`);
      }
      if (f.tool != null && !(sc.tools || [])[f.tool]) {
        errors.push(`${a.id}: шаг ${i + 1} — кнопка ${f.tool} вне схемы ${st.s}`);
      }
    });
    mappedSteps += mapped;
    totalSteps += (a.steps || []).length;

    (a.scenes || []).forEach((sc, si) => {
      scenes++;
      checkWinboxScene(a, sc, `[${si}]`);
      const marks = new Set();
      const scan = v => { if (v && typeof v === 'object' && v.m) marks.add(v.m); };
      (sc.rows || []).forEach(r => r.forEach(scan));
      ((sc.form && sc.form.fields) || []).forEach(scan);
      (sc.tools || []).forEach(scan);
      if (sc.tabMarkN) marks.add(sc.tabMarkN);

      const n = (sc.notes || []).length;
      notes += n;
      const max = Math.max(0, ...marks);
      if (n !== max) errors.push(`${a.id}[${si}]: заметок ${n}, а размечено ${max}`);
      for (let i = 1; i <= max; i++) {
        if (!marks.has(i)) errors.push(`${a.id}[${si}]: для стрелки ${i} нет цели`);
      }
    });
  });
});

// вопросы самопроверки
const QUIZ = global.window.QUIZ || [];
let quizBad = 0;
QUIZ.forEach((q, i) => {
  if (!q.q || !Array.isArray(q.a) || q.a.length < 2) { errors.push(`quiz[${i}]: нет вопроса или вариантов`); quizBad++; return; }
  if (typeof q.c !== 'number' || q.c < 0 || q.c >= q.a.length) { errors.push(`quiz[${i}]: неверный индекс ответа`); quizBad++; }
  if (!q.e) { errors.push(`quiz[${i}]: нет пояснения`); quizBad++; }
  if (new Set(q.a.map(x => String(x).trim())).size !== q.a.length) { errors.push(`quiz[${i}]: повторяющиеся варианты ответа`); quizBad++; }
  if (!q.r) { errors.push(`quiz[${i}]: нет ссылки на статью для разбора`); quizBad++; }
  if (q.r && !ids.has(q.r)) { errors.push(`quiz[${i}]: ссылка на несуществующую статью ${q.r}`); quizBad++; }
});

// id статей контент-пака — на них тоже можно ссылаться из диагностики и глоссария
const packIds = new Set();
try {
  const pk = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../content-pack/pack.json'), 'utf8'));
  (pk.groups || []).forEach(g => (g.items || []).forEach(a => packIds.add(a.id)));
} catch (e) { /* пака может не быть — не ошибка */ }
const knownId = id => ids.has(id) || packIds.has(id);

// диагностика по симптому
const DIAG = global.window.DIAG || [];
let diagBad = 0;
DIAG.forEach((d, i) => {
  const tag = `diag[${i}]${d && d.id ? ' (' + d.id + ')' : ''}`;
  if (!d || !d.id || !d.t) { errors.push(`${tag}: нет id или заголовка`); diagBad++; return; }
  if (!Array.isArray(d.steps) || d.steps.length < 3) { errors.push(`${tag}: меньше трёх шагов`); diagBad++; }
  (d.steps || []).forEach((s, j) => {
    if (!s || !s.t) { errors.push(`${tag}: шаг ${j + 1} без текста`); diagBad++; }
    if (s && s.art && !knownId(s.art)) { errors.push(`${tag}: шаг ${j + 1} ссылается на ${s.art}`); diagBad++; }
  });
  if (d.art && !knownId(d.art)) { errors.push(`${tag}: ссылка на статью ${d.art}`); diagBad++; }
});

// глоссарий и порты
const GLO = global.window.GLOSSARY || [];
const PORTS = global.window.PORTS || [];
let gloBad = 0;
const gloSeen = new Set();
GLO.forEach((g, i) => {
  if (!g || !g.t || !g.d) { errors.push(`glossary[${i}]: нет термина или описания`); gloBad++; return; }
  if (gloSeen.has(g.t)) { errors.push(`glossary[${i}]: дубликат термина ${g.t}`); gloBad++; }
  gloSeen.add(g.t);
  if (g.art && !knownId(g.art)) { errors.push(`glossary[${i}] ${g.t}: ссылка на ${g.art}`); gloBad++; }
});
PORTS.forEach((p, i) => {
  if (!p || !p.port || !p.proto || !p.t) { errors.push(`ports[${i}]: неполная запись`); gloBad++; }
});

// чек-лист защиты от взлома
const HARDEN = global.window.HARDEN_GROUPS || [];
let hdBad = 0, hdItems = 0;
const hdIds = new Set();
HARDEN.forEach((g, gi) => {
  if (!g || !g.id || !g.name) { errors.push(`harden[${gi}]: нет id/названия группы`); hdBad++; return; }
  (g.items || []).forEach((it, ii) => {
    hdItems++;
    const tag = `harden ${g.id}[${ii}]${it && it.id ? ' (' + it.id + ')' : ''}`;
    if (!it || !it.id || !it.t) { errors.push(`${tag}: нет id или текста`); hdBad++; return; }
    if (hdIds.has(it.id)) { errors.push(`${tag}: дубликат id`); hdBad++; }
    hdIds.add(it.id);
    if (!it.menu) { errors.push(`${tag}: не указано меню Winbox`); hdBad++; }
    if (!it.why) { errors.push(`${tag}: нет пояснения`); hdBad++; }
    if (!['critical', 'high', 'medium'].includes(it.risk)) { errors.push(`${tag}: неверная важность ${it.risk}`); hdBad++; }
    if (it.art && !knownId(it.art)) { errors.push(`${tag}: ссылка на ${it.art}`); hdBad++; }
  });
});

/* Примеры из жизни: у каждой статьи должен быть свой разбор — ситуация,
   что сделали, что получилось. Это не «где применяется», а живой случай. */
const CASES = global.window.CASES || {};
let caseCount = 0;
const caseTexts = new Map();
DATA.forEach(g => (g.items || []).forEach(a => {
  const c = CASES[a.id];
  if (!c) { errors.push(`${a.id}: нет примера из жизни`); return; }
  caseCount++;
  if (!c.s || c.s.length < 40) errors.push(`${a.id}: пример — пустая или короткая ситуация`);
  if (!c.d || c.d.length < 40) errors.push(`${a.id}: пример — нет «что сделали»`);
  if (!c.r || c.r.length < 30) errors.push(`${a.id}: пример — нет «что получилось»`);
  if (c.s) {
    if (caseTexts.has(c.s)) errors.push(`${a.id}: ситуация совпадает с ${caseTexts.get(c.s)}`);
    else caseTexts.set(c.s, a.id);
  }
  // в примере должны быть конкретные числа/модели, а не общие слова
  /* конкретика: цифра, модель железа или порт — иначе это не пример, а пересказ */
  const caseAll = String(c.s) + ' ' + String(c.d) + ' ' + String(c.r);
  if (!/\d/.test(caseAll) && !/(RB\d|hAP|CRS|hEX|CHR|LTE|VLAN|DHCP|NAT|PPPoE)/i.test(caseAll)) {
    errors.push(`${a.id}: пример без конкретики (ни цифры, ни модели, ни протокола)`);
  }
}));
Object.keys(CASES).forEach(id => { if (!ids.has(id)) errors.push(`пример для несуществующей статьи: ${id}`); });

// контент-пак (публикуется отдельно от APK)
let packArticles = 0, packScenes = 0;
const packPath = path.resolve(__dirname, '../content-pack/pack.json');
if (fs.existsSync(packPath)) {
  let pack = null;
  try {
    pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  } catch (e) {
    errors.push('content-pack/pack.json: невалидный JSON');
  }
  if (pack) {
    if (!pack.version) errors.push('контент-пак: нет version');
    const packIds = new Set();
    (pack.groups || []).forEach(g => {
      if (!g.id || !g.name) errors.push('контент-пак: группа без id/name');
      (g.items || []).forEach(a => {
        packArticles++;
        if (!a.id) { errors.push('контент-пак: статья без id'); return; }
        if (ids.has(a.id)) errors.push(`контент-пак: id ${a.id} конфликтует с основным контентом`);
        if (packIds.has(a.id)) errors.push(`контент-пак: дублирующийся id ${a.id}`);
        packIds.add(a.id);
        if (!a.t || !a.purpose) errors.push(`контент-пак ${a.id}: нет заголовка/назначения`);
        if (!Array.isArray(a.steps) || !a.steps.length) errors.push(`контент-пак ${a.id}: нет шагов`);
        (a.scenes || []).forEach((sc, si) => {
          packScenes++;
          const marks = new Set();
          const scan = v => { if (v && typeof v === 'object' && v.m) marks.add(v.m); };
          (sc.rows || []).forEach(r => r.forEach(scan));
          ((sc.form && sc.form.fields) || []).forEach(scan);
          (sc.tools || []).forEach(scan);
          if (sc.tabMarkN) marks.add(sc.tabMarkN);
          const max = Math.max(0, ...marks);
          const n = (sc.notes || []).length;
          if (n !== max) errors.push(`контент-пак ${a.id}[${si}]: заметок ${n}, размечено ${max}`);
        });
      });
    });
  }
}

// внутренние ссылки
DATA.forEach(g => (g.items || []).forEach(a => {
  (a.links || []).forEach(l => {
    if (l.u && l.u.indexOf('#/') === 0) {
      const target = l.u.slice(2);
      if (!ids.has(target)) errors.push(`${a.id}: битая ссылка ${l.u}`);
    }
  });
}));

/* Снимок под шагом обязан совпадать с окном и данными шага. */
const RULES = require('./win4-step-rules.js');
const REVIEW = require('./win4-review.js');
const WIN4 = global.window.WIN4_SHOTS || [];
const SHOT_STEPS = global.window.SHOT_STEPS || {};
const shotByFile = new Map(WIN4.map(x => [x.f, x]));
/* Текст, распознанный на кадре в CI: им и подтверждается совпадение данных. */
let EVIDENCE = {};
const evPath = path.resolve(__dirname, '../docs/shots/verified.json');
if (fs.existsSync(evPath)) {
  try { EVIDENCE = JSON.parse(fs.readFileSync(evPath, 'utf8')); }
  catch (e) { errors.push('verified.json испорчен: ' + e.message); }
}
const ocrDir = path.resolve(__dirname, '../docs/shots/ocr');
if (fs.existsSync(ocrDir)) {
  for (const f of fs.readdirSync(ocrDir)) {
    if (!/\.txt$/i.test(f)) continue;
    const text = fs.readFileSync(path.join(ocrDir, f), 'utf8');
    if (text.trim()) EVIDENCE[f.replace(/\.txt$/i, '')] = { text };
  }
}
let verifiedShots = 0;
for (const x of WIN4) {
  const name = x.f.replace(/\.jpg$/i, '');
  if (REVIEW.quarantine[name]) errors.push(`галерея: кадр на карантине ${x.f}`);
}
for (const [id, steps] of Object.entries(SHOT_STEPS)) {
  const group = DATA.find(g => (g.items || []).some(a => a.id === id));
  const a = group && (group.items || []).find(x => x.id === id);
  if (!a) { errors.push(`SHOT_STEPS: неизвестная статья ${id}`); continue; }
  for (const [i, f] of Object.entries(steps)) {
    if (typeof f !== 'string') { errors.push(`SHOT_STEPS ${id}[${i}]: fallback-объект запрещён`); continue; }
    const meta = shotByFile.get(f);
    if (!meta) { errors.push(`SHOT_STEPS ${id}[${i}]: ${f} нет в галерее`); continue; }
    const st = (a.steps || [])[+i];
    const sc = (st && st.sc) || (a.scenes || [])[+i];
    const ev = EVIDENCE[f.replace(/\.jpg$/i, '')] || {};
    const shot = { f, p: meta.p, values: REVIEW.values[f] || [], text: ev.text || '',
                   quarantined: !!REVIEW.quarantine[f.replace(/\.jpg$/i, '')] };
    const res = RULES.checkStepShot(st, sc, shot);
    if (!res.ok) errors.push(`SHOT_STEPS ${id}[${i}] ${f}: ${res.reason}` +
      (res.missing.length ? ' (нет на снимке: ' + res.missing.join(', ') + ')' : ''));
    else verifiedShots++;
  }
}
/* Самопроверка правила сверки: на этих примерах держится вся привязка. */
{
  const t = (name, cond) => { if (!cond) errors.push('win4-step-rules: ' + name); };
  t('значение видно в тексте кадра',
    RULES.visibleIn('10.10.10.5/32', '10.10.10.5/32  10.10.10.5  wg-office'));
  t('чужое значение не видно',
    !RULES.visibleIn('192.168.10.1/24', '10.0.2.15/24 ether1'));
  t('короткий флаг ищется по границам слов',
    !RULES.visibleIn('AS', 'Aliases table') && RULES.visibleIn('AS', 'AS 0.0.0.0/0'));
  t('OCR-путаница 0/O прощается',
    RULES.visibleIn('10.10.10.5/32', '1O.1O.1O.5/32 wg-office'));
  t('команда в тексте не считается значением поля',
    RULES.isCommand('/export file=old-full') &&
    RULES.isCommand('chain=srcnat action=masquerade') && !RULES.isCommand('wg-office'));
  const st = { d: 'Address = `10.10.10.5/32`, Interface = `wg-office`' };
  const sc = { path: 'IP → Address', rows: [[{ v: '10.10.10.5/32' }, { v: 'wg-office' }]] };
  t('пустой кадр не проходит под шаг с данными',
    !RULES.checkStepShot(st, sc, { f: 'x.jpg', p: 'IP → Address', text: '10.0.2.15/24 ether1' }).ok);
  t('кадр стенда проходит под свой шаг',
    RULES.checkStepShot(st, sc, { f: 'x.jpg', p: 'IP → Address',
      text: '10.10.10.5/32 10.10.10.5 wg-office wg-office' }).ok);
  t('чужое окно не проходит даже с теми же данными',
    !RULES.checkStepShot(st, sc, { f: 'x.jpg', p: 'IP → Routes',
      text: '10.10.10.5/32 wg-office' }).ok);
}
const wgAddr = (SHOT_STEPS['wg-site'] || {})[3];
if (wgAddr === 'ip-address.jpg') {
  /* Теперь это допустимо только если на кадре действительно адрес туннеля. */
  const ev = EVIDENCE['ip-address'] || {};
  const ok = RULES.visibleIn('10.10.10.5/32', ev.text) && RULES.visibleIn('wg-office', ev.text);
  if (!ok) errors.push('wg-site: «Адрес в туннеле» получил ip-address.jpg без нужных данных');
}

console.log(`Разделов: ${DATA.length}, статей: ${articles}, схем: ${scenes}, подсказок со стрелками: ${notes}`);
console.log(`Снимков в галерее: ${WIN4.length}, проверенных привязок к шагам: ${verifiedShots}`);
console.log(`Шагов с собственным окном: ${mappedSteps} из ${totalSteps} (остальным окно подбирается автоматически)`);
console.log(`Вопросов самопроверки: ${QUIZ.length}` + (QUIZ.length ? ` (ошибок: ${quizBad})` : ''));
console.log(`Диагностика: симптомов ${DIAG.length}, шагов ${DIAG.reduce((n, d) => n + (d.steps || []).length, 0)}` + (DIAG.length ? ` (ошибок: ${diagBad})` : ''));
console.log(`Глоссарий: терминов ${GLO.length}, портов ${PORTS.length}` + (GLO.length ? ` (ошибок: ${gloBad})` : ''));
console.log(`Защита от взлома: групп ${HARDEN.length}, пунктов ${hdItems}` + (HARDEN.length ? ` (ошибок: ${hdBad})` : ''));
if (packArticles) console.log(`Контент-пак: статей ${packArticles}, схем ${packScenes}`);
console.log(`Примеров из жизни: ${caseCount} из ${articles}`);

if (errors.length) {
  console.error('\nОШИБКИ (' + errors.length + '):');
  errors.slice(0, 50).forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('Контент в порядке ✔');
