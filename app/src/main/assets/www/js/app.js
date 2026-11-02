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
    const m = readMap();
    if (!m[id]) {
      m[id] = 1;
      store.set(READ_KEY, JSON.stringify(m));
      refreshProgress();
    }
  }
  function readCount() { return Object.keys(readMap()).length; }

  /* ---------------- размер шрифта ---------------- */
  const FS_STEPS = [0.9, 1, 1.08, 1.18, 1.3];
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
    { href: '#/tools', ic: 'gear', t: 'Инструменты', sub: 'мастер, калькуляторы, квиз' },
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
  function warnIcon() {
    return '<svg viewBox="0 0 24 24" width="17" height="17"><path d="M12 4l8.5 15h-17z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M12 10v4M12 16.6v.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  }

  /* ---------------- главная ---------------- */
  function homeView() {
    const total = FLAT.length;
    const tasks = (GROUPS.filter(function (g) { return g.id === 'tasks'; })[0] || { items: [] }).items.length;
    const scenesCount = FLAT.reduce(function (n, a) { return n + ((a.scenes || []).length); }, 0);
    const stepsCount = FLAT.reduce(function (n, a) { return n + ((a.steps || []).length); }, 0);
    const quick = ['start-first-login', 'start-base-setup', 'ip-firewall-filter', 'ip-firewall-nat',
      'ip-dhcp-server', 'start-backup', 'vpn-wireguard', 'task-lan-internet'];

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
      '<p>Окна Winbox 4 — векторные копии интерфейса RouterOS 7: те же вкладки, колонки, кнопки и поля. ' +
      'Они масштабируются под экран телефона, а кнопка «⤢ крупнее» открывает схему на весь экран. ' +
      'Красная рамка и стрелка с номером показывают, куда нажимать.</p>' +
      '<p>Команды в терминале можно копировать: нажмите «копировать» и вставьте в Winbox → New Terminal ' +
      'или в SSH-сессию.</p></div>';

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
      ((a.steps && a.steps.length) ? '<a class="btn" href="#/run/' + a.id + '">Режим на объекте</a>' : '') +
      '</div>';

    if (a.purpose) html += card('Назначение', 'book', '<p class="lead">' + inline(a.purpose) + '</p>');
    if (a.usage && a.usage.length) {
      html += card('Где применяется', 'iface', '<ul class="clean">' +
        a.usage.map(function (u) { return '<li>' + inline(u) + '</li>'; }).join('') + '</ul>');
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
      const withShots = shotsEnabled() && (a.scenes && a.scenes.length);
      html += '<section class="card"><h3 class="card-h">' + svg('task', 15) + 'Инструкция по настройке</h3>' +
        (withShots ? '<div class="hint" style="margin:-4px 0 10px">Под каждым шагом — окно Winbox 4 ' +
          'с красной рамкой на том элементе, о котором идёт речь. Тап по окну открывает его на весь экран.</div>' : '') +
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
        '<button class="share" data-share="cfg">поделиться</button></span></div><pre>' + esc(text) + '</pre></div></section>';
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
      '<div class="grow"><div class="lbl">Тёмная тема</div><div class="hint">Оформление приложения; схемы Winbox всегда светлые</div></div>' +
      '<div class="switch' + (document.documentElement.getAttribute('data-theme') === 'dark' ? ' on' : '') + '" id="themeSwitch" role="switch" aria-label="Тёмная тема"></div>' +
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
      '<div class="set-row"><div class="grow"><div class="lbl">Прогресс чтения и избранное</div>' +
      '<div class="hint">Прочитано <b id="readStat">0 из ' + FLAT.length + '</b>, в избранном ' + favs().length + ' статей</div></div>' +
      '<button class="btn" id="resetProgress">Сбросить прогресс</button></div>' +
      '</div>';

    html += '<div class="set-card">' +
      '<div class="set-row"><div class="grow"><div class="lbl">Сбросить настройки приложения</div>' +
      '<div class="hint">Размер шрифта и тема вернутся к значениям по умолчанию</div></div>' +
      '<button class="btn primary" id="resetBtn">Сбросить</button></div>' +
      '</div>';

    html += '<a class="list-row" href="#/backup"><span class="n">' + svg('down', 13) + '</span>' +
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
      '<a class="btn" href="' + RELEASES_URL + '">Все релизы ↗</a></div></div>';

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

    /* окно под каждым шагом инструкции */
    const shots = content.querySelectorAll('.step-shot');
    Array.prototype.forEach.call(shots, function (host) {
      const i = parseInt(host.getAttribute('data-si'), 10);
      const pick = stepSceneFor(a, i);
      if (!pick) return;
      Scene.mount(host, [pick.spec], { compact: true });
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
    const dn = $('#fsDown2'), up = $('#fsUp2');
    if (dn) dn.addEventListener('click', function () { applyFs(fsIdx - 1); });
    if (up) up.addEventListener('click', function () { applyFs(fsIdx + 1); });

    const sw = $('#themeSwitch');
    if (sw) sw.addEventListener('click', function () {
      const cur = document.documentElement.getAttribute('data-theme');
      const nx = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nx);
      store.set('theme', nx);
      sw.classList.toggle('on', nx === 'dark');
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
      buildFavBox();
      refreshProgress();
      rp.textContent = 'Сброшено';
      setTimeout(function () { rp.textContent = 'Сбросить прогресс'; }, 1500);
    });

    refreshProgress();

    const rst = $('#resetBtn');
    if (rst) rst.addEventListener('click', function () {
      store.del('fs'); store.del('theme');
      fsIdx = 1;
      document.documentElement.setAttribute('data-fs', '1');
      document.documentElement.setAttribute('data-theme', 'dark');
      syncFsUi();
      if (sw) sw.classList.add('on');
      rst.textContent = 'Сброшено';
      setTimeout(function () { rst.textContent = 'Сбросить'; }, 1500);
    });

    syncFsUi();
  }

  /* ---------------- поиск ---------------- */
  let SEARCH_INDEX = null;
  function buildIndex() {
    SEARCH_INDEX = FLAT.map(function (a) {
      const steps = (a.steps || []).map(function (s) { return typeof s === 'string' ? s : (s.t + ' ' + (s.d || '')); }).join(' ');
      const cfg = a.config ? (Array.isArray(a.config) ? a.config.join(' ') : String(a.config)) : '';
      const cmds = (a.check || []).map(function (c) { return c.c || ''; }).join(' ');
      const text = [a.t, a.path, a.purpose, (a.usage || []).join(' '), steps,
        (a.mistakes || []).join(' '), (a.tags || []).join(' '), cfg, cmds].join(' ').toLowerCase();
      return { a: a, text: text };
    });
  }
  function doSearch(q) {
    if (!SEARCH_INDEX) buildIndex();
    const res = $('#searchResults');
    const query = q.trim().toLowerCase();
    if (query.length < 2) {
      res.innerHTML = '<div class="empty">Введите минимум 2 символа.<br>Например: <b>nat</b>, <b>vlan</b>, <b>wireguard</b>, <b>dhcp</b>, <b>backup</b>, <b>pppoe</b>.</div>';
      return;
    }
    const words = query.split(/\s+/);
    const hits = SEARCH_INDEX.filter(function (row) {
      return words.every(function (w) { return row.text.indexOf(w) >= 0; });
    }).slice(0, 40);
    if (!hits.length) {
      res.innerHTML = '<div class="empty">Ничего не найдено по запросу «' + esc(q) + '».</div>';
      return;
    }
    res.innerHTML = hits.map(function (h) {
      const a = h.a;
      const at = h.text.indexOf(words[0]);
      const snippet = at > 60 ? '…' + h.text.slice(at - 60, at + 110) : h.text.slice(0, 150);
      return '<a class="sr" href="#/' + a.id + '"><b>' + esc(a.t) + '</b>' +
        '<span>' + esc(a._group.name) + (a.path ? ' · ' + esc(a.path) : '') + '</span>' +
        '<p>' + esc(snippet) + '…</p></a>';
    }).join('');
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
      toolCard('#/subnet', 'Калькулятор подсетей', 'Маска, диапазон, broadcast, деление на подсети', 'ip') +
      toolCard('#/vlsm', 'VLSM-планировщик', 'План адресации по числу хостов + CSV', 'iface') +
      toolCard('#/diff', 'Сравнить конфиги', 'Два экспорта — что изменилось', 'task') +
      toolCard('#/quiz', 'Самопроверка', '10 вопросов по RouterOS с разбором ошибок', 'book') +
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
    autobackup: false, tz: 'Europe/Minsk', ntp: 'by.pool.ntp.org'
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

    html += '<section class="card"><h3 class="card-h">' + svg('system', 15) + 'Роутер и WAN</h3>' +
      wizField('w-identity', 'Имя роутера', o.identity) +
      wizSelect('w-wan', 'Подключение к провайдеру', o.wan, [
        { v: 'dhcp', t: 'DHCP (автоматически)' },
        { v: 'static', t: 'Статический IP' },
        { v: 'pppoe', t: 'PPPoE (логин и пароль)' }
      ]) +
      wizField('w-wanPort', 'Порт WAN', o.wanPort, 'обычно ether1') +
      '<div class="wz-group' + (isStatic ? '' : ' off') + '" data-g="static">' +
      wizField('w-wanIp', 'IP-адрес WAN', o.wanIp) +
      wizField('w-wanPrefix', 'Префикс WAN', o.wanPrefix) +
      wizField('w-wanGw', 'Шлюз провайдера', o.wanGw) +
      '</div>' +
      '<div class="wz-group' + (isPppoe ? '' : ' off') + '" data-g="pppoe">' +
      wizField('w-pppoeUser', 'Логин PPPoE', o.pppoeUser) +
      wizField('w-pppoePass', 'Пароль PPPoE', o.pppoePass) +
      '</div></section>';

    html += '<section class="card"><h3 class="card-h">' + svg('iface', 15) + 'LAN, DHCP и DNS</h3>' +
      wizField('w-lanIp', 'IP роутера в LAN', o.lanIp) +
      wizField('w-lanPrefix', 'Префикс LAN', o.lanPrefix) +
      wizField('w-lanPorts', 'Порты LAN', o.lanPorts, 'диапазон: ether2-ether5') +
      wizSwitch('w-dhcp', 'DHCP-сервер и пул', o.dhcp, 'раздавать адреса автоматически') +
      wizField('w-dns', 'DNS-серверы', o.dns, 'через запятую') +
      '</section>';

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
      '<div class="wz-group' + (o.guest ? '' : ' off') + '" data-g="guest">' +
      wizField('w-wifiGuestSsid', 'Гостевой SSID', o.wifiGuestSsid) +
      wizField('w-wifiGuestPass', 'Пароль гостевого Wi-Fi', o.wifiGuestPass) +
      '</div></div></section>';

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
      wizSwitch('w-wg', 'WireGuard-сервер', o.wg, 'удалённый доступ сотрудников') +
      '<div class="wz-group' + (o.wg ? '' : ' off') + '" data-g="wg">' +
      wizField('w-wgIp', 'Адрес WireGuard', o.wgIp) +
      wizField('w-wgPort', 'Порт WireGuard', o.wgPort) +
      '</div>' +
      wizSwitch('w-l2tp', 'L2TP/IPsec-сервер', o.l2tp, 'совместим с телефонами без клиента') +
      '<div class="wz-group' + (o.l2tp ? '' : ' off') + '" data-g="l2tp">' +
      wizField('w-l2tpPsk', 'IPsec PSK', o.l2tpPsk) +
      wizField('w-l2tpPool', 'Пул адресов для VPN', o.l2tpPool) +
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

    html += '<section class="card"><h3 class="card-h">' + svg('svc', 15) + 'Дополнительно</h3>' +
      wizSwitch('w-protect', 'Firewall и защита', o.protect, 'рекомендуется включить') +
      wizSwitch('w-nat', 'NAT (masquerade)', o.nat, 'интернет для LAN') +
      wizSwitch('w-autobackup', 'Автобэкап конфига', o.autobackup, 'скрипт + планировщик на 03:30') +
      '</section>';

    html += '<div class="wz-actions"><button class="btn primary" id="wizGo">Собрать конфиг</button>' +
      '<button class="btn" id="wizCheck">Проверить поля</button>' +
      '<button class="btn" id="wizReset">Сбросить</button></div>';
    html += '<div id="wizIssues"></div><div id="wizOut"></div>';
    html += '</div>';
    return html;
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
      l2tp: on('w-l2tp'), l2tpPsk: g('w-l2tpPsk', ''), l2tpPool: g('w-l2tpPool', ''),
      pppoeServer: on('w-pppoeServer'), pppoeServerPort: g('w-pppoeServerPort', 'ether5'),
      pppoePool: g('w-pppoePool', ''), pppoeServerUser: g('w-pppoeServerUser', ''),
      pppoeServerPass: g('w-pppoeServerPass', ''),
      forwards: forwards,
      nat: on('w-nat'), protect: on('w-protect'), autobackup: on('w-autobackup'),
      tz: wizSaved().tz || 'Europe/Minsk', ntp: wizSaved().ntp || 'by.pool.ntp.org',
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
      ' · пробросов: ' + (c.forwards || 0) + ' · VPN-сервисов: ' + (c.vpn || 0) + '</div>';
    if (res.errors && res.errors.length) {
      h += '<div class="warn"><span class="wi">' + warnIcon() + '</span><div><b>Есть ошибки в полях:</b><br>' +
        res.errors.map(esc).join('<br>') + '</div></div>';
    }
    if (res.warnings && res.warnings.length) {
      h += '<div class="warn"><span class="wi">' + warnIcon() + '</span><div>' + res.warnings.map(esc).join('<br>') + '</div></div>';
    }
    h += '<div class="cfg"><div class="cfg-h"><span>' + esc(res.title || 'RouterOS 7') + '</span>' +
      '<span class="cfg-btns"><button class="copy">копировать</button>' +
      '<button class="share" data-share="cfg">поделиться</button>' +
      '<button class="share" id="wizSave">файл</button></span></div>' +
      '<pre>' + esc(res.text || '') + '</pre></div>' +
      '<div class="hint" style="margin-top:10px">Вставьте в Winbox → New Terminal. Перед вставкой сохраните текущий конфиг: <code class="inl">/export file=before-change</code>.</div>' +
      '</section>';
    out.innerHTML = h;
    const sv = document.getElementById('wizSave');
    if (sv) sv.addEventListener('click', function () {
      const name = 'routeros-' + cleanName(opts.identity) + '.rsc';
      const saved = saveTextFile(name, res.text);
      if (saved === 'blob') toast('Файл сохранён: ' + name);
      else if (!saved) shareText(res.text, 'Конфиг RouterOS');
    });
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
        if (key === 'wifi') show = on('w-wifi');
        if (key === 'ipv6s') show = ipv6 && ipv6.value === 'static';
        if (key === 'wg') show = on('w-wg');
        if (key === 'l2tp') show = on('w-l2tp');
        if (key === 'pppoeSrv') show = on('w-pppoeServer');
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
    ['w-wan', 'w-ipv6'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', function () { sync(); wizStore(wizCollect()); });
    });
    document.querySelectorAll('#wizFwd .fwd-row').forEach(function (row) {
      const del = row.querySelector('.f-del');
      if (del) del.addEventListener('click', function () {
        row.parentNode.removeChild(row);
        wizStore(wizCollect());
      });
    });

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
  const BACKUP_KEYS = ['fav', 'read', 'notes', 'last', 'snq', 'wiz', 'vlsm', 'diffA', 'diffB', 'diffIgnore', 'shots', 'theme', 'fs'];

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
      '<button class="btn" id="bFile">Сохранить файл</button></div></section>';
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
      const name = 'mikrotik-gide-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      const saved = saveTextFile(name, document.getElementById('bOut').value);
      if (saved === 'blob') toast('Сохранено: ' + name);
      else if (!saved) toast('Сохранение недоступно — используйте «Поделиться»');
    });
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
        return '<div class="dl ' + cls + '"><span class="sg">' + (l.t === ' ' ? ' ' : l.t) + '</span><span class="tx">' + esc(l.s) + '</span></div>';
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

  /* ================= самопроверка ================= */
  let QZ = null;
  let runTick = null;

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

  function quizStart(count) {
    const pool = (window.QUIZ || []).slice();
    shuffle(pool);
    const n = count || 10;
    const list = (n >= pool.length ? pool : pool.slice(0, n)).map(quizShuffleOptions);
    QZ = { list: list, i: 0, ans: [], picked: null, done: false };
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
        '</div></section></div>';
      return html;
    }

    if (!QZ.done) {
      const cur = QZ.list[QZ.i];
      const picked = QZ.picked;
      html += '<div class="qz-top"><span>Вопрос ' + (QZ.i + 1) + ' из ' + QZ.list.length + '</span>' +
        '<span>Верно: ' + quizScore() + ' · <button class="lnk" id="qzModes">сменить набор</button></span></div>' +
        '<div class="upd-bar"><i style="width:' + Math.round((QZ.i / QZ.list.length) * 100) + '%"></i></div>';
      html += '<section class="card qz-card"><h3 class="qz-q">' + esc(cur.q) + '</h3><div class="qz-opts">' +
        cur.a.map(function (t, i) {
          let cls = 'qz-opt';
          if (picked != null) {
            if (i === cur.c) cls += ' correct';
            else if (i === picked) cls += ' wrong';
            else cls += ' muted';
          }
          return '<button class="' + cls + '" data-qi="' + i + '"' + (picked != null ? ' disabled' : '') + '>' +
            '<span class="qz-k">' + String.fromCharCode(65 + i) + '</span><span>' + esc(t) + '</span></button>';
        }).join('') + '</div>';
      if (picked != null) {
        const ok = picked === cur.c;
        html += '<div class="qz-fb ' + (ok ? 'ok' : 'no') + '"><b>' + (ok ? 'Верно.' : 'Неверно.') + '</b> ' + esc(cur.e) +
          (cur.r && BY_ID[cur.r] ? ' <a href="#/' + cur.r + '">Разобрать: ' + esc(BY_ID[cur.r].t) + '</a>' : '') + '</div>' +
          '<div class="wz-actions"><button class="btn primary" id="qzNext">' + (QZ.i + 1 < QZ.list.length ? 'Дальше' : 'Показать результат') + '</button></div>';
      }
      html += '</section></div>';
      return html;
    }

    const score = quizScore();
    const pct = Math.round((score / QZ.list.length) * 100);
    html += '<section class="card"><h3 class="card-h">' + svg('svc', 15) + 'Результат</h3>' +
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
    html += '<div class="wz-actions"><button class="btn primary" id="qzRestart">Ещё раз</button>' +
      '<button class="btn" id="qzShare">Поделиться результатом</button></div></div>';
    return html;
  }

  function bindQuiz() {
    document.querySelectorAll('[data-qn]').forEach(function (b) {
      b.addEventListener('click', function () {
        quizStart(parseInt(b.getAttribute('data-qn'), 10) || 10);
        route();
      });
    });
    const legacy = document.getElementById('qzStart');
    if (legacy) legacy.addEventListener('click', function () { quizStart(10); route(); });
    const modes = document.getElementById('qzModes');
    if (modes) modes.addEventListener('click', function () { QZ = null; route(); });
    const st = document.getElementById('qzStart');
    if (st) st.addEventListener('click', function () { quizStart(); rerender(); });
    const rs = document.getElementById('qzRestart');
    if (rs) rs.addEventListener('click', function () { quizStart(); rerender(); });
    document.querySelectorAll('.qz-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        if (QZ.picked != null) return;
        const i = parseInt(b.getAttribute('data-qi'), 10);
        QZ.picked = i;
        QZ.ans[QZ.i] = { pick: i, c: QZ.list[QZ.i].c };
        rerender();
      });
    });
    const nx = document.getElementById('qzNext');
    if (nx) nx.addEventListener('click', function () {
      QZ.picked = null;
      if (QZ.i + 1 >= QZ.list.length) QZ.done = true;
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

  function route() {
    stopTick();
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
      tools: 'Инструменты', wizard: 'Мастер конфигурации', subnet: 'Калькулятор подсетей',
      vlsm: 'VLSM-планировщик', diff: 'Сравнить конфиги', quiz: 'Самопроверка',
      backup: 'Данные и резервная копия'
    };
    if (TOOL_TITLES[id]) {
      const VIEWS = { tools: toolsView, wizard: wizardView, subnet: subnetView, vlsm: vlsmView, diff: diffView, quiz: quizView, backup: backupView };
      content.innerHTML = VIEWS[id]();
      content.scrollTop = 0;
      markActive(null);
      const BINDS = { wizard: bindWizard, subnet: bindSubnet, vlsm: bindVlsm, diff: bindDiff, quiz: bindQuiz, backup: bindBackup };
      if (BINDS[id]) BINDS[id]();
      document.title = TOOL_TITLES[id] + ' · MikroTik';
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
    store.set('last', JSON.stringify({ id: id, at: Date.now() }));
    syncFavBtn();
    hydrate(a);
    document.title = a.t + ' · MikroTik Winbox 4';
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

  /* ---------------- init ---------------- */
  function init() {
    buildSidebar();

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
    $('#searchLayer').addEventListener('click', function (e) {
      if (e.target.closest('.sr')) {
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

    document.documentElement.setAttribute('data-theme', store.get('theme') || 'dark');
    syncFsUi();

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
