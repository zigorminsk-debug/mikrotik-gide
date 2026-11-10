# ============================================================================
#  mti-failover — тело скрипта для System → Scripts → mti-failover → Source
#  RouterOS 7.20+ (проверено на 7.22.3, RB951G-2HnD)
#
#  Вставляйте ЦЕЛИКОМ и многострочно (в поле Source, не в терминал одной
#  строкой): именно склейка строк через "\;" давала syntax error.
#
#  Как работает: основной канал проверяется пингом СВОЕГО шлюза из DHCP.
#  Трафик к шлюзу идёт по ether1 напрямую (on-link), поэтому проба честно
#  показывает состояние ether1, даже когда весь трафик уже ушёл на LTE.
#  Переключение — только distance у DHCP-клиента: динамический маршрут
#  (*80000005 и подобные) править нельзя, RouterOS его пересоберёт сам.
# ============================================================================

# --- настройки ---------------------------------------------------------------
:local wan1 "ether1"
:local wan2 "lte1"
:local distDown 20
:local distUp 1
:local fails 3
:local ups 6

# --- состояние между запусками ----------------------------------------------
:global mtiBad
:global mtiGood
:global mtiMode
:if ([:typeof $mtiBad] != "num") do={ :set mtiBad 0 }
:if ([:typeof $mtiGood] != "num") do={ :set mtiGood 0 }
:if ([:typeof $mtiMode] != "str") do={ :set mtiMode "main" }

# --- проба основного канала --------------------------------------------------
:local p1 0
:local c1 [/ip dhcp-client find where interface=$wan1]
:if ([:len $c1] > 0) do={
  :local gw1 [/ip dhcp-client get $c1 gateway]
  :if ([:typeof $gw1] = "ip") do={
    :set p1 [/ping $gw1 count=3 interval=200ms]
  }
}

# --- проба резервного канала (-1 = проверить не удалось) ---------------------
:local p2 -1
:local c2 [/ip dhcp-client find where interface=$wan2]
:if ([:len $c2] > 0) do={
  :local gw2 [/ip dhcp-client get $c2 gateway]
  :if ([:typeof $gw2] = "ip") do={
    :set p2 [/ping $gw2 count=3 interval=200ms]
  }
}

# --- серии: промах обнуляет счётчик возврата (защита от «качелей») ------------
:if ($p1 > 0) do={
  :set mtiGood ($mtiGood + 1)
  :set mtiBad 0
} else={
  :set mtiBad ($mtiBad + 1)
  :set mtiGood 0
}

# --- переключение -------------------------------------------------------------
:if ($mtiMode = "main") do={
  :if ($mtiBad >= $fails) do={
    :if ($p2 != 0) do={
      /ip dhcp-client set [find where interface=$wan1] default-route-distance=$distDown
      :set mtiMode "backup"
      :log warning "mti-failover: основной канал не отвечает — включён резервный"
    } else={
      :log error "mti-failover: не отвечает ни основной, ни резервный канал"
    }
  }
} else={
  :if ($mtiGood >= $ups) do={
    /ip dhcp-client set [find where interface=$wan1] default-route-distance=$distUp
    :set mtiMode "main"
    :log info "mti-failover: основной канал устойчив — вернулся на него"
  }
}
