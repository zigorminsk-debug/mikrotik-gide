# ============================================================================
#  mti-install.rsc — резервный канал на RouterOS 7.20+ (RB951G-2HnD)
#  ether1 (DHCP от провайдера) + lte1 (резерв).
#
#  ЗАПУСК:  /import file=mti-install.rsc
#
#  Повторный запуск безопасен: ничего не дублируется, существующее
#  обновляется на месте. Скрипт mti-failover НЕ пересоздаётся (было
#  remove+add → отсюда "bad command name mti-failover" в логе).
#
#  Тело скрипта передаётся блоком кода { }, поэтому переменные не
#  подставляются при установке, а сами скобки разбираются нативно.
# ============================================================================

:local wan1 "ether1"
:local wan2 "lte1"

# --- 1. Выключить задачи, которые пересоздавали скрипт -----------------------
:foreach s in=[/system scheduler find where on-event~"mti-apply"] do={
  /system scheduler disable $s
  :log info "mti-install: задача mti-apply выключена"
}

# --- 2. Убрать остатки нерабочей схемы (mangle + policy-таблица) -------------
#      В RouterOS 7 policy-таблица не VRF: пинг через неё не проходит.
:foreach m in=[/ip firewall mangle find where comment~"mti-probe"] do={
  /ip firewall mangle remove $m
}
:foreach r in=[/ip route find where comment~"mti-probe"] do={
  /ip route remove $r
}
:foreach r in=[/ip route find where comment~"mti-probe-link"] do={
  /ip route remove $r
}
:do {
  :foreach t in=[/routing table find where name="mti-probe"] do={
    /routing table remove $t
  }
} on-error={ :log info "mti-install: таблицы mti-probe не было" }

# --- 3. Каналы: distance задаётся у источника маршрута, а не у маршрута ------
#      Динамический маршрут DHCP (*80000005) править нельзя — RouterOS
#      пересоберёт его сам, как только изменится distance у клиента.
:if ([:len [/ip dhcp-client find where interface=$wan1]] = 0) do={
  /ip dhcp-client add interface=$wan1 add-default-route=yes default-route-distance=1 use-peer-dns=yes disabled=no
  :log info "mti-install: добавлен DHCP-клиент на ether1"
} else={
  /ip dhcp-client set [find where interface=$wan1] add-default-route=yes default-route-distance=1 disabled=no
}

#      LTE настраивается через APN-профиль: DHCP-клиент там динамический.
:if ([:len [/interface lte apn find where name="mti-wan-1-apn"]] = 0) do={
  /interface lte apn add name="mti-wan-1-apn" apn="" add-default-route=yes default-route-distance=2 use-peer-dns=no
} else={
  /interface lte apn set [find where name="mti-wan-1-apn"] add-default-route=yes default-route-distance=2 use-peer-dns=no
}
:if ([:len [/interface lte find where name=$wan2]] > 0) do={
  /interface lte set [find where name=$wan2] apn-profiles="mti-wan-1-apn" disabled=no
}

# --- 4. Маскарад на оба канала -----------------------------------------------
:foreach i in={$wan1; $wan2} do={
  :if ([:len [/ip firewall nat find where comment=("mti-wan-" . $i)]] = 0) do={
    /ip firewall nat add chain=srcnat out-interface=$i action=masquerade comment=("mti-wan-" . $i)
  }
}

# --- 5. Тело скрипта: обновляем source, запись не пересоздаём ----------------
#      Тело берём из файла mti-failover-body.rsc (Files → Upload):
#      /file get ... contents — это строка, разбор гарантирован.
:local body ""
:do {
  :set body [/file get [find where name="mti-failover-body.rsc"] contents]
} on-error={}
:if ([:len $body] > 0) do={
  :if ([:len [/system script find where name="mti-failover"]] = 0) do={
    /system script add name="mti-failover" policy=read,write,test source=$body
  } else={
    /system script set [find where name="mti-failover"] policy=read,write,test source=$body
  }
  :log info "mti-install: тело mti-failover обновлено"
} else={
  :log error "mti-install: нет файла mti-failover-body.rsc — загрузите его в Files, остальное уже настроено"
}

# --- 6. Планировщик: явный запуск, 10 секунд ---------------------------------
#      Явный "/system script run" даёт внятную ошибку вместо
#      "bad command name", если скрипт почему-то отсутствует.
:if ([:len [/system scheduler find where name="mti-failover"]] = 0) do={
  /system scheduler add name="mti-failover" start-time=startup interval=10s on-event="/system script run mti-failover" policy=read,write,test
} else={
  /system scheduler set [find where name="mti-failover"] start-time=startup interval=10s on-event="/system script run mti-failover" policy=read,write,test disabled=no
}

:log info "mti-install: готово. Проверка: /system script run mti-failover ; /log print where topics~\"script\""
