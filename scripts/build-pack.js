#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   Собирает content-pack.json из content-pack/pack.json.
   Файл публикуется в релизе рядом с APK: приложение скачивает его по адресу
   releases/latest/download/content-pack.json и добавляет статьи без обновления.
   Запуск: node scripts/build-pack.js
   --------------------------------------------------------------------------- */
'use strict';

const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../content-pack/pack.json');
const OUT = path.resolve(__dirname, '../content-pack.json');

if (!fs.existsSync(SRC)) {
  console.log('content-pack/pack.json не найден — контент-пак не собирается');
  process.exit(0);
}

let pack;
try {
  pack = JSON.parse(fs.readFileSync(SRC, 'utf8'));
} catch (e) {
  console.error('content-pack/pack.json: невалидный JSON — ' + e.message);
  process.exit(1);
}

const errors = [];
if (!pack.version) errors.push('нет поля version');
if (!Array.isArray(pack.groups) || !pack.groups.length) errors.push('нет групп');

const ids = new Set();
let articles = 0, scenes = 0, notes = 0;
(pack.groups || []).forEach(function (g) {
  if (!g.id || !g.name) errors.push('группа без id/name');
  (g.items || []).forEach(function (a) {
    articles++;
    if (!a.id) errors.push('статья без id: ' + a.t);
    if (ids.has(a.id)) errors.push('дублирующийся id: ' + a.id);
    ids.add(a.id);
    if (!a.t) errors.push(a.id + ': нет заголовка');
    if (!a.purpose) errors.push(a.id + ': нет назначения');
    if (!Array.isArray(a.steps) || !a.steps.length) errors.push(a.id + ': нет шагов');
    (a.scenes || []).forEach(function (sc, si) {
      scenes++;
      const marks = new Set();
      (sc.rows || []).forEach(function (r) {
        r.forEach(function (c) { if (c && typeof c === 'object' && c.m) marks.add(c.m); });
      });
      ((sc.form && sc.form.fields) || []).forEach(function (f) { if (f && f.m) marks.add(f.m); });
      (sc.tools || []).forEach(function (b) { if (b && b.m) marks.add(b.m); });
      if (sc.tabMarkN) marks.add(sc.tabMarkN);
      const max = Math.max(0, ...marks);
      const n = (sc.notes || []).length;
      notes += n;
      if (n !== max) errors.push(a.id + '[' + si + ']: заметок ' + n + ', размечено ' + max);
    });
  });
});

if (errors.length) {
  console.error('Ошибки контент-пака:');
  errors.slice(0, 30).forEach(function (e) { console.error(' - ' + e); });
  process.exit(1);
}

pack.builtAt = new Date().toISOString();
fs.writeFileSync(OUT, JSON.stringify(pack, null, 2) + '\n');
console.log('content-pack.json: версия ' + pack.version + ', групп ' + pack.groups.length +
  ', статей ' + articles + ', схем ' + scenes + ', подсказок ' + notes +
  ', размер ' + Math.round(fs.statSync(OUT).size / 1024) + ' КБ');
