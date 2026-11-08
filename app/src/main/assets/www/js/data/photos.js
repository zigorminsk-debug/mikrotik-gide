/* Настоящие снимки Winbox 4, привязанные к шагам статей.
   Ключ — id статьи, значение — { «номер шага с нуля»: «файл в img/shots» }.
   Такой шаг показывает живое окно Winbox 4, снятое в CI на настоящем
   RouterOS 7.24.6, а не векторную схему. Остальные шаги подписаны
   «Схема окна Winbox 4». Файл создаёт scripts/win4-import.js. */
window.SHOT_STEPS = {
  "task-wan-failover": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": "interfaces.jpg",
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": "ppp.jpg",
    "4": "ip-routes.jpg",
    "5": "ip-routes.jpg",
    "6": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "7": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "8": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "9": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "10": {
      "f": "system.jpg",
      "w": "System"
    },
    "11": {
      "f": "system.jpg",
      "w": "System"
    },
    "12": "log.jpg",
    "13": "log.jpg",
    "14": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "wg-server": {
    "0": {
      "f": "wireguard.jpg",
      "w": "WireGuard"
    },
    "1": {
      "f": "wg-peers.jpg",
      "w": "WireGuard → Peers"
    },
    "2": "ip-address.jpg",
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "wg-new.jpg",
      "w": "WireGuard → Peers → New"
    },
    "5": {
      "f": "wireguard.jpg",
      "w": "WireGuard"
    },
    "6": {
      "f": "wg-peers.jpg",
      "w": "WireGuard → Peers"
    },
    "7": "ip-dns.jpg",
    "8": {
      "f": "wireguard.jpg",
      "w": "WireGuard"
    }
  },
  "wg-site": {
    "0": {
      "f": "wireguard.jpg",
      "w": "WireGuard"
    },
    "1": {
      "f": "wg-peers.jpg",
      "w": "WireGuard → Peers"
    },
    "2": {
      "f": "wireguard.jpg",
      "w": "WireGuard"
    },
    "3": "ip-address.jpg",
    "4": "ip-routes.jpg",
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "6": {
      "f": "wireguard.jpg",
      "w": "WireGuard"
    },
    "7": {
      "f": "wg-new.jpg",
      "w": "WireGuard → Peers → New"
    }
  },
  "ppp-l2tp-server": {
    "0": {
      "f": "ppp.jpg",
      "w": "PPP"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": "ppp-profiles.jpg",
    "3": "ppp-secrets.jpg",
    "4": "l2tp-server.jpg",
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "6": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "7": {
      "f": "ppp.jpg",
      "w": "PPP"
    },
    "8": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "9": "ppp-active.jpg",
    "10": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    }
  },
  "ppp-ovpn-server": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    },
    "5": {
      "f": "system.jpg",
      "w": "System"
    },
    "6": "files.jpg",
    "7": "ppp-profiles.jpg",
    "8": "ovpn-server.jpg",
    "9": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "10": {
      "f": "system.jpg",
      "w": "System"
    },
    "11": {
      "f": "system.jpg",
      "w": "System"
    },
    "12": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "wg-interface": {
    "0": "wireguard.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    }
  },
  "wg-peers": {
    "0": "wg-peers.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    }
  },
  "wg-troubleshoot": {
    "0": "wg-peers.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    },
    "5": {
      "f": "lte.jpg",
      "w": "Interfaces → LTE"
    },
    "6": {
      "f": "vxlan.jpg",
      "w": "Interfaces → VXLAN"
    }
  },
  "start-first-login": {
    "0": "login.jpg",
    "1": {
      "f": "desktop.jpg",
      "w": "Рабочий стол после входа"
    },
    "2": {
      "f": "dot1x.jpg",
      "w": "Dot1X"
    },
    "3": "ip-services.jpg",
    "4": "files.jpg",
    "5": {
      "f": "quickset.jpg",
      "w": "Quick Set"
    },
    "6": {
      "f": "bridge-new.jpg",
      "w": "Bridge → New"
    }
  },
  "start-base-setup": {
    "0": "ip-address.jpg",
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": "interfaces.jpg",
    "3": "bridge.jpg",
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": "ip-dhcp-server.jpg",
    "6": "ip-dns.jpg",
    "7": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "8": "files.jpg"
  },
  "start-backup": {
    "0": "files.jpg",
    "1": "backup.jpg",
    "2": {
      "f": "files.jpg",
      "w": "Files"
    },
    "3": {
      "f": "backup.jpg",
      "w": "Files → Backup"
    },
    "4": {
      "f": "files.jpg",
      "w": "Files"
    },
    "5": {
      "f": "backup.jpg",
      "w": "Files → Backup"
    }
  },
  "start-rollback": {
    "0": "log.jpg",
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "start-passwords": {
    "0": "ip-services.jpg",
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "start-remote-access": {
    "0": "ip-services.jpg",
    "1": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "2": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "3": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "if-list": {
    "0": "interfaces.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    }
  },
  "if-ethernet": {
    "0": "eth.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    }
  },
  "if-vlan": {
    "0": "vlan.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    }
  },
  "if-bonding": {
    "0": "bonding.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    }
  },
  "if-bridge": {
    "0": "bridge.jpg",
    "1": "bridge-ports.jpg",
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    },
    "5": {
      "f": "lte.jpg",
      "w": "Interfaces → LTE"
    }
  },
  "if-bridge-ports": {
    "0": "bridge-ports.jpg",
    "1": {
      "f": "bridge-ports.jpg",
      "w": "Bridge → Ports"
    },
    "2": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "3": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "4": {
      "f": "bridge-filters.jpg",
      "w": "Bridge → Filters"
    }
  },
  "if-bridge-vlan": {
    "0": "bridge-vlans.jpg",
    "1": "bridge.jpg",
    "2": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "3": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "4": {
      "f": "bridge-filters.jpg",
      "w": "Bridge → Filters"
    },
    "5": {
      "f": "bridge-new.jpg",
      "w": "Bridge → New"
    }
  },
  "if-bridge-hosts": {
    "0": "bridge-hosts.jpg",
    "1": {
      "f": "bridge-ports.jpg",
      "w": "Bridge → Ports"
    },
    "2": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "3": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    }
  },
  "if-vrrp": {
    "0": "vrrp.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    }
  },
  "if-lte": {
    "0": "lte.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    }
  },
  "if-vxlan": {
    "0": "vxlan.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    }
  },
  "if-ethernet-tune": {
    "0": "eth.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    }
  },
  "if-bridge-nat": {
    "0": "bridge-filters.jpg",
    "1": {
      "f": "bridge-ports.jpg",
      "w": "Bridge → Ports"
    },
    "2": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "3": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "4": {
      "f": "bridge-filters.jpg",
      "w": "Bridge → Filters"
    }
  },
  "sw-storm": {
    "0": "bridge-ports.jpg",
    "1": {
      "f": "bridge-ports.jpg",
      "w": "Bridge → Ports"
    },
    "2": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "3": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "4": {
      "f": "bridge-filters.jpg",
      "w": "Bridge → Filters"
    }
  },
  "ip-address": {
    "0": "ip-address.jpg",
    "1": "ip-address.jpg",
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-routes": {
    "0": "ip-routes.jpg",
    "1": "ip-routes.jpg",
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-dns": {
    "0": "ip-dns.jpg",
    "1": "ip-dns.jpg",
    "2": "ip-routes.jpg",
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    }
  },
  "ip-dhcp-server": {
    "0": "ip-dhcp-server.jpg",
    "1": "ip-dhcp-server.jpg",
    "2": "ip-dhcp-server.jpg",
    "3": "ip-dhcp-server.jpg",
    "4": "ip-dhcp-server.jpg",
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    }
  },
  "ip-services": {
    "0": "ip-services.jpg",
    "1": "ip-services.jpg",
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-dhcp-options": {
    "0": "ip-dhcp-server.jpg",
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-ssh-tftp": {
    "0": "ip-services.jpg",
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    }
  },
  "ip-secondary-address": {
    "0": "ip-address.jpg",
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    }
  },
  "ip-tftp-pxe": {
    "0": "ip-dhcp-server.jpg",
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ipv6-address": {
    "0": "ipv6.jpg",
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ppp-profiles": {
    "0": "ppp-profiles.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    }
  },
  "ppp-secrets": {
    "0": "ppp-secrets.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    }
  },
  "ppp-pppoe-server": {
    "0": "pppoe-server.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    },
    "5": {
      "f": "l2tp-server.jpg",
      "w": "PPP → L2TP Server"
    }
  },
  "ppp-pppoe-client": {
    "0": "ppp.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    }
  },
  "ppp-l2tp-client": {
    "0": "ppp.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    }
  },
  "ppp-aaa-radius": {
    "0": "radius.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    }
  },
  "ppp-limits": {
    "0": "ppp-profiles.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    },
    "5": {
      "f": "l2tp-server.jpg",
      "w": "PPP → L2TP Server"
    }
  },
  "ppp-active": {
    "0": "ppp-active.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    }
  },
  "ppp-ipv6": {
    "0": "ipv6.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    },
    "5": {
      "f": "l2tp-server.jpg",
      "w": "PPP → L2TP Server"
    }
  },
  "vpn-wireguard": {
    "0": "wireguard.jpg",
    "1": "wg-peers.jpg",
    "2": "wg-new.jpg",
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    },
    "5": {
      "f": "lte.jpg",
      "w": "Interfaces → LTE"
    },
    "6": {
      "f": "vxlan.jpg",
      "w": "Interfaces → VXLAN"
    }
  },
  "vpn-choose": {
    "0": "l2tp-server.jpg"
  },
  "vpn-openvpn": {
    "0": "ovpn-server.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    },
    "5": {
      "f": "l2tp-server.jpg",
      "w": "PPP → L2TP Server"
    }
  },
  "vpn-site2site": {
    "0": "wg-peers.jpg"
  },
  "vpn-split-tunnel": {
    "0": "ppp-profiles.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    },
    "5": {
      "f": "l2tp-server.jpg",
      "w": "PPP → L2TP Server"
    }
  },
  "mpls-basics": {
    "2": "ip-routes.jpg"
  },
  "wifi-interface": {
    "0": "wifi.jpg",
    "1": "wifi-new.jpg",
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    },
    "5": {
      "f": "wifi-sniffer.jpg",
      "w": "WiFi → Sniffer"
    }
  },
  "wifi-security": {
    "0": "wifi-security.jpg",
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    }
  },
  "wifi-accesslist": {
    "0": "wifi-access-list.jpg",
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    }
  },
  "wifi-roaming": {
    "0": "wifi.jpg",
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    }
  },
  "wifi-wps": {
    "0": "wifi-wps.jpg",
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    }
  },
  "wifi-sniffer": {
    "0": "wifi-sniffer.jpg",
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    }
  },
  "wifi-channels": {
    "0": "wifi.jpg",
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    }
  },
  "rt-ecmp": {
    "0": "ip-routes.jpg",
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "rt-settings": {
    "0": "routing.jpg",
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "q-simple": {
    "0": "queues.jpg",
    "1": "simple-new.jpg",
    "2": {
      "f": "queue-types.jpg",
      "w": "Queues → Queue Types"
    },
    "3": {
      "f": "queue-iface.jpg",
      "w": "Queues → Interface Queues"
    },
    "4": {
      "f": "queues.jpg",
      "w": "Queues → Simple Queues"
    }
  },
  "q-types": {
    "0": "queue-types.jpg",
    "1": {
      "f": "simple-new.jpg",
      "w": "Queues → Simple Queues → New"
    },
    "2": {
      "f": "queue-types.jpg",
      "w": "Queues → Queue Types"
    },
    "3": {
      "f": "queue-iface.jpg",
      "w": "Queues → Interface Queues"
    },
    "4": {
      "f": "queues.jpg",
      "w": "Queues → Simple Queues"
    }
  },
  "q-interface": {
    "0": "queue-iface.jpg",
    "1": {
      "f": "simple-new.jpg",
      "w": "Queues → Simple Queues → New"
    },
    "2": {
      "f": "queue-types.jpg",
      "w": "Queues → Queue Types"
    },
    "3": {
      "f": "queue-iface.jpg",
      "w": "Queues → Interface Queues"
    }
  },
  "q-cake": {
    "0": "queues.jpg",
    "1": {
      "f": "simple-new.jpg",
      "w": "Queues → Simple Queues → New"
    },
    "2": {
      "f": "queue-types.jpg",
      "w": "Queues → Queue Types"
    },
    "3": {
      "f": "queue-iface.jpg",
      "w": "Queues → Interface Queues"
    }
  },
  "q-burst": {
    "0": "queues.jpg",
    "1": {
      "f": "simple-new.jpg",
      "w": "Queues → Simple Queues → New"
    },
    "2": {
      "f": "queue-types.jpg",
      "w": "Queues → Queue Types"
    },
    "3": {
      "f": "queue-iface.jpg",
      "w": "Queues → Interface Queues"
    }
  },
  "sys-identity": {
    "0": "system.jpg",
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-users": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": "ip-services.jpg",
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-backup-menu": {
    "0": "backup.jpg",
    "1": {
      "f": "backup.jpg",
      "w": "Files → Backup"
    },
    "2": {
      "f": "files.jpg",
      "w": "Files"
    },
    "3": {
      "f": "backup.jpg",
      "w": "Files → Backup"
    }
  },
  "task-guest-wifi": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": "wifi.jpg",
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    },
    "5": {
      "f": "wifi-sniffer.jpg",
      "w": "WiFi → Sniffer"
    },
    "6": {
      "f": "wifi.jpg",
      "w": "WiFi"
    }
  },
  "task-vlan-office": {
    "0": "bridge-vlans.jpg",
    "1": {
      "f": "bridge-ports.jpg",
      "w": "Bridge → Ports"
    },
    "2": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "3": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "4": {
      "f": "bridge-filters.jpg",
      "w": "Bridge → Filters"
    },
    "5": {
      "f": "bridge-new.jpg",
      "w": "Bridge → New"
    },
    "6": {
      "f": "bridge.jpg",
      "w": "Bridge"
    }
  },
  "task-failover": {
    "0": "ip-routes.jpg",
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": "ip-routes.jpg",
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    }
  },
  "task-wg-site": {
    "0": "wg-peers.jpg",
    "1": "ip-routes.jpg",
    "2": {
      "f": "wg-new.jpg",
      "w": "WireGuard → Peers → New"
    },
    "3": {
      "f": "wireguard.jpg",
      "w": "WireGuard"
    },
    "4": {
      "f": "wg-peers.jpg",
      "w": "WireGuard → Peers"
    },
    "5": {
      "f": "wg-new.jpg",
      "w": "WireGuard → Peers → New"
    },
    "6": {
      "f": "wireguard.jpg",
      "w": "WireGuard"
    },
    "7": {
      "f": "wg-peers.jpg",
      "w": "WireGuard → Peers"
    }
  },
  "task-l2tp-vpn": {
    "0": "l2tp-server.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    },
    "5": {
      "f": "l2tp-server.jpg",
      "w": "PPP → L2TP Server"
    },
    "6": {
      "f": "ovpn-server.jpg",
      "w": "PPP → OVPN Server"
    },
    "7": {
      "f": "ppp.jpg",
      "w": "PPP"
    }
  },
  "task-pppoe-isp": {
    "0": "pppoe-server.jpg",
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    },
    "5": {
      "f": "l2tp-server.jpg",
      "w": "PPP → L2TP Server"
    },
    "6": {
      "f": "ovpn-server.jpg",
      "w": "PPP → OVPN Server"
    }
  },
  "task-lte-backup": {
    "0": "lte.jpg",
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    },
    "5": {
      "f": "lte.jpg",
      "w": "Interfaces → LTE"
    },
    "6": {
      "f": "vxlan.jpg",
      "w": "Interfaces → VXLAN"
    }
  },
  "task-dns-security": {
    "0": "ip-dns.jpg",
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "6": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "7": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    }
  },
  "task-rogue-dhcp": {
    "0": "bridge-filters.jpg",
    "1": {
      "f": "bridge-ports.jpg",
      "w": "Bridge → Ports"
    },
    "2": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "3": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "4": {
      "f": "bridge-filters.jpg",
      "w": "Bridge → Filters"
    },
    "5": {
      "f": "bridge-new.jpg",
      "w": "Bridge → New"
    },
    "6": {
      "f": "bridge.jpg",
      "w": "Bridge"
    }
  },
  "task-vpn-hub": {
    "0": "wg-peers.jpg"
  },
  "task-office-from-scratch": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": "terminal.jpg",
    "2": "files.jpg"
  },
  "task-guest-iot-vlan": {
    "0": "bridge-vlans.jpg",
    "1": {
      "f": "bridge-ports.jpg",
      "w": "Bridge → Ports"
    },
    "2": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "3": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "4": {
      "f": "bridge-filters.jpg",
      "w": "Bridge → Filters"
    }
  },
  "task-corp-wifi-8021x": {
    "0": "wifi-security.jpg",
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    }
  },
  "task-migration": {
    "0": "files.jpg",
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    },
    "5": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "netvpn-start": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "wg-client-config": {
    "1": {
      "f": "wg-new.jpg",
      "w": "WireGuard → Peers → New"
    },
    "2": {
      "f": "wireguard.jpg",
      "w": "WireGuard"
    }
  },
  "start-menu-map": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "desktop.jpg",
      "w": "Рабочий стол после входа"
    },
    "2": {
      "f": "login.jpg",
      "w": "Вход: Connect to и Neighbors"
    },
    "3": {
      "f": "desktop.jpg",
      "w": "Рабочий стол после входа"
    },
    "4": {
      "f": "login.jpg",
      "w": "Вход: Connect to и Neighbors"
    },
    "5": {
      "f": "desktop.jpg",
      "w": "Рабочий стол после входа"
    }
  },
  "start-upgrade": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    },
    "5": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "start-safe": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "start-chr": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "start-winbox4": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "desktop.jpg",
      "w": "Рабочий стол после входа"
    },
    "2": {
      "f": "login.jpg",
      "w": "Вход: Connect to и Neighbors"
    },
    "3": {
      "f": "desktop.jpg",
      "w": "Рабочий стол после входа"
    },
    "4": {
      "f": "login.jpg",
      "w": "Вход: Connect to и Neighbors"
    },
    "5": {
      "f": "desktop.jpg",
      "w": "Рабочий стол после входа"
    }
  },
  "if-pppoe-client": {
    "0": {
      "f": "interfaces.jpg",
      "w": "Interfaces"
    },
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    },
    "5": {
      "f": "lte.jpg",
      "w": "Interfaces → LTE"
    }
  },
  "if-detect": {
    "0": {
      "f": "interfaces.jpg",
      "w": "Interfaces"
    },
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    }
  },
  "if-lists": {
    "0": {
      "f": "interfaces.jpg",
      "w": "Interfaces"
    },
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    }
  },
  "sw-switch": {},
  "sw-vlan": {
    "0": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "1": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "2": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "3": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "4": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    }
  },
  "sw-rules": {},
  "sw-hw-offload": {
    "0": {
      "f": "bridge.jpg",
      "w": "Bridge"
    },
    "1": {
      "f": "bridge-ports.jpg",
      "w": "Bridge → Ports"
    },
    "2": {
      "f": "bridge-vlans.jpg",
      "w": "Bridge → VLANs"
    },
    "3": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "4": {
      "f": "bridge-filters.jpg",
      "w": "Bridge → Filters"
    }
  },
  "sw-hosts": {
    "0": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "1": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "2": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    },
    "3": {
      "f": "bridge-hosts.jpg",
      "w": "Bridge → Hosts"
    }
  },
  "sw-mirror": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "ip-dhcp-client": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-dhcp-relay": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    }
  },
  "ip-arp": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-firewall-filter": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "6": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "7": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    }
  },
  "ip-firewall-nat": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-firewall-mangle": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-firewall-raw": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-firewall-connections": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-firewall-addresslists": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-firewall-serviceports": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    }
  },
  "ip-cloud": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-neighbor": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-pool": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-hotspot": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "6": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "7": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    }
  },
  "ip-kidcontrol": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    }
  },
  "ip-sntp": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    }
  },
  "ip-settings": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-smb": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-upnp": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    }
  },
  "ip-vrf": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    }
  },
  "ip-webproxy": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "ip-misc": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    }
  },
  "ip-arp-modes": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "dhcp-relay-deep": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    }
  },
  "ipv6-dhcp-client": {
    "0": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ipv6-dhcp-server": {
    "0": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ipv6-nd": {
    "0": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ipv6-firewall": {
    "0": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ipv6-routes": {
    "0": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ipv6-pd": {
    "0": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "4": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ipv6-dualstack-check": {
    "0": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "4": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ipv6-pool": {
    "0": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ipv6-settings": {
    "0": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ipv6-slaac": {
    "0": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "1": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "2": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "3": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "4": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "5": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    },
    "6": {
      "f": "ipv6.jpg",
      "w": "IPv6"
    }
  },
  "ppp-pptp-server": {
    "0": {
      "f": "ppp.jpg",
      "w": "PPP"
    },
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    }
  },
  "ppp-sstp-server": {
    "0": {
      "f": "ppp.jpg",
      "w": "PPP"
    },
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    },
    "5": {
      "f": "l2tp-server.jpg",
      "w": "PPP → L2TP Server"
    }
  },
  "ppp-addresses": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    }
  },
  "ppp-keepalive-mtu": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    }
  },
  "vpn-ipsec-ikev2": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "6": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "7": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    }
  },
  "vpn-tunnels": {
    "0": {
      "f": "interfaces.jpg",
      "w": "Interfaces"
    },
    "1": {
      "f": "eth.jpg",
      "w": "Interfaces → Ethernet"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "bonding.jpg",
      "w": "Interfaces → Bonding"
    },
    "4": {
      "f": "vrrp.jpg",
      "w": "Interfaces → VRRP"
    },
    "5": {
      "f": "lte.jpg",
      "w": "Interfaces → LTE"
    }
  },
  "vpn-zerotier": {},
  "vpn-ipsec-policy": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    }
  },
  "vpn-ipsec-keys": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "vpn-pptp": {
    "0": {
      "f": "ppp.jpg",
      "w": "PPP"
    },
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    }
  },
  "vpn-sstp": {
    "0": {
      "f": "ppp.jpg",
      "w": "PPP"
    },
    "1": {
      "f": "ppp-profiles.jpg",
      "w": "PPP → Profiles"
    },
    "2": {
      "f": "ppp-secrets.jpg",
      "w": "PPP → Secrets"
    },
    "3": {
      "f": "ppp-active.jpg",
      "w": "PPP → Active Connections"
    },
    "4": {
      "f": "pppoe-server.jpg",
      "w": "PPP → PPPoE Server"
    },
    "5": {
      "f": "l2tp-server.jpg",
      "w": "PPP → L2TP Server"
    }
  },
  "vpn-firewall": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    }
  },
  "vpn-troubleshoot": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "mpls-ldp": {},
  "mpls-vpls": {},
  "mpls-troubleshoot": {},
  "wifi-capsman": {
    "0": {
      "f": "wifi.jpg",
      "w": "WiFi"
    },
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    },
    "5": {
      "f": "wifi-sniffer.jpg",
      "w": "WiFi → Sniffer"
    }
  },
  "wifi-legacy": {},
  "wifi-slow": {
    "0": {
      "f": "wifi.jpg",
      "w": "WiFi"
    },
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    }
  },
  "wifi-power": {
    "0": {
      "f": "wifi.jpg",
      "w": "WiFi"
    },
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    },
    "5": {
      "f": "wifi-sniffer.jpg",
      "w": "WiFi → Sniffer"
    },
    "6": {
      "f": "wifi.jpg",
      "w": "WiFi"
    },
    "7": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "8": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    }
  },
  "rt-tables": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-rules": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-ospf": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "4": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "5": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-bgp": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "4": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "5": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-rip": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-filters": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-bfd": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-ospf-areas": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "4": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-nexthops": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-prefix-lists": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "4": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-bgp-templates": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "rt-igmp-proxy": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "routing-policy": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "6": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    }
  },
  "q-tree": {
    "0": {
      "f": "queues.jpg",
      "w": "Queues → Simple Queues"
    },
    "1": {
      "f": "simple-new.jpg",
      "w": "Queues → Simple Queues → New"
    },
    "2": {
      "f": "queue-types.jpg",
      "w": "Queues → Queue Types"
    },
    "3": {
      "f": "queue-iface.jpg",
      "w": "Queues → Interface Queues"
    },
    "4": {
      "f": "queues.jpg",
      "w": "Queues → Simple Queues"
    }
  },
  "queue-cake": {
    "0": {
      "f": "queues.jpg",
      "w": "Queues → Simple Queues"
    },
    "1": {
      "f": "simple-new.jpg",
      "w": "Queues → Simple Queues → New"
    },
    "2": {
      "f": "queue-types.jpg",
      "w": "Queues → Queue Types"
    },
    "3": {
      "f": "queue-iface.jpg",
      "w": "Queues → Interface Queues"
    },
    "4": {
      "f": "queues.jpg",
      "w": "Queues → Simple Queues"
    },
    "5": {
      "f": "simple-new.jpg",
      "w": "Queues → Simple Queues → New"
    }
  },
  "sys-clock": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-certificates": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    },
    "5": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-files": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-logging": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-packages": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-routerboard": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-scheduler": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-scripts": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-resources": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-health": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-watchdog": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-autoupgrade": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-license": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-note-leds": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-history": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-lets-encrypt": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-log-remote": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-ports": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-reboot": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "sys-user-policy": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "tool-ping": {},
  "tool-traceroute": {},
  "tool-torch": {},
  "tool-profiler": {},
  "tool-sniffer": {
    "0": {
      "f": "wifi-sniffer.jpg",
      "w": "WiFi → Sniffer"
    },
    "1": {
      "f": "wifi-sniffer.jpg",
      "w": "WiFi → Sniffer"
    },
    "2": {
      "f": "wifi-sniffer.jpg",
      "w": "WiFi → Sniffer"
    },
    "3": {
      "f": "wifi-sniffer.jpg",
      "w": "WiFi → Sniffer"
    },
    "4": {
      "f": "wifi-sniffer.jpg",
      "w": "WiFi → Sniffer"
    }
  },
  "tool-netwatch": {},
  "tool-graphing": {},
  "tool-bwtest": {},
  "tool-trafficgen": {},
  "tool-email-wol": {},
  "tool-romon": {},
  "tool-fetch": {},
  "tool-netwatch-script": {},
  "tool-latency-monitor": {},
  "tool-ipscan": {},
  "tool-traffic-monitor": {},
  "tool-sms": {},
  "container-basics": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    },
    "4": {
      "f": "system.jpg",
      "w": "System"
    },
    "5": {
      "f": "system.jpg",
      "w": "System"
    },
    "6": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "romon-netinstall": {},
  "task-lan-internet": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "6": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "7": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "8": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "9": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    }
  },
  "task-port-forward": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    }
  },
  "task-pcc": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "6": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    }
  },
  "task-qos": {
    "0": {
      "f": "queues.jpg",
      "w": "Queues → Simple Queues"
    }
  },
  "task-hotspot-vouchers": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "6": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    }
  },
  "task-capsman": {
    "0": {
      "f": "wifi.jpg",
      "w": "WiFi"
    },
    "1": {
      "f": "wifi-new.jpg",
      "w": "WiFi → New"
    },
    "2": {
      "f": "wifi-security.jpg",
      "w": "WiFi → Security"
    },
    "3": {
      "f": "wifi-access-list.jpg",
      "w": "WiFi → Access List"
    },
    "4": {
      "f": "wifi-wps.jpg",
      "w": "WiFi → WPS"
    },
    "5": {
      "f": "wifi-sniffer.jpg",
      "w": "WiFi → Sniffer"
    },
    "6": {
      "f": "wifi.jpg",
      "w": "WiFi"
    }
  },
  "task-protect-router": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    }
  },
  "task-tenants": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "2": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "3": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "4": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "5": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    },
    "6": {
      "f": "vlan.jpg",
      "w": "Interfaces → VLAN"
    }
  },
  "task-monitoring": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    },
    "4": {
      "f": "ip-services.jpg",
      "w": "IP → Services"
    },
    "5": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    }
  },
  "task-backup-automation": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "task-recover-access": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "task-bgp-multihome": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "4": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "5": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "6": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "task-iptv": {
    "0": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "1": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "2": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "3": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "4": {
      "f": "routing.jpg",
      "w": "Routing"
    },
    "5": {
      "f": "routing.jpg",
      "w": "Routing"
    }
  },
  "task-audit-checkup": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    }
  },
  "task-snmp-zabbix": {
    "0": {
      "f": "ip-address.jpg",
      "w": "IP → Addresses"
    },
    "1": {
      "f": "ip-dhcp-server.jpg",
      "w": "IP → DHCP Server"
    },
    "2": {
      "f": "ip-dns.jpg",
      "w": "IP → DNS"
    },
    "3": {
      "f": "ip-routes.jpg",
      "w": "IP → Routes"
    }
  },
  "task-config-versioning": {
    "0": {
      "f": "system.jpg",
      "w": "System"
    },
    "1": {
      "f": "system.jpg",
      "w": "System"
    },
    "2": {
      "f": "system.jpg",
      "w": "System"
    },
    "3": {
      "f": "system.jpg",
      "w": "System"
    }
  }
};
