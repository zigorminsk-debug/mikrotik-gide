/* Полноэкранный просмотр настоящих снимков Winbox 4.
   Раньше кадр открывался ссылкой target=_blank: WebView уводил на файл картинки,
   кнопка «Назад» возвращалась не в статью, а в прошлый экран (часто «О программе»),
   и не было ни закрытия, ни нормального масштаба. Здесь свой слой на весь экран:
   крестик, кнопка «Назад», системный жест, щипок/колесо, 1:1 без размытия.
   Зависимостей нет — общий код для Android и Windows. */
(function () {
  'use strict';

  var layer = null, stage = null, canvas = null, box = null, img = null;
  var pct = null, bMinus = null, bPlus = null, bFit = null, bOne = null;
  var natW = 900, natH = 600, k = 1, pushed = false, lastTap = 0, tapX = 0, tapY = 0;
  var pan = null, pinch = null, mouse = null;
  var onMouseMove = null, onMouseUp = null;
  var MAXK = 6;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fitK() {
    var sw = (stage && stage.clientWidth) || window.innerWidth || 360;
    var sh = (stage && stage.clientHeight) || window.innerHeight || 640;
    return Math.max(0.05, Math.min(MAXK, (sw - 16) / natW, (sh - 16) / natH));
  }

  function apply() {
    if (!stage || !box) return;
    var sw = stage.clientWidth, sh = stage.clientHeight;
    var w = Math.max(1, Math.round(natW * k)), h = Math.max(1, Math.round(natH * k));
    var cw = Math.max(sw, w + 16), ch = Math.max(sh, h + 16);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    box.style.left = Math.max(8, Math.round((cw - w) / 2)) + 'px';
    box.style.top = Math.max(8, Math.round((ch - h) / 2)) + 'px';
    if (img) {
      /* Размер меняем в пикселях, а не CSS-трансформом: браузер пересчитывает
         картинку под целевой размер, текст остаётся резче при увеличении. */
      img.style.width = w + 'px';
      img.style.height = h + 'px';
    }
    if (pct) pct.textContent = Math.round(k * 100) + '%';
    var f = fitK();
    if (bMinus) bMinus.disabled = k <= f + 0.001;
    if (bPlus) bPlus.disabled = k >= MAXK - 0.001;
    if (bFit) bFit.classList.toggle('on', Math.abs(k - f) < 0.008);
    if (bOne) bOne.classList.toggle('on', Math.abs(k - 1) < 0.008);
  }

  function zoomAt(kNew, px, py) {
    if (!stage) return;
    var f = fitK();
    var nk = Math.min(MAXK, Math.max(f, kNew));
    var oldLeft = parseFloat(box.style.left) || 0;
    var oldTop = parseFloat(box.style.top) || 0;
    var nx = (stage.scrollLeft + px - oldLeft) / k;
    var ny = (stage.scrollTop + py - oldTop) / k;
    k = nk;
    apply();
    var left = parseFloat(box.style.left) || 0;
    var top = parseFloat(box.style.top) || 0;
    stage.scrollLeft = Math.max(0, nx * k + left - px);
    stage.scrollTop = Math.max(0, ny * k + top - py);
  }

  function step(d) {
    zoomAt(Math.round((k + d) * 100) / 100, stage.clientWidth / 2, stage.clientHeight / 2);
  }

  function fit() {
    k = fitK();
    apply();
    stage.scrollLeft = 0;
    stage.scrollTop = 0;
  }

  function one() {
    zoomAt(1, stage.clientWidth / 2, stage.clientHeight / 2);
  }

  function removeLayer() {
    if (!layer) return;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    window.removeEventListener('popstate', onPop);
    if (onMouseMove) window.removeEventListener('mousemove', onMouseMove);
    if (onMouseUp) window.removeEventListener('mouseup', onMouseUp);
    onMouseMove = onMouseUp = null;
    document.body.style.overflow = '';
    layer.remove();
    layer = stage = canvas = box = img = pct = bMinus = bPlus = bFit = bOne = null;
    pushed = false;
  }

  function close(viaHistory) {
    if (!layer) return;
    if (pushed && viaHistory !== false) {
      /* Сами не удаляем слой до popstate: системная «Назад» и крестик идут
         одним путём и не оставляют лишнюю запись в истории WebView. */
      try { history.back(); return; } catch (e) { /* дальше — обычное закрытие */ }
    }
    removeLayer();
  }

  function onPop() {
    if (layer) removeLayer();
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); step(0.2); }
    else if (e.key === '-') { e.preventDefault(); step(-0.2); }
    else if (e.key === '0') { e.preventDefault(); fit(); }
    else if (e.key === '1') { e.preventDefault(); one(); }
  }

  function onResize() {
    if (!layer) return;
    var f = fitK();
    if (k < f) k = f;
    apply();
  }

  function d2(t) {
    var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  }

  function mid(t) {
    var r = stage.getBoundingClientRect();
    return {
      x: (t[0].clientX + t[1].clientX) / 2 - r.left,
      y: (t[0].clientY + t[1].clientY) / 2 - r.top
    };
  }

  function bindGestures() {
    stage.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        pinch = { d: d2(e.touches) || 1, k: k };
        pan = null;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        pan = { x: e.touches[0].clientX, y: e.touches[0].clientY, sl: stage.scrollLeft, st: stage.scrollTop };
        var now = Date.now();
        if (now - lastTap < 320 && Math.abs(e.touches[0].clientX - tapX) < 30 && Math.abs(e.touches[0].clientY - tapY) < 30) {
          var r = stage.getBoundingClientRect();
          var f = fitK();
          if (k > f + 0.05) fit();
          else zoomAt(Math.max(1, f * 2), e.touches[0].clientX - r.left, e.touches[0].clientY - r.top);
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
        var m = mid(e.touches);
        zoomAt(pinch.k * (d2(e.touches) / pinch.d), m.x, m.y);
      } else if (e.touches.length === 1 && pan) {
        e.preventDefault();
        stage.scrollLeft = pan.sl - (e.touches[0].clientX - pan.x);
        stage.scrollTop = pan.st - (e.touches[0].clientY - pan.y);
      }
    }, { passive: false });

    stage.addEventListener('touchend', function (e) {
      if (e.touches.length === 0) { pinch = null; pan = null; }
      else if (e.touches.length === 1 && pinch) pinch = null;
    });

    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      if (e.ctrlKey || Math.abs(e.deltaY) >= 2) {
        zoomAt(k * (e.deltaY > 0 ? 0.92 : 1.08), e.clientX - r.left, e.clientY - r.top);
      } else {
        stage.scrollLeft += e.deltaX;
        stage.scrollTop += e.deltaY;
      }
    }, { passive: false });

    stage.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      mouse = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop };
      stage.classList.add('grabbing');
      e.preventDefault();
    });
    onMouseMove = function (e) {
      if (!mouse || !stage) return;
      stage.scrollLeft = mouse.sl - (e.clientX - mouse.x);
      stage.scrollTop = mouse.st - (e.clientY - mouse.y);
    };
    onMouseUp = function () {
      mouse = null;
      if (stage) stage.classList.remove('grabbing');
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    stage.addEventListener('dblclick', function (e) {
      var r = stage.getBoundingClientRect();
      var f = fitK();
      if (k > f + 0.05) fit();
      else zoomAt(Math.max(1, f * 2), e.clientX - r.left, e.clientY - r.top);
    });
  }

  function open(src, opts) {
    opts = opts || {};
    if (layer) removeLayer();

    layer = el('div', 'shot-layer');
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-label', opts.title || 'Снимок Winbox 4');

    var head = el('div', 'shot-head');
    var title = el('span', 'title');
    title.innerHTML = esc(opts.title || 'Снимок Winbox 4');
    head.appendChild(title);

    var ctl = el('div', 'zoom-ctl');
    bMinus = el('button', null, '−');
    pct = el('span', 'pct', '100%');
    bPlus = el('button', null, '+');
    bFit = el('button', null, '⇔');
    bOne = el('button', null, '1:1');
    [bMinus, bPlus, bFit, bOne].forEach(function (b) { b.type = 'button'; });
    bMinus.setAttribute('aria-label', 'Уменьшить');
    bPlus.setAttribute('aria-label', 'Увеличить');
    bFit.setAttribute('aria-label', 'Вписать в экран');
    bFit.title = 'Вписать в экран';
    bOne.setAttribute('aria-label', 'Натуральный размер 1:1');
    bOne.title = 'Натуральный размер 1:1';
    ctl.appendChild(bMinus); ctl.appendChild(pct); ctl.appendChild(bPlus); ctl.appendChild(bFit); ctl.appendChild(bOne);
    head.appendChild(ctl);

    var bClose = el('button', 'shot-close');
    bClose.type = 'button';
    bClose.innerHTML = '✕<span class="shot-close-txt"> Закрыть</span>';
    bClose.setAttribute('aria-label', 'Закрыть снимок');
    bClose.title = 'Закрыть';
    head.appendChild(bClose);

    stage = el('div', 'shot-stage');
    canvas = el('div', 'shot-canvas');
    box = el('div', 'shot-box');
    img = el('img', 'shot-img');
    img.alt = opts.title || 'Снимок Winbox 4';
    img.draggable = false;
    img.decoding = 'async';
    box.appendChild(img);
    canvas.appendChild(box);
    stage.appendChild(canvas);

    var tip = el('div', 'shot-tip',
      'Щипок — масштаб · один палец — прокрутка · двойной тап — крупнее · 1:1 — без размытия');
    if (opts.caption) {
      var cap = el('div', 'shot-cap');
      cap.innerHTML = opts.caption;
      tip.appendChild(cap);
    }

    layer.appendChild(head);
    layer.appendChild(stage);
    layer.appendChild(tip);
    document.body.appendChild(layer);
    document.body.style.overflow = 'hidden';

    bClose.addEventListener('click', function () { close(); });
    bMinus.addEventListener('click', function () { step(-0.2); });
    bPlus.addEventListener('click', function () { step(0.2); });
    bFit.addEventListener('click', fit);
    bOne.addEventListener('click', one);
    layer.addEventListener('click', function (e) { if (e.target === layer) close(); });
    bindGestures();
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('popstate', onPop);

    try {
      history.pushState({ shotView: 1 }, '', location.href);
      pushed = true;
    } catch (e) { pushed = false; }

    img.addEventListener('load', function () {
      natW = img.naturalWidth || 900;
      natH = img.naturalHeight || 600;
      fit();
    });
    img.addEventListener('error', function () {
      natW = 900; natH = 600; fit();
    });
    img.src = src;
    if (img.complete && img.naturalWidth) {
      natW = img.naturalWidth;
      natH = img.naturalHeight;
    }
    function boot() {
      if (!layer) return;
      fit();
      bClose.focus();
    }
    requestAnimationFrame(boot);
  }

  function isOpen() { return !!layer; }

  window.ShotView = { open: open, close: close, isOpen: isOpen };
})();
