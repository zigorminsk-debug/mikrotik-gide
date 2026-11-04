/* =========================================================================
   diff.js — сравнение двух конфигов RouterOS (построчный diff).
   Чистые функции: используются экраном «Сравнить конфиги» и тестами.
   ========================================================================= */
(function () {
  'use strict';

  function prep(text, opts) {
    const o = opts || {};
    let lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    if (o.trim !== false) lines = lines.map(function (l) { return l.replace(/\s+$/, ''); });
    if (o.ignoreComments) lines = lines.filter(function (l) { return !/^\s*#/.test(l) && l.trim() !== ''; });
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  function lcs(a, b, limit) {
    const n = a.length, m = b.length;
    const out = [];
    if (n * m > limit) {
      // слишком большой ввод — грубое сравнение по множествам строк
      const setB = {};
      b.forEach(function (l) { setB[l] = (setB[l] || 0) + 1; });
      a.forEach(function (l) {
        if (setB[l]) { setB[l]--; out.push({ t: ' ', s: l }); }
        else out.push({ t: '-', s: l });
      });
      const setA = {};
      a.forEach(function (l) { setA[l] = (setA[l] || 0) + 1; });
      b.forEach(function (l) {
        if (setA[l]) setA[l]--;
        else out.push({ t: '+', s: l });
      });
      return { lines: out, truncated: true };
    }
    // обрезаем общий префикс и суффикс — обычно экономит почти всё
    let pre = 0;
    while (pre < n && pre < m && a[pre] === b[pre]) pre++;
    let suf = 0;
    while (suf < n - pre && suf < m - pre && a[n - 1 - suf] === b[m - 1 - suf]) suf++;

    const A = a.slice(pre, n - suf);
    const B = b.slice(pre, m - suf);
    const rows = A.length, cols = B.length;

    const dp = [];
    for (let i = 0; i <= rows; i++) dp.push(new Uint32Array(cols + 1));
    for (let i = rows - 1; i >= 0; i--) {
      for (let j = cols - 1; j >= 0; j--) {
        dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    a.slice(0, pre).forEach(function (l) { out.push({ t: ' ', s: l }); });
    let i = 0, j = 0;
    while (i < rows && j < cols) {
      if (A[i] === B[j]) { out.push({ t: ' ', s: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: '-', s: A[i] }); i++; }
      else { out.push({ t: '+', s: B[j] }); j++; }
    }
    while (i < rows) { out.push({ t: '-', s: A[i] }); i++; }
    while (j < cols) { out.push({ t: '+', s: B[j] }); j++; }
    a.slice(n - suf).forEach(function (l) { out.push({ t: ' ', s: l }); });
    return { lines: out, truncated: false };
  }

  function compare(oldText, newText, opts) {
    const a = prep(oldText, opts);
    const b = prep(newText, opts);
    const res = lcs(a, b, 4e6);
    let added = 0, removed = 0, same = 0;
    res.lines.forEach(function (l) {
      if (l.t === '+') added++;
      else if (l.t === '-') removed++;
      else same++;
    });
    return {
      lines: res.lines,
      added: added,
      removed: removed,
      same: same,
      truncated: res.truncated,
      changed: added + removed > 0
    };
  }

  /* краткая сводка без полного диффа — для карточки на главной */
  function summary(oldText, newText) {
    const r = compare(oldText, newText, { ignoreComments: true });
    return { added: r.added, removed: r.removed, changed: r.changed };
  }

  window.TextDiff = { compare: compare, summary: summary, prep: prep };
})();
