/* Настоящие снимки Winbox 4, привязанные к шагам статей.
   Ключ — id статьи, значение — { «номер шага с нуля»: «файл в img/shots» }.
   Такой шаг показывает живое окно Winbox 4, снятое в CI на настоящем RouterOS
   (см. .github/workflows/winbox-shots.yml), а не векторную схему.
   Остальные шаги остаются схемами — они подписаны «Схема окна Winbox 4». */
window.SHOT_STEPS = {

  /* Вход и первые шаги */
  'start-first-login': { 0: 'login.jpg' },
  'start-menu-map': { 0: 'desktop.jpg' },
  'start-winbox4': { 0: 'desktop.jpg' },
  'start-base-setup': { 0: 'quickset.jpg' },
  'start-backup': { 0: 'files.jpg' },
  'start-remote-access': { 0: 'ip-services.jpg' },

  /* Интерфейсы и мосты */
  'if-list': { 0: 'interfaces.jpg' },
  'if-ethernet': { 0: 'interfaces.jpg' },
  'if-ethernet-tune': { 0: 'interfaces.jpg' },
  'if-vlan': { 0: 'interfaces.jpg' },
  'if-bonding': { 0: 'interfaces.jpg' },
  'if-vxlan': { 0: 'interfaces.jpg' },
  'if-lte': { 0: 'interfaces.jpg' },
  'if-lists': { 0: 'interfaces.jpg' },
  'if-detect': { 0: 'interfaces.jpg' },
  'if-vrrp': { 0: 'interfaces.jpg' },
  'if-pppoe-client': { 0: 'interfaces.jpg' },
  'if-bridge': { 0: 'bridge-new.jpg' },
  'if-bridge-ports': { 0: 'bridge.jpg' },
  'if-bridge-vlan': { 0: 'bridge.jpg' },
  'if-bridge-hosts': { 0: 'bridge.jpg' },
  'if-bridge-nat': { 0: 'bridge.jpg' },
  'sw-switch': { 0: 'bridge.jpg' },

  /* IP */
  'ip-address': { 0: 'ip-address.jpg' },
  'ip-secondary-address': { 0: 'ip-address.jpg' },
  'ip-vrf': { 0: 'ip-address.jpg' },
  'ip-dns': { 0: 'ip-dns.jpg' },
  'ip-dhcp-server': { 0: 'dhcp-server.jpg' },
  'ip-dhcp-options': { 0: 'dhcp-server.jpg' },
  'ip-pool': { 0: 'dhcp-server.jpg' },
  'ip-dhcp-relay': { 0: 'dhcp-server.jpg' },
  'dhcp-relay-deep': { 0: 'dhcp-server.jpg' },
  'ip-routes': { 0: 'ip-routes.jpg' },
  'ip-services': { 0: 'ip-services.jpg' },
  'rt-tables': { 0: 'ip-routes.jpg' },
  'rt-ecmp': { 0: 'ip-routes.jpg' },
  'rt-nexthops': { 0: 'ip-routes.jpg' },

  /* PPP и VPN */
  'ppp-profiles': { 0: 'ppp.jpg' },
  'ppp-secrets': { 0: 'ppp.jpg' },
  'ppp-pppoe-server': { 0: 'ppp.jpg' },
  'ppp-pppoe-client': { 0: 'ppp.jpg' },
  'ppp-l2tp-client': { 0: 'ppp.jpg' },
  'ppp-active': { 0: 'ppp.jpg' },
  'ppp-addresses': { 0: 'ppp.jpg' },
  'task-pppoe-isp': { 0: 'ppp.jpg' },
  'task-l2tp-vpn': { 0: 'ppp.jpg' },
  'wg-server': { 0: 'wireguard.jpg' },
  'wg-interface': { 0: 'wireguard.jpg' },
  'wg-peers': { 0: 'wireguard.jpg' },
  'wg-site': { 0: 'wireguard.jpg' },
  'wg-client-config': { 0: 'wireguard.jpg' },
  'netvpn-start': { 0: 'wireguard.jpg' },
  'vpn-wireguard': { 0: 'wireguard.jpg' },
  'task-wg-site': { 0: 'wireguard.jpg' },
  'task-vpn-hub': { 0: 'wireguard.jpg' },

  /* System */
  'sys-files': { 0: 'files.jpg' },
  'sys-backup-menu': { 0: 'files.jpg' },
  'sys-logging': { 0: 'desktop.jpg' },
  'sys-identity': { 0: 'desktop.jpg' },
  'task-backup-automation': { 0: 'files.jpg' },
  'task-config-versioning': { 0: 'files.jpg' },

  /* Dot1X и прочее */
  'wifi-legacy': { 0: 'desktop.jpg' },
  'task-corp-wifi-8021x': { 0: 'dot1x.jpg' },
  'task-office-from-scratch': { 0: 'quickset.jpg' },
  'task-lan-internet': { 0: 'quickset.jpg' },
  'task-protect-router': { 0: 'ip-services.jpg' },

};
