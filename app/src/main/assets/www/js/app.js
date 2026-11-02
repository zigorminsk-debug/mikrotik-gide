/* =========================================================================
   app.js — навигация, отрисовка статей, поиск, темы
   ========================================================================= */
(function () {
  'use strict';

  const GROUPS = window.DATA || [];
  const $ = function (s, r) { return (r || document).querySelector(s); };

  /* безопасное хранилище: localStorage может быть недоступен для file:// */
  const store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { } }
  };

  /* ---------------- иконки ---------------- */
  const ICONS = {
    start: '<path d="M5 12l7-7 7 7M7 11v8h10v-8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    iface: '<rect x="3" y="8" width="18" height="8" rx="2" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M7 12h2M11 12h2M15 12h2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
    bridge: '<rect x="3" y="14" width="7" height="6" rx="1.5" stroke="currentColor" stroke-width="1.7" fill="none"/><rect x="14" y="14" width="7" height="6" rx="1.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M6.5 14V6h11v8" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
    ip: '<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M3.5 12h17M12 3.5c2.6 3 2.6 14 0 17M12 3.5c-2.6 3-2.6 14 0 17" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    svc: '<path d="M12 3l7 4v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V7z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    system: '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    task: '<path d="M6 4h9l4 4v12H6z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M9 11h7M9 14.5h7M9 17.5h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 0 4 23" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M4 5.5v13" stroke="currentColor" stroke-width="1.6"/>'
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

  /* ---------------- сайдбар ---------------- */
  const sidebarScroll = $('#sidebarScroll');
  const sidebar = $('#sidebar');

  function buildSidebar() {
    const frag = document.createDocumentFragment();
    const title = document.createElement('div');
    title.className = 'side-title';
    title.textContent = 'Меню Winbox 4 и задачи';
    frag.appendChild(title);

    GROUPS.forEach(function (g) {
      const wrap = document.createElement('div');
      wrap.className = 'grp';
      wrap.dataset.gid = g.id;

      const head = document.createElement('button');
      head.className = 'grp-head';
      head.innerHTML = '<span class="grp-ico">' + svg(g.ic, 15) + '</span><span>' + g.name +
        '</span><span class="chev">' + svg('book', 0) + '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      head.addEventListener('click', function () {
        wrap.classList.toggle('open');
      });
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
    $('#sidebarFoot').innerHTML =
      '<span>Winbox 4 · RouterOS 7</span><span>build ' + (window.APP_VERSION || 'dev') + '</span>';
  }

  function markActive(id) {
    sidebarScroll.querySelectorAll('.item').forEach(function (a) {
      a.classList.toggle('active', a.dataset.id === id);
      if (a.dataset.id === id) {
        const grp = a.closest('.grp');
        if (grp) grp.classList.add('open');
        if (a.scrollIntoView) {
          try { a.scrollIntoView({ block: 'nearest' }); } catch (e) { }
        }
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

  /* ---------------- главная ---------------- */
  function homeView() {
    const total = FLAT.length;
    const tasks = (GROUPS.filter(function (g) { return g.id === 'tasks'; })[0] || { items: [] }).items.length;
    const quick = ['start-first-login', 'start-base-setup', 'ip-firewall-filter', 'ip-firewall-nat',
      'ip-dhcp-server', 'start-backup', 'vpn-wireguard', 'task-lan-internet'];

    let html = '<div class="wrap">';
    html += '<div class="hero">' +
      '<h1>Учебник MikroTik<br>по меню Winbox 4</h1>' +
      '<p>Разбор каждого пункта и подпункта меню: назначение, где применяется, пошаговая настройка ' +
      'с окнами Winbox 4 и стрелками «куда нажимать». Плюс раздел готовых решений для продакшена — ' +
      'от базовой настройки до VLAN, VPN, балансировки и BGP.</p>' +
      '<div class="stats">' +
      '<div class="st"><b>' + total + '</b><span>пунктов</span></div>' +
      '<div class="st"><b>' + GROUPS.length + '</b><span>разделов</span></div>' +
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

    GROUPS.forEach(function (g) {
      html += '<div class="sec-h"><h2>' + esc(g.name) + '</h2><span>' + (g.items || []).length + ' пунктов</span></div>';
      (g.items || []).forEach(function (a, i) {
        html += '<a class="list-row" href="#/' + a.id + '">' +
          '<span class="n">' + (i + 1) + '</span>' +
          '<b>' + esc(a.t) + '</b>' +
          '<span>' + (a.lvl ? LVL[a.lvl] : '') + '</span></a>';
      });
    });

    html += '<div class="card" style="margin-top:18px"><h3 class="card-h">' + svg('book', 15) + 'Про этот учебник</h3>' +
      '<p>Все окна Winbox 4 в учебнике — векторные копии интерфейса RouterOS 7, собранные по реальной ' +
      'структуре меню: те же вкладки, колонки, кнопки и поля. Они масштабируются под экран телефона, ' +
      'поэтому подписи остаются читаемыми. Красная рамка и стрелка с номером показывают, куда нажимать, ' +
      'а список под «скриншотом» — что именно сделать.</p>' +
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
    html += '<h1 class="art-title">' + esc(a.t) + '</h1>';
    if (a.path) html += '<div class="art-path">' + svg('iface', 12) + esc(a.path) + '</div>';

    html += '<div class="badges">';
    if (a.lvl) html += '<span class="badge l' + a.lvl + '">' + LVL[a.lvl] + '</span>';
    html += '<span class="badge v7">RouterOS 7 / Winbox 4</span>';
    (a.tags || []).forEach(function (t) { html += '<span class="badge">' + esc(t) + '</span>'; });
    html += '</div>';

    if (a.purpose) {
      html += card('Назначение', 'book', '<p class="lead">' + inline(a.purpose) + '</p>');
    }
    if (a.usage && a.usage.length) {
      html += card('Где применяется', 'iface', '<ul class="clean">' +
        a.usage.map(function (u) { return '<li>' + inline(u) + '</li>'; }).join('') + '</ul>');
    }
    if (a.warn) html += '<div class="warn"><span class="wi">' + warnIcon() + '</span><div><b>Важно.</b> ' + inline(a.warn) + '</div></div>';
    if (a.danger) html += '<div class="warn danger"><span class="wi">' + warnIcon() + '</span><div><b>Осторожно.</b> ' + inline(a.danger) + '</div></div>';

    if (a.steps && a.steps.length) {
      html += card('Инструкция по настройке', 'task', '<ol class="steps">' +
        a.steps.map(function (s) {
          if (typeof s === 'string') return '<li><div class="step-d">' + inline(s) + '</div></li>';
          return '<li><div class="step-t">' + inline(s.t) + '</div>' +
            (s.d ? '<div class="step-d">' + inline(s.d) + '</div>' : '') + '</li>';
        }).join('') + '</ol>');
    }

    if (a.scenes && a.scenes.length) {
      html += '<section class="card" id="scenesCard"><h3 class="card-h">' + svg('iface', 15) +
        'Winbox 4: куда нажимать</h3><div id="scenesHost"></div></section>';
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
          return '<a class="badge" href="' + esc(l.u) + '" target="_blank" rel="noopener">' + esc(l.t) + ' ↗</a>';
        }).join('') + '</div>');
    }

    html += '<div class="nav-foot">' +
      (prev ? '<a href="#/' + prev.id + '">← Предыдущий<b>' + esc(prev.t) + '</b></a>' : '<a href="#/">← На главную<b>Оглавление</b></a>') +
      (next ? '<a href="#/' + next.id + '" style="text-align:right">Следующий →<b>' + esc(next.t) + '</b></a>' : '<a href="#/tasks" style="text-align:right">Раздел →<b>Задачи PROD</b></a>') +
      '</div>';
    html += '</div>';
    return html;
  }

  function warnIcon() {
    return '<svg viewBox="0 0 24 24" width="17" height="17"><path d="M12 4l8.5 15h-17z" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/><path d="M12 10v4M12 16.6v.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  }

  /* ---------------- рендер после вставки ---------------- */
  function hydrate(a) {
    const scenesHost = $('#scenesHost');
    if (scenesHost && a.scenes) {
      Scene.mount(scenesHost, a.scenes);
    }
    const checkHost = $('#checkHost');
    if (checkHost && a.check) {
      const specs = a.check.map(function (c) {
        return { term: true, win: 'New Terminal', path: c.d || 'RouterOS', lines: String(c.c).split('\n') };
      });
      Scene.mount(checkHost, specs);
    }
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
  let scrollPos = 0;

  function route() {
    const hash = location.hash.replace(/^#\/?/, '');
    const id = hash.split('?')[0];
    if (!id) {
      content.innerHTML = homeView();
      content.scrollTop = 0;
      markActive(null);
      document.title = 'MikroTik · Учебник Winbox 4';
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
    hydrate(a);
    document.title = a.t + ' · MikroTik Winbox 4';
  }

  /* копирование команд */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('.copy');
    if (!btn) return;
    const pre = btn.closest('.term').querySelector('pre');
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

    $('#searchBtn').addEventListener('click', function () {
      const layer = $('#searchLayer');
      layer.hidden = false;
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

    document.documentElement.setAttribute('data-theme', store.get('theme') || 'dark');
    $('#themeBtn').addEventListener('click', function () {
      const cur = document.documentElement.getAttribute('data-theme');
      const nx = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nx);
      store.set('theme', nx);
    });

    window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
