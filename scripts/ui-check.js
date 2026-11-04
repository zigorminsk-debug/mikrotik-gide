#!/usr/bin/env node
/*
 * scripts/ui-check.js — проверка интерфейса учебника без Android и Windows.
 *
 * Зачем: у программы две оболочки (Android WebView и Go-сервер для Windows),
 * но страница одна — app/src/main/assets/www. Сломанный скрипт или разметку
 * надо ловить до сборки, потому что CI собирает APK/EXE, а не проверяет
 * поведение кнопок.
 *
 * Что делает: поднимает index.html в jsdom, подключает все js из index.html
 * (в том же порядке), подменяет сеть заглушками и нажимает кнопки.
 *
 * Запуск:
 *   npm i --no-save jsdom     # один раз, node_modules в .gitignore
 *   node scripts/ui-check.js
 *
 * Код возврата: 0 — всё сошлось, 1 — есть падения (список в конце).
 * Флаг --verbose печатает каждый пройденный пункт.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'app/src/main/assets/www');

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch (e) {
  console.error('Нужен jsdom: npm i --no-save jsdom');
  process.exit(2);
}

const verbose = process.argv.includes('--verbose');
let pass = 0;
const fails = [];

function ok(name, cond, extra) {
  if (cond) {
    pass++;
    if (verbose) console.log('  ✓ ' + name);
  } else {
    fails.push(name + (extra ? ' — ' + extra : ''));
    console.log('  ✗ ' + name + (extra ? ' — ' + extra : ''));
  }
}

/* ------------------------------------------------------------------ стенд --- */

/* Создаёт «браузер»: DOM из index.html + все скрипты страницы.
   platform: 'windows' включает живое подключение к роутеру (RosProbe). */
function boot(platform) {
  const html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const win = dom.window;

  // jsdom не умеет то, что есть в WebView/браузере — минимальные заглушки
  win.matchMedia = win.matchMedia || function () {
    return { matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
  };
  win.scrollTo = function () {};
  win.HTMLElement.prototype.scrollIntoView = function () {};
  win.localStorage.clear();

  if (platform === 'windows') {
    win.APP_PLATFORM = 'windows';
    win.MTG = { platform: 'windows' };
  }

  // сеть: тесты сами решают, что вернёт fetch
  win.__routes = {};
  win.fetch = function (url, opt) {
    const key = String(url).replace(/^.*\/api\/router/, '/api/router');
    const handler = win.__routes[key.split('?')[0]] || win.__routes[key];
    if (!handler) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
    }
    const body = opt && opt.body ? JSON.parse(opt.body) : null;
    const res = handler(body, key);
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(res) });
  };

  // скрипты подключаем вручную, чтобы контролировать ошибки
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
  for (const rel of scripts) {
    const file = path.join(WWW, rel);
    if (!fs.existsSync(file)) continue;
    const code = fs.readFileSync(file, 'utf8');
    try {
      win.eval(code);
    } catch (e) {
      throw new Error('скрипт ' + rel + ' упал: ' + (e && e.message));
    }
  }
  return win;
}

/* Переход по маршруту и ожидание перерисовки. */
function go(win, hash) {
  win.location.hash = hash;
  win.dispatchEvent(new win.Event('hashchange'));
  return new Promise(r => setTimeout(r, 30));
}

const text = el => (el ? el.textContent.replace(/\s+/g, ' ') : '');
const q = (win, sel) => win.document.querySelector(sel);

/* --------------------------------------------------------------- проверки --- */

async function checkRouterView() {
  console.log('\nМой роутер (Windows): карточка подключения');
  const win = boot('windows');
  await go(win, '#/router');

  const btn = q(win, '#rosProbeBtn');
  ok('есть кнопка «Опросить»', !!btn);
  ok('есть кнопка «Проверить доступность»', !!q(win, '#rosCheckBtn'),
    'без неё нельзя отличить закрытый порт от неверного пароля');

  const help = q(win, '.ros-help');
  ok('есть памятка про политики API', !!help);
  const helpText = text(help);
  ok('памятка упоминает политику api', /api/.test(helpText) && /group/.test(helpText));
  ok('памятка упоминает rest-api', /rest-api/.test(helpText));
  ok('памятка упоминает 2FA', /TOTP|двухфактор/i.test(helpText));
  ok('памятка предупреждает про Address в /ip service', /\/ip service print/.test(helpText));
}

async function checkProbeFailure() {
  console.log('\nМой роутер: разбор неудачного опроса');
  const win = boot('windows');
  await go(win, '#/router');

  win.__routes['/api/router/probe'] = () => ({
    ok: false,
    error: 'Роутер отклонил логин или пароль (ответил сам роутер, не программа)',
    kind: 'auth',
    address: '192.168.88.1',
    attempts: [
      { transport: 'rest', port: 443, stage: 'connect', ok: false, kind: 'connect', detail: 'порт закрыт — сервис выключен' },
      { transport: 'api', port: 8728, stage: 'login', ok: false, kind: 'auth', detail: 'роутер: invalid user name or password (6)' }
    ],
    hints: ['Проверьте раскладку и лишние пробелы в пароле', 'Проверьте политику api у группы']
  });

  const pass = q(win, '#rosPass');
  if (pass) pass.value = 'secret';
  q(win, '#rosProbeBtn').click();
  await new Promise(r => setTimeout(r, 80));

  const out = text(q(win, '#rosOut'));
  ok('показан текст ошибки', /отклонил логин или пароль/.test(out));
  ok('показана таблица попыток', !!q(win, '#rosOut table'), 'человек должен видеть, где споткнулись');
  ok('видны оба транспорта', /rest/.test(out) && /api/.test(out));
  ok('виден ответ роутера дословно', /invalid user name or password/.test(out));
  ok('видны подсказки', /Проверьте раскладку/.test(out) && /политику api/.test(out));
  ok('порт 443 и 8728 в таблице', /443/.test(out) && /8728/.test(out));
}

async function checkPortCheck() {
  console.log('\nМой роутер: «Проверить доступность»');
  const win = boot('windows');
  await go(win, '#/router');

  win.__routes['/api/router/check'] = () => ({
    ok: true,
    address: '192.168.88.1',
    open: [8291],
    ports: [
      { port: 8291, label: 'Winbox', open: true, detail: 'открыт — Winbox подключится' },
      { port: 8728, label: 'API', open: false, detail: 'закрыт — включите /ip service enable api' },
      { port: 443, label: 'REST (www-ssl)', open: false, detail: 'закрыт — включите www-ssl с сертификатом' }
    ]
  });

  q(win, '#rosCheckBtn').click();
  await new Promise(r => setTimeout(r, 80));

  const out = text(q(win, '#rosOut'));
  ok('показаны открытые и закрытые порты', /8291/.test(out) && /8728/.test(out));
  ok('объяснено, что API закрыт', /enable api/.test(out));
  ok('сказано, что Winbox открыт, а API нет', /Winbox \(8291\) открыт/.test(out));
}

async function checkDiscovery() {
  console.log('\nМой роутер: поиск в сети');
  const win = boot('windows');
  await go(win, '#/router');

  win.__routes['/api/router/discover'] = () => ({
    ok: true,
    found: [
      { address: '192.168.88.1', identity: 'office-gw', version: '7.16.2', board: 'RB951G-2HnD', source: 'mndp', mac: 'aa:bb:cc:dd:ee:ff', sameNet: true },
      { address: '172.17.0.1', identity: 'docker', version: '7.15', board: 'CHR', source: 'port', port: 8291, sameNet: false }
    ]
  });

  q(win, '#rosFindBtn').click();
  await new Promise(r => setTimeout(r, 80));

  const out = text(q(win, '#rosOut'));
  ok('своя сеть показана отдельно', /В вашей сети: 1/.test(out));
  ok('чужие адреса спрятаны в «Ещё в сети»', /Ещё в сети: 1/.test(out));
  ok('у найденного роутера видна плата и MAC', /RB951G-2HnD/.test(out) && /aa:bb:cc:dd:ee:ff/.test(out));
  ok('чужие адреса не выглядят как рабочие (внутри свёрнутого блока)',
    !!q(win, '#rosOut details'));
}

async function checkAndroidHint() {
  console.log('\nМой роутер (Android): без живого подключения');
  const win = boot('android');
  await go(win, '#/router');
  const card = text(win.document.querySelector('.content'));
  ok('объяснено, что API есть только в Windows-версии', /Windows-версии/.test(card));
  ok('памятка про политики доступна и на Android', !!q(win, '.ros-help'));
  ok('кнопки опроса не показаны', !q(win, '#rosProbeBtn'));
}

/* Мастер должен не «добавлять адрес рядом», а заменять заводскую адресацию:
   иначе роутер остаётся на 192.168.88.1, а клиенты — в старой подсети, и
   выглядит это как «IP не поменялся». */
async function checkWizardLan() {
  console.log('\nМастер: смена LAN и Wi-Fi');
  const win = boot('windows');

  // Модель rb951 — это RB951G-2HnD с пакетом wireless (wlan1). wifiKind не
  // задаём: тип Wi-Fi должен подставиться из модели, иначе мастер соберёт
  // команды пакета wifi, которых на этом роутере нет.
  const conf = win.eval(`(function(){
    const w = window.ConfigWizard;
    const o = Object.assign({}, w.defaults, {
      model: 'rb951', wan: 'dhcp', lanIp: '192.168.90.1', lanPrefix: 24,
      wifi: true, wifiSsid: 'Дом-90', wifiPass: 'Passw0rd!90',
      dhcp: true, dns: '1.1.1.1'
    });
    delete o.wifiKind;
    return w.generate(o).text || '';
  })()`);

  ok('адрес новой подсети добавлен', /\/ip address add address=192\.168\.90\.1\/24/.test(conf));
  ok('заводской адрес снимается только после проверки нового',
    /\/ip address remove \[\/ip address find where address="192\.168\.88\.1\/24"\]/.test(conf) &&
    /:if \(\[:len \[\/ip address find where address="192\.168\.90\.1\/24"\]\] > 0\)/.test(conf));
  ok('DHCP переводится на новый пул, а не создаётся вторым сервером',
    /\/ip dhcp-server set \[find interface=/.test(conf) && /address-pool=lan-pool/.test(conf));
  ok('сеть старой подсети убирается', /192\.168\.88\.0\/24/.test(conf));
  ok('Wi-Fi: имя сети из ответов мастера', /ssid="?Дом-90"?/.test(conf));
  // Для RB951G-2HnD — пакет wireless: настройка идёт на wlan1, а не на wifi1.
  ok('Wi-Fi legacy: настраивается wlan1', /\/interface wireless set wlan1 /.test(conf));
  ok('Wi-Fi legacy: пароль в профиле sec-lan', /security-profiles set \[find where name="sec-lan"\].*wpa2-pre-shared-key/.test(conf));
  ok('Wi-Fi legacy: команд пакета wifi нет', !/\/interface wifi /.test(conf));

  // Та же генерация на заводской подсети не должна ничего удалять.
  const defConf = win.eval(`(function(){
    const w = window.ConfigWizard;
    const o = Object.assign({}, w.defaults, { model: 'rb951', wan: 'dhcp', lanIp: '192.168.88.1', lanPrefix: 24, dhcp: true });
    return w.generate(o).text || '';
  })()`);
  ok('на заводской подсети адрес не удаляется',
    !/remove \[\/ip address find where address="192\.168\.88\.1\/24"\]/.test(defConf));

  // Строки с [find …] обязаны остаться как есть: их выполняет роутер.
  const hasExpr = /\[find default-name=wlan1\]|\[\/ip .*find where/.test(conf);
  ok('в конфиге есть выражения [ … ] (их выполняет роутер)', hasExpr);
}

/* Все экраны инструментов должны рисоваться без исключений.
   Раньше это ловил отдельный скрипт; теперь проверка живёт здесь, чтобы
   после правки одного экрана не падал другой (общие функции легко сломать). */
async function checkAllRoutes() {
  console.log('\nВсе экраны: рендер без исключений');
  const routes = [
    '#/', '#/tools', '#/wizard', '#/router', '#/win4', '#/subnet', '#/vlsm', '#/diff',
    '#/quiz', '#/audit', '#/diag', '#/glossary', '#/harden', '#/course', '#/models',
    '#/starred', '#/wifi', '#/keys', '#/coverage', '#/poe', '#/cheats', '#/examples',
    '#/backup', '#/settings', '#/about'
  ];
  const win = boot('windows');
  const errors = [];
  win.addEventListener('error', e => errors.push(String(e.message)));
  for (const r of routes) {
    try {
      win.location.hash = r;
      win.dispatchEvent(new win.Event('hashchange'));
      // route() рисует через requestAnimationFrame — даём кадру пройти
      await new Promise(done => setTimeout(done, 25));
      const html = win.document.getElementById('content').innerHTML;
      if (!html || html.length < 40) throw new Error('пустой экран');
    } catch (e) {
      errors.push(r + ': ' + (e && e.message));
    }
  }
  ok('все ' + routes.length + ' экранов рисуются', errors.length === 0, errors.join('; '));

  // статья: открывается и содержит шаги
  try {
    const id = win.eval('window.DATA[0].items[0].id');
    win.location.hash = '#/' + id;
    win.dispatchEvent(new win.Event('hashchange'));
    await new Promise(done => setTimeout(done, 25));
    const html = win.document.getElementById('content').innerHTML;
    ok('статья открывается по ссылке', /art-title/.test(html), 'id=' + id);
    ok('в статье есть шаги и схемы', /step/.test(html) && /(svg|scene)/.test(html), 'id=' + id);
  } catch (e) {
    ok('статья открывается по ссылке', false, String(e && e.message));
  }
}

/* ------------------------------------------------------------------- итог --- */

(async function main() {
  try {
    await checkRouterView();
    await checkProbeFailure();
    await checkPortCheck();
    await checkDiscovery();
    await checkAndroidHint();
    await checkWizardLan();
    await checkAllRoutes();
  } catch (e) {
    fails.push('исключение: ' + (e && e.stack ? e.stack.split('\n')[0] : e));
    console.error(e);
  }
  console.log('\nИтого: ' + pass + ' ок, ' + fails.length + ' проблем');
  if (fails.length) {
    fails.forEach(f => console.log('  · ' + f));
    process.exit(1);
  }
})();
