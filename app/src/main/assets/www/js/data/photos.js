/* Настоящие снимки Winbox 4, привязанные к шагам статей.
   Ключ — id статьи, значение — { «номер шага с нуля»: «файл в img/shots» }.
   Такой шаг показывает живое окно Winbox 4, снятое в CI на настоящем
   RouterOS 7.24.6, а не векторную схему. Остальные шаги подписаны
   «Схема окна Winbox 4». Файл создаёт scripts/win4-import.js. */
window.SHOT_STEPS = {
  "wifi-interface": {
    "0": "wifi.jpg",
    "1": "wifi-new.jpg",
    "2": "wifi.jpg",
    "3": "wifi.jpg",
    "4": "wifi-new.jpg",
    "5": "wifi-new.jpg"
  },
  "wifi-roaming": {
    "0": "wifi.jpg",
    "1": "wifi-new.jpg",
    "2": "wifi-security.jpg",
    "3": "wifi-access-list.jpg",
    "4": "wifi-wps.jpg"
  },
  "wifi-channels": {
    "0": "wifi.jpg",
    "1": "wifi-new.jpg",
    "2": "wifi-wps.jpg",
    "3": "wifi-sniffer.jpg"
  },
  "task-guest-wifi": {
    "0": "wifi-new.jpg",
    "1": "wifi.jpg",
    "2": "wifi-wps.jpg",
    "3": "wifi-sniffer.jpg"
  },
  "wifi-security": {
    "0": "wifi-security.jpg",
    "1": "wifi-security.jpg",
    "2": "wifi.jpg",
    "3": "wifi-new.jpg",
    "4": "wifi-access-list.jpg"
  },
  "task-corp-wifi-8021x": {
    "0": "wifi-security.jpg",
    "1": "wifi-sniffer.jpg"
  },
  "wifi-accesslist": {
    "0": "wifi-access-list.jpg",
    "1": "wifi-access-list.jpg",
    "2": "wifi.jpg",
    "3": "wifi-new.jpg"
  },
  "wifi-wps": {
    "0": "wifi-wps.jpg",
    "1": "wifi-wps.jpg",
    "2": "wifi-security.jpg",
    "3": "wifi-access-list.jpg"
  },
  "wifi-sniffer": {
    "0": "wifi-sniffer.jpg",
    "1": "wifi-sniffer.jpg",
    "2": "wifi-security.jpg",
    "3": "wifi-access-list.jpg",
    "4": "wifi-wps.jpg"
  },
  "start-base-setup": {
    "0": "ip-address.jpg",
    "1": "bridge-new.jpg",
    "2": "interfaces.jpg",
    "3": "bridge.jpg",
    "4": "backup.jpg",
    "5": "ip-dhcp-server.jpg",
    "6": "ip-dns.jpg",
    "7": "eth.jpg",
    "8": "files.jpg"
  },
  "if-list": {
    "0": "interfaces.jpg",
    "1": "interfaces.jpg",
    "2": "eth.jpg",
    "3": "vlan.jpg",
    "4": "bonding.jpg"
  },
  "if-ethernet": {
    "0": "eth.jpg",
    "1": "eth.jpg",
    "2": "interfaces.jpg",
    "3": "vlan.jpg",
    "4": "bonding.jpg"
  },
  "if-ethernet-tune": {
    "0": "eth.jpg",
    "1": "eth.jpg",
    "2": "vxlan.jpg"
  },
  "if-vlan": {
    "0": "vlan.jpg",
    "1": "vlan.jpg",
    "2": "interfaces.jpg",
    "3": "eth.jpg",
    "4": "bonding.jpg"
  },
  "if-bonding": {
    "0": "bonding.jpg",
    "1": "bonding.jpg",
    "2": "vlan.jpg",
    "3": "vrrp.jpg",
    "4": "lte.jpg"
  },
  "if-vrrp": {
    "0": "vrrp.jpg",
    "1": "vrrp.jpg",
    "2": "vlan.jpg",
    "3": "bonding.jpg",
    "4": "lte.jpg"
  },
  "if-lte": {
    "0": "lte.jpg",
    "1": "lte.jpg",
    "2": "vrrp.jpg",
    "3": "vxlan.jpg"
  },
  "task-lte-backup": {
    "0": "lte.jpg"
  },
  "if-vxlan": {
    "0": "vxlan.jpg",
    "1": "vxlan.jpg",
    "2": "vrrp.jpg"
  },
  "wg-interface": {
    "0": "wireguard.jpg",
    "1": "wireguard.jpg",
    "2": "wg-new.jpg",
    "3": "interfaces.jpg"
  },
  "vpn-wireguard": {
    "0": "wireguard.jpg",
    "1": "wg-peers.jpg",
    "2": "wg-new.jpg",
    "3": "wg-peers.jpg",
    "4": "wireguard.jpg",
    "5": "wireguard.jpg",
    "6": "wg-new.jpg"
  },
  "wg-peers": {
    "0": "wg-peers.jpg",
    "1": "wg-peers.jpg",
    "2": "wireguard.jpg",
    "3": "wg-new.jpg",
    "4": "interfaces.jpg"
  },
  "wg-troubleshoot": {
    "0": "wg-peers.jpg",
    "1": "wireguard.jpg",
    "2": "wg-new.jpg",
    "3": "interfaces.jpg",
    "4": "eth.jpg",
    "5": "vlan.jpg",
    "6": "bonding.jpg"
  },
  "vpn-site2site": {
    "0": "wg-peers.jpg",
    "1": "wireguard.jpg",
    "2": "wg-new.jpg"
  },
  "task-wg-site": {
    "0": "wg-peers.jpg",
    "1": "ip-routes.jpg",
    "2": "wg-new.jpg"
  },
  "task-vpn-hub": {
    "0": "wg-peers.jpg",
    "1": "wg-new.jpg"
  },
  "if-bridge": {
    "0": "bridge.jpg",
    "1": "bridge-ports.jpg",
    "2": "bridge-new.jpg",
    "3": "bridge.jpg",
    "4": "bridge-ports.jpg",
    "5": "bridge-vlans.jpg"
  },
  "if-bridge-vlan": {
    "0": "bridge-vlans.jpg",
    "1": "bridge.jpg",
    "2": "bridge-new.jpg",
    "3": "bridge.jpg",
    "4": "bridge-ports.jpg",
    "5": "bridge-ports.jpg"
  },
  "if-bridge-ports": {
    "0": "bridge-ports.jpg",
    "1": "bridge-ports.jpg",
    "2": "bridge.jpg",
    "3": "bridge-vlans.jpg",
    "4": "bridge-hosts.jpg"
  },
  "sw-storm": {
    "0": "bridge-ports.jpg",
    "1": "bridge-vlans.jpg",
    "2": "bridge-hosts.jpg",
    "3": "bridge-filters.jpg",
    "4": "bridge-new.jpg"
  },
  "task-vlan-office": {
    "0": "bridge-vlans.jpg",
    "1": "bridge-hosts.jpg",
    "2": "bridge-filters.jpg",
    "3": "bridge-new.jpg",
    "4": "bridge-filters.jpg"
  },
  "task-guest-iot-vlan": {
    "0": "bridge-vlans.jpg",
    "1": "bridge-filters.jpg"
  },
  "if-bridge-hosts": {
    "0": "bridge-hosts.jpg",
    "1": "bridge-hosts.jpg",
    "2": "bridge.jpg",
    "3": "bridge-ports.jpg"
  },
  "if-bridge-nat": {
    "0": "bridge-filters.jpg",
    "1": "bridge.jpg",
    "2": "bridge-vlans.jpg",
    "3": "bridge-hosts.jpg",
    "4": "bridge-new.jpg"
  },
  "task-rogue-dhcp": {
    "0": "bridge-filters.jpg",
    "1": "bridge-hosts.jpg",
    "2": "bridge-new.jpg"
  },
  "ppp-profiles": {
    "0": "ppp-profiles.jpg",
    "1": "ppp-profiles.jpg",
    "2": "ppp.jpg",
    "3": "ppp-secrets.jpg",
    "4": "ppp-active.jpg"
  },
  "ppp-limits": {
    "0": "ppp-profiles.jpg",
    "1": "ppp-profiles.jpg",
    "2": "pppoe-server.jpg",
    "3": "l2tp-server.jpg",
    "4": "ovpn-server.jpg"
  },
  "vpn-split-tunnel": {
    "0": "ppp-profiles.jpg",
    "1": "ovpn-server.jpg"
  },
  "ppp-secrets": {
    "0": "ppp-secrets.jpg",
    "1": "ppp-secrets.jpg",
    "2": "ppp.jpg",
    "3": "ppp-profiles.jpg",
    "4": "ppp-active.jpg"
  },
  "ppp-active": {
    "0": "ppp-active.jpg",
    "1": "pppoe-server.jpg",
    "2": "l2tp-server.jpg",
    "3": "ovpn-server.jpg"
  },
  "ppp-pppoe-server": {
    "0": "pppoe-server.jpg",
    "1": "ppp.jpg",
    "2": "ppp-profiles.jpg",
    "3": "ppp-secrets.jpg",
    "4": "ppp-active.jpg",
    "5": "l2tp-server.jpg"
  },
  "task-pppoe-isp": {
    "0": "pppoe-server.jpg"
  },
  "vpn-choose": {
    "0": "l2tp-server.jpg",
    "1": "ovpn-server.jpg"
  },
  "task-l2tp-vpn": {
    "0": "l2tp-server.jpg"
  },
  "vpn-openvpn": {
    "0": "ovpn-server.jpg"
  },
  "ip-address": {
    "0": "ip-address.jpg",
    "1": "ip-address.jpg",
    "2": "ip-address.jpg"
  },
  "ip-secondary-address": {
    "0": "ip-address.jpg",
    "1": "ip-address.jpg"
  },
  "ip-dhcp-server": {
    "0": "ip-dhcp-server.jpg",
    "1": "ip-dhcp-server.jpg",
    "2": "ip-dhcp-server.jpg",
    "3": "ip-dhcp-server.jpg",
    "4": "ip-dhcp-server.jpg"
  },
  "ip-dns": {
    "0": "ip-dns.jpg",
    "1": "ip-dns.jpg",
    "2": "ip-dns.jpg",
    "3": "ip-routes.jpg"
  },
  "task-dns-security": {
    "0": "ip-dns.jpg"
  },
  "ip-routes": {
    "0": "ip-routes.jpg",
    "1": "ip-routes.jpg",
    "2": "ip-routes.jpg"
  },
  "rt-ecmp": {
    "0": "ip-routes.jpg"
  },
  "task-failover": {
    "0": "ip-routes.jpg"
  },
  "start-first-login": {
    "0": "login.jpg",
    "1": "desktop.jpg",
    "2": "quickset.jpg",
    "3": "ip-services.jpg",
    "4": "files.jpg",
    "5": "dot1x.jpg",
    "6": "login.jpg"
  },
  "start-passwords": {
    "0": "ip-services.jpg",
    "1": "ip-dns.jpg"
  },
  "start-remote-access": {
    "0": "ip-services.jpg"
  },
  "ip-services": {
    "0": "ip-services.jpg",
    "1": "ip-services.jpg",
    "2": "ip-services.jpg"
  },
  "ip-ssh-tftp": {
    "0": "ip-services.jpg"
  },
  "sys-users": {
    "2": "ip-services.jpg"
  },
  "rt-settings": {
    "0": "routing.jpg",
    "1": "routing.jpg"
  },
  "sys-identity": {
    "0": "system.jpg",
    "1": "system.jpg"
  },
  "start-backup": {
    "0": "files.jpg",
    "1": "backup.jpg",
    "2": "files.jpg",
    "3": "files.jpg",
    "4": "backup.jpg",
    "5": "backup.jpg"
  },
  "task-office-from-scratch": {
    "0": "backup.jpg",
    "1": "terminal.jpg",
    "2": "files.jpg"
  },
  "task-migration": {
    "0": "files.jpg",
    "1": "backup.jpg"
  },
  "sys-backup-menu": {
    "0": "backup.jpg",
    "1": "files.jpg",
    "2": "backup.jpg"
  },
  "start-rollback": {
    "0": "log.jpg"
  },
  "q-simple": {
    "0": "queues.jpg",
    "1": "simple-new.jpg",
    "2": "queues.jpg",
    "3": "queues.jpg",
    "4": "simple-new.jpg"
  },
  "q-cake": {
    "0": "queues.jpg",
    "1": "simple-new.jpg",
    "2": "queue-types.jpg",
    "3": "queue-iface.jpg"
  },
  "q-burst": {
    "0": "queues.jpg",
    "1": "queues.jpg",
    "2": "simple-new.jpg",
    "3": "simple-new.jpg"
  },
  "q-types": {
    "0": "queue-types.jpg",
    "1": "queue-types.jpg",
    "2": "queues.jpg",
    "3": "simple-new.jpg",
    "4": "queue-iface.jpg"
  },
  "q-interface": {
    "0": "queue-iface.jpg",
    "1": "queue-iface.jpg",
    "2": "simple-new.jpg",
    "3": "queue-types.jpg"
  },
  "ppp-aaa-radius": {
    "0": "radius.jpg"
  },
  "ip-dhcp-options": {
    "0": "ip-dhcp-server.jpg",
    "1": "ip-dhcp-server.jpg"
  },
  "ppp-pppoe-client": {
    "0": "ppp.jpg",
    "1": "ppp-profiles.jpg",
    "2": "ppp-secrets.jpg",
    "3": "ppp-active.jpg",
    "4": "pppoe-server.jpg"
  },
  "ppp-l2tp-client": {
    "0": "ppp.jpg",
    "1": "ppp.jpg",
    "2": "ppp-secrets.jpg",
    "3": "ppp-active.jpg",
    "4": "pppoe-server.jpg"
  },
  "ip-tftp-pxe": {},
  "mpls-basics": {
    "2": "ip-routes.jpg"
  },
  "start-menu-map": {
    "0": "login.jpg",
    "1": "desktop.jpg",
    "2": "ip-address.jpg",
    "3": "ip-dns.jpg"
  },
  "start-winbox4": {
    "0": "login.jpg",
    "1": "desktop.jpg",
    "2": "ip-address.jpg",
    "3": "ip-dns.jpg"
  },
  "wifi-capsman": {
    "0": "wifi-security.jpg",
    "1": "wifi-access-list.jpg",
    "2": "wifi-wps.jpg",
    "3": "wifi-sniffer.jpg"
  },
  "wifi-slow": {
    "0": "wifi-security.jpg",
    "1": "wifi-access-list.jpg",
    "2": "wifi-wps.jpg",
    "3": "wifi-sniffer.jpg"
  },
  "task-capsman": {
    "0": "wifi-sniffer.jpg"
  },
  "if-pppoe-client": {
    "0": "vlan.jpg",
    "1": "bonding.jpg",
    "2": "vrrp.jpg",
    "3": "lte.jpg",
    "4": "vxlan.jpg"
  },
  "if-detect": {
    "0": "vrrp.jpg",
    "1": "lte.jpg",
    "2": "vxlan.jpg"
  },
  "if-lists": {
    "0": "vrrp.jpg",
    "1": "lte.jpg",
    "2": "vxlan.jpg"
  },
  "vpn-tunnels": {
    "0": "vxlan.jpg"
  },
  "sw-hw-offload": {
    "0": "bridge-vlans.jpg",
    "1": "bridge-hosts.jpg",
    "2": "bridge-filters.jpg",
    "3": "bridge-new.jpg",
    "4": "bridge-filters.jpg"
  },
  "ppp-pptp-server": {
    "0": "ppp.jpg",
    "1": "ppp-secrets.jpg",
    "2": "ppp-active.jpg",
    "3": "pppoe-server.jpg",
    "4": "l2tp-server.jpg"
  },
  "ppp-sstp-server": {
    "0": "ppp.jpg",
    "1": "ppp-secrets.jpg",
    "2": "ppp-active.jpg",
    "3": "pppoe-server.jpg",
    "4": "l2tp-server.jpg",
    "5": "ovpn-server.jpg"
  },
  "vpn-pptp": {
    "0": "l2tp-server.jpg",
    "1": "ovpn-server.jpg"
  },
  "vpn-sstp": {
    "0": "ovpn-server.jpg"
  },
  "ip-dhcp-client": {},
  "ip-dhcp-relay": {},
  "ip-arp": {},
  "ip-firewall-filter": {},
  "ip-firewall-nat": {},
  "ip-firewall-mangle": {},
  "ip-firewall-raw": {},
  "ip-firewall-connections": {},
  "ip-firewall-addresslists": {},
  "ip-firewall-serviceports": {},
  "ip-cloud": {},
  "ip-neighbor": {},
  "ip-pool": {},
  "ip-hotspot": {},
  "ip-kidcontrol": {},
  "ip-sntp": {},
  "ip-settings": {},
  "ip-smb": {},
  "ip-upnp": {},
  "ip-vrf": {},
  "ip-webproxy": {},
  "ip-misc": {},
  "ip-arp-modes": {},
  "ppp-addresses": {},
  "ppp-keepalive-mtu": {},
  "vpn-ipsec-ikev2": {},
  "vpn-ipsec-policy": {},
  "vpn-ipsec-keys": {},
  "vpn-firewall": {},
  "task-lan-internet": {},
  "task-port-forward": {},
  "task-pcc": {},
  "task-hotspot-vouchers": {},
  "task-protect-router": {},
  "task-tenants": {},
  "task-monitoring": {},
  "task-snmp-zabbix": {},
  "rt-tables": {
    "0": "routing.jpg"
  },
  "rt-rules": {
    "0": "routing.jpg"
  },
  "rt-ospf": {
    "0": "routing.jpg"
  },
  "rt-bgp": {
    "0": "routing.jpg",
    "1": "routing.jpg"
  },
  "rt-rip": {
    "0": "routing.jpg"
  },
  "rt-filters": {},
  "rt-bfd": {},
  "rt-ospf-areas": {},
  "rt-nexthops": {},
  "rt-prefix-lists": {},
  "rt-bgp-templates": {},
  "rt-igmp-proxy": {},
  "task-bgp-multihome": {},
  "task-iptv": {},
  "start-upgrade": {
    "0": "system.jpg",
    "1": "system.jpg"
  },
  "start-safe": {
    "0": "system.jpg"
  },
  "start-chr": {
    "0": "system.jpg"
  },
  "vpn-troubleshoot": {
    "0": "system.jpg"
  },
  "sys-clock": {
    "0": "system.jpg"
  },
  "sys-certificates": {},
  "sys-files": {},
  "sys-logging": {},
  "sys-packages": {},
  "sys-routerboard": {},
  "sys-scheduler": {},
  "sys-scripts": {},
  "sys-resources": {},
  "sys-health": {},
  "sys-watchdog": {},
  "sys-autoupgrade": {},
  "sys-license": {},
  "sys-note-leds": {},
  "sys-history": {},
  "sys-lets-encrypt": {},
  "sys-log-remote": {},
  "sys-ports": {},
  "sys-reboot": {},
  "sys-user-policy": {},
  "task-backup-automation": {},
  "task-recover-access": {},
  "task-audit-checkup": {},
  "task-config-versioning": {},
  "q-tree": {
    "0": "queues.jpg",
    "1": "simple-new.jpg",
    "2": "queue-types.jpg",
    "3": "queue-iface.jpg",
    "4": "queue-types.jpg"
  },
  "task-qos": {
    "0": "queue-types.jpg",
    "1": "queue-iface.jpg"
  },
  "wifi-power": {},
  "ppp-l2tp-server": {},
  "ppp-ipv6": {},
  "dhcp-relay-deep": {},
  "routing-policy": {},
  "netvpn-start": {},
  "task-wan-failover": {},
  "ppp-ovpn-server": {},
  "container-basics": {},
  "queue-cake": {
    "0": "queue-types.jpg",
    "1": "queue-iface.jpg"
  }
};
