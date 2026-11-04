/* =========================================================================
   pack.js — дополнительный контент (контент-пак) без переустановки APK.
   Пак скачивается с GitHub Releases и хранится в localStorage. Загружается
   ДО app.js, поэтому новые статьи сразу попадают в меню и поиск.
   ========================================================================= */
(function () {
  'use strict';

  const KEY = 'pack';
  const mem = { v: null };

  function readRaw() {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v) return v;
    } catch (e) { }
    return mem.v;
  }

  function writeRaw(text) {
    mem.v = text;
    try { window.localStorage.setItem(KEY, text); } catch (e) { }
  }

  function clearRaw() {
    mem.v = null;
    try { window.localStorage.removeItem(KEY); } catch (e) { }
  }

  function valid(p) {
    if (!p || !Array.isArray(p.groups) || !p.groups.length) return false;
    return p.groups.every(function (g) {
      if (!g || !g.id || !g.name || !Array.isArray(g.items)) return false;
      return g.items.every(function (a) {
        return a && a.id && a.t && a.purpose && Array.isArray(a.steps) && a.steps.length > 0;
      });
    });
  }

  function merge(p) {
    const D = window.DATA || [];
    if (!valid(p)) return 0;
    let added = 0;
    p.groups.forEach(function (g) {
      let target = null;
      for (let i = 0; i < D.length; i++) if (D[i].id === g.id) target = D[i];
      if (target) {
        target.items = g.items;
        target.name = g.name;
      } else {
        D.push({ id: g.id, name: g.name, ic: g.ic || 'book', items: g.items });
      }
      added += g.items.length;
    });
    return added;
  }

  let parsed = null;
  try { parsed = JSON.parse(readRaw() || 'null'); } catch (e) { parsed = null; }
  const loadedCount = parsed ? merge(parsed) : 0;

  window.Pack = {
    loaded: !!loadedCount,
    count: loadedCount,
    version: (parsed && parsed.version) || '',
    title: (parsed && parsed.title) || '',
    validate: valid,
    apply: function (obj) {
      if (!valid(obj)) return -1;
      writeRaw(JSON.stringify(obj));
      const n = obj.groups.reduce(function (acc, g) { return acc + g.items.length; }, 0);
      window.Pack.version = obj.version || '';
      window.Pack.title = obj.title || '';
      window.Pack.count = n;
      window.Pack.loaded = true;
      return n;
    },
    clear: function () {
      clearRaw();
      window.Pack.version = '';
      window.Pack.count = 0;
      window.Pack.loaded = false;
    }
  };
})();
