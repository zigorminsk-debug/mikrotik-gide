# Покрытие меню RouterOS 7 / Winbox 4

Сверка содержания учебника с деревом меню Winbox 4 для RouterOS 7.x.
**Статус:** ✅ — разобрано отдельной статьёй · ◐ — есть внутри другой статьи (нет своей) · ➖ — не разобрано.

Актуальные счётчики: **15 разделов, 215 статей, 230 схем, 718 подсказок**.
Проверка: `node scripts/check-content.js`.

---

## Interfaces

| Пункт меню | Статья | Статус |
|---|---|---|
| Interface (список) | `if-list` | ✅ |
| Ethernet | `if-ethernet`, `if-ethernet-tune` | ✅ |
| VLAN | `if-vlan`, `task-vlan-office` | ✅ |
| Bonding | `if-bonding` | ✅ |
| Bridge + Ports / Hosts / Settings | `if-bridge`, `if-bridge-ports`, `if-bridge-hosts` | ✅ |
| Bridge → VLANs, VLAN Filtering | `if-bridge-vlan` | ✅ |
| Bridge → Filters, NAT | `if-bridge-nat`, `task-rogue-dhcp` | ✅ |
| Interface List | `if-lists` | ✅ |
| Detect Internet | `if-detect` | ✅ |
| LTE | `if-lte`, `task-lte-backup` | ✅ |
| VRRP | `if-vrrp` | ✅ |
| VXLAN | `if-vxlan` | ✅ |
| WireGuard | `wg-interface`, `wg-peers`, `wg-server` | ✅ |
| PPPoE Client | `if-pppoe-client`, `ppp-pppoe-client` | ✅ |
| EoIP / GRE / IPIP | `vpn-tunnels` | ✅ |
| L2TP-Client, SSTP-Client, OVPN-Client, PPTP-Client — обзор | `vpn-choose`, `ppp-l2tp-client` | ◐ |
| VETH (контейнеры) | — | ➖ |
| L2TP-Ethernet (L2 через L2TPv3) | — | ➖ |
| MACsec | — | ➖ |

## Switch

| Пункт меню | Статья | Статус |
|---|---|---|
| Switch (общие настройки) | `sw-switch` | ✅ |
| Switch → VLANs (CRS1xx/2xx) | `sw-vlan` | ✅ |
| Switch → Rules (ACL) | `sw-rules` | ✅ |
| Switch → Hosts | `sw-hosts` | ✅ |
| Mirroring / SPAN | `sw-mirror` | ✅ |
| Hardware offload, fast-path | `sw-hw-offload` | ✅ |
| STP/RSTP, защита от петель | `sw-storm` | ✅ |
| Port Isolation | `if-bridge-nat` | ◐ |
| Port-based VLAN, QoS на коммутаторе | — | ➖ |

## IP

| Пункт меню | Статья | Статус |
|---|---|---|
| Address | `ip-address`, `ip-secondary-address` | ✅ |
| ARP | `ip-arp`, `ip-arp-modes` | ✅ |
| Cloud (DDNS / discovery) | `ip-cloud` | ✅ |
| DHCP Client | `ip-dhcp-client` | ✅ |
| DHCP Server (+ Options, Networks, Leases) | `ip-dhcp-server`, `ip-dhcp-options` | ✅ |
| DHCP Relay | `ip-dhcp-relay` | ✅ |
| DNS | `ip-dns`, `task-dns-security` | ✅ |
| Firewall → Filter Rules | `ip-firewall-filter` | ✅ |
| Firewall → NAT | `ip-firewall-nat`, `task-port-forward` | ✅ |
| Firewall → Mangle | `ip-firewall-mangle` | ✅ |
| Firewall → RAW | `ip-firewall-raw` | ✅ |
| Firewall → Connections / Tracking | `ip-firewall-connections` | ✅ |
| Firewall → Address Lists | `ip-firewall-addresslists` | ✅ |
| Firewall → Service Ports | `ip-firewall-serviceports` | ✅ |
| Hotspot (+ User Profiles, Vouchers) | `ip-hotspot`, `task-hotspot-vouchers` | ✅ |
| IPsec (Policies, Peers, Identities, SAs) | `vpn-ipsec-policy`, `vpn-ipsec-keys` | ✅ |
| Kid Control | `ip-kidcontrol` | ✅ |
| Neighbor Discovery | `ip-neighbor` | ✅ |
| Pool | `ip-pool` | ✅ |
| Routes | `ip-routes`, `rt-ecmp` | ✅ |
| Services | `ip-services` | ✅ |
| Settings | `ip-settings` | ✅ |
| SMB | `ip-smb` | ✅ |
| SNMP | `task-monitoring`, `task-snmp-zabbix` | ✅ |
| SOCKS / TFTP / Packing | `ip-misc` | ✅ |
| SSH / TFTP (сервисы) | `ip-ssh-tftp` | ✅ |
| UPnP | `ip-upnp` | ✅ |
| VRF | `ip-vrf` | ✅ |
| Web Proxy | `ip-webproxy` | ✅ |
| SMTP (отправка почты) | `tool-email-wol` | ◐ |
| Traffic Flow (NetFlow/IPFIX) | `task-monitoring` | ◐ |
| Firewall → Layer7 | `ip-firewall-mangle` | ◐ |
| Media (Media Server) | — | ➖ |

## IPv6

| Пункт меню | Статья | Статус |
|---|---|---|
| Address | `ipv6-address`, `ipv6-pd` | ✅ |
| DHCP Client (PD) | `ipv6-dhcp-client` | ✅ |
| DHCP Server | `ipv6-dhcp-server` | ✅ |
| ND | `ipv6-nd` | ✅ |
| Firewall (Filter, Mangle, NAT66) | `ipv6-firewall` | ✅ |
| Pool | `ipv6-pool` | ✅ |
| Routes | `ipv6-routes` | ✅ |
| Settings | `ipv6-settings` | ✅ |
| DHCPv6 Relay | — | ➖ |

## MPLS

| Пункт меню | Статья | Статус |
|---|---|---|
| MPLS / Forwarding | `mpls-basics` | ✅ |
| LDP | `mpls-ldp` | ✅ |
| L2VPN → VPLS | `mpls-vpls` | ✅ |
| Диагностика меток | `mpls-troubleshoot` | ✅ |
| Traffic Engineering (RSVP-TE) | — | ➖ |

## PPP

| Пункт меню | Статья | Статус |
|---|---|---|
| Profiles | `ppp-profiles`, `ppp-limits` | ✅ |
| Secrets | `ppp-secrets` | ✅ |
| PPPoE Server | `ppp-pppoe-server`, `task-pppoe-isp` | ✅ |
| L2TP Server (+IPsec) | `ppp-l2tp-server`, `task-l2tp-vpn` | ✅ |
| PPTP Server | `ppp-pptp-server` | ✅ |
| SSTP Server | `ppp-sstp-server` | ✅ |
| OVPN Server | `ppp-ovpn-server` | ✅ |
| AAA / RADIUS | `ppp-aaa-radius` | ✅ |
| Active Connections, логи | `ppp-active` | ✅ |
| Пулы адресов, IPv6, MTU/keepalive | `ppp-addresses`, `ppp-ipv6`, `ppp-keepalive-mtu` | ✅ |

## Routing

| Пункт меню | Статья | Статус |
|---|---|---|
| Tables | `rt-tables` | ✅ |
| Rules | `rt-rules` | ✅ |
| OSPF (Instance, Area, Interface Template) | `rt-ospf`, `rt-ospf-areas` | ✅ |
| BGP (Connections, Templates) | `rt-bgp`, `rt-bgp-templates`, `task-bgp-multihome` | ✅ |
| RIP | `rt-rip` | ✅ |
| Filters / Prefix Lists | `rt-filters`, `rt-prefix-lists` | ✅ |
| BFD | `rt-bfd` | ✅ |
| Nexthops | `rt-nexthops` | ✅ |
| IGMP Proxy (multicast IPTV) | `rt-igmp-proxy`, `task-iptv` | ✅ |
| Settings (router-id, redistribute) | `rt-settings` | ✅ |
| ECMP / распределение | `rt-ecmp` | ✅ |
| PIM-SM (multicast-маршрутизация) | `rt-igmp-proxy` | ◐ |

## Queues

| Пункт меню | Статья | Статус |
|---|---|---|
| Simple Queues (+ Burst) | `q-simple`, `q-burst` | ✅ |
| Queue Tree | `q-tree`, `task-qos` | ✅ |
| Queue Types (PCQ, fq-codel, CAKE) | `q-types`, `q-cake` | ✅ |
| Interface Queues | `q-interface` | ✅ |

## System

| Пункт меню | Статья | Статус |
|---|---|---|
| Identity | `sys-identity` | ✅ |
| Clock, NTP Client/Server | `sys-clock` | ✅ |
| Users / Groups / Password | `sys-users`, `sys-user-policy` | ✅ |
| Certificates | `sys-certificates`, `sys-lets-encrypt` | ✅ |
| Files | `sys-files`, `start-backup` | ✅ |
| Logging | `sys-logging`, `sys-log-remote` | ✅ |
| Packages | `sys-packages`, `start-upgrade` | ✅ |
| RouterBOARD / RouterBOOT | `sys-routerboard` | ✅ |
| Scheduler | `sys-scheduler` | ✅ |
| Scripts | `sys-scripts` | ✅ |
| Backup / Restore | `sys-backup-menu`, `start-backup` | ✅ |
| Resources | `sys-resources` | ✅ |
| Health | `sys-health` | ✅ |
| Watchdog | `sys-watchdog` | ✅ |
| Auto Upgrade | `sys-autoupgrade` | ✅ |
| License | `sys-license` | ✅ |
| Note / LEDs | `sys-note-leds` | ✅ |
| History | `sys-history` | ✅ |
| Ports (консоль, USB, serial) | `sys-ports` | ✅ |
| Reboot / Shutdown | `sys-reboot` | ✅ |
| RADIUS | `ppp-aaa-radius` | ◐ |
| SNMP | `task-snmp-zabbix` | ◐ |
| User Manager (отдельный пакет) | — | ➖ |
| Dude (мониторинг) | — | ➖ |
| Partitions (dual-boot) | — | ➖ |
| Hardware / Discovery | `ip-neighbor` | ◐ |

## Tools

| Пункт меню | Статья | Статус |
|---|---|---|
| Ping, Traceroute | `tool-ping`, `tool-traceroute` | ✅ |
| Torch | `tool-torch`, `vpn-troubleshoot` | ✅ |
| Profiler | `tool-profiler` | ✅ |
| Sniffer | `tool-sniffer` | ✅ |
| Netwatch (+ скрипты) | `tool-netwatch`, `tool-netwatch-script`, `task-failover` | ✅ |
| Graphing | `tool-graphing`, `tool-latency-monitor` | ✅ |
| Bandwidth Test | `tool-bwtest` | ✅ |
| Traffic Generator | `tool-trafficgen` | ✅ |
| Email / Wake on LAN | `tool-email-wol` | ✅ |
| RoMON | `tool-romon` | ✅ |
| Fetch | `tool-fetch`, `task-config-versioning` | ✅ |
| IP Scan | `tool-ipscan` | ✅ |
| Traffic Monitor | `tool-traffic-monitor` | ✅ |
| SMS | `tool-sms` | ✅ |
| Speed Test (клиент/сервер) | `tool-bwtest` | ◐ |
| Wireless Scan / Snooper (legacy) | `wifi-sniffer` | ◐ |
| Netinstall | `task-recover-access` | ◐ |

## Files / прочее

| Пункт меню | Статья | Статус |
|---|---|---|
| Files | `sys-files` | ✅ |
| Backup / Export | `start-backup`, `sys-backup-menu` | ✅ |
| User Manager | — | ➖ |
| Dude | — | ➖ |
| OpenFlow | — | ➖ |
| ROMON | `tool-romon` | ✅ |

---

## Что осталось (по приоритету)

1. **VETH и контейнеры** — запуск Docker-контейнеров на RouterOS 7 (популярно на x86/CHR).
2. **L2TP-Ethernet** — L2-связка через L2TPv3, когда MPLS недоступен.
3. **Media Server / DLNA** — редко, но пункт в меню есть.
4. **PIM-SM** — полноценный multicast-роутинг (IPTV на несколько площадок).
5. **User Manager и Dude** — отдельные пакеты; нужны тем, у кого десятки устройств.
6. **Port-based VLAN / QoS на CRS** — тонкости аппаратного коммутатора.
7. **MACsec** — шифрование на уровне линии, только свежее железо.
8. **Traffic Flow (NetFlow)** — экспорт потоков во внешний коллектор.
9. **Partitions, OpenFlow, MPLS TE** — экзотика, спрос низкий.

## Как проверялось

```bash
node scripts/check-content.js   # 15 разделов, 215 статей, 230 схем, 718 подсказок
node /home/user/_test/smoke.js  # рендер всех статей: 215/215 без ошибок
```

Сверка велась по дереву меню Winbox 4 (RouterOS 7.16): каждый корневой пункт и его
подпункты сопоставлены со статьёй приложения. Пометка ◐ означает, что тема раскрыта
внутри другой статьи, но отдельной страницы с окнами Winbox у неё нет.
