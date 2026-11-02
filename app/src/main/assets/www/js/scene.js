/* =========================================================================
   scene.js — рендерер «скриншотов Winbox 4» (векторные макеты окон RouterOS
   с подсветкой элементов и стрелками-указателями).

   Спецификация сцены:
   {
     path: 'IP → Firewall → Filter Rules',   // путь в меню Winbox
     win:  'Firewall',                        // заголовок окна
     tabs: ['Filter Rules','NAT',...], tab: 'Filter Rules',
     cols: [{t:'#',w:34},'Chain','Action'],
     rows: [[ '#', 'input', {v:'accept', m:1} ], ...],
     sel: 1,                                  // выделенная строка
     form: { title:'New Filter Rule', tabs:[...], tab:'General',
             fields:[{l:'Chain', v:'forward', m:2, type:'select'}],
             buttons:['OK','Cancel'] },
     notes: ['Нажмите +','Выберите chain'],
     status: '3 items'
   }
   либо терминал: { term:true, win:'New Terminal', lines:[...] }
   ========================================================================= */
(function () {
  'use strict';

  const MENU = [
    { g: 'Interface', items: ['Interface', 'Ethernet', 'VLAN', 'Bonding', 'Bridge', 'WireGuard'] },
    { g: 'Bridge', items: ['Bridge', 'Ports', 'VLANs', 'Hosts', 'Filters', 'MSTP'] },
    { g: 'PPP', items: ['Secrets', 'Profiles', 'PPPoE Server', 'L2TP Server', 'Active Connections'] },
    { g: 'Switch', items: ['Switch', 'Ports', 'VLANs', 'Rules'] },
    { g: 'IP', items: ['Address', 'ARP', 'Cloud', 'DHCP Client', 'DHCP Server', 'DNS', 'Firewall', 'Hotspot',
      'IPsec', 'Kid Control', 'Neighbor Discovery', 'Pool', 'Routes', 'Services', 'Settings', 'SNTP Client',
      'SMB', 'UPnP', 'VRF', 'Web Proxy'] },
    { g: 'IPv6', items: ['Address', 'DHCP Client', 'DHCP Server', 'ND', 'Firewall', 'Routes'] },
    { g: 'MPLS', items: ['MPLS', 'Forwarding', 'LDP', 'Traffic Eng'] },
    { g: 'Routing', items: ['Table', 'Rules', 'Nexthops', 'Filters', 'BGP', 'OSPF', 'RIP', 'Prefix Lists', 'BFD'] },
    { g: 'Queues', items: ['Simple Queues', 'Queue Tree', 'Queue Types', 'Interface Queues'] },
    { g: 'System', items: ['Identity', 'Clock', 'NTP Client', 'Users', 'Certificates', 'Files', 'Logging',
      'Packages', 'RouterBOOT', 'Scheduler', 'Scripts', 'Backup', 'Reset Configuration', 'Resources',
      'Health', 'Watchdog', 'Auto Upgrade', 'Note'] },
    { g: 'Tools', items: ['Ping', 'Traceroute', 'Torch', 'Profiler', 'Sniffer', 'Netwatch', 'Graphing',
      'Bandwidth Test', 'Traffic Generator', 'Email', 'Wake on LAN', 'RoMON', 'Fetch', 'Speed Test'] },
    { g: 'WiFi', items: ['WiFi', 'Security', 'Access List', 'Registration', 'CAPsMAN', 'Provisioning'] },
    { g: 'Certificates', items: ['Certificates'] }
  ];

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- боковое меню Winbox (мини-копия) ---------- */
  function sidebar(path) {
    const parts = String(path || '').split('→').map(s => s.trim());
    const g0 = parts[0] || '';
    const i0 = parts[1] || '';
    const box = el('div', 'wb-side');
    box.appendChild(el('div', 'sb-search', 'Поиск…'));
    MENU.forEach(function (grp) {
      const hl = grp.g.toLowerCase() === g0.toLowerCase();
      const multi = /IPv6|^I/i.test(grp.g);
      box.appendChild(el('div', 'sb-grp' + (hl ? ' hl' : ''),
        '<span class="sb-ico"></span><span>' + esc(grp.g) + '</span>' +
        (multi || hl ? '<span class="car">▸</span>' : '')));
      if (hl) {
        const show = grp.items.length <= 6 ? grp.items : [i0].filter(Boolean);
        show.forEach(function (it) {
          const on = it.toLowerCase() === i0.toLowerCase() || grp.items.length <= 6;
          box.appendChild(el('div', 'sb-sub' + (on ? ' hl' : ''), esc(it)));
        });
      }
    });
    return box;
  }

  /* ---------- таблица ---------- */
  function table(spec) {
    const wrap = el('div', 'wb-table');
    const cols = (spec.cols || []).map(function (c) {
      return typeof c === 'string' ? { t: c, w: 0 } : { t: c.t, w: c.w || 0 };
    });
    const head = el('div', 'wb-tr wb-th');
    cols.forEach(function (c, i) {
      const d = el('div', null, esc(c.t));
      d.style.flex = c.w ? '0 0 ' + c.w + 'px' : '1 1 0';
      d.style.minWidth = c.w ? c.w + 'px' : '48px';
      d.id = 'th-' + i;
      head.appendChild(d);
    });
    wrap.appendChild(head);

    (spec.rows || []).forEach(function (row, r) {
      const tr = el('div', 'wb-tr' + (spec.sel === r ? ' sel' : ''));
      tr.id = 'row-' + r;
      cols.forEach(function (c, i) {
        const cell = row[i] == null ? '' : row[i];
        const o = (typeof cell === 'object') ? cell : { v: cell };
        const d = el('div', null);
        d.style.flex = c.w ? '0 0 ' + c.w + 'px' : '1 1 0';
        d.style.minWidth = c.w ? c.w + 'px' : '48px';
        d.innerHTML = '<div class="' + (o.c || '') + '">' + esc(o.v) + '</div>';
        d.id = 'cell-' + r + '-' + i;
        if (o.m) d.setAttribute('data-m', o.m);
        if (o.m) d.classList.add('wb-target');
        tr.appendChild(d);
      });
      wrap.appendChild(tr);
    });
    return wrap;
  }

  /* ---------- форма ---------- */
  function form(spec) {
    const f = spec.form || {};
    const box = el('div', 'wb-form');
    const head = el('div', 'wb-form-h');
    head.innerHTML = '<span style="opacity:.5">✥</span>' + esc(f.title || 'New');
    if (f.tabs) {
      head.innerHTML += '<span style="margin-left:auto;font-size:10px;color:#8b9bad">' +
        esc(f.tabs.slice(0, 3).join(' · ')) + '</span>';
    }
    box.appendChild(head);
    const body = el('div', 'wb-form-body');
    (f.fields || []).forEach(function (fd, i) {
      const row = el('div', 'wb-f');
      const lab = el('label', null, esc(fd.l));
      row.appendChild(lab);
      if (fd.type === 'check') {
        const c = el('div', 'chk' + (fd.v ? ' on' : ''));
        c.id = 'f-' + i;
        if (fd.m) { c.setAttribute('data-m', fd.m); c.classList.add('wb-target'); }
        row.appendChild(c);
      } else {
        const c = el('div', 'ctl' + (fd.type === 'select' ? ' sel' : '') + (fd.ro ? ' ro' : ''),
          esc(fd.v == null ? '' : fd.v));
        c.id = 'f-' + i;
        if (fd.m) { c.setAttribute('data-m', fd.m); c.classList.add('wb-target'); }
        row.appendChild(c);
      }
      body.appendChild(row);
    });
    if (f.note) body.appendChild(el('div', 'wb-f', '<label></label><div style="color:#8494a8;font-size:10px">' + esc(f.note) + '</div>'));
    box.appendChild(body);
    if (f.buttons !== false) {
      const foot = el('div', 'wb-form-foot');
      (f.buttons || ['OK', 'Cancel', 'Apply']).forEach(function (b, i) {
        const btn = el('button', 'wb-btn' + (i === 0 ? ' pri' : ''), esc(b));
        btn.id = 'btn-' + b.toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
        foot.appendChild(btn);
      });
      box.appendChild(foot);
    }
    return box;
  }

  /* ---------- терминал ---------- */
  function terminal(spec) {
    const t = el('div', 'wb-term');
    const h = el('div', 'wb-term-h');
    h.innerHTML = '<span class="dots"><i></i><i></i><i></i></span><span>' +
      esc(spec.win || 'New Terminal') + '</span><span style="margin-left:auto">' + esc(spec.path || '') +
      '</span><button class="copy">копировать</button>';
    t.appendChild(h);
    const pre = document.createElement('pre');
    const html = (spec.lines || []).map(function (ln) {
      if (typeof ln === 'object') {
        return '<span class="' + (ln.k || 'out') + '">' + esc(ln.t) + '</span>';
      }
      const s = String(ln);
      if (/^[>/]|\/ip |\/interface |\/system |\/tool |\/queue |\/routing |\/ppp |\/bridge /.test(s)) {
        return '<span class="pr">[admin@MikroTik] &gt; </span><span class="cm">' + esc(s) + '</span>';
      }
      return '<span class="out">' + esc(s) + '</span>';
    }).join('\n');
    pre.innerHTML = html;
    t.appendChild(pre);
    return t;
  }

  /* ---------- аннотации ---------- */
  function annotate(root, notes) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'wb-annot');
    const W = root.offsetWidth, H = root.offsetHeight;
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const rootBox = root.getBoundingClientRect();

    const marks = root.querySelectorAll('[data-m]');
    const targets = {};
    marks.forEach(function (m) {
      const n = m.getAttribute('data-m');
      if (!targets[n]) targets[n] = m;
    });

    notes.forEach(function (text, idx) {
      const n = idx + 1;
      const t = targets[n];
      if (!t) return;
      const r = t.getBoundingClientRect();
      const tx = r.left - rootBox.left + r.width / 2;
      const ty = r.top - rootBox.top + r.height / 2;

      // выбираем сторону с максимумом свободного места
      const space = { left: tx, right: W - tx, top: ty, bottom: H - ty };
      let dir = 'left';
      Object.keys(space).forEach(function (k) { if (space[k] > space[dir]) dir = k; });
      let bx = tx, by = ty;
      if (dir === 'left') bx = Math.max(16, tx - Math.min(140, r.width / 2 + 60));
      if (dir === 'right') bx = Math.min(W - 16, tx + Math.min(140, r.width / 2 + 60));
      if (dir === 'top') by = Math.max(16, ty - Math.min(110, r.height / 2 + 46));
      if (dir === 'bottom') by = Math.min(H - 16, ty + Math.min(110, r.height / 2 + 46));

      const mx = (bx + tx) / 2, my = (by + ty) / 2;
      const off = 26;
      const cx = dir === 'left' || dir === 'right' ? mx : bx + (dir === 'top' ? off : -off) * 0.35;
      const cy = dir === 'top' || dir === 'bottom' ? my : by + (dir === 'left' ? off : -off) * 0.35;

      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', 'M' + bx + ',' + by + ' Q' + cx + ',' + cy + ' ' + tx + ',' + ty);
      svg.appendChild(path);

      // наконечник стрелки
      const ang = Math.atan2(ty - cy, tx - cx);
      const ah = 9;
      const p1 = [tx - ah * Math.cos(ang - 0.45), ty - ah * Math.sin(ang - 0.45)];
      const p2 = [tx - ah * Math.cos(ang + 0.45), ty - ah * Math.sin(ang + 0.45)];
      const head = document.createElementNS(svgNS, 'path');
      head.setAttribute('d', 'M' + tx + ',' + ty + ' L' + p1[0] + ',' + p1[1] + ' L' + p2[0] + ',' + p2[1] + ' Z');
      head.setAttribute('fill', '#e11d48');
      head.setAttribute('stroke', 'none');
      svg.appendChild(head);

      // номер
      const badge = el('div', 'wb-num', String(n));
      badge.style.left = (bx - 10) + 'px';
      badge.style.top = (by - 10) + 'px';
      root.appendChild(badge);
    });
    root.appendChild(svg);
  }

  /* ---------- масштабирование под ширину ---------- */
  function fit(host) {
    const inner = host.querySelector('.scene-scale');
    if (!inner) return;
    const base = inner.querySelector('.wb, .wb-term');
    if (!base) return;
    const avail = host.clientWidth;
    const natural = base.offsetWidth || 1000;
    let k = avail / natural;
    if (k > 1) k = 1;
    if (k < 0.6) k = 0.6;
    inner.style.transform = 'scale(' + k + ')';
    const h = base.offsetHeight || 400;
    host.style.height = Math.ceil(h * k) + 'px';
    const needScroll = (avail / natural) < 0.6;
    host.style.overflowX = needScroll ? 'auto' : 'hidden';
    inner.style.width = natural + 'px';
    const hint = host.parentElement ? host.parentElement.querySelector('.scene-hint') : null;
    if (hint) {
      if (needScroll) hint.classList.add('on');
      else hint.classList.remove('on');
    }
  }

  function render(spec) {
    const block = el('div', 'scene-block');
    if (spec.cap) {
      block.appendChild(el('div', 'scene-cap', '<svg viewBox="0 0 24 24" width="13" height="13"><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3 9h18" stroke="currentColor" stroke-width="1.6"/></svg> <b>' + esc(spec.cap) + '</b>'));
    }
    const host = el('div', 'scene-host');
    const scale = el('div', 'scene-scale');

    const root = el('div', 'wb');
    root.appendChild(sidebar(spec.path));

    const main = el('div', 'wb-main');
    const tb = el('div', 'wb-tb');
    tb.innerHTML = '<span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>' +
      '<span class="tt">' + esc(spec.win || 'Winbox') + '</span>' +
      '<span class="path">' + esc(spec.path || '') + '</span>';
    main.appendChild(tb);

    if (!spec.noTools) {
      const tools = el('div', 'wb-tools');
      const btns = spec.tools || [
        { t: '+', title: 'Add new' }, { t: '−', title: 'Remove' },
        { t: '✓', title: 'Enable' }, { t: '✕', title: 'Disable' },
        { t: '⇅', title: 'Sort' }, { t: '⌕', title: 'Find' }
      ];
      btns.forEach(function (b, i) {
        const btn = el('button', 'wb-btn' + (b.pri ? ' pri' : (i > 1 ? ' ghost' : '')), esc(b.t));
        btn.id = 'tb-' + (b.id || ('b' + i));
        btn.title = b.title || '';
        if (b.m) { btn.setAttribute('data-m', b.m); btn.classList.add('wb-target'); }
        tools.appendChild(btn);
      });
      if (spec.toolsNote) tools.appendChild(el('span', null, '<span style="margin-left:8px;color:#8b9bad;font-size:10.5px">' + esc(spec.toolsNote) + '</span>'));
      main.appendChild(tools);
    }

    if (spec.tabs) {
      const tabs = el('div', 'wb-tabs');
      spec.tabs.forEach(function (t, i) {
        const on = (spec.tab || spec.tabs[0]) === t;
        const d = el('div', 'wb-tab' + (on ? ' on' : ''), esc(t));
        d.id = 'tab-' + i;
        if (spec.tabMark === t) { d.setAttribute('data-m', spec.tabMarkN || 1); d.classList.add('wb-target'); }
        tabs.appendChild(d);
      });
      main.appendChild(tabs);
    }

    const body = el('div', 'wb-body');
    if (spec.cols) body.appendChild(table(spec));
    if (spec.form) body.appendChild(form(spec));
    if (spec.bodyHtml) body.insertAdjacentHTML('beforeend', spec.bodyHtml);
    main.appendChild(body);

    if (spec.status) {
      const st = el('div', 'wb-status');
      st.innerHTML = '<span>' + esc(spec.status) + '</span><span class="sp">' +
        esc(spec.statusRight || '') + '</span>';
      main.appendChild(st);
    }

    root.appendChild(main);
    scale.appendChild(root);
    host.appendChild(scale);
    block.appendChild(host);
    block.appendChild(el('div', 'scene-hint', '⇄ Окно шире экрана — прокрутите вбок или сожмите двумя пальцами'));
    if (spec.notes && spec.notes.length) {
      const ul = el('ul', 'notes');
      spec.notes.forEach(function (t, i) {
        ul.appendChild(el('li', null, '<span class="n">' + (i + 1) + '</span><span>' + t + '</span>'));
      });
      block.appendChild(ul);
    }
    block._fit = function () { fit(host); };
    return block;
  }

  function renderTerminal(spec) {
    const block = el('div', 'scene-block');
    if (spec.cap) {
      block.appendChild(el('div', 'scene-cap',
        '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M4 5l5 5-5 5M11 17h8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg> <b>' + esc(spec.cap) + '</b>'));
    }
    const host = el('div', 'scene-host');
    host.style.background = '#0b1016';
    const scale = el('div', 'scene-scale');
    scale.appendChild(terminal(spec));
    host.appendChild(scale);
    block.appendChild(host);
    block.appendChild(el('div', 'scene-hint', '⇄ Команды можно скопировать кнопкой в правом верхнем углу окна'));
    if (spec.notes && spec.notes.length) {
      const ul = el('ul', 'notes');
      spec.notes.forEach(function (t, i) {
        ul.appendChild(el('li', null, '<span class="n">' + (i + 1) + '</span><span>' + t + '</span>'));
      });
      block.appendChild(ul);
    }
    block._fit = function () { fit(host); };
    return block;
  }

  function mount(container, specs) {
    const blocks = [];
    (specs || []).forEach(function (spec) {
      const b = spec.term ? renderTerminal(spec) : render(spec);
      container.appendChild(b);
      blocks.push(b);
    });
    // аннотации считаем после вставки в DOM (нужна реальная геометрия)
    requestAnimationFrame(function () {
      blocks.forEach(function (b) {
        const root = b.querySelector('.wb');
        if (root && b.querySelectorAll('[data-m]').length) {
          const notes = collectNotes(b);
          if (notes.length) annotate(root, notes);
        }
        if (b._fit) b._fit();
      });
    });
    window.addEventListener('resize', function () {
      blocks.forEach(function (b) { if (b._fit) b._fit(); });
    });
    return blocks;
  }

  function collectNotes(block) {
    // текст заметок берём из списка .notes (он уже отрисован), числа — по порядку
    const items = block.querySelectorAll('.notes li');
    return Array.prototype.map.call(items, function (li) {
      return li.querySelector('span:last-child').textContent;
    });
  }

  window.Scene = { render: render, renderTerminal: renderTerminal, mount: mount, fit: fit };
})();
