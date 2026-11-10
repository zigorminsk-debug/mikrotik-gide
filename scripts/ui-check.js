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

  // Тексты как у Go-сервера (windows/rosdiag.go: loginRefusedHints).
  win.__routes['/api/router/probe'] = () => ({
    ok: false,
    error: 'Роутер отклонил вход по API (invalid user name or password). ' +
      'Это не всегда пароль — проверьте по списку ниже',
    kind: 'auth',
    address: '192.168.90.1',
    attempts: [
      { transport: 'rest', port: 443, stage: 'connect', ok: false, kind: 'protocol', detail: 'tls: handshake failure' },
      { transport: 'rest-http', port: 80, stage: 'connect', ok: false, kind: 'connect', detail: 'порт закрыт — сервис выключен' },
      { transport: 'api', port: 8728, stage: 'login', ok: false, kind: 'auth', detail: 'роутер: invalid user name or password (6)' }
    ],
    hints: [
      'Политика api у группы: /user group print detail — в строке policy должна быть api',
      'Ограничение адреса у пользователя: /user print detail where name=csladmin — поле address ' +
        'должно включать адрес этого компьютера. После смены подсети там часто остаётся старая 192.168.88.0/24.',
      'Двухфакторный вход (TOTP): с ним вход по API невозможен вообще — только Winbox или веб.'
    ]
  });

  const pass = q(win, '#rosPass');
  if (pass) pass.value = 'secret';
  q(win, '#rosProbeBtn').click();
  await new Promise(r => setTimeout(r, 80));

  const out = text(q(win, '#rosOut'));
  ok('показан текст ошибки', /отклонил вход по API/.test(out));
  ok('сказано, что это не всегда пароль', /не всегда пароль/.test(out));
  ok('подсказка про политику api', /policy должна быть api/.test(out));
  ok('подсказка про адрес пользователя с его логином', /name=csladmin/.test(out) && /192\.168\.88\.0\/24/.test(out));
  ok('подсказка про 2FA', /TOTP/.test(out));
  ok('показана таблица попыток', !!q(win, '#rosOut table'), 'человек должен видеть, где споткнулись');
  ok('видны оба транспорта', /rest/.test(out) && /api/.test(out));
  ok('виден ответ роутера дословно', /invalid user name or password/.test(out));
  ok('видны подсказки', /policy должна быть api/.test(out) && /TOTP/.test(out));
  ok('порт 443 и 8728 в таблице', /443/.test(out) && /8728/.test(out));
  ok('видно, что REST по http (80) тоже пробовали', /rest-http/.test(out) && /80/.test(out));
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

/* Если API закрыт, а REST отвечает, программа так и говорит: путь для
   проверки пароля есть, политики у путей разные. */
async function checkPortCheckRestOnly() {
  console.log('\nМой роутер: открыт только REST');
  const win = boot('windows');
  await go(win, '#/router');
  win.__routes['/api/router/check'] = () => ({
    ok: true,
    address: '192.168.90.1',
    open: [80, 8291],
    ports: [
      { port: 8291, label: 'Winbox', open: true, detail: 'открыт — Winbox подключится' },
      { port: 8728, label: 'API', open: false, detail: 'закрыт — включите /ip service enable api' },
      { port: 80, label: 'REST (www)', open: true, detail: 'открыт — REST по http:// тоже работает' }
    ]
  });
  q(win, '#rosCheckBtn').click();
  await new Promise(r => setTimeout(r, 80));
  const out = text(q(win, '#rosOut'));
  ok('сказано, что опрос пойдёт через REST', /опрос пойдёт через него/.test(out));
  ok('различаются политики rest-api и api', /rest-api/.test(out) && /api/.test(out));
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

/* Реальный случай: hAP ac³ (RBD53iG, IPQ4019) с пакетом wireless — wlan1/wlan2.
   Опрос отдаёт плату как «hAP ac^3» (так её печатает RouterOS в выгрузках), а
   код платы — RBD53iG-5HacD2HnD. Мастер обязан узнать модель и собрать команды
   /interface wireless, а не /interface wifi: иначе раздел Wi-Fi молча не
   выполняется, и SSID остаётся заводским MikroTik-8132E8. */
async function checkWifiPackage() {
  console.log('\nМастер: пакет Wi-Fi по плате роутера');
  const win = boot('windows');
  const model = (info) => win.eval('window.RosProbe.modelFor(' + JSON.stringify(info) + ')');

  ok('плата RBD53iG-5HacD2HnD → hAP ac³', model({ board: 'RBD53iG-5HacD2HnD' }) === 'hap_ac3');
  ok('плата «hAP ac^3» → hAP ac³', model({ board: 'hAP ac^3' }) === 'hap_ac3');
  ok('плата «hAP ac³» → hAP ac³', model({ board: 'hAP ac³' }) === 'hap_ac3');
  ok('плата C53UiG → hAP ax³', model({ board: 'C53UiG+5HPaxD2HPaxD' }) === 'hap_ax3');
  ok('плата C52iG → hAP ax²', model({ board: 'C52iG-5HaxD2HaxD' }) === 'hap_ax2');
  ok('неизвестная плата не притворяется моделью', model({ board: 'RB9999-XX' }) === '');

  // Паспорт роутера с wireless-пакетом должен вести к wlan1, а не wifi1.
  const fields = win.eval(`window.RosProbe.fieldsFor({
    board: 'RBD53iG-5HacD2HnD', version: '7.10.2', wifi: 'legacy',
    radios: ['wlan1', 'wlan2'], wifi5: true
  })`);
  ok('паспорт: тип Wi-Fi = legacy', fields.wifiKind === 'legacy');
  ok('паспорт: радио wlan1', fields.wifiRadio === 'wlan1');
  ok('паспорт: модель hAP ac³', fields.model === 'hap_ac3');

  const gen = (o) => win.eval('(function(){ const w = window.ConfigWizard;' +
    ' const o = Object.assign({}, w.defaults, ' + JSON.stringify(o) + ');' +
    ' return w.generate(o).text || ""; })()');

  // 1) Модель hAP ac³: только пакет wireless.
  const ac3 = gen({ model: 'hap_ac3', wan: 'dhcp', lanIp: '192.168.90.1', lanPrefix: 24,
    wifi: true, wifiSsid: 'Office', wifiPass: 'turbo2*(+', dhcp: true });
  ok('hAP ac³: команды на wlan1', /\/interface wireless set wlan1 /.test(ac3));
  ok('hAP ac³: SSID в команде для wlan1', /\/interface wireless set wlan1 [^\n]*ssid="?Office"?/.test(ac3));
  ok('hAP ac³: нет команд пакета wifi', !/\/interface wifi /.test(ac3));
  ok('hAP ac³: есть предупреждение о отсутствии пакета wireless',
    /ВНИМАНИЕ: на роутере нет пакета wireless/.test(ac3));

  // 2) Без модели и без wifiKind — по умолчанию wireless (большинство роутеров),
  //    а не молчаливый пакет wifi, как было.
  const unknown = gen({ wan: 'dhcp', wifi: true, wifiSsid: 'Office', wifiPass: 'Passw0rd!1', dhcp: true });
  ok('без модели выбран пакет wireless', /\/interface wireless set wlan1 /.test(unknown));
  ok('без модели нет команд пакета wifi', !/\/interface wifi /.test(unknown));

  // 3) Явно пакет wifi (hAP ax³) — обратная сторона: предупреждение про пакет wifi.
  const ax3 = gen({ model: 'hap_ax3', wifi: true, wifiKind: 'wifi', wifiSsid: 'Office',
    wifiPass: 'Passw0rd!1', dhcp: true, wan: 'dhcp' });
  ok('hAP ax³: профиль configuration в пакете wifi', /\/interface wifi configuration add /.test(ax3));
  ok('hAP ax³: предупреждение о отсутствии пакета wifi',
    /ВНИМАНИЕ: на роутере нет пакета wifi/.test(ax3));
}

/* Резервный интернет: два провайдера, проверка каждого канала своим пингом.
   Проверяем и статью (её читают), и генератор (по ней настраивают роутер). */
async function checkWanFailover() {
  console.log('\nРезервный интернет: пробы, пороги, возврат');
  const win = boot('windows');

  const art = win.eval(`(function(){
    const D = window.DATA || [];
    for (let i = 0; i < D.length; i++) {
      const its = D[i].items || [];
      for (let j = 0; j < its.length; j++) if (its[j].id === 'task-wan-failover') return its[j];
    }
    return null;
  })()`);
  ok('статья о резервном интернете есть', !!art);
  if (art) {
    ok('шагов не меньше десяти', (art.steps || []).length >= 10, 'шагов: ' + (art.steps || []).length);
    const shots = (art.steps || []).filter(s => s && s.sc);
    ok('у большинства шагов своя картинка', shots.length >= 8, 'с картинкой: ' + shots.length);
    const body = Array.isArray(art.config) ? art.config.join('\n') : String(art.config || '');
    ok('есть тело скрипта для копирования',
      /:local ups 6/.test(body) && /:local fails 3/.test(body));
    ok('проба идёт по шлюзу своего канала, а не по чужому адресу',
      /ip dhcp-client get \$c1 gateway/.test(body) && !/mark-routing/.test(body));
    ok('нет правки динамического маршрута', !/\/ip route set/.test(body));
    ok('нет ":set" без значения (синтаксическая ошибка)', !/:set\s+\$?\w+\s*;/m.test(body.replace(/\r/g, '\n')));
    ok('объяснено про возврат и «качели»',
      /возврат/i.test(art.purpose) && /(качел|дёрга)/i.test(art.purpose));
    // Скрипт вставляют руками, поэтому он должен быть синтаксически целым:
    // парные скобки и кавычки, без «висячих» комментариев в конце строк.
    const opens = (body.match(/\{/g) || []).length, closes = (body.match(/\}/g) || []).length;
    ok('скобки в теле скрипта парные', opens === closes, opens + ' открыто, ' + closes + ' закрыто');
    ok('кавычки в теле скрипта парные',
      (body.match(/"/g) || []).length % 2 === 0);
    ok('в теле скрипта нет комментариев после команды',
      !/^[^#\n]+#/m.test(body));
    ok('есть испытание с выдёргиванием кабеля',
      (art.steps || []).some(s => /выдерните кабель/i.test(s.d || '')));
    ok('есть ошибка про одинаковые адреса проверки',
      (art.mistakes || []).some(m => /одним адресом|шлюз своего канала/i.test(m)));
    ok('есть ошибка про динамический маршрут',
      (art.mistakes || []).some(m => /динамическ/i.test(m)));
  }

  const gen = (o) => win.eval('(function(){ const w = window.ConfigWizard;' +
    ' const o = Object.assign({}, w.defaults, ' + JSON.stringify(o) + ');' +
    ' return w.generate(o).text || ""; })()');
  const val = (o) => win.eval('(function(){ const w = window.ConfigWizard;' +
    ' const o = Object.assign({}, w.defaults, ' + JSON.stringify(o) + ');' +
    ' return w.validate(o) || []; })()');

  const base = { model: 'hap_ac3', wan: 'dhcp', wanPort: 'ether1', dhcp: true, nat: true,
    failover: true, wan1Kind: 'dhcp', wan2Kind: 'lte', wan2Port: 'lte1',
    wan1Probe: '1.1.1.1', wan2Check: '8.8.8.8', wanDownSecs: 20, wanUpSecs: 60 };
  const conf = gen(base);

  ok('нет отдельных таблиц проб (в v7 политика — не VRF)',
    !/routing table add name=probe-wan/.test(conf) && /routing table remove/.test(conf));
  ok('нет mangle для проб', !/mark-routing/.test(conf));
  ok('скрипт wan-failover создаётся', /\/system script add name=wan-failover/.test(conf));
  ok('скрипт обновляется на месте, а не remove + add',
    /system script set \[find where name="wan-failover"\]/.test(conf) &&
    !/system script remove/.test(conf));
  ok('планировщик зовёт скрипт явно (внятная ошибка в логе)',
    /on-event="\/system script run wan-failover"/.test(conf));
  ok('проба по шлюзу канала из DHCP', /dhcp-client get \$c1 gateway/.test(conf));
  ok('нет правки динамического маршрута (static-канал — законное исключение)',
    !/gateway~/.test(conf) && !/\*[0-9A-F]{8}/.test(conf));
  ok('нет ":set" без значения', !/(^|[^\\])r\\n:set\s+\$?\w+\s*;/.test(conf) &&
    !/\n:set\s+\$?\w+\s*;/m.test(conf));
  ok('скрипт хранится многострочным (\r\n)', /\\r\\n/.test(conf));
  ok('порог падения 2 проверки (20 с при шаге 10 с)', /:local fails 2/.test(conf));
  ok('порог возврата 6 проверок (60 с)', /:local ups 6/.test(conf));
  ok('возврат на основной включён', /default-route-distance=1/.test(conf));
  ok('уход на резерв включён', /default-route-distance=20/.test(conf));
  ok('резерв поднят с distance=2', /default-route-distance=2/.test(conf));
  ok('планировщик раз в 10 секунд и запуск явный',
    /system scheduler add name=wan-failover interval=10s start-time=startup on-event="\/system script run wan-failover"/.test(conf));

  // Другие пороги должны попасть в скрипт, а не остаться дефолтными.
  const slow = gen(Object.assign({}, base, { wanDownSecs: 30, wanUpSecs: 120 }));
  ok('пороги из мастера: 30 с → 3 проверки', /:local fails 3/.test(slow));
  ok('пороги из мастера: 120 с → 12 проверок', /:local ups 12/.test(slow));

  // PPPoE: и основной, и резервный — через pppoe-клиенты
  const ppp = gen(Object.assign({}, base, {
    wan: 'pppoe', pppoeUser: 'prov1', pppoePass: 'pass1', wan1Kind: 'pppoe',
    wan2Kind: 'pppoe', wan2Port: 'ether5', wan2PppoeUser: 'prov2', wan2PppoePass: 'pass2'
  }));
  ok('резервный PPPoE-клиент создаётся с логином',
    /pppoe-client add name=wan2-pppoe interface=ether5 user="?prov2"?/.test(ppp));
  ok('PPPoE-резерв с расстоянием 2', /default-route-distance=2/.test(ppp));
  ok('для PPPoE distance меняется у клиента, а не у dhcp',
    /interface pppoe-client set \[find name=wan-pppoe\] default-route-distance=20/.test(ppp));

  const bad = val(Object.assign({}, base, { wan2Check: '1.1.1.1' }));
  ok('одинаковые адреса проверки — ошибка',
    bad.some(i => i.level === 'error' && /различаться/.test(i.msg)));
  const badUp = val(Object.assign({}, base, { wanDownSecs: 20, wanUpSecs: 5 }));
  ok('возврат быстрее падения не проходит проверку',
    badUp.some(i => i.level === 'error' && /Возврат на основной/.test(i.msg)));
  const badSecs = val(Object.assign({}, base, { wanDownSecs: 1 }));
  ok('слишком короткий порог падения не проходит',
    badSecs.some(i => i.level === 'error' && /Падение канала/.test(i.msg)));

  // Страница статьи должна рисоваться и показывать копируемый скрипт.
  win.location.hash = '#/task-wan-failover';
  win.dispatchEvent(new win.Event('hashchange'));
  await new Promise(r => setTimeout(r, 60));
  const page = text(q(win, '#content'));
  ok('статья открывается по адресу', /Резервный интернет/.test(page));
  ok('на странице есть шаги', /Как это работает/.test(page));
  ok('на странице есть тело скрипта', /wan-failover/.test(page) && /:local ups 6/.test(page));
  ok('на странице есть испытание кабелем', /выдерните кабель/i.test(page));
  ok('под шагами стоят окна Winbox 4',
    win.document.querySelectorAll('.step-shot img, .step-shot .wb-num').length > 0);
  ok('под окнами есть расшифровка номеров', /1 — /.test(page) || /1 —/.test(page));
}

/* Раздел «Резервный интернет и VPN» и пошаговые картинки.

   Главная претензия к прошлой версии: на схеме стоял один номер без подписи,
   и по картинке нельзя было повторить настройку. Поэтому проверяем главное:
   у каждого шага-инструкции (scene.marks) есть список подписей, и КАЖДЫЙ номер
   из этого списка стоит на каком-то элементе окна — иначе номер повиснет
   в воздухе, а читатель не поймёт, куда нажимать. */
function sceneMarks(sc) {
  const out = [];
  const walk = function (o) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o.m) out.push(Number(o.m));
    for (const k in o) if (k !== 'm' && typeof o[k] === 'object') walk(o[k]);
  };
  walk(sc.rows); walk(sc.tools); walk(sc.rightTools);
  /* поля диалога: при разметке вкладок (поле t) renderer показывает только
     поля активной вкладки — иначе номер висел бы на невидимом поле */
  if (sc.form) {
    const tabMode = (sc.form.fields || []).some(f => f && f.t);
    const vis = tabMode ? (sc.form.fields || []).filter(f => !f.t || f.t === sc.form.tab) : (sc.form.fields || []);
    walk(vis);
    const rest = {};
    for (const k in sc.form) if (k !== 'fields') rest[k] = sc.form[k];
    walk(rest);
  }
  if (sc.menu) { if (sc.menu.grp) out.push(Number(sc.menu.grp)); if (sc.menu.sub) out.push(Number(sc.menu.sub)); }
  if (sc.tabMark) out.push(Number(sc.tabMarkN || 1));
  if (sc.form && sc.form.tabMark) out.push(Number(sc.form.tabMarkN || 1));
  if (sc.form && sc.form.tabMarks) Object.keys(sc.form.tabMarks).forEach(k => out.push(Number(sc.form.tabMarks[k])));
  return out;
}

function guideProblems(art) {
  const bad = [];
  (art.steps || []).forEach(function (st, i) {
    if (!st || !st.sc) return;
    const sc = st.sc;
    const n = (sc.notes || []).length;
    if (!sc.marks) { bad.push('шаг ' + (i + 1) + ': нет marks — картинка не в режиме инструкции'); return; }
    if (!n) { bad.push('шаг ' + (i + 1) + ': нет подписей под окном'); return; }
    const have = sceneMarks(sc);
    const miss = [];
    for (let k = 1; k <= n; k++) if (have.indexOf(k) < 0) miss.push(k);
    if (miss.length) bad.push('шаг ' + (i + 1) + ': номера без цели на окне — ' + miss.join(', '));
    const wrong = (sc.notes || []).filter(function (t, j) { return String(t).indexOf(String(j + 1) + ' —') !== 0; });
    if (wrong.length) bad.push('шаг ' + (i + 1) + ': подпись начинается не со своего номера — «' + wrong[0] + '»');
  });
  return bad;
}

async function checkNetVpn() {
  console.log('\nРаздел «Резервный интернет и VPN»: статьи и пошаговые картинки');
  const win = boot('windows');
  const info = win.eval(`(function(){
    const D = window.DATA || [];
    const g = D.filter(function (x) { return x.id === 'netvpn'; })[0] || null;
    const ids = [];
    D.forEach(function (x) { (x.items || []).forEach(function (a) { ids.push(a.id); }); });
    return {
      first: D[0] ? D[0].id : '',
      group: g ? g.items.map(function (a) { return a.id; }) : [],
      ids: ids,
      tasks: (D.filter(function (x) { return x.id === 'task'; })[0] || { items: [] }).items
        .map(function (a) { return a.id; }),
      ppp: (D.filter(function (x) { return x.id === 'ppp'; })[0] || { items: [] }).items
        .map(function (a) { return a.id; })
    };
  })()`);

  ok('первым в учебнике идёт раздел про резерв и VPN', info.first === 'netvpn', 'первый: ' + info.first);
  ok('раздел содержит статью о резервном интернете', info.group.indexOf('task-wan-failover') >= 0);
  ok('в разделе три статьи WireGuard',
    ['wg-server', 'wg-client-config', 'wg-site'].every(id => info.group.indexOf(id) >= 0));
  ok('в разделе есть L2TP/IPsec и OpenVPN',
    info.group.indexOf('ppp-l2tp-server') >= 0 && info.group.indexOf('ppp-ovpn-server') >= 0);
  ok('L2TP и OpenVPN не дублируются в PPP',
    info.ppp.indexOf('ppp-l2tp-server') < 0 && info.ppp.indexOf('ppp-ovpn-server') < 0);
  ok('статьи не дублируются в «Задачах»', info.tasks.indexOf('task-wan-failover') < 0);
  ok('идентификаторы статей уникальны',
    info.ids.length === new Set(info.ids).size,
    'всего ' + info.ids.length + ', уникальных ' + new Set(info.ids).size);

  const arts = win.eval(`(function(){
    const out = {};
    const D = window.DATA || [];
    for (let i = 0; i < D.length; i++) {
      const its = D[i].items || [];
      for (let j = 0; j < its.length; j++) {
        const a = its[j];
        if (['wg-server', 'wg-client-config', 'wg-site', 'ppp-l2tp-server', 'ppp-ovpn-server']
          .indexOf(a.id) >= 0) out[a.id] = a;
      }
    }
    return out;
  })()`);

  const want = {
    'wg-server': [/Listen Port/, /13231/, /Client Config|QR/, /Allowed Address/],
    'wg-client-config': [/QR/, /handshake/i],
    'wg-site': [/Endpoint/, /Allowed Address/, /Keepalive/i],
    'ppp-l2tp-server': [/Use IPsec/, /IPsec Secret/, /4500/, /Secrets/],
    'ppp-ovpn-server': [/Certificate/, /Sign/, /tls-client/, /1194/]
  };
  Object.keys(want).forEach(function (id) {
    const a = arts[id];
    ok('статья ' + id + ' есть', !!a);
    if (!a) return;
    ok(id + ': шагов не меньше шести', (a.steps || []).length >= 6, 'шагов: ' + (a.steps || []).length);
    const body = JSON.stringify({ steps: a.steps, purpose: a.purpose, usage: a.usage,
      mistakes: a.mistakes, warn: a.warn, check: a.check });
    ok(id + ': в тексте есть ключевые понятия',
      want[id].every(re => re.test(body)));
    const probs = guideProblems(a);
    ok(id + ': номера на картинках совпадают с подписями', probs.length === 0, probs.slice(0, 3).join('; '));
    ok(id + ': есть проверка результата', (a.check || []).length > 0);
  });

  // та же проверка для статьи о резервном интернете
  const fo = win.eval(`(function(){
    const D = window.DATA || [];
    for (let i = 0; i < D.length; i++) {
      const its = D[i].items || [];
      for (let j = 0; j < its.length; j++) if (its[j].id === 'task-wan-failover') return its[j];
    }
    return null;
  })()`);
  const foProbs = fo ? guideProblems(fo) : ['статьи нет'];
  ok('task-wan-failover: номера на картинках совпадают с подписями',
    foProbs.length === 0, foProbs.slice(0, 3).join('; '));

  // страница: под шагами должны быть и окна с номерами, и подписи к ним
  win.location.hash = '#/wg-server';
  win.dispatchEvent(new win.Event('hashchange'));
  await new Promise(r => setTimeout(r, 80));
  const doc = win.document;
  ok('страница wg-server рисуется', /WireGuard/.test(text(q(win, '#content'))));
  ok('под шагами стоят окна Winbox 4',
    doc.querySelectorAll('.step-shot img, .step-shot .wb-num').length > 0,
    'окон: ' + doc.querySelectorAll('.step-shot img, .step-shot .wb-num').length);
  ok('каждое окно под шагом подписано, что на нём',
    doc.querySelectorAll('.step-shot figcaption, .step-shot .shot-tag').length > 0,
    'подписей: ' + doc.querySelectorAll('.step-shot figcaption, .step-shot .shot-tag').length);

  const home = (function () {
    win.location.hash = '#/';
    win.dispatchEvent(new win.Event('hashchange'));
    return text(q(win, '#content'));
  })();
  ok('на главной есть карточка «Резервный интернет»', /Резервный интернет/.test(home));
  ok('на главной есть карточка WireGuard', /WireGuard/.test(home));
}

/* Интерфейс канала выбирается по типу подключения (LTE → lte1, кабель → ether1),
   а в мастере появились WireGuard-клиент, OpenVPN и SSTP — проверяем и UI, и генератор. */
async function checkWanAutoAndVpn() {
  console.log('\nМастер: интерфейс по типу канала и все VPN');
  const win = boot('windows');
  const gen = (o) => win.eval('(function(){ const w = window.ConfigWizard;' +
    ' const o = Object.assign({}, w.defaults, ' + JSON.stringify(o) + ');' +
    ' return w.generate(o).text || ""; })()');
  const val = (o) => win.eval('(function(){ const w = window.ConfigWizard;' +
    ' const o = Object.assign({}, w.defaults, ' + JSON.stringify(o) + ');' +
    ' return w.validate(o) || []; })()');

  // 1) Имя интерфейса по типу канала — одна функция на весь проект.
  const wif = (k, which) => win.eval('window.ConfigWizard.wanIfFor(' + JSON.stringify(k) + ',' +
    JSON.stringify(which || 'main') + ')');
  ok('LTE → lte1', wif('lte') === 'lte1', 'получили ' + wif('lte'));
  ok('кабель → ether1', wif('dhcp') === 'ether1', 'получили ' + wif('dhcp'));
  ok('PPPoE → ether1', wif('pppoe') === 'ether1');
  ok('резервный кабель → ether5', wif('dhcp', 'backup') === 'ether5');

  // 2) Основной канал по LTE сам получает lte1 и DHCP-клиента на модеме.
  const lteConf = gen({ model: 'hap_ac3', wan: 'lte', wan1Kind: 'lte', wanPort: '', dhcp: true,
    lanIp: '192.168.88.1', lanPrefix: 24, wg: false, l2tp: false, ovpn: false, sstp: false });
  ok('LTE-канал: адрес берётся на lte1',
    /\/ip dhcp-client add interface=lte1 /.test(lteConf), lteConf.split('\n').filter(l => /dhcp-client/.test(l))[0]);
  ok('LTE-канал: модем включается', /\/interface lte set \[find\] disabled=no/.test(lteConf));
  ok('LTE-канал: нет dhcp-client на ether1', !/dhcp-client add interface=ether1 /.test(lteConf));

  // 3) Противоречие «LTE + ether1» ловится предупреждением, а не молча.
  const bad = val({ wan: 'dhcp', wan1Kind: 'lte', wanPort: 'ether1' });
  ok('LTE с ether1 — предупреждение мастера',
    bad.some(x => /lte1/.test(x.msg || '')), JSON.stringify(bad.map(x => x.msg)));

  // 4) WireGuard в роли клиента.
  const wgCli = gen({ model: 'hap_ac3', wan: 'dhcp', dhcp: true, lanIp: '192.168.88.1', lanPrefix: 24,
    wg: true, wgMode: 'client', wgEndpoint: '203.0.113.20:13231', wgIp: '10.10.10.5',
    wgServerPub: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcdefg=', wgAllowed: '0.0.0.0/0', wgKeepalive: 25,
    l2tp: false, ovpn: false, sstp: false });
  ok('WireGuard-клиент: интерфейс wg-client', /\/interface wireguard add name=wg-client/.test(wgCli));
  ok('WireGuard-клиент: адрес и порт сервера в пире',
    /endpoint-address="203\.0\.113\.20" endpoint-port=13231/.test(wgCli));
  ok('WireGuard-клиент: keepalive держит NAT', /persistent-keepalive=25s/.test(wgCli));
  ok('WireGuard-клиент: маршрут в туннель', /\/ip route add dst-address=0\.0\.0\.0\/0 gateway=wg-client/.test(wgCli));
  ok('WireGuard-клиент: серверный порт не слушается', !/listen-port=13231/.test(wgCli));

  // 5) Сервер остался сервером — регрессия.
  const wgSrv = gen({ model: 'hap_ac3', wan: 'dhcp', dhcp: true, lanIp: '192.168.88.1', lanPrefix: 24,
    wg: true, wgMode: 'server', wgIp: '10.10.10.1', wgPort: 13231, l2tp: false, ovpn: false, sstp: false });
  ok('WireGuard-сервер: wg0 и listen-port', /name=wg0 listen-port=13231/.test(wgSrv));
  ok('WireGuard-сервер: правило udp для входа', /protocol=udp dst-port=13231/.test(wgSrv));

  // 6) OpenVPN: CA → серверный сертификат → сервер.
  const ovpn = gen({ model: 'hap_ac3', wan: 'dhcp', dhcp: true, lanIp: '192.168.88.1', lanPrefix: 24,
    wg: false, l2tp: false, sstp: false, ovpn: true, ovpnCn: 'vpn.example.com', ovpnPort: 1194,
    ovpnUser: 'ivanov', ovpnPass: 'S3cret-2026' });
  ok('OpenVPN: центр сертификации', /\/certificate add name=vpn-ca .*key-cert-sign,crl-sign/.test(ovpn));
  ok('OpenVPN: серверный сертификат с CN', /common-name="vpn\.example\.com".*tls-server/.test(ovpn));
  ok('OpenVPN: клиентский сертификат', /\/certificate add name=cli-1 .*tls-client/.test(ovpn));
  ok('OpenVPN: сервер включён на 1194',
    /\/interface ovpn-server server set enabled=yes port=1194/.test(ovpn));
  ok('OpenVPN: учётная запись service=ovpn', /\/ppp secret add name=ivanov .* service=ovpn/.test(ovpn));
  ok('OpenVPN: порт открыт в firewall', /chain=input protocol=tcp dst-port=1194 action=accept/.test(ovpn));

  // 7) SSTP: тот же CA, но TCP 443.
  const sstp = gen({ model: 'hap_ac3', wan: 'dhcp', dhcp: true, lanIp: '192.168.88.1', lanPrefix: 24,
    wg: false, l2tp: false, ovpn: false, sstp: true, sstpPort: 443, sstpUser: 'petrov', sstpPass: 'Pass-2026' });
  ok('SSTP: сервер на 443', /\/interface sstp-server server set enabled=yes port=443/.test(sstp));
  ok('SSTP: учётная запись service=sstp', /\/ppp secret add name=petrov .* service=sstp/.test(sstp));
  ok('SSTP: сертификат берётся из общего CA', /certificate=vpn-server/.test(sstp));

  // 8) Валидация клиентских полей.
  const noEnd = val({ wg: true, wgMode: 'client', wgEndpoint: '', wgServerPub: '' });
  ok('WireGuard-клиент без адреса сервера — ошибка',
    noEnd.some(x => x.level === 'error' && /wgEndpoint|адрес/i.test(x.msg || '')), JSON.stringify(noEnd.map(x => x.msg)));
  const badPort = val({ ovpn: true, ovpnPort: 99999 });
  ok('Порт OpenVPN вне диапазона — ошибка', badPort.some(x => x.level === 'error' && /ovpnPort|OpenVPN/i.test(x.msg || '')));

  // 9) UI: поля и группы на месте, режим WireGuard переключает набор полей.
  win.location.hash = '#/wizard';
  win.dispatchEvent(new win.Event('hashchange'));
  await new Promise(done => setTimeout(done, 40));
  const doc = win.document;
  const has = (id) => !!doc.getElementById(id);
  ok('мастер: выбор роли WireGuard', has('w-wgMode'));
  ok('мастер: поля клиента WireGuard', ['w-wgEndpoint', 'w-wgServerPub', 'w-wgAllowed', 'w-wgKeepalive'].every(has));
  ok('мастер: поля OpenVPN', ['w-ovpnCn', 'w-ovpnPort', 'w-ovpnUser', 'w-ovpnPass'].every(has));
  ok('мастер: поля SSTP', ['w-sstpPort', 'w-sstpUser', 'w-sstpPass'].every(has));
  ok('мастер: LTE есть в списке основного канала',
    Array.prototype.some.call(doc.querySelectorAll('#w-wan option'), o => o.value === 'lte'));

  // смена типа канала переставляет интерфейс автоматически
  const setSel = (id, v) => {
    const el = doc.getElementById(id);
    el.value = v;
    el.dispatchEvent(new win.Event('change'));
  };
  const setVal = (id, v) => { const el = doc.getElementById(id); if (el) el.value = v; };
  setVal('w-wan2Port', 'ether1');
  setVal('w-wan1Port', 'ether1');
  setSel('w-wan1Kind', 'lte');
  await new Promise(done => setTimeout(done, 20));
  ok('смена типа основного на LTE → lte1',
    doc.getElementById('w-wan1Port').value === 'lte1', doc.getElementById('w-wan1Port').value);
  setSel('w-wan2Kind', 'lte');
  await new Promise(done => setTimeout(done, 20));
  ok('смена типа резерва на LTE → lte1',
    doc.getElementById('w-wan2Port').value === 'lte1', doc.getElementById('w-wan2Port').value);
  setSel('w-wan1Kind', 'dhcp');
  setSel('w-wan2Kind', 'dhcp');
  await new Promise(done => setTimeout(done, 20));
  ok('возврат к кабелю: основной ether1', doc.getElementById('w-wan1Port').value === 'ether1');
  ok('возврат к кабелю: резерв ether5', doc.getElementById('w-wan2Port').value === 'ether5');

  // переключение роли WireGuard показывает нужные поля
  const wgSwitch = doc.getElementById('w-wg');
  if (wgSwitch && !wgSwitch.classList.contains('on')) wgSwitch.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  setSel('w-wgMode', 'client');
  await new Promise(done => setTimeout(done, 20));
  const gSrv = doc.querySelector('[data-g="wgServer"]');
  const gCli = doc.querySelector('[data-g="wgClient"]');
  ok('роль «клиент» прячет серверные поля', gSrv && gSrv.classList.contains('off'));
  ok('роль «клиент» показывает клиентские поля', gCli && !gCli.classList.contains('off'));
  setSel('w-wgMode', 'server');
  await new Promise(done => setTimeout(done, 20));
  ok('роль «сервер» возвращает порт', gSrv && !gSrv.classList.contains('off'));
}

/* Бэкап и отправка конфигурации на e-mail должны быть в любом собранном конфиге:
   это последняя линия обороны, когда роутер «окирпичился» или унесли. */
async function checkBackupMail() {
  console.log('\nБэкап и конфигурация на e-mail — во всех конфигурациях');
  const win = boot('windows');
  const gen = (o) => win.eval('(function(){ const w = window.ConfigWizard;' +
    ' const o = Object.assign({}, w.defaults, ' + JSON.stringify(o) + ');' +
    ' return w.generate(o).text || ""; })()');
  const val = (o) => win.eval('(function(){ const w = window.ConfigWizard;' +
    ' const o = Object.assign({}, w.defaults, ' + JSON.stringify(o) + ');' +
    ' return w.validate(o) || []; })()');

  const base = { model: 'hap_ac3', wan: 'dhcp', dhcp: true, lanIp: '192.168.88.1', lanPrefix: 24,
    mailServer: 'smtp.yandex.ru', mailPort: 587, mailFrom: 'router@mail.by', mailTo: 'admin@mail.by',
    mailUser: 'router', mailPass: 'app-pass' };

  // 1) Флаги не заданы — раздел всё равно есть: он включён по умолчанию.
  const conf = gen(base);
  ok('раздел бэкапа есть без явных флагов', /Бэкап и отправка конфигурации на e-mail/.test(conf));
  ok('скрипт backup-mail создаётся',
    /\/system script add name=backup-mail policy=[^\n]*source=\{/.test(conf));
  ok('сохраняется резервная копия .backup',
    /\/system backup save name=\$tag dont-encrypt=yes/.test(conf));
  ok('делается текстовый экспорт .rsc', /\/export file=\(\$tag \. "-cfg"\)/.test(conf));
  ok('отправляются два письма', (conf.match(/\/tool e-mail send/g) || []).length === 2);
  ok('к письму приложен .backup', /file=\(\$tag \. "\.backup"\)/.test(conf));
  ok('к письму приложен .rsc', /file=\(\$tag \. "-cfg\.rsc"\)/.test(conf));
  ok('планировщик на 03:30 каждый день',
    /\/system scheduler add name=backup-mail start-time=03:30:00 interval=1d on-event=backup-mail/.test(conf));
  ok('SMTP настроен ровно один раз', (conf.match(/\/tool e-mail set/g) || []).length === 1);

  // 2) Время из мастера попадает в планировщик.
  ok('время бэкапа из мастера', /start-time=02:15:00|start-time=02:15/.test(gen(Object.assign({}, base, { backupTime: '02:15' }))));

  // 3) Раздел можно выключить — тогда ни скрипта, ни планировщика.
  const off = gen(Object.assign({}, base, { backupMail: false, autobackup: false }));
  ok('бэкап отключается флагом', !/backup-mail/.test(off), 'осталось: ' + (off.match(/backup-mail/g) || []).length);

  // 4) Вместе с письмом о падении канала SMTP настраивается один раз.
  const both = gen(Object.assign({}, base, { mail: true }));
  ok('уведомления + бэкап: один /tool e-mail set',
    (both.match(/\/tool e-mail set/g) || []).length === 1,
    'нашли ' + (both.match(/\/tool e-mail set/g) || []).length);

  // 5) Файлы прошлых дней убираются, чтобы не забивать flash.
  ok('старые копии удаляются на роутере', /\/file remove \[find where name~"\^bak-"/.test(conf));

  // 6) Валидация: заглушки и неверное время.
  const warn = val(Object.assign({}, base, { mailTo: 'admin@example.com' }));
  ok('заглушка example.com — предупреждение',
    warn.some(x => /example\.com/.test(x.msg || '')), JSON.stringify(warn.map(x => x.msg)));
  const badTime = val(Object.assign({}, base, { backupTime: 'ночью' }));
  ok('неверное время бэкапа ловится', badTime.some(x => /backupTime|03:30/.test(x.msg || '')));

  // 7) Каждый готовый пример конфигурации заканчивается таким же блоком.
  const ex = win.eval(`(function(){
    const all = window.EXAMPLES || [];
    return all.map(function (x) {
      const b = (x.blocks || []).filter(function (z) { return /backup-mail/.test(String(z.c || '')); });
      return { id: x.id, h: b.length ? String(b[0].h || '') : '', code: b.length ? String(b[0].c) : '' };
    });
  })()`);
  ok('примеров конфигов не меньше одиннадцати', ex.length >= 11, 'всего ' + ex.length);
  ok('в каждом примере есть блок «Бэкап и конфиг на e-mail»',
    ex.every(x => x.h === 'Бэкап и конфиг на e-mail'),
    ex.filter(x => x.h !== 'Бэкап и конфиг на e-mail').map(x => x.id).join(', '));
  ok('в блоке примера есть скрипт, планировщик и два письма',
    ex.every(x => /\/system script add name=backup-mail/.test(x.code) &&
      /\/system scheduler add name=backup-mail/.test(x.code) &&
      (x.code.match(/\/tool e-mail send/g) || []).length === 2));

  // 8) UI мастера: переключатель и время на месте, поля SMTP видны.
  win.location.hash = '#/wizard';
  win.dispatchEvent(new win.Event('hashchange'));
  await new Promise(done => setTimeout(done, 40));
  const doc = win.document;
  ok('мастер: переключатель бэкапа на почту', !!doc.getElementById('w-backupMail'));
  ok('мастер: время отправки', !!doc.getElementById('w-backupTime'));
  const sw = doc.getElementById('w-backupMail');
  const backGrp = doc.querySelector('[data-g="backupMail"]');
  const mailGrp = doc.querySelector('[data-g="mail"]');
  ok('мастер: бэкап включён по умолчанию', sw && sw.classList.contains('on'));
  ok('мастер: время видно при включённом бэкапе', backGrp && !backGrp.classList.contains('off'));
  ok('мастер: поля SMTP видны ради бэкапа', mailGrp && !mailGrp.classList.contains('off'));
  if (sw) sw.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await new Promise(done => setTimeout(done, 20));
  ok('мастер: выключение убирает поля времени', doc.querySelector('[data-g="backupMail"]').classList.contains('off'));
}

/* Примеры из жизни и настоящие снимки Winbox 4: у каждой статьи должен быть
   разбор реального случая, а под шагом — либо живой снимок, либо схема окна
   с честной подписью. Плюс дерево меню должно совпадать с Winbox 4. */
async function checkCasesAndShots() {
  console.log('\nПримеры из жизни и настоящие снимки Winbox 4');
  const win = boot('windows');

  // 1) Пример из жизни есть у каждой статьи.
  const audit = win.eval(`(function(){
    const C = window.CASES || {};
    let arts = 0, withCase = 0, shortCase = [];
    (window.DATA || []).forEach(function (g) {
      (g.items || []).forEach(function (a) {
        arts++;
        const c = C[a.id];
        if (!c) return;
        withCase++;
        if (!c.s || !c.d || !c.r || c.s.length < 40 || c.d.length < 40) shortCase.push(a.id);
      });
    });
    return { arts: arts, withCase: withCase, shortCase: shortCase };
  })()`);
  ok('статей в учебнике не меньше двухсот', audit.arts >= 200, 'статей: ' + audit.arts);
  ok('пример из жизни есть у каждой статьи', audit.withCase === audit.arts,
    'с примером ' + audit.withCase + ' из ' + audit.arts);
  ok('в примерах заполнены ситуация, действия и результат', audit.shortCase.length === 0,
    audit.shortCase.slice(0, 5).join(', '));

  // 2) Пример показывается в статье и попадает в экспорт.
  win.location.hash = '#/ip-firewall-filter';
  win.dispatchEvent(new win.Event('hashchange'));
  await new Promise(d => setTimeout(d, 40));
  let html = win.document.getElementById('content').innerHTML;
  ok('карточка «Пример из жизни» на странице статьи', /Пример из жизни/.test(html));
  ok('в примере есть «что сделали» и «что получилось»',
    /Что сделали/.test(html) && /Что получилось/.test(html));

  // 3) Дерево меню — как в Winbox 4 (порядок из живых снимков).
  const menu = win.eval('window.Scene._menu.map(g => g.g)');
  const iFiles = menu.indexOf('Files'), iLog = menu.indexOf('Log');
  const iTerm = menu.indexOf('New Terminal'), iRadius = menu.indexOf('RADIUS'), iTools = menu.indexOf('Tools');
  ok('в дереве есть New Terminal и RADIUS', iTerm > 0 && iRadius > 0, menu.join(', '));
  ok('порядок как в Winbox 4: Files → Log → New Terminal → RADIUS → Tools',
    iFiles < iLog && iLog < iTerm && iTerm < iRadius && iRadius < iTools);

  // 4) Настоящие снимки: галерея цела, а под шагом — только проверенная пара.
  const shots = win.eval(`(function(){
    const G = window.WIN4_SHOTS || [], S = window.SHOT_STEPS || {};
    const gallery = {}, mapped = {}; let objects = 0;
    G.forEach(function (x) { gallery[x.f] = x; });
    Object.keys(S).forEach(function (id) {
      Object.keys(S[id]).forEach(function (k) {
        const v = S[id][k];
        if (typeof v !== 'string') { objects++; return; }
        mapped[v] = (mapped[v] || 0) + 1;
      });
    });
    return { gallery: gallery, mapped: mapped, objects: objects,
             wg: (S['wg-site'] || {})[3] || null,
             hosts: (S['if-bridge-hosts'] || {})[0] || null };
  })()`);
  const fs2 = require('fs');
  const dir = path.join(ROOT, 'app/src/main/assets/www/img/shots');
  const onDisk = fs2.readdirSync(dir).filter(f => /\.jpg$/i.test(f));
  const missing = Object.keys(shots.gallery).filter(f => onDisk.indexOf(f) < 0);
  const extra = onDisk.filter(f => !shots.gallery[f]);
  const badMap = Object.keys(shots.mapped).filter(f => !shots.gallery[f]);
  ok('все снимки галереи лежат в img/shots', missing.length === 0, missing.join(', '));
  ok('в img/shots нет кадров вне галереи/карантина', extra.length === 0, extra.join(', '));
  ok('привязки шагов не используют fallback-объекты', shots.objects === 0, 'объектов: ' + shots.objects);
  ok('привязанные снимки есть в галерее', badMap.length === 0, badMap.join(', '));
  ok('шаг «Адрес в туннеле» не получил чужой ip-address.jpg',
    shots.wg !== 'ip-address.jpg', 'привязка: ' + shots.wg);
  ok('проверенный шаг Bridge Hosts показывает свой снимок',
    shots.hosts === 'bridge-hosts.jpg', 'привязка: ' + shots.hosts);

  win.location.hash = '#/wg-site';
  win.dispatchEvent(new win.Event('hashchange'));
  await new Promise(d => setTimeout(d, 40));
  html = win.document.getElementById('content').innerHTML;
  ok('«Адрес в туннеле» wg-site не показывает чужой 10.0.2.15/24',
    !/img\/shots\/ip-address\.jpg/.test(html) || /10\.10\.10\.5\/32/.test(html));

  /* Жалоба «почему все скрины одинаковые»: статья с одной схемой показывала
     её под каждым шагом. Одно окно — одна картинка, дальше отсылка наверх. */
  win.location.hash = '#/ppp-profiles';
  win.dispatchEvent(new win.Event('hashchange'));
  await new Promise(d => setTimeout(d, 60));
  const picSets = win.eval(`(function(){
    const hosts = document.querySelectorAll('.step-shot');
    const signs = [], refs = document.querySelectorAll('.shot-same').length;
    hosts.forEach(function (h) {
      const svg = h.querySelector('svg'), img = h.querySelector('img');
      if (svg) signs.push('win:' + (h.getAttribute('data-win') || ''));
      else if (img) signs.push('img:' + img.getAttribute('src'));
    });
    return { total: signs.length, unique: new Set(signs).size, refs: refs };
  })()`);
  ok('одно и то же окно не повторяется под каждым шагом',
    picSets.total === picSets.unique,
    'картинок ' + picSets.total + ', разных ' + picSets.unique);
  ok('вместо повтора — отсылка к шагу, где окно показано', picSets.refs > 0,
    'отсылок: ' + picSets.refs);

  win.location.hash = '#/if-bridge-hosts';
  win.dispatchEvent(new win.Event('hashchange'));
  await new Promise(d => setTimeout(d, 40));
  html = win.document.getElementById('content').innerHTML;
  ok('под проверенным шагом показывается настоящий снимок Winbox 4',
    /<img[^>]+img\/shots\/bridge-hosts\.jpg/.test(html));
  ok('снимок подписан как скриншот Winbox 4', /Скриншот настоящего Winbox 4/.test(html));

  /* Просмотрщик проверяем из галереи: он общий для шага и галереи. */
  win.location.hash = '#/win4';
  win.dispatchEvent(new win.Event('hashchange'));
  await new Promise(d => setTimeout(d, 40));
  ok('галерея показывает все опубликованные кадры',
    win.document.querySelectorAll('#w4Grid .w4-fig').length === Object.keys(shots.gallery).length);
  const shotLink = win.document.querySelector('#w4Grid a.shot-link');
  ok('снимок открывается своей кнопкой-ссылкой', !!shotLink && !shotLink.target);
  if (shotLink) {
    shotLink.click();
    await new Promise(d => setTimeout(d, 60));
    ok('снимок открылся полноэкранным слоем', !!win.document.querySelector('.shot-layer'));
    ok('у слоя есть кнопка закрытия', !!win.document.querySelector('.shot-close'));
    ok('есть масштаб 1:1 без размытия', !!win.document.querySelector('.shot-layer .zoom-ctl button:last-child'));
    const backBtn = win.document.getElementById('backBtn');
    if (backBtn) backBtn.click();
    await new Promise(d => setTimeout(d, 80));
    ok('«Назад» закрывает снимок, а не уводит из галереи',
      !win.document.querySelector('.shot-layer') && win.location.hash === '#/win4');
  }

  // 5) Под каждым шагом — либо настоящий снимок, либо честно подписанная
  //    схема. Проверяем на всех статьях, где ещё остались схемы.
  const schemeArticles = ['#/tool-ping', '#/sw-vlan', '#/mpls-ldp', '#/sys-scheduler'];
  let sawScheme = false, badScheme = false;
  for (const route of schemeArticles) {
    win.location.hash = route;
    win.dispatchEvent(new win.Event('hashchange'));
    await new Promise(d => setTimeout(d, 40));
    html = win.document.getElementById('content').innerHTML;
    if (!/shot-tag/.test(html)) continue;
    sawScheme = true;
    if (!/Схема окна Winbox 4/.test(html)) badScheme = true;
  }
  ok('схема (если осталась) подписана как схема', !badScheme,
    sawScheme ? '' : 'схем не осталось — все шаги на настоящих снимках');

  // 6) Галерея живых снимков открывается и грузит картинки.
  win.location.hash = '#/win4';
  win.dispatchEvent(new win.Event('hashchange'));
  await new Promise(d => setTimeout(d, 40));
  html = win.document.getElementById('content').innerHTML;
  ok('галерея «Окна Winbox 4» рисуется', /img\/shots\//.test(html));
  ok('в галерее есть настоящие файлы снимков', /\.jpg/.test(html));
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
    await checkPortCheckRestOnly();
    await checkWizardLan();
    await checkWanFailover();
    await checkWanAutoAndVpn();
    await checkBackupMail();
    await checkCasesAndShots();
    await checkNetVpn();
    await checkWifiPackage();
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
