/* =========================================================================
   calc.js — калькулятор подсетей IPv4 и VLSM
   Чистые функции без DOM: используются экраном «Калькулятор» и тестами.
   ========================================================================= */
(function () {
  'use strict';

  function ipToInt(s) {
    const t = String(s == null ? '' : s).trim();
    const m = t.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const p = [+m[1], +m[2], +m[3], +m[4]];
    for (let i = 0; i < 4; i++) if (p[i] > 255) return null;
    return (((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]) >>> 0;
  }

  function intToIp(n) {
    const v = n >>> 0;
    return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join('.');
  }

  function maskInt(prefix) {
    const p = +prefix;
    if (!(p >= 0 && p <= 32)) return null;
    if (p === 0) return 0;
    return (0xFFFFFFFF << (32 - p)) >>> 0;
  }

  function prefixOfMask(mask) {
    const m = ipToInt(mask);
    if (m == null) return null;
    let p = 0, v = m;
    for (let i = 0; i < 32; i++) {
      if ((v & 0x80000000) >>> 0) p++;
      else if (v !== 0) return null;   // маска с «дырками»
      v = (v << 1) >>> 0;
    }
    return p;
  }

  function hosts(prefix) {
    if (prefix === 32) return 1;
    if (prefix === 31) return 2;
    return Math.pow(2, 32 - prefix) - 2;
  }

  function info(ipInt, prefix) {
    const p = +prefix;
    if (ipInt == null || !(p >= 0 && p <= 32)) return null;
    const m = maskInt(p);
    const network = (ipInt & m) >>> 0;
    const broadcast = (network | (~m >>> 0)) >>> 0;
    const first = p >= 31 ? network : (network + 1) >>> 0;
    const last = p >= 31 ? broadcast : (broadcast - 1) >>> 0;
    return {
      prefix: p,
      mask: intToIp(m),
      wildcard: intToIp((~m) >>> 0),
      network: intToIp(network),
      broadcast: intToIp(broadcast),
      first: intToIp(first),
      last: intToIp(last),
      hosts: hosts(p),
      cidr: intToIp(network) + '/' + p,
      ipInt: ipInt >>> 0,
      networkInt: network
    };
  }

  /* «192.168.10.0/242» или «192.168.10.5 24» или «192.168.10.5/255.255.255.0» */
  function parse(str) {
    const t = String(str == null ? '' : str).trim().replace(/\s+/g, ' ');
    let ipPart = t, prefixPart = null;
    if (t.indexOf('/') >= 0) {
      const a = t.split('/');
      ipPart = a[0];
      prefixPart = a[1];
    } else if (t.indexOf(' ') >= 0) {
      const a = t.split(' ');
      ipPart = a[0];
      prefixPart = a[1];
    }
    const ip = ipToInt(ipPart);
    if (ip == null) return null;
    let prefix = 24;
    if (prefixPart != null && prefixPart !== '') {
      const p = prefixPart.indexOf('.') >= 0 ? prefixOfMask(prefixPart) : +prefixPart;
      if (!(p >= 0 && p <= 32)) return null;
      prefix = p;
    }
    return { ip: ip, prefix: prefix, ipStr: intToIp(ip) };
  }

  /* делим сеть на подсети указанной длины */
  function split(networkInt, prefix, newPrefix, limit) {
    const np = +newPrefix, p = +prefix, lim = limit || 64;
    if (!(np >= p && np <= 32)) return [];
    const count = Math.pow(2, np - p);
    const step = Math.pow(2, 32 - np);
    const out = [];
    for (let i = 0; i < Math.min(count, lim); i++) {
      const start = (networkInt + i * step) >>> 0;
      const inf = info(start, np);
      out.push(inf);
    }
    return out;
  }

  /* сколько адресов нужно под N хостов: ближайший префикс */
  function prefixForHosts(n) {
    const need = Math.max(1, Math.floor(n));
    for (let p = 32; p >= 0; p--) {
      if (hosts(p) >= need) return p;
    }
    return 0;
  }

  /* для плана считаем классические доступные хосты (2^N - 2) */
  function prefixForHostsPlan(n) {
    const need = Math.max(1, Math.floor(n));
    for (let p = 30; p >= 0; p--) {
      if (Math.pow(2, 32 - p) - 2 >= need) return p;
    }
    return 0;
  }

  /* VLSM: распределяем подсети по размеру (большие — первыми) */
  function plan(baseCidr, rows) {
    const base = parse(baseCidr);
    if (!base) return { ok: false, error: 'Не разобрал базовую сеть', entries: [], leftover: null };
    const baseInf = info(base.ip, base.prefix);
    const baseStart = baseInf.networkInt;
    const baseEnd = baseStart + Math.pow(2, 32 - base.prefix) - 1;
    const list = (rows || []).map(function (r, i) {
      return { name: String(r.name || ('подсеть ' + (i + 1))), hosts: Math.max(1, parseInt(r.hosts, 10) || 0) };
    }).sort(function (a, b) { return b.hosts - a.hosts; });

    const entries = [];
    let cur = baseStart;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const p = prefixForHostsPlan(r.hosts);
      if (p < base.prefix) {
        return {
          ok: false,
          error: '«' + r.name + '» требует ' + r.hosts + ' хостов — это больше, чем вся сеть ' + baseInf.cidr,
          entries: entries,
          leftover: null
        };
      }
      const size = Math.pow(2, 32 - p);
      const aligned = Math.ceil(cur / size) * size;
      if (aligned + size - 1 > baseEnd) {
        return {
          ok: false,
          error: 'Не хватает адресов: «' + r.name + '» (' + r.hosts + ' хостов) не помещается в ' + baseInf.cidr,
          entries: entries,
          leftover: null
        };
      }
      const inf = info(aligned, p);
      entries.push({
        name: r.name, hosts: r.hosts, cidr: inf.cidr, mask: inf.mask,
        first: inf.first, last: inf.last, broadcast: inf.broadcast,
        capacity: inf.hosts, waste: inf.hosts - r.hosts
      });
      cur = aligned + size;
    }
    let leftover = null;
    if (cur <= baseEnd) {
      const rest = baseEnd - cur + 1;
      let lp = 32;
      for (let p = 0; p <= 32; p++) {
        const size = Math.pow(2, 32 - p);
        if (size <= rest && cur % size === 0) { lp = p; break; }
      }
      leftover = { cidr: intToIp(cur) + '/' + lp, size: rest, start: intToIp(cur) };
    }
    return { ok: true, base: baseInf.cidr, entries: entries, leftover: leftover };
  }

  window.NetCalc = {
    plan: plan,
    ipToInt: ipToInt,
    intToIp: intToIp,
    maskInt: maskInt,
    prefixOfMask: prefixOfMask,
    hosts: hosts,
    info: info,
    parse: parse,
    split: split,
    prefixForHosts: prefixForHosts
  };
})();
