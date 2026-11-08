/*
 * win4-step-rules.js — единое правило «снимок под шагом».
 *
 * Нельзя подставлять «похожее окно того же раздела»: данные на снимке
 * обязаны совпадать с данными шага. Если снимок пустой/чужой, шаг должен
 * показывать схему с нужными значениями, а не вводить в заблуждение фотографией.
 */

function normPath(p) {
  return String(p || '').split('·')[0]
    .replace(/\s*→\s*/g, ' → ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Явные алиасы одного и того же окна. Префикс родителя НЕ считается совпадением. */
const ALIASES = {
  'IP → Addresses': 'IP → Address',
  'Interfaces → Interface': 'Interfaces',
  'Interfaces → WireGuard': 'WireGuard',
  'Interfaces → WireGuard → Peers': 'WireGuard → Peers',
  'Interfaces → WireGuard → Peers → New': 'WireGuard → Peers → New',
  'WiFi → WiFi': 'WiFi',
  'PPP → Interfaces': 'PPP',
  'PPP → PPPoE Servers': 'PPP → PPPoE Server',
  'PPP → L2TP Secrets': 'PPP → L2TP Server',
  'PPP → OVPN Servers': 'PPP → OVPN Server',
  'IP → Firewall': 'Firewall',
  'IP → Firewall → Filter Rules': 'Firewall → Filter Rules',
  'IP → Firewall → NAT': 'Firewall → NAT',
  'IP → Firewall → Mangle': 'Firewall → Mangle',
  'IP → Firewall → Raw': 'Firewall → Raw',
  'IP → Firewall → Address Lists': 'Firewall → Address Lists',
  'IP → Firewall → Connections': 'Firewall → Connections',
  'IP → Firewall → Service Ports': 'Firewall → Service Ports'
};

function canonicalPath(p) {
  const n = normPath(p);
  return ALIASES[n] || n;
}

/* Кнопки/вкладки — не «данные инструкции». */
const UI_WORDS = new Set([
  'ok', 'apply', 'cancel', 'new', '+', 'close', 'save', 'activate',
  'show client config', 'add tunnel', 'scan from qr code', 'general',
  'advanced', 'action', 'comment', 'peers', 'wireguard', 'ip', 'address',
  'routes', 'dhcp', 'dns', 'services', 'files', 'log', 'terminal',
  'quick set', 'interfaces', 'bridge', 'ppp', 'queues', 'system', 'tools',
  'wifi', 'security', 'access list', 'registration', 'sniffer', 'wps',
  'vlan', 'vlans', 'ports', 'hosts', 'filters', 'nat', 'mangle', 'raw',
  'filter rules', 'address lists', 'connections', 'service ports', 'leases',
  'networks', 'options', 'static', 'pool', 'arp', 'cloud', 'dhcp client',
  'dhcp relay', 'dhcp server', 'hotspot', 'ipsec', 'kid control',
  'neighbors', 'smb', 'snmp', 'settings', 'tftp', 'upnp', 'vrf',
  'web proxy', 'sntp client', 'identity', 'users', 'certificates',
  'logging', 'packages', 'routerboot', 'scheduler', 'scripts', 'resources',
  'health', 'license', 'history', 'note', 'watchdog', 'auto upgrade',
  'reset configuration', 'ping', 'traceroute', 'torch', 'netwatch',
  'profiler', 'graphing', 'fetch', 'ip scan', 'bandwidth test',
  'wake on lan', 'romon', 'sms', 'traffic monitor', 'traffic generator',
  'mpls', 'ldp', 'forwarding', 'l2vpn', 'tables', 'rules', 'nexthops',
  'ospf', 'bgp', 'rip', 'prefix lists', 'bfd', 'igmp proxy', 'radius',
  'dot1x', 'make supout.rif', 'safe mode'
]);

function requiredTokens(step, scene) {
  const out = new Set();
  const add = (v) => {
    const s = String(v == null ? '' : v).trim();
    if (!s) return;
    const low = s.toLowerCase();
    if (UI_WORDS.has(low)) return;
    if (s.indexOf('→') >= 0) return;              /* путь меню, не значение поля */
    if (/^[\d.,]+$/.test(s) && s.length < 3) return; /* мелкий счётчик/индекс */
    out.add(s);
  };
  const text = String((step && step.d) || '');
  for (const m of text.matchAll(/`([^`]+)`/g)) add(m[1]);
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (Object.prototype.hasOwnProperty.call(o, 'v')) add(o.v);
    for (const k in o) if (k !== 'v') walk(o[k]);
  };
  if (scene) { walk(scene.rows); walk(scene.form); walk(scene.lines); }
  return [...out];
}

/*
 * shot: { f, p, values?: string[], quarantined?: boolean }
 * Возвращает { ok, reason, missing }.
 */
function checkStepShot(step, scene, shot) {
  if (!shot) return { ok: false, reason: 'no-shot', missing: [] };
  if (shot.quarantined) return { ok: false, reason: 'quarantined', missing: [] };
  if (step && step.noScene) return { ok: false, reason: 'no-scene-step', missing: [] };
  if (!scene || !scene.path) return { ok: false, reason: 'no-scene-path', missing: [] };
  if (canonicalPath(scene.path) !== canonicalPath(shot.p)) {
    return { ok: false, reason: 'window-mismatch', missing: [] };
  }
  const need = requiredTokens(step, scene);
  const have = new Set((shot.values || []).map((v) => String(v).trim()));
  const missing = need.filter((v) => !have.has(v));
  if (missing.length) return { ok: false, reason: 'data-mismatch', missing };
  return { ok: true, reason: 'verified', missing: [] };
}

module.exports = { normPath, canonicalPath, requiredTokens, checkStepShot };
