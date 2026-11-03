/* =========================================================================
   rosprobe.js — опрос настоящего роутера и подстройка конфига под его версию.

   Браузер не умеет открывать TCP к порту 8728, поэтому опрос делает
   Windows-версия программы (Go-сервер): /api/router/probe, /api/router/discover,
   /api/router/saved. На Android этих адресов нет — там версия вводится вручную,
   а профиль версии считается тем же кодом.

   API:
     RosProbe.available()                 — доступен ли автоопрос
     RosProbe.profile('7.24.6')           — возможности версии
     RosProbe.probe(addr, user, pass)     — опросить роутер
     RosProbe.discover()                  — найти роутеры в сети
     RosProbe.saved() / forget(addr)      — сохранённые паспорта
     RosProbe.modelFor(info)              — id модели для мастера
     RosProbe.fieldsFor(info)             — поля мастера под этот роутер
     RosProbe.summary(info)               — короткая строка «7.24.6 · RB951G-2HnD»
   ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------- профиль версии */

  function profile(v) {
    const raw = String(v == null ? '' : v).trim();
    const m = raw.match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
    const major = m ? +m[1] : 0;
    const minor = m ? +m[2] : 0;
    const patch = m && m[3] ? +m[3] : 0;
    const known = !!m;
    return {
      raw: raw,
      known: known,
      major: major, minor: minor, patch: patch,
      v7: known && major >= 7,
      v6: known && major > 0 && major < 7,
      /* /interface wifi (пакет wifi) появился в 7.1, но привычная схема
         security/configuration/datapath — с 7.13 */
      wifiPackage: known && major >= 7 && minor >= 13,
      wifiBeta: known && major === 7 && minor < 13,
      wireguard: known && major >= 7,          // WireGuard только в 7.x
      restApi: known && major >= 7,            // REST (www-ssl) только в 7.x
      servicePorts: known && major >= 7,       // /ip firewall service-ports — 7.x
      containers: known && (major > 7 || (major === 7 && minor >= 4)),
      loginChallenge: known && (major < 6 || (major === 6 && minor < 43)),
      text: known ? (major + '.' + minor + (patch ? '.' + patch : '')) : (raw || 'не определена')
    };
  }

  /* --------------------------------------------------------------- доступ */

  function base() {
    if (typeof location === 'undefined') return null;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return null;
    return '/api/router';
  }

  function available() {
    return !!base() && !!(window.APP_PLATFORM === 'windows' || window.MTG);
  }

  function request(path, body) {
    const root = base();
    if (!root) return Promise.reject(new Error('автоопрос доступен только в Windows-версии'));
    const opt = body == null
      ? { method: 'GET', headers: { 'Accept': 'application/json' } }
      : { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) };
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    if (ctrl) opt.signal = ctrl.signal;
    const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 25000) : null;
    return fetch(root + path, opt)
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'ответ сервера не разобран (HTTP ' + r.status + ')' }; }); })
      .then(function (j) {
        if (timer) clearTimeout(timer);
        return j;
      })
      .catch(function (e) {
        if (timer) clearTimeout(timer);
        throw new Error(e && e.name === 'AbortError' ? 'роутер не ответил за 25 секунд' : 'нет связи с локальным сервером программы');
      });
  }

  function probe(address, user, password, save) {
    return request('/probe', { address: address, user: user, password: password, save: save !== false })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'не удалось опросить роутер');
        return j.info;
      });
  }

  function discover() {
    return request('/discover', null).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'поиск не удался');
      return j.found || [];
    });
  }

  function saved() {
    return request('/saved', null).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'не удалось прочитать список');
      return { list: j.saved || [], last: j.last || null };
    });
  }

  function forget(address) {
    return request('/saved', { address: address }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'не удалось удалить');
      return true;
    });
  }

  /* -------------------------------------------------- подстройка под роутер */

  /* Плата RouterOS → id модели в мастере. Порядок важен: сначала точные. */
  const BOARD = [
    [/rb951/i, 'rb951'],
    [/rb760|hex\s*s/i, 'hexs'],
    [/rb960|hex\s*poe/i, 'hexpoe'],
    [/rb750gr3|^hex$/i, 'hex'],
    [/rb2011|rb3011/i, 'rb3011'],
    [/rb4011/i, 'rb4011'],
    [/rb5009/i, 'rb5009'],
    [/crs3\d\d/i, 'crs328'],
    [/l009/i, 'l009'],
    [/cap\s*ax/i, 'cap_ax'],
    [/cap\s*ac|cap\s*l/i, 'cap_ac'],
    [/wap\s*ac/i, 'wap_ac'],
    [/hap\s*ax\s*lite/i, 'hap_ax_lite'],
    [/hap\s*ax\s*2/i, 'hap_ax2'],
    [/hap\s*ax\s*3|ax3/i, 'hap_ax3'],
    [/hap\s*ac\s*2|hap\s*ac²/i, 'hap_ac2'],
    [/hap\s*ac\s*3|hap\s*ac³/i, 'hap_ac3'],
    [/hap\s*lite/i, 'hap_lite']
  ];

  function modelFor(info) {
    if (!info) return '';
    const hay = [info.board, info.model, info.identity].filter(Boolean).join(' ');
    for (let i = 0; i < BOARD.length; i++) {
      if (BOARD[i][0].test(hay)) return BOARD[i][1];
    }
    return '';
  }

  /* поля мастера, которые надо подставить по паспорту роутера */
  function fieldsFor(info) {
    const out = {};
    if (!info) return out;
    const model = modelFor(info);
    if (model) out.model = model;
    if (info.version) out.rosVersion = info.version;
    if (info.board) out.rosBoard = info.board;
    if (info.firmware) out.rosFirmware = info.firmware;
    if (info.wifi === 'wifi' || info.wifi === 'legacy') {
      out.wifi = true;
      out.wifiKind = info.wifi;
      const radios = (info.radios || []).filter(Boolean);
      out.wifiRadio = radios[0] || (info.wifi === 'wifi' ? 'wifi1' : 'wlan1');
      if (radios[1]) out.wifiRadio5 = radios[1];
      out.wifi5 = !!info.wifi5;
    } else if (info.wifi === 'none') {
      out.wifi = false;
    }
    return out;
  }

  function summary(info) {
    if (!info) return '';
    const parts = [];
    if (info.version) parts.push('RouterOS ' + info.version);
    if (info.board) parts.push(info.board);
    if (info.firmware) parts.push('прошивка ' + info.firmware);
    if (info.wifi === 'wifi') parts.push('пакет wifi');
    if (info.wifi === 'legacy') parts.push('пакет wireless');
    if (info.wifi === 'none') parts.push('без Wi-Fi');
    return parts.join(' · ');
  }

  window.RosProbe = {
    available: available,
    profile: profile,
    probe: probe,
    discover: discover,
    saved: saved,
    forget: forget,
    modelFor: modelFor,
    fieldsFor: fieldsFor,
    summary: summary
  };
})();
