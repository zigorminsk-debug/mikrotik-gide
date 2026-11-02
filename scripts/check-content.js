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
if (packArticles) console.log(`Контент-пак: статей ${packArticles}, схем ${packScenes}`);

if (errors.length) {
  console.error('\nОШИБКИ (' + errors.length + '):');
  errors.slice(0, 50).forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('Контент в порядке ✔');
