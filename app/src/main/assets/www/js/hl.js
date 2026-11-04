/* Подсветка синтаксиса RouterOS для блоков конфигурации и диффа. */
(function () {
  'use strict';

  const KW = /^(add|set|print|remove|enable|disable|export|import|find|where|move|get|run|reboot)$/;

  /* токены: строки в кавычках, пути /ip ... , ключи key=, числа/IP, слова */
  const TOKEN = /"(?:[^"\\]|\\.)*"|\/[A-Za-z][\w\-\.\/]*|[A-Za-z][\w\-]*(?==)|\b\d+(?:\.\d+){1,3}(?:\/\d{1,2})?\b|[A-Za-z][\w\-]*/g;

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function line(src) {
    if (/^\s*#/.test(src)) {
      return '<span class="' + (/^#\s*-{3,}/.test(src) ? 'hl-sec' : 'hl-cm') + '">' + esc(src) + '</span>';
    }
    let out = '', last = 0, m;
    let inPath = /^\s*\//.test(src);
    const re = new RegExp(TOKEN.source, 'g');
    while ((m = re.exec(src)) !== null) {
      const t = m[0];
      const gap = src.slice(last, m.index);
      out += esc(gap);
      let c = '';
      if (t.charAt(0) === '"') { c = 'hl-s'; inPath = false; }
      else if (t.charAt(0) === '/') { c = 'hl-cmd'; inPath = true; }
      else if (/^\d/.test(t)) { c = 'hl-num'; inPath = false; }
      else if (KW.test(t)) { c = 'hl-kw'; inPath = false; }
      else if (inPath && /^[a-z][\w\-]*$/.test(t)) { c = 'hl-cmd'; }
      else if (src.charAt(m.index + t.length) === '=') { c = 'hl-k'; inPath = false; }
      else { c = ''; inPath = false; }
      out += c ? '<span class="' + c + '">' + esc(t) + '</span>' : esc(t);
      last = m.index + t.length;
    }
    out += esc(src.slice(last));
    return out;
  }

  function hl(text) {
    return String(text == null ? '' : text).split('\n').map(line).join('\n');
  }

  window.HL = { cfg: hl, line: line };
})();
