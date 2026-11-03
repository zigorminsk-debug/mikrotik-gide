/* Настольная версия (Windows): обновление прямо из программы.
   Файл подключается только локальным сервером Go — в Android его нет. */
(function () {
  'use strict';
  var TOKEN = '__MTG_TOKEN__';
  var VERSION = '__MTG_VERSION__';
  var state = { info: null, busy: false, version: VERSION, painted: false };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(id) { return document.getElementById(id); }
  function api(url, opts) {
    return fetch(url, opts || { cache: 'no-store' }).then(function (r) { return r.json(); });
  }
  function mb(n) {
    if (!n) return '';
    return (Math.round(n / 1048576 * 10) / 10).toString().replace('.', ',') + ' МБ';
  }

  function setState(text, kind) {
    var box = el('mtgState');
    if (!box) return;
    box.textContent = text;
    box.className = 'mtg-state' + (kind ? ' ' + kind : '');
  }

  function card() {
    var box = el('mtgUpd');
    if (!box || box.getAttribute('data-ready') === '1') return;
    box.setAttribute('data-ready', '1');
    state.painted = true;
    box.innerHTML =
      '<div class="set-card"><h3 class="card-h">' +
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 3v10m0 0 3.5-3.5M12 13 8.5 9.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' +
      'Обновление приложения</h3>' +
      '<div class="mtg-row"><span class="mtg-cur">Версия: <b>' + esc(state.version) + '</b> · Windows</span>' +
      '<span class="mtg-state" id="mtgState">Проверяю обновления…</span></div>' +
      '<div class="mtg-actions"><button class="btn primary" id="mtgCheck" type="button">Проверить обновление</button>' +
      '<button class="btn" id="mtgApply" type="button" style="display:none">Скачать и установить</button></div>' +
      '<div class="hint" style="margin-top:8px">Новая версия скачивается с GitHub, заменяет файл программы и запускается автоматически. ' +
      'Настройки, избранное и профиль окна сохраняются.</div></div>';
    el('mtgCheck').addEventListener('click', function () { check(false); });
    el('mtgApply').addEventListener('click', apply);
    if (state.info) render(state.info);
  }

  function render(info) {
    if (!info) return;
    if (info.available) {
      setState('Доступна версия ' + info.latest + (info.size ? ' · ' + mb(info.size) : ''), 'new');
      var b = el('mtgApply');
      if (b) b.style.display = '';
      banner(info.latest);
    } else {
      setState('Установлена последняя версия', 'ok');
      var a = el('mtgApply');
      if (a) a.style.display = 'none';
    }
  }

  function check(silent) {
    if (state.busy) return Promise.resolve();
    state.busy = true;
    if (!silent) setState('Проверяю…');
    return api('/api/update/check').then(function (r) {
      state.busy = false;
      if (!r || !r.ok) {
        setState('Не удалось проверить: ' + esc((r && r.error) || 'нет сети'));
        return;
      }
      state.info = r;
      render(r);
    }).catch(function () {
      state.busy = false;
      setState('Сервер обновления не отвечает');
    });
  }

  function apply() {
    var info = state.info;
    if (!info || !info.available) return;
    var btn = el('mtgApply');
    if (btn) { btn.disabled = true; btn.textContent = 'Скачиваю…'; }
    setState('Скачиваю ' + esc(info.asset) + '…');
    api('/api/update/apply', {
      method: 'POST',
      headers: { 'X-MTG-Token': TOKEN, 'Content-Type': 'application/json' },
      body: '{}'
    }).then(function (r) {
      if (!r || !r.ok) {
        setState('Ошибка: ' + esc((r && r.error) || 'не удалось установить'));
        if (btn) { btn.disabled = false; btn.textContent = 'Скачать и установить'; }
        return;
      }
      setState('Готово. Приложение перезапускается…', 'ok');
      if (btn) btn.textContent = 'Перезапуск…';
      if (window.MTG) window.MTG.restarting = true;
      setTimeout(function () { location.reload(); }, 6000);
    }).catch(function () {
      setState('Скачивание прервано');
      if (btn) { btn.disabled = false; btn.textContent = 'Скачать и установить'; }
    });
  }

  function banner(version) {
    if (el('mtgBanner')) return;
    var box = document.createElement('a');
    box.id = 'mtgBanner';
    box.className = 'mtg-banner';
    box.href = '#/about';
    box.innerHTML = '<b>Обновление ' + esc(version) + '</b><span>Открыть «О программе»</span>';
    document.body.appendChild(box);
    box.addEventListener('click', function () {
      setTimeout(function () { var b = el('mtgBanner'); if (b) b.remove(); }, 400);
    });
  }

  function paint() {
    if (location.hash === '#/about') {
      var box = el('mtgUpd');
      if (box && box.getAttribute('data-ready') !== '1') card();
    }
  }

  window.MTG = {
    platform: 'windows',
    version: VERSION,
    checkUpdate: function () { return check(false); },
    applyUpdate: apply
  };

  // heartbeat: локальный сервер понимает, что страница ещё открыта
  // ping идёт всегда, в том числе когда окно свёрнуто: иначе локальный сервер
  // решает, что страницу закрыли, и завершает процесс
  setInterval(function () {
    fetch('/api/ping', { cache: 'no-store' }).catch(function () {});
  }, 15000);

  api('/api/version').then(function (v) {
    if (v && v.version) {
      state.version = v.version;
      window.MTG.version = v.version;
      window.MTG.build = v.build;
      var cur = el('mtgCur');
      if (cur) cur.textContent = v.version;
    }
    paint();
    check(true);
  }).catch(function () { paint(); });

  window.addEventListener('hashchange', function () { setTimeout(paint, 40); });
  document.addEventListener('DOMContentLoaded', function () { setTimeout(paint, 80); });
  setTimeout(paint, 120);
})();
