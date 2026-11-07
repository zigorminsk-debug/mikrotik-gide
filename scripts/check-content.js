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
let articles = 0, scenes = 0, notes = 0, mappedSteps = 0, totalSteps = 0;

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

console.log(`Разделов: ${DATA.length}, статей: ${articles}, схем: ${scenes}, подсказок со стрелками: ${notes}`);
console.log(`Шагов с собственным окном: ${mappedSteps} из ${totalSteps} (остальным окно подбирается автоматически)`);
console.log(`Вопросов самопроверки: ${QUIZ.length}` + (QUIZ.length ? ` (ошибок: ${quizBad})` : ''));
console.log(`Диагностика: симптомов ${DIAG.length}, шагов ${DIAG.reduce((n, d) => n + (d.steps || []).length, 0)}` + (DIAG.length ? ` (ошибок: ${diagBad})` : ''));
console.log(`Глоссарий: терминов ${GLO.length}, портов ${PORTS.length}` + (GLO.length ? ` (ошибок: ${gloBad})` : ''));
console.log(`Защита от взлома: групп ${HARDEN.length}, пунктов ${hdItems}` + (HARDEN.length ? ` (ошибок: ${hdBad})` : ''));
if (packArticles) console.log(`Контент-пак: статей ${packArticles}, схем ${packScenes}`);

if (errors.length) {
  console.error('\nОШИБКИ (' + errors.length + '):');
  errors.slice(0, 50).forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('Контент в порядке ✔');
