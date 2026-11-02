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
    { g: 'WireGuard', items: ['WireGuard', 'Peers'] },
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
      d.style.flex = c.w ? '1 1 ' + c.w + 'px' : '1 1 0';
      d.style.minWidth = c.w ? c.w + 'px' : '48px';
      d.id = 'th-' + i;
      head.appendChild(d);
    });
    wrap.appendChild(head);

    (spec.rows || []).forEach(function (row, r) {
      const tr = el('div', 'wb-tr wb-td' + (spec.sel === r ? ' sel' : ''));
      tr.id = 'row-' + r;
      cols.forEach(function (c, i) {
        const cell = row[i] == null ? '' : row[i];
        const o = (typeof cell === 'object') ? cell : { v: cell };
        const d = el('div', null);
        d.style.flex = c.w ? '1 1 ' + c.w + 'px' : '1 1 0';
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

  /* ---------- аннотации ----------
     Правило: номер-бейдж ставится на сам элемент (в его правый верхний угол),
     чтобы стрелка не тянулась через всю таблицу и не перечёркивала текст.
     Стрелка рисуется только для мелких элементов (кнопки, вкладки, чекбоксы):
     бейдж выносится над ними, стрелка бьёт в центр.                    */
  function annotate(root, notes) {
    const svgNS = 'http://www.w3.org/2000/svg';

    Array.prototype.forEach.call(root.querySelectorAll('.wb-annot, .wb-num'), function (n) {
      n.parentNode.removeChild(n);
    });

    const W = root.offsetWidth || 1000;
    const H = root.offsetHeight || 400;
    const rb = root.getBoundingClientRect();
    // если макет уже отмасштабирован transform'ом — переводим px в «натуральные»
    const sc = (W && rb.width ? rb.width / W : 1) || 1;

    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'wb-annot');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    const targets = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-m]'), function (m) {
      const n = m.getAttribute('data-m');
      if (!targets[n]) targets[n] = m;
    });

    const R = 9;          // радиус бейджа
    const taken = [];     // занятые позиции — чтобы номера не наезжали друг на друга

    notes.forEach(function (text, idx) {
      const n = idx + 1;
      const t = targets[n];
      if (!t) return;

      const r = t.getBoundingClientRect();
      const x = (r.left - rb.left) / sc;
      const y = (r.top - rb.top) / sc;
      const w = r.width / sc;
      const h = r.height / sc;

      // мелкие управляющие элементы (кнопки, чекбоксы) — бейдж выносим наружу со стрелкой;
      // ячейки, поля, вкладки — бейдж внутри самого элемента, у правого края
      const isCtrl = t.classList.contains('wb-btn') || t.classList.contains('chk');
      const small = isCtrl || w < 20 || h < 16;
      let cx, cy;

      if (!small) {
        cx = x + w - R - 2;
        cy = y + h / 2;
      } else {
        // мелкий: бейдж над элементом, стрелка вниз
        cx = x + w / 2;
        cy = y - R - 5;
        if (cy < R + 3) cy = y + h + R + 5;
      }

      cx = Math.min(W - R - 3, Math.max(R + 3, cx));
      cy = Math.min(H - R - 3, Math.max(R + 3, cy));

      if (!small) {
        // крупная цель: бейдж гарантированно внутри своего элемента,
        // чтобы он не мог наехать на текст соседней ячейки
        cx = Math.min(x + w - R - 2, Math.max(x + R + 2, cx));
        cy = Math.min(y + h - R + 2, Math.max(y + R - 2, cy));
      }

      let guard = 0;
      while (guard++ < 10 && taken.some(function (p) {
        return Math.abs(p[0] - cx) < 2 * R - 2 && Math.abs(p[1] - cy) < 2 * R - 2;
      })) {
        cy += 2 * R + 3;
        if (cy > H - R - 3) { cy = R + 3; cx += 2 * R + 3; }
      }
      taken.push([cx, cy]);

      if (small) {
        const tx = x + w / 2;
        const ty = y + h / 2;
        const a = Math.atan2(ty - cy, tx - cx);
        const sx = cx + Math.cos(a) * (R + 1);
        const sy = cy + Math.sin(a) * (R + 1);
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) +
          'L' + tx.toFixed(1) + ',' + ty.toFixed(1));
        svg.appendChild(path);
        const ah = 8;
        const head = document.createElementNS(svgNS, 'path');
        head.setAttribute('d', 'M' + tx.toFixed(1) + ',' + ty.toFixed(1) +
          'L' + (tx - ah * Math.cos(a - 0.42)).toFixed(1) + ',' + (ty - ah * Math.sin(a - 0.42)).toFixed(1) +
          'L' + (tx - ah * Math.cos(a + 0.42)).toFixed(1) + ',' + (ty - ah * Math.sin(a + 0.42)).toFixed(1) + 'Z');
        head.setAttribute('fill', '#e11d48');
        head.setAttribute('stroke', 'none');
        svg.appendChild(head);
      }

      const badge = el('div', 'wb-num', String(n));
      badge.style.left = (cx - R) + 'px';
      badge.style.top = (cy - R) + 'px';
      root.appendChild(badge);
    });

    root.insertBefore(svg, root.firstChild);
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
    block.appendChild(el('div', 'scene-hint', '⇄ Окно шире экрана — прокрутите вбок или нажмите «⤢ крупнее»'));
    addZoom(block, host, spec);
    if (spec.notes && spec.notes.length) {
      const ul = el('ul', 'notes');
      spec.notes.forEach(function (t, i) {
        ul.appendChild(el('li', null, '<span class="n">' + (i + 1) + '</span><span>' + t + '</span>'));
      });
      block.appendChild(ul);
    }
    block._host = host;
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
    block.appendChild(el('div', 'scene-hint', '⇄ Тап по окну открывает его крупно; команды копируются кнопкой справа вверху'));
    addZoom(block, host, spec);
    if (spec.notes && spec.notes.length) {
      const ul = el('ul', 'notes');
      spec.notes.forEach(function (t, i) {
        ul.appendChild(el('li', null, '<span class="n">' + (i + 1) + '</span><span>' + t + '</span>'));
      });
      block.appendChild(ul);
    }
    block._host = host;
    block._fit = function () { fit(host); };
    return block;
  }

  /* ---------- полноэкранный просмотр схемы ---------- */
  function addZoom(block, host, spec) {
    const btn = el('button', 'scene-zoom', '⤢ крупнее');
    btn.type = 'button';
    host.appendChild(btn);
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      openZoom(block, spec);
    });
    host.addEventListener('click', function () {
      openZoom(block, spec);
    });
  }

  function openZoom(block, spec) {
    const src = block.querySelector('.scene-host .scene-scale');
    if (!src) return;

    const clone = src.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.margin = '0';

    const layer = el('div', 'zoom-layer');

    const head = el('div', 'zoom-head');
    const title = (spec && (spec.cap || spec.win)) || 'Схема Winbox 4';
    head.innerHTML = '<span class="title">' + esc(title) + '</span>';

    const ctl = el('div', 'zoom-ctl');
    const bMinus = el('button', null, '−');
    const pct = el('span', 'pct', '100%');
    const bPlus = el('button', null, '+');
    const bFit = el('button', null, '⇔');
    bMinus.type = bPlus.type = bFit.type = 'button';
    bMinus.setAttribute('aria-label', 'Уменьшить');
    bPlus.setAttribute('aria-label', 'Увеличить');
    bFit.setAttribute('aria-label', 'Вписать по ширине экрана');
    ctl.appendChild(bMinus); ctl.appendChild(pct); ctl.appendChild(bPlus); ctl.appendChild(bFit);

    const bClose = el('button', 'icon-btn', '✕');
    bClose.type = 'button';
    bClose.setAttribute('aria-label', 'Закрыть');
    head.appendChild(ctl);
    head.appendChild(bClose);

    const stage = el('div', 'zoom-stage');
    const canvas = el('div', 'zoom-canvas');
    const box = el('div', 'zoom-box');
    box.appendChild(clone);
    canvas.appendChild(box);
    stage.appendChild(canvas);

    const tip = el('div', 'zoom-tip',
      'Один палец — прокрутка · щипок двумя пальцами — масштаб · двойной тап — увеличить');

    layer.appendChild(head);
    layer.appendChild(stage);
    layer.appendChild(tip);
    document.body.appendChild(layer);
    document.body.style.overflow = 'hidden';

    const MAXK = 3;
    let natW = Math.round(clone.offsetWidth) || 1000;
    let natH = Math.round(clone.offsetHeight) || 420;
    let k = 1, padL = 0, padT = 0;

    function fitK() {
      const sw = stage.clientWidth || window.innerWidth;
      return Math.min(MAXK, Math.max(0.2, (sw - 8) / natW));
    }

    /* размеры и положение считаем сами — без flex-центрирования,
       чтобы схема гарантированно занимала экран и не уезжала в угол */
    function apply() {
      const sw = stage.clientWidth, sh = stage.clientHeight;
      const w = natW * k, h = natH * k;
      const cw = Math.max(sw, Math.ceil(w));
      const ch = Math.max(sh, Math.ceil(h));
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      padL = Math.max(0, (cw - w) / 2);
      padT = Math.max(0, (ch - h) / 2);
      box.style.width = natW + 'px';
      box.style.height = natH + 'px';
      box.style.transform = 'scale(' + k + ')';
      box.style.left = padL.toFixed(1) + 'px';
      box.style.top = padT.toFixed(1) + 'px';
      pct.textContent = Math.round(k * 100) + '%';
      const f = fitK();
      bMinus.disabled = k <= f + 0.001;
      bPlus.disabled = k >= MAXK - 0.001;
      bFit.classList.toggle('on', Math.abs(k - f) < 0.008);
    }

    /* масштаб вокруг точки (px, py) внутри сцены */
    function zoomAt(kNew, px, py) {
      const nx = (stage.scrollLeft + px - padL) / k;
      const ny = (stage.scrollTop + py - padT) / k;
      k = Math.min(MAXK, Math.max(fitK(), kNew));
      apply();
      stage.scrollLeft = Math.max(0, nx * k + padL - px);
      stage.scrollTop = Math.max(0, ny * k + padT - py);
    }

    function step(d) {
      zoomAt(Math.round((k + d) * 100) / 100, stage.clientWidth / 2, stage.clientHeight / 2);
    }
    bMinus.addEventListener('click', function () { step(-0.15); });
    bPlus.addEventListener('click', function () { step(0.15); });
    bFit.addEventListener('click', function () {
      k = fitK(); apply();
      stage.scrollLeft = 0; stage.scrollTop = 0;
    });

    /* ---------- жесты ---------- */
    let pan = null, pinch = null, lastTap = 0, tapX = 0, tapY = 0;

    function d2(t) {
      const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
      return Math.hypot(dx, dy);
    }
    function mid(t) {
      const r = stage.getBoundingClientRect();
      return {
        x: (t[0].clientX + t[1].clientX) / 2 - r.left,
        y: (t[0].clientY + t[1].clientY) / 2 - r.top
      };
    }

    stage.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinch = { d: d2(e.touches) || 1, k: k };
        pan = null;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        pan = {
          x: e.touches[0].clientX, y: e.touches[0].clientY,
          sl: stage.scrollLeft, st: stage.scrollTop, moved: 0
        };
        const now = Date.now();
        if (now - lastTap < 320 &&
            Math.abs(e.touches[0].clientX - tapX) < 30 &&
            Math.abs(e.touches[0].clientY - tapY) < 30) {
          // двойной тап: вписать ⇄ увеличить вокруг точки нажатия
          const rect = stage.getBoundingClientRect();
          const f = fitK();
          if (k > f + 0.05) {
            k = f; apply();
            stage.scrollLeft = 0; stage.scrollTop = 0;
          } else {
            zoomAt(f * 2, e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
          }
          lastTap = 0;
          return;
        }
        lastTap = now;
        tapX = e.touches[0].clientX;
        tapY = e.touches[0].clientY;
      }
    }, { passive: false });

    stage.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        const d = d2(e.touches);
        const m = mid(e.touches);
        zoomAt(pinch.k * (d / pinch.d), m.x, m.y);
      } else if (e.touches.length === 1 && pan) {
        e.preventDefault();
        const dx = e.touches[0].clientX - pan.x;
        const dy = e.touches[0].clientY - pan.y;
        pan.moved = Math.max(pan.moved, Math.abs(dx) + Math.abs(dy));
        stage.scrollLeft = pan.sl - dx;
        stage.scrollTop = pan.st - dy;
      }
    }, { passive: false });

    stage.addEventListener('touchend', function (e) {
      if (e.touches.length === 0) { pinch = null; pan = null; }
      else if (e.touches.length === 1 && pinch) { pinch = null; }
    });

    /* колесо мыши (для превью в браузере) */
    stage.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(k * (e.deltaY > 0 ? 0.92 : 1.08), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    function close() {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.body.style.overflow = '';
      layer.remove();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    function onResize() {
      const f = fitK();
      if (k < f) k = f;
      apply();
    }
    bClose.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    /* первый расчёт — после того как слой получил размеры */
    function boot() {
      natW = Math.round(clone.offsetWidth) || natW;
      natH = Math.round(clone.offsetHeight) || natH;
      if (stage.clientWidth < 20) { requestAnimationFrame(boot); return; }
      k = fitK();
      apply();
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
    }
    requestAnimationFrame(boot);
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
        if (b._fit) b._fit();            // сначала масштаб, потом геометрия стрелок
        const root = b.querySelector('.wb');
        if (root && b.querySelectorAll('[data-m]').length) {
          const notes = collectNotes(b);
          if (notes.length) {
            b._annotate = function () { annotate(root, notes); };
            b._annotate();
          }
        }
      });
    });

    let rt = null;
    function onResize() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        blocks.forEach(function (b) {
          if (b._fit) b._fit();
          if (b._annotate) b._annotate();
        });
      }, 120);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
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
