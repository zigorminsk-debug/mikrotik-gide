#!/usr/bin/env node
/*
 * win4-import.js — перенос проверенных снимков Winbox 4 в приложение.
 *
 *   node scripts/win4-import.js [--dry]
 *
 * Источник: docs/shots/jpg/<имя>.jpg + .github/scripts/shot-list.txt.
 * Названия/группы: scripts/win4-titles.js.
 * Ручная проверка кадров: scripts/win4-review.js.
 * Правило привязки к шагу: scripts/win4-step-rules.js.
 *
 * ВАЖНО: снимок ставится под шаг только если совпадают окно И значимые
 * данные шага. «Запасных» кадров того же раздела больше нет: лучше честная
 * схема с нужными значениями, чем фото чужого адреса/интерфейса.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'docs/shots/jpg');
const DST = path.join(ROOT, 'app/src/main/assets/www/img/shots');
const LIST = path.join(ROOT, '.github/scripts/shot-list.txt');
const WWW = path.join(ROOT, 'app/src/main/assets/www');
const TITLES = require('./win4-titles.js');
const REVIEW = require('./win4-review.js');
/* Доказательства со съёмки: что реально распознано на каждом кадре.
   Файл пишет .github/scripts/winbox-nav.py (docs/shots/verified.json). */
const EVIDENCE_PATH = path.join(ROOT, 'docs/shots/verified.json');
let EVIDENCE = {};
if (fs.existsSync(EVIDENCE_PATH)) {
  try { EVIDENCE = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8')); }
  catch (e) { console.error('verified.json испорчен: ' + e.message); }
}
const RULES = require('./win4-step-rules.js');
const DRY = process.argv.indexOf('--dry') >= 0;

function loadData() {
  const html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
  const re = /<script\s+src="js\/data\/([^"]+)"/g;
  let m;
  global.window = {};
  while ((m = re.exec(html))) {
    const p = path.join(WWW, 'js/data', m[1]);
    if (fs.existsSync(p)) require(p);
  }
  return global.window.DATA;
}

function readShots() {
  const out = [];
  const seen = new Set();
  const add = (name, appPath, extra) => {
    if (seen.has(name)) return;
    /* Новые кадры CI лежат в docs/shots/jpg; ранее опубликованные — в www.
       Для login/desktop CI использует имена 00-login.jpg / 03-desktop.jpg. */
    let src = path.join(SRC, name + '.jpg');
    if (!fs.existsSync(src) && name === 'login') src = path.join(SRC, '00-login.jpg');
    if (!fs.existsSync(src) && name === 'desktop') src = path.join(SRC, '03-desktop.jpg');
    if (!fs.existsSync(src)) src = path.join(DST, name + '.jpg');
    if (!fs.existsSync(src)) return;
    seen.add(name);
    const q = REVIEW.quarantine[name];
    const meta = TITLES[name] || [name, 'Прочее', ''];
    out.push({
      f: name + '.jpg',
      p: appPath || '',
      t: meta[0],
      g: meta[1],
      /* Кадр со стенда подписываем иначе: на нём уже есть данные инструкции. */
      d: ((EVIDENCE[name] && REVIEW.descLab && REVIEW.descLab[name + '.jpg']) ||
          REVIEW.desc[name + '.jpg'] || meta[2] || ''),
      src,
      values: (REVIEW.values[name + '.jpg'] || []),
      text: (EVIDENCE[name] && EVIDENCE[name].text) || '',
      quarantined: !!q,
      quarantineReason: q || ''
    });
  };
  if (fs.existsSync(LIST)) {
    for (const line of fs.readFileSync(LIST, 'utf8').split('\n')) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const f = line.split('|');
      add(f[0].trim(), (f[3] || '').trim());
    }
  }
  add('login', 'Winbox 4');
  add('desktop', 'Winbox 4');
  return out;
}

function buildGallery(shots) {
  return shots.filter((s) => !s.quarantined);
}

function sceneOf(a, st, i) {
  return (st && st.sc) || (a.scenes || [])[i] || null;
}

function buildStepMap(DATA, shots) {
  const good = shots.filter((s) => !s.quarantined);
  /* Одному окну может соответствовать несколько кадров (вкладки, стенд и
     пустой CHR). Сначала пробуем кадры с распознанным текстом — стендовые. */
  const byPath = new Map();
  for (const s of good.slice().sort((a, b) => (b.text ? 1 : 0) - (a.text ? 1 : 0))) {
    const p = RULES.canonicalPath(s.p);
    if (!byPath.has(p)) byPath.set(p, []);
    byPath.get(p).push(s);
  }
  const map = {};
  const audit = [];
  let kept = 0, removed = 0;
  for (const group of DATA) {
    for (const a of group.items || []) {
      (a.steps || []).forEach((st, i) => {
        const sc = sceneOf(a, st, i);
        const list = (sc && sc.path && byPath.get(RULES.canonicalPath(sc.path))) || [];
        let candidate = list[0] || null, res = RULES.checkStepShot(st, sc, candidate);
        for (const s of list) {
          const r = RULES.checkStepShot(st, sc, s);
          if (r.ok) { candidate = s; res = r; break; }
          if (!candidate) { candidate = s; res = r; }
        }
        if (res.ok) {
          if (!map[a.id]) map[a.id] = {};
          map[a.id][i] = candidate.f;
          kept++;
          audit.push({ article: a.id, step: i + 1, file: candidate.f, status: 'verified',
                       evidence: candidate.text ? 'ocr' : 'manual' });
        } else {
          removed++;
          if (sc && sc.path) {
            audit.push({
              article: a.id, step: i + 1, path: sc.path,
              candidate: candidate ? candidate.f : null,
              status: res.reason,
              missing: res.missing.slice(0, 8)
            });
          }
        }
      });
    }
  }
  return { map, audit, kept, removed };
}

function jsString(v) { return JSON.stringify(v); }

function renderWin4(gallery) {
  let s = '/* AUTO-GENERATED scripts/win4-import.js — не править вручную. */\n';
  s += '/* Настоящие снимки Winbox 4.4 / RouterOS CHR 7.24.6. Только проверенные кадры. */\n';
  s += 'window.WIN4_SHOTS = [\n';
  for (const x of gallery) {
    s += '  { f: ' + jsString(x.f) + ', t: ' + jsString(x.t) + ', g: ' + jsString(x.g) +
      ', d: ' + jsString(x.d) + ', p: ' + jsString(x.p) + ' },\n';
  }
  s += '];\n';
  return s;
}

function renderPhotos(map) {
  let s = '/* AUTO-GENERATED scripts/win4-import.js — не править вручную. */\n';
  s += '/* Привязка только проверенных снимков: окно + данные шага. Без fallback. */\n';
  s += 'window.SHOT_STEPS = {\n';
  for (const id of Object.keys(map).sort()) {
    s += '  ' + jsString(id) + ': { ';
    s += Object.keys(map[id]).sort((a, b) => a - b).map((i) => i + ': ' + jsString(map[id][i])).join(', ');
    s += ' },\n';
  }
  s += '};\n';
  return s;
}

/* Отчёт «что ещё не снято»: по нему видно, какие объекты досеять в стенд,
   чтобы следующий прогон закрыл оставшиеся шаги. Пишется рядом с кадрами. */
function renderCoverage(audit, kept, shots) {
  const byWindow = new Map();
  for (const x of audit) {
    if (x.status === 'verified') continue;
    const key = x.path || '(без окна)';
    if (!byWindow.has(key)) byWindow.set(key, { missing: [], noShot: 0 });
    const w = byWindow.get(key);
    if (x.status === 'data-mismatch') w.missing.push(x);
    else if (x.status === 'no-shot') w.noShot++;
  }
  const ocr = audit.filter((x) => x.status === 'verified' && x.evidence === 'ocr').length;
  let s = '# Покрытие инструкций настоящими снимками\n\n';
  s += 'Файл создаёт `scripts/win4-import.js` — не править вручную.\n\n';
  s += '* кадров в галерее: **' + shots.length + '**;\n';
  s += '* шагов с подтверждённым снимком: **' + kept + '** (из них по тексту кадра: ' + ocr + ');\n';
  s += '* окон, где кадр есть, но данных шага на нём не хватает: **' +
    [...byWindow.values()].filter((w) => w.missing.length).length + '**;\n';
  s += '* окон без кадра вовсе: **' +
    [...byWindow.values()].filter((w) => w.noShot && !w.missing.length).length + '**.\n\n';
  s += '## Где кадр есть, но данные не совпали\n\n';
  s += 'Это список того, что нужно добавить в `.github/scripts/lab-setup.rsc`,\n';
  s += 'чтобы следующий прогон снял окно с нужными значениями.\n\n';
  s += '| Окно | Шаг | Чего не видно на кадре |\n| --- | --- | --- |\n';
  const rows = [...byWindow.entries()].filter(([, w]) => w.missing.length)
    .sort((a, b) => b[1].missing.length - a[1].missing.length);
  for (const [pathName, w] of rows) {
    for (const x of w.missing.slice(0, 4)) {
      s += '| ' + pathName + ' | `' + x.article + '` №' + x.step + ' | ' +
        (x.missing || []).map((v) => '`' + String(v).replace(/\|/g, '/') + '`').join(', ') + ' |\n';
    }
  }
  s += '\n## Окна, которые ещё не сняты\n\n';
  const noShot = [...byWindow.entries()].filter(([, w]) => w.noShot)
    .sort((a, b) => b[1].noShot - a[1].noShot);
  for (const [pathName, w] of noShot) {
    s += '* ' + pathName + ' — шагов: ' + w.noShot + '\n';
  }
  return s;
}

function main() {
  const DATA = loadData();
  if (!DATA || !DATA.length) { console.error('DATA не загрузилась'); process.exit(1); }
  const all = readShots();
  const shots = all.filter((s) => !s.quarantined);
  const gallery = buildGallery(all);
  const { map, audit, kept, removed } = buildStepMap(DATA, all);

  if (!DRY) {
    fs.mkdirSync(DST, { recursive: true });
    const want = new Set(shots.map((s) => s.f));
    for (const f of fs.readdirSync(DST)) {
      if (/\.jpg$/i.test(f) && !want.has(f)) fs.unlinkSync(path.join(DST, f));
    }
    for (const s of shots) fs.copyFileSync(s.src, path.join(DST, s.f));
    fs.writeFileSync(path.join(WWW, 'js/data/win4.js'), renderWin4(gallery));
    fs.writeFileSync(path.join(WWW, 'js/data/photos.js'), renderPhotos(map));
    const auditPath = path.join(ROOT, 'docs/shots/step-audit.json');
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
    fs.writeFileSync(auditPath, JSON.stringify({ kept, removed, audit }, null, 2));
    fs.writeFileSync(path.join(ROOT, 'docs/shots/coverage.md'),
      renderCoverage(audit, kept, shots));
  }

  const articles = Object.keys(map).length;
  console.log('Кадров-источников: ' + all.length + ', опубликовано: ' + shots.length +
    ', на карантине: ' + (all.length - shots.length));
  console.log('Галерея: ' + shots.length + ' снимков, ' + new Set(gallery.map((x) => x.g)).size + ' групп');
  console.log('Статей со снимком под шагом: ' + articles);
  const ocr = audit.filter((x) => x.status === 'verified' && x.evidence === 'ocr').length;
  console.log('Привязок к шагам: оставлено ' + kept + ' (подтверждено OCR: ' + ocr +
    '), снято как непроверенные/чужие ' + removed);
  console.log('Кадров с распознанным текстом: ' +
    Object.keys(EVIDENCE).length);
  if (DRY) console.log('(dry-run: файлы не изменены)');
}

main();
