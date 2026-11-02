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

  function buildSidebar() {
    const frag = document.createDocumentFragment();
    const title = document.createElement('div');
    title.className = 'side-title';
    title.textContent = 'Меню Winbox 4 и задачи';
    frag.appendChild(title);

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
    foot.innerHTML = '<a href="#/about" style="color:inherit">О программе</a>' +
      '<span>build ' + (window.APP_VERSION || 'dev') + '</span>';
    foot.querySelector('a').addEventListener('click', closeSidebar);
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
        '</span><button class="copy">копировать</button></div><pre>' + esc(text) + '</pre></div></section>';
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

    html += '<a class="list-row" href="#/about"><span class="n">' + svg('info', 13) + '</span>' +
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
      const text = [a.t, a.path, a.purpose, (a.usage || []).join(' '), steps,
        (a.mistakes || []).join(' '), (a.tags || []).join(' ')].join(' ').toLowerCase();
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

  /* ---------------- роутер ---------------- */
  const content = $('#content');

  function route() {
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

  window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
