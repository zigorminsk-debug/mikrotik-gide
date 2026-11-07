#!/usr/bin/env bash
# Снимает окна настоящего Winbox 4, подключённого к CHR в QEMU.
#
#   mode=calibrate — пройти по Y-координатам дерева, сохранить по кадру на клик
#                    и записать, какое окно открылось. По этим кадрам видно,
#                    где именно в меню лежит каждый раздел.
#   mode=capture   — снять окна по списку shot-list.txt (name|y|suby|new).
#
# Ничего не «дорисовывает»: import снимает настоящий экран Xvfb.
set -uo pipefail

MODE=${1:-capture}
OUT=${OUT:-docs/shots}
LIST=${LIST:-.github/scripts/shot-list.txt}
mkdir -p "$OUT/jpg"
: > "$OUT/manifest.txt"

log() { echo "$*" >> "$OUT/report.txt"; echo "$*"; }

# --- главное окно Winbox (в заголовке WinBox); диалоги не подходят ---
appwin() {
  best=""; bestarea=0
  for w in $(xdotool search --name 'WinBox' 2>/dev/null); do
    eval "$(xdotool getwindowgeometry --shell "$w" 2>/dev/null)" || continue
    area=$((WIDTH * HEIGHT))
    if [ "$area" -gt "$bestarea" ]; then bestarea=$area; best=$w; fi
  done
  echo "$best"
}

geom() {
  WID=$(appwin)
  eval "$(xdotool getwindowgeometry --shell "$WID" 2>/dev/null)"
  TITLE=$(xdotool getwindowname "$WID" 2>/dev/null || true)
}

titles() {
  for w in $(xdotool search --name '.' 2>/dev/null); do
    xdotool getwindowname "$w" 2>/dev/null || true
  done | sed '/^$/d' | sort -u | paste -sd'|' -
}

shot() { import -window root "$OUT/$1.png" 2>/dev/null || true; sleep 0.3; }

# вырезаем окно приложения из полного экрана: так на кадре нет рабочего стола
shot_win() {
  geom
  import -window root "$OUT/raw-$1.png" 2>/dev/null || true
  convert "$OUT/raw-$1.png" -crop "${WIDTH}x${HEIGHT}+${X}+${Y}" +repage "$OUT/$1.png" 2>/dev/null || \
    cp "$OUT/raw-$1.png" "$OUT/$1.png"
  rm -f "$OUT/raw-$1.png"
  convert "$OUT/$1.png" -resize 900x -quality 82 "$OUT/jpg/$1.jpg" 2>/dev/null || true
  echo "$1|1|$(titles)" >> "$OUT/manifest.txt"
}


# 0 — в области окна только серый рабочий стол, >5 — открылось окно со списком
content_sd() {
  geom
  import -window root /tmp/wb/chk.png 2>/dev/null || { echo 0; return; }
  convert /tmp/wb/chk.png -crop "600x380+$((X + 200))+$((Y + 60))" +repage \
    -format "%[fx:int(standard_deviation*1000)]" info: 2>/dev/null || echo 0
}

# клик по пункту дерева с проверкой: не открылось — пробуем двойной клик
click_item() {   # y [suby]
  local y=$1 suby=${2:-} sd
  geom
  xdotool mousemove $((X + 60)) $((Y + y)) click 1; sleep 2
  sd=$(content_sd)
  log "  [click] y=+$y → sd=$sd"
  if [ "${sd:-0}" -le 5 ]; then
    xdotool mousemove $((X + 60)) $((Y + y)) click --repeat 2 --delay 120 1; sleep 3
    sd=$(content_sd); log "  [click] y=+$y двойной → sd=$sd"
  fi
  [ -n "$suby" ] || { echo "$sd"; return; }
  xdotool mousemove $((X + 200)) $((Y + suby)) click 1; sleep 2
  local sd2; sd2=$(content_sd)
  log "  [click] подменю y=+$suby → sd=$sd2"
  echo "$sd2"
}

restart_winbox() {
  pkill -f '/WinBox' 2>/dev/null || true
  sleep 2
  ( cd /tmp/wb/winbox && QT_QPA_PLATFORM=xcb QT_QUICK_BACKEND=software \
      QT_OPENGL=software LIBGL_ALWAYS_SOFTWARE=1 nohup ./WinBox >> /tmp/wb/winbox.log 2>&1 & )
  sleep 10
}

# --- подключение: адрес вводим в поле, дальше Enter, кнопка, Tab+Enter ---
connect() {
  geom
  log "  [connect] окно=$TITLE ${WIDTH}x${HEIGHT}+${X}+${Y}"
  xdotool windowactivate --sync "$WID" 2>/dev/null || xdotool windowfocus --sync "$WID" 2>/dev/null || true
  sleep 1
  # поле Connect to
  xdotool mousemove $((X + 300)) $((Y + 291)) click 1; sleep 1
  xdotool key --clearmodifiers ctrl+a
  xdotool type --delay 50 '127.0.0.1'; sleep 1
  xdotool key Return; sleep 9
  if connected; then return 0; fi
  # кнопка Connect (если Enter не сработал)
  xdotool mousemove $((X + 182)) $((Y + 431)) click 1; sleep 9
  if connected; then return 0; fi
  # третий способ: из поля ввода Tab×2 до кнопки и Enter
  xdotool mousemove $((X + 300)) $((Y + 291)) click 1; sleep 1
  xdotool key Tab Tab Return; sleep 9
  connected
}

# подключились или нет — решаем по картинке: экран стола отличается от логина
connected() {
  geom
  import -window root "$OUT/00-check.png" 2>/dev/null || true
  local d
  d=$(compare -metric AE "$OUT/00-login.png" "$OUT/00-check.png" null: 2>&1 | tr -dc '0-9' || true)
  d=${d:-0}
  log "  [connect] отличие от экрана входа: $d пикселей"
  [ "$d" -gt 20000 ]
}

# --- клик по пункту дерева (и подменю), затем кадр ---
open_item() {   # name y suby new
  local name=$1 y=$2 suby=$3 new=${4:-0} sd
  geom
  xdotool windowactivate --sync "$WID" 2>/dev/null || true
  sd=$(click_item "$y" "$( [ "$suby" = "-" ] && echo '' || echo "$suby" )")
  if [ "${sd:-0}" -le 5 ]; then
    log "  ПУСТО: $name (пункт y=+$y) — окно не открылось, кадр не сохраняем"
    echo "$name|0|-" >> "$OUT/manifest.txt"
    xdotool key Escape 2>/dev/null || true
    return 1
  fi
  if [ "$new" = "1" ]; then
    xdotool mousemove $((X + 182)) $((Y + 164)) click 1; sleep 2
    local sd2; sd2=$(content_sd)
    log "  [click] New → sd=$sd2"
    if [ "${sd2:-0}" -le 5 ]; then
      log "  ПУСТО: $name (кнопка New не нажалась)"
      echo "$name|0|-" >> "$OUT/manifest.txt"
      xdotool key Escape 2>/dev/null || true
      return 1
    fi
  fi
  shot_win "$name"
  log "  снято: $name (пункт y=+$y$( [ "$suby" != "-" ] && echo ", подменю y=+$suby" )$( [ "$new" = "1" ] && echo ', New' ))"
  xdotool key Escape 2>/dev/null || true
  sleep 1
}

# ------------------------------------------------------------------ старт ---
geom
shot 00-login

if ! connect; then
  log "  подключение не удалось: дальше снимать нечего"
  exit 0
fi
log "  подключение есть, окно=$TITLE"
sleep 2
shot_win 03-desktop

case "$MODE" in
  calibrate)
    # Проходим по дереву с шагом 23 px и записываем, какое окно открывается.
    for y in 55 81 105 128 151 175 198 221 245 268 292 315 338 362 385 409 431 454 477 500 523; do
      geom
      xdotool mousemove $((X + 60)) $((Y + y)) click 1; sleep 2
      shot "menu-y$y"
      log "  menu-y$y → окна: $(titles)"
      xdotool key Escape 2>/dev/null || true
      sleep 1
    done
    ;;
  probe)
    # Разведка: как Winbox 4 открывает ПОДМЕНЮ и есть ли поиск по меню.
    # Кадры сохраняем в JPEG — их немного, но они нужны, чтобы вычитать координаты.
    shot_jpg() {
      import -window root "/tmp/wb/p-$1.png" 2>/dev/null || true
      convert "/tmp/wb/p-$1.png" -resize 1100x -quality 80 "$OUT/probe-$1.jpg" 2>/dev/null || true
    }
    for pair in interfaces:105 ip:243 system:335 tools:496 ; do
      name=${pair%%:*}; y=${pair##*:}
      geom
      xdotool windowactivate --sync "$WID" 2>/dev/null || true
      xdotool mousemove $((X + 60)) $((Y + y)) click 1; sleep 2
      shot_jpg "$name-1-click"
      xdotool mousemove $((X + 127)) $((Y + y)) click 1; sleep 2
      shot_jpg "$name-2-arrow"
      # наводим мышь на пункт — вдруг подменю появляется по наведению
      xdotool mousemove $((X + 40)) $((Y + y)); sleep 2
      shot_jpg "$name-3-hover"
      xdotool mousemove $((X + 180)) $((Y + y + 23)) click 1; sleep 2
      shot_jpg "$name-4-row"
      log "  probe-$name: сняты click/arrow/hover/row"
      xdotool key Escape 2>/dev/null || true; sleep 0.5
      xdotool key Escape 2>/dev/null || true; sleep 1
    done

    # поиск по меню: лупа в шапке окна
    geom
    xdotool mousemove $((X + 287)) $((Y + 16)) click 1; sleep 1
    xdotool type --delay 60 'filter'; sleep 2
    shot_jpg "search-1-typed"
    xdotool key Return; sleep 3
    shot_jpg "search-2-enter"
    log "  probe-search: сняты typed/enter"
    ;;
  capture)
    n=0
    while IFS='|' read -r name y suby new; do
      case "$name" in ''|\#*) continue;; esac
      if [ $((n % 6)) -eq 0 ] && [ "$n" -gt 0 ]; then
        restart_winbox
        if ! connect; then log "  переподключение не удалось на $name"; break; fi
        sleep 2
      fi
      open_item "$name" "$y" "${suby:--}" "${new:-0}"
      n=$((n + 1))
    done < "$LIST"
    ;;
esac

log "=== готово, кадров: $(ls "$OUT"/jpg/*.jpg 2>/dev/null | wc -l) ==="
