/* =========================================================================
   poe.js — расчёт бюджета PoE и подбор блока питания.

   Логика в том, что PoE-бюджет роутера — это не «характеристика модели»,
   а следствие трёх вещей: сколько даёт блок питания, сколько съедает сам
   роутер и сколько теряется в кабеле. Поэтому считаем физику, а не берём
   числа из воздуха: P = U·I, минус собственное потребление, минус потери.

   Стандартные мощности: 802.3af — 15,4 Вт на порт PSE (12,95 Вт у устройства),
   802.3at — 30 Вт PSE (25,5 Вт у устройства). Их и подставляем в пресеты.

   API:
     PoeCalc.CONSUMERS        — пресеты устройств (Вт)
     PoeCalc.models()         — модели с PoE-out и тип PoE
     PoeCalc.calc(input)      — расчёт
     PoeCalc.report(res)      — текстовый отчёт
   ========================================================================= */
(function () {
  'use strict';

  const CONSUMERS = [
    { id: 'cam-af', name: 'Камера IP (802.3af)', w: 12.95, note: 'типовой класс 4' },
    { id: 'cam-12', name: 'Камера IP (экономная, 24 В)', w: 7, note: 'пассивный PoE, 0,3 А при 24 В' },
    { id: 'ap-af', name: 'Точка доступа Wi-Fi (802.3af)', w: 12.95, note: '2×2 MIMO' },
    { id: 'ap-at', name: 'Точка доступа Wi-Fi 6 (802.3at)', w: 25.5, note: '4×4 MIMO, 5 ГГц' },
    { id: 'phone', name: 'IP-телефон', w: 6.5, note: 'класс 2' },
    { id: 'passive', name: 'Пассивная точка 24 В', w: 10, note: 'около 0,42 А при 24 В' },
    { id: 'splitter', name: 'Сплиттер + устройство 5 В', w: 5, note: 'маломощное' }
  ];

  /* тип PoE по модели: пассивный (MikroTik) или стандартный 802.3af/at.
     Порты берём из MODEL_SPECS — они уже сверены со спецификациями. */
  const TYPE = {
    hexpoe: 'passive+af',
    hexs: 'passive',
    hap_ax2: 'passive',
    hap_ax3: 'passive',
    hap_ac3: 'passive',
    cap_ax: 'af',
    wap_ac: 'passive',
    cap_ac: 'passive',
    crs328: 'af+at'
  };

  const TYPE_TEXT = {
    'passive': 'пассивный PoE (MikroTik)',
    'af': 'IEEE 802.3af',
    'at': 'IEEE 802.3at',
    'af+at': 'IEEE 802.3af/at',
    'passive+af': 'пассивный + 802.3af/at (авто)'
  };

  /* предел на порт по стандарту, Вт (на стороне PSE) */
  function portLimit(type) {
    if (type === 'at' || type === 'af+at') return 30;
    if (type === 'af') return 15.4;
    if (type === 'passive') return 18;   // типовой предел пассивного порта MikroTik
    return 15.4;
  }

  function models() {
    const specs = window.MODEL_SPECS || [];
    const out = [];
    specs.forEach(function (m) {
      if (!m.poeOut || m.poeOut === '—') return;
      const type = TYPE[m.id] || '';
      out.push({
        id: m.id,
        name: m.name,
        ports: m.poeOut,
        poeIn: m.poeIn,
        type: type,
        typeText: TYPE_TEXT[type] || 'уточните в спецификации',
        portW: portLimit(type)
      });
    });
    return out;
  }

  function num(v, def) {
    const n = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(n) && n >= 0 ? n : def;
  }

  /* input: {volt, amp, reserve, loss, portW, consumers: [{w, count}]} */
  function calc(input) {
    const i = input || {};
    const volt = num(i.volt, 24) || 24;
    const amp = num(i.amp, 2.5);
    const reserve = num(i.reserve, 6);        // сам роутер и нагрев
    const loss = num(i.loss, 10);             // потери в кабеле, %
    const portW = num(i.portW, 15.4);
    const psu = volt * amp;
    const usable = Math.max(0, psu * (1 - loss / 100) - reserve);

    const consumers = (i.consumers || []).map(function (c) {
      const w = num(c.w, 0);
      const count = Math.max(0, Math.round(num(c.count, 0)));
      return { w: w, count: count, total: w * count, amp: volt ? (w * count) / volt : 0, over: w > portW };
    }).filter(function (c) { return c.count > 0 && c.w > 0; });

    const total = consumers.reduce(function (a, c) { return a + c.total; }, 0);
    const ports = consumers.reduce(function (a, c) { return a + c.count; }, 0);
    const left = usable - total;
    const needAmp = volt ? ((total + reserve) / (1 - loss / 100)) / volt : 0;
    const recAmp = needAmp / 0.8;             // 20 % запаса по току
    const overPort = consumers.some(function (c) { return c.over; });

    let verdict;
    if (!total) verdict = 'Добавьте устройства — посчитаем бюджет.';
    else if (left < 0) verdict = 'Не хватает ' + Math.abs(Math.round(left * 10) / 10) +
      ' Вт: нужен блок питания мощнее или меньше устройств.';
    else if (left < total * 0.2) verdict = 'Впритык: запас ' + (Math.round(left * 10) / 10) +
      ' Вт (меньше 20 %). Лучше взять БП помощнее — при старте камеры берут больше.';
    else verdict = 'Запас ' + (Math.round(left * 10) / 10) + ' Вт — можно подключать.';

    return {
      volt: volt, amp: amp, psu: psu, reserve: reserve, loss: loss, portW: portW,
      usable: usable, consumers: consumers, total: total, ports: ports,
      left: left, needAmp: needAmp, recAmp: recAmp, overPort: overPort,
      ok: total > 0 && left >= 0 && !overPort,
      verdict: verdict
    };
  }

  function fmt(v, d) {
    return (Math.round(v * Math.pow(10, d || 1)) / Math.pow(10, d || 1)).toString();
  }

  function report(res, opts) {
    const o = opts || {};
    const L = [];
    L.push('PoE-бюджет и блок питания' + (o.model ? ' · ' + o.model : ''));
    L.push('Дата: ' + new Date().toLocaleString('ru-RU'));
    L.push('');
    L.push('Блок питания: ' + fmt(res.volt, 0) + ' В × ' + fmt(res.amp, 2) + ' А = ' + fmt(res.psu, 1) + ' Вт');
    L.push('Запас на роутер и нагрев: ' + fmt(res.reserve, 1) + ' Вт');
    L.push('Потери в кабеле: ' + fmt(res.loss, 0) + ' %');
    L.push('Доступно для PoE: ' + fmt(res.usable, 1) + ' Вт');
    L.push('');
    L.push('Устройства:');
    if (!res.consumers.length) L.push('  — не заданы');
    res.consumers.forEach(function (c) {
      L.push('  · ' + fmt(c.w, 2) + ' Вт × ' + c.count + ' = ' + fmt(c.total, 1) + ' Вт' +
        ' (≈ ' + fmt(c.amp * 1000, 0) + ' мА при ' + fmt(res.volt, 0) + ' В)' +
        (c.over ? ' — ВЫШЕ предела порта ' + fmt(res.portW, 1) + ' Вт' : ''));
    });
    L.push('');
    L.push('Итого: ' + fmt(res.total, 1) + ' Вт, портов: ' + res.ports);
    L.push('Запас: ' + fmt(res.left, 1) + ' Вт');
    L.push('Вывод: ' + res.verdict);
    L.push('Нужный ток БП (без запаса): ' + fmt(res.needAmp, 2) + ' А, с запасом 20 %: ' + fmt(res.recAmp, 2) + ' А');
    if (res.overPort) L.push('Внимание: одно устройство потребляет больше, чем даёт порт — проверьте класс PoE.');
    return L.join('\n');
  }

  window.PoeCalc = {
    CONSUMERS: CONSUMERS,
    models: models,
    calc: calc,
    report: report,
    portLimit: portLimit
  };
})();
