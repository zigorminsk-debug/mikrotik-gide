/* =========================================================================
   app.js — навигация, статьи, поиск, размер шрифта, проверка обновлений
   ========================================================================= */
(function () {
  'use strict';

  const GROUPS = window.DATA || [];
  const $ = function (s, r) { return (r || document).querySelector(s); };

  /* безопасное хранилище: localStorage может быть недоступен (file://, приватный режим).
     Если он недоступен — работаем в памяти, чтобы интерфейс не ломался. */
  const memStore = Object.create(null);
  const ls = (function () {
    try {
      const s = window.localStorage;
      s.setItem('__probe', '1');
      s.removeItem('__probe');
      return s;
    } catch (e) { return null; }
  })();
  const store = {
    get: function (k) {
      if (ls) { try { return ls.getItem(k); } catch (e) { } }
      return k === '__proto__' ? null : (k in memStore ? memStore[k] : null);
    },
    set: function (k, v) {
      if (ls) { try { ls.setItem(k, String(v)); return; } catch (e) { } }
      memStore[k] = String(v);
    },
    del: function (k) {
      if (ls) { try { ls.removeItem(k); } catch (e) { } }
      delete memStore[k];
    }
  };

  const REPO = 'zigorminsk-debug/mikrotik-gide';
  const API_LATEST = 'https://api.github.com/repos/' + REPO + '/releases/latest';
  const RELEASES_URL = 'https://github.com/' + REPO + '/releases';

  /* ---------------- иконки ---------------- */
  const ICONS = {
    start: '<path d="M5 12l7-7 7 7M7 11v8h10v-8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    iface: '<rect x="3" y="8" width="18" height="8" rx="2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M7 12h2M11 12h2M15 12h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    bridge: '<rect x="3" y="14" width="7" height="6" rx="1.5" stroke="currentColor" stroke-width="1.7" fill="none"/><rect x="14" y="14" width="7" height="6" rx="1.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M6.5 14V6h11v8" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
    ip: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M3.5 12h17M12 3.5c2.6 3 2.6 14 0 17M12 3.5c-2.6 3-2.6 14 0 17" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    svc: '<path d="M12 3l7 4v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    system: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    task: '<path d="M6 4h9l4 4v12H6z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M9 11h7M9 14.5h7M9 17.5h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 0 4 23" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M4 5.5v13" stroke="currentColor" stroke-width="1.6"/>',
    down: '<path d="M12 4v10m0 0l4-4m-4 4l-4-4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 18v1.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V18" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    info: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M12 11v5M12 8.2v.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
    gear: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
  };
  function svg(name, size) {
    const p = ICONS[name] || ICONS.book;
    return '<svg viewBox="0 0 24 24" width="' + (size || 16) + '" height="' + (size || 16) + '">' + p + '</svg>';
  }

  /* ---------------- индекс статей ---------------- */
  const FLAT = [];
  GROUPS.forEach(function (g) {
    (g.items || []).forEach(function (a) {
      a._group = g;
      FLAT.push(a);
    });
  });
  const BY_ID = {};
  FLAT.forEach(function (a) { BY_ID[a.id] = a; });

  const LVL = { 1: 'База', 2: 'Средний', 3: 'Продвинутый' };

  /* ---------------- избранное и прогресс чтения ---------------- */
  const FAV_KEY = 'fav', READ_KEY = 'read';

  function favs() {
    try {
      const v = JSON.parse(store.get(FAV_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function isFav(id) { return favs().indexOf(id) >= 0; }
  function toggleFav(id) {
    const a = favs();
    const i = a.indexOf(id);
    if (i >= 0) a.splice(i, 1); else a.push(id);
    store.set(FAV_KEY, JSON.stringify(a));
    buildFavBox();
    syncFavBtn();
  }
  function readMap() {
    try {
      const v = JSON.parse(store.get(READ_KEY) || '{}');
      return (v && typeof v === 'object') ? v : {};
    } catch (e) { return {}; }
  }
  function markRead(id) {
    touchDay();
    const m = readMap();
    if (!m[id]) {
      m[id] = 1;
      store.set(READ_KEY, JSON.stringify(m));
      refreshProgress();
    }
  }
  function readCount() { return Object.keys(readMap()).length; }

  /* серия дней: какие дни открывали статьи */
  function isoOf(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function pluralDays(n) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return 'дней подряд';
    if (b === 1) return 'день подряд';
    if (b >= 2 && b <= 4) return 'дня подряд';
    return 'дней подряд';
  }
  function dayList() {
    try {
      const v = JSON.parse(store.get('days') || '[]');
      return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }) : [];
    } catch (e) { return []; }
  }
  function touchDay() {
    const d = isoOf(new Date());
    const l = dayList();
    if (l[l.length - 1] === d) return;
    l.push(d);
    while (l.length > 400) l.shift();
    store.set('days', JSON.stringify(l));
  }
  function streak() {
    const set = {};
    dayList().forEach(function (d) { set[d] = 1; });
    const cur = new Date();
    cur.setHours(0, 0, 0, 0);
    if (!set[isoOf(cur)]) cur.setDate(cur.getDate() - 1);
    let n = 0;
    for (let guard = 0; guard < 400; guard++) {
      if (!set[isoOf(cur)]) break;
      n++;
      cur.setDate(cur.getDate() - 1);
    }
    return n;
  }
  function weekStrip() {
    const set = {};
    dayList().forEach(function (d) { set[d] = 1; });
    const names = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const out = [];
    for (let k = 6; k >= 0; k--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - k);
      const on = set[isoOf(d)];
      out.push('<span class="wd' + (on ? ' on' : '') + (k === 0 ? ' today' : '') + '" title="' + isoOf(d) + '">' +
        names[d.getDay()] + '<i></i></span>');
    }
    return '<div class="week-strip">' + out.join('') + '</div>';
  }

  /* ---------------- размер шрифта ---------------- */
  const FS_STEPS = [0.9, 1, 1.08, 1.18, 1.3, 1.45, 1.6, 1.8];
  let fsIdx = 1;
  (function initFs() {
    const saved = parseInt(store.get('fs') || '1', 10);
    fsIdx = isNaN(saved) ? 1 : Math.min(FS_STEPS.length - 1, Math.max(0, saved));
    document.documentElement.setAttribute('data-fs', String(fsIdx));
  })();

  function applyFs(next) {
    fsIdx = Math.min(FS_STEPS.length - 1, Math.max(0, next));
    document.documentElement.setAttribute('data-fs', String(fsIdx));
    store.set('fs', String(fsIdx));
    syncFsUi();
  }
  function syncFsUi() {
    const pct = Math.round(FS_STEPS[fsIdx] * 100) + '%';
    ['#fsPct', '#fsPctTop'].forEach(function (sel) {
      const n = $(sel); if (n) n.textContent = pct;
    });
    const dn = $('#fontDown'); if (dn) dn.disabled = fsIdx === 0;
    const up = $('#fontUp'); if (up) up.disabled = fsIdx === FS_STEPS.length - 1;
    const dn2 = $('#fsDown2'); if (dn2) dn2.disabled = fsIdx === 0;
    const up2 = $('#fsUp2'); if (up2) up2.disabled = fsIdx === FS_STEPS.length - 1;
  }

  /* ---------------- сайдбар ---------------- */
  const sidebarScroll = $('#sidebarScroll');
  const sidebar = $('#sidebar');

  const SIDE_LINKS = [
    { href: '#/harden', ic: 'svc', t: 'Защита от взлома', sub: 'чек-лист по меню Winbox' },
    { href: '#/tools', ic: 'gear', t: 'Инструменты', sub: 'мастер, калькуляторы, квиз' },
    { href: '#/starred', ic: 'svc', t: 'Избранное и заметки', sub: 'мои статьи, заметки, прочитанное' },
    { href: '#/backup', ic: 'down', t: 'Мои данные', sub: 'резервная копия и перенос' },
    { href: '#/about', ic: 'info', t: 'О программе', sub: 'build ' + (window.APP_VERSION || 'dev') }
  ];

  function markSideLink() {
    const id = (location.hash || '#/').slice(2).split('/')[0];
    Array.prototype.forEach.call(document.querySelectorAll('.side-link'), function (a) {
      a.classList.toggle('on', a.getAttribute('href') === '#/' + id);
    });
  }

  function buildSidebar() {
    const frag = document.createDocumentFragment();
    const title = document.createElement('div');
    title.className = 'side-title';
    title.textContent = 'Меню Winbox 4 и задачи';
    frag.appendChild(title);

    const links = document.createElement('div');
    links.className = 'side-links';
    SIDE_LINKS.forEach(function (x) {
      const a = document.createElement('a');
      a.className = 'side-link';
      a.href = x.href;
      a.innerHTML = '<span class="sl-ico">' + svg(x.ic, 16) + '</span>' +
        '<span class="sl-tx"><b>' + x.t + '</b><span>' + x.sub + '</span></span>' +
        '<span class="sl-chev"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      a.addEventListener('click', closeSidebar);
      links.appendChild(a);
    });
    frag.appendChild(links);

    const divider = document.createElement('div');
    divider.className = 'side-div';
    frag.appendChild(divider);

    const favBox = document.createElement('div');
    favBox.className = 'fav-box';
    favBox.id = 'favBox';
    frag.appendChild(favBox);

    GROUPS.forEach(function (g) {
      const wrap = document.createElement('div');
      wrap.className = 'grp';
      wrap.dataset.gid = g.id;

      const head = document.createElement('button');
      head.className = 'grp-head';
      head.innerHTML = '<span class="grp-ico">' + svg(g.ic, 15) + '</span><span>' + g.name +
        '</span><span class="cnt" data-g="' + g.id + '"></span><span class="chev"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      head.addEventListener('click', function () { wrap.classList.toggle('open'); });
      wrap.appendChild(head);

      const items = document.createElement('div');
      items.className = 'grp-items';
      (g.items || []).forEach(function (a) {
        const link = document.createElement('a');
        link.className = 'item';
        link.href = '#/' + a.id;
        link.dataset.id = a.id;
        link.innerHTML = '<span>' + a.t + '</span>' +
          (a.lvl ? '<span class="lvl l' + a.lvl + '">' + (a.lvl === 1 ? 'base' : a.lvl === 2 ? 'mid' : 'pro') + '</span>' : '');
        link.addEventListener('click', function () { closeSidebar(); });
        items.appendChild(link);
      });
      wrap.appendChild(items);
      frag.appendChild(wrap);
    });
    sidebarScroll.innerHTML = '';
    sidebarScroll.appendChild(frag);

    buildFavBox();
    refreshProgress();

    const foot = $('#sidebarFoot');
    if (foot) foot.innerHTML = '';
    markSideLink();
  }

  function buildFavBox() {
    const box = $('#favBox');
    if (!box) return;
    const ids = favs().filter(function (id) { return BY_ID[id]; });
    if (!ids.length) {
      box.innerHTML = '<div class="fav-empty">Отмечайте статьи звёздочкой ★ — они появятся здесь</div>';
      return;
    }
    box.innerHTML = '<div class="fav-h">' + svg('svc', 13) + 'Избранное</div>' +
      ids.map(function (id) {
        const a = BY_ID[id];
        return '<a class="item fav" href="#/' + a.id + '"><span>' + esc(a.t) + '</span></a>';
      }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.item'), function (el) {
      el.addEventListener('click', closeSidebar);
    });
  }

  function syncFavBtn() {
    const b = $('#favBtn');
    if (!b) return;
    const cur = location.hash.replace(/^#\/?/, '').split('?')[0];
    const on = isFav(cur);
    b.classList.toggle('on', on);
    b.textContent = on ? '★' : '☆';
    b.setAttribute('aria-label', on ? 'Убрать из избранного' : 'В избранное');
  }

  function refreshProgress() {
    const m = readMap();
    Array.prototype.forEach.call(document.querySelectorAll('.grp'), function (grp) {
      const gid = grp.dataset.gid;
      const g = GROUPS.filter(function (x) { return x.id === gid; })[0];
      if (!g) return;
      let done = 0;
      (g.items || []).forEach(function (a) { if (m[a.id]) done++; });
      const cnt = grp.querySelector('.cnt');
      if (cnt) {
        cnt.textContent = done ? done + '/' + g.items.length : '';
      }
    });
    Array.prototype.forEach.call(sidebarScroll.querySelectorAll('.item'), function (el) {
      if (!el.dataset.id) return;
      el.classList.toggle('read', !!m[el.dataset.id]);
    });
    const stat = $('#readStat');
    if (stat) {
      const total = FLAT.length, done = Math.min(total, JSON.stringify(m) === '{}' ? 0 : Object.keys(m).length);
      stat.textContent = done + ' из ' + total + ' (' + Math.round(done * 100 / total) + '%)';
      const bar = $('#readBar');
      if (bar) bar.style.width = Math.round(done * 100 / total) + '%';
    }
    const st2 = $('#streakStat');
    if (st2) {
      const n = streak();
      st2.textContent = n;
      st2.parentNode.innerHTML = '<b id="streakStat">' + n + '</b> ' + pluralDays(n) +
        '<span>· занятия за последние 7 дней</span>';
    }
    const ws = $('.week-strip');
    if (ws) ws.outerHTML = weekStrip();
  }

  function markActive(id) {
    sidebarScroll.querySelectorAll('.item').forEach(function (a) {
      const on = a.dataset.id === id;
      a.classList.toggle('active', on);
      if (on) {
        const grp = a.closest('.grp');
        if (grp) grp.classList.add('open');
        if (a.scrollIntoView) { try { a.scrollIntoView({ block: 'nearest' }); } catch (e) { } }
      }
    });
  }

  function openSidebar() { sidebar.classList.add('open'); $('#scrim').classList.add('on'); }
  function closeSidebar() { sidebar.classList.remove('open'); $('#scrim').classList.remove('on'); }

  /* ---------------- утилиты ---------------- */
  function hlCfg(text) {
    if (window.HL && window.HL.cfg) return window.HL.cfg(text);
    return esc(text);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code class="inl">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  function card(title, iconName, inner, cls) {
    return '<section class="card ' + (cls || '') + '">' +
      (title ? '<h3 class="card-h">' + svg(iconName || 'book', 15) + title + '</h3>' : '') +
      inner + '</section>';
  }
  function hardenCount() {
    const g = window.HARDEN_GROUPS || [];
    let n = 0;
    g.forEach(function (x) { n += (x.items || []).length; });
    return n || 58;
  }

  function quizCount() {
    return (window.QUIZ || []).length || 215;
  }

  function warnIcon() {
    return '<svg viewBox="0 0 24 24" width="17" height="17"><path d="M12 4l8.5 15h-17z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M12 10v4M12 16.6v.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  }

  /* ---------------- главная ---------------- */
  function homeView() {
    const total = FLAT.length;
    const tasks = (GROUPS.filter(function (g) { return g.id === 'tasks'; })[0] || { items: [] }).items.length;
    const scenesCount = FLAT.reduce(function (n, a) { return n + ((a.scenes || []).length); }, 0);
    const stepsCount = FLAT.reduce(function (n, a) { return n + ((a.steps || []).length); }, 0);
    const quick = ['start-first-login', 'start-base-setup', 'task-wan-failover', 'wg-server',
      'wg-client-config', 'ip-firewall-nat', 'ip-dhcp-server', 'start-backup'];

    let html = '<div class="wrap">';
    html += '<div class="hero">' +
      '<h1>Учебник MikroTik<br>по меню Winbox 4</h1>' +
      '<p>Разбор каждого пункта и подпункта меню: назначение, где применяется, пошаговая настройка ' +
      'с окнами Winbox 4 и стрелками «куда нажимать». Плюс раздел готовых решений для продакшена — ' +
      'от базовой настройки до VLAN, VPN, балансировки, QoS и BGP.</p>' +
      '<div class="stats">' +
      '<div class="st"><b>' + total + '</b><span>статей</span></div>' +
      '<div class="st"><b>' + scenesCount + '</b><span>схем</span></div>' +
      '<div class="st"><b>' + stepsCount + '</b><span>шагов с окном</span></div>' +
      '<div class="st"><b>' + tasks + '</b><span>задач PROD</span></div>' +
      '<div class="st"><b>' + (window.APP_VERSION || 'dev') + '</b><span>сборка</span></div>' +
      '</div></div>';

    html += '<div class="tiles">';
    quick.forEach(function (id) {
      const a = BY_ID[id];
      if (!a) return;
      html += '<a class="tile" href="#/' + a.id + '"><span class="ti">' + svg(a._group.ic, 16) + '</span>' +
        '<b>' + esc(a.t) + '</b><span>' + esc(a.path || '') + '</span></a>';
    });
    html += '</div>';

    /* Раздел «Резервный интернет и VPN» — первым: именно его искали и не находили */
    html += '<div class="home-tools">' +
      toolCard('#/task-wan-failover', 'Резервный интернет', 'два провайдера, переключение по пингу — 15 шагов', 'ip') +
      toolCard('#/wg-server', 'WireGuard-сервер', 'доступ к своей сети с телефона и ПК', 'svc') +
      toolCard('#/wg-client-config', 'VPN на телефоне', 'QR-код и подключение за 5 минут', 'task') +
      toolCard('#/wg-site', 'MikroTik как VPN-клиент', 'филиал подключается к серверу офиса', 'svc') +
      toolCard('#/ppp-l2tp-server', 'L2TP/IPsec', 'VPN без приложений: Windows, Android, iPhone', 'svc') +
      toolCard('#/ppp-ovpn-server', 'OpenVPN и сертификаты', 'свой CA, серверный и клиентские сертификаты', 'svc') +
      toolCard('#/course', 'Курс за 7 дней', 'по дню за подход: статьи + практика', 'book') +
      toolCard('#/harden', 'Защита от взлома', hardenCount() + ' пунктов по меню Winbox — проверить роутер', 'svc') +
      toolCard('#/audit', 'Аудит конфига', 'вставьте /export — 24 проверки с оценкой', 'task') +
      toolCard('#/diag', 'Диагностика', 'если что-то не работает — пошагово', 'start') +
      toolCard('#/starred', 'Избранное и заметки', 'всё отмеченное и записанное', 'svc') +
      '</div>';

    const last = lastRead();
    if (last) {
      const la = BY_ID[last.id];
      html += '<a class="tile resume" href="#/' + la.id + '"><span class="ti">' + svg('book', 16) + '</span>' +
        '<b>Продолжить: ' + esc(la.t) + '</b><span>' + esc(la._group.name) + ' · вы остановились здесь</span></a>';
    }

    html += '<div class="set-card">' +
      '<h3 class="card-h">' + svg('system', 15) + 'Ваш прогресс</h3>' +
      '<div class="hint" style="margin:-2px 0 8px">Прочитано <b id="readStat">0 из ' + total + ' (0%)</b></div>' +
      '<div class="upd-bar"><i id="readBar" style="width:0%"></i></div>' +
      '<div class="streak-line"><b id="streakStat">' + (streak() || 0) + '</b> ' + pluralDays(streak()) +
      '<span>· занятия за последние 7 дней</span></div>' + weekStrip() +
      '<div class="hint" style="margin-top:8px">Статьи отмечаются прочитанными автоматически при открытии. ' +
      'Избранное — звёздочкой ★ в заголовке статьи.</div>' +
      '</div>';

    html += card('Приложение', 'gear',
      '<a class="list-row" href="#/settings"><span class="n">' + svg('gear', 13) + '</span>' +
      '<b>Настройки и проверка обновлений</b><span>v' + (window.APP_VERSION || '') + '</span></a>' +
      '<a class="list-row" href="#/about"><span class="n">' + svg('info', 13) + '</span>' +
      '<b>О программе и история релизов</b><span>что изменилось</span></a>');

    html += card('Инструменты', 'gear',
      '<div class="tools-grid small">' +
      toolCard('#/wizard', 'Мастер конфигурации', 'готовый .rsc по ответам', 'gear') +
      toolCard('#/subnet', 'Калькулятор подсетей', 'маска, диапазон, деление', 'ip') +
      toolCard('#/diff', 'Сравнить конфиги', 'что изменилось между экспортами', 'task') +
      toolCard('#/quiz', 'Самопроверка', '10 вопросов с разбором', 'book') +
      '</div>');

    GROUPS.forEach(function (g) {
      html += '<div class="sec-h"><h2>' + esc(g.name) + '</h2><span>' + (g.items || []).length + ' статей</span></div>';
      (g.items || []).forEach(function (a, i) {
        html += '<a class="list-row" href="#/' + a.id + '">' +
          '<span class="n">' + (i + 1) + '</span>' +
          '<b>' + esc(a.t) + '</b>' +
          '<span>' + (a.lvl ? LVL[a.lvl] : '') + '</span></a>';
      });
    });

    html += '<div class="card" style="margin-top:18px"><h3 class="card-h">' + svg('book', 15) + 'Про этот учебник</h3>' +
      '<p>Окна в статьях нарисованы по настоящему Winbox 4: та же светлая тема, синий заголовок с именем ' +
      'окна и открытого диалога, вкладки-чипы, поля с кнопками «−», «▾» и «+», панель инструментов ' +
      '(New / Enable / Disable / Remove), правая панель Copy и кнопки Cancel / Apply / OK внизу. ' +
      'Схемы масштабируются под экран телефона, кнопка «⤢ крупнее» открывает окно на весь экран. ' +
      'Красная рамка и стрелка с номером показывают, куда нажимать.</p>' +
      '<p>Команды в терминале копируются кнопкой Copy в его заголовке — вставьте их в Winbox → ' +
      'New Terminal или в SSH-сессию.</p></div>';

    html += '</div>';
    return html;
  }

  /* ---------------- статья ---------------- */
  function articleView(a) {
    const idx = FLAT.indexOf(a);
    const prev = FLAT[idx - 1], next = FLAT[idx + 1];
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span>' +
      '<span>' + esc(a._group.name) + '</span></div>';
    html += '<h1 class="art-title">' + esc(a.t) +
      '<button class="fav-btn" id="favBtn" aria-label="В избранное">☆</button></h1>';
    if (a.path) html += '<div class="art-path">' + svg('iface', 12) + esc(a.path) + '</div>';

    html += '<div class="badges">';
    if (a.lvl) html += '<span class="badge l' + a.lvl + '">' + LVL[a.lvl] + '</span>';
    html += '<span class="badge v7">RouterOS 7 / Winbox 4</span>';
    (a.tags || []).forEach(function (t) { html += '<span class="badge">' + esc(t) + '</span>'; });
    html += '</div>';

    html += '<div class="art-actions">' +
      '<button class="btn" id="shareArt">Поделиться</button>' +
      '<button class="btn" id="printArt">В PDF</button>' +
      '<button class="btn" id="htmlArt">В HTML</button>' +
      ((a.steps && a.steps.length) ? '<a class="btn" href="#/run/' + a.id + '">Режим на объекте</a>' : '') +
      '</div>';

    if (a.purpose) html += card('Назначение', 'book', '<p class="lead">' + inline(a.purpose) + '</p>');
    if (a.usage && a.usage.length) {
      html += card('Где применяется', 'iface', '<ul class="clean">' +
        a.usage.map(function (u) { return '<li>' + inline(u) + '</li>'; }).join('') + '</ul>');
    }
    const lifeCase = (window.CASES && window.CASES[a.id]) || null;
    if (lifeCase) {
      html += '<section class="card case-card"><h3 class="card-h">' + svg('book', 15) +
        'Пример из жизни</h3>' +
        '<p class="case-s">' + inline(lifeCase.s) + '</p>' +
        '<p><b>Что сделали.</b> ' + inline(lifeCase.d) + '</p>' +
        '<p><b>Что получилось.</b> ' + inline(lifeCase.r) + '</p></section>';
    }
    if (a.pros || a.cons) {
      html += '<section class="card"><h3 class="card-h">' + svg('svc', 15) + 'Плюсы и минусы</h3>' +
        '<div class="pc">' +
        '<div class="pc-col plus"><b>Плюсы</b><ul>' +
        (a.pros || []).map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul></div>' +
        '<div class="pc-col minus"><b>Минусы</b><ul>' +
        (a.cons || []).map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</ul></div>' +
        '</div></section>';
    }

    if (a.table) {
      html += '<section class="card"><h3 class="card-h">' + svg('book', 15) +
        (a.table.title || 'Сравнение') + '</h3><div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        (a.table.head || []).map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        (a.table.rows || []).map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
        }).join('') +
        '</tbody></table></div></section>';
    }

    if (a.warn) html += '<div class="warn"><span class="wi">' + warnIcon() + '</span><div><b>Важно.</b> ' + inline(a.warn) + '</div></div>';
    if (a.danger) html += '<div class="warn danger"><span class="wi">' + warnIcon() + '</span><div><b>Осторожно.</b> ' + inline(a.danger) + '</div></div>';

    if (a.steps && a.steps.length) {
      const withShots = shotsEnabled() && ((a.scenes && a.scenes.length) ||
        a.steps.some(function (s) { return s && typeof s === 'object' && s.sc; }));
      html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Инструкция по настройке</h3>' +
        (withShots ? '<div class="hint" style="margin:-4px 0 10px">Под каждым шагом — окно Winbox 4 ' +
          'с красными номерами на кнопках и полях, а под окном — расшифровка: что нажимать в порядке ' +
          '1, 2, 3 … Номера на картинке и в списке совпадают. Тап по окну открывает его на весь экран. ' +
          'Под шагами — снимки настоящего Winbox 4, сделанные на живом RouterOS: ' +
          'где окно шага ещё не снято, показано окно того же раздела меню, и это прямо ' +
          'написано в подписи. Схема с подписью «Схема окна Winbox 4» осталась только ' +
          'для окон, которых в снимках нет.</div>' : '') +
        '<ol class="steps">' +
        a.steps.map(function (s, i) {
          if (typeof s === 'string') {
            return '<li class="step"><div class="step-d">' + inline(s) + '</div>' +
              (withShots ? '<div class="step-shot" data-si="' + i + '"></div>' : '') + '</li>';
          }
          return '<li class="step"><div class="step-t">' + inline(s.t) + '</div>' +
            (s.d ? '<div class="step-d">' + inline(s.d) + '</div>' : '') +
            (withShots ? '<div class="step-shot" data-si="' + i + '"></div>' : '') + '</li>';
        }).join('') + '</ol></section>';
    }

    if (a.config) {
      const text = Array.isArray(a.config) ? a.config.join('\n') : String(a.config);
      html += '<section class="card"><h3 class="card-h">' + svg('task', 15) +
        'Готовый конфиг — можно копировать целиком</h3>' +
        '<div class="cfg"><div class="cfg-h"><span>' + esc(a.configTitle || 'RouterOS 7 · терминал') +
        '</span><span class="cfg-btns"><button class="copy">копировать</button>' +
        '<button class="share" data-share="cfg">поделиться</button></span></div><pre>' + hlCfg(text) + '</pre></div></section>';
    }

    if (a.scenes && a.scenes.length) {
      html += '<section class="card"><h3 class="card-h">' + svg('iface', 15) +
        'Winbox 4: куда нажимать</h3>' +
        '<div class="scene-cap" style="margin:-4px 0 10px">Тап по схеме или кнопка «⤢ крупнее» открывает её на весь экран</div>' +
        '<div id="scenesHost"></div></section>';
    }

    if (a.check && a.check.length) {
      html += '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Проверка результата</h3><div id="checkHost"></div></section>';
    }

    if (a.mistakes && a.mistakes.length) {
      html += card('Типичные ошибки', 'svc', '<ul class="clean">' +
        a.mistakes.map(function (m) { return '<li>' + inline(m) + '</li>'; }).join('') + '</ul>');
    }
    if (a.links && a.links.length) {
      html += card('Первоисточники', 'book', '<div class="badges" style="margin:0">' +
        a.links.map(function (l) {
          return '<a class="badge" href="' + esc(l.u) + '">' + esc(l.t) + ' ↗</a>';
        }).join('') + '</div>');
    }

    const myNote = notesGet(a.id);
    html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Мои заметки</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">Сохраняются только на этом устройстве — удобно для пометок по объекту.</div>' +
      '<textarea class="note-box" id="noteBox" rows="4" placeholder="Например: у клиента WAN на ether1, PPPoE-логин в паспорте, VLAN 30 — камеры…"></textarea>' +
      '<div class="note-foot"><span class="note-state" id="noteState">' + (myNote ? 'сохранено' : 'пусто') + '</span>' +
      '<button class="btn" id="noteClear">Очистить</button></div></section>';

    const rel = related(a);
    if (rel.length) {
      html += '<section class="card"><h3 class="card-h">' + svg('book', 15) + 'Смотрите также</h3>' +
        rel.map(function (r) {
          return '<a class="list-row" href="#/' + r.id + '"><span class="n">' + svg(r._group.ic, 13) +
            '</span><b>' + esc(r.t) + '</b><span>' + esc(r._group.name) + '</span></a>';
        }).join('') + '</section>';
    }

    html += '<div class="nav-foot">' +
      (prev ? '<a href="#/' + prev.id + '">← Предыдущий<b>' + esc(prev.t) + '</b></a>' : '<a href="#/">← На главную<b>Оглавление</b></a>') +
      (next ? '<a href="#/' + next.id + '" style="text-align:right">Следующий →<b>' + esc(next.t) + '</b></a>' : '<a href="#/tasks" style="text-align:right">Раздел →<b>Задачи PROD</b></a>') +
      '</div>';
    html += '</div>';
    return html;
  }

  /* похожие статьи: по общим тегам */
  function related(a) {
    const tags = a.tags || [];
    if (!tags.length) return [];
    const scored = FLAT.filter(function (x) { return x.id !== a.id; })
      .map(function (x) {
        let n = 0;
        (x.tags || []).forEach(function (t) { if (tags.indexOf(t) >= 0) n++; });
        return { a: x, n: n };
      })
      .filter(function (o) { return o.n > 0; })
      .sort(function (p, q) { return q.n - p.n; })
      .slice(0, 4);
    return scored.map(function (o) { return o.a; });
  }

  /* ---------------- схемы к каждому шагу ----------------
     У шага может быть своя схема: step.s — индекс в a.scenes, step.shot — что
     подсветить ({field, row, tab, tool}) или step.sc — объект схемы целиком.
     Если ничего не указано, окно подбирается по совпадению слов шага с
     содержимым схемы (заголовок, поля, колонки, заметки).               */
  const STOP = { 'это': 1, 'как': 1, 'для': 1, 'или': 1, 'что': 1, 'если': 1, 'при': 1,
    'все': 1, 'они': 1, 'где': 1, 'так': 1, 'его': 1, 'она': 1, 'это': 1, 'уже': 1,
    'надо': 1, 'нужно': 1, 'можно': 1, 'чтобы': 1, 'когда': 1, 'тоже': 1, 'этот': 1 };

  function stems(txt) {
    const out = String(txt == null ? '' : txt).toLowerCase().replace(/ё/g, 'е')
      .replace(/[^a-zа-я0-9]+/g, ' ').split(' ');
    const set = {};
    out.forEach(function (w) {
      if (w.length < 3 || STOP[w]) return;
      set[w.slice(0, 5)] = 1;
    });
    return set;
  }

  const SCENE_STEMS = typeof WeakMap === 'function' ? new WeakMap() : null;

  function sceneStems(sc) {
    if (SCENE_STEMS && SCENE_STEMS.has(sc)) return SCENE_STEMS.get(sc);
    const menu = [sc.cap, sc.win, sc.path, sc.tab];
    const parts = [sc.cap, sc.win, sc.path, sc.tab, sc.status];
    if (sc.tabs) parts.push(sc.tabs.join(' '));
    if (sc.notes) parts.push(sc.notes.join(' '));
    if (sc.tools) parts.push(sc.tools.map(function (b) { return b.t + ' ' + (b.title || ''); }).join(' '));
    if (sc.cols) parts.push(sc.cols.map(function (c) { return c.t || c; }).join(' '));
    if (sc.rows) {
      sc.rows.forEach(function (r) {
        r.forEach(function (c) { parts.push(c && typeof c === 'object' ? c.v : c); });
      });
    }
    if (sc.form) {
      parts.push(sc.form.title, sc.form.note);
      (sc.form.fields || []).forEach(function (f) { parts.push(f.l, f.v); });
    }
    const st = { all: stems(parts.join(' ')), menu: stems(menu.join(' ')) };
    if (SCENE_STEMS) SCENE_STEMS.set(sc, st);
    return st;
  }

  function overlap(a, b) {
    let n = 0;
    for (const k in a) if (b[k]) n++;
    return n;
  }

  function autoFocus(sc, st, info) {
    const raw = ' ' + ((info && info.__text) || '') + ' ';
    if (sc.form && sc.form.fields && sc.form.fields.length) {
      let best = -1, bestN = 0;
      sc.form.fields.forEach(function (f, i) {
        const n = overlap(st, stems((f.l || '') + ' ' + (f.v || '') + ' ' + (f.type || '')));
        if (n > bestN) { bestN = n; best = i; }
      });
      if (best >= 0) return { field: best };
    }
    if (sc.rows && sc.rows.length) {
      let best = -1, bestN = 0;
      sc.rows.forEach(function (r, i) {
        const n = overlap(st, stems(r.map(function (c) { return c && typeof c === 'object' ? c.v : c; }).join(' ')));
        if (n > bestN) { bestN = n; best = i; }
      });
      if (best >= 0) return { row: best };
    }
    if (sc.tabs && sc.tabs.length) {
      let best = -1, bestN = 0;
      sc.tabs.forEach(function (t, i) {
        const n = overlap(st, stems(t));
        if (n > bestN) { bestN = n; best = i; }
      });
      if (best >= 0) return { tab: best };
    }
    if (sc.tools && sc.tools.length) {
      let best = -1, bestN = 0;
      sc.tools.forEach(function (b, i) {
        const n = overlap(st, stems((b.t || '') + ' ' + (b.title || '')));
        if (n > bestN) { bestN = n; best = i; }
      });
      if (best >= 0) return { tool: best };
    }
    /* эвристика: «нажмите +», «создайте», «перейдите на вкладку» */
    if (sc.tools && /(нажм|кнопк|добав|созда|плюс)/.test(raw)) {
      for (let i = 0; i < sc.tools.length; i++) if (sc.tools[i].t === '+') return { tool: i };
      return { tool: 0 };
    }
    if (sc.tabs && /(вкладк|перейд|открой|закладк)/.test(raw)) {
      for (let i = 0; i < sc.tabs.length; i++) if (sc.tabs[i] !== sc.tab) return { tab: i };
      return { tab: 0 };
    }
    if (sc.form && (sc.form.fields || []).length && /(пол[ея]|укаж|введ|заполн|выбер|постав|включ)/.test(raw)) {
      return { field: 0 };
    }
    if (sc.rows && sc.rows.length && /(строк|выбер|найд|запис)/.test(raw)) {
      return { row: 0 };
    }
    /* последний вариант — подсветить путь окна: видно, где вы находитесь */
    return { path: true };
  }

  function stripMarks(sc) {
    const c = {};
    for (const k in sc) c[k] = sc[k];
    c.compact = true;
    if (sc.form) {
      const f = {};
      for (const k in sc.form) f[k] = sc.form[k];
      f.fields = (sc.form.fields || []).map(function (fd) {
        const x = {};
        for (const k2 in fd) x[k2] = fd[k2];
        x.m = 0;
        return x;
      });
      c.form = f;
    }
    if (sc.rows) {
      c.rows = sc.rows.map(function (r) {
        return r.map(function (cell) {
          const o = (cell && typeof cell === 'object') ? (function () { const y = {}; for (const k2 in cell) y[k2] = cell[k2]; return y; })() : { v: cell };
          o.m = 0;
          return o;
        });
      });
    }
    if (sc.tools) {
      c.tools = sc.tools.map(function (b) {
        const x = {};
        for (const k2x in b) x[k2x] = b[k2x];
        x.m = 0;
        return x;
      });
    }
    if (c.tabMark) c.tabMark = null;
    c.notes = [];
    return c;
  }

  function shotFor(sc, focus) {
    const c = {};
    for (const k in sc) c[k] = sc[k];
    c.compact = true;
    c.cap = sc.cap || ('Окно Winbox: ' + (sc.path || sc.win || 'RouterOS 7'));
    /* sc.marks — сцена-инструкция: номера и подписи к ним расставил автор
       статьи (marks:1). Автофокус здесь запрещён: он оставил бы на картинке
       один номер и одну подпись вместо пошагового списка 1, 2, 3 … */
    if (sc.marks) {
      delete c.focus;
      return c;
    }
    if (focus) c.focus = focus;
    else return stripMarks(sc);
    return c;
  }

  /* путь по меню из текста шага: «IP → Firewall → NAT» */
  function menuPath(text) {
    const t = String(text || '').replace(/\s+/g, ' ');
    const m = t.match(/([A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9 .\/\-]{0,26}?)\s*→\s*([^\n]{1,60})/);
    if (!m) return null;
    let head = m[1].replace(/^.*\s(и|или|затем|потом|далее|раздел|меню|вкладк[аеу]|пункт|окн[ое])\s+/i, '').trim();
    if (head.length > 18) head = head.split(' ').slice(-2).join(' ');
    const tail = m[2].split(/[:;,.()]/)[0].replace(/`/g, '').trim();
    if (!tail) return null;
    return (head ? head + ' → ' : '') + tail;
  }

  /* команды в тексте шага — покажем терминал */
  function stepCommands(text) {
    const out = [];
    const re = /`([^`]{2,120})`/g;
    let m;
    while ((m = re.exec(String(text || ''))) !== null) {
      const c = m[1].trim();
      if (/^\//.test(c)) out.push(c);
    }
    return out;
  }

  function stepSceneFor(a, i) {
    const steps = a.steps || [];
    const st = steps[i];
    const scenes = a.scenes || [];
    if (!st || typeof st === 'string') return null;
    if (st.noScene) return null;               /* шаг-объяснение: картинка не нужна */
    if (!scenes.length && !st.sc) return null;
    if (st.sc && typeof st.sc === 'object') {
      return { spec: shotFor(st.sc, st.shot || null), src: 'own' };
    }
    const text = (st.t || '') + ' ' + (st.d || '');
    const my = stems(text);
    const inWords = { __text: text };

    /* 1. шаг про терминал и в тексте есть команды — рисуем терминал */
    const cmds = stepCommands(text);
    if (cmds.length && /(терминал|terminal|консол|cli|командн)/i.test(text)) {
      return {
        spec: { term: true, compact: true, win: 'New Terminal', path: 'RouterOS 7',
          lines: cmds.map(function (c) { return { k: 'pr', t: c }; }) },
        src: 'own'
      };
    }
    if (st.s != null && scenes[st.s]) {
      const sc0 = scenes[st.s];
      return { spec: shotFor(sc0, st.shot || autoFocus(sc0, my, inWords)), src: 'map' };
    }
    let best = 0, bestN = 0;
    scenes.forEach(function (sc, j) {
      const w = sceneStems(sc);
      const n = overlap(my, w.all) + 2 * overlap(my, w.menu);
      if (n > bestN) { bestN = n; best = j; }
    });
    const sc = scenes[best];
    const focus = autoFocus(sc, my, inWords);
    /* 2. окно не подходит, но в шаге назван путь по меню — покажем меню */
    const mp = menuPath(text);
    if (mp && bestN < 3 && (!focus || focus.path)) return { spec: { nav: true, path: mp }, src: 'nav' };
    return { spec: shotFor(sc, focus), src: bestN ? 'auto' : 'fallback' };
  }

  function shotsEnabled() { return store.get('shots') !== '0'; }

  /* ---------------- заметки ---------------- */
  function notesAll() {
    try {
      const v = JSON.parse(store.get('notes') || '{}');
      return v && typeof v === 'object' ? v : {};
    } catch (e) { return {}; }
  }
  function notesGet(id) { return notesAll()[id] || ''; }
  function notesSet(id, text) {
    const all = notesAll();
    if (text && text.trim()) all[id] = text;
    else delete all[id];
    store.set('notes', JSON.stringify(all));
  }
  function notesCount() { return Object.keys(notesAll()).length; }

  /* ---------------- продолжить чтение ---------------- */
  function lastRead() {
    try {
      const v = JSON.parse(store.get('last') || 'null');
      return v && BY_ID[v.id] ? v : null;
    } catch (e) { return null; }
  }

  /* ---------------- тема: тёмная, светлая, как в системе ---------------- */
  const themeMQ = (window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null);

  function themePref() {
    const v = store.get('theme');
    return v === 'light' || v === 'auto' ? v : 'dark';
  }

  function applyTheme() {
    const pref = themePref();
    const resolved = pref === 'auto' ? (themeMQ && themeMQ.matches ? 'light' : 'dark') : pref;
    document.documentElement.setAttribute('data-theme', resolved);
    return resolved;
  }

  if (themeMQ) {
    const onChange = function () { if (themePref() === 'auto') applyTheme(); };
    if (themeMQ.addEventListener) themeMQ.addEventListener('change', onChange);
    else if (themeMQ.addListener) themeMQ.addListener(onChange);
  }

  /* ---------------- настройки ---------------- */
  function settingsView() {
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><span>Настройки</span></div>';
    html += '<h1 class="art-title">Настройки</h1>';

    html += '<div class="set-card">' +
      '<div class="set-row">' +
      '<div class="grow"><div class="lbl">Размер шрифта</div>' +
      '<div class="hint">Влияет на весь текст учебника. Схемы Winbox 4 масштабируются отдельно — кнопкой «⤢ крупнее».</div></div>' +
      '<div class="seg"><button id="fsDown2" aria-label="Меньше">A−</button>' +
      '<span class="val" id="fsPct">100%</span>' +
      '<button id="fsUp2" aria-label="Больше">A+</button></div>' +
      '</div>' +
      '<div class="set-row">' +
      '<div class="grow"><div class="lbl">Оформление</div><div class="hint">«Как в системе» — тема меняется вместе с Windows или Android; схемы Winbox всегда светлые</div></div>' +
      '<div class="seg" id="themeSeg">' +
      '<button data-th="dark"' + (themePref() === 'dark' ? ' class="on"' : '') + '>Тёмная</button>' +
      '<button data-th="light"' + (themePref() === 'light' ? ' class="on"' : '') + '>Светлая</button>' +
      '<button data-th="auto"' + (themePref() === 'auto' ? ' class="on"' : '') + '>Как в системе</button>' +
      '</div>' +
      '</div>' +
      '<div class="set-row">' +
      '<div class="grow"><div class="lbl">Открывать последнюю статью при запуске</div><div class="hint">Приложение сразу вернётся туда, где вы остановились; иначе начинается с главной</div></div>' +
      '<div class="switch' + (store.get('autoResume') === '1' ? ' on' : '') + '" id="resumeSwitch" role="switch" aria-label="Открывать последнюю статью"></div>' +
      '</div>' +
      '<div class="set-row">' +
      '<div class="grow"><div class="lbl">Схема у каждого шага</div><div class="hint">Показывать окно Winbox 4 под каждым действием инструкции</div></div>' +
      '<div class="switch' + (shotsEnabled() ? ' on' : '') + '" id="shotsSwitch" role="switch" aria-label="Схема у каждого шага"></div>' +
      '</div>' +
      '<div class="set-row">' +
      '<div class="grow"><div class="lbl">Текущая версия</div><div class="hint">Номер сборки присваивается автоматически в GitHub Actions</div></div>' +
      '<div class="badge v7">v' + (window.APP_VERSION || 'dev') + '</div>' +
      '</div>' +
      '</div>';

    html += '<div class="set-card">' +
      '<h3 class="card-h">' + svg('down', 15) + 'Обновление приложения</h3>' +
      '<div class="upd" id="updBox">Нажмите «Проверить обновления» — приложение запросит последний релиз на GitHub.</div>' +
      '<div style="margin-top:10px"><button class="btn primary block" id="checkUpdBtn">' + svg('down', 15) + 'Проверить обновления</button></div>' +
      '<div class="hint" style="margin-top:8px">Приложение проверяет страницу релизов ' + esc(REPO) + ' и сравнивает версии. Скачивание APK — по кнопке, в браузере.</div>' +
      '</div>';

    const pk = window.Pack || { loaded: false, count: 0, version: '' };
    html += '<div class="set-card">' +
      '<h3 class="card-h">' + svg('down', 15) + 'Дополнительный контент</h3>' +
      '<div class="upd" id="packBox">' + (pk.loaded
        ? 'Загружено статей: <b>' + pk.count + '</b> · версия ' + esc(pk.version)
        : 'Дополнительные статьи не загружены') + '</div>' +
      '<div class="row-btns" style="margin-top:10px">' +
      '<button class="btn" id="packCheck">Проверить обновления контента</button>' +
      (pk.loaded ? '<button class="btn" id="packClear">Удалить</button>' : '') +
      '</div>' +
      '<div class="hint" style="margin-top:8px">Новые статьи и схемы приходят отдельно от APK — переустанавливать приложение не нужно.</div>' +
      '</div>';

    html += '<div class="set-card">' +
      '<h3 class="card-h">' + svg('down', 15) + 'Библиотека для печати</h3>' +
      '<div class="hint">Выгрузить все статьи в один HTML-файл: открывается в любом браузере, печатается и читается офлайн на компьютере.</div>' +
      '<div class="row-btns" style="margin-top:10px"><button class="btn" id="libExport">Сохранить HTML</button></div>' +
      '</div>';

    html += '<div class="set-card">' +
      '<div class="set-row"><div class="grow"><div class="lbl">Прогресс чтения и избранное</div>' +
      '<div class="hint">Прочитано <b id="readStat">0 из ' + FLAT.length + '</b>, в избранном ' + favs().length + ' статей</div></div>' +
      '<button class="btn" id="resetProgress">Сбросить прогресс</button></div>' +
      '</div>';

    html += '<div class="set-card">' +
      '<div class="set-row"><div class="grow"><div class="lbl">Сбросить настройки приложения</div>' +
      '<div class="hint">Размер шрифта и тема вернутся к значениям по умолчанию</div></div>' +
      '<button class="btn primary" id="resetBtn">Сбросить</button></div>' +
      '</div>';

    html += '<a class="list-row" href="#/starred"><span class="n">' + svg('svc', 13) + '</span>' +
      '<b>Избранное и заметки</b><span>' + starredFavs().length + ' статей, ' + starredNotes().length + ' заметок</span></a>' +
      '<a class="list-row" href="#/backup"><span class="n">' + svg('down', 13) + '</span>' +
      '<b>Данные и резервная копия</b><span>заметки, прогресс, чек-листы</span></a>' +
      '<a class="list-row" href="#/about"><span class="n">' + svg('info', 13) + '</span>' +
      '<b>О программе и история релизов</b><span>→</span></a>';
    html += '</div>';
    return html;
  }

  /* ---------------- о программе ---------------- */
  function changelogHtml() {
    const list = window.CHANGELOG || [];
    const cur = window.APP_VERSION || 'dev';
    let out = '<ul class="chg">';
    list.forEach(function (e, i) {
      const ver = (e.v === 'auto') ? cur : e.v;
      const isCur = (e.v === 'auto') || (ver === cur);
      out += '<li class="chg-item' + (isCur ? ' cur' : '') + '">' +
        '<div class="chg-head"><span class="chg-ver">v' + esc(ver) + '</span>' +
        (isCur ? '<span class="tag-cur">ваша версия</span>' : '') +
        '<span class="chg-date">' + esc(e.date || '') + '</span></div>' +
        '<div class="chg-title">' + esc(e.title || '') + '</div>' +
        '<ul>' + (e.items || []).map(function (it) { return '<li>' + esc(it) + '</li>'; }).join('') + '</ul>' +
        '</li>';
    });
    out += '</ul>';
    return out;
  }

  function aboutView() {
    const scenesCount = FLAT.reduce(function (n, a) { return n + ((a.scenes || []).length); }, 0);
    const tasks = (GROUPS.filter(function (g) { return g.id === 'tasks'; })[0] || { items: [] }).items.length;
    let ua = navigator.userAgent || '';
    ua = ua.replace(/^.*?\((.*?)\).*$/, '$1');

    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><span>О программе</span></div>';

    html += '<div class="about-hero">' +
      '<span class="ic"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 15h18v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="currentColor"/><path d="M11 15V9.5h2V15z" fill="currentColor"/><path d="M7 9a7 7 0 0 1 10 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></span>' +
      '<div><h2>MikroTik · Учебник Winbox 4</h2>' +
      '<p>версия ' + esc(window.APP_VERSION || 'dev') + (window.APP_BUILD_DATE ? ' · сборка ' + esc(window.APP_BUILD_DATE) : '') + '</p></div></div>';

    html += card('Что это за приложение', 'info',
      '<p>Карманный справочник по настройке роутеров MikroTik: структура меню Winbox 4, назначение каждого ' +
      'пункта, пошаговые инструкции со схемами окон и стрелками, проверка командой в терминале и разбор ' +
      'типичных ошибок. Отдельный раздел — готовые решения для продакшена.</p>' +
      '<div class="hero" style="margin:12px 0 0;padding:12px 14px">' +
      '<div class="stats" style="margin:0">' +
      '<div class="st"><b>' + GROUPS.length + '</b><span>разделов</span></div>' +
      '<div class="st"><b>' + FLAT.length + '</b><span>статей</span></div>' +
      '<div class="st"><b>' + scenesCount + '</b><span>схем</span></div>' +
      '<div class="st"><b>' + tasks + '</b><span>задач PROD</span></div>' +
      '</div></div>');

    html += '<div class="set-card"><h3 class="card-h">' + svg('down', 15) + 'Обновления</h3>' +
      '<div class="upd" id="updBox">Проверьте, нет ли новой сборки — обновления ставятся поверх текущей версии.</div>' +
      '<div class="upd-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' +
      '<button class="btn primary" id="checkUpdBtn">' + svg('down', 15) + 'Проверить обновления</button>' +
      '<a class="btn" href="' + RELEASES_URL + '">Все релизы ↗</a></div></div>' +
      '<div id="mtgUpd"></div>';

    html += '<div class="set-card"><h3 class="card-h">' + svg('book', 15) + 'История релизов</h3>' + changelogHtml() + '</div>';

    html += '<div class="set-card"><h3 class="card-h">' + svg('system', 15) + 'Технические данные</h3>' +
      '<dl class="kv">' +
      '<dt>Версия</dt><dd>' + esc(window.APP_VERSION || 'dev') + '</dd>' +
      '<dt>versionCode</dt><dd>' + esc(window.APP_VERSION_CODE || '—') + '</dd>' +
      '<dt>Дата сборки</dt><dd>' + esc(window.APP_BUILD_DATE || '—') + '</dd>' +
      '<dt>Источник</dt><dd>' + esc(REPO) + '</dd>' +
      '<dt>Платформа</dt><dd>' + esc(ua.slice(0, 90)) + '</dd>' +
      '</dl></div>';

    html += card('Ссылки', 'book', '<div class="badges" style="margin:0">' +
      '<a class="badge" href="' + RELEASES_URL + '">Релизы и APK ↗</a>' +
      '<a class="badge" href="https://github.com/' + REPO + '">Исходный код ↗</a>' +
      '<a class="badge" href="https://help.mikrotik.com/docs/">Документация RouterOS ↗</a>' +
      '<a class="badge" href="https://mikrotik.com/download">Winbox ↗</a></div>');

    html += '<p style="color:var(--txt-mute);font-size:12px;margin-top:16px">' +
      'MikroTik и RouterOS — товарные знаки MikroTik SIA. Приложение неофициальное, учебное.</p>';
    html += '</div>';
    return html;
  }

  /* ---------------- проверка обновлений ---------------- */
  function parseVer(s) {
    const m = String(s || '').match(/(\d+\.\d+\.\d+)/);
    return m ? m[1] : null;
  }
  function cmpVer(a, b) {
    const pa = String(a).split('.').map(Number);
    const pb = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = pa[i] || 0, y = pb[i] || 0;
      if (x > y) return 1;
      if (x < y) return -1;
    }
    return 0;
  }

  /* ---------------- дополнительный контент (контент-пак) ---------------- */
  const PACK_URL = 'https://github.com/zigorminsk-debug/mikrotik-gide/releases/latest/download/content-pack.json';
  let packCb = null, packTimer = null;

  window.__fetchText = function (tag, ok, body) {
    if (tag !== 'pack') return;
    clearTimeout(packTimer);
    const cb = packCb;
    packCb = null;
    if (cb) cb(!!ok, body);
  };

  function fetchText(url, cb) {
    if (window.AndroidBridge && window.AndroidBridge.fetchText) {
      packCb = cb;
      packTimer = setTimeout(function () {
        if (packCb) { const c = packCb; packCb = null; c(false, 'Сеть не ответила за 20 секунд'); }
      }, 20000);
      try { window.AndroidBridge.fetchText(url, 'pack'); }
      catch (e) { clearTimeout(packTimer); packCb = null; cb(false, String(e)); }
      return;
    }
    const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    fetch(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('ответ ' + r.status);
        return r.text();
      })
      .then(function (txt) { cb(true, txt); })
      .catch(function (e) { clearTimeout(timer); cb(false, String(e && e.message ? e.message : e)); });
  }

  function checkPack() {
    const box = document.getElementById('packBox');
    if (!box) return;
    box.textContent = 'Проверяю дополнительный контент…';
    fetchText(PACK_URL, function (ok, body) {
      if (!ok) {
        box.innerHTML = 'Не удалось проверить: ' + esc(body || 'нет сети') + '. Попробуйте позже.';
        return;
      }
      let p = null;
      try { p = JSON.parse(body); } catch (e) { p = null; }
      if (!p || !window.Pack || !window.Pack.validate(p)) {
        box.innerHTML = 'Ответ не похож на контент-пак. Обновите приложение до свежей версии.';
        return;
      }
      const have = window.Pack.version;
      const count = p.groups.reduce(function (n, g) { return n + (g.items || []).length; }, 0);
      if (have && have === p.version) {
        box.innerHTML = 'Уже установлена последняя версия контента: <b>' + esc(p.version) + '</b> · статей ' + window.Pack.count + '.';
        return;
      }
      const added = window.Pack.apply(p);
      box.innerHTML = 'Загружено статей: <b>' + (added > 0 ? added : count) + '</b> · версия ' + esc(p.version) + '. ' +
        '<button class="btn" id="packReload" style="margin-top:8px">Перезапустить приложение</button>';
      const rl = document.getElementById('packReload');
      if (rl) rl.addEventListener('click', function () { location.reload(); });
    });
  }

  function fetchLatest() {
    return new Promise(function (resolve, reject) {
      if (window.AndroidBridge && window.AndroidBridge.getLatestRelease) {
        const timer = setTimeout(function () {
          reject(new Error('Сеть не ответила за 20 секунд'));
        }, 20000);
        window.__updateCallback = function (json) {
          clearTimeout(timer);
          try {
            const data = JSON.parse(json);
            if (data && data.error) reject(new Error(data.error));
            else resolve(data);
          } catch (e) {
            reject(new Error('Некорректный ответ сервера'));
          }
        };
        try {
          window.AndroidBridge.getLatestRelease();
        } catch (e) {
          clearTimeout(timer);
          reject(e);
        }
      } else {
        // браузерное превью: обычный fetch с таймаутом
        const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
        const timer = setTimeout(function () {
          if (ctrl) ctrl.abort();
          reject(new Error('Сеть не ответила за 15 секунд'));
        }, 15000);
        fetch(API_LATEST, {
          headers: { 'Accept': 'application/vnd.github+json' },
          signal: ctrl ? ctrl.signal : undefined
        })
          .then(function (r) {
            clearTimeout(timer);
            if (!r.ok) throw new Error('GitHub ответил ' + r.status);
            return r.json();
          })
          .then(resolve)
          .catch(function (e) {
            clearTimeout(timer);
            reject(e);
          });
      }
    });
  }

  function renderUpdateResult(rel) {
    const box = $('#updBox');
    if (!box) return;
    const cur = window.APP_VERSION || '0.0.0';
    const latest = parseVer(rel.name) || parseVer(rel.tag_name) || cur;
    const apk = (rel.assets || []).filter(function (a) {
      return /\.apk$/i.test(a.name || '');
    })[0];
    const newer = cmpVer(latest, cur) > 0;

    if (newer) {
      const native = !!(window.AndroidBridge && window.AndroidBridge.downloadAndInstall);
      box.className = 'upd new';
      box.innerHTML = 'Доступна новая версия: <b class="ver">v' + esc(latest) + '</b><br>' +
        'У вас установлена <span class="ver">v' + esc(cur) + '</span>.<br>' +
        '<span style="font-size:12.5px">' + esc(rel.name || '') + '</span>' +
        '<div class="upd-actions">' +
        (apk ? (native
          ? '<button class="btn primary" id="dlBtn">Скачать и установить v' + esc(latest) + '</button>'
          : '<a class="btn primary" href="' + esc(apk.browser_download_url) + '">Скачать APK ' + esc(latest) + '</a>') : '') +
        '<a class="btn" href="' + esc(rel.html_url) + '">Страница релиза ↗</a>' +
        '</div>' +
        '<div style="font-size:12px;margin-top:8px;opacity:.85">' +
        (native
          ? 'Файл скачается внутри приложения и сразу передастся установщику — браузер не откроется. После установки файл удаляется.'
          : 'Новая версия подписана тем же ключом — установится поверх, данные и настройки сохранятся.') +
        '</div>';
      const dl = $('#dlBtn');
      if (dl && apk) {
        dl.addEventListener('click', function () { startDownload(apk.browser_download_url, latest); });
      }
    } else {
      box.className = 'upd ok';
      box.innerHTML = 'У вас последняя версия — <b class="ver">v' + esc(cur) + '</b>.<br>' +
        '<span style="font-size:12.5px">Последний релиз: ' + esc(rel.name || rel.tag_name || '') + '</span>';
    }
    store.set('updChecked', String(Date.now()));
  }

  /* ---------- скачивание и установка силами приложения ---------- */
  let pendingUpdate = null;   // {url, ver, waiting}

  function startDownload(url, ver) {
    pendingUpdate = { url: url, ver: ver, waiting: false };
    const box = $('#updBox');
    if (!box) return;
    box.className = 'upd new';
    box.innerHTML = 'Скачиваем обновление <b class="ver">v' + esc(ver) + '</b>…' +
      '<div class="upd-bar"><i id="updBar" style="width:0%"></i></div>' +
      '<div id="updStatus" style="font-size:12.5px;margin-top:7px">Подготовка…</div>';
    try {
      window.AndroidBridge.downloadAndInstall(url, ver);
    } catch (e) {
      renderUpdateError(e);
    }
  }

  /* сюда приходят сообщения из нативного слоя */
  window.__updateProgress = function (state, message) {
    const box = $('#updBox');
    if (!box) return;
    const bar = $('#updBar');
    const st = $('#updStatus');

    if (state === 'progress') {
      const p = parseInt(message, 10) || 0;
      if (bar) bar.style.width = p + '%';
      if (st) st.textContent = 'Загрузка… ' + p + '%';
      return;
    }
    if (state === 'downloading') {
      if (st) st.textContent = message || 'Скачиваем обновление…';
      return;
    }
    if (state === 'installing') {
      if (bar) bar.style.width = '100%';
      if (st) st.textContent = 'Передаём файл системному установщику…';
      return;
    }
    if (state === 'done') {
      pendingUpdate = null;
      box.className = 'upd ok';
      box.innerHTML = '<b class="ver">Файл готов</b><br>' +
        'Подтвердите установку в системном окне «Обновить приложение?».<br>' +
        '<span style="font-size:12.5px">После установки приложение запустится уже новой версией, ' +
        'а скачанный APK удалится автоматически.</span>' +
        '<div class="upd-actions"><a class="btn" href="' + RELEASES_URL + '">Все релизы ↗</a></div>';
      return;
    }
    if (state === 'permission') {
      if (pendingUpdate) pendingUpdate.waiting = true;
      box.className = 'upd err';
      box.innerHTML = '<b>Нужно разрешение</b><br>' + esc(message || '') +
        '<div style="font-size:12.5px;margin-top:6px">Включите «Разрешить установку приложений» ' +
        'для этого приложения и вернитесь назад — загрузка продолжится сама.</div>' +
        '<div class="upd-actions">' +
        '<button class="btn primary" id="permBtn">Открыть настройки</button>' +
        '<button class="btn" id="retryBtn">Продолжить</button></div>';
      const b = $('#permBtn');
      if (b) b.addEventListener('click', function () {
        if (window.AndroidBridge && window.AndroidBridge.openInstallSettings) {
          window.AndroidBridge.openInstallSettings();
        }
      });
      const rb = $('#retryBtn');
      if (rb) rb.addEventListener('click', function () {
        if (pendingUpdate) startDownload(pendingUpdate.url, pendingUpdate.ver);
      });
      return;
    }
    if (state === 'error') {
      pendingUpdate = null;
      box.className = 'upd err';
      box.innerHTML = 'Не удалось скачать обновление: <b>' + esc(message || 'нет сети') + '</b>' +
        '<div class="upd-actions"><a class="btn" href="' + RELEASES_URL + '">Скачать вручную ↗</a></div>';
    }
  };

  function renderUpdateError(err) {
    const box = $('#updBox');
    if (!box) return;
    box.className = 'upd err';
    box.innerHTML = 'Не удалось проверить обновления: <b>' + esc(err && err.message ? err.message : 'нет сети') + '</b>.<br>' +
      '<span style="font-size:12.5px">Проверьте подключение к интернету или откройте страницу релизов вручную.</span>' +
      '<div class="upd-actions"><a class="btn" href="' + RELEASES_URL + '">Открыть релизы ↗</a></div>';
  }

  function checkUpdates() {
    const box = $('#updBox');
    if (box) {
      box.className = 'upd';
      box.innerHTML = 'Проверяем последнюю версию на GitHub…';
    }
    fetchLatest().then(renderUpdateResult).catch(renderUpdateError);
  }

  /* ---------------- рендер после вставки ---------------- */
  function hydrate(a) {
    const scenesHost = $('#scenesHost');
    if (scenesHost && a.scenes) Scene.mount(scenesHost, a.scenes);

    bindNotes(a);

    /* Окно под шагом инструкции. Одно и то же окно не повторяем под каждым
       шагом: раньше статья с одной схемой показывала пять одинаковых
       картинок подряд («почему все скрины одинаковые»). Теперь повтор
       заменяется короткой отсылкой к тому шагу, где окно уже показано. */
    const shots = content.querySelectorAll('.step-shot');
    const shown = Object.create(null);
    Array.prototype.forEach.call(shots, function (host) {
      const i = parseInt(host.getAttribute('data-si'), 10);
      /* Сначала настоящий снимок Winbox 4 (data/photos.js), потом схема окна. */
      const map = (window.SHOT_STEPS && window.SHOT_STEPS[a.id]) || null;
      const photo = map ? map[i] : null;
      /* Значение бывает строкой (точное окно шага) и объектом { f, w } —
         живой снимок того же раздела, когда точного окна ещё нет. */
      const file = typeof photo === 'string' ? photo : (photo && photo.f);
      const winName = photo && typeof photo === 'object' ? photo.w : '';
      if (file) {
        if (shown['foto:' + file] != null) {
          host.innerHTML = '<div class="shot-same">Снимок этого окна — в шаге ' +
            (shown['foto:' + file] + 1) + ' выше.</div>';
          return;
        }
        shown['foto:' + file] = i;
        host.innerHTML = '<figure class="w4-step">' +
          '<a href="img/shots/' + esc(file) + '" class="shot-link" data-title="Окно Winbox 4" aria-label="Открыть снимок на весь экран">' +
          '<img loading="lazy" src="img/shots/' + esc(file) + '" alt="Окно Winbox 4"></a>' +
          '<figcaption>Скриншот настоящего Winbox 4 — снят в CI на живом RouterOS' +
          (winName ? ', окно «' + esc(winName) + '»: это тот же раздел меню, окно шага ещё не снято'
            : '') + '. ' +
          '<a href="#/win4">Все окна Winbox 4</a></figcaption></figure>';
        return;
      }
      const pick = stepSceneFor(a, i);
      if (!pick) return;
      /* Одно окно раздела — одна картинка на статью. Свои схемы шага
         (src === 'own') не трогаем: они нарисованы под конкретный шаг. */
      const winKey = 'win:' + (pick.spec.path || pick.spec.win || '');
      if (pick.src !== 'own' && shown[winKey] != null) {
        host.innerHTML = '<div class="shot-same">Окно «' +
          esc(pick.spec.win || pick.spec.path || a.title || 'Winbox') +
          '» то же, что в шаге ' + (shown[winKey] + 1) + ' выше.</div>';
        return;
      }
      const sign = 'scene:' + JSON.stringify(pick.spec);
      if (shown[sign] != null) {
        host.innerHTML = '<div class="shot-same">Окно «' +
          esc(pick.spec.win || pick.spec.path || a.title || 'Winbox') +
          '» то же, что в шаге ' + (shown[sign] + 1) + ' выше.</div>';
        return;
      }
      shown[sign] = i;
      if (pick.src !== 'own') shown[winKey] = i;
      host.setAttribute('data-win', pick.spec.path || pick.spec.win || '');
      host.insertAdjacentHTML('afterbegin', '<div class="shot-tag">Схема окна Winbox 4</div>');
      Scene.mount(host, [pick.spec], { compact: true });
      /* Спеки могут отличаться только подсветкой, а выглядеть одинаково —
         сравниваем то, что действительно нарисовано. */
      const drawn = 'drawn:' + host.textContent.replace(/\s+/g, ' ').trim();
      if (shown[drawn] != null && shown[drawn] !== i) {
        host.innerHTML = '<div class="shot-same">Окно «' +
          esc(pick.spec.win || pick.spec.path || a.title || 'Winbox') +
          '» то же, что в шаге ' + (shown[drawn] + 1) + ' выше.</div>';
      } else {
        shown[drawn] = i;
      }
    });

    const checkHost = $('#checkHost');
    if (checkHost && a.check) {
      const specs = a.check.map(function (c) {
        return { term: true, win: 'New Terminal', path: c.d || 'RouterOS', lines: String(c.c).split('\n') };
      });
      Scene.mount(checkHost, specs);
    }
  }

  function bindSettings() {
    const lib = document.getElementById('libExport');
    if (lib) lib.addEventListener('click', exportLibrary);
    const dn = $('#fsDown2'), up = $('#fsUp2');
    if (dn) dn.addEventListener('click', function () { applyFs(fsIdx - 1); });
    if (up) up.addEventListener('click', function () { applyFs(fsIdx + 1); });

    const sw = $('#themeSeg');
    if (sw) {
      sw.addEventListener('click', function (e) {
        const b = e.target.closest ? e.target.closest('[data-th]') : null;
        if (!b) return;
        const pref = b.getAttribute('data-th');
        store.set('theme', pref);
        sw.querySelectorAll('[data-th]').forEach(function (x) {
          x.classList.toggle('on', x === b);
        });
        applyTheme();
        toast(pref === 'auto' ? 'Тема: как в системе' : pref === 'light' ? 'Тема: светлая' : 'Тема: тёмная');
      });
    }

    const rs = $('#resumeSwitch');
    if (rs) rs.addEventListener('click', function () {
      const on = !rs.classList.contains('on');
      rs.classList.toggle('on', on);
      store.set('autoResume', on ? '1' : '0');
      toast(on ? 'При запуске будем открывать последнюю статью' : 'При запуске — главная страница');
    });

    const shs = $('#shotsSwitch');
    if (shs) shs.addEventListener('click', function () {
      const on = !shs.classList.contains('on');
      shs.classList.toggle('on', on);
      store.set('shots', on ? '1' : '0');
      route();
    });

    const pc = $('#packCheck');
    if (pc) pc.addEventListener('click', checkPack);
    const pcl = $('#packClear');
    if (pcl) pcl.addEventListener('click', function () {
      if (window.Pack) window.Pack.clear();
      toast('Дополнительный контент удалён — перезапустите приложение');
      route();
    });

    const chk = $('#checkUpdBtn');
    if (chk) chk.addEventListener('click', checkUpdates);

    const rp = $('#resetProgress');
    if (rp) rp.addEventListener('click', function () {
      store.del(READ_KEY);
      store.del(FAV_KEY);
      store.del('days');
      buildFavBox();
      refreshProgress();
      rp.textContent = 'Сброшено';
      setTimeout(function () { rp.textContent = 'Сбросить прогресс'; }, 1500);
    });

    refreshProgress();

    const rst = $('#resetBtn');
    if (rst) rst.addEventListener('click', function () {
      store.del('fs'); store.del('theme'); store.del('autoResume');
      fsIdx = 1;
      document.documentElement.setAttribute('data-fs', '1');
      applyTheme();
      syncFsUi();
      if (sw) sw.querySelectorAll('[data-th]').forEach(function (x) {
        x.classList.toggle('on', x.getAttribute('data-th') === 'dark');
      });
      if (rs) rs.classList.remove('on');
      rst.textContent = 'Сброшено';
      setTimeout(function () { rst.textContent = 'Сбросить'; }, 1500);
    });

    syncFsUi();
  }

  /* ---------------- поиск ---------------- */
  let SEARCH_INDEX = null;
  function buildIndex() {
    SEARCH_INDEX = FLAT.map(function (a) {
      const steps = (a.steps || []).map(function (s) { return typeof s === 'string' ? s : (s.t + ' ' + (s.d || '') + ' ' + (s.cmd || '')); }).join(' ');
      const cfg = a.config ? (Array.isArray(a.config) ? a.config.join(' ') : String(a.config)) : '';
      const cmds = (a.check || []).map(function (c) { return c.c || ''; }).join(' ');
      const orig = [a.t, a.path, a.purpose, (a.usage || []).join(' '), steps,
        (a.mistakes || []).join(' '), (a.tags || []).join(' '), cfg, cmds].join(' ');
      return { a: a, orig: orig, text: orig.toLowerCase() };
    });
  }

  function sqHist() {
    try {
      const v = JSON.parse(store.get('sqh') || '[]');
      return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x; }).slice(0, 6) : [];
    } catch (e) { return []; }
  }
  function sqPush(q) {
    q = String(q || '').trim();
    if (q.length < 2) return;
    const list = sqHist().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
    list.unshift(q);
    store.set('sqh', JSON.stringify(list.slice(0, 6)));
  }
  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function hlText(s, words) {
    let out = esc(s == null ? '' : s);
    if (!words || !words.length) return out;
    const pat = words.filter(Boolean).map(function (w) { return escRe(esc(w)); }).join('|');
    if (!pat) return out;
    try {
      return out.replace(new RegExp('(' + pat + ')', 'gi'), '<mark class="hl">$1</mark>');
    } catch (e) { return out; }
  }
  function sqChips(list, title) {
    if (!list.length) return '';
    return '<div class="sq-block"><div class="sq-h">' + title + '</div><div class="sq-chips">' +
      list.map(function (q) {
        const safe = esc(q).replace(/"/g, '&quot;');
        return '<button class="sq-chip" data-sq="' + safe + '">' + esc(q) + '</button>';
      }).join('') +
      '</div></div>';
  }
  function doSearch(q) {
    if (!SEARCH_INDEX) buildIndex();
    const res = $('#searchResults');
    const query = String(q || '').trim().toLowerCase();
    if (!query) {
      const recent = sqHist();
      res.innerHTML = sqChips(recent, 'Недавние запросы') +
        sqChips(['wireguard', 'vlan', 'nat', 'dhcp', 'pppoe', 'firewall', 'backup', 'bridge'], 'Часто ищут') +
        '<div class="sq-links">' +
        '<a class="list-row" href="#/diag"><span class="n">?</span><b>Диагностика по симптому</b><span>что не работает</span></a>' +
        '<a class="list-row" href="#/glossary"><span class="n">A</span><b>Глоссарий и порты</b><span>50 терминов</span></a>' +
        '<a class="list-row" href="#/harden"><span class="n">✓</span><b>Защита от взлома</b><span>' + hardenCount() + ' пунктов</span></a>' +
        '</div>';
      return;
    }
    if (query.length < 2) {
      res.innerHTML = '<div class="empty">Введите минимум 2 символа.<br>Например: <b>nat</b>, <b>vlan</b>, <b>wireguard</b>, <b>dhcp</b>, <b>backup</b>, <b>pppoe</b>.</div>';
      return;
    }
    const words = query.split(/\s+/).filter(Boolean);
    const all = SEARCH_INDEX.filter(function (row) {
      return words.every(function (w) { return row.text.indexOf(w) >= 0; });
    });
    if (!all.length) {
      res.innerHTML = '<div class="empty">Ничего не найдено по запросу «' + esc(q) + '».</div>' +
        '<div class="sq-hint">Попробуйте одно слово: <b>nat</b>, <b>vlan</b>, <b>vpn</b>, <b>bridge</b>. ' +
        'Или посмотрите разделы:</div>' +
        '<div class="sq-links">' +
        '<a class="list-row" href="#/diag"><span class="n">?</span><b>Диагностика по симптому</b><span>10 симптомов</span></a>' +
        '<a class="list-row" href="#/glossary"><span class="n">A</span><b>Глоссарий и порты</b><span>50 терминов</span></a>' +
        '</div>';
      return;
    }
    const hits = all.slice(0, 40);
    let html = '<div class="sr-count">Найдено ' + all.length + (all.length > hits.length ? ', показаны первые ' + hits.length : '') + ' · «' + esc(q) + '»</div>';
    html += hits.map(function (h) {
      const a = h.a;
      const at = h.text.indexOf(words[0]);
      const from = at > 60 ? at - 60 : 0;
      const raw = h.orig.slice(from, from + 170).replace(/\s+/g, ' ').trim();
      const snippet = (from ? '…' : '') + raw + '…';
      return '<a class="sr" href="#/' + a.id + '"><b>' + hlText(a.t, words) + '</b>' +
        '<span>' + esc(a._group.name) + (a.path ? ' · ' + esc(a.path) : '') + '</span>' +
        '<p>' + hlText(snippet, words) + '</p></a>';
    }).join('');
    res.innerHTML = html;
  }

  /* ================= сервисные мелочи ================= */
  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 1900);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { navigator.clipboard.writeText(text); return; } catch (e) { }
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { }
    document.body.removeChild(ta);
  }

  function shareText(text, title) {
    const payload = title ? title + '\n\n' + text : text;
    try {
      if (window.AndroidBridge && window.AndroidBridge.share) { window.AndroidBridge.share(payload); return; }
    } catch (e) { }
    if (navigator.share) {
      try { navigator.share({ title: title || 'MikroTik', text: payload }); return; } catch (e) { }
    }
    copyText(payload);
    toast('Скопировано — вставьте в мессенджер');
  }

  function bindNotes(a) {
    const box = document.getElementById('noteBox');
    const st = document.getElementById('noteState');
    const cl = document.getElementById('noteClear');
    if (!box) return;
    box.value = notesGet(a.id);
    let tmr = null;
    box.addEventListener('input', function () {
      if (st) st.textContent = 'печатаете…';
      clearTimeout(tmr);
      tmr = setTimeout(function () {
        notesSet(a.id, box.value);
        if (st) st.textContent = box.value.trim() ? 'сохранено' : 'пусто';
      }, 400);
    });
    if (cl) cl.addEventListener('click', function () {
      notesSet(a.id, '');
      box.value = '';
      if (st) st.textContent = 'пусто';
      toast('Заметка удалена');
    });
  }

  /* ================= инструменты ================= */
  function toolCard(href, title, desc, icon) {
    return '<a class="tool-card" href="' + href + '"><span class="tc-ic">' + svg(icon || 'gear', 18) + '</span>' +
      '<b>' + esc(title) + '</b><span>' + esc(desc) + '</span></a>';
  }

  function toolsView() {
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><span>Инструменты</span></div>';
    html += '<h1 class="art-title">Инструменты</h1>';
    html += '<div class="hint" style="margin:-6px 0 14px">Всё считается на устройстве и работает без интернета.</div>';
    html += '<div class="tools-grid">' +
      toolCard('#/wizard', 'Мастер конфигурации', 'WAN, LAN, IPv6, Wi-Fi, VPN, пробросы — готовый конфиг', 'gear') +
      toolCard('#/router', 'Мой роутер', 'опрос версии и прошивки, применение конфига, обновления', 'system') +
      toolCard('#/win4', 'Окна Winbox 4', 'настоящие снимки окон с живого RouterOS', 'iface') +
      toolCard('#/course', 'Курс за 7 дней', 'План обучения с практикой и прогрессом', 'book') +
      toolCard('#/harden', 'Защита от взлома', hardenCount() + ' пунктов по меню: доступ, firewall, сервисы, Wi-Fi', 'svc') +
      toolCard('#/audit', 'Аудит конфига', 'Вставьте /export — проверю firewall, NAT, DHCP, Wi-Fi', 'svc') +
      toolCard('#/diag', 'Диагностика по симптому', 'Нет интернета, VPN, проброс — порядок проверки', 'start') +
      toolCard('#/subnet', 'Калькулятор подсетей', 'Маска, диапазон, broadcast, деление на подсети', 'ip') +
      toolCard('#/vlsm', 'VLSM-планировщик', 'План адресации по числу хостов + CSV', 'iface') +
      toolCard('#/diff', 'Сравнить конфиги', 'Два экспорта — что изменилось', 'task') +
      toolCard('#/quiz', 'Самопроверка', quizCount() + ' вопросов по RouterOS с разбором ошибок', 'book') +
      toolCard('#/models', 'Модели и совместимость', 'Матрица 15 моделей: пакет Wi-Fi (wifi или wireless), порты, PoE, SFP', 'iface') +
      toolCard('#/starred', 'Избранное и заметки', 'Всё отмеченное, записанное и прочитанное', 'svc') +
      toolCard('#/examples', 'Примеры конфигов', '11 готовых схем: интернет, VLAN, VPN, Wi-Fi, IPTV', 'task') +
      toolCard('#/cheats', 'Шпаргалки', '7 наборов команд: база, firewall, NAT, VLAN, WireGuard', 'book') +
      toolCard('#/wifi', 'Каналы Wi-Fi', 'Ширина канала, пересечения, команда для RouterOS', 'iface') +
      toolCard('#/coverage', 'Мощность и покрытие', 'EIRP, радиус сигнала, сколько точек на площадь', 'iface') +
      toolCard('#/poe', 'PoE и питание', 'бюджет PoE, подбор блока питания, предел на порт', 'svc') +
      toolCard('#/keys', 'Пароли и ключи', 'Wi-Fi и admin пароли, ключи WireGuard', 'svc') +
      toolCard('#/glossary', 'Глоссарий и порты', 'Термины RouterOS и таблица портов с поиском', 'bridge') +
      toolCard('#/backup', 'Данные и резервная копия', 'Заметки, прогресс, чек-листы — экспорт и импорт', 'down') +
      '</div>';
    html += '<div class="hint">Ещё: под каждой статьёй — «Режим на объекте»: чек-лист с галочками и таймером.</div>';
    html += '</div>';
    return html;
  }

  /* ================= мастер конфигурации ================= */
  const WIZ_DEF = (window.ConfigWizard && window.ConfigWizard.defaults) || {
    identity: 'office-gw', wan: 'dhcp', wanPort: 'ether1', wanIp: '203.0.113.20', wanPrefix: 24,
    wanGw: '203.0.113.1', pppoeUser: 'login', pppoePass: 'password', lanIp: '192.168.88.1',
    lanPrefix: 24, lanPorts: 'ether2-ether5', dhcp: true, dns: '1.1.1.1,8.8.8.8', guest: true,
    guestPort: 'ether5', guestIp: '192.168.20.1', guestPrefix: 24, wifi: false, wifiSsid: 'Office',
    wifiPass: 'WiFi-Pass-2026', wifiGuestSsid: 'Office-Guest', wifiGuestPass: 'Guest-Pass-2026',
    ipv6: 'off', ipv6Prefix: '2001:db8:1::/64', wg: true, wgIp: '10.10.10.1', wgPort: 13231,
    l2tp: false, l2tpPsk: 'IPsec-PSK-2026', l2tpPool: '10.20.20.10-10.20.20.99',
    pppoeServer: false, pppoeServerPort: 'ether5', pppoePool: '10.30.30.10-10.30.30.99',
    pppoeServerUser: '', pppoeServerPass: '', forwards: [], nat: true, protect: true,
    autobackup: false, backupMail: true, backupTime: '03:30:00',
    tz: 'Europe/Minsk', ntp: 'by.pool.ntp.org', resetBefore: false
  };

  function wizSaved() {
    let v = {};
    try { v = JSON.parse(store.get('wiz') || '{}') || {}; } catch (e) { v = {}; }
    const out = {};
    for (const k in WIZ_DEF) out[k] = (v[k] != null) ? v[k] : WIZ_DEF[k];
    if (!Array.isArray(out.forwards)) out.forwards = [];
    return out;
  }

  function wizStore(o) { store.set('wiz', JSON.stringify(o)); }
  function wizTpls() {
    try {
      const v = JSON.parse(store.get('wizTpls') || '[]');
      return Array.isArray(v) ? v.filter(function (t) { return t && t.name && t.data; }) : [];
    } catch (e) { return []; }
  }
  function wizTplsSave(list) { store.set('wizTpls', JSON.stringify(list.slice(0, 12))); }

  function wizField(id, label, value, hint, wide) {
    return '<label class="wz-row' + (wide ? ' wide' : '') + '"><span class="wz-l">' + esc(label) + '</span>' +
      '<input class="inp" id="' + id + '" value="' + esc(value) + '">' +
      (hint ? '<span class="wz-h">' + esc(hint) + '</span>' : '') + '</label>';
  }

  function wizSwitch(id, label, on, hint) {
    return '<div class="wz-row"><span class="wz-l">' + esc(label) + '</span>' +
      '<div class="switch' + (on ? ' on' : '') + '" id="' + id + '" role="switch"></div>' +
      (hint ? '<span class="wz-h">' + esc(hint) + '</span>' : '') + '</div>';
  }

  function wizSelect(id, label, value, options, hint) {
    return '<label class="wz-row"><span class="wz-l">' + esc(label) + '</span>' +
      '<select class="inp" id="' + id + '">' + options.map(function (o) {
        return '<option value="' + esc(o.v) + '"' + (String(value) === String(o.v) ? ' selected' : '') + '>' + esc(o.t) + '</option>';
      }).join('') + '</select>' + (hint ? '<span class="wz-h">' + esc(hint) + '</span>' : '') + '</label>';
  }

  function fwdRow(f, i) {
    f = f || {};
    const proto = (f.proto || 'tcp').toLowerCase();
    return '<div class="fwd-row" data-fi="' + i + '">' +
      '<select class="inp f-proto"><option value="tcp"' + (proto === 'tcp' ? ' selected' : '') + '>tcp</option>' +
      '<option value="udp"' + (proto === 'udp' ? ' selected' : '') + '>udp</option></select>' +
      '<input class="inp f-ext mono" value="' + esc(f.extPort || '') + '" placeholder="внеш. порт">' +
      '<input class="inp f-ip mono" value="' + esc(f.toIp || '') + '" placeholder="внутр. IP">' +
      '<input class="inp f-to mono" value="' + esc(f.toPort || '') + '" placeholder="внутр. порт">' +
      '<input class="inp f-cmt" value="' + esc(f.comment || '') + '" placeholder="подпись">' +
      '<button class="btn f-del" type="button" aria-label="Удалить">✕</button></div>';
  }

  function segRow(sg, i) {
    sg = sg || {};
    return '<div class="seg-row" data-si="' + i + '">' +
      '<input class="inp s-vid mono" value="' + esc(sg.vlanId || '') + '" placeholder="VLAN">' +
      '<input class="inp s-name" value="' + esc(sg.name || '') + '" placeholder="Название">' +
      '<input class="inp s-ip mono" value="' + esc(sg.ip || '') + '" placeholder="192.168.30.1/24">' +
      '<input class="inp s-port" value="' + esc(sg.port || '') + '" placeholder="ether4">' +
      '<button class="btn s-del" type="button" aria-label="Удалить">✕</button></div>';
  }

  function routeRow(r, i) {
    r = r || {};
    return '<div class="route-row" data-ri="' + i + '">' +
      '<input class="inp r-dst mono" value="' + esc(r.dst || '') + '" placeholder="10.20.0.0/16">' +
      '<input class="inp r-gw mono" value="' + esc(r.gw || '') + '" placeholder="192.168.88.2">' +
      '<input class="inp r-dist mono" value="' + esc(r.distance || '') + '" placeholder="дист.">' +
      '<button class="btn r-del" type="button" aria-label="Удалить">✕</button></div>';
  }

  function leaseRow(l, i) {
    l = l || {};
    return '<div class="lease-row" data-li="' + i + '">' +
      '<input class="inp l-mac mono" value="' + esc(l.mac || '') + '" placeholder="AA:BB:CC:DD:EE:FF">' +
      '<input class="inp l-ip mono" value="' + esc(l.ip || '') + '" placeholder="192.168.88.50">' +
      '<input class="inp l-cmt" value="' + esc(l.comment || '') + '" placeholder="принтер">' +
      '<button class="btn l-del" type="button" aria-label="Удалить">✕</button></div>';
  }

  function dnsRow(d, i) {
    d = d || {};
    return '<div class="dns-row" data-di="' + i + '">' +
      '<input class="inp ds-name mono" value="' + esc(d.name || '') + '" placeholder="nas.local">' +
      '<input class="inp ds-ip mono" value="' + esc(d.address || '') + '" placeholder="192.168.88.10">' +
      '<button class="btn ds-del" type="button" aria-label="Удалить">✕</button></div>';
  }

  function wizardView() {
    const o = wizSaved();
    const presets = (window.ConfigWizard && window.ConfigWizard.presets) ? window.ConfigWizard.presets() : [];
    const isStatic = o.wan === 'static';
    const isPppoe = o.wan === 'pppoe';

    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Мастер конфигурации</span></div>';
    html += '<h1 class="art-title">Мастер конфигурации</h1>';
    html += '<div class="hint" style="margin:-6px 0 10px">Ответьте на вопросы — мастер соберёт конфиг RouterOS 7, который можно вставить целиком в New Terminal.</div>';

    if (presets.length) {
      html += '<div class="chips">' + presets.map(function (p) {
        return '<button class="chip' + (o.preset === p.id ? ' on' : '') + '" data-preset="' + p.id + '">' + esc(p.name) + '</button>';
      }).join('') + '</div>';
    }

    const tpls = wizTpls();
    html += '<section class="card"><h3 class="card-h">' + svg('svc', 15) + 'Мои шаблоны</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">Сохраните заполненные ответы (например «Офис на Мира») и подставляйте их на новом роутере — или отдайте коллеге.</div>' +
      '<div class="tpl-save"><input class="inp" id="tplName" placeholder="Название шаблона" maxlength="40">' +
      '<button class="btn" id="tplSave" type="button">Сохранить ответы</button></div>' +
      (tpls.length
        ? '<div class="chips" style="margin-top:10px">' + tpls.map(function (t, i) {
          return '<span class="tpl-chip"><button class="chip" data-tpl="' + i + '">' + esc(t.name) + '</button>' +
            '<button class="tpl-del" data-tpldel="' + i + '" aria-label="Удалить шаблон">✕</button></span>';
        }).join('') + '</div>'
        : '<div class="hint" style="margin-top:8px">Сохранённых шаблонов пока нет.</div>') +
      '</section>';

    html += rosCard(o);

    const models = (window.ConfigWizard && window.ConfigWizard.models) ? window.ConfigWizard.models() : [];
    html += '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Роутер и WAN</h3>' +
      (models.length ? wizSelect('w-model', 'Модель роутера', o.model, models.map(function (m) {
        return { v: m.id, t: m.name };
      }), 'подставит порты и наличие Wi-Fi') : '') +
      wizField('w-identity', 'Имя роутера', o.identity) +
      wizField('w-author', 'Объект / автор', o.author, 'попадёт в шапку конфига') +
      wizSelect('w-wan', 'Подключение к провайдеру', o.wan, [
        { v: 'dhcp', t: 'DHCP (автоматически)' },
        { v: 'static', t: 'Статический IP' },
        { v: 'pppoe', t: 'PPPoE (логин и пароль)' },
        { v: 'lte', t: 'LTE (модем)' }
      ], 'для LTE интерфейс lte1 подставится сам') +
      wizField('w-wanPort', 'Интерфейс WAN', o.wanPort,
        'подставляется по типу: LTE → lte1, кабель и PPPoE → ether1') +
      '<div class="wz-group' + (isStatic ? '' : ' off') + '" data-g="static">' +
      wizField('w-wanIp', 'IP-адрес WAN', o.wanIp) +
      wizField('w-wanPrefix', 'Префикс WAN', o.wanPrefix) +
      wizField('w-wanGw', 'Шлюз провайдера', o.wanGw) +
      '</div>' +
      '<div class="wz-group' + (isPppoe ? '' : ' off') + '" data-g="pppoe">' +
      wizField('w-pppoeUser', 'Логин PPPoE', o.pppoeUser) +
      wizField('w-pppoePass', 'Пароль PPPoE', o.pppoePass) +
      '</div></section>';

    const wanKindOpts = [
      { v: 'dhcp', t: 'DHCP (кабель от провайдера)' },
      { v: 'pppoe', t: 'PPPoE (логин и пароль)' },
      { v: 'lte', t: 'LTE (модем)' }
    ];
    html += '<section class="card"><h3 class="card-h">' + svg('down', 15) + 'Резервный интернет</h3>' +
      wizSwitch('w-failover', 'Два провайдера: основной и резервный', o.failover,
        'переключение по пингу, возврат после устойчивой связи') +
      '<div class="wz-group' + (o.failover ? '' : ' off') + '" data-g="failover">' +
      wizSelect('w-wan1Kind', 'Основной провайдер', o.wan1Kind || o.wan, wanKindOpts,
        'как подключён основной канал') +
      wizField('w-wan1Port', 'Интерфейс основного', o.wan1Port || o.wanPort,
        'выбирается по типу канала: LTE → lte1, кабель → ether1') +
      wizField('w-wan1Probe', 'Проверочный адрес основного', o.wan1Probe,
        'пинг через основной канал, например 1.1.1.1') +
      wizSelect('w-wan2Kind', 'Резервный провайдер', o.wan2Kind || 'lte', wanKindOpts, 'как подключён резерв') +
      wizField('w-wan2Port', 'Интерфейс резервного', o.wan2Port,
        'по типу: LTE → lte1, кабель → ether5 (не совпадёт с основным)') +
      wizField('w-wan2Check', 'Проверочный адрес резервного', o.wan2Check,
        'пинг через резервный канал, например 8.8.8.8') +
      wizField('w-wan2PppoeUser', 'Логин PPPoE резерва', o.wan2PppoeUser, 'нужен только для PPPoE') +
      wizField('w-wan2PppoePass', 'Пароль PPPoE резерва', o.wan2PppoePass, 'нужен только для PPPoE') +
      wizField('w-wanDownSecs', 'Считать канал упавшим, секунд', o.wanDownSecs, 'проверки каждые 10 с; по умолчанию 20') +
      wizField('w-wanUpSecs', 'Возврат на основной, секунд устойчивого пинга', o.wanUpSecs, 'по умолчанию 60') +
      '<p class="wz-h">Каждый канал проверяется своим адресом: 1.1.1.1 всегда идёт в основной, ' +
      '8.8.8.8 — в резервный. Пока основной отвечает, трафик идёт через него; после ' +
      esc(o.wanDownSecs) + ' с без ответа включается резерв, а возврат будет только после ' +
      esc(o.wanUpSecs) + ' с непрерывных ответов — без «качелей».</p>' +
      '</div></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('iface', 15) + 'LAN, DHCP и DNS</h3>' +
      wizField('w-lanIp', 'IP роутера в LAN', o.lanIp) +
      wizField('w-lanPrefix', 'Префикс LAN', o.lanPrefix) +
      wizField('w-lanPorts', 'Порты LAN', o.lanPorts, 'диапазон: ether2-ether5') +
      wizSwitch('w-dhcp', 'DHCP-сервер и пул', o.dhcp, 'раздавать адреса автоматически') +
      wizField('w-dns', 'DNS-серверы', o.dns, 'через запятую') +
      '</section>';

    html += '<section class="card"><h3 class="card-h">' + svg('bridge', 15) + 'Устройства по подсетям</h3>' +
      wizSwitch('w-devSeg', 'Разделить на 4 подсети по типам устройств', o.devSeg,
        'проводные ПК, ноутбуки, телефоны и принтеры — каждый в своём VLAN') +
      '<div class="wz-group' + (o.devSeg ? '' : ' off') + '" data-g="devseg">' +
      '<div class="hint" style="margin:-4px 0 10px">' + esc(dsHint(o)) + '</div>' +
      wizField('w-dsVlanPc', 'VLAN проводных ПК', o.dsVlanPc) +
      wizField('w-dsVlanWifi', 'VLAN ноутбуков и планшетов', o.dsVlanWifi) +
      wizField('w-dsVlanPhones', 'VLAN телефонов', o.dsVlanPhones) +
      wizField('w-dsVlanIot', 'VLAN принтеров и периферии', o.dsVlanIot) +
      wizField('w-dsWifiPc', 'SSID ноутбуков', o.dsWifiPc) +
      wizField('w-dsWifiPhones', 'SSID телефонов', o.dsWifiPhones) +
      wizField('w-dsWifiIot', 'SSID принтеров', o.dsWifiIot) +
      '<div class="hint">Подсети маршрутизируются между собой: общие папки, принтеры и NAS доступны всем. ' +
      'mDNS-повторитель сохраняет обнаружение, гостевой VLAN 20 остаётся изолированным.</div>' +
      '</div></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('svc', 15) + 'Гости и Wi-Fi</h3>' +
      wizSwitch('w-guest', 'Гостевая сеть (VLAN 20)', o.guest, 'изолировать гостей от LAN') +
      '<div class="wz-group' + (o.guest ? '' : ' off') + '" data-g="guest">' +
      wizField('w-guestIp', 'IP гостевого шлюза', o.guestIp) +
      wizField('w-guestPort', 'Порт под гостей', o.guestPort) +
      '</div>' +
      wizSwitch('w-wifi', 'Wi-Fi на этом роутере', o.wifi, 'создать SSID и профиль безопасности') +
      '<div class="wz-group' + (o.wifi ? '' : ' off') + '" data-g="wifi">' +
      wizField('w-wifiSsid', 'Имя сети (SSID)', o.wifiSsid) +
      wizField('w-wifiPass', 'Пароль Wi-Fi', o.wifiPass, 'минимум 8 символов') +
      '<div class="wz-row"><span class="wz-l"></span><button class="btn" id="wizGenPass" type="button">Сгенерировать пароли Wi-Fi</button></div>' +
      '<div class="wz-group' + (o.guest ? '' : ' off') + '" data-g="guest">' +
      wizField('w-wifiGuestSsid', 'Гостевой SSID', o.wifiGuestSsid) +
      wizField('w-wifiGuestPass', 'Пароль гостевого Wi-Fi', o.wifiGuestPass) +
      '</div>' +
      wizSelect('w-wifiCountry', 'Страна (регуляторные правила)', o.wifiCountry, [
        { v: 'belarus', t: 'Беларусь' },
        { v: 'russia4', t: 'Россия' },
        { v: 'ukraine', t: 'Украина' },
        { v: 'lithuania', t: 'Литва' },
        { v: 'latvia', t: 'Латвия' },
        { v: 'estonia', t: 'Эстония' },
        { v: 'poland', t: 'Польша' },
        { v: 'kazakhstan', t: 'Казахстан' },
        { v: 'etsi', t: 'ETSI (Европа)' }
      ], 'влияет на разрешённые каналы и мощность') +
      wizField('w-wifiCh24', 'Канал 2.4 ГГц', o.wifiCh24, '1, 6 и 11 не пересекаются') +
      wizField('w-wifiCh5', 'Канал 5 ГГц', o.wifiCh5, '36–48 или 149–161') +
      wizSelect('w-wifiWidth', 'Ширина канала', o.wifiWidth, [
        { v: '20', t: '20 МГц — максимум совместимости' },
        { v: '40', t: '40 МГц' },
        { v: '80', t: '80 МГц — только 5 ГГц' }
      ]) +
      wizField('w-wifiTxPower', 'Мощность передатчика, dBm', o.wifiTxPower, 'пусто — авто; 17–20 dBm обычно достаточно') +
      '<div class="wz-row"><span class="wz-l"></span><a class="btn" href="#/coverage">Рассчитать зону покрытия</a></div>' +
      '</div></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('ip', 15) + 'IPv6</h3>' +
      wizSelect('w-ipv6', 'IPv6', o.ipv6, [
        { v: 'off', t: 'Не нужен' },
        { v: 'pd', t: 'Префикс от провайдера (DHCPv6-PD)' },
        { v: 'static', t: 'Свой префикс /64' }
      ]) +
      '<div class="wz-group' + (o.ipv6 === 'static' ? '' : ' off') + '" data-g="ipv6s">' +
      wizField('w-ipv6Prefix', 'Префикс IPv6', o.ipv6Prefix, 'например 2001:db8:1::/64') +
      '</div></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('down', 15) + 'VPN и серверы</h3>' +
      wizSwitch('w-wg', 'WireGuard', o.wg, 'самый быстрый VPN: сервер на роутере или клиент к чужому серверу') +
      '<div class="wz-group' + (o.wg ? '' : ' off') + '" data-g="wg">' +
      wizSelect('w-wgMode', 'Роль роутера', o.wgMode || 'server', [
        { v: 'server', t: 'Сервер — клиенты подключаются к роутеру' },
        { v: 'client', t: 'Клиент — роутер подключается к другому серверу' }
      ], 'сервер — удалённый доступ; клиент — связать филиал с офисом') +
      wizField('w-wgIp', 'Адрес роутера в туннеле', o.wgIp, 'сервер: 10.10.10.1, клиент: адрес, выданный сервером') +
      '</div>' +
      '<div class="wz-group' + (o.wg && o.wgMode !== 'client' ? '' : ' off') + '" data-g="wgServer">' +
      wizField('w-wgPort', 'Порт WireGuard (UDP)', o.wgPort, 'клиенты указывают его в Endpoint') +
      '</div>' +
      '<div class="wz-group' + (o.wg && o.wgMode === 'client' ? '' : ' off') + '" data-g="wgClient">' +
      wizField('w-wgEndpoint', 'Адрес сервера', o.wgEndpoint, 'IP:порт, например 203.0.113.20:13231') +
      wizField('w-wgServerPub', 'Публичный ключ сервера', o.wgServerPub, '44 символа Base64 — у администратора сервера') +
      wizField('w-wgAllowed', 'Что забирать через туннель', o.wgAllowed,
        '0.0.0.0/0 — весь трафик, или 10.10.10.0/24 — только офис') +
      wizField('w-wgKeepalive', 'Keepalive, секунд', o.wgKeepalive, '25 — держит соединение через NAT') +
      '</div>' +
      wizSwitch('w-l2tp', 'L2TP/IPsec-сервер', o.l2tp, 'совместим с телефонами без клиента') +
      '<div class="wz-group' + (o.l2tp ? '' : ' off') + '" data-g="l2tp">' +
      wizField('w-l2tpPsk', 'IPsec PSK', o.l2tpPsk) +
      wizField('w-l2tpPool', 'Пул адресов для VPN', o.l2tpPool) +
      '</div>' +
      wizSwitch('w-ovpn', 'OpenVPN-сервер', o.ovpn, 'сертификаты выпускаются на роутере, клиент — OpenVPN Connect') +
      '<div class="wz-group' + (o.ovpn ? '' : ' off') + '" data-g="ovpn">' +
      wizField('w-ovpnCn', 'Имя сервера (CN)', o.ovpnCn, 'домен или внешний IP — попадёт в сертификат') +
      wizField('w-ovpnPort', 'Порт OpenVPN (TCP)', o.ovpnPort, 'по умолчанию 1194') +
      wizField('w-ovpnUser', 'Логин клиента', o.ovpnUser) +
      wizField('w-ovpnPass', 'Пароль клиента', o.ovpnPass) +
      wizField('w-ovpnServerDays', 'Срок серверного сертификата, дней', o.ovpnServerDays, '825 по умолчанию') +
      wizField('w-ovpnClientDays', 'Срок клиентских сертификатов, дней', o.ovpnClientDays, '365 по умолчанию') +
      '</div>' +
      wizSwitch('w-sstp', 'SSTP-сервер', o.sstp, 'TCP 443 — работает там, где режут UDP (L2TP и WireGuard)') +
      '<div class="wz-group' + (o.sstp ? '' : ' off') + '" data-g="sstp">' +
      wizField('w-sstpPort', 'Порт SSTP', o.sstpPort, '443 — маскируется под обычный HTTPS') +
      wizField('w-sstpUser', 'Логин клиента', o.sstpUser) +
      wizField('w-sstpPass', 'Пароль клиента', o.sstpPass) +
      '</div>' +
      wizSwitch('w-pppoeServer', 'PPPoE-сервер для абонентов', o.pppoeServer, 'мини-ISP') +
      '<div class="wz-group' + (o.pppoeServer ? '' : ' off') + '" data-g="pppoeSrv">' +
      wizField('w-pppoeServerPort', 'Порт/интерфейс абонентов', o.pppoeServerPort) +
      wizField('w-pppoePool', 'Пул абонентов', o.pppoePool) +
      wizField('w-pppoeServerUser', 'Логин абонента', o.pppoeServerUser, 'можно оставить пустым') +
      wizField('w-pppoeServerPass', 'Пароль абонента', o.pppoeServerPass) +
      '</div></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('iface', 15) + 'Проброс портов (NAT)</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">Проброс нужен камерам, NAS, RDP, веб-серверу. Hairpin-NAT добавится автоматически.</div>' +
      '<div id="wizFwd">' + (o.forwards || []).map(fwdRow).join('') + '</div>' +
      '<button class="btn" id="fwdAdd" type="button">+ Добавить правило</button></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('bridge', 15) + 'Сегменты VLAN</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">Офис, камеры, телефоны, IoT: каждый сегмент получает свой VLAN, шлюз, DHCP и изоляцию от LAN.</div>' +
      '<div id="wizSegs">' + (o.segments || []).map(segRow).join('') + '</div>' +
      '<button class="btn" id="segAdd" type="button">+ Добавить сегмент</button></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('ip', 15) + 'Статические маршруты</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">Сети за другим роутером, второй шлюз или отдельный маршрут через VPN. Дистанция 1 — основной, 2 — резервный.</div>' +
      '<div id="wizRoutes">' + (o.routes || []).map(routeRow).join('') + '</div>' +
      '<button class="btn" id="routeAdd" type="button">+ Добавить маршрут</button></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Резервирование адресов и имена</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">Постоянный адрес для принтера, камеры или NAS — по MAC. Локальные имена работают через DNS роутера.</div>' +
      '<div id="wizLeases">' + (o.leases || []).map(leaseRow).join('') + '</div>' +
      '<button class="btn" id="leaseAdd" type="button">+ Резервирование</button>' +
      '<div id="wizDns" style="margin-top:10px">' + (o.dnsStatic || []).map(dnsRow).join('') + '</div>' +
      '<button class="btn" id="dnsAdd" type="button">+ Локальное имя</button></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('gear', 15) + 'Сервисы</h3>' +
      wizSwitch('w-hotspot', 'Hotspot для гостей', o.hotspot, 'страница входа и ваучеры') +
      '<div class="wz-group' + (o.hotspot ? '' : ' off') + '" data-g="hotspot">' +
      wizField('w-hotspotPass', 'Пароль гостя', o.hotspotPass, 'логин guest') +
      '</div>' +
      wizSwitch('w-qos', 'Ограничение скорости (QoS)', o.qos, 'PCQ-очередь на LAN') +
      '<div class="wz-group' + (o.qos ? '' : ' off') + '" data-g="qos">' +
      wizField('w-wanDown', 'Скорость скачивания, Мбит/с', o.wanDown) +
      wizField('w-wanUp', 'Скорость отдачи, Мбит/с', o.wanUp) +
      '</div>' +
      wizSwitch('w-snmp', 'SNMP для мониторинга', o.snmp, 'Zabbix, PRTG, Observium') +
      '<div class="wz-group' + (o.snmp ? '' : ' off') + '" data-g="snmp">' +
      wizField('w-snmpCommunity', 'SNMP community', o.snmpCommunity) +
      wizField('w-snmpHost', 'Сеть мониторинга', o.snmpHost) +
      '</div>' +
      wizSwitch('w-syslog', 'Логи на сервер', o.syslog, 'remote syslog') +
      '<div class="wz-group' + (o.syslog ? '' : ' off') + '" data-g="syslog">' +
      wizField('w-syslogHost', 'IP сервера логов', o.syslogHost) +
      '</div>' +
      wizSwitch('w-reset', 'Сброс настроек перед применением', o.resetBefore, 'чистый конфиг: /system reset-configuration no-defaults=yes (строка в скрипте закомментирована — выполните её отдельно)') +
      wizSwitch('w-harden', 'Базовая защита от взлома', o.harden, 'MAC-сервер, discovery, blacklist, закрыть SIP/PPTP/H.323') +
      '</section>';

    const mailAny = !!(o.mail || o.backupMail);
    html += '<section class="card"><h3 class="card-h">' + svg('svc', 15) + 'Бэкап и уведомления на e-mail</h3>' +
      wizSwitch('w-backupMail', 'Бэкап и конфигурация на почту', o.backupMail,
        'каждый день: .backup и .rsc уходят письмом — есть из чего восстановить роутер') +
      '<div class="wz-group' + (o.backupMail ? '' : ' off') + '" data-g="backupMail">' +
      wizField('w-backupTime', 'Время отправки', o.backupTime, '03:30:00 — когда роутер свободен') +
      '</div>' +
      wizSwitch('w-mail', 'Письмо при падении канала', o.mail, 'SMTP + netwatch: узнаете о сбое раньше клиента') +
      '<div class="wz-group' + (mailAny ? '' : ' off') + '" data-g="mail">' +
      wizField('w-mailServer', 'SMTP-сервер', o.mailServer, 'например smtp.yandex.ru') +
      wizField('w-mailPort', 'Порт', o.mailPort, '587 с TLS') +
      wizField('w-mailFrom', 'От кого', o.mailFrom) +
      wizField('w-mailTo', 'Кому', o.mailTo, 'сюда будут приходить копии конфигурации') +
      wizField('w-mailUser', 'Логин SMTP', o.mailUser, 'можно оставить пустым') +
      wizField('w-mailPass', 'Пароль SMTP', o.mailPass, 'пароль приложения; останется в конфиге — отдельный ящик') +
      '</div></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Время и аренда адресов</h3>' +
      wizSelect('w-tz', 'Часовой пояс', o.tz, [
        { v: 'Europe/Minsk', t: 'Минск (UTC+3)' },
        { v: 'Europe/Moscow', t: 'Москва (UTC+3)' },
        { v: 'Europe/Kiev', t: 'Киев (UTC+2/3)' },
        { v: 'Europe/Warsaw', t: 'Варшава (UTC+1/2)' },
        { v: 'Europe/Vilnius', t: 'Вильнюс (UTC+2/3)' },
        { v: 'Europe/Riga', t: 'Рига (UTC+2/3)' },
        { v: 'Asia/Almaty', t: 'Алматы (UTC+5/6)' },
        { v: 'UTC', t: 'UTC' }
      ], 'нужен для корректных логов и сертификатов') +
      wizField('w-ntp', 'NTP-серверы', o.ntp, 'через запятую или пул') +
      wizField('w-leaseTime', 'Время аренды DHCP', o.leaseTime, '1d, 12h, 1w') +
      '</section>';

    html += '<section class="card"><h3 class="card-h">' + svg('svc', 15) + 'Дополнительно</h3>' +
      wizSwitch('w-protect', 'Firewall и защита', o.protect, 'рекомендуется включить') +
      wizSwitch('w-nat', 'NAT (masquerade)', o.nat, 'интернет для LAN') +

      '</section>';

    html += '<div class="wz-actions"><button class="btn primary" id="wizGo">Собрать конфиг</button>' +
      '<button class="btn" id="wizCheck">Проверить поля</button>' +
      '<button class="btn" id="wizReset">Сбросить</button></div>';
    html += '<div id="wizIssues"></div><div id="wizOut"></div>';
    html += '</div>';
    return html;
  }

  /* ------------------------------------------------------------------
     Версия роутера: в Windows-версии паспорт (версия RouterOS, прошивка,
     плата, пакет Wi-Fi) забирается прямо с роутера, в Android — вводится
     руками. Мастер по этим полям выбирает команды и вставляет в скрипт
     проверку версии.
     ------------------------------------------------------------------ */
  function rosCard(o) {
    const can = !!(window.RosProbe && window.RosProbe.available());
    let hint;
    if (can) {
      hint = '«Опросить» — программа подключится к роутеру (REST 443, API 8728 или api-ssl 8729), ' +
        'узнает версию RouterOS, прошивку RouterBOOT, плату и пакет Wi-Fi и подставит их в мастер. ' +
        'Пароль нигде не сохраняется.';
    } else {
      hint = 'Автоматический опрос есть в Windows-версии программы. Здесь впишите версию вручную — ' +
        'мастер соберёт конфиг под неё и вставит в скрипт проверку версии.';
    }
    let html = '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Версия роутера</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">' + esc(hint) + '</div>' +
      wizField('w-rosVersion', 'RouterOS', o.rosVersion, 'например 7.24.6') +
      wizField('w-rosBoard', 'Плата', o.rosBoard, 'например RB951G-2HnD') +
      wizField('w-rosFirmware', 'Прошивка RouterBOOT', o.rosFirmware, 'необязательно');
    if (can) {
      html += '<div class="tpl-save" style="margin:8px 0 4px">' +
        '<input class="inp" id="rosAddr" placeholder="адрес" value="192.168.88.1" maxlength="40">' +
        '<input class="inp" id="rosUser" placeholder="логин" value="admin" maxlength="40">' +
        '<input class="inp" id="rosPass" type="password" placeholder="пароль" autocomplete="new-password" maxlength="64">' +
        '</div>' +
        '<div class="chips"><button class="chip" id="rosProbeBtn" type="button">Опросить роутер</button>' +
        '<button class="chip" id="rosFindBtn" type="button">Найти в сети</button></div>';
    }
    html += '<div id="rosOut" class="hint" style="margin-top:8px">' +
      (rosLast ? rosInfoHTML(rosLast) : '') + '</div></section>';
    return html;
  }

  let rosLast = null;      // последний опрошенный роутер — переживает перерисовку мастера
  let rosPassMemo = '';    // пароль только в памяти страницы: на диск не попадает

  function rosInfoHTML(info) {
    const rows = [
      ['Версия RouterOS', info.version],
      ['Плата', info.board],
      ['Прошивка', info.firmware ? info.firmware + (info.firmwareUpgrade && info.firmwareUpgrade !== info.firmware ? ' → ' + info.firmwareUpgrade : '') : ''],
      ['Архитектура', info.arch],
      ['Wi-Fi', info.wifi === 'wifi' ? 'пакет wifi (' + (info.radios || []).join(', ') + ')' :
        info.wifi === 'legacy' ? 'пакет wireless (' + (info.radios || []).join(', ') + ')' : 'нет'],
      ['Порты', (info.ports || []).join(', ')],
      ['Сервисы', (info.services || []).join(', ')],
      ['Пакеты', (info.packages || []).join(', ')],
      ['Подключение', info.transport]
    ].filter(function (r) { return r[1]; });
    return '<b>' + esc(info.identity || info.address) + '</b> · ' + esc(window.RosProbe.summary(info)) + '<br>' +
      rows.map(function (r) { return esc(r[0]) + ': ' + esc(String(r[1])); }).join('<br>') +
      '<div class="chips" style="margin-top:8px"><button class="chip" id="rosApplyBtn" type="button">Подставить в мастер</button></div>';
  }

  function rosOut(html) {
    const el = document.getElementById('rosOut');
    if (el) el.innerHTML = html;
  }

  function rosExplain(e) {
    return esc((e && e.message) ? e.message : String(e));
  }

  /* подставить паспорт роутера в ответы мастера */
  function rosApply(info) {
    if (!info || !window.RosProbe) return;
    const f = window.RosProbe.fieldsFor(info);
    let next = Object.assign({}, wizCollect(), f);
    if (f.model && window.ConfigWizard && window.ConfigWizard.applyModel) {
      next = window.ConfigWizard.applyModel(next, f.model);
    }
    if (f.rosVersion) next.rosVersion = f.rosVersion;
    if (f.rosBoard) next.rosBoard = f.rosBoard;
    if (f.rosFirmware) next.rosFirmware = f.rosFirmware;
    wizStore(next);
    route();
    toast('Опрос: ' + (window.RosProbe.summary(info) || info.address));
  }

  /* Памятка: почему верный пароль может не подойти по API.
     Это самая частая причина «роутер отклонил логин или пароль» — у
     пользователя или его группы не включена политика api / rest-api. */
  function rosHelpHint() {
    return '<details class="ros-help" style="margin-top:10px">' +
      '<summary>Пароль верный, а вход не проходит? Что проверить на роутере</summary>' +
      '<div class="hint" style="margin-top:6px">' +
      '1. Политика <b>api</b> у группы пользователя: <code>/user group print detail</code> — ' +
      'в policy должно быть <code>api</code>; для REST ещё <code>rest-api</code>.<br>' +
      '2. Двухфакторный вход (TOTP) у пользователя отключает вход по API — заходите Winbox или через веб.<br>' +
      '3. Сервис включён и не ограничен адресом: <code>/ip service print</code> — у строки ' +
      '<code>api</code> не должно быть флага <code>X</code> (<code>X</code> = сервис выключен), ' +
      'а в колонке Address не должно быть чужой подсети.<br>' +
      '4. Включить: <code>/ip service enable api</code> (и <code>api-ssl</code>, <code>www-ssl</code> для REST).<br>' +
      '5. Конфиг «защиты» из мастера отключает api/www-ssl — после его применения опрос не работает ' +
      'до повторного включения сервисов.<br>' +
      'Кнопка «Проверить доступность» показывает, открыты ли порты 8728/8729/443 — начните с неё.' +
      '</div></details>';
  }

  /* Разбор неудачного опроса: текст, таблица попыток и подсказки.
     Данные приходят от Go-сервера (см. windows/rosdiag.go). */
  function rosFailHtml(e) {
    let html = '<b>' + rosExplain(e) + '</b>';
    const attempts = (e && e.attempts) || [];
    if (attempts.length) {
      html += '<div class="tbl-wrap" style="margin-top:6px"><table class="tbl"><thead>' +
        '<tr><th>Путь</th><th>Порт</th><th>Что вышло</th></tr></thead><tbody>' +
        attempts.map(function (a) {
          const state = a.ok ? '✓ работает' : esc(a.detail || a.kind || '');
          return '<tr><td>' + esc(a.transport) + '</td><td>' + esc(String(a.port)) +
            '</td><td>' + state + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    const hints = (e && e.hints) || [];
    if (hints.length) {
      html += '<ul style="margin:6px 0 0 18px">' + hints.map(function (h) {
        return '<li>' + esc(h) + '</li>';
      }).join('') + '</ul>';
    }
    return html;
  }

  /* «Проверить доступность»: только TCP, без логина и пароля.
     Отвечает, включены ли сервисы и наш ли это вообще роутер. */
  function rosCheckRun(btn) {
    if (!window.RosProbe || !window.RosProbe.available()) return;
    const addr = ((document.getElementById('rosAddr') || {}).value || '').trim() || '192.168.88.1';
    const saved = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Проверяю…'; btn.disabled = true; }
    rosOut('Стучусь в порты 8291, 8728, 8729, 443, 80, 22 на ' + esc(addr) + '…');
    window.RosProbe.check(addr).then(function (res) {
      if (btn) { btn.textContent = saved; btn.disabled = false; }
      const rows = res.ports.map(function (p) {
        return '<tr><td>' + esc(String(p.port)) + ' · ' + esc(p.label) + '</td><td>' +
          (p.open ? '<b>открыт</b>' : 'закрыт') + '</td><td>' + esc(p.detail) + '</td></tr>';
      }).join('');
      let tail;
      if (!res.open.length) {
        tail = '<b>Ни один порт не отвечает.</b> Проверьте адрес: скорее всего, это не роутер ' +
          'или компьютер в другой сети. Нажмите «Найти в сети» — программа покажет, кто ответил.';
      } else if (res.open.indexOf(8728) < 0 && res.open.indexOf(8729) < 0 &&
                 res.open.indexOf(443) < 0 && res.open.indexOf(80) < 0) {
        tail = 'Winbox (8291) открыт, а API и REST закрыты — поэтому опрос не проходит. ' +
          'На роутере: <code>/ip service enable api</code> (или <code>api-ssl</code>, ' +
          '<code>www-ssl</code> / <code>www</code> для REST).';
      } else if (res.open.indexOf(8728) < 0 && res.open.indexOf(8729) < 0) {
        // API закрыт, но REST отвечает: этим путём можно проверить пароль
        // отдельно от политики api — программа так и делает при опросе.
        tail = 'API (8728/8729) закрыт, зато REST отвечает — опрос пойдёт через него. ' +
          'Политики для путей разные: REST требует <b>rest-api</b>, API — <b>api</b>.';
      } else {
        tail = 'Сервисы открыты — можно нажимать «Опросить». Если пароль при этом отклонён, ' +
          'проверьте политику <b>api</b> у пользователя (см. памятку ниже).';
      }
      rosOut('<b>' + esc(res.address || addr) + '</b>' +
        '<div class="tbl-wrap" style="margin-top:6px"><table class="tbl"><thead>' +
        '<tr><th>Порт</th><th>Состояние</th><th>Пояснение</th></tr></thead><tbody>' + rows +
        '</tbody></table></div><div style="margin-top:6px">' + tail + '</div>');
    }).catch(function (e) {
      if (btn) { btn.textContent = saved; btn.disabled = false; }
      rosOut('<b>Проверка не удалась:</b> ' + rosExplain(e));
    });
  }

  function rosProbeRun(btn) {
    if (!window.RosProbe || !window.RosProbe.available()) return;
    const addr = (document.getElementById('rosAddr') || {}).value || '192.168.88.1';
    const user = (document.getElementById('rosUser') || {}).value || 'admin';
    const pass = (document.getElementById('rosPass') || {}).value || '';
    const saved = btn ? btn.textContent : '';
    rosPassMemo = pass;
    if (btn) { btn.textContent = 'Подключаюсь…'; btn.disabled = true; }
    rosOut('Пробую REST (443), затем API (8728) и api-ssl (8729)…');
    window.RosProbe.probe(addr, user, pass).then(function (info) {
      if (btn) { btn.textContent = saved; btn.disabled = false; }
      const rows = [
        ['Версия RouterOS', info.version],
        ['Плата', info.board],
        ['Прошивка', info.firmware ? info.firmware + (info.firmwareUpgrade && info.firmwareUpgrade !== info.firmware ? ' → ' + info.firmwareUpgrade : '') : ''],
        ['Архитектура', info.arch],
        ['Wi-Fi', info.wifi === 'wifi' ? 'пакет wifi (' + (info.radios || []).join(', ') + ')' :
          info.wifi === 'legacy' ? 'пакет wireless (' + (info.radios || []).join(', ') + ')' : 'нет'],
        ['Порты', (info.ports || []).join(', ')],
        ['Сервисы', (info.services || []).join(', ')],
        ['Пакеты', (info.packages || []).join(', ')],
        ['Подключение', info.transport]
      ].filter(function (r) { return r[1]; });
      let html = '<b>' + esc(info.identity || info.address) + '</b> · ' + esc(window.RosProbe.summary(info)) + '<br>' +
        rows.map(function (r) { return esc(r[0]) + ': ' + esc(String(r[1])); }).join('<br>') +
        '<div class="chips" style="margin-top:8px"><button class="chip" id="rosApplyBtn" type="button">Подставить в мастер</button></div>';
      rosLast = info;
      rosApply(info);   // перерисовка мастера заодно покажет отчёт опроса
    }).catch(function (e) {
      if (btn) { btn.textContent = saved; btn.disabled = false; }
      // Подробный разбор: какой путь закрыт, что ответил роутер, что делать.
      rosOut('<b>Не получилось:</b> ' + rosFailHtml(e));
    });
  }

  function rosFind(btn) {
    if (!window.RosProbe || !window.RosProbe.available()) return;
    const saved = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Ищу…'; btn.disabled = true; }
    const prefer = ((document.getElementById('rosAddr') || {}).value || '').trim();
    rosOut('Слушаю MNDP (UDP 5678) и порты 8728/8291 в своих подсетях…');
    window.RosProbe.discover(prefer).then(function (found) {
      if (btn) { btn.textContent = saved; btn.disabled = false; }
      if (!found.length) {
        rosOut('Никого не нашёл. Впишите адрес роутера руками (обычно 192.168.88.1) — ' +
          'Windows-версия может быть не в той же сети, что роутер.');
        return;
      }
      /* Свои и «чужие» адреса разделяем: раньше в общий список попадали
         подсети виртуальных адаптеров (Hyper-V, VirtualBox, WSL, Docker),
         и человек видел «непонятные IP не из этой сети». */
      const mine = found.filter(function (d) { return d.sameNet !== false; });
      const other = found.filter(function (d) { return d.sameNet === false; });
      const rowHtml = function (d) {
        const t = [d.identity, d.version ? 'RouterOS ' + d.version : '', d.board,
          d.source === 'mndp' ? 'MNDP' : 'порт ' + d.port,
          d.mac ? 'MAC ' + d.mac : ''].filter(Boolean).join(' · ');
        return '<div><button class="chip" data-rosaddr="' + esc(d.address) + '" type="button">' +
          esc(d.address) + '</button> ' + esc(t) + '</div>';
      };
      let html = '';
      if (mine.length) {
        html += '<b>В вашей сети: ' + mine.length + '</b><br>' + mine.map(rowHtml).join('');
      } else {
        html += '<b>В подсетях этого компьютера роутеров не видно.</b><br>' +
          'Проверьте, что компьютер подключён к той же сети, что роутер (Wi-Fi или кабель).<br>';
      }
      if (other.length) {
        html += '<details style="margin-top:6px"><summary>Ещё в сети: ' + other.length +
          ' — вероятно, другие сети и виртуальные адаптеры</summary>' +
          other.map(rowHtml).join('') + '</details>';
      }
      rosOut(html + '<div class="hint" style="margin-top:6px">Нажмите адрес — он подставится в поле, ' +
        'затем «Проверить доступность» и «Опросить».</div>');
      document.querySelectorAll('#rosOut [data-rosaddr]').forEach(function (b) {
        b.addEventListener('click', function () {
          const a = document.getElementById('rosAddr');
          if (a) a.value = b.getAttribute('data-rosaddr');
          const p = document.getElementById('rosPass');
          if (p) p.focus();
        });
      });
    }).catch(function (e) {
      if (btn) { btn.textContent = saved; btn.disabled = false; }
      rosOut('<b>Поиск не удался:</b> ' + rosExplain(e));
    });
  }

  /* сохранённые паспорта: показать последний и дать подставить */
  function rosSavedHint() {
    if (!window.RosProbe || !window.RosProbe.available()) return;
    window.RosProbe.saved().then(function (res) {
      if (!res.last) return;
      const l = res.last;
      const t = [l.identity, l.version ? 'RouterOS ' + l.version : '', l.board, l.updated].filter(Boolean).join(' · ');
      rosOut('Сохранённый роутер <b>' + esc(l.address) + '</b> — ' + esc(t) +
        ' <button class="chip" id="rosUseSaved" type="button">Опросить снова</button>' +
        ' <button class="chip" id="rosForget" type="button">Забыть</button>');
      const use = document.getElementById('rosUseSaved');
      if (use) use.addEventListener('click', function () {
        const a = document.getElementById('rosAddr');
        if (a) a.value = l.address;
        const u = document.getElementById('rosUser');
        if (u && l.user) u.value = l.user;
        const p = document.getElementById('rosPass');
        if (p) p.focus();
      });
      const fg = document.getElementById('rosForget');
      if (fg) fg.addEventListener('click', function () {
        window.RosProbe.forget(l.address).then(function () { rosOut('Запись удалена.'); })
          .catch(function (e) { rosOut('<b>Не удалось:</b> ' + rosExplain(e)); });
      });
    }).catch(function () { });
  }


  /* ------------------------------------------------------------------
     Применение конфига прямо из программы: сравнение с роутером
     («что изменится») и построчная отправка через API.
     ------------------------------------------------------------------ */
  function rosOutEl(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  /* адрес/логин/пароль: из полей страницы, иначе из последнего опроса */
  function rosCreds() {
    const val = function (id) {
      const el = document.getElementById(id);
      return el ? String(el.value || '').trim() : '';
    };
    return {
      address: val('rosAddr') || (rosLast && rosLast.address) || '',
      user: val('rosUser') || 'admin',
      password: val('rosPass') || rosPassMemo || ''
    };
  }

  function planHTML(plan) {
    const icon = { create: '+', exists: '=', update: '~', read: '·', script: '»', other: '?' };
    const title = {
      create: 'создать', exists: 'уже есть', update: 'изменить',
      read: 'чтение', script: 'скрипт', other: 'прочее'
    };
    return plan.slice(0, 300).map(function (it) {
      return '<div><b>' + (icon[it.kind] || '?') + '</b> <span title="' + esc(title[it.kind] || '') + '">' +
        esc(it.raw) + '</span>' +
        (it.note ? ' <span style="opacity:.7">— ' + esc(it.note) + '</span>' : '') + '</div>';
    }).join('');
  }

  function wizPlanRun(res) {
    const c = rosCreds();
    if (!c.address) {
      rosOutEl('wizApplyOut', 'Сначала укажите адрес роутера в карточке «Версия роутера».');
      return;
    }
    rosOutEl('wizApplyOut', 'Сравниваю конфиг с роутером…');
    window.RosProbe.plan(c.address, c.user, c.password, res.text).then(function (j) {
      const k = j.counts || {};
      rosOutEl('wizApplyOut', '<b>Что изменится:</b> создать ' + (k.create || 0) + ' · уже есть ' +
        (k.exists || 0) + ' · изменить ' + (k.update || 0) + ' · скрипт ' + (k.script || 0) +
        (j.snapshotAt ? ' · состояние от ' + esc(j.snapshotAt) : '') +
        '<div style="margin-top:6px">' + planHTML(j.plan || []) + '</div>');
    }).catch(function (e) { rosOutEl('wizApplyOut', '<b>Не получилось:</b> ' + rosExplain(e)); });
  }

  function wizApplyRun(res, btn) {
    const c = rosCreds();
    if (!c.address) {
      rosOutEl('wizApplyOut', 'Сначала укажите адрес роутера в карточке «Версия роутера».');
      return;
    }
    if (!c.password) {
      rosOutEl('wizApplyOut', 'Нужен пароль администратора — впишите его в карточке «Версия роутера».');
      return;
    }
    const ok = typeof confirm === 'function'
      ? confirm('Применить конфиг на ' + c.address + '?\n\nКоманды уйдут на роутер сразу. Часть из них может закрыть доступ по текущему подключению.')
      : true;
    if (!ok) return;
    const was = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Применяю…'; btn.disabled = true; }
    rosOutEl('wizApplyOut', 'Отправляю команды по одной…');
    window.RosProbe.apply(c.address, c.user, c.password, res.text, false).then(function (j) {
      if (btn) { btn.textContent = was; btn.disabled = false; }
      const k = j.counts || {};
      /* Статусы отчёта (см. windows/rosapply.go):
           ok       — команда выполнена
           exists   — уже было, менять нечего
           skipped  — не применилось: ошибка внутри :do … on-error, только чтение
                      или остановка. Раньше такие строки показывались как
                      «уже есть», и было непонятно, почему ничего не изменилось
           script   — выполнено скриптом на роутере (выражения [ … ])
           state    — фактическое состояние после применения
           note     — итоговая сводка */
      const LABELS = {
        ok: 'выполнено', exists: 'уже было', error: 'ошибка', skipped: 'не применилось',
        script: 'скрипт', state: 'на роутере', note: 'итог'
      };
      const all = j.results || [];
      const states = all.filter(function (r) { return r.status === 'state'; });
      const notes = all.filter(function (r) { return r.status === 'note'; });
      const rows = all.filter(function (r) {
        return r.status !== 'ok' && r.status !== 'state' && r.status !== 'note';
      });
      let html = '<b>Готово:</b> выполнено ' + (k.ok || 0) + ' · уже было ' + (k.exists || 0) +
        ' · не применилось ' + (k.skipped || 0) + ' · ошибок ' + (k.error || 0) +
        ' · скриптом ' + (k.script || 0);
      if (rows.length) {
        html += '<div style="margin-top:6px">' + rows.map(function (r) {
          return '<div>строка ' + r.line + ': ' + esc(r.raw || r.command || '') +
            ' — <b>' + esc(LABELS[r.status] || r.status) + '</b> ' + esc(r.message || '') + '</div>';
        }).join('') + '</div>';
      }
      if ((k.skipped || 0) > 0) {
        html += '<div class="hint" style="margin-top:6px">Строки «не применилось» — это не «уже есть»: ' +
          'роутер их отклонил (чаще всего нет нужного объекта, нет пакета или не хватает прав). ' +
          'Текст ответа указан рядом с каждой строкой.</div>';
      }
      if (states.length) {
        let last = '';
        const lines = states.map(function (r) {
          const head = r.raw !== last ? '<div style="margin-top:4px"><b>' + esc(r.raw) + '</b></div>' : '';
          last = r.raw;
          return head + '<div>' + esc(r.message) + '</div>';
        }).join('');
        html += '<details style="margin-top:8px"' + (states.length <= 8 ? ' open' : '') +
          '><summary>Сейчас на роутере: адреса и Wi-Fi</summary>' + lines + '</details>';
      }
      if (notes.length) {
        html += '<div style="margin-top:6px"><b>' + esc(notes.map(function (r) { return r.message; }).join(' ')) +
          '</b></div>';
      }
      rosOutEl('wizApplyOut', html +
        '<div class="hint" style="margin-top:8px">Если адрес роутера менялся — подключайтесь по новому. ' +
        'Вернуть прежнее состояние можно через Files → Restore (бэкап сделан перед применением).</div>');
      toast('Конфиг применён на ' + c.address);
      if (window.RosProbe && c.address) {
        window.RosProbe.probe(c.address, c.user, c.password).catch(function () { });
      }
    }).catch(function (e) {
      if (btn) { btn.textContent = was; btn.disabled = false; }
      rosOutEl('wizApplyOut', '<b>Не получилось:</b> ' + rosExplain(e));
    });
  }

  /* ------------------------------------------------------------------
     Страница «Мой роутер»: подключение, сохранённые роутеры,
     текущее состояние и обновления.
     ------------------------------------------------------------------ */
  function rosConnectCard() {
    if (!(window.RosProbe && window.RosProbe.available())) {
      return '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Роутер</h3>' +
        '<div class="hint">Живое подключение к роутеру есть в Windows-версии программы: ' +
        'из браузера нельзя открыть порт 8728. Версию и плату в Android-версии укажите вручную ' +
        'в мастере — конфиг соберётся так же.</div>' + rosHelpHint() + '</section>';
    }
    return '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Подключение к роутеру</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">Адрес, логин и пароль нужны только на время запроса — пароль не сохраняется.</div>' +
      '<div class="tpl-save">' +
      '<input class="inp" id="rosAddr" placeholder="адрес" value="192.168.88.1" maxlength="40">' +
      '<input class="inp" id="rosUser" placeholder="логин" value="admin" maxlength="40">' +
      '<input class="inp" id="rosPass" type="password" placeholder="пароль" autocomplete="new-password" maxlength="64">' +
      '</div>' +
      '<div class="chips"><button class="chip" id="rosProbeBtn" type="button">Опросить</button>' +
      '<button class="chip" id="rosCheckBtn" type="button">Проверить доступность</button>' +
      '<button class="chip" id="rosFindBtn" type="button">Найти в сети</button>' +
      '<button class="chip" id="rosSnapBtn" type="button">Прочитать состояние</button></div>' +
      '<div id="rosOut" class="hint" style="margin-top:8px"></div>' +
      rosHelpHint() + '</section>';
  }

  function routerView() {
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a>' +
      '<span class="sep">/</span><span>Мой роутер</span></div>';
    html += '<h1 class="art-title">Мой роутер</h1>';
    html += '<div class="hint" style="margin:-6px 0 10px">Опрос версии и прошивки, применение собранного конфига, ' +
      'снимок текущего состояния и обновления RouterOS — без Winbox и терминала.</div>';
    html += rosConnectCard();
    html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Сохранённые роутеры</h3>' +
      '<div id="rosList" class="hint">Читаю список…</div></section>';
    html += '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Текущее состояние</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">Снимок меню роутера: адреса, мосты, firewall, Wi-Fi, сервисы. ' +
      'По нему мастер показывает, что уже настроено.</div>' +
      '<div id="rosSnap" class="hint">Снимок ещё не читали.</div></section>';
    html += '<section class="card"><h3 class="card-h">' + svg('down', 15) + 'Обновления</h3>' +
      '<div class="chips"><button class="chip" id="rosUpdCheck" type="button">Проверить обновления</button></div>' +
      '<div id="rosUpd" class="hint" style="margin-top:8px">RouterOS и прошивка RouterBOOT проверяются отдельно.</div></section>';
    html += '</div>';
    return html;
  }

  /* ------------------------------------------------------------------
     «Окна Winbox 4» — настоящие снимки, сделанные в CI на живом RouterOS.
     ------------------------------------------------------------------ */
  function win4View() {
    const list = window.WIN4_SHOTS || [];
    const groups = [];
    list.forEach(function (x) {
      if (groups.indexOf(x.g) < 0) groups.push(x.g);
    });
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a>' +
      '<span class="sep">/</span><span>Окна Winbox 4</span></div>';
    html += '<h1 class="art-title">Окна Winbox 4 — настоящие снимки</h1>';
    html += '<div class="hint" style="margin:-6px 0 10px">Эти кадры сделаны автоматически в GitHub Actions: ' +
      'RouterOS 7.24.6 (CHR) в виртуальной машине и Winbox 4.4 на виртуальном экране. Ничего не дорисовано. ' +
      'Всего снимков: ' + list.length + '. Меню слева — то же, что в вашем Winbox. ' +
      'Под шагами статей показываются только кадры, где совпадают и окно, и данные шага; ' +
      'если такого кадра ещё нет, шаг честно показывает схему с нужными значениями.</div>';
    html += '<div class="chips" id="w4Filter"><button class="chip on" data-w4="*">Все</button>' +
      groups.map(function (g) { return '<button class="chip" data-w4="' + esc(g) + '">' + esc(g) + '</button>'; }).join('') +
      '</div>';
    html += '<div class="w4-grid" id="w4Grid">' + list.map(function (x) {
      return '<figure class="w4-fig" data-w4g="' + esc(x.g) + '">' +
        '<a href="img/shots/' + esc(x.f) + '" class="shot-link" data-title="' + esc(x.t) + '" aria-label="Открыть снимок на весь экран">' +
        '<img loading="lazy" src="img/shots/' + esc(x.f) + '" alt="' + esc(x.t) + '"></a>' +
        '<figcaption><b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span></figcaption></figure>';
    }).join('') + '</div></div>';
    return html;
  }

  function bindWin4() {
    const grid = document.getElementById('w4Grid');
    const filter = document.getElementById('w4Filter');
    if (!grid || !filter) return;
    filter.addEventListener('click', function (e) {
      const b = e.target.closest('[data-w4]');
      if (!b) return;
      const g = b.getAttribute('data-w4');
      filter.querySelectorAll('[data-w4]').forEach(function (x) { x.classList.toggle('on', x === b); });
      grid.querySelectorAll('.w4-fig').forEach(function (fig) {
        fig.style.display = (g === '*' || fig.getAttribute('data-w4g') === g) ? '' : 'none';
      });
    });
  }

  function rosSnapRender(snap) {
    const el = document.getElementById('rosSnap');
    if (!el) return;
    if (!snap) { el.innerHTML = 'Снимок не получен.'; return; }
    const counts = snap.counts || {};
    const keys = Object.keys(snap.menus || {}).sort();
    const summary = Object.keys(counts).filter(function (k) { return counts[k] > 0; })
      .map(function (k) { return '<span class="chip" style="cursor:default">' + esc(k.replace(/^\//, '')) + ': ' + counts[k] + '</span>'; })
      .join(' ');
    el.innerHTML = '<b>Снимок от ' + esc(snap.updated || '') + '</b>' +
      '<div class="chips" style="margin:6px 0">' + summary + '</div>' +
      keys.map(function (path) {
        const rows = snap.menus[path] || [];
        if (!rows.length) return '';
        return '<details style="margin:4px 0"><summary>' + esc(path) + ' — строк ' + rows.length + '</summary>' +
          '<div class="hint" style="margin-top:4px">' + rows.slice(0, 60).map(function (r) {
            const parts = [];
            ['name', 'address', 'chain', 'action', 'interface', 'comment', 'dst-address', 'ssid'].forEach(function (k) {
              if (r[k]) parts.push(k + '=' + r[k]);
            });
            return '<div>' + esc(parts.join(' ') || '(строка)') + '</div>';
          }).join('') + '</div></details>';
      }).join('');
  }

  function rosSavedList() {
    const el = document.getElementById('rosList');
    if (!el) return;
    if (!(window.RosProbe && window.RosProbe.available())) {
      el.innerHTML = 'Список сохранённых роутеров доступен в Windows-версии.';
      return;
    }
    window.RosProbe.saved().then(function (res) {
      if (!res.list.length) {
        el.innerHTML = 'Пока пусто. Опросите роутер — он появится здесь с версией и прошивкой.';
        return;
      }
      el.innerHTML = res.list.map(function (r) {
        const t = [r.identity, r.version ? 'RouterOS ' + r.version : '', r.board,
          r.firmware ? 'прошивка ' + r.firmware : '', r.updated].filter(Boolean).join(' · ');
        return '<div class="wz-row"><span class="wz-l">' + esc(r.address) + '</span>' +
          '<span class="wz-h" style="margin:0">' + esc(t) + '</span>' +
          '<span class="chips" style="margin:4px 0 0"><button class="chip" data-rosuse="' + esc(r.address) + '" type="button">В мастер</button>' +
          '<button class="chip" data-rossnap="' + esc(r.address) + '" type="button">Состояние</button>' +
          '<button class="chip" data-rosupd="' + esc(r.address) + '" type="button">Обновления</button>' +
          '<button class="chip" data-rosdel="' + esc(r.address) + '" type="button">Забыть</button></span></div>';
      }).join('');
      const fill = function (addr) {
        const a = document.getElementById('rosAddr');
        if (a) a.value = addr;
        const p = document.getElementById('rosPass');
        if (p) p.focus();
      };
      el.querySelectorAll('[data-rosuse]').forEach(function (b) {
        b.addEventListener('click', function () {
          const addr = b.getAttribute('data-rosuse');
          const rec = res.list.filter(function (x) { return x.address === addr; })[0];
          if (rec && window.ConfigWizard) {
            const cur = wizCollect();
            let next = Object.assign({}, cur, {
              rosVersion: rec.version || '', rosBoard: rec.board || '', rosFirmware: rec.firmware || ''
            });
            const model = window.RosProbe.modelFor({ board: rec.board, version: rec.version });
            if (model) next = window.ConfigWizard.applyModel(next, model);
            if (rec.wifi === 'wifi' || rec.wifi === 'legacy') {
              next.wifi = true;
              next.wifiKind = rec.wifi;
            }
            wizStore(next);
          }
          toast('Роутер ' + addr + ' подставлен в мастер');
          location.hash = '#/wizard';
        });
      });
      el.querySelectorAll('[data-rossnap]').forEach(function (b) {
        b.addEventListener('click', function () {
          fill(b.getAttribute('data-rossnap'));
          const btn = document.getElementById('rosSnapBtn');
          if (btn) btn.click();
        });
      });
      el.querySelectorAll('[data-rosupd]').forEach(function (b) {
        b.addEventListener('click', function () {
          fill(b.getAttribute('data-rosupd'));
          const btn = document.getElementById('rosUpdCheck');
          if (btn) btn.click();
        });
      });
      el.querySelectorAll('[data-rosdel]').forEach(function (b) {
        b.addEventListener('click', function () {
          const addr = b.getAttribute('data-rosdel');
          if (typeof confirm === 'function' && !confirm('Убрать ' + addr + ' из списка?')) return;
          window.RosProbe.forget(addr).then(function () { rosSavedList(); }).catch(function (e) {
            toast('Не удалось: ' + (e.message || e));
          });
        });
      });
    }).catch(function (e) {
      el.innerHTML = 'Не удалось прочитать список: ' + esc(e.message || String(e));
    });
  }

  function rosUpdatesRender(j) {
    const el = document.getElementById('rosUpd');
    if (!el) return;
    const u = j.updates || {};
    const rows = [];
    rows.push('<div>RouterOS: установлено <b>' + esc(u.installed || '—') + '</b>' +
      (u.latest ? ', доступно <b>' + esc(u.latest) + '</b>' : '') +
      (u.routerosNew ? ' — есть обновление' : (u.latest ? ' — обновление не нужно' : '')) + '</div>');
    if (u.status) rows.push('<div>Статус: ' + esc(u.status) + (u.channel ? ' · канал ' + esc(u.channel) : '') + '</div>');
    if (u.firmware) {
      rows.push('<div>Прошивка RouterBOOT: <b>' + esc(u.firmware) + '</b>' +
        (u.firmwareNext ? ' → доступна ' + esc(u.firmwareNew) : ' — обновление не нужно') + '</div>');
    }
    if (u.note) rows.push('<div style="opacity:.75">' + esc(u.note) + '</div>');
    let acts = '';
    if (u.routerosNew) acts += '<button class="chip" id="rosUpdRos" type="button">Обновить RouterOS</button>';
    if (u.firmwareNext) acts += '<button class="chip" id="rosUpdFw" type="button">Обновить прошивку</button>';
    acts += '<button class="chip" id="rosReboot" type="button">Перезагрузить роутер</button>';
    el.innerHTML = rows.join('') + '<div class="chips" style="margin-top:8px">' + acts + '</div>' +
      '<div id="rosUpdOut" class="hint" style="margin-top:8px"></div>';

    const run = function (action, question) {
      const c = rosCreds();
      if (!c.address || !c.password) {
        rosOutEl('rosUpdOut', 'Заполните адрес и пароль в блоке «Подключение к роутеру».');
        return;
      }
      if (typeof confirm === 'function' && !confirm(question)) return;
      rosOutEl('rosUpdOut', 'Отправляю команду на роутер…');
      window.RosProbe.updates(c.address, c.user, c.password, action).then(function (r) {
        rosOutEl('rosUpdOut', '<b>' + esc(r.message || 'Готово') + '</b>');
      }).catch(function (e) { rosOutEl('rosUpdOut', '<b>Не получилось:</b> ' + rosExplain(e)); });
    };
    const rosBtn = document.getElementById('rosUpdRos');
    if (rosBtn) rosBtn.addEventListener('click', function () {
      run('routeros', 'Обновить RouterOS? Роутер перезагрузится и будет недоступен 1–3 минуты.');
    });
    const fwBtn = document.getElementById('rosUpdFw');
    if (fwBtn) fwBtn.addEventListener('click', function () {
      run('firmware', 'Обновить прошивку RouterBOOT? После этого нужна перезагрузка роутера.');
    });
    const rbBtn = document.getElementById('rosReboot');
    if (rbBtn) rbBtn.addEventListener('click', function () {
      run('reboot', 'Перезагрузить роутер сейчас? Связь пропадёт на 1–2 минуты.');
    });
  }

  function bindRouter() {
    const snapBtn = document.getElementById('rosSnapBtn');
    if (!snapBtn) return;
    rosSavedList();
    const probe = document.getElementById('rosProbeBtn');
    if (probe) probe.addEventListener('click', function () { rosProbeRun(probe); });
    const find = document.getElementById('rosFindBtn');
    if (find) find.addEventListener('click', function () { rosFind(find); });
    const checkBtn = document.getElementById('rosCheckBtn');
    if (checkBtn) checkBtn.addEventListener('click', function () { rosCheckRun(checkBtn); });
    const pass = document.getElementById('rosPass');
    if (pass) {
      if (rosPassMemo) pass.value = rosPassMemo;
      pass.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (probe) rosProbeRun(probe); }
      });
    }
    snapBtn.addEventListener('click', function () {
      const c = rosCreds();
      if (!c.address) { rosOutEl('rosOut', 'Укажите адрес роутера.'); return; }
      rosOutEl('rosOut', 'Читаю меню роутера…');
      window.RosProbe.snapshot(c.address, c.user, c.password, false).then(function (j) {
        rosOutEl('rosOut', 'Состояние прочитано: меню ' + Object.keys((j.snapshot || {}).counts || {}).length);
        rosSnapRender(j.snapshot);
      }).catch(function (e) { rosOutEl('rosOut', '<b>Не получилось:</b> ' + rosExplain(e)); });
    });
    const updBtn = document.getElementById('rosUpdCheck');
    if (updBtn) updBtn.addEventListener('click', function () {
      const c = rosCreds();
      if (!c.address) { rosOutEl('rosUpd', 'Укажите адрес роутера в блоке подключения.'); return; }
      rosOutEl('rosUpd', 'Спрашиваю роутер (может занять до 30 секунд)…');
      window.RosProbe.updates(c.address, c.user, c.password, 'check').then(rosUpdatesRender)
        .catch(function (e) {
          rosOutEl('rosUpd', '<b>Не получилось:</b> ' + rosExplain(e) +
            '<div style="margin-top:6px">Проверка требует доступа роутера в интернет и включённого API.</div>');
        });
    });
    if (rosLast) rosOutEl('rosOut', rosInfoHTML(rosLast));
  }

  function wizCollect() {
    const g = function (id, def) {
      const el = document.getElementById(id);
      return el ? el.value : def;
    };
    const on = function (id) {
      const el = document.getElementById(id);
      return !!(el && el.classList.contains('on'));
    };
    const forwards = [];
    document.querySelectorAll('#wizFwd .fwd-row').forEach(function (row) {
      const get = function (cls) { const el = row.querySelector(cls); return el ? el.value.trim() : ''; };
      const f = {
        proto: get('.f-proto') || 'tcp',
        extPort: get('.f-ext'),
        toIp: get('.f-ip'),
        toPort: get('.f-to'),
        comment: get('.f-cmt')
      };
      if (f.extPort || f.toIp || f.toPort) forwards.push(f);
    });
    return {
      identity: g('w-identity', 'office-gw'),
      wan: g('w-wan', 'dhcp'),
      wanPort: g('w-wanPort', 'ether1'),
      wanIp: g('w-wanIp', ''), wanPrefix: g('w-wanPrefix', 24), wanGw: g('w-wanGw', ''),
      pppoeUser: g('w-pppoeUser', ''), pppoePass: g('w-pppoePass', ''),
      lanIp: g('w-lanIp', '192.168.88.1'), lanPrefix: g('w-lanPrefix', 24),
      lanPorts: g('w-lanPorts', 'ether2-ether5'),
      dhcp: on('w-dhcp'), dns: g('w-dns', '1.1.1.1,8.8.8.8'),
      guest: on('w-guest'), guestIp: g('w-guestIp', '192.168.20.1'), guestPort: g('w-guestPort', 'ether5'),
      guestPrefix: 24,
      wifi: on('w-wifi'), wifiSsid: g('w-wifiSsid', ''), wifiPass: g('w-wifiPass', ''),
      wifiGuestSsid: g('w-wifiGuestSsid', ''), wifiGuestPass: g('w-wifiGuestPass', ''),
      ipv6: g('w-ipv6', 'off'), ipv6Prefix: g('w-ipv6Prefix', ''),
      wg: on('w-wg'), wgIp: g('w-wgIp', '10.10.10.1'), wgPort: g('w-wgPort', 13231),
      wgMode: g('w-wgMode', 'server'), wgEndpoint: g('w-wgEndpoint', ''),
      wgServerPub: g('w-wgServerPub', ''), wgAllowed: g('w-wgAllowed', '0.0.0.0/0'),
      wgKeepalive: g('w-wgKeepalive', 25),
      ovpn: on('w-ovpn'), ovpnCn: g('w-ovpnCn', 'vpn.example.com'), ovpnPort: g('w-ovpnPort', 1194),
      ovpnUser: g('w-ovpnUser', 'vpn1'), ovpnPass: g('w-ovpnPass', ''),
      ovpnServerDays: g('w-ovpnServerDays', 825), ovpnClientDays: g('w-ovpnClientDays', 365),
      sstp: on('w-sstp'), sstpPort: g('w-sstpPort', 443),
      sstpUser: g('w-sstpUser', 'vpn1'), sstpPass: g('w-sstpPass', ''),
      l2tp: on('w-l2tp'), l2tpPsk: g('w-l2tpPsk', ''), l2tpPool: g('w-l2tpPool', ''),
      pppoeServer: on('w-pppoeServer'), pppoeServerPort: g('w-pppoeServerPort', 'ether5'),
      pppoePool: g('w-pppoePool', ''), pppoeServerUser: g('w-pppoeServerUser', ''),
      pppoeServerPass: g('w-pppoeServerPass', ''),
      forwards: forwards,
      segments: (function () {
        const out = [];
        document.querySelectorAll('#wizSegs .seg-row').forEach(function (r) {
          const get = function (cls) { const el = r.querySelector(cls); return el ? el.value.trim() : ''; };
          const sg = { vlanId: get('.s-vid'), name: get('.s-name'), ip: get('.s-ip'), port: get('.s-port') };
          if (sg.vlanId || sg.ip || sg.port) out.push(sg);
        });
        return out;
      })(),
      leases: (function () {
        const out = [];
        document.querySelectorAll('#wizLeases .lease-row').forEach(function (r) {
          const get = function (cls) { const el = r.querySelector(cls); return el ? el.value.trim() : ''; };
          const l = { mac: get('.l-mac'), ip: get('.l-ip'), comment: get('.l-cmt') };
          if (l.mac || l.ip) out.push(l);
        });
        return out;
      })(),
      dnsStatic: (function () {
        const out = [];
        document.querySelectorAll('#wizDns .dns-row').forEach(function (r) {
          const get = function (cls) { const el = r.querySelector(cls); return el ? el.value.trim() : ''; };
          const d = { name: get('.ds-name'), address: get('.ds-ip') };
          if (d.name || d.address) out.push(d);
        });
        return out;
      })(),
      author: g('w-author', ''),
      rosVersion: g('w-rosVersion', ''), rosBoard: g('w-rosBoard', ''),
      rosFirmware: g('w-rosFirmware', ''),
      wifiCountry: g('w-wifiCountry', 'belarus'), wifiCh24: g('w-wifiCh24', 6),
      wifiCh5: g('w-wifiCh5', 36), wifiWidth: g('w-wifiWidth', 20), wifiTxPower: g('w-wifiTxPower', ''),
      devSeg: on('w-devSeg'),
      dsVlanPc: g('w-dsVlanPc', 10), dsVlanWifi: g('w-dsVlanWifi', 30),
      dsVlanPhones: g('w-dsVlanPhones', 40), dsVlanIot: g('w-dsVlanIot', 50),
      dsWifiPc: g('w-dsWifiPc', 'PC-WiFi'), dsWifiPhones: g('w-dsWifiPhones', 'Phones'),
      dsWifiIot: g('w-dsWifiIot', 'Printers'),
      tz: g('w-tz', 'Europe/Minsk'), ntp: g('w-ntp', 'by.pool.ntp.org'),
      leaseTime: g('w-leaseTime', '1d'),
      backupMail: on('w-backupMail'), backupTime: g('w-backupTime', '03:30:00'),
      autobackup: on('w-backupMail'),
      mail: on('w-mail'), mailServer: g('w-mailServer', ''), mailPort: g('w-mailPort', 587),
      mailFrom: g('w-mailFrom', ''), mailTo: g('w-mailTo', ''),
      mailUser: g('w-mailUser', ''), mailPass: g('w-mailPass', ''),
      routes: (function () {
        const out = [];
        document.querySelectorAll('#wizRoutes .route-row').forEach(function (r) {
          const get = function (cls) { const el = r.querySelector(cls); return el ? el.value.trim() : ''; };
          const rt = { dst: get('.r-dst'), gw: get('.r-gw'), distance: get('.r-dist') };
          if (rt.dst || rt.gw) out.push(rt);
        });
        return out;
      })(),
      model: g('w-model', 'generic'),
      failover: on('w-failover'),
      wan1Kind: g('w-wan1Kind', 'dhcp'), wan1Port: g('w-wan1Port', 'ether1'),
      wan1Probe: g('w-wan1Probe', '1.1.1.1'),
      wan2Kind: g('w-wan2Kind', 'dhcp'), wan2Port: g('w-wan2Port', 'lte1'),
      wan2Check: g('w-wan2Check', '8.8.8.8'),
      wan2PppoeUser: g('w-wan2PppoeUser', 'login2'), wan2PppoePass: g('w-wan2PppoePass', 'password2'),
      wanDownSecs: g('w-wanDownSecs', 20), wanUpSecs: g('w-wanUpSecs', 60),
      harden: on('w-harden'), resetBefore: on('w-reset'),
      hotspot: on('w-hotspot'), hotspotPass: g('w-hotspotPass', 'guest-2026'),
      qos: on('w-qos'), wanDown: g('w-wanDown', 100), wanUp: g('w-wanUp', 100),
      snmp: on('w-snmp'), snmpCommunity: g('w-snmpCommunity', 'mon-8f3c1a'), snmpHost: g('w-snmpHost', '192.168.88.0/24'),
      syslog: on('w-syslog'), syslogHost: g('w-syslogHost', '192.168.88.10'),
      nat: on('w-nat'), protect: on('w-protect'),
      preset: wizSaved().preset || ''
    };
  }

  function wizIssuesHtml(issues) {
    if (!issues || !issues.length) {
      return '<div class="qz-fb ok" style="margin:10px 0"><b>Проверка пройдена.</b> Все обязательные поля заполнены корректно.</div>';
    }
    const errs = issues.filter(function (x) { return x.level === 'error'; });
    const warns = issues.filter(function (x) { return x.level === 'warn'; });
    let h = '<section class="card" style="margin-top:12px"><h3 class="card-h">' + svg('svc', 15) + 'Проверка полей</h3><ul class="clean">';
    errs.forEach(function (x) { h += '<li class="issue err">✕ ' + esc(x.msg) + '</li>'; });
    warns.forEach(function (x) { h += '<li class="issue warn">! ' + esc(x.msg) + '</li>'; });
    h += '</ul></section>';
    return h;
  }

  function wizRenderOutput(res, opts) {
    const out = document.getElementById('wizOut');
    const iss = document.getElementById('wizIssues');
    if (!out) return;
    if (iss) iss.innerHTML = '';
    const c = res.counts || {};
    let h = '<section class="card" style="margin-top:14px"><h3 class="card-h">' + svg('task', 15) + 'Готовый конфиг</h3>' +
      '<div class="hint" style="margin:-4px 0 10px">' + esc(res.title || '') + ' · строк: ' + (res.lines || 0) +
      ' · пробросов: ' + (c.forwards || 0) + ' · сегментов: ' + (c.segments || 0) +
      ' · резервирований: ' + (c.leases || 0) + ' · маршрутов: ' + (c.routes || 0) +
      (c.devices ? ' · подсетей: ' + c.devices : '') +
      ' · сервисов: ' + (c.services || 0) + ' · VPN: ' + (c.vpn || 0) +
      (c.notify ? ' · e-mail: вкл' : '') +
      (c.backup ? ' · бэкап на e-mail: вкл' : '') + '</div>';
    if (res.errors && res.errors.length) {
      h += '<div class="warn"><span class="wi">' + warnIcon() + '</span><div><b>Есть ошибки в полях:</b><br>' +
        res.errors.map(esc).join('<br>') + '</div></div>';
    }
    if (res.warnings && res.warnings.length) {
      h += '<div class="warn"><span class="wi">' + warnIcon() + '</span><div>' + res.warnings.map(esc).join('<br>') + '</div></div>';
    }
    const tgt = res.target || {};
    if (tgt.known) {
      h += '<div class="hint" style="margin:0 0 8px">Цель конфига: <b>RouterOS ' + esc(tgt.version) + '</b>' +
        (tgt.board ? ' · ' + esc(tgt.board) : '') +
        (tgt.firmware ? ' · прошивка RouterBOOT ' + esc(tgt.firmware) : '') +
        (tgt.major ? ' · ветка ' + esc(String(tgt.major)) + '.x' : '') + '</div>';
    } else {
      h += '<div class="warn"><span class="wi">' + warnIcon() + '</span><div>' +
        'Версия роутера не указана — команды собраны по правилам RouterOS 7.x. ' +
        'Опросите роутер в карточке «Версия роутера» (Windows-версия) или впишите версию вручную: ' +
        'тогда в скрипт попадёт проверка версии, а для 6.x — совместимые команды Wi-Fi.</div></div>';
    }
    h += '<div class="cfg"><div class="cfg-h"><span>' + esc(res.title || 'RouterOS 7') + '</span>' +
      '<span class="cfg-btns"><button class="copy">копировать</button>' +
      '<button class="share" data-share="cfg">поделиться</button>' +
      '<button class="share" id="wizSave">файл</button></span></div>' +
      '<pre>' + hlCfg(res.text || '') + '</pre></div>' +
      '<div class="hint" style="margin-top:10px">Вставьте в Winbox → New Terminal. Перед вставкой сохраните текущий конфиг: <code class="inl">/export file=before-change</code>.</div>' +
      (window.RosProbe && window.RosProbe.available()
        ? '<div class="chips" style="margin-top:10px">' +
          '<button class="chip" id="wizApplyDry" type="button">Что изменится на роутере</button>' +
          '<button class="chip" id="wizApplyGo" type="button">Применить на роутере</button></div>' +
          '<div id="wizApplyOut" class="hint" style="margin-top:8px"></div>'
        : '') +
      '</section>';
    out.innerHTML = h;
    const sv = document.getElementById('wizSave');
    if (sv) sv.addEventListener('click', function () {
      const name = 'routeros-' + cleanName(opts.identity) + '.rsc';
      const saved = saveTextFile(name, res.text);
      if (saved === 'blob') toast('Файл сохранён: ' + name);
      else if (!saved) shareText(res.text, 'Конфиг RouterOS');
    });
    const dryBtn = document.getElementById('wizApplyDry');
    if (dryBtn) dryBtn.addEventListener('click', function () { wizPlanRun(res); });
    const goBtn = document.getElementById('wizApplyGo');
    if (goBtn) goBtn.addEventListener('click', function () { wizApplyRun(res, goBtn); });
    if (out.scrollIntoView) { try { out.scrollIntoView({ block: 'start' }); } catch (e) { } }
  }

  function cleanName(s) {
    return String(s || 'config').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'config';
  }

  function saveTextFile(name, text) {
    if (window.AndroidBridge && typeof window.AndroidBridge.saveText === 'function') {
      try {
        window.AndroidBridge.saveText(name, text);
        return 'bridge';
      } catch (e) { }
    }
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
      return 'blob';
    } catch (e) { return false; }
  }

  let wizTick = null;

  function bindWizard() {
    const go = document.getElementById('wizGo');
    if (!go) return;

    const root = go.closest('.wrap');
    if (root) {
      root.addEventListener('input', function () {
        clearTimeout(wizTick);
        wizTick = setTimeout(function () { wizStore(wizCollect()); }, 400);
      });
    }

    /* Роль WireGuard: сервер (клиенты идут к нам) или клиент (идём к чужому серверу). */
    const wgModeEl = function () {
      const el = document.getElementById('w-wgMode');
      return el ? el.value : 'server';
    };

    /* Имя интерфейса по типу канала — без ручного ввода:
       LTE-модем → lte1, кабель и PPPoE → ether1 (основной) или ether5 (резерв).
       Поле правится только тогда, когда пустое или противоречит типу,
       поэтому введённый вручную свободный порт не затирается. */
    const wanIfFor = function (kind, which) {
      if (window.ConfigWizard && window.ConfigWizard.wanIfFor) return window.ConfigWizard.wanIfFor(kind, which);
      return String(kind || '').toLowerCase() === 'lte' ? 'lte1' : (which === 'main' ? 'ether1' : 'ether5');
    };
    const setPort = function (id, want, wrong) {
      const el = document.getElementById(id);
      if (!el) return;
      const v = String(el.value || '').trim();
      if (!v || wrong(v)) el.value = want;
    };
    const autoPorts = function (force) {
      const val = function (id, dflt) {
        const el = document.getElementById(id);
        return el && el.value ? el.value : dflt;
      };
      const mainKind = val('w-wan', 'dhcp');
      const k1 = val('w-wan1Kind', mainKind);
      const k2 = val('w-wan2Kind', 'lte');
      const mainIf = wanIfFor(mainKind, 'main');
      /* резерв: LTE-модем — lte1, кабель — ether5 (основной канал занят ether1) */
      const backIf = k2 === 'lte' ? 'lte1' : 'ether5';
      const fix = function (id, want, kind) {
        if (force) {
          const el = document.getElementById(id);
          if (el) el.value = want;
          return;
        }
        setPort(id, want, function (v) {
          return kind === 'lte' ? v !== 'lte1' : v === 'lte1';
        });
      };
      fix('w-wanPort', mainIf, mainKind);
      fix('w-wan1Port', wanIfFor(k1, 'main'), k1);
      fix('w-wan2Port', backIf, k2);
    };

    const sync = function () {
      const on = function (id) {
        const el = document.getElementById(id);
        return !!(el && el.classList.contains('on'));
      };
      const sel = document.getElementById('w-wan');
      const ipv6 = document.getElementById('w-ipv6');
      document.querySelectorAll('.wz-group').forEach(function (g) {
        const key = g.getAttribute('data-g');
        let show = false;
        if (key === 'static') show = sel && sel.value === 'static';
        if (key === 'pppoe') show = sel && sel.value === 'pppoe';
        if (key === 'guest') show = on('w-guest');
        if (key === 'devseg') show = on('w-devSeg');
        if (key === 'wifi') show = on('w-wifi');
        if (key === 'ipv6s') show = ipv6 && ipv6.value === 'static';
        if (key === 'wg') show = on('w-wg');
        if (key === 'wgServer') show = on('w-wg') && wgModeEl() !== 'client';
        if (key === 'wgClient') show = on('w-wg') && wgModeEl() === 'client';
        if (key === 'ovpn') show = on('w-ovpn');
        if (key === 'sstp') show = on('w-sstp');
        if (key === 'l2tp') show = on('w-l2tp');
        if (key === 'pppoeSrv') show = on('w-pppoeServer');
        if (key === 'failover') show = on('w-failover');
        if (key === 'hotspot') show = on('w-hotspot');
        if (key === 'qos') show = on('w-qos');
        if (key === 'snmp') show = on('w-snmp');
        if (key === 'syslog') show = on('w-syslog');
        if (key === 'mail') show = on('w-mail') || on('w-backupMail');
        if (key === 'backupMail') show = on('w-backupMail');
        g.classList.toggle('off', !show);
      });
    };

    document.querySelectorAll('.wz-row .switch').forEach(function (sw) {
      sw.addEventListener('click', function () {
        sw.classList.toggle('on');
        sync();
        wizStore(wizCollect());
      });
    });
    ['w-wan', 'w-ipv6', 'w-tz', 'w-wifiCountry', 'w-wifiWidth', 'w-model',
      'w-wan1Kind', 'w-wan2Kind', 'w-wgMode'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', function () {
        if (id === 'w-wan' || id === 'w-wan1Kind' || id === 'w-wan2Kind') autoPorts(true);
        sync(); wizStore(wizCollect());
      });
    });
    autoPorts(false);

    const rosBtn = document.getElementById('rosProbeBtn');
    if (rosBtn && window.RosProbe) {
      rosBtn.addEventListener('click', function () { rosProbeRun(rosBtn); });
      const findBtn = document.getElementById('rosFindBtn');
      if (findBtn) findBtn.addEventListener('click', function () { rosFind(findBtn); });
      const pass = document.getElementById('rosPass');
      if (pass) pass.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); rosProbeRun(rosBtn); }
      });
      const applyBtn = document.getElementById('rosApplyBtn');
      if (applyBtn && rosLast) {
        applyBtn.addEventListener('click', function () { rosApply(rosLast); });
      }
      if (!rosLast) rosSavedHint();
      if (rosPassMemo && pass) pass.value = rosPassMemo;
    }

    const modelSel = document.getElementById('w-model');
    if (modelSel) modelSel.addEventListener('change', function () {
      const cur = wizCollect();
      const next = window.ConfigWizard && window.ConfigWizard.applyModel ? window.ConfigWizard.applyModel(cur, modelSel.value) : cur;
      wizStore(next);
      route();
      toast('Модель: ' + modelSel.options[modelSel.selectedIndex].text);
    });
    document.querySelectorAll('#wizFwd .fwd-row').forEach(function (row) {
      const del = row.querySelector('.f-del');
      if (del) del.addEventListener('click', function () {
        row.parentNode.removeChild(row);
        wizStore(wizCollect());
      });
    });

    /* сегменты, резервирования, DNS: удаление существующих строк */
    [['#wizSegs .seg-row', '.s-del'], ['#wizLeases .lease-row', '.l-del'],
      ['#wizDns .dns-row', '.ds-del'], ['#wizRoutes .route-row', '.r-del']].forEach(function (sel) {
      document.querySelectorAll(sel[0]).forEach(function (row) {
        const del = row.querySelector(sel[1]);
        if (del) del.addEventListener('click', function () {
          row.parentNode.removeChild(row);
          wizStore(wizCollect());
        });
      });
    });

    const wire = function (btnId, hostId, rowFn, delSel, focusSel) {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', function () {
        const host = document.getElementById(hostId);
        host.insertAdjacentHTML('beforeend', rowFn(null, host.children.length));
        const row = host.lastElementChild;
        const del = row.querySelector(delSel);
        if (del) del.addEventListener('click', function () { row.parentNode.removeChild(row); });
        const f = row.querySelector(focusSel);
        if (f) f.focus();
      });
    };
    wire('routeAdd', 'wizRoutes', routeRow, '.r-del', '.r-dst');
    wire('segAdd', 'wizSegs', segRow, '.s-del', '.s-vid');
    wire('leaseAdd', 'wizLeases', leaseRow, '.l-del', '.l-mac');
    wire('dnsAdd', 'wizDns', dnsRow, '.ds-del', '.ds-name');

    const add = document.getElementById('fwdAdd');
    if (add) add.addEventListener('click', function () {
      const host = document.getElementById('wizFwd');
      const i = host.querySelectorAll('.fwd-row').length;
      host.insertAdjacentHTML('beforeend', fwdRow({ proto: 'tcp', extPort: '', toIp: '', toPort: '', comment: '' }, i));
      const row = host.lastElementChild;
      const del = row.querySelector('.f-del');
      if (del) del.addEventListener('click', function () { row.parentNode.removeChild(row); });
      const first = row.querySelector('.f-ext');
      if (first) first.focus();
    });

    document.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        const id = b.getAttribute('data-preset');
        const next = window.ConfigWizard ? window.ConfigWizard.applyPreset(wizCollect(), id) : wizCollect();
        wizStore(next);
        route();
        toast('Шаблон: ' + b.textContent);
      });
    });

    const gen = document.getElementById('wizGenPass');
    if (gen) gen.addEventListener('click', function () {
      const opts = { lower: true, upper: true, digit: true, sym: false };
      const p1 = genPassword(16, opts);
      const p2 = genPassword(16, opts);
      const a = document.getElementById('w-wifiPass');
      const b = document.getElementById('w-wifiGuestPass');
      if (a) { a.value = p1; a.dispatchEvent(new Event('input', { bubbles: true })); }
      if (b) { b.value = p2; b.dispatchEvent(new Event('input', { bubbles: true })); }
      wizStore(wizCollect());
      toast('Пароли обновлены — запишите их');
    });

    const check = document.getElementById('wizCheck');
    if (check) check.addEventListener('click', function () {
      const opts = wizCollect();
      wizStore(opts);
      const issues = window.ConfigWizard ? window.ConfigWizard.validate(opts) : [];
      const box = document.getElementById('wizIssues');
      if (box) box.innerHTML = wizIssuesHtml(issues);
      const out = document.getElementById('wizOut');
      if (out) out.innerHTML = '';
    });

    const reset = document.getElementById('wizReset');
    if (reset) reset.addEventListener('click', function () {
      store.del('wiz');
      route();
      toast('Ответы сброшены');
    });

    go.addEventListener('click', function () {
      const opts = wizCollect();
      wizStore(opts);
      const res = window.ConfigWizard ? window.ConfigWizard.generate(opts) : { text: '', warnings: ['Генератор не загружен'], lines: 0 };
      wizRenderOutput(res, opts);
    });

    const tplSave = document.getElementById('tplSave');
    if (tplSave) tplSave.addEventListener('click', function () {
      const nameEl = document.getElementById('tplName');
      const name = (nameEl && nameEl.value.trim()) ||
        ('Шаблон ' + new Date().toLocaleDateString('ru-RU'));
      const list = wizTpls().filter(function (t) { return t.name !== name; });
      list.unshift({ name: name, data: wizCollect(), at: Date.now() });
      wizTplsSave(list);
      route();
      toast('Шаблон сохранён: ' + name);
    });
    document.querySelectorAll('[data-tpl]').forEach(function (b) {
      b.addEventListener('click', function () {
        const t = wizTpls()[parseInt(b.getAttribute('data-tpl'), 10)];
        if (!t) return;
        wizStore(t.data);
        route();
        toast('Шаблон: ' + t.name);
      });
    });
    document.querySelectorAll('[data-tpldel]').forEach(function (b) {
      b.addEventListener('click', function () {
        const i = parseInt(b.getAttribute('data-tpldel'), 10);
        const list = wizTpls();
        list.splice(i, 1);
        wizTplsSave(list);
        route();
        toast('Шаблон удалён');
      });
    });

    sync();
  }

  /* ================= калькулятор подсетей ================= */
  function subnetView() {
    const last = store.get('snq') || '192.168.10.0/24';
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Калькулятор подсетей</span></div>';
    html += '<h1 class="art-title">Калькулятор подсетей</h1>';
    html += '<div class="card"><div class="sn-row"><input class="inp mono" id="snInput" value="' + esc(last) + '" placeholder="192.168.10.0/24">' +
      '<button class="btn primary" id="snGo">Посчитать</button></div>' +
      '<div class="hint">Можно вводить <b>192.168.10.5/24</b>, <b>10.0.0.0 26</b> или <b>192.168.1.0/255.255.255.0</b>.</div></div>';
    html += '<div id="snOut"></div>';
    html += '</div>';
    return html;
  }

  function snRender() {
    const inp = document.getElementById('snInput');
    const out = document.getElementById('snOut');
    if (!inp || !out) return;
    const C = window.NetCalc;
    if (!C) { out.innerHTML = '<div class="empty">Модуль расчёта не загружен</div>'; return; }
    const q = inp.value.trim();
    const p = C.parse(q);
    if (!p) {
      out.innerHTML = '<div class="card"><div class="empty">Не разобрал адрес. Пример: 192.168.10.0/24</div></div>';
      return;
    }
    store.set('snq', q);
    const inf = C.info(p.ip, p.prefix);
    const rows = [
      ['Адрес с префиксом', p.ipStr + '/' + p.prefix],
      ['Маска', inf.mask],
      ['Wildcard (для firewall)', inf.wildcard],
      ['Сеть', inf.network],
      ['Broadcast', inf.broadcast],
      ['Первый хост', inf.first],
      ['Последний хост', inf.last],
      ['Хостов в подсети', String(inf.hosts)],
      ['Обратная маска / prefix-list', inf.wildcard + ' · le ' + inf.prefix]
    ];
    let h = '<section class="card"><h3 class="card-h">' + svg('ip', 15) + 'Результат</h3><div class="kv">' +
      rows.map(function (r) { return '<div class="kv-r"><span>' + esc(r[0]) + '</span><b class="mono">' + esc(r[1]) + '</b></div>'; }).join('') +
      '</div></section>';

    const nextP = Math.min(30, p.prefix + 2);
    h += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Деление на подсети</h3>' +
      '<div class="sn-row"><span class="wz-l">Новый префикс</span><input class="inp mono" id="snNew" value="' + nextP + '" style="max-width:90px">' +
      '<button class="btn" id="snSplit">Разбить</button></div><div id="snSplitOut"></div></section>';
    out.innerHTML = h;

    const splitBtn = document.getElementById('snSplit');
    if (splitBtn) splitBtn.addEventListener('click', function () {
      const np = parseInt(document.getElementById('snNew').value, 10);
      const list = C.split(inf.networkInt, p.prefix, np, 64);
      const host = document.getElementById('snSplitOut');
      if (!list.length) { host.innerHTML = '<div class="empty">Новый префикс должен быть больше исходного</div>'; return; }
      host.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Подсеть</th><th>Диапазон</th><th>Broadcast</th><th>Хостов</th></tr></thead><tbody>' +
        list.map(function (x, i) {
          return '<tr><td>' + (i + 1) + '</td><td class="mono">' + esc(x.cidr) + '</td><td class="mono">' + esc(x.first + '–' + x.last) +
            '</td><td class="mono">' + esc(x.broadcast) + '</td><td>' + x.hosts + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (Math.pow(2, np - p.prefix) > list.length ? '<div class="hint">Показаны первые ' + list.length + ' подсетей</div>' : '');
    });
  }

  function bindSubnet() {
    const inp = document.getElementById('snInput');
    const go = document.getElementById('snGo');
    if (!inp) return;
    if (go) go.addEventListener('click', snRender);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') snRender(); });
    snRender();
  }

  /* ================= VLSM-планировщик ================= */
  function vlsmSaved() {
    let v = null;
    try { v = JSON.parse(store.get('vlsm') || 'null'); } catch (e) { v = null; }
    if (!v || !Array.isArray(v.rows)) {
      v = {
        base: '10.0.0.0/24',
        rows: [
          { name: 'Камеры', hosts: 50 },
          { name: 'Телефония', hosts: 20 },
          { name: 'Управление', hosts: 10 },
          { name: 'Гости', hosts: 60 }
        ]
      };
    }
    return v;
  }

  function vlsmStore(v) { store.set('vlsm', JSON.stringify(v)); }

  function vlsmRow(r, i) {
    return '<div class="vlsm-row" data-vi="' + i + '">' +
      '<input class="inp v-name" value="' + esc(r && r.name || '') + '" placeholder="Название">' +
      '<input class="inp v-hosts mono" value="' + esc(r && r.hosts != null ? r.hosts : '') + '" placeholder="Хостов">' +
      '<button class="btn v-del" type="button" aria-label="Удалить">✕</button></div>';
  }

  function vlsmView() {
    const v = vlsmSaved();
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>VLSM-планировщик</span></div>';
    html += '<h1 class="art-title">VLSM-планировщик</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Введите базовую сеть и сколько хостов нужно в каждом сегменте — планировщик разложит подсети без пересечений, от больших к малым.</div>';
    html += '<section class="card"><label class="wz-row"><span class="wz-l">Базовая сеть</span>' +
      '<input class="inp mono" id="vBase" value="' + esc(v.base) + '" placeholder="10.0.0.0/16"></label>' +
      '<div id="vRows">' + v.rows.map(vlsmRow).join('') + '</div>' +
      '<button class="btn" id="vAdd" type="button">+ Добавить сегмент</button></section>';
    html += '<div class="wz-actions"><button class="btn primary" id="vGo">Распределить</button>' +
      '<button class="btn" id="vCsv">Экспорт CSV</button></div>';
    html += '<div id="vOut"></div></div>';
    return html;
  }

  function vlsmCollect() {
    const rows = [];
    document.querySelectorAll('#vRows .vlsm-row').forEach(function (r) {
      const name = r.querySelector('.v-name').value.trim();
      const hosts = r.querySelector('.v-hosts').value.trim();
      if (name || hosts) rows.push({ name: name || 'сегмент', hosts: parseInt(hosts, 10) || 0 });
    });
    return { base: (document.getElementById('vBase') || {}).value || '', rows: rows };
  }

  function vlsmRender() {
    const out = document.getElementById('vOut');
    if (!out) return;
    const input = vlsmCollect();
    vlsmStore(input);
    if (!window.NetCalc) { out.innerHTML = '<div class="empty">Модуль расчёта не загружен</div>'; return; }
    if (!input.rows.length) { out.innerHTML = '<div class="card"><div class="empty">Добавьте хотя бы один сегмент</div></div>'; return; }
    const res = window.NetCalc.plan(input.base, input.rows);
    if (!res.ok) {
      out.innerHTML = '<div class="card"><div class="warn"><span class="wi">' + warnIcon() + '</span><div><b>Не получилось.</b> ' +
        esc(res.error) + '</div></div></div>';
      return;
    }
    let h = '<section class="card"><h3 class="card-h">' + svg('ip', 15) + 'План адресации</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">Базовая сеть ' + esc(res.base) + ' · сегментов ' + res.entries.length + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Сегмент</th><th>Подсеть</th><th>Маска</th><th>Диапазон</th><th>Хостов</th><th>Запас</th></tr></thead><tbody>' +
      res.entries.map(function (e, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(e.name) + '</td><td class="mono">' + esc(e.cidr) +
          '</td><td class="mono">' + esc(e.mask) + '</td><td class="mono">' + esc(e.first + '–' + e.last) +
          '</td><td>' + e.capacity + '</td><td>' + (e.waste >= 0 ? '+' + e.waste : e.waste) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (res.leftover ? '<div class="hint">Свободно после плана: <b>' + res.leftover.size + '</b> адресов, начиная с <b class="mono">' +
        esc(res.leftover.start) + '</b> (ближайший блок — <span class="mono">' + esc(res.leftover.cidr) + '</span>)</div>' : '') +
      '</section>';
    out.innerHTML = h;
  }

  let vlsmTick = null;

  function bindVlsm() {
    const go = document.getElementById('vGo');
    if (!go) return;

    const root = go.closest('.wrap');
    if (root) {
      root.addEventListener('input', function () {
        clearTimeout(vlsmTick);
        vlsmTick = setTimeout(function () {
          vlsmStore(vlsmCollect());
          vlsmRender();
        }, 500);
      });
    }
    go.addEventListener('click', vlsmRender);
    document.getElementById('vAdd').addEventListener('click', function () {
      const host = document.getElementById('vRows');
      const i = host.querySelectorAll('.vlsm-row').length;
      host.insertAdjacentHTML('beforeend', vlsmRow({ name: '', hosts: '' }, i));
      const row = host.lastElementChild;
      row.querySelector('.v-del').addEventListener('click', function () { row.parentNode.removeChild(row); });
      row.querySelector('.v-name').focus();
    });
    document.querySelectorAll('#vRows .v-del').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('.vlsm-row').parentNode.removeChild(b.closest('.vlsm-row')); });
    });
    document.getElementById('vCsv').addEventListener('click', function () {
      const input = vlsmCollect();
      const res = window.NetCalc.plan(input.base, input.rows);
      if (!res.ok) { toast('Сначала исправьте план'); return; }
      const lines = ['Сегмент,Хостов,Подсеть,Маска,Первый адрес,Последний адрес,Broadcast'];
      res.entries.forEach(function (e) {
        lines.push([e.name, e.hosts, e.cidr, e.mask, e.first, e.last, e.broadcast].join(','));
      });
      const csv = lines.join('\n');
      const name = 'vlsm-' + String(input.base).replace(/[^0-9.]+/g, '-') + '.csv';
      const saved = saveTextFile(name, csv);
      if (saved === 'blob') toast('CSV сохранён: ' + name);
      else if (!saved) shareText(csv, 'План адресации');
    });
    vlsmRender();
  }

  /* ================= резервная копия данных ================= */
  const BACKUP_KEYS = ['fav', 'read', 'notes', 'last', 'days', 'sqh', 'snq', 'wiz', 'vlsm', 'diffA', 'diffB', 'diffIgnore', 'shots', 'theme', 'autoResume', 'fs', 'audit', 'harden', 'poe'];

  function backupCollect() {
    const data = {};
    BACKUP_KEYS.forEach(function (k) {
      const v = store.get(k);
      if (v != null) data[k] = v;
    });
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('run:') === 0) data[k] = localStorage.getItem(k);
      }
    } catch (e) { }
    return {
      app: 'mikrotik-gide',
      version: window.APP_VERSION || 'dev',
      exported: new Date().toISOString(),
      data: data
    };
  }

  function backupView() {
    let dump = '';
    try { dump = JSON.stringify(backupCollect(), null, 1); } catch (e) { dump = '{}'; }
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Данные и резервная копия</span></div>';
    html += '<h1 class="art-title">Данные и резервная копия</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Избранное, прогресс, заметки, ответы мастера и черновики хранятся только на устройстве. Здесь их можно сохранить в файл или перенести на другой телефон.</div>';
    html += '<section class="card"><h3 class="card-h">' + svg('down', 15) + 'Экспорт</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">JSON с вашими данными: заметки, избранное, прогресс, чек-листы.</div>' +
      '<textarea class="inp mono diff-in" id="bOut" rows="6" readonly>' + esc(dump) + '</textarea>' +
      '<div class="wz-actions"><button class="btn" id="bCopy">Копировать</button>' +
      '<button class="btn" id="bShare">Поделиться</button>' +
      '<button class="btn" id="bFile">Сохранить файл</button>' +
      '<button class="btn" id="bHtml">Библиотека в HTML</button></div></section>';
    html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Импорт</h3>' +
      '<div class="hint" style="margin:-4px 0 8px">Вставьте JSON из резервной копии и нажмите «Восстановить». Текущие данные заменятся.</div>' +
      '<textarea class="inp mono diff-in" id="bIn" rows="6" placeholder="{ &quot;app&quot;: &quot;mikrotik-gide&quot;, … }"></textarea>' +
      '<div class="wz-actions"><button class="btn primary" id="bRestore">Восстановить</button>' +
      '<button class="btn" id="bWipe">Удалить все данные</button></div>' +
      '<div id="bMsg"></div></section>';
    html += '</div>';
    return html;
  }

  function bindBackup() {
    const copy = document.getElementById('bCopy');
    if (!copy) return;
    copy.addEventListener('click', function () {
      copyText(document.getElementById('bOut').value);
      toast('Скопировано');
    });
    document.getElementById('bShare').addEventListener('click', function () {
      shareText(document.getElementById('bOut').value, 'Резервная копия MikroTik-учебника');
    });
    document.getElementById('bFile').addEventListener('click', function () {
      const name = 'mikrotik-gide-backup-' + todayISO() + '.json';
      const saved = saveTextFile(name, document.getElementById('bOut').value);
      if (saved === 'blob') toast('Сохранено: ' + name);
      else if (!saved) toast('Сохранение недоступно — используйте «Поделиться»');
    });
    const bHtml = document.getElementById('bHtml');
    if (bHtml) bHtml.addEventListener('click', exportLibrary);
    document.getElementById('bRestore').addEventListener('click', function () {
      const msg = document.getElementById('bMsg');
      let obj = null;
      try { obj = JSON.parse(document.getElementById('bIn').value); } catch (e) { obj = null; }
      if (!obj || !obj.data || typeof obj.data !== 'object') {
        msg.innerHTML = '<div class="warn"><span class="wi">' + warnIcon() + '</span><div>Это не похоже на резервную копию приложения.</div></div>';
        return;
      }
      let n = 0;
      Object.keys(obj.data).forEach(function (k) {
        if (BACKUP_KEYS.indexOf(k) >= 0 || k.indexOf('run:') === 0) {
          store.set(k, String(obj.data[k]));
          n++;
        }
      });
      msg.innerHTML = '<div class="qz-fb ok"><b>Восстановлено ключей: ' + n + '.</b> Перезапустите приложение, чтобы применить всё.</div>';
      toast('Данные восстановлены');
    });
    document.getElementById('bWipe').addEventListener('click', function () {
      BACKUP_KEYS.forEach(function (k) { store.del(k); });
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.indexOf('run:') === 0) localStorage.removeItem(k);
        }
      } catch (e) { }
      toast('Данные удалены');
      route();
    });
  }

  /* ================= сравнение конфигов ================= */
  const DIFF_SAMPLE_A = '/interface bridge add name=bridge-lan\n' +
    '/ip address add address=192.168.88.1/24 interface=bridge-lan\n' +
    '/ip dns set servers=1.1.1.1\n' +
    '/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade\n';
  const DIFF_SAMPLE_B = '/interface bridge add name=bridge-lan\n' +
    '/ip address add address=192.168.88.1/24 interface=bridge-lan\n' +
    '/ip address add address=192.168.10.1/24 interface=vlan-office\n' +
    '/ip dns set servers=1.1.1.1,8.8.8.8\n' +
    '/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade\n';

  function diffView() {
    const a = store.get('diffA') || '';
    const b = store.get('diffB') || '';
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Сравнить конфиги</span></div>';
    html += '<h1 class="art-title">Сравнить конфиги</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Вставьте два вывода <code class="inl">/export</code> — приложение покажет, что добавилось и что исчезло.</div>';
    html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Было</h3>' +
      '<textarea class="inp mono diff-in" id="dA" rows="7" placeholder="/ip address add …">' + esc(a) + '</textarea></section>';
    html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Стало</h3>' +
      '<textarea class="inp mono diff-in" id="dB" rows="7" placeholder="/ip address add …">' + esc(b) + '</textarea></section>';
    html += '<div class="wz-actions"><button class="btn primary" id="dGo">Сравнить</button>' +
      '<button class="btn" id="dSample">Пример</button>' +
      '<label class="chk-line"><input type="checkbox" id="dIgnore"' + (store.get('diffIgnore') === '1' ? ' checked' : '') + '> игнорировать комментарии #</label></div>';
    html += '<div id="dOut"></div></div>';
    return html;
  }

  function diffRender() {
    const a = document.getElementById('dA').value;
    const b = document.getElementById('dB').value;
    const ignore = document.getElementById('dIgnore').checked;
    store.set('diffA', a);
    store.set('diffB', b);
    store.set('diffIgnore', ignore ? '1' : '0');
    const out = document.getElementById('dOut');
    if (!window.TextDiff) { out.innerHTML = '<div class="empty">Модуль сравнения не загружен</div>'; return; }
    if (!a.trim() && !b.trim()) { out.innerHTML = '<div class="card"><div class="empty">Заполните хотя бы одно поле</div></div>'; return; }
    const r = window.TextDiff.compare(a, b, { ignoreComments: ignore });
    let h = '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Различия</h3>' +
      '<div class="diff-stats"><span class="add">+' + r.added + '</span><span class="del">−' + r.removed + '</span>' +
      '<span class="same">без изменений: ' + r.same + '</span>' +
      (r.truncated ? '<span class="warn-inline">файл большой — сравнение по строкам</span>' : '') + '</div>';
    if (!r.changed) h += '<div class="empty">Конфиги идентичны</div>';
    else {
      h += '<div class="diff">' + r.lines.map(function (l) {
        const cls = l.t === '+' ? 'add' : l.t === '-' ? 'del' : 'ctx';
        return '<div class="dl ' + cls + '"><span class="sg">' + (l.t === ' ' ? ' ' : l.t) + '</span><span class="tx">' + hlCfg(l.s) + '</span></div>';
      }).join('') + '</div>';
    }
    h += '</section>';
    out.innerHTML = h;
  }

  function bindDiff() {
    const go = document.getElementById('dGo');
    if (!go) return;
    go.addEventListener('click', diffRender);
    document.getElementById('dSample').addEventListener('click', function () {
      document.getElementById('dA').value = DIFF_SAMPLE_A;
      document.getElementById('dB').value = DIFF_SAMPLE_B;
      diffRender();
    });
    document.getElementById('dIgnore').addEventListener('change', diffRender);
  }

  /* ================= курс «7 дней» ================= */
  function courseStartDate() { return store.get('courseStart') || ''; }

  function todayISO() { return isoOf(new Date()); }

  function courseToday() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function courseDayIndex(startISO) {
    if (!startISO) return 0;
    const start = new Date(startISO + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((now - start) / 86400000);
    return Math.max(0, Math.min(6, diff));
  }

  function courseDate(startISO, i) {
    const d = new Date(startISO + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }

  function courseView() {
    const days = window.COURSE || [];
    const start = courseStartDate();
    const rm = readMap();
    const totalItems = days.reduce(function (n, d) { return n + d.items.length; }, 0);
    const done = days.reduce(function (n, d) {
      return n + d.items.filter(function (id) { return rm[id]; }).length;
    }, 0);
    const pct = totalItems ? Math.round((done / totalItems) * 100) : 0;
    const cur = courseDayIndex(start);

    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Курс за 7 дней</span></div>';
    html += '<h1 class="art-title">Курс за 7 дней</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">По одному дню за подход: 4–5 статей и одно упражнение руками. Прогресс считается по прочитанным статьям, даты — от дня старта.</div>';

    html += '<section class="card hd-head"><div class="hd-progress"><div class="as-num"><b>' + pct + '%</b><span>' + done + ' из ' + totalItems + '</span></div>' +
      '<div class="as-body"><div class="upd-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="as-legend">' + (start
        ? 'старт ' + courseDate(start, 0) + ' · сегодня день ' + (cur + 1) + ' из ' + days.length
        : 'курс ещё не начат') + '</div></div></div>' +
      '<div class="wz-actions">' + (start
        ? '<button class="btn" id="courseReset">Начать заново</button>' +
          '<a class="btn primary" href="#/' + ((days[cur].items.filter(function (id) { return !rm[id]; })[0]) || days[cur].items[0]) + '">Продолжить день ' + (cur + 1) + '</a>'
        : '<button class="btn primary" id="courseStart">Начать курс сегодня</button>') +
      '</div></section>';

    days.forEach(function (d, i) {
      const read = d.items.filter(function (id) { return rm[id]; }).length;
      const allRead = read === d.items.length;
      const isNow = start && i === cur;
      html += '<section class="card cday' + (isNow ? ' now' : '') + (allRead ? ' done' : '') + '">' +
        '<h3 class="card-h">' + svg('book', 15) + 'День ' + d.day + ' · ' + esc(d.title) +
        '<span class="hd-gcount">' + read + '/' + d.items.length + '</span></h3>' +
        '<div class="cday-meta">' + (start ? courseDate(start, i) + ' · ' : '') + '≈ ' + d.hours + ' ч' +
        (isNow ? ' · <b>сегодня</b>' : '') + (allRead ? ' · ✓ пройден' : '') + '</div>' +
        '<div class="hint" style="margin:2px 0 10px">' + esc(d.goal) + '</div>' +
        '<div class="cday-list">' + d.items.map(function (id) {
          const a = BY_ID[id];
          if (!a) return '';
          return '<a class="list-row" href="#/' + id + '"><span class="n">' + (rm[id] ? '✓' : '•') + '</span>' +
            '<b>' + esc(a.t) + '</b><span>' + esc(a._group ? a._group.name : '') + '</span></a>';
        }).join('') + '</div>' +
        '<div class="cday-task"><b>Практика:</b> ' + esc(d.task) + '</div>' +
        (d.check ? '<div class="cfg" style="margin-top:10px"><div class="cfg-h"><span>Проверка</span>' +
          '<span class="cfg-btns"><button class="copy">копировать</button></span></div><pre>' + hlCfg(d.check) + '</pre></div>' : '') +
        '</section>';
    });
    html += '</div>';
    return html;
  }

  function bindCourse() {
    const st = document.getElementById('courseStart');
    if (st) st.addEventListener('click', function () {
      store.set('courseStart', courseToday());
      route();
      toast('Курс начат — день 1');
    });
    const rs = document.getElementById('courseReset');
    if (rs) rs.addEventListener('click', function () {
      store.del('courseStart');
      route();
      toast('Курс сброшен');
    });
  }

  /* ================= порты моделей ================= */
  function modelsView() {
    const maps = window.MODEL_MAPS || [];
    let sel = store.get('modelView') || (maps[0] ? maps[0].id : '');
    const m = maps.filter(function (x) { return x.id === sel; })[0] || maps[0];
    if (!m) return '<div class="wrap"><div class="empty">Нет данных о моделях</div></div>';

    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Порты моделей</span></div>';
    html += '<h1 class="art-title">Модели и совместимость</h1>';
    html += '<div class="hint" style="margin:-6px 0 10px">Матрица ходовых моделей и раскладка портов: какой порт для WAN, где PoE, где SFP ' +
      'и — главное — какой пакет Wi-Fi на устройстве.</div>';
    html += '<div class="chips"><a class="chip" href="#/poe">Рассчитать PoE-бюджет и блок питания →</a>' +
      '<a class="chip" href="#/wizard">Собрать конфиг под модель →</a></div>';
    html += '<div class="chips">' + maps.map(function (x) {
      return '<button class="chip' + (x.id === m.id ? ' on' : '') + '" data-model="' + x.id + '">' + esc(x.name.split(' (')[0]) + '</button>';
    }).join('') + '</div>';

    const specs = window.MODEL_SPECS || [];
    if (specs.length) {
      html += '<section class="card" id="compat"><h3 class="card-h">' + svg('system', 15) + 'Матрица совместимости: ' + specs.length + ' моделей</h3>' +
        '<div class="hint" style="margin:-4px 0 10px">Главное, из-за чего конфиг не применяется: какой пакет Wi-Fi на устройстве и какие у него порты. ' +
        'Если в колонке «пакет Wi-Fi» стоит <b>wireless</b> — команды <span class="mono">/interface wifi</span> на этом роутере не работают, нужны ' +
        '<span class="mono">/interface wireless</span> и радиоинтерфейс <span class="mono">wlan1</span>.</div>' +
        '<div class="wz-row" style="margin:0 0 10px"><input class="inp" id="mdl-filter" placeholder="Найти модель: ax3, 951, cAP…" autocomplete="off"></div>' +
        '<div class="tbl-wrap"><table class="tbl" id="mdl-matrix"><thead><tr><th>Модель</th><th>Пакет Wi-Fi</th><th>Диапазоны</th>' +
        '<th>Ethernet</th><th>SFP</th><th>USB</th><th>PoE-in</th><th>PoE-out</th><th>RAM</th></tr></thead><tbody>' +
        specs.map(function (x) {
          const legacy = /wireless/.test(x.pkg) && !/wifi-qcom/.test(x.pkg);
          const pkgCls = x.pkg === '—' ? '' : legacy ? ' style="color:#a15c00"' : ' style="color:#0b6b3a"';
          return '<tr data-spec="' + esc(x.id) + '"' + (x.id === m.id ? ' style="background:var(--focus,#eef5ff)"' : '') + '>' +
            '<td><b>' + esc(x.name) + '</b><div class="hint" style="margin:2px 0 0;font-size:12px">' + esc(x.note) + '</div></td>' +
            '<td' + pkgCls + '>' + esc(x.pkg) + '</td><td>' + esc(x.bands) + '</td><td class="mono">' + esc(x.eth) + '</td>' +
            '<td>' + esc(x.sfp) + '</td><td>' + esc(x.usb) + '</td><td class="mono">' + esc(x.poeIn) + '</td>' +
            '<td class="mono">' + esc(x.poeOut) + '</td><td>' + esc(x.ram) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="hint" style="margin-top:8px">Данные по даташитам MikroTik. У одной модели бывают ревизии — сверяйтесь с наклейкой и <span class="mono">/system resource print</span>.</div>' +
        '</section>';
    }

    html += '<section class="card"><h3 class="card-h">' + svg('iface', 15) + esc(m.name) + '</h3>' +
      '<div class="hint" style="margin:-4px 0 12px">' + esc(m.note || '') + '</div>' +
      '<div class="panel">' + m.ports.map(function (p) {
        const role = String(p.role || '').toLowerCase();
        return '<div class="port ' + (role === 'wan' ? 'wan' : role === 'wan2' ? 'wan2' : role === 'poe' ? 'poe' : role === 'uplink' ? 'uplink' : 'lan') + '">' +
          '<span class="p-led"></span>' +
          '<span class="p-num">' + (typeof p.n === 'number' ? p.n : '') + '</span>' +
          '<span class="p-lbl">' + esc(p.label) + '</span>' +
          '<span class="p-role">' + esc(p.role || '') + '</span></div>';
      }).join('') + '</div>' +
      '<div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Порт</th><th>Роль</th><th>Заметка</th></tr></thead><tbody>' +
      m.ports.map(function (p) {
        return '<tr><td class="mono">' + esc(p.label) + '</td><td>' + esc(p.role || '') + '</td><td>' + esc(p.note || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';

    if (m.extras && m.extras.length) {
      html += '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Дополнительно</h3><ul class="clean">' +
        m.extras.map(function (e) { return '<li><b>' + esc(e.t) + '</b> — ' + esc(e.note) + '</li>'; }).join('') + '</ul></section>';
    }
    html += '<div class="wz-actions"><button class="btn" data-wizmodel="' + esc(m.id) + '">Собрать конфиг для этой модели</button>';
    if (m.art && BY_ID[m.art]) html += '<a class="btn" href="#/' + m.art + '">Статья: ' + esc(BY_ID[m.art].t) + '</a>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function bindModels() {
    const f = document.getElementById('mdl-filter');
    if (f) {
      f.addEventListener('input', function () {
        const q = f.value.trim().toLowerCase();
        document.querySelectorAll('#mdl-matrix tbody tr').forEach(function (tr) {
          tr.style.display = !q || tr.textContent.toLowerCase().indexOf(q) >= 0 ? '' : 'none';
        });
      });
    }
    function setWizModel(id) {
      let v = {};
      try { v = JSON.parse(store.get('wiz') || '{}') || {}; } catch (e) { v = {}; }
      if (window.ConfigWizard && window.ConfigWizard.applyModel) v = window.ConfigWizard.applyModel(v, id);
      v.model = id;
      store.set('wiz', JSON.stringify(v));
      location.hash = '#/wizard';
    }
    document.querySelectorAll('[data-wizmodel]').forEach(function (b) {
      b.addEventListener('click', function () { setWizModel(b.getAttribute('data-wizmodel')); });
    });
    document.querySelectorAll('#mdl-matrix tbody tr').forEach(function (tr) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', function () {
        const id = tr.getAttribute('data-spec');
        if ((window.MODEL_MAPS || []).some(function (x) { return x.id === id; })) {
          store.set('modelView', id);
          route();
        } else {
          setWizModel(id);
        }
      });
    });
    document.querySelectorAll('[data-model]').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('modelView', b.getAttribute('data-model'));
        route();
      });
    });
  }

  /* ================= экспорт библиотеки в HTML ================= */
  const EXPORT_CSS = 'body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;line-height:1.55;color:#111}' +
    'h1{margin:0 0 4px;font-size:28px}h2{margin:32px 0 8px;border-bottom:2px solid #eee;padding-bottom:6px}h3{margin:22px 0 6px;font-size:18px}' +
    '.meta{color:#666;font-size:13px;margin-bottom:4px}.p{white-space:pre-wrap}pre{background:#f6f8fa;border:1px solid #e5e7eb;border-radius:8px;padding:10px;overflow-x:auto;font-size:13px}' +
    'code{background:#f6f8fa;padding:1px 4px;border-radius:4px}ul,ol{padding-left:22px}li{margin:4px 0}' +
    '.note{background:#fff8e5;border-left:3px solid #f0a13a;padding:8px 12px;border-radius:6px;margin:14px 0;font-size:14px}' +
    '@media print{pre{page-break-inside:avoid}h3{page-break-after:avoid}}';

  function articleBodyHtml(a, withHeading) {
    const parts = [];
    if (withHeading) parts.push('<h3>' + esc(a.t) + '</h3>');
    if (a.path) parts.push('<div class="meta">' + esc(a.path) + '</div>');
    if (a.purpose) parts.push('<p class="p">' + inline(a.purpose) + '</p>');
    if (a.usage && a.usage.length) {
      parts.push('<p><b>Где применяется:</b></p><ul>' + a.usage.map(function (u) {
        return '<li>' + inline(u) + '</li>';
      }).join('') + '</ul>');
    }
    const life = (window.CASES && window.CASES[a.id]) || null;
    if (life) {
      parts.push('<p><b>Пример из жизни.</b> ' + inline(life.s) + '</p>' +
        '<p><b>Что сделали.</b> ' + inline(life.d) + ' <b>Что получилось.</b> ' + inline(life.r) + '</p>');
    }
    if (a.steps && a.steps.length) {
      parts.push('<p><b>Порядок настройки:</b></p><ol>' + a.steps.map(function (st) {
        const t = typeof st === 'string' ? st : (st.t + (st.d ? ' — ' + st.d : ''));
        const cmd = (typeof st === 'object' && st.cmd) ? '<pre>' + hlCfg(st.cmd) + '</pre>' : '';
        return '<li>' + inline(t) + cmd + '</li>';
      }).join('') + '</ol>');
    }
    if (a.config) {
      const text = Array.isArray(a.config) ? a.config.join('\n') : String(a.config);
      parts.push('<p><b>Готовый конфиг:</b></p><pre>' + esc(text) + '</pre>');
    }
    if (a.mistakes && a.mistakes.length) {
      parts.push('<p><b>Частые ошибки:</b></p><ul>' + a.mistakes.map(function (m) {
        return '<li>' + inline(m) + '</li>';
      }).join('') + '</ul>');
    }
    if (a.check && a.check.length) {
      parts.push('<p><b>Проверка:</b></p><ul>' + a.check.map(function (c) {
        const txt = typeof c === 'string' ? c : (c.c || '');
        return '<li>' + inline(txt) + '</li>';
      }).join('') + '</ul>');
    }
    if (a.id && notesGet(a.id)) {
      parts.push('<div class="note"><b>Моя заметка:</b><br>' + esc(notesGet(a.id)).replace(/\n/g, '<br>') + '</div>');
    }
    return parts.join('\n');
  }

  function libraryHtml() {
    const ver = window.APP_VERSION || 'dev';
    const parts = [];
    parts.push('<!doctype html><html lang="ru"><head><meta charset="utf-8">');
    parts.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
    parts.push('<title>MikroTik · Учебник Winbox 4 — версия ' + esc(ver) + '</title>');
    parts.push('<style>' + EXPORT_CSS + '</style></head><body>');
    parts.push('<h1>MikroTik · Учебник Winbox 4</h1>');
    parts.push('<div class="meta">Версия ' + esc(ver) + ' · выгружено ' + new Date().toLocaleString('ru-RU') +
      ' · статей: ' + FLAT.length + '</div>');
    parts.push('<p class="meta">Содержание:</p><ol>' + GROUPS.map(function (g) {
      if (!g.items || !g.items.length) return '';
      return '<li>' + esc(g.name) + ' — ' + g.items.length + '</li>';
    }).join('') + '</ol>');
    GROUPS.forEach(function (g) {
      if (!g.items || !g.items.length) return;
      parts.push('<h2>' + esc(g.name) + '</h2>');
      g.items.forEach(function (a) {
        parts.push(articleBodyHtml(a, true));
      });
    });
    parts.push('<p class="meta">Выгружено из приложения «MikroTik · Учебник Winbox 4».</p></body></html>');
    return parts.join('\n');
  }

  function articleHtml(a) {
    const ver = window.APP_VERSION || 'dev';
    const parts = [];
    parts.push('<!doctype html><html lang="ru"><head><meta charset="utf-8">');
    parts.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
    parts.push('<title>' + esc(a.t) + ' · MikroTik</title>');
    parts.push('<style>' + EXPORT_CSS + '</style></head><body>');
    parts.push('<h1>' + esc(a.t) + '</h1>');
    parts.push('<div class="meta">' + esc(a._group.name) + (a.path ? ' · ' + esc(a.path) : '') +
      ' · RouterOS 7 / Winbox 4 · версия ' + esc(ver) + '</div>');
    parts.push(articleBodyHtml(a, false));
    parts.push('<p class="meta">Выгружено из приложения «MikroTik · Учебник Winbox 4».</p></body></html>');
    return parts.join('\n');
  }

  function exportArticle(a) {
    const slug = String(a.id || 'article').replace(/[^a-z0-9-]+/gi, '-').slice(0, 60);
    const name = 'mikrotik-' + slug + '-' + todayISO() + '.html';
    const saved = saveTextFile(name, articleHtml(a));
    if (saved === 'blob') toast('Статья сохранена: ' + name);
    else if (saved === 'bridge') toast('Файл сохраняется в Загрузки');
    else shareText(articleHtml(a), a.t);
  }

  function exportLibrary() {
    const html = libraryHtml();
    const name = 'mikrotik-gide-library-' + todayISO() + '.html';
    const saved = saveTextFile(name, html);
    if (saved === 'blob') toast('Библиотека сохранена: ' + name);
    else if (saved === 'bridge') toast('Файл сохраняется в Загрузки');
    else shareText(html, 'Библиотека MikroTik');
  }

  /* ================= мощность и покрытие Wi-Fi ================= */
  const CV_MAT = {
    dry: { t: 'гипсокартон / перегородка', db: 3 },
    glass: { t: 'стекло, окно', db: 2 },
    wood: { t: 'дерево, фанера', db: 4 },
    brick: { t: 'кирпичная стена', db: 10 },
    concrete: { t: 'бетонная стена', db: 15 },
    metal: { t: 'металл, зеркало, шкаф', db: 25 }
  };
  const CV_LIMIT = { '2.4': 20, '5': 23 };
  const CV_ENV = {
    open: { t: 'открытое пространство / улица', n: 2.0 },
    home: { t: 'квартира, гипсокартон', n: 2.8 },
    office: { t: 'офис, кабинеты', n: 3.0 },
    warehouse: { t: 'склад, стеллажи, металл', n: 3.5 }
  };
  const CV_MARGIN = 10; // запас: мебель, тело человека, антенна клиента хуже точки
  const CV_DBM = [[0, '1 мВт'], [10, '10 мВт'], [17, '50 мВт'], [20, '100 мВт'], [23, '200 мВт'], [26, '400 мВт'], [30, '1000 мВт']];

  function cvNum(v, def, min, max) {
    const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    if (!isFinite(n)) return def;
    return Math.max(min, Math.min(max, n));
  }

  function cvState() {
    const band = store.get('cvBand') === '5' ? '5' : '2.4';
    return {
      band: band,
      power: cvNum(store.get('cvPower'), 20, 0, 30),
      gain: cvNum(store.get('cvGain'), 3, 0, 24),
      loss: cvNum(store.get('cvLoss'), 0, 0, 10),
      walls: Math.round(cvNum(store.get('cvWalls'), 1, 0, 6)),
      mat: CV_MAT[store.get('cvMat')] ? store.get('cvMat') : 'brick',
      env: CV_ENV[store.get('cvEnv')] ? store.get('cvEnv') : 'office',
      target: Math.round(cvNum(store.get('cvTarget'), -67, -90, -40)),
      area: cvNum(store.get('cvArea'), 80, 5, 5000)
    };
  }

  function cvCalc(st) {
    const f = st.band === '5' ? 5200 : 2437;
    const n = CV_ENV[st.env].n;
    const wallLoss = st.walls * CV_MAT[st.mat].db;
    const eirp = st.power + st.gain - st.loss;
    // потери на 1 м: 20·log10(f МГц) − 27,55; дальше 10·n·log10(d)
    const pl1 = 20 * Math.log10(f) - 27.55;
    const dist = function (rssi) {
      const e = (eirp - wallLoss - CV_MARGIN - rssi - pl1) / (10 * n);
      return Math.pow(10, e);
    };
    const targetDist = dist(st.target);
    const cell = Math.PI * targetDist * targetDist;
    const aps = Math.max(1, Math.ceil(st.area / Math.max(1, cell * 0.75)));
    return {
      f: f, n: n, pl1: pl1, wallLoss: wallLoss, eirp: eirp, env: CV_ENV[st.env].t,
      over: eirp > CV_LIMIT[st.band],
      limit: CV_LIMIT[st.band],
      dist: dist, targetDist: targetDist, cell: cell, aps: aps,
      enough: cell * 0.75 * aps >= st.area
    };
  }

  function cvFmt(m) {
    if (!isFinite(m)) return '—';
    if (m >= 1000) return (m / 1000).toFixed(1).replace('.', ',') + ' км';
    if (m >= 10) return Math.round(m) + ' м';
    return m.toFixed(1).replace('.', ',') + ' м';
  }

  function cvSvg(res) {
    const levels = [[-50, '#2fe08a'], [-60, '#2f81f7'], [-67, '#f0a13a'], [-80, '#f85149']];
    const dmax = Math.max(1, res.dist(-80));
    const R = 88, cx = 104, cy = 100;
    const rings = levels.map(function (lv) {
      const d = res.dist(lv[0]);
      const r = Math.max(3, Math.min(R, R * d / dmax));
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r.toFixed(1) +
        '" fill="none" stroke="' + lv[1] + '" stroke-width="2" opacity="0.85"/>';
    }).join('');
    const ticks = levels.map(function (lv, i) {
      const y = 22 + i * 18;
      return '<rect x="224" y="' + (y - 7) + '" width="10" height="10" rx="2" fill="' + lv[1] + '"/>' +
        '<text x="240" y="' + (y + 2) + '" fill="#9aa8b8" font-size="11">' + lv[0] + ' dBm · ' + cvFmt(res.dist(lv[0])) + '</text>';
    }).join('');
    return '<svg viewBox="0 0 340 200" width="100%" height="auto" role="img" aria-label="Зона покрытия по уровням сигнала">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="rgba(47,129,247,.05)"/>' +
      rings +
      '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#2fe08a"/>' +
      '<text x="' + (cx - 10) + '" y="' + (cy + 22) + '" fill="#6e7d8f" font-size="10">точка</text>' +
      ticks + '</svg>';
  }

  function dsHint(o) {
    const W = window.ConfigWizard;
    const nets = (W && W.subnets) ? W.subnets(o.lanIp, o.lanPrefix) : [];
    if (!nets.length) return 'Нужен префикс LAN от /22 до /28 (обычно /24): четырём подсетям нужно место.';
    const names = ['проводные ПК', 'ноутбуки', 'телефоны', 'принтеры'];
    return 'Четыре отдельные сети: ' + nets.map(function (n, i) {
      return names[i] + ' ' + n.gw + '/' + n.prefix;
    }).join(' · ') + '. Все видят друг друга и общие ресурсы, гостевая сеть остаётся изолированной.';
  }

  /* ================= PoE: бюджет и блок питания ================= */
  let poeState = null;

  function poeLoad() {
    if (poeState) return poeState;
    try { poeState = JSON.parse(store.get('poe') || 'null'); } catch (e) { poeState = null; }
    if (!poeState || typeof poeState !== 'object' || !Array.isArray(poeState.consumers)) {
      poeState = {
        model: '', volt: 24, amp: 2.5, reserve: 6, loss: 10,
        consumers: [
          { name: 'Камеры IP (802.3af)', w: 12.95, count: 2 },
          { name: 'Точка доступа (802.3af)', w: 12.95, count: 1 }
        ]
      };
    }
    return poeState;
  }

  function poeSave() {
    if (poeState) store.set('poe', JSON.stringify(poeState));
  }

  function poeModelInfo() {
    const st = poeLoad();
    const list = (window.PoeCalc && window.PoeCalc.models) ? window.PoeCalc.models() : [];
    for (let i = 0; i < list.length; i++) if (list[i].id === st.model) return list[i];
    return null;
  }

  function poeView() {
    const st = poeLoad();
    const list = (window.PoeCalc && window.PoeCalc.models) ? window.PoeCalc.models() : [];
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>PoE и питание</span></div>';
    html += '<h1 class="art-title">PoE-бюджет и блок питания</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Бюджет PoE — это не «цифра модели», а следствие блока питания и потерь в кабеле: ' +
      'P = U·I, минус собственное потребление роутера, минус потери. Заполните параметры БП (они есть на наклейке) и устройства.</div>';

    html += '<section class="card"><h3 class="card-h">' + svg('iface', 15) + 'Роутер и блок питания</h3>' +
      '<label class="wz-row"><span class="wz-l">Модель с PoE-out</span><select class="inp" id="poeModel">' +
      '<option value="">— без PoE-out / свой вариант —</option>' +
      list.map(function (m) {
        return '<option value="' + esc(m.id) + '"' + (m.id === st.model ? ' selected' : '') + '>' +
          esc(m.name) + ' · ' + esc(m.ports) + '</option>';
      }).join('') + '</select><span class="wz-h">порты и тип PoE подставятся из спецификации</span></label>' +
      '<div id="poeModelInfo" class="hint" style="margin:-2px 0 8px"></div>' +
      wizField('poeVolt', 'Напряжение БП, В', st.volt, 'на наклейке: 24 В или 48–57 В') +
      wizField('poeAmp', 'Ток БП, А', st.amp, 'например 2,5 А — это 60 Вт при 24 В') +
      wizField('poeReserve', 'На сам роутер, Вт', st.reserve, 'обычно 5–8 Вт') +
      wizField('poeLoss', 'Потери в кабеле, %', st.loss, '10 % на 30–50 м — нормально') +
      '</section>';

    html += '<section class="card"><h3 class="card-h">' + svg('svc', 15) + 'Что питаем</h3>' +
      '<div class="chips" id="poePresets">' +
      ((window.PoeCalc && window.PoeCalc.CONSUMERS) || []).map(function (c, i) {
        return '<button class="chip" data-poeadd="' + i + '" type="button">+ ' + esc(c.name) + '</button>';
      }).join('') + '</div>' +
      '<div id="poeList" style="margin-top:12px"></div>' +
      '</section>';

    html += '<div class="wz-actions"><button class="btn" id="poeReport">Отчёт</button>' +
      '<button class="btn" id="poeReset">Сбросить</button></div>';
    html += '<div id="poeOut"></div>';
    html += '</div>';
    return html;
  }

  function poeRender() {
    const st = poeLoad();
    const box = document.getElementById('poeList');
    const out = document.getElementById('poeOut');
    const info = document.getElementById('poeModelInfo');
    if (!box || !out) return;

    box.innerHTML = st.consumers.length ? st.consumers.map(function (c, i) {
      return '<div class="poe-row" data-pi="' + i + '">' +
        '<input class="inp p-name" value="' + esc(c.name) + '" placeholder="Название устройства">' +
        '<input class="inp p-w" value="' + esc(String(c.w)) + '" inputmode="decimal" aria-label="Вт">' +
        '<input class="inp p-n" value="' + esc(String(c.count)) + '" inputmode="numeric" aria-label="Штук">' +
        '<button class="p-del" type="button" aria-label="Удалить">✕</button></div>';
    }).join('') + '<div class="hint">Вт · штук. Пределы стандарта: 802.3af — 15,4 Вт на порт, 802.3at — 30 Вт.</div>'
      : '<div class="hint">Пока ничего не добавлено — нажмите кнопку устройства выше.</div>';

    const mi = poeModelInfo();
    if (info) {
      info.innerHTML = mi
        ? 'Тип PoE: <b>' + esc(mi.typeText) + '</b> · порты: <b>' + esc(mi.ports) + '</b> · предел на порт ≈ ' +
          esc(String(mi.portW)) + ' Вт · PoE-in: ' + esc(mi.poeIn || '—')
        : '';
    }

    const res = window.PoeCalc ? window.PoeCalc.calc({
      volt: st.volt, amp: st.amp, reserve: st.reserve, loss: st.loss,
      portW: mi ? mi.portW : 15.4,
      consumers: st.consumers
    }) : null;
    if (!res) return;

    const cls = res.ok ? 'ok' : (res.total ? 'bad' : '');
    out.innerHTML = '<section class="card" style="margin-top:14px"><h3 class="card-h">' + svg('task', 15) + 'Расчёт</h3>' +
      '<div class="poe-sum"><div><span class="ps-k">Блок питания</span><b>' + poeFmt(res.psu) + ' Вт</b>' +
      '<span class="ps-s">' + poeFmt(res.volt, 0) + ' В × ' + poeFmt(res.amp, 2) + ' А</span></div>' +
      '<div><span class="ps-k">Доступно для PoE</span><b>' + poeFmt(res.usable) + ' Вт</b>' +
      '<span class="ps-s">минус ' + poeFmt(res.reserve) + ' Вт на роутер, минус ' + poeFmt(res.loss, 0) + ' % в кабеле</span></div>' +
      '<div><span class="ps-k">Устройства</span><b>' + poeFmt(res.total) + ' Вт</b>' +
      '<span class="ps-s">портов: ' + res.ports + '</span></div>' +
      '<div class="' + cls + '"><span class="ps-k">Запас</span><b>' + poeFmt(res.left) + ' Вт</b>' +
      '<span class="ps-s">' + (res.left >= 0 ? 'хватает' : 'не хватает') + '</span></div></div>' +
      '<div class="warn" style="margin-top:10px"><span class="wi">' + (res.ok ? '' : warnIcon()) + '</span><div>' +
      esc(res.verdict) + '</div></div>' +
      '<div class="hint" style="margin-top:8px">Для этого набора нужен БП на <b>' + poeFmt(res.recAmp, 2) + ' А</b> при ' +
      poeFmt(res.volt, 0) + ' В (запас 20 %). Без запаса: ' + poeFmt(res.needAmp, 2) + ' А.</div>' +
      '<div class="hint">Проверить на роутере: <code class="inl">/interface ethernet poe print</code>, ' +
      '<code class="inl">/interface ethernet poe monitor [find]</code> — видно ток и мощность по портам. ' +
      'Включить PoE-out: <code class="inl">/interface ethernet poe set ether5 poe-out=auto-on</code>.</div>' +
      '</section>';
  }

  function poeFmt(v, d) {
    const k = Math.pow(10, d == null ? 1 : d);
    return String(Math.round((v || 0) * k) / k).replace('.', ',');
  }

  function poeRecalc() {
    poeRender();
    poeSave();
  }

  function bindPoe() {
    const st = poeLoad();
    ['poeVolt', 'poeAmp', 'poeReserve', 'poeLoss'].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        const key = id.replace('poe', '').toLowerCase();
        st[key] = el.value;
        poeRecalc();
      });
    });
    const sel = document.getElementById('poeModel');
    if (sel) sel.addEventListener('change', function () { st.model = sel.value; poeRecalc(); });

    const box = document.getElementById('poeList');
    if (box) {
      box.addEventListener('input', function (e) {
        const row = e.target.closest ? e.target.closest('.poe-row') : null;
        if (!row) return;
        const i = +row.getAttribute('data-pi');
        if (!st.consumers[i]) return;
        if (e.target.classList.contains('p-name')) st.consumers[i].name = e.target.value;
        if (e.target.classList.contains('p-w')) st.consumers[i].w = e.target.value;
        if (e.target.classList.contains('p-n')) st.consumers[i].count = e.target.value;
        poeSave();
        const res = window.PoeCalc ? window.PoeCalc.calc({ volt: st.volt, amp: st.amp, reserve: st.reserve, loss: st.loss, consumers: st.consumers }) : null;
        const out = document.getElementById('poeOut');
        if (out && res) {
          const keep = out.querySelector('.poe-sum b');
          if (keep) {
            const btns = out.querySelectorAll('.poe-sum b');
            if (btns.length >= 4) {
              btns[2].textContent = poeFmt(res.total) + ' Вт';
              btns[3].textContent = poeFmt(res.left) + ' Вт';
            }
          }
        }
        return;
      });
      box.addEventListener('click', function (e) {
        const del = e.target.closest ? e.target.closest('.p-del') : null;
        if (!del) return;
        const row = del.closest('.poe-row');
        const i = +row.getAttribute('data-pi');
        st.consumers.splice(i, 1);
        poeRecalc();
      });
      box.addEventListener('change', function () { poeRender(); });
    }

    document.querySelectorAll('[data-poeadd]').forEach(function (b) {
      b.addEventListener('click', function () {
        const list = (window.PoeCalc && window.PoeCalc.CONSUMERS) || [];
        const c = list[+b.getAttribute('data-poeadd')];
        if (!c) return;
        st.consumers.push({ name: c.name, w: c.w, count: 1 });
        poeRecalc();
      });
    });

    const rep = document.getElementById('poeReport');
    if (rep) rep.addEventListener('click', function () {
      const mi = poeModelInfo();
      const res = window.PoeCalc.calc({ volt: st.volt, amp: st.amp, reserve: st.reserve, loss: st.loss,
        portW: mi ? mi.portW : 15.4, consumers: st.consumers });
      const text = window.PoeCalc.report(res, { model: mi ? mi.name : '' });
      const saved = saveTextFile('poe-byudzhet.txt', text);
      if (saved === 'blob') toast('Отчёт сохранён: poe-byudzhet.txt');
      else if (!saved) shareText(text, 'PoE-бюджет');
      else toast('Отчёт сохранён');
    });

    const rst = document.getElementById('poeReset');
    if (rst) rst.addEventListener('click', function () {
      poeState = null;
      store.del('poe');
      route();
    });

    poeRender();
  }

  function coverageView() {
    const st = cvState();
    const res = cvCalc(st);

    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Мощность и покрытие</span></div>';
    html += '<h1 class="art-title">Мощность и покрытие Wi-Fi</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Сколько энергии реально уходит в эфир (EIRP), какой радиус получается на разных уровнях сигнала и сколько точек нужно на площадь. ' +
      'Расчёт — свободное пространство минус стены; реальные цифры будут чуть хуже из-за мебели и соседей.</div>';

    html += '<div class="chips">' +
      ['2.4', '5'].map(function (b) {
        return '<button class="chip' + (st.band === b ? ' on' : '') + '" data-cvband="' + b + '">' + (b === '5' ? '5 ГГц' : '2.4 ГГц') + '</button>';
      }).join('') + '</div>';

    html += '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Параметры точки</h3>' +
      '<div class="cv-grid">' +
      cvField('cvPower', 'Мощность, dBm', st.power, '0–30; по умолчанию auto') +
      cvField('cvGain', 'Усиление антенны, dBi', st.gain, 'внутренние 3–5 dBi') +
      cvField('cvLoss', 'Потери в кабеле, dB', st.loss, 'пигтейл ≈ 0,5–1 dB') +
      cvField('cvWalls', 'Стен до клиента', st.walls, '0–6') +
      cvField('cvArea', 'Площадь объекта, м²', st.area, 'для расчёта числа точек') +
      '</div>' +
      '<label class="wz-row"><span class="wz-l">Среда</span><select class="inp" id="cvEnv">' +
      Object.keys(CV_ENV).map(function (k) {
        return '<option value="' + k + '"' + (st.env === k ? ' selected' : '') + '>' + esc(CV_ENV[k].t) + ' · n=' + CV_ENV[k].n + '</option>';
      }).join('') + '</select></label>' +
      '<label class="wz-row"><span class="wz-l">Материал стен</span><select class="inp" id="cvMat">' +
      Object.keys(CV_MAT).map(function (k) {
        return '<option value="' + k + '"' + (st.mat === k ? ' selected' : '') + '>' + esc(CV_MAT[k].t) + ' · −' + CV_MAT[k].db + ' dB</option>';
      }).join('') + '</select></label>' +
      '<div class="cv-target"><span class="wz-l">Целевой уровень</span><div class="chips">' +
      [[-60, '−60: видео и VoIP'], [-67, '−67: интернет'], [-72, '−72: минимум'], [-80, '−80: граница']].map(function (t) {
        return '<button class="chip' + (st.target === t[0] ? ' on' : '') + '" data-cvtarget="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div></div></section>';

    html += '<section class="card cv-result"><h3 class="card-h">' + svg('iface', 15) + 'Результат</h3>' +
      '<div class="cv-nums">' +
      '<div class="cv-num"><b>' + res.eirp + '</b><span>dBm EIRP</span></div>' +
      '<div class="cv-num"><b>' + cvFmt(res.targetDist) + '</b><span>радиус до ' + st.target + ' dBm</span></div>' +
      '<div class="cv-num"><b>' + Math.round(res.cell) + ' м²</b><span>площадь одной точки</span></div>' +
      '<div class="cv-num"><b>' + res.aps + '</b><span>точек на ' + Math.round(st.area) + ' м²</span></div>' +
      '</div>' +
      '<div class="cv-badge ' + (res.over ? 'bad' : 'ok') + '">' +
      (res.over
        ? 'EIRP ' + res.eirp + ' dBm выше лимита ' + res.limit + ' dBm для ' + st.band + ' ГГц — уменьшите мощность или усиление'
        : 'EIRP ' + res.eirp + ' dBm — в пределах лимита ' + res.limit + ' dBm для ' + st.band + ' ГГц') + '</div>' +
      '<div class="hint" style="margin-top:10px">Среда: ' + esc(res.env) + ' (n=' + res.n + '), стены: −' + res.wallLoss + ' dB (' +
      st.walls + ' × ' + CV_MAT[st.mat].db + ' dB), запас на мебель и антенну клиента: −' + CV_MARGIN + ' dB. ' +
      'Частота ' + res.f + ' МГц, потери на 1 м: ' + res.pl1.toFixed(1) + ' dB.</div>' +
      cvSvg(res) +
      '</section>';

    html += '<section class="card"><h3 class="card-h">' + svg('book', 15) + 'Расстояние по уровням сигнала</h3>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>RSSI</th><th>Расстояние</th><th>Что это даёт</th></tr></thead><tbody>' +
      [[-50, 'максимальная скорость, 80 МГц'], [-60, 'видео и VoIP без запинок'], [-67, 'стабильный интернет'],
        [-72, 'работает с просадками'], [-80, 'клиент почти отваливается']].map(function (l) {
        return '<tr' + (l[0] === st.target ? ' class="wf-on"' : '') + '><td class="mono"><b>' + l[0] + ' dBm</b></td>' +
          '<td class="mono">' + cvFmt(res.dist(l[0])) + '</td><td>' + esc(l[1]) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="hint" style="margin-top:10px">Каждые +6 dBm — вдвое больше расстояние и вчетверо больше площадь. Каждая кирпичная стена срезает примерно треть дальности.</div>' +
      '</section>';

    html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Что вписать в RouterOS</h3>' +
      '<div class="cfg"><div class="cfg-h"><span>новое Wi-Fi (hAP ax2 / ax3)</span><span class="cfg-btns"><button class="copy">копировать</button></span></div>' +
      '<pre>' + hlCfg('/interface wifi set wifi1 tx-power=' + st.power + ' antenna-gain=' + st.gain +
        '\n/interface wifi set wifi1 channel.frequency=' + (st.band === '5' ? 5180 : 2437) + ' channel.width=' + (st.band === '5' ? 80 : 20) + 'mhz') + '</pre></div>' +
      '<div class="cfg" style="margin-top:10px"><div class="cfg-h"><span>старое wireless</span><span class="cfg-btns"><button class="copy">копировать</button></span></div>' +
      '<pre>' + hlCfg('/interface wireless set wlan1 tx-power-mode=all-rates-fixed tx-power=' + st.power +
        '\n/interface wireless set wlan1 antenna-gain=' + st.gain) + '</pre></div>' +
      '<div class="wz-actions"><a class="btn" href="#/wifi-power">Статья: мощность и покрытие</a>' +
      '<a class="btn" href="#/wifi">Каналы Wi-Fi</a>' +
      '<a class="btn" href="#/models">Модели: совместимость и порты</a></div></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('info', 15) + 'Справочник</h3>' +
      '<div class="cv-refs">' +
      '<div><b>dBm → мощность</b><ul class="clean">' + CV_DBM.map(function (r) {
        return '<li><span class="mono">' + r[0] + ' dBm</span> — ' + r[1] + '</li>';
      }).join('') + '</ul></div>' +
      '<div><b>Потери материалов</b><ul class="clean">' + Object.keys(CV_MAT).map(function (k) {
        return '<li>' + esc(CV_MAT[k].t) + ' — <span class="mono">−' + CV_MAT[k].db + ' dB</span></li>';
      }).join('') + '</ul></div>' +
      '</div>' +
      '<div class="hint" style="margin-top:8px">Ориентиры: офис — одна точка на 60–80 м², квартира — 80–100 м² при одной-двух стенах, склад — считайте по площади из результата. ' +
      'Для нескольких точек держите 14–17 dBm, чтобы клиенты переходили между ними, а не «прилипали» к дальней.</div></section></div>';
    return html;
  }

  function cvField(id, label, value, hint) {
    return '<label class="wz-row"><span class="wz-l">' + esc(label) + '</span>' +
      '<input class="inp mono" id="' + id + '" value="' + esc(value) + '" inputmode="decimal">' +
      (hint ? '<span class="wz-h">' + esc(hint) + '</span>' : '') + '</label>';
  }

  function bindCoverage() {
    document.querySelectorAll('[data-cvband]').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('cvBand', b.getAttribute('data-cvband'));
        route();
      });
    });
    document.querySelectorAll('[data-cvtarget]').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('cvTarget', b.getAttribute('data-cvtarget'));
        route();
      });
    });
    const env = document.getElementById('cvEnv');
    if (env) env.addEventListener('change', function () { store.set('cvEnv', env.value); route(); });
    const mat = document.getElementById('cvMat');
    if (mat) mat.addEventListener('change', function () { store.set('cvMat', mat.value); route(); });
    [['cvPower', 'cvPower'], ['cvGain', 'cvGain'], ['cvLoss', 'cvLoss'], ['cvWalls', 'cvWalls'], ['cvArea', 'cvArea']].forEach(function (pair) {
      const el = document.getElementById(pair[0]);
      if (!el) return;
      el.addEventListener('change', function () {
        store.set(pair[1], el.value);
        route();
      });
    });
  }

  /* ================= шпаргалки ================= */
  /* ================= примеры конфигов ================= */
  const EX_CAT = {
    internet: 'Интернет и каналы',
    wifi: 'Wi-Fi',
    vlan: 'VLAN и коммутатор',
    vpn: 'VPN и туннели',
    security: 'Доступ и firewall',
    services: 'Сервисы и multicast'
  };

  function examplesView() {
    const all = window.EXAMPLES || [];
    let cat = store.get('excat') || 'all';
    if (cat !== 'all' && !EX_CAT[cat]) cat = 'all';
    const list = all.filter(function (x) { return cat === 'all' || x.cat === cat; });

    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Примеры конфигов</span></div>';
    html += '<h1 class="art-title">Примеры конфигов</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Готовые схемы «задача → команды → проверка → грабли». Каждый блок копируется целиком и вставляется в Winbox → New Terminal.</div>';
    html += '<div class="chips">' +
      '<button class="chip' + (cat === 'all' ? ' on' : '') + '" data-excat="all">Все · ' + all.length + '</button>' +
      Object.keys(EX_CAT).map(function (k) {
        const n = all.filter(function (x) { return x.cat === k; }).length;
        if (!n) return '';
        return '<button class="chip' + (cat === k ? ' on' : '') + '" data-excat="' + k + '">' + esc(EX_CAT[k]) + ' · ' + n + '</button>';
      }).join('') + '</div>';

    if (!list.length) {
      html += '<div class="empty">Пока пусто.</div>';
    } else {
      html += '<div class="tools-grid">' + list.map(function (x) {
        return '<a class="tool-card" href="#/examples/' + x.id + '"><span class="tc-ic">' + svg(x.ic || 'task', 18) + '</span>' +
          '<b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span></a>';
      }).join('') + '</div>';
    }
    html += '</div>';
    return html;
  }

  function bindExamples() {
    document.querySelectorAll('[data-excat]').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('excat', b.getAttribute('data-excat'));
        route();
      });
    });
  }

  function exampleDetailView(ex) {
    const art = ex.art ? FLAT.filter(function (a) { return a.id === ex.art; })[0] : null;
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/examples">Примеры</a><span class="sep">/</span><span>' + esc(ex.t) + '</span></div>';
    html += '<h1 class="art-title">' + esc(ex.t) + '</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">' + esc(ex.d) + '</div>';
    html += '<div class="chips" style="margin-bottom:12px"><span class="chip on">' + esc(EX_CAT[ex.cat] || 'Пример') + '</span>' +
      '<span class="chip">' + (ex.blocks || []).length + ' шага</span></div>';

    (ex.blocks || []).forEach(function (b, i) {
      html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Шаг ' + (i + 1) + '. ' + esc(b.h) + '</h3>' +
        '<div class="cfg"><div class="cfg-h"><span>RouterOS 7</span>' +
        '<span class="cfg-btns"><button class="copy">копировать</button>' +
        '<button class="share" data-share="cfg">поделиться</button></span></div>' +
        '<pre>' + hlCfg(b.c) + '</pre></div></section>';
    });

    if (ex.check) {
      html += '<section class="card"><h3 class="card-h">' + svg('iface', 15) + 'Проверка после вставки</h3>' +
        '<div class="cfg"><div class="cfg-h"><span>New Terminal</span>' +
        '<span class="cfg-btns"><button class="copy">копировать</button></span></div>' +
        '<pre>' + hlCfg(ex.check) + '</pre></div></section>';
    }

    if (ex.tips && ex.tips.length) {
      html += '<section class="card"><h3 class="card-h">' + svg('info', 15) + 'Что учесть</h3>' +
        '<ul class="clean">' + ex.tips.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ul></section>';
    }

    if (ex.pitfall) {
      html += '<div class="warn"><span class="wi">' + warnIcon() + '</span><div><b>Частая ошибка.</b> ' + inline(ex.pitfall) + '</div></div>';
    }

    html += '<div class="wz-actions">' +
      '<button class="btn primary" id="exShare">Поделиться примером</button>' +
      '<a class="btn" href="#/examples">Все примеры</a>' +
      (art ? '<a class="btn" href="#/' + art.id + '">Статья: ' + esc(art.t) + '</a>' : '') +
      '<a class="btn" href="#/wizard">Собрать мастером</a></div></div>';
    return html;
  }

  function bindExampleDetail(ex) {
    const sh = document.getElementById('exShare');
    if (sh) sh.addEventListener('click', function () {
      const text = [ex.t, ex.d].concat((ex.blocks || []).map(function (b) { return b.h + ':\n' + b.c; }));
      if (ex.check) text.push('Проверка:\n' + ex.check);
      shareText(text.join('\n\n'), ex.t);
    });
  }

  function cheatsView() {
    const list = window.CHEATS || [];
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Шпаргалки</span></div>';
    html += '<h1 class="art-title">Шпаргалки</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Короткие наборы команд, которые нужны чаще всего. Копируются целиком и вставляются в New Terminal.</div>';
    html += '<div class="tools-grid">' + list.map(function (c) {
      return '<a class="tool-card" href="#/cheats/' + c.id + '"><span class="tc-ic">' + svg(c.ic || 'book', 18) + '</span>' +
        '<b>' + esc(c.t) + '</b><span>' + esc(c.d) + '</span></a>';
    }).join('') + '</div></div>';
    return html;
  }

  function cheatDetailView(c) {
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/cheats">Шпаргалки</a><span class="sep">/</span><span>' + esc(c.t) + '</span></div>';
    html += '<h1 class="art-title">' + esc(c.t) + '</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">' + esc(c.d) + '</div>';

    (c.blocks || []).forEach(function (b) {
      html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + esc(b.h) + '</h3>' +
        '<div class="cfg"><div class="cfg-h"><span>RouterOS 7</span>' +
        '<span class="cfg-btns"><button class="copy">копировать</button>' +
        '<button class="share" data-share="cfg">поделиться</button></span></div>' +
        '<pre>' + hlCfg(b.c) + '</pre></div></section>';
    });

    if (c.tips && c.tips.length) {
      html += '<section class="card"><h3 class="card-h">' + svg('info', 15) + 'На что обратить внимание</h3>' +
        '<ul class="clean">' + c.tips.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ul></section>';
    }

    html += '<div class="wz-actions"><button class="btn primary" id="chShare">Поделиться шпаргалкой</button>' +
      '<a class="btn" href="#/cheats">Все шпаргалки</a>' +
      '<a class="btn" href="#/wizard">Собрать конфиг мастером</a></div></div>';
    return html;
  }

  function bindCheatDetail(c) {
    const sh = document.getElementById('chShare');
    if (sh) sh.addEventListener('click', function () {
      const text = [c.t, c.d].concat((c.blocks || []).map(function (b) { return b.h + ':\n' + b.c; })).join('\n\n');
      shareText(text, c.t);
    });
  }

  /* ================= Wi-Fi: каналы и ширина ================= */
  const WF24 = (function () { const a = []; for (let c = 1; c <= 13; c++) a.push({ ch: c, f: 2412 + 5 * (c - 1) }); return a; })();
  const WF5 = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165]
    .map(function (c) { return { ch: c, f: 5000 + 5 * c, dfs: c >= 52 && c <= 144 }; });
  const WF_REC = { '2.4': [1, 6, 11], '5': [36, 40, 44, 48, 149, 153, 157, 161] };
  const WF_SPEED = { 20: 90, 40: 180, 80: 400 };

  function wfState() {
    const band = store.get('wfb') === '5' ? '5' : '2.4';
    const widths = band === '5' ? [20, 40, 80] : [20, 40];
    let width = parseInt(store.get('wfw'), 10) || 20;
    if (widths.indexOf(width) < 0) width = 20;
    const list = band === '5' ? WF5 : WF24;
    let ch = parseInt(store.get('wfch'), 10);
    if (!list.some(function (x) { return x.ch === ch; })) ch = band === '5' ? 36 : 6;
    return { band: band, widths: widths, width: width, list: list, ch: ch };
  }

  function wfOverlaps(list, item, width) {
    const a1 = item.f - width / 2, a2 = item.f + width / 2;
    return list.filter(function (x) {
      if (x.ch === item.ch) return false;
      const b1 = x.f - width / 2, b2 = x.f + width / 2;
      return a1 < b2 && b1 < a2;
    }).map(function (x) { return x.ch; });
  }

  function wifiView() {
    const st = wfState();
    const cur = st.list.filter(function (x) { return x.ch === st.ch; })[0] || st.list[0];
    const ov = wfOverlaps(st.list, cur, st.width);

    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Каналы Wi-Fi</span></div>';
    html += '<h1 class="art-title">Каналы Wi-Fi</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Какая ширина канала нужна, какие каналы не пересекаются и какую команду вставить в RouterOS. Шире — быстрее, но больше помех соседям.</div>';

    html += '<div class="chips">' +
      ['2.4', '5'].map(function (b) {
        return '<button class="chip' + (st.band === b ? ' on' : '') + '" data-wfb="' + b + '">' + (b === '5' ? '5 ГГц' : '2.4 ГГц') + '</button>';
      }).join('') + '</div>';

    html += '<div class="chips">' + st.widths.map(function (w) {
      return '<button class="chip' + (st.width === w ? ' on' : '') + '" data-wfw="' + w + '">' + w + ' МГц ≈ ' + WF_SPEED[w] + ' Мбит/с</button>';
    }).join('') + '</div>';

    html += '<section class="card"><h3 class="card-h">' + svg('iface', 15) + 'Канал ' + cur.ch + ' · ' + cur.f + ' МГц · ' + st.width + ' МГц</h3>' +
      '<div class="hint" style="margin:-4px 0 10px">Занимает полосу ' + (cur.f - st.width / 2) + '–' + (cur.f + st.width / 2) + ' МГц. ' +
      (ov.length ? 'Пересекается с каналами: <b>' + ov.join(', ') + '</b>.' : 'Ни с одним каналом этого диапазона не пересекается — лучший выбор.') +
      (cur.dfs ? ' Канал DFS: радар может потребовать уйти с него.' : '') + '</div>' +
      '<div class="cfg"><div class="cfg-h"><span>RouterOS 7 · новое Wi-Fi (hAP ax)</span><span class="cfg-btns"><button class="copy">копировать</button></span></div>' +
      '<pre>' + hlCfg('/interface wifi set [find] channel.frequency=' + cur.f + ' channel.width=' + st.width + 'mhz') + '</pre></div>' +
      '<div class="cfg" style="margin-top:10px"><div class="cfg-h"><span>старое wireless (hAP ac, hEX с CAP)</span><span class="cfg-btns"><button class="copy">копировать</button></span></div>' +
      '<pre>' + hlCfg('/interface wireless set [find] frequency=' + cur.f + ' channel-width=' + st.width + 'mhz') + '</pre></div>' +
      '</section>';

    html += '<section class="card"><h3 class="card-h">' + svg('book', 15) + 'Все каналы ' + (st.band === '5' ? '5 ГГц' : '2.4 ГГц') + '</h3>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Канал</th><th>МГц</th><th>Полоса</th><th>Пересекается</th></tr></thead><tbody>' +
      st.list.map(function (x) {
        const o = wfOverlaps(st.list, x, st.width);
        const rec = WF_REC[st.band].indexOf(x.ch) >= 0;
        const cls = (x.ch === st.ch ? 'wf-on ' : '') + (rec ? 'wf-rec' : '');
        return '<tr class="' + cls + '" data-wfch="' + x.ch + '"><td class="mono"><b>' + x.ch + '</b>' +
          (rec ? ' <span class="wf-star">★</span>' : '') + (x.dfs ? ' <span class="wf-dfs">DFS</span>' : '') + '</td>' +
          '<td class="mono">' + x.f + '</td>' +
          '<td class="mono">' + (x.f - st.width / 2) + '–' + (x.f + st.width / 2) + '</td>' +
          '<td>' + (o.length ? o.join(', ') : '<span class="wf-free">свободен</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="wz-actions"><a class="btn" href="#/coverage">Мощность и зона покрытия</a>' +
      '<a class="btn" href="#/wifi-power">Статья про мощность</a></div>' +
      '<div class="hint" style="margin-top:10px">★ — каналы, которые не пересекаются при ширине 20 МГц: ' +
      WF_REC[st.band].join(', ') + '. В 2.4 ГГц ширина 40 МГц «съедает» почти весь диапазон — включайте её только если рядом нет соседей.</div>' +
      '</section></div>';
    return html;
  }

  function bindWifi() {
    document.querySelectorAll('[data-wfb]').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('wfb', b.getAttribute('data-wfb'));
        store.del('wfch');
        store.del('wfw');
        route();
      });
    });
    document.querySelectorAll('[data-wfw]').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('wfw', b.getAttribute('data-wfw'));
        route();
      });
    });
    document.querySelectorAll('[data-wfch]').forEach(function (tr) {
      tr.addEventListener('click', function () {
        store.set('wfch', tr.getAttribute('data-wfch'));
        route();
      });
    });
  }

  /* ================= генератор паролей и ключей ================= */
  function rndBytes(n) {
    const a = new Uint8Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    return a;
  }
  function bytesToB64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64urlToB64(u) {
    let s = String(u || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return s;
  }
  const PW_SETS = {
    lower: 'abcdefghijkmnopqrstuvwxyz',
    upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
    digit: '23456789',
    sym: '!@#$%^&*-_=+?'
  };
  function genPassword(len, opts) {
    const pool = [];
    ['lower', 'upper', 'digit', 'sym'].forEach(function (k) { if (opts[k]) pool.push(PW_SETS[k]); });
    if (!pool.length) pool.push(PW_SETS.lower, PW_SETS.digit);
    const all = pool.join('');
    const out = [];
    pool.forEach(function (set) { out.push(set[rndBytes(1)[0] % set.length]); });
    while (out.length < len) out.push(all[rndBytes(1)[0] % all.length]);
    for (let i = out.length - 1; i > 0; i--) {
      const j = rndBytes(1)[0] % (i + 1);
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out.slice(0, len).join('');
  }
  function wgPrivateKey() {
    const b = rndBytes(32);
    b[0] &= 248;
    b[31] = (b[31] & 127) | 64;
    return bytesToB64(b);
  }

  function keysState() {
    const st = {
      len: parseInt(store.get('kLen'), 10) || 16,
      lower: store.get('kLow') !== '0',
      upper: store.get('kUp') === '1',
      digit: store.get('kDig') !== '0',
      sym: store.get('kSym') === '1',
      pwd: store.get('kPwd') || '',
      wgPriv: store.get('kWgPriv') || '',
      wgPub: store.get('kWgPub') || '',
      wgPsk: store.get('kWgPsk') || ''
    };
    if (!st.pwd) { st.pwd = genPassword(st.len, st); store.set('kPwd', st.pwd); }
    if (!st.wgPriv) { st.wgPriv = wgPrivateKey(); store.set('kWgPriv', st.wgPriv); }
    if (!st.wgPsk) { st.wgPsk = bytesToB64(rndBytes(32)); store.set('kWgPsk', st.wgPsk); }
    return st;
  }

  function keysView() {
    const st = keysState();
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Пароли и ключи</span></div>';
    html += '<h1 class="art-title">Пароли и ключи</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Генерируется на телефоне, никуда не отправляется. Символы 0/O/1/l исключены, чтобы не путать при вводе с телефона.</div>';

    html += '<section class="card"><h3 class="card-h">' + svg('svc', 15) + 'Пароль Wi-Fi и admin</h3>' +
      '<div class="pw-out"><code id="pwOut">' + esc(st.pwd) + '</code>' +
      '<button class="btn" id="pwCopy">копировать</button></div>' +
      '<div class="chips" style="margin-top:12px">' + [12, 16, 20, 24, 32].map(function (n) {
        return '<button class="chip' + (st.len === n ? ' on' : '') + '" data-klen="' + n + '">' + n + ' симв.</button>';
      }).join('') + '</div>' +
      '<div class="kw-opts">' +
      ['lower', 'upper', 'digit', 'sym'].map(function (k) {
        const names = { lower: 'строчные', upper: 'ЗАГЛАВНЫЕ', digit: 'цифры', sym: 'символы !@#' };
        return '<label class="chk-line"><input type="checkbox" data-kopt="' + k + '"' + (st[k] ? ' checked' : '') + '> ' + names[k] + '</label>';
      }).join('') + '</div>' +
      '<div class="wz-actions"><button class="btn primary" id="pwNew">Новый пароль</button></div></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('iface', 15) + 'WireGuard</h3>' +
      '<div class="hint" style="margin:-4px 0 10px">Приватный ключ — вставляйте в конфиг роутера или клиента, публичный — на другой стороне. Общий ключ (PSK) добавляет второй слой шифрования.</div>' +
      '<div class="wg-row"><span class="wg-l">Приватный ключ</span><code id="wgPriv">' + esc(st.wgPriv) + '</code><button class="btn" data-copywg="wgPriv">копировать</button></div>' +
      '<div class="wg-row"><span class="wg-l">Публичный ключ</span><code id="wgPub">' + esc(st.wgPub || '— нажмите «Обновить» —') + '</code><button class="btn" data-copywg="wgPub">копировать</button></div>' +
      '<div class="wg-row"><span class="wg-l">Общий ключ PSK</span><code id="wgPsk">' + esc(st.wgPsk) + '</code><button class="btn" data-copywg="wgPsk">копировать</button></div>' +
      '<div class="wz-actions"><button class="btn primary" id="wgNew">Новая пара ключей</button>' +
      '<button class="btn" id="wgPubCalc">Обновить публичный</button></div>' +
      '<div class="hint" style="margin-top:8px">Публичный ключ считается на устройстве через X25519. Если браузер не поддерживает — узнайте его на роутере: <code class="inl">/interface/wireguard/print</code>.</div>' +
      '</section></div>';
    return html;
  }

  function keysPublicKey() {
    const st = keysState();
    if (!(window.crypto && crypto.subtle && crypto.subtle.importKey)) { toast('Нужен современный WebView'); return; }
    crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits'])
      .then(function (pair) {
        return Promise.all([crypto.subtle.exportKey('jwk', pair.privateKey), crypto.subtle.exportKey('jwk', pair.publicKey)]);
      })
      .then(function (keys) {
        const privB64 = b64urlToB64(keys[0].d);
        const pubB64 = b64urlToB64(keys[1].x);
        store.set('kWgPriv', privB64);
        store.set('kWgPub', pubB64);
        const a = document.getElementById('wgPriv'), b = document.getElementById('wgPub');
        if (a) a.textContent = privB64;
        if (b) b.textContent = pubB64;
        toast('Пара ключей готова');
      })
      .catch(function () { toast('Не поддерживается — смотрите ключ на роутере'); });
  }

  function bindKeys() {
    const st = keysState();
    function regen() {
      const cur = keysState();
      const pwd = genPassword(cur.len, cur);
      store.set('kPwd', pwd);
      const out = document.getElementById('pwOut');
      if (out) out.textContent = pwd;
    }
    document.querySelectorAll('[data-klen]').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('kLen', b.getAttribute('data-klen'));
        route();
      });
    });
    document.querySelectorAll('[data-kopt]').forEach(function (c) {
      c.addEventListener('change', function () {
        const map = { lower: 'kLow', upper: 'kUp', digit: 'kDig', sym: 'kSym' };
        const k = c.getAttribute('data-kopt');
        store.set(map[k], c.checked ? '1' : '0');
        route();
      });
    });
    const nb = document.getElementById('pwNew');
    if (nb) nb.addEventListener('click', regen);
    const cp = document.getElementById('pwCopy');
    if (cp) cp.addEventListener('click', function () { copyText(st.pwd); toast('Пароль скопирован'); });
    document.querySelectorAll('[data-copywg]').forEach(function (b) {
      b.addEventListener('click', function () {
        const el = document.getElementById(b.getAttribute('data-copywg'));
        if (el) { copyText(el.textContent); toast('Ключ скопирован'); }
      });
    });
    const wn = document.getElementById('wgNew');
    if (wn) wn.addEventListener('click', function () {
      store.set('kWgPriv', wgPrivateKey());
      store.set('kWgPub', '');
      store.set('kWgPsk', bytesToB64(rndBytes(32)));
      route();
      toast('Новые ключи');
    });
    const wc = document.getElementById('wgPubCalc');
    if (wc) wc.addEventListener('click', keysPublicKey);
  }

  /* ================= избранное и заметки ================= */
  function starredFavs() { return favs().filter(function (id) { return BY_ID[id]; }); }
  function starredNotes() {
    const all = notesAll();
    return Object.keys(all)
      .filter(function (id) { return BY_ID[id] && String(all[id] || '').trim(); })
      .map(function (id) { return { a: BY_ID[id], text: String(all[id]) }; });
  }
  function starredRead() {
    const m = readMap();
    return Object.keys(m).filter(function (id) { return BY_ID[id]; })
      .map(function (id) { return BY_ID[id]; })
      .sort(function (x, y) { return FLAT.indexOf(x) - FLAT.indexOf(y); });
  }

  function stItem(a, extra) {
    const meta = [a._group ? a._group.name : '', a.path || ''].filter(Boolean).join(' · ');
    return '<div class="st-item" data-text="' + esc((a.t + ' ' + meta + ' ' + (extra || '')).toLowerCase()) + '">' +
      '<a class="st-main" href="#/' + a.id + '">' +
      '<span class="st-ico">' + svg(a._group ? a._group.ic : 'book', 15) + '</span>' +
      '<span class="st-body"><b>' + esc(a.t) + '</b><span>' + esc(meta) + '</span></span>' +
      '</a>' +
      (extra ? '<p class="st-snip">' + esc(extra) + '</p>' : '') +
      '<div class="st-actions">' + (extra
        ? '<button class="st-btn" data-delnote="' + a.id + '">удалить заметку</button>'
        : '') +
      '<button class="st-btn" data-unfav="' + a.id + '">убрать из избранного</button>' +
      '</div></div>';
  }

  function starredView() {
    const tab = store.get('stv') || 'fav';
    const favIds = starredFavs();
    const notes = starredNotes();
    const read = starredRead();
    const list = tab === 'note' ? notes : (tab === 'read' ? read : favIds.map(function (id) { return { a: BY_ID[id], text: '' }; }));

    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Избранное и заметки</span></div>';
    html += '<h1 class="art-title">Избранное и заметки</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Всё, что вы отметили ★, написали в заметках и уже прочитали — в одном месте. Список можно выгрузить в HTML и отправить коллеге.</div>';

    html += '<div class="chips">' +
      '<button class="chip' + (tab === 'fav' ? ' on' : '') + '" data-stab="fav">Избранное · ' + favIds.length + '</button>' +
      '<button class="chip' + (tab === 'note' ? ' on' : '') + '" data-stab="note">Заметки · ' + notes.length + '</button>' +
      '<button class="chip' + (tab === 'read' ? ' on' : '') + '" data-stab="read">Прочитано · ' + read.length + '</button>' +
      '</div>';

    html += '<div class="st-tools">' +
      '<input class="inp" id="stq" type="search" placeholder="Фильтр по названию или заметке" autocomplete="off" spellcheck="false">' +
      '</div>';

    if (!list.length) {
      html += '<div class="empty">' + (tab === 'fav'
        ? 'Пока пусто. Открывайте статьи и отмечайте нужные звёздочкой ★ в заголовке — они появятся здесь.'
        : tab === 'note'
          ? 'Заметок нет. В конце каждой статьи есть блок «Моя заметка» — он сохраняется на устройстве.'
          : 'Ещё ничего не прочитано. Начните с <a class="badge" href="#/start-first-login">первого входа в роутер</a> или с <a class="badge" href="#/course">курса за 7 дней</a>.') + '</div>';
    } else {
      html += '<div class="st-list">' + list.map(function (x) {
        return stItem(x.a, x.text);
      }).join('') + '</div>';
      html += '<div class="st-empty" id="stEmpty" hidden>Ничего не найдено по фильтру.</div>';
    }

    html += '<div class="wz-actions">' +
      '<button class="btn primary" id="stExport">Выгрузить в HTML</button>' +
      '<button class="btn" id="stShare">Поделиться списком</button>' +
      '</div>';
    html += '<div class="hint" style="margin-top:10px">Данные хранятся только на этом устройстве. Перенос — через «Мои данные» → резервная копия.</div>';
    html += '</div>';
    return html;
  }

  function starredHtml() {
    const ver = window.APP_VERSION || 'dev';
    const parts = [];
    parts.push('<!doctype html><html lang="ru"><head><meta charset="utf-8">');
    parts.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
    parts.push('<title>MikroTik · мои статьи и заметки</title>');
    parts.push('<style>' + EXPORT_CSS + '</style></head><body>');
    parts.push('<h1>Мои статьи и заметки</h1>');
    parts.push('<div class="meta">Версия ' + esc(ver) + ' · выгружено ' + new Date().toLocaleString('ru-RU') + '</div>');
    const favIds = starredFavs(), notes = starredNotes();
    parts.push('<h2>Избранное (' + favIds.length + ')</h2>');
    parts.push(favIds.length ? '<ul>' + favIds.map(function (id) {
      const a = BY_ID[id];
      return '<li><b>' + esc(a.t) + '</b> — ' + esc(a._group ? a._group.name : '') +
        (a.path ? ', ' + esc(a.path) : '') + '</li>';
    }).join('') + '</ul>' : '<p class="meta">Пусто.</p>');
    parts.push('<h2>Заметки (' + notes.length + ')</h2>');
    parts.push(notes.length ? notes.map(function (x) {
      return '<h3>' + esc(x.a.t) + '</h3><p class="p">' + esc(x.text) + '</p>';
    }).join('') : '<p class="meta">Пусто.</p>');
    parts.push('<p class="meta">Выгружено из приложения «MikroTik · Учебник Winbox 4».</p></body></html>');
    return parts.join('\n');
  }

  function exportStarred(share) {
    const html = starredHtml();
    if (share) { shareText('Избранное: ' + starredFavs().length + ' статей, заметок: ' + starredNotes().length, 'Мои статьи и заметки'); return; }
    const name = 'mikrotik-my-notes-' + todayISO() + '.html';
    const saved = saveTextFile(name, html);
    if (saved === 'blob') toast('Сохранено: ' + name);
    else if (saved === 'bridge') toast('Файл сохраняется в Загрузки');
    else shareText(html, 'Мои статьи и заметки');
  }

  function bindStarred() {
    document.querySelectorAll('[data-stab]').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('stv', b.getAttribute('data-stab'));
        route();
      });
    });
    const q = document.getElementById('stq');
    if (q) q.addEventListener('input', function () {
      const v = q.value.trim().toLowerCase();
      let shown = 0;
      document.querySelectorAll('.st-item').forEach(function (el) {
        const hit = !v || (el.getAttribute('data-text') || '').indexOf(v) >= 0;
        el.hidden = !hit;
        if (hit) shown++;
      });
      const em = document.getElementById('stEmpty');
      if (em) em.hidden = shown > 0;
    });
    document.querySelectorAll('[data-unfav]').forEach(function (b) {
      b.addEventListener('click', function () {
        toggleFav(b.getAttribute('data-unfav'));
        route();
        toast('Убрано из избранного');
      });
    });
    document.querySelectorAll('[data-delnote]').forEach(function (b) {
      b.addEventListener('click', function () {
        notesSet(b.getAttribute('data-delnote'), '');
        route();
        toast('Заметка удалена');
      });
    });
    const ex = document.getElementById('stExport');
    if (ex) ex.addEventListener('click', function () { exportStarred(false); });
    const sh = document.getElementById('stShare');
    if (sh) sh.addEventListener('click', function () { exportStarred(true); });
  }

  /* ================= чек-лист защиты от взлома ================= */
  const HARDEN_RISK = { critical: 'обязательно', high: 'важно', medium: 'желательно' };

  function hardenState() {
    let v = {};
    try { v = JSON.parse(store.get('harden') || '{}') || {}; } catch (e) { v = {}; }
    if (!v.done || typeof v.done !== 'object') v.done = {};
    return v;
  }

  function hardenSave(st) { store.set('harden', JSON.stringify(st)); }

  function hardenAll() {
    const out = [];
    (window.HARDEN_GROUPS || []).forEach(function (g) { g.items.forEach(function (i) { out.push(i); }); });
    return out;
  }

  function hardenView() {
    const st = hardenState();
    const items = hardenAll();
    const done = items.filter(function (i) { return st.done[i.id]; }).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    const crit = items.filter(function (i) { return i.risk === 'critical'; });
    const critDone = crit.filter(function (i) { return st.done[i.id]; }).length;

    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Защита от взлома</span></div>';
    html += '<h1 class="art-title">Защита от взлома</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Чек-лист по меню Winbox 4: где что проверить и как исправить. Отмечайте пункты — прогресс сохраняется, из всех команд можно собрать один конфиг.</div>';

    html += '<section class="card hd-head"><div class="hd-progress"><div class="as-num"><b id="hdDone">' + done + '</b><span>из ' + items.length + '</span></div>' +
      '<div class="as-body"><div class="upd-bar"><i id="hdBar" style="width:' + pct + '%"></i></div>' +
      '<div class="as-legend">обязательных: <b id="hdCrit">' + critDone + '</b> из ' + crit.length +
      ' · осталось <b id="hdLeft">' + (items.length - done) + '</b></div></div></div>' +
      '<div class="wz-actions"><button class="btn primary" id="hdCfg">Собрать конфиг защиты</button>' +
      '<button class="btn" id="hdReport">Отчёт</button>' +
      '<button class="btn" id="hdReset">Сбросить</button></div>' +
      '<div id="hdCfgOut"></div></section>';

    html += '<section class="card"><label class="hd-filter"><input type="checkbox" id="hdOnly"> показывать только невыполненные</label></section>';

    (window.HARDEN_GROUPS || []).forEach(function (g) {
      const total = g.items.length;
      const d = g.items.filter(function (i) { return st.done[i.id]; }).length;
      html += '<section class="card hd-group" data-g="' + g.id + '"><h3 class="card-h">' + svg(g.ic || 'svc', 15) + esc(g.name) +
        '<span class="hd-gcount" data-gc="' + g.id + '">' + d + '/' + total + '</span></h3>' +
        (g.note ? '<div class="hint" style="margin:-4px 0 10px">' + esc(g.note) + '</div>' : '') +
        g.items.map(function (it) {
          const on = !!st.done[it.id];
          const art = it.art && BY_ID[it.art];
          return '<div class="hd-item' + (on ? ' done' : '') + '" data-id="' + it.id + '" data-risk="' + it.risk + '">' +
            '<input type="checkbox" class="hd-check" data-hid="' + it.id + '"' + (on ? ' checked' : '') + '>' +
            '<div class="hd-body"><div class="hd-top"><b>' + esc(it.t) + '</b>' +
            '<span class="hd-risk ' + it.risk + '">' + HARDEN_RISK[it.risk] + '</span></div>' +
            '<div class="hd-menu">' + svg('gear', 12) + ' ' + esc(it.menu) + '</div>' +
            '<p class="hd-why">' + esc(it.why) + '</p>' +
            (it.cmd ? '<div class="ai-fix"><code>' + esc(it.cmd) + '</code><button class="btn hd-copy" data-cmd="' + it.id + '">копировать</button></div>' : '') +
            (art ? '<a class="ai-link" href="#/' + it.art + '">Подробнее: ' + esc(art.t) + '</a>' : '') +
            '</div></div>';
        }).join('') + '</section>';
    });
    html += '</div>';
    return html;
  }

  function hardenPaint() {
    const st = hardenState();
    const items = hardenAll();
    const done = items.filter(function (i) { return st.done[i.id]; }).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    const dEl = document.getElementById('hdDone');
    const bEl = document.getElementById('hdBar');
    const lEl = document.getElementById('hdLeft');
    const cEl = document.getElementById('hdCrit');
    if (dEl) dEl.textContent = done;
    if (bEl) bEl.style.width = pct + '%';
    if (lEl) lEl.textContent = items.length - done;
    if (cEl) cEl.textContent = items.filter(function (i) { return i.risk === 'critical' && st.done[i.id]; }).length;
    document.querySelectorAll('.hd-group').forEach(function (g) {
      const gid = g.getAttribute('data-g');
      const grp = (window.HARDEN_GROUPS || []).filter(function (x) { return x.id === gid; })[0];
      if (!grp) return;
      const d = grp.items.filter(function (i) { return st.done[i.id]; }).length;
      const badge = g.querySelector('[data-gc]');
      if (badge) badge.textContent = d + '/' + grp.items.length;
    });
    const only = document.getElementById('hdOnly');
    if (only && only.checked) hardenFilter();
  }

  function hardenFilter() {
    const only = document.getElementById('hdOnly');
    document.querySelectorAll('.hd-item').forEach(function (el) {
      const on = el.classList.contains('done');
      el.classList.toggle('off', !!(only && only.checked && on));
    });
  }

  function hardenConfigText() {
    const out = ['# Базовая защита роутера — команды из чек-листа приложения',
      '# Проверьте адреса сетей и порты перед вставкой. Сохраните текущий конфиг: /export file=before-harden',
      ''];
    (window.HARDEN_GROUPS || []).forEach(function (g) {
      out.push('# ---------- ' + g.name + ' ----------');
      g.items.forEach(function (it) {
        if (!it.cmd) return;
        out.push('# [' + it.menu + '] ' + it.t);
        String(it.cmd).split('\n').forEach(function (l) { out.push(l); });
        out.push('');
      });
    });
    return out.join('\n');
  }

  function hardenReportText() {
    const st = hardenState();
    const items = hardenAll();
    const done = items.filter(function (i) { return st.done[i.id]; }).length;
    const out = ['Чек-лист защиты роутера от взлома',
      'Дата: ' + new Date().toLocaleString('ru-RU'),
      'Выполнено: ' + done + ' из ' + items.length, ''];
    (window.HARDEN_GROUPS || []).forEach(function (g) {
      out.push('== ' + g.name + ' ==');
      g.items.forEach(function (it) {
        out.push((st.done[it.id] ? '[x] ' : '[ ] ') + it.t + '  (' + it.menu + ', ' + HARDEN_RISK[it.risk] + ')');
        if (st.done[it.id] === undefined && it.risk === 'critical') out.push('      ! обязательный пункт');
      });
      out.push('');
    });
    out.push('Отчёт сформирован в приложении «MikroTik · Учебник Winbox 4».');
    return out.join('\n');
  }

  function bindHarden() {
    const st = hardenState();
    const paintOne = function (el, on) {
      el.classList.toggle('done', on);
      const box = el.querySelector('.hd-check');
      if (box) box.checked = on;
    };

    document.querySelectorAll('.hd-check').forEach(function (cb) {
      cb.addEventListener('change', function () {
        const id = cb.getAttribute('data-hid');
        const el = cb.closest('.hd-item');
        if (cb.checked) st.done[id] = true; else delete st.done[id];
        hardenSave(st);
        if (el) paintOne(el, cb.checked);
        hardenPaint();
        hardenFilter();
      });
    });

    document.querySelectorAll('.hd-copy').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = b.getAttribute('data-cmd');
        const it = hardenAll().filter(function (x) { return x.id === id; })[0];
        if (it && it.cmd) { copyText(it.cmd); toast('Команда скопирована'); }
      });
    });

    const only = document.getElementById('hdOnly');
    if (only) only.addEventListener('change', hardenFilter);

    const cfg = document.getElementById('hdCfg');
    if (cfg) cfg.addEventListener('click', function () {
      const text = hardenConfigText();
      const box = document.getElementById('hdCfgOut');
      const name = 'routeros-harden-' + todayISO() + '.rsc';
      if (box) {
        box.innerHTML = '<div class="cfg" style="margin-top:12px"><div class="cfg-h"><span>Базовая защита</span>' +
          '<span class="cfg-btns"><button class="copy" id="hdCopyCfg">копировать</button>' +
          '<button class="copy" id="hdSaveCfg">файл</button></span></div><pre>' + hlCfg(text) + '</pre></div>' +
          '<div class="hint">Вставьте в Winbox → New Terminal. Сначала проверьте адреса сетей и порты в правилах.</div>';
        const cp = document.getElementById('hdCopyCfg');
        if (cp) cp.addEventListener('click', function () { copyText(text); toast('Конфиг скопирован'); });
        const sv = document.getElementById('hdSaveCfg');
        if (sv) sv.addEventListener('click', function () {
          const saved = saveTextFile(name, text);
          if (saved === 'blob') toast('Сохранено: ' + name);
        });
        if (box.scrollIntoView) { try { box.scrollIntoView({ block: 'nearest' }); } catch (e) { } }
      }
    });

    const rep = document.getElementById('hdReport');
    if (rep) rep.addEventListener('click', function () {
      const text = hardenReportText();
      const name = 'protect-report-' + todayISO() + '.txt';
      const saved = saveTextFile(name, text);
      if (saved === 'blob') toast('Отчёт сохранён: ' + name);
      else if (saved === 'bridge') toast('Отчёт сохраняется в Загрузки');
      else shareText(text, 'Чек-лист защиты роутера');
    });

    const reset = document.getElementById('hdReset');
    if (reset) reset.addEventListener('click', function () {
      st.done = {};
      hardenSave(st);
      route();
      toast('Отметки сброшены');
    });

    hardenFilter();
  }

  /* ================= аудит конфигурации ================= */
  const AUDIT_SAMPLE = [
    '# Пример: типичные ошибки маленького офиса',
    '/interface bridge add name=bridge vlan-filtering=no',
    '/interface vlan add name=vlan-guest vlan-id=20 interface=bridge',
    '/interface bridge port add bridge=bridge interface=ether2 pvid=20',
    '/ip address add address=192.168.88.1/24 interface=bridge',
    '/ip pool add name=lan-pool ranges=192.168.88.10-192.168.88.200',
    '/ip dhcp-server add name=dhcp-lan interface=bridge address-pool=lan-pool',
    '/ip dns set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes',
    '/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade',
    '/ip firewall filter add chain=input in-interface=ether1 action=drop',
    '/interface wifi security add name=sec authentication-types=wpa-psk passphrase="12345678"',
    '/ip cloud set ddns-enabled=yes'
  ].join('\n');

  function auditView() {
    const saved = store.get('audit') || '';
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Аудит конфига</span></div>';
    html += '<h1 class="art-title">Аудит конфига</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Вставьте вывод <code class="inl">/export</code> (или <code class="inl">/export compact</code>) — проверю типовые ошибки безопасности, NAT, DHCP, VLAN и IPv6 и дам команды для исправления. Конфиг никуда не отправляется.</div>';
    html += '<section class="card"><textarea class="inp mono diff-in" id="aIn" rows="9" placeholder="# вставьте конфиг RouterOS"></textarea>' +
      '<div class="wz-actions"><button class="btn primary" id="aGo">Проверить</button>' +
      '<button class="btn" id="aSample">Пример с ошибками</button>' +
      '<button class="btn" id="aClear">Очистить</button></div></section>';
    html += '<div id="aOut"></div></div>';
    return html;
  }

  function auditLevelName(l) {
    return l === 'error' ? 'ошибка' : l === 'warn' ? 'внимание' : 'замечание';
  }

  function auditRender() {
    const out = document.getElementById('aOut');
    const inp = document.getElementById('aIn');
    if (!out || !inp) return;
    const text = inp.value;
    store.set('audit', text);
    if (!window.ConfigAudit) { out.innerHTML = '<div class="empty">Модуль аудита не загружен</div>'; return; }
    const res = window.ConfigAudit.check(text);
    if (res.empty) {
      out.innerHTML = '<section class="card"><div class="empty">Вставьте конфиг — минимум несколько строк из <code class="inl">/export</code>.</div></section>';
      return;
    }
    const tone = res.score >= 80 ? 'ok' : res.score >= 50 ? 'mid' : 'bad';
    let h = '<section class="card audit-score ' + tone + '"><div class="as-num"><b>' + res.score + '</b><span>из 100</span></div>' +
      '<div class="as-body"><div class="upd-bar"><i style="width:' + res.score + '%"></i></div>' +
      '<div class="as-legend">ошибок <b class="c-red">' + res.counts.error + '</b> · предупреждений <b class="c-amber">' +
      res.counts.warn + '</b> · замечаний <b class="c-mute">' + res.counts.info + '</b> · строк в конфиге ' + (res.lines || 0) + '</div></div></section>';

    if (!res.findings.length) {
      h += '<section class="card"><div class="qz-fb ok"><b>Проблем не найдено.</b> Конфиг выглядит аккуратно: firewall, NAT, сервисы и время настроены.</div></section>';
    } else {
      h += '<div class="audit-list">' + res.findings.map(function (f, i) {
        const art = BY_ID[f.art];
        return '<section class="card audit-item ' + f.level + '">' +
          '<div class="ai-head"><span class="ai-badge">' + (f.level === 'error' ? '✕' : f.level === 'warn' ? '!' : 'i') + '</span>' +
          '<b>' + esc(f.t) + '</b><span class="ai-lvl">' + auditLevelName(f.level) + '</span></div>' +
          '<p class="ai-why">' + esc(f.why) + '</p>' +
          '<div class="ai-fix"><code>' + hlCfg(f.fix) + '</code><button class="btn ai-copy" data-ci="' + i + '">копировать</button></div>' +
          (art ? '<a class="ai-link" href="#/' + f.art + '">Разобрать: ' + esc(art.t) + '</a>' : '') +
          '</section>';
      }).join('') + '</div>';
      h += '<div class="wz-actions"><button class="btn primary" id="aShare">Поделиться отчётом</button>' +
        '<button class="btn" id="aSave">Сохранить .txt</button></div>';
    }
    out.innerHTML = h;

    out.querySelectorAll('.ai-copy').forEach(function (b) {
      b.addEventListener('click', function () {
        const f = res.findings[parseInt(b.getAttribute('data-ci'), 10)];
        copyText(f.fix);
        toast('Команда скопирована');
      });
    });
    const sh = document.getElementById('aShare');
    if (sh) sh.addEventListener('click', function () {
      shareText(window.ConfigAudit.report(res, { date: todayISO() }), 'Аудит конфигурации RouterOS');
    });
    const sv = document.getElementById('aSave');
    if (sv) sv.addEventListener('click', function () {
      const name = 'routeros-audit-' + todayISO() + '.txt';
      const saved = saveTextFile(name, window.ConfigAudit.report(res, { date: todayISO() }));
      if (saved === 'blob') toast('Сохранено: ' + name);
    });
  }

  /* Приём .rsc из других приложений: «Открыть с помощью» / «Поделиться» */
  window.AppOpenRsc = function (text) {
    const t = String(text == null ? '' : text);
    if (!t.trim()) return;
    try {
      store.set('audit', t);
      window.__autoAudit = true;
      if (location.hash.indexOf('#/audit') === 0) route();
      else location.hash = '#/audit';
      toast('Конфиг получен — проверяем');
    } catch (e) { }
  };

  function bindAudit() {
    const go = document.getElementById('aGo');
    if (!go) return;
    const inp = document.getElementById('aIn');
    const saved = store.get('audit');
    if (saved && inp) inp.value = saved;
    go.addEventListener('click', auditRender);
    if (saved && window.__autoAudit) {
      window.__autoAudit = false;
      setTimeout(auditRender, 60);
    }
    document.getElementById('aSample').addEventListener('click', function () {
      inp.value = AUDIT_SAMPLE;
      auditRender();
    });
    document.getElementById('aClear').addEventListener('click', function () {
      inp.value = '';
      store.set('audit', '');
      document.getElementById('aOut').innerHTML = '';
    });
  }

  /* ================= диагностика по симптому ================= */
  function diagView() {
    const list = window.DIAG || [];
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Диагностика</span></div>';
    html += '<h1 class="art-title">Диагностика по симптому</h1>';
    html += '<div class="hint" style="margin:-6px 0 12px">Выберите, что не работает — получите порядок проверки с командами, которые можно сразу скопировать в терминал.</div>';
    html += '<div class="tools-grid">' + list.map(function (d) {
      return '<a class="tool-card" href="#/diag/' + d.id + '"><span class="tc-ico">' + svg(d.ic || 'svc', 20) + '</span>' +
        '<b>' + esc(d.t) + '</b><span>' + d.steps.length + ' шагов проверки</span></a>';
    }).join('') + '</div></div>';
    return html;
  }

  function diagDetailView(d) {
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/diag">Диагностика</a><span class="sep">/</span><span>' + esc(d.t) + '</span></div>';
    html += '<h1 class="art-title">' + esc(d.t) + '</h1>';
    html += '<div class="hint" style="margin:-6px 0 10px">' + esc(d.why || '') + '</div>';
    html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Порядок проверки</h3>' +
      '<ol class="diag-steps">' + d.steps.map(function (s, i) {
        return '<li class="diag-step"><div class="ds-t">' + esc(s.t) + '</div>' +
          (s.cmd ? '<div class="cfg"><div class="cfg-h"><span>терминал</span><span class="cfg-btns"><button class="copy">копировать</button></span></div><pre>' + hlCfg(s.cmd) + '</pre></div>' : '') +
          (s.art && BY_ID[s.art] ? '<a class="ai-link" href="#/' + s.art + '">Подробнее: ' + esc(BY_ID[s.art].t) + '</a>' : '') +
          '</li>';
      }).join('') + '</ol></section>';
    html += '<div class="wz-actions"><a class="btn" href="#/' + (d.art || '') + '">Связанная статья</a>' +
      '<button class="btn" id="dShare">Поделиться чек-листом</button></div></div>';
    return html;
  }

  function diagText(d) {
    const out = [d.t, ''];
    d.steps.forEach(function (s, i) {
      out.push((i + 1) + '. ' + s.t);
      if (s.cmd) s.cmd.split('\n').forEach(function (c) { out.push('   ' + c); });
    });
    out.push('');
    out.push('Чек-лист из приложения «MikroTik · Учебник Winbox 4».');
    return out.join('\n');
  }

  function bindDiagDetail(d) {
    const sh = document.getElementById('dShare');
    if (sh) sh.addEventListener('click', function () { shareText(diagText(d), 'Диагностика: ' + d.t); });
  }

  /* ================= глоссарий и порты ================= */
  function glossaryView() {
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Глоссарий</span></div>';
    html += '<h1 class="art-title">Глоссарий и порты</h1>';
    html += '<div class="hint" style="margin:-6px 0 10px">Термины RouterOS и сетевые порты — с быстрым поиском. Начните вводить слово.</div>';
    html += '<section class="card"><input class="inp" id="gSearch" placeholder="Найти термин: vlan, nat, dhcp, 443…"></section>';
    html += '<div id="gOut"></div></div>';
    return html;
  }

  function glossaryRender() {
    const out = document.getElementById('gOut');
    const q = (document.getElementById('gSearch') || { value: '' }).value.trim().toLowerCase();
    if (!out) return;
    const terms = (window.GLOSSARY || []).filter(function (x) {
      return !q || (x.t + ' ' + x.d).toLowerCase().indexOf(q) >= 0;
    });
    const ports = (window.PORTS || []).filter(function (x) {
      return !q || (x.port + ' ' + x.proto + ' ' + x.t + ' ' + x.note).toLowerCase().indexOf(q) >= 0;
    });

    let h = '';
    if (!terms.length && !ports.length) {
      h = '<div class="card"><div class="empty">Ничего не нашлось. Попробуйте короче: «vlan», «dns», «500».</div></div>';
      out.innerHTML = h;
      return;
    }
    if (terms.length) {
      h += '<section class="card"><h3 class="card-h">' + svg('book', 15) + 'Термины · ' + terms.length + '</h3>' +
        terms.map(function (x) {
          return '<div class="gl-row"><b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span>' +
            (x.art && BY_ID[x.art] ? ' <a class="ai-link" href="#/' + x.art + '">статья</a>' : '') + '</div>';
        }).join('') + '</section>';
    }
    if (ports.length) {
      h += '<section class="card"><h3 class="card-h">' + svg('iface', 15) + 'Порты · ' + ports.length + '</h3>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Порт</th><th>Протокол</th><th>Служба</th><th>Заметка</th></tr></thead><tbody>' +
        ports.map(function (x) {
          return '<tr><td class="mono">' + esc(x.port) + '</td><td>' + esc(x.proto) + '</td><td>' + esc(x.t) + '</td><td>' + esc(x.note) + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
    }
    out.innerHTML = h;
  }

  function bindGlossary() {
    const s = document.getElementById('gSearch');
    if (!s) return;
    s.addEventListener('input', glossaryRender);
    glossaryRender();
  }

  /* ================= самопроверка ================= */
  let QZ = null;
  let runTick = null;
  let qzTimer = null;

  function stopQuizTimer() {
    if (qzTimer) { clearInterval(qzTimer); qzTimer = null; }
  }

  function qzClock(sec) {
    const m = Math.max(0, Math.floor(sec / 60));
    const s2 = Math.max(0, sec % 60);
    return m + ':' + String(s2).padStart(2, '0');
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function quizShuffleOptions(q) {
    const idx = q.a.map(function (_, i) { return i; });
    shuffle(idx);
    const opts = idx.map(function (i) { return q.a[i]; });
    const c = idx.indexOf(q.c);
    return { q: q.q, a: opts, c: c, e: q.e, r: q.r };
  }

  function quizStart(count, exam, groupId) {
    stopQuizTimer();
    let pool = (window.QUIZ || []).slice();
    if (groupId) {
      pool = pool.filter(function (q) {
        const a = BY_ID[q.r];
        return a && a._group && a._group.id === groupId;
      });
    }
    shuffle(pool);
    const n = count || 10;
    const list = (n >= pool.length ? pool : pool.slice(0, n)).map(quizShuffleOptions);
    QZ = { list: list, i: 0, ans: [], picked: null, done: false, exam: !!exam,
      left: exam ? 20 * 60 : 0, group: groupId || null };
  }

  function quizGroupList() {
    const cnt = {};
    (window.QUIZ || []).forEach(function (q) {
      const a = BY_ID[q.r];
      if (!a || !a._group) return;
      cnt[a._group.id] = (cnt[a._group.id] || 0) + 1;
    });
    return GROUPS.filter(function (g) { return (cnt[g.id] || 0) >= 3; })
      .map(function (g) { return { id: g.id, name: g.name, n: cnt[g.id] }; });
  }

  function quizScore() {
    let n = 0;
    QZ.ans.forEach(function (a) { if (a && a.pick === a.c) n++; });
    return n;
  }

  function quizView() {
    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/tools">Инструменты</a><span class="sep">/</span><span>Самопроверка</span></div>';
    html += '<h1 class="art-title">Самопроверка</h1>';

    if (!QZ) {
      const total = (window.QUIZ || []).length;
      html += '<section class="card"><div class="hint">' + total + ' вопросов по RouterOS. После каждого ответа — пояснение и ссылка на статью. Варианты ответов перемешиваются, результат можно отправить себе или коллеге.</div>' +
        '<div class="wz-actions qz-modes">' +
        '<button class="btn primary" data-qn="10">10 вопросов</button>' +
        '<button class="btn" data-qn="25">25 вопросов</button>' +
        '<button class="btn" data-qn="' + total + '">Все ' + total + '</button>' +
        '<button class="btn" data-qn="exam">Экзамен: 30 вопросов · 20 мин</button>' +
        '</div>';
      const groups = quizGroupList();
      if (groups.length) {
        html += '<div class="qz-groups"><div class="qz-gl">Или тест по разделу:</div><div class="chips">' +
          groups.map(function (g) {
            return '<button class="chip" data-qg="' + g.id + '">' + esc(g.name) + ' · ' + g.n + '</button>';
          }).join('') + '</div></div>';
      }
      html += '</section></div>';
      return html;
    }

    if (!QZ.done) {
      const cur = QZ.list[QZ.i];
      const picked = QZ.picked;
      const gname = QZ.group && BY_ID[(QZ.list[0] || {}).r] && BY_ID[QZ.list[0].r]._group ? BY_ID[QZ.list[0].r]._group.name : '';
      html += '<div class="qz-top"><span>Вопрос ' + (QZ.i + 1) + ' из ' + QZ.list.length +
        (QZ.exam ? ' · экзамен' : (gname ? ' · ' + esc(gname) : '')) + '</span>' +
        '<span>' + (QZ.exam ? '⏱ <b id="qzTimer">' + qzClock(QZ.left) + '</b>' : 'Верно: ' + quizScore()) +
        ' · <button class="lnk" id="qzModes">сменить набор</button></span></div>' +
        '<div class="upd-bar"><i style="width:' + Math.round((QZ.i / QZ.list.length) * 100) + '%"></i></div>';
      html += '<section class="card qz-card"><h3 class="qz-q">' + esc(cur.q) + '</h3><div class="qz-opts">' +
        cur.a.map(function (t, i) {
          let cls = 'qz-opt';
          if (picked != null) {
            if (QZ.exam) {
              if (i === picked) cls += ' sel';
              else cls += ' muted';
            } else if (i === cur.c) cls += ' correct';
            else if (i === picked) cls += ' wrong';
            else cls += ' muted';
          }
          return '<button class="' + cls + '" data-qi="' + i + '"' + (picked != null ? ' disabled' : '') + '>' +
            '<span class="qz-k">' + String.fromCharCode(65 + i) + '</span><span>' + esc(t) + '</span></button>';
        }).join('') + '</div>';
      if (picked != null) {
        if (QZ.exam) {
          html += '<div class="hint" style="margin-top:10px">Ответ принят. Разбор будет в конце экзамена.</div>' +
            '<div class="wz-actions"><button class="btn primary" id="qzNext">' +
            (QZ.i + 1 < QZ.list.length ? 'Следующий вопрос' : 'Завершить и показать результат') + '</button></div>';
        } else {
          const ok = picked === cur.c;
          html += '<div class="qz-fb ' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? 'Верно.' : 'Неверно.') + '</b> ' + esc(cur.e) +
            (cur.r && BY_ID[cur.r] ? ' <a href="#/' + cur.r + '">Разобрать: ' + esc(BY_ID[cur.r].t) + '</a>' : '') + '</div>' +
            '<div class="wz-actions"><button class="btn primary" id="qzNext">' + (QZ.i + 1 < QZ.list.length ? 'Дальше' : 'Показать результат') + '</button></div>';
        }
      }
      html += '</section></div>';
      return html;
    }

    stopQuizTimer();
    const score = quizScore();
    const pct = Math.round((score / QZ.list.length) * 100);
    html += '<section class="card"><h3 class="card-h">' + svg('svc', 15) + (QZ.exam ? 'Результат экзамена' : 'Результат') + '</h3>' +
      '<div class="qz-result"><b>' + score + ' из ' + QZ.list.length + '</b><span>' + pct + '% · ' +
      (pct >= 90 ? 'отлично' : pct >= 70 ? 'хорошо' : pct >= 50 ? 'есть пробелы' : 'стоит перечитать разделы') + '</span></div>' +
      '<div class="upd-bar"><i style="width:' + pct + '%"></i></div></section>';

    const wrong = QZ.ans.map(function (a, i) { return { a: a, q: QZ.list[i] }; }).filter(function (x) { return x.a.pick !== x.a.c; });
    if (wrong.length) {
      html += '<section class="card"><h3 class="card-h">' + svg('book', 15) + 'Что повторить</h3>' +
        wrong.map(function (x) {
          return '<a class="list-row" href="#/' + (x.q.r || '') + '"><span class="n">' + svg('book', 13) + '</span>' +
            '<b>' + esc(x.q.q) + '</b><span>' + (BY_ID[x.q.r] ? esc(BY_ID[x.q.r].t) : 'статья') + '</span></a>';
        }).join('') + '</section>';
    }
    if (QZ.exam) {
      html += '<div class="hint">Экзамен: 30 вопросов, 20 минут, без подсказок. Ниже — вопросы, где вы ошиблись, со ссылками на статьи.</div>';
    }
    html += '<div class="wz-actions"><button class="btn primary" id="qzRestart">Ещё раз</button>' +
      '<button class="btn" id="qzShare">Поделиться результатом</button></div></div>';
    return html;
  }

  function bindQuiz() {
    document.querySelectorAll('[data-qg]').forEach(function (b) {
      b.addEventListener('click', function () {
        quizStart(10, false, b.getAttribute('data-qg'));
        route();
      });
    });
    document.querySelectorAll('[data-qn]').forEach(function (b) {
      b.addEventListener('click', function () {
        const v = b.getAttribute('data-qn');
        if (v === 'exam') quizStart(30, true);
        else quizStart(parseInt(v, 10) || 10, false);
        route();
      });
    });
    const legacy = document.getElementById('qzStart');
    if (legacy) legacy.addEventListener('click', function () { quizStart(10); route(); });
    const modes = document.getElementById('qzModes');
    if (modes) modes.addEventListener('click', function () { QZ = null; stopQuizTimer(); route(); });
    const st = document.getElementById('qzStart');
    if (st) st.addEventListener('click', function () { quizStart(); rerender(); });
    const rs = document.getElementById('qzRestart');
    if (rs) rs.addEventListener('click', function () {
      const wasExam = !!(QZ && QZ.exam);
      const n = QZ && QZ.list ? QZ.list.length : 10;
      const grp = QZ && QZ.group;
      quizStart(wasExam ? 30 : n, wasExam, grp);
      rerender();
    });
    document.querySelectorAll('.qz-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!QZ || QZ.picked != null) return;
        const i = parseInt(b.getAttribute('data-qi'), 10);
        QZ.picked = i;
        QZ.ans[QZ.i] = { pick: i, c: QZ.list[QZ.i].c };
        rerender();
      });
    });

    stopQuizTimer();
    if (QZ && QZ.exam && !QZ.done) {
      qzTimer = setInterval(function () {
        const el = document.getElementById('qzTimer');
        if (!QZ || QZ.done || !el) { stopQuizTimer(); return; }
        QZ.left -= 1;
        el.textContent = qzClock(QZ.left);
        if (QZ.left <= 0) {
          stopQuizTimer();
          QZ.done = true;
          rerender();
          toast('Время вышло');
        }
      }, 1000);
    }
    const nx = document.getElementById('qzNext');
    if (nx) nx.addEventListener('click', function () {
      QZ.picked = null;
      if (QZ.i + 1 >= QZ.list.length) { QZ.done = true; stopQuizTimer(); }
      else QZ.i++;
      rerender();
    });
    const sh = document.getElementById('qzShare');
    if (sh) sh.addEventListener('click', function () {
      shareText('Самопроверка MikroTik: ' + quizScore() + ' из ' + QZ.list.length + '. Приложение «MikroTik · Учебник Winbox 4».', 'Мой результат');
    });
  }

  function rerender() {
    content.innerHTML = quizView();
    content.scrollTop = 0;
    bindQuiz();
  }

  /* ================= режим «на объекте» ================= */
  function runState(id) {
    try {
      const v = JSON.parse(store.get('run:' + id) || '{}');
      return { d: (v && v.d) || {}, start: (v && v.start) || 0 };
    } catch (e) { return { d: {}, start: 0 }; }
  }

  function runSave(id, st) { store.set('run:' + id, JSON.stringify(st)); }

  function runDone(st) { return Object.keys(st.d).filter(function (k) { return st.d[k]; }).length; }

  function runClock(start) {
    const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const m = Math.floor(s / 60), sec = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function stopTick() { if (runTick) { clearInterval(runTick); runTick = null; } }

  function runReportText(a, st) {
    const steps = a.steps || [];
    const done = runDone(st);
    const lines = [];
    lines.push('Отчёт по объекту');
    lines.push('Тема: ' + a.t);
    lines.push('Дата: ' + new Date().toLocaleString('ru-RU'));
    lines.push('Выполнено: ' + done + ' из ' + steps.length);
    if (st.start) {
      lines.push('Начато: ' + new Date(st.start).toLocaleString('ru-RU'));
      lines.push('Затрачено: ' + runClock(st.start));
    }
    lines.push('');
    lines.push('Шаги:');
    steps.forEach(function (s, i) {
      const t = typeof s === 'string' ? s : s.t;
      lines.push((st.d[i] ? '[x] ' : '[ ] ') + t);
    });
    let notes = {};
    try { notes = JSON.parse(store.get('notes') || '{}') || {}; } catch (e) { notes = {}; }
    if (notes[a.id]) {
      lines.push('');
      lines.push('Заметки:');
      lines.push(notes[a.id]);
    }
    lines.push('');
    lines.push('Отчёт сформирован в приложении «MikroTik · Учебник Winbox 4».');
    return lines.join('\n');
  }

  function runView(a) {
    const st = runState(a.id);
    if (!st.start) { st.start = Date.now(); runSave(a.id, st); }
    const steps = a.steps || [];
    const done = runDone(st);
    const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;

    let html = '<div class="wrap">';
    html += '<div class="crumbs"><a href="#/">Учебник</a><span class="sep">/</span><a href="#/' + a.id + '">' + esc(a.t) + '</a><span class="sep">/</span><span>На объекте</span></div>';
    html += '<h1 class="art-title">' + esc(a.t) + '</h1>';
    html += '<div class="run-head"><div class="run-progress"><b id="runCount">' + done + ' из ' + steps.length + '</b>' +
      '<span class="run-clock">⏱ <span id="runClock">' + runClock(st.start) + '</span></span></div>' +
      '<div class="upd-bar"><i id="runBar" style="width:' + pct + '%"></i></div></div>';

    html += '<div class="run-list">' + steps.map(function (s, i) {
      const on = !!st.d[i];
      const t = typeof s === 'string' ? s : s.t;
      const d = typeof s === 'string' ? '' : (s.d || '');
      return '<button class="run-step' + (on ? ' on' : '') + '" data-ri="' + i + '">' +
        '<span class="rs-box">' + (on ? '✓' : '') + '</span>' +
        '<span class="rs-body"><b>' + inline(t) + '</b>' + (d ? '<span class="rs-d">' + inline(d) + '</span>' : '') + '</span></button>';
    }).join('') + '</div>';

    html += '<div class="wz-actions">' +
      '<button class="btn" id="runReset">Сбросить</button>' +
      '<button class="btn" id="runReport">Отчёт</button>' +
      '<a class="btn" href="#/' + a.id + '">Открыть статью</a>' +
      '<button class="btn primary" id="runFinish">' + (done === steps.length && steps.length ? 'Готово ✓' : 'Отметить прочитанной') + '</button>' +
      '</div>';
    html += '<div class="hint">Галочки сохраняются на устройстве — можно закрыть приложение и вернуться.</div>';
    html += '</div>';
    return html;
  }

  function bindRun(a) {
    const steps = a.steps || [];
    const st = runState(a.id);
    const paint = function () {
      const done = runDone(st);
      const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
      const cnt = document.getElementById('runCount');
      const bar = document.getElementById('runBar');
      const fin = document.getElementById('runFinish');
      if (cnt) cnt.textContent = done + ' из ' + steps.length;
      if (bar) bar.style.width = pct + '%';
      if (fin) fin.textContent = (done === steps.length && steps.length) ? 'Готово ✓' : 'Отметить прочитанной';
    };
    document.querySelectorAll('.run-step').forEach(function (b) {
      b.addEventListener('click', function () {
        const i = b.getAttribute('data-ri');
        st.d[i] = !st.d[i];
        runSave(a.id, st);
        b.classList.toggle('on', !!st.d[i]);
        const box = b.querySelector('.rs-box');
        if (box) box.textContent = st.d[i] ? '✓' : '';
        paint();
      });
    });
    const rs = document.getElementById('runReset');
    if (rs) rs.addEventListener('click', function () {
      st.d = {}; st.start = Date.now(); runSave(a.id, st);
      document.querySelectorAll('.run-step').forEach(function (b) {
        b.classList.remove('on');
        const box = b.querySelector('.rs-box');
        if (box) box.textContent = '';
      });
      paint();
      toast('Чек-лист сброшен');
    });
    const fin = document.getElementById('runFinish');
    if (fin) fin.addEventListener('click', function () {
      markRead(a.id);
      toast('Статья отмечена прочитанной');
    });

    const rep = document.getElementById('runReport');
    if (rep) rep.addEventListener('click', function () {
      const text = runReportText(a, st);
      const name = 'report-' + a.id + '-' + todayISO() + '.txt';
      const saved = saveTextFile(name, text);
      if (saved === 'blob') toast('Отчёт сохранён: ' + name);
      else if (saved === 'bridge') toast('Отчёт сохраняется в Загрузки');
      else shareText(text, 'Отчёт по объекту: ' + a.t);
    });

    stopTick();
    const clk = document.getElementById('runClock');
    if (clk) {
      runTick = setInterval(function () {
        const el = document.getElementById('runClock');
        if (!el) { stopTick(); return; }
        el.textContent = runClock(st.start);
      }, 1000);
    }
  }

  /* ---------------- роутер ---------------- */
  const content = $('#content');

  /* ------- навигация: возврат и позиция прокрутки ------- */
  const navTrail = [];
  let lastHash = '', popping = false;

  function scrollStoreKey() { return 'sc:' + (location.hash || '#/'); }

  function saveScroll() {
    if (!content) return;
    const k = scrollStoreKey();
    try {
      sessionStorage.setItem(k, String(content.scrollTop || 0));
    } catch (e) { }
  }

  function restoreScroll() {
    if (!content) return;
    let v = 0;
    try {
      v = parseInt(sessionStorage.getItem(scrollStoreKey()) || '0', 10) || 0;
    } catch (e) { v = 0; }
    content.scrollTop = v > 0 ? v : 0;
    if (v > 0 && window.requestAnimationFrame) {
      requestAnimationFrame(function () { content.scrollTop = v; });
    }
  }

  function updateBackBtn() {
    const btn = document.getElementById('backBtn');
    if (!btn) return;
    const home = !location.hash || location.hash === '#/' || location.hash === '#';
    btn.hidden = home;
  }

  function goBack() {
    /* Снимок Winbox 4 открыт поверх статьи: «Назад» закрывает его,
       а не уводит в предыдущий экран (раньше — в «О программе»). */
    if (window.ShotView && window.ShotView.isOpen()) {
      window.ShotView.close();
      return;
    }
    if (navTrail.length) {
      popping = true;
      const target = navTrail.pop();
      if (location.hash === target) {
        popping = false;
        return;
      }
      location.hash = target;
      setTimeout(function () { popping = false; }, 120);
      return;
    }
    if (location.hash && location.hash !== '#/' && window.history && history.length > 1) {
      history.back();
      return;
    }
    location.hash = '#/';
  }

  function route() {
    const from = lastHash;
    saveScroll();
    renderRoute();
    const to = location.hash || '#/';
    if (!popping && from && from !== to) {
      navTrail.push(from);
      if (navTrail.length > 40) navTrail.shift();
    }
    lastHash = to;
    updateBackBtn();
    restoreScroll();
  }

  function renderRoute() {
    stopTick();
    if (location.hash.indexOf('#/quiz') !== 0) stopQuizTimer();
    const hash = location.hash.replace(/^#\/?/, '');
    const id = hash.split('?')[0];

    if (!id) {
      content.innerHTML = homeView();
      content.scrollTop = 0;
      markActive(null);
      refreshProgress();
      document.title = 'MikroTik · Учебник Winbox 4';
      return;
    }
    if (id === 'settings') {
      content.innerHTML = settingsView();
      content.scrollTop = 0;
      markActive(null);
      bindSettings();
      document.title = 'Настройки · MikroTik';
      return;
    }
    if (id === 'about') {
      content.innerHTML = aboutView();
      content.scrollTop = 0;
      markActive(null);
      bindSettings();
      document.title = 'О программе · MikroTik';
      return;
    }
    const TOOL_TITLES = {
      tools: 'Инструменты', wizard: 'Мастер конфигурации', router: 'Мой роутер', win4: 'Окна Winbox 4',
      subnet: 'Калькулятор подсетей',
      vlsm: 'VLSM-планировщик', diff: 'Сравнить конфиги', quiz: 'Самопроверка',
      audit: 'Аудит конфига', diag: 'Диагностика по симптому', glossary: 'Глоссарий и порты',
      harden: 'Защита от взлома', course: 'Курс за 7 дней', models: 'Порты моделей',
      starred: 'Избранное и заметки', wifi: 'Каналы Wi-Fi', coverage: 'Мощность и покрытие',
      keys: 'Пароли и ключи', cheats: 'Шпаргалки', examples: 'Примеры конфигов',
      backup: 'Данные и резервная копия', poe: 'PoE и питание'
    };
    if (TOOL_TITLES[id]) {
      const VIEWS = {
        tools: toolsView, wizard: wizardView, router: routerView, win4: win4View,
        subnet: subnetView, vlsm: vlsmView, diff: diffView,
        quiz: quizView, audit: auditView, diag: diagView, glossary: glossaryView, harden: hardenView,
        course: courseView, models: modelsView, starred: starredView, wifi: wifiView,
        keys: keysView, coverage: coverageView, poe: poeView, cheats: cheatsView, examples: examplesView, backup: backupView
      };
      content.innerHTML = VIEWS[id]();
      content.scrollTop = 0;
      markActive(null);
      const BINDS = {
        wizard: bindWizard, router: bindRouter, win4: bindWin4, subnet: bindSubnet, vlsm: bindVlsm, diff: bindDiff, quiz: bindQuiz,
        audit: bindAudit, glossary: bindGlossary, harden: bindHarden, course: bindCourse,
        models: bindModels, starred: bindStarred, wifi: bindWifi, keys: bindKeys,
        coverage: bindCoverage, poe: bindPoe, examples: bindExamples, backup: bindBackup
      };
      if (BINDS[id]) BINDS[id]();
      document.title = TOOL_TITLES[id] + ' · MikroTik';
      return;
    }

    if (id.indexOf('cheats/') === 0) {
      const cid = id.slice(7);
      const c = (window.CHEATS || []).filter(function (x) { return x.id === cid; })[0];
      if (!c) {
        content.innerHTML = '<div class="wrap"><div class="empty">Шпаргалка не найдена.<br><br><a class="badge" href="#/cheats">К шпаргалкам</a></div></div>';
        return;
      }
      content.innerHTML = cheatDetailView(c);
      content.scrollTop = 0;
      markActive(null);
      bindCheatDetail(c);
      document.title = c.t + ' · MikroTik';
      return;
    }

    if (id.indexOf('examples/') === 0) {
      const eid = id.slice(9);
      const ex = (window.EXAMPLES || []).filter(function (x) { return x.id === eid; })[0];
      if (!ex) {
        content.innerHTML = '<div class="wrap"><div class="empty">Пример не найден.<br><br><a class="badge" href="#/examples">К примерам</a></div></div>';
        return;
      }
      content.innerHTML = exampleDetailView(ex);
      content.scrollTop = 0;
      markActive(null);
      bindExampleDetail(ex);
      document.title = ex.t + ' · MikroTik';
      return;
    }

    if (id.indexOf('diag/') === 0) {
      const did = id.slice(5);
      const sym = (window.DIAG || []).filter(function (x) { return x.id === did; })[0];
      if (!sym) {
        content.innerHTML = '<div class="wrap"><div class="empty">Симптом не найден.<br><br><a class="badge" href="#/diag">К диагностике</a></div></div>';
        return;
      }
      content.innerHTML = diagDetailView(sym);
      content.scrollTop = 0;
      markActive(null);
      bindDiagDetail(sym);
      document.title = sym.t + ' · MikroTik';
      return;
    }

    if (id.indexOf('run/') === 0) {
      const rid = id.slice(4);
      const ra = BY_ID[rid];
      if (!ra) {
        content.innerHTML = '<div class="wrap"><div class="empty">Статья не найдена.<br><br><a class="badge" href="#/">На главную</a></div></div>';
        return;
      }
      content.innerHTML = runView(ra);
      content.scrollTop = 0;
      markActive(rid);
      bindRun(ra);
      document.title = 'На объекте · ' + ra.t;
      return;
    }

    const a = BY_ID[id];
    if (!a) {
      content.innerHTML = '<div class="wrap"><div class="empty">Раздел не найден.<br><br><a class="badge" href="#/">На главную</a></div></div>';
      return;
    }
    content.innerHTML = articleView(a);
    content.scrollTop = 0;
    markActive(id);
    markRead(id);
    widgetSync(a);
    store.set('last', JSON.stringify({ id: id, at: Date.now() }));
    syncFavBtn();
    hydrate(a);
    document.title = a.t + ' · MikroTik Winbox 4';
  }

  /** Обновить виджет на главном экране Android: «Продолжить: …» и процент чтения. */
  function widgetSync(a) {
    try {
      if (!window.AndroidBridge || typeof window.AndroidBridge.setWidget !== 'function') return;
      const total = FLAT.length || 1;
      const pct = Math.round(Object.keys(readMap()).length * 100 / total);
      window.AndroidBridge.setWidget(a.t, a.id, pct);
    } catch (e) { }
  }

  /* звезда «в избранное» */
  document.addEventListener('click', function (e) {
    const fb = e.target.closest && e.target.closest('#favBtn');
    if (!fb) return;
    const id = location.hash.replace(/^#\/?/, '').split('?')[0];
    if (id) toggleFav(id);
  });

  /* поделиться конфигом или статьёй */
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (!t || !t.closest) return;
    const cfgBtn = t.closest('[data-share="cfg"]');
    if (cfgBtn) {
      const host = cfgBtn.closest('.cfg');
      const pre = host ? host.querySelector('pre') : null;
      shareText(pre ? pre.innerText : '', 'Конфиг RouterOS');
      return;
    }
    const printBtn = t.closest('#printArt');
    if (printBtn) {
      const cur = BY_ID[location.hash.replace(/^#\/?/, '').split('?')[0]];
      const title = cur ? cur.t : 'MikroTik';
      if (window.AndroidBridge && window.AndroidBridge.printPage) window.AndroidBridge.printPage(title);
      else if (window.print) window.print();
      return;
    }
    const htmlBtn = t.closest('#htmlArt');
    if (htmlBtn) {
      const cur = BY_ID[location.hash.replace(/^#\/?/, '').split('?')[0]];
      if (cur) exportArticle(cur);
      return;
    }
    const artBtn = t.closest('#shareArt');
    if (artBtn) {
      const cur = BY_ID[location.hash.replace(/^#\/?/, '').split('?')[0]];
      if (!cur) return;
      shareText((cur.path ? cur.path + '\n' : '') + (cur.purpose || '') +
        '\n\nИз приложения «MikroTik · Учебник Winbox 4».', cur.t);
    }
  });

  /* копирование команд и готовых конфигов */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('.copy');
    if (!btn) return;
    const host = btn.closest('.term, .wb-term, .cfg');
    const pre = host ? host.querySelector('pre') : null;
    const text = pre ? pre.innerText : '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (err) { }
      document.body.removeChild(ta);
    }
    btn.textContent = 'скопировано';
    setTimeout(function () { btn.textContent = 'копировать'; }, 1400);
  });

  /* Снимки Winbox 4 открываем своим полноэкранным слоем, а не target=_blank:
     иначе WebView уводит на файл картинки, «Назад» возвращает не в статью,
     и нет ни крестика, ни нормального масштаба. */
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (!t || !t.closest) return;
    const a = t.closest('a.shot-link');
    if (!a || !window.ShotView) return;
    e.preventDefault();
    window.ShotView.open(a.getAttribute('href'), {
      title: a.getAttribute('data-title') || 'Снимок Winbox 4'
    });
  });

  /* ---------------- init ---------------- */
  function init() {
    buildSidebar();

    const backBtn = $('#backBtn');
    if (backBtn) backBtn.addEventListener('click', goBack);
    $('#menuBtn').addEventListener('click', function () {
      if (sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
    });
    $('#scrim').addEventListener('click', closeSidebar);

    $('#fontDown').addEventListener('click', function () { applyFs(fsIdx - 1); });
    $('#fontUp').addEventListener('click', function () { applyFs(fsIdx + 1); });
    $('#settingsBtn').addEventListener('click', function () { location.hash = '#/settings'; });

    $('#searchBtn').addEventListener('click', function () {
      $('#searchLayer').hidden = false;
      doSearch('');
      setTimeout(function () { $('#searchInput').focus(); }, 60);
    });
    $('#searchClose').addEventListener('click', function () {
      $('#searchLayer').hidden = true;
      $('#searchInput').value = '';
    });
    $('#searchInput').addEventListener('input', function (e) { doSearch(e.target.value); });
    $('#searchInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        sqPush(e.target.value);
        doSearch(e.target.value);
        if (document.activeElement === e.target) e.target.blur();
      }
    });
    $('#searchLayer').addEventListener('click', function (e) {
      const chip = e.target.closest && e.target.closest('.sq-chip');
      if (chip) {
        const q = chip.getAttribute('data-sq') || chip.textContent;
        $('#searchInput').value = q;
        doSearch(q);
        $('#searchInput').focus();
        return;
      }
      if (e.target.closest('.sr')) {
        sqPush($('#searchInput').value);
        $('#searchLayer').hidden = true;
        $('#searchInput').value = '';
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { $('#searchLayer').hidden = true; closeSidebar(); }
    });

    // вернулись из настроек после выдачи разрешения — продолжаем загрузку сами
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      if (!pendingUpdate || !pendingUpdate.waiting) return;
      if (!(window.AndroidBridge && window.AndroidBridge.canInstallPackages)) return;
      try {
        if (window.AndroidBridge.canInstallPackages()) {
          const p = pendingUpdate;
          startDownload(p.url, p.ver);
        }
      } catch (e) { }
    });

    applyTheme();
    syncFsUi();

    /* «Открывать последнюю статью при запуске»: только если пользователь включил
       и приложение открыто на главной (а не по прямой ссылке). */
    if (store.get('autoResume') === '1') {
      const h = String(location.hash || '');
      if (h === '' || h === '#' || h === '#/') {
        const lastOne = lastRead();
        if (lastOne && BY_ID[lastOne.id]) location.hash = '#/' + lastOne.id;
      }
    }

    /* отладочный доступ для автопроверок (не влияет на работу приложения) */
  window.AppDebug = { stepSceneFor: stepSceneFor, stems: stems, autoFocus: autoFocus };

  window.addEventListener('hashchange', markSideLink);
  window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
