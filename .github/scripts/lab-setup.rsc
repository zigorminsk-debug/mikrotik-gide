# lab-setup.rsc — учебный стенд для съёмки Winbox 4.
#
# Зачем: снимок под шагом обязан показывать ТЕ ЖЕ значения, что написаны в
# инструкции. Пустой CHR этого не может, поэтому перед съёмкой роутер
# настраивается ровно теми объектами, которые фигурируют в статьях:
# bridge-lan, wg-office, 10.10.10.5/32, guest-limit 20M/20M и т. д.
#
# Применяется по API скриптом .github/scripts/ros-api.py (строка за строкой,
# отказ одной строки не отменяет остальные). Порядок важен: сначала
# интерфейсы и адреса, потом службы, и только в конце — firewall.
#
#.Graph: ether1-wan — управляющий интерфейс QEMU (10.0.2.15/24 по DHCP),
# ether2…ether5 — дополнительные сетевые карты QEMU, чтобы в мосту были
# настоящие порты, а не выдуманные имена.

# ---------------------------------------------------------- имя и интерфейсы --
/system/identity/set name=office-gw-01
/interface/ethernet/set ether1 name=ether1-wan
/interface/list/add name=WAN
/interface/list/add name=LAN
/interface/list/add name=VPN
/interface/list/member/add list=WAN interface=ether1-wan

# ------------------------------------------------------------------- мосты ----
# if-bridge, if-bridge-vlan, task-vlan-office, ip-address
/interface/bridge/add name=bridge-lan protocol-mode=rstp vlan-filtering=no comment="LAN офиса"
/interface/bridge/add name=bridge-clients protocol-mode=rstp vlan-filtering=no comment="клиенты PPPoE"
/interface/bridge/add name=bridge-guest protocol-mode=rstp vlan-filtering=no comment="гостевой сегмент"
/interface/bridge/port/add bridge=bridge-lan interface=ether2 pvid=1 edge=yes
/interface/bridge/port/add bridge=bridge-lan interface=ether4 pvid=20 edge=yes bpdu-guard=yes
/interface/bridge/port/add bridge=bridge-clients interface=ether3
/interface/bridge/port/add bridge=bridge-guest interface=ether5
/interface/bridge/vlan/add bridge=bridge-lan vlan-ids=10 tagged=ether2,ether3 comment="офис"
/interface/bridge/vlan/add bridge=bridge-lan vlan-ids=20 tagged=ether2,ether5 comment="гости и IoT"
/interface/vlan/add name=vlan10-office vlan-id=10 interface=bridge-lan comment="офис"

# --------------------------------------------------------------- WireGuard ----
# vpn-wireguard (wg0:13231), wg-site (адрес клиента в туннеле)
/interface/wireguard/add name=wg0 listen-port=13231 mtu=1420 comment="road warrior"
/interface/wireguard/add name=wg-office listen-port=13232 mtu=1420 comment="туннель в офис"
/interface/wireguard/add name=wg-vpn listen-port=13233 mtu=1420 comment="VPN"
/interface/wireguard/peers/add interface=wg-office public-key=SZgf5J5G/mNr05TIRenGHJOsOGwQs5IyiJV0a32rhGk= endpoint-address=203.0.113.20 endpoint-port=13231 allowed-address=10.10.10.0/24,192.168.10.0/24 persistent-keepalive=25 comment=office
/interface/wireguard/peers/add interface=wg0 public-key=/06uETOaxyvDrZc1SjobXtJftevP9FhZS4VvKvndg0M= allowed-address=10.10.10.2/32 comment=phone
# if-detect#1, if-lists#1: списки WAN/LAN/VPN с настоящими участниками
/interface/list/member/add list=LAN interface=bridge-lan
/interface/list/member/add list=VPN interface=wg-vpn

# ------------------------------------------------------------------ адреса ----
# ip-address, ip-secondary-address, wg-site#4, wg-server#3, ipv6-address
/ip/address/add address=192.168.88.1/24 interface=bridge-lan comment="LAN офиса"
/ip/address/add address=192.168.10.1/24 interface=bridge-lan comment="офисный VLAN"
/ip/address/add address=192.168.20.1/24 interface=bridge-lan comment="гостевой VLAN"
/ip/address/add address=10.20.0.1/24 interface=bridge-guest comment="гости"
/ip/address/add address=203.0.113.10/24 interface=ether1-wan comment=WAN
/ip/address/add address=10.10.10.1/24 interface=wg0 comment="адрес сервера"
/ip/address/add address=10.10.10.5/32 interface=wg-office comment="туннель в офис"
/ip/address/add address=10.99.0.1/24 interface=bridge-lan comment="VPN клиенты"
/ipv6/address/add address=2a01:db8:1::1/64 interface=bridge-lan advertise=no
/ipv6/address/add address=2001:db8:10::1/64 interface=bridge-lan advertise=no

# ---------------------------------------------------------------- маршруты ----
# ip-routes#1 и task-failover#1: флаг A S и «203.0.113.1 reachable».
# Шлюз лежит в подключённой сети 203.0.113.0/24, поэтому достижим.
# Отдельный маршрут до 8.8.8.8 через шлюз QEMU нужен, чтобы Netwatch в
# лаборатории действительно показывал «up», а не «down».
/ip/dhcp-client/set numbers=0 add-default-route=no
/ip/route/add dst-address=0.0.0.0/0 gateway=203.0.113.1 distance=1 comment="основной канал"
/ip/route/add dst-address=192.168.10.0/24 gateway=wg-office distance=1 comment="сеть офиса"
/ip/route/add dst-address=8.8.8.8/32 gateway=10.0.2.2 distance=1 comment="проба канала"
/ip/route/add dst-address=1.1.1.1/32 gateway=10.0.2.2 distance=1 comment="проба канала"
/routing/table/add name=probe-wan1 fib
/routing/table/add name=probe-wan2 fib

# --------------------------------------------------------------------- DNS ----
# task-dns-security#1: DoH, свои серверы, кеш 4096 KiB, max TTL 1d
/ip/dns/set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes cache-size=4096 cache-max-ttl=1d use-doh-server=https://cloudflare-dns.com/dns-query verify-doh-cert=no
/ip/dns/static/add name=printer.office.lan address=192.168.88.20 ttl=1d comment="принтер"

# ------------------------------------------------------------ пулы и DHCP -----
# ip-pool#1, ppp-addresses#1, ppp-l2tp-server#2, ip-dhcp-server#1
/ip/pool/add name=pool-lan ranges=192.168.88.10-192.168.88.254
/ip/pool/add name=ppp-clients ranges=10.255.0.10-10.255.0.250
/ip/pool/add name=pool-pppoe ranges=10.255.0.10-10.255.0.250
/ip/pool/add name=vpn-pool ranges=10.99.0.100-10.99.0.199
/ip/pool/add name=pool-guest ranges=10.20.0.10-10.20.0.100
/ip/pool/add name=ovpn-pool ranges=10.98.0.100-10.98.0.150
/ip/dhcp-server/add name=dhcp-lan interface=bridge-lan address-pool=pool-lan lease-time=1d add-arp=yes disabled=no
/ip/dhcp-server/network/add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=1.1.1.1,8.8.8.8 comment="офис"
/ip/dhcp-server/add name=dhcp-guest interface=bridge-guest address-pool=pool-guest lease-time=4h disabled=no
/ip/dhcp-server/network/add address=10.20.0.0/24 gateway=10.20.0.1 dns-server=1.1.1.1 comment="гости"

# --------------------------------------------------------------------- PPP ----
# ppp-profiles#1, ppp-limits#1, ppp-l2tp-server#3/#4/#5, ppp-secrets#1,
# ppp-pppoe-server#1, task-pppoe-isp#1
/ppp/profile/add name=pppoe-clients local-address=10.255.0.1 remote-address=pool-pppoe dns-server=1.1.1.1,8.8.8.8
/ppp/profile/add name=vpn-staff local-address=10.99.0.1 remote-address=vpn-pool dns-server=192.168.88.1
/ppp/profile/add name=staff local-address=10.99.0.1 remote-address=10.99.0.100 rate-limit=10M/10M
/ppp/profile/add name=ovpn-clients local-address=10.98.0.1 remote-address=ovpn-pool dns-server=192.168.88.1
/ppp/secret/add name=client01 password=Cl1ent-2026 service=pppoe profile=pppoe-clients comment="кабинет 1"
/ppp/secret/add name=ivanov password=S3cret-2026 service=l2tp profile=vpn-staff comment="Иванов"
/interface/l2tp-server/server/set enabled=yes use-ipsec=required ipsec-secret=d83n2-officE-vpn default-profile=vpn-staff authentication=mschap2
/interface/pppoe-server/server/set service-name=isp interface=bridge-clients default-profile=pppoe-clients enabled=yes authentication=mschap2

# ------------------------------------------------------------------ очереди ---
# q-simple#1, q-types#1, q-cake#1
/queue/type/add name=cake-bulk kind=cake cake-bandwidth=100M
/queue/type/add name=cake-upload kind=cake cake-flowmode=besteffort
/queue/type/add name=cake-download kind=cake cake-flowmode=besteffort
/queue/simple/add name=guest-limit target=10.20.0.0/24 max-limit=20M/20M burst-limit=40M/40M priority=8/8 comment="гости"
/queue/simple/add name=voip-prio target=192.168.88.40/32 max-limit=10M/10M priority=1/1 comment="телефония"
/queue/simple/add name=lan-shape target=192.168.10.0/24 max-limit=95M/95M queue=cake-upload/cake-download comment="офис"

# ------------------------------------------------------- VRRP, VXLAN, списки --
# if-vrrp#1, if-vxlan#1
/interface/vrrp/add name=vrrp-lan interface=bridge-lan vrid=10 priority=200
/interface/vxlan/add name=vxlan-10 vni=10 port=4789 mtu=1450
/interface/vxlan/vteps/add remote-ip=10.99.0.2

# -------------------------------------------------------------- пользователи --
# sys-users#1, sys-user-policy#1
/user/group/add name=monitoring policy=read,api,winbox,test
/user/group/add name=operator policy=read,winbox,api,test
/user/add name=zabbix group=monitoring password=Zabb1x-2026 address=192.168.88.50/32 comment="мониторинг"
/user/add name=operator1 group=operator password=0perator-2026 address=192.168.10.0/24 comment="дежурный"
/user/add name=backup-bot group=read password=B0t-2026 address=192.168.88.0/24 comment="бэкапы"

# ---------------------------------------------------- скрипты и планировщик ---
# sys-scripts#1, sys-scheduler#1, sys-reboot#1, task-config-versioning#1
/system/script/add name=backup-send policy=read,write,ftp,test source="/system backup save name=auto; /tool fetch url=ftp://192.168.88.50/auto.backup upload=yes user=backup password=backup"
/system/script/add name=export-daily policy=read,write,ftp,test source="/export file=daily-export"
/system/script/add name=failover-up policy=read,write,test source=":log info \"wan-failover: основной канал устойчив — вернулся на него\""
/system/script/add name=failover-down policy=read,write,test source=":log warning \"wan-failover: основной канал не отвечает — включён резервный\""
/system/script/add name=wan-failover policy=read,write,test source=":local wan1If \"ether1-wan\"\n:local fails 2\n:log info \"wan-failover: проверка каналов\""
/system/scheduler/add name=nightly-backup start-time=03:00:00 interval=1d on-event="/system backup save name=backups/auto" comment="ночной бэкап"
/system/scheduler/add name=nightly-reboot start-time=04:00:00 interval=7d on-event="/system reboot" comment="перезагрузка"
/system/scheduler/add name=nightly start-time=03:30:00 interval=1d on-event="/system script run backup-send"
/system/scheduler/add name=daily-export start-time=03:30:00 interval=1d on-event="/system script run export-daily"
/system/scheduler/add name=wan-failover start-time=startup interval=00:00:10 on-event=wan-failover comment="проверка каналов"

# ------------------------------------------------------------------ журнал ----
# sys-log-remote#1: действие remote → 192.168.10.50:514
/system/logging/action/set remote remote-address=192.168.10.50 remote-port=514
/system/logging/action/add name=syslog-srv target=remote remote-address=192.168.88.50 remote-port=514
/system/logging/add topics=firewall,info action=syslog-srv
/system/logging/add topics=ipsec,error action=memory
/system/logging/add topics=wireguard action=memory prefix=wg

# ---------------------------------------------------------------- Netwatch ----
# tool-netwatch#1: 8.8.8.8, icmp, 10s, статус up
/tool/netwatch/add host=8.8.8.8 type=icmp interval=10s timeout=1s down-script="/ip route disable [find comment=\"main\"]" up-script="/ip route enable [find comment=\"main\"]" comment="основной канал"

# ------------------------------------------------------------------ файлы -----
# start-backup#1, task-migration#1: настоящие файлы бэкапа и экспорта
/system/backup/save name=backups/2026-11-02
/system/backup/save name=backups/first-config
/export file=config-2026-11-03
/export file=old-full

# ------------------------------------------------------------- mangle и NAT ----
# task-wan-failover#8/#9, ip-firewall-mangle#1, ppp-keepalive-mtu#1
/ip/firewall/mangle/add chain=output dst-address=1.1.1.1 action=mark-routing new-routing-mark=probe-wan1 passthrough=no comment="wan-failover probe 1"
/ip/firewall/mangle/add chain=output dst-address=8.8.8.8 action=mark-routing new-routing-mark=probe-wan2 passthrough=no comment="wan-failover probe 2"
/ip/firewall/mangle/add chain=prerouting protocol=udp dst-port=5060 action=mark-connection new-connection-mark=conn-voip passthrough=yes comment="voip traffic"
/ip/firewall/mangle/add chain=prerouting connection-mark=conn-voip action=mark-packet new-packet-mark=voip passthrough=no comment="for queue tree"
/ip/firewall/mangle/add chain=forward protocol=tcp tcp-flags=syn action=change-mss new-mss=1360 passthrough=yes comment="MSS для VPN"
# ip-firewall-nat#1, task-port-forward#1, ppp-l2tp-server#7
/ip/firewall/nat/add chain=srcnat out-interface-list=WAN action=masquerade comment="internet for LAN"
/ip/firewall/nat/add chain=srcnat src-address=10.99.0.0/24 out-interface-list=WAN action=masquerade comment="интернет для VPN"
/ip/firewall/nat/add chain=dstnat protocol=tcp dst-port=8080 in-interface-list=WAN action=dst-nat to-addresses=192.168.88.50 to-ports=80 comment="camera web"
/ip/firewall/nat/add chain=srcnat protocol=tcp dst-port=80 src-address=192.168.88.0/24 action=masquerade comment=hairpin

# ---------------------------------------------------------------- firewall ----
# Ставится последним. Первое правило — разрешить управляющую сеть стенда,
# иначе правило «drop all from WAN» оборвёт и Winbox, и API посреди съёмки.
# wg-server#4, wg-site#6, ppp-l2tp-server#6, ppp-ovpn-server#10
/ip/firewall/filter/add chain=input src-address=10.0.2.0/24 action=accept comment="управление стендом"
/ip/firewall/filter/add chain=input connection-state=established,related action=accept comment="accept established,related"
/ip/firewall/filter/add chain=input connection-state=invalid action=drop comment="drop invalid"
/ip/firewall/filter/add chain=input protocol=udp dst-port=13231 action=accept comment=wireguard
/ip/firewall/filter/add chain=input protocol=tcp dst-port=8291 action=accept comment="winbox from LAN"
/ip/firewall/filter/add chain=input protocol=udp dst-port=500 action=accept comment="ipsec ike"
/ip/firewall/filter/add chain=input protocol=udp dst-port=4500 action=accept comment="ipsec nat-t"
/ip/firewall/filter/add chain=input protocol=esp action=accept comment="ipsec esp"
/ip/firewall/filter/add chain=input protocol=tcp dst-port=1194 action=accept comment=openvpn
/ip/firewall/filter/add chain=forward in-interface=wg-office action=accept comment="from office tunnel"
/ip/firewall/filter/add chain=forward out-interface=wg-office action=accept comment="to office tunnel"
/ip/firewall/filter/add chain=input in-interface-list=WAN action=drop comment="drop all from WAN"
/ip/firewall/filter/add chain=forward in-interface=bridge-guest out-interface=bridge-lan action=drop comment="гости не видят офис"

# Мост-фильтр: if-bridge-nat#1, task-rogue-dhcp#1
/interface/bridge/filter/add chain=forward bridge=bridge-guest action=drop comment="гостевой мост изолирован"
/interface/bridge/filter/add chain=forward in-interface=ether3 protocol=udp dst-port=67,68 action=drop comment="чужой DHCP"
