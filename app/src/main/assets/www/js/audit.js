/* Аудит конфигурации RouterOS: вставьте /export и получите список проблем.
   Чистый модуль без DOM — используется экраном «Аудит конфига» и тестами. */
(function () {
  'use strict';

  const SEV = { error: 3, warn: 2, info: 1 };
  const POINTS = { error: 14, warn: 6, info: 2 };

  /* фильтр по «живым» строкам: комментарии и пустые не учитываем */
  function liveLines(text) {
    return String(text || '').split(/\r?\n/).filter(function (l) {
      const t = l.trim();
      return t && t.charAt(0) !== '#';
    });
  }

  function find(lines, re) {
    for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) return lines[i];
    return null;
  }

  function has(lines, re) { return !!find(lines, re); }

  function count(lines, re) {
    let n = 0;
    lines.forEach(function (l) { if (re.test(l)) n++; });
    return n;
  }

  const CHECKS = [
    {
      id: 'fw-established',
      level: 'error',
      t: 'В input нет правила accept для established,related',
      why: 'Без этого правила рвутся уже установленные соединения: ответные пакеты к роутеру и обратно не проходят.',
      fix: '/ip firewall filter add chain=input action=accept connection-state=established,related comment="established" place-before=0',
      art: 'ip-firewall-filter',
      test: function (c) {
        return !c.lines.some(function (l) {
          return /chain=input/.test(l) && /connection-state=established,related|connection-state=established/.test(l) && /action=accept/.test(l);
        });
      }
    },
    {
      id: 'fw-input-drop',
      level: 'error',
      t: 'Роутер не закрыт от интернета: в input нет блокировки WAN',
      why: 'Без drop из WAN наружу доступны Winbox, SSH, DNS и API. Это первое, что находят сканеры.',
      fix: '/ip firewall filter add chain=input action=drop in-interface-list=WAN comment="drop wan input"',
      art: 'task-protect-router',
      test: function (c) {
        const drop = c.lines.some(function (l) {
          return /chain=input/.test(l) && /action=(drop|reject)/.test(l) && /in-interface(-list)?=/.test(l);
        });
        return !drop;
      }
    },
    {
      id: 'fw-forward-drop',
      level: 'warn',
      t: 'В forward нет финального drop',
      why: 'Если в forward нет запрета, трафик из гостевой сети и из WAN может уходить куда не нужно.',
      fix: '/ip firewall filter add chain=forward action=drop in-interface-list=WAN comment="drop wan forward"',
      art: 'ip-firewall-filter',
      test: function (c) { return !has(c.lines, /chain=forward.*action=(drop|reject)/); }
    },
    {
      id: 'services-legacy',
      level: 'warn',
      t: 'Небезопасные сервисы управления (telnet, ftp, www, api) не отключены',
      why: 'Telnet и FTP передают пароли открытым текстом, api без TLS — тоже.',
      fix: '/ip service disable telnet,ftp,www,api,api-ssl',
      art: 'ip-services',
      test: function (c) {
        const disabled = has(c.lines, /\/ip service disable/);
        const setWinbox = has(c.lines, /\/ip service set winbox/);
        return !disabled && !setWinbox;
      }
    },
    {
      id: 'services-open',
      level: 'warn',
      t: 'Winbox/SSH не ограничены адресом',
      why: 'Без address= сервис слушает все интерфейсы. Даже с firewall лучше сузить круг.',
      fix: '/ip service set winbox address=192.168.88.0/24,10.10.10.0/24',
      art: 'ip-services',
      test: function (c) { return !has(c.lines, /\/ip service set (winbox|ssh)[^\n]*address=/); }
    },
    {
      id: 'nat-missing',
      level: 'warn',
      t: 'Есть локальные сети, но нет NAT (masquerade)',
      why: 'Без srcnat клиенты с приватными адресами не выйдут в интернет.',
      fix: '/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="internet"',
      art: 'ip-firewall-nat',
      test: function (c) {
        const lan = has(c.lines, /\/ip address add address=(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/);
        const nat = has(c.lines, /chain=srcnat/) && has(c.lines, /masquerade|src-nat/);
        return lan && !nat;
      }
    },
    {
      id: 'dhcp-no-network',
      level: 'error',
      t: 'DHCP-сервер есть, а сети (/ip dhcp-server network) нет',
      why: 'Без записи network клиенты не получат шлюз и DNS, часть устройств просто не возьмёт адрес.',
      fix: '/ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=192.168.88.1',
      art: 'ip-dhcp-server',
      test: function (c) {
        return has(c.lines, /\/ip dhcp-server add|add name=\S+[^\n]*address-pool=/) &&
          !has(c.lines, /\/ip dhcp-server network add/);
      }
    },
    {
      id: 'bridge-vlan',
      level: 'warn',
      t: 'Есть VLAN, но VLAN Filtering на мосту не включён',
      why: 'Пока vlan-filtering=no, теги игнорируются, PVID не применяется — гостевая сеть окажется в общей.',
      fix: '/interface bridge set [find name=bridge] vlan-filtering=yes',
      art: 'if-bridge-vlan',
      test: function (c) {
        const vlan = has(c.lines, /\/interface vlan add|\bpvid=\d+/);
        const on = has(c.lines, /vlan-filtering=yes/);
        return vlan && !on;
      }
    },
    {
      id: 'wifi-weak',
      level: 'error',
      t: 'Wi-Fi с устаревшей защитой (WPA1/WEP) или без пароля',
      why: 'WPA-PSK и WEP взламываются за минуты; открытая сеть отдаёт трафик соседям.',
      fix: '/interface wifi security set [find] authentication-types=wpa2-psk,wpa3-psk',
      art: 'wifi-security',
      test: function (c) {
        return has(c.lines, /authentication-types=[^\n]*(wpa-psk|wep|open)/) &&
          !has(c.lines, /authentication-types=[^\n]*wpa2/);
      }
    },
    {
      id: 'dns-open',
      level: 'warn',
      t: 'DNS открыт для всех запросов без ограничений',
      why: 'allow-remote-requests без правила в firewall превращает роутер в усилитель DNS-атак.',
      fix: '/ip firewall filter add chain=input protocol=udp dst-port=53 in-interface-list=WAN action=drop place-before=0',
      art: 'ip-dns',
      test: function (c) {
        return has(c.lines, /allow-remote-requests=yes/) &&
          !has(c.lines, /dst-port=53/);
      }
    },
    {
      id: 'ipv6-fw',
      level: 'warn',
      t: 'IPv6 настроен, но firewall IPv6 нет',
      why: 'У IPv6 отдельная таблица filter. Правила IPv4 на него не действуют — устройство открыто.',
      fix: '/ipv6 firewall filter add chain=input action=drop in-interface-list=WAN',
      art: 'ipv6-firewall',
      test: function (c) {
        return has(c.lines, /\/ipv6 address add/) && !has(c.lines, /\/ipv6 firewall filter/);
      }
    },
    {
      id: 'identity',
      level: 'info',
      t: 'Не задано имя роутера',
      why: 'С именем по умолчанию (MikroTik) сложно отличить устройства в списке соседей и в мониторинге.',
      fix: '/system identity set name=office-gw',
      art: 'sys-identity',
      test: function (c) { return !has(c.lines, /\/system identity set name=/); }
    },
    {
      id: 'ntp',
      level: 'info',
      t: 'NTP-клиент не настроен',
      why: 'Без точного времени плывут логи, сертификаты и расписания скриптов.',
      fix: '/system ntp client set enabled=yes servers=by.pool.ntp.org',
      art: 'sys-clock',
      test: function (c) { return !has(c.lines, /\/system ntp client/); }
    },
    {
      id: 'backup',
      level: 'info',
      t: 'Нет автоматического бэкапа конфигурации',
      why: 'Единственная копия конфига — на самом роутере. При сбое восстанавливать будет нечего.',
      fix: '/system scheduler add name=daily-backup start-time=03:30:00 interval=1d on-event="/system backup save dont-encrypt=yes"',
      art: 'task-backup-automation',
      test: function (c) { return !has(c.lines, /\/system scheduler add[^\n]*(backup|export)/); }
    },
    {
      id: 'snmp-public',
      level: 'warn',
      t: 'SNMP с community=public',
      why: 'Общеизвестная строка доступа: через неё читают таблицы маршрутов и интерфейсы.',
      fix: '/snmp community set [find name=public] name=mon-<случайная строка> authentication-protocol=SHA1',
      art: 'task-monitoring',
      test: function (c) { return has(c.lines, /community[^\n]*name=public|community=public/); }
    },
    {
      id: 'upnp',
      level: 'warn',
      t: 'Включён UPnP',
      why: 'Любое устройство в сети может само открыть порт наружу — этим пользуются боты и майнеры.',
      fix: '/ip upnp set enabled=no',
      art: 'ip-upnp',
      test: function (c) { return has(c.lines, /\/ip upnp set[^\n]*enabled=yes/); }
    },
    {
      id: 'socks',
      level: 'warn',
      t: 'Включён SOCKS-прокси',
      why: 'Открытый SOCKS — бесплатный прокси для всех желающих; в современных RouterOS он не нужен.',
      fix: '/ip socks set enabled=no',
      art: 'ip-misc',
      test: function (c) { return has(c.lines, /\/ip socks set[^\n]*enabled=yes/); }
    },
    {
      id: 'mac-server',
      level: 'warn',
      t: 'Winbox по MAC разрешён на всех интерфейсах',
      why: 'allowed-interface-list=all позволяет подключаться по MAC из любой сети, включая WAN.',
      fix: '/tool mac-server set allowed-interface-list=LAN',
      art: 'ip-services',
      test: function (c) {
        return has(c.lines, /mac-server[^\n]*allowed-interface-list=all/) &&
          !has(c.lines, /mac-server[^\n]*allowed-interface-list=LAN/);
      }
    },
    {
      id: 'pppoe-profile',
      level: 'warn',
      t: 'PPPoE-сервер без default-profile',
      why: 'Без профиля абоненты не получат адрес, DNS и ограничение скорости.',
      fix: '/interface pppoe-server server set [find] default-profile=pppoe-profile',
      art: 'ppp-pppoe-server',
      test: function (c) {
        return has(c.lines, /\/interface pppoe-server server add/) &&
          !has(c.lines, /pppoe-server server add[^\n]*default-profile=/);
      }
    },
    {
      id: 'wg-peers',
      level: 'info',
      t: 'WireGuard есть, пиров нет',
      why: 'Интерфейс поднят, но подключиться некому: нужен хотя бы один peer с публичным ключом.',
      fix: '/interface wireguard peers add interface=wg0 public-key="<ключ клиента>" allowed-address=10.10.10.2/32',
      art: 'wg-peers',
      test: function (c) {
        return has(c.lines, /\/interface wireguard add/) && !has(c.lines, /wireguard peers add/);
      }
    },
    {
      id: 'wifi-country',
      level: 'info',
      t: 'У Wi-Fi не задан country',
      why: 'Без страны роутер может работать не на тех частотах и с недопустимой мощностью.',
      fix: '/interface wifi set [find] country=Belarus',
      art: 'wifi-interface',
      test: function (c) {
        return has(c.lines, /\/interface wifi/) && !has(c.lines, /country=/);
      }
    },
    {
      id: 'cloud-ddns',
      level: 'info',
      t: 'Включён IP → Cloud (DDNS)',
      why: 'Имя вида xxxx.sn.mynetname.net публично указывает на роутер — держите firewall закрытым.',
      fix: '/ip cloud set ddns-enabled=no',
      art: 'ip-cloud',
      test: function (c) { return has(c.lines, /ddns-enabled=yes/); }
    },
    {
      id: 'log-remote',
      level: 'info',
      t: 'Логи не отправляются на внешний сервер',
      why: 'При перезагрузке или сбросе локальные логи теряются — инцидент не разобрать.',
      fix: '/system logging action add name=remote target=remote remote=192.168.88.10',
      art: 'sys-logging',
      test: function (c) { return !has(c.lines, /target=remote/); }
    }
  ];

  function check(text) {
    const src = String(text || '');
    const lines = liveLines(src);
    const ctx = { text: src.toLowerCase(), lines: lines.map(function (l) { return l.toLowerCase(); }) };
    const findings = [];

    if (ctx.lines.length < 3) {
      return { ok: false, empty: true, score: 0, findings: [], counts: { error: 0, warn: 0, info: 0 } };
    }

    CHECKS.forEach(function (ch) {
      let bad = false;
      try { bad = !!ch.test(ctx); } catch (e) { bad = false; }
      if (bad) {
        findings.push({ id: ch.id, level: ch.level, t: ch.t, why: ch.why, fix: ch.fix, art: ch.art });
      }
    });

    findings.sort(function (a, b) { return SEV[b.level] - SEV[a.level]; });

    const counts = { error: 0, warn: 0, info: 0 };
    findings.forEach(function (f) { counts[f.level]++; });
    let score = 100 - (counts.error * POINTS.error + counts.warn * POINTS.warn + counts.info * POINTS.info);
    score = Math.max(0, Math.min(100, score));

    return { ok: true, empty: false, score: score, findings: findings, counts: counts, lines: ctx.lines.length };
  }

  function report(res, meta) {
    const m = meta || {};
    const out = [];
    out.push('Аудит конфигурации RouterOS');
    if (m.date) out.push('Дата: ' + m.date);
    if (m.identity) out.push('Устройство: ' + m.identity);
    out.push('Оценка: ' + res.score + ' из 100 · ошибок ' + res.counts.error + ', предупреждений ' +
      res.counts.warn + ', замечаний ' + res.counts.info);
    out.push('');
    if (!res.findings.length) {
      out.push('Проблем не найдено.');
    } else {
      res.findings.forEach(function (f, i) {
        out.push((i + 1) + '. [' + (f.level === 'error' ? 'ошибка' : f.level === 'warn' ? 'внимание' : 'замечание') + '] ' + f.t);
        out.push('   Почему: ' + f.why);
        out.push('   Исправление: ' + f.fix);
        out.push('');
      });
    }
    out.push('Проверено приложением «MikroTik · Учебник Winbox 4».');
    return out.join('\n');
  }

  window.ConfigAudit = {
    check: check,
    report: report,
    checks: CHECKS,
    severity: SEV
  };
})();
