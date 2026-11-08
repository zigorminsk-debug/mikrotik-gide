#!/usr/bin/env python3
"""winbox-nav.py — открывает окна настоящего Winbox 4 и снимает их.

Как работает:
  1) ждёт, пока RouterOS в QEMU поднимется, и входит в роутер;
  2) окно ищется по названию: tesseract читает экран, скрипт щёлкает по
     найденному месту. Сначала — раздел в дереве, затем подменю или вкладка,
     для диалогов — кнопка New;
  3) кадр сохраняется только если окно реально открылось (проверяется
     разброс яркости области содержимого).

Список задач — файл «имя|IP → Firewall → NAT|new», по строке на окно.
Запуск: python3 winbox-nav.py docs/shots .github/scripts/shot-list.txt
"""
import os
import re
import subprocess
import sys
import time

OUT = sys.argv[1] if len(sys.argv) > 1 else 'docs/shots'
TASKS = sys.argv[2] if len(sys.argv) > 2 else '.github/scripts/shot-list.txt'
JPG = os.path.join(OUT, 'jpg')
TMP = '/tmp/wb/nav'
for _d in (JPG, TMP, OUT):
    os.makedirs(_d, exist_ok=True)
REPORT = os.path.join(OUT, 'report.txt')
MANIFEST = os.path.join(OUT, 'manifest.txt')

WB_DIR = '/tmp/wb/winbox'
QT_ENV = ('QT_QPA_PLATFORM=xcb QT_QUICK_BACKEND=software QT_OPENGL=software '
          'LIBGL_ALWAYS_SOFTWARE=1 QT_SCALE_FACTOR=0.75')

# Высоты пунктов дерева относительно окна — на случай, если OCR не разобрал
# дерево. Измерены по снимкам прошлых прогонов.
TREE_Y = {
    'quick set': 62, 'wifi': 87, 'interfaces': 111, 'wireguard': 135,
    'bridge': 160, 'ppp': 185, 'switch': 209, 'mesh': 236, 'ip': 260,
    'ipv6': 285, 'mpls': 310, 'routing': 333, 'system': 358, 'queues': 383,
    'dot1x': 407, 'files': 432, 'log': 458, 'new terminal': 483,
    'radius': 508, 'tools': 531,
}


# --------------------------------------------------------------- служебное ---
def log(msg):
    print(msg, flush=True)
    with open(REPORT, 'a', encoding='utf-8') as f:
        f.write('  ' + str(msg) + '\n')


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def clean(t):
    return t.lower().replace('ё', 'е').strip(' .,:;|·•<>()[]')


def name_slug(parts):
    return '-'.join(clean(p).replace(' ', '-') for p in parts)[:40]


def escape(times=2):
    """Escape закрывает окна и диалоги перед следующей задачей."""
    for _ in range(times):
        run(['xdotool', 'key', 'Escape'])
        time.sleep(0.4)


# ------------------------------------------------------------------- окно ----
def _geom_once():
    best, area = None, 0
    for wid in run(['xdotool', 'search', '--name', 'WinBox']).stdout.split():
        g = run(['xdotool', 'getwindowgeometry', '--shell', wid]).stdout
        d = dict(re.findall(r'^(\w+)=(\d+)$', g, re.M))
        if not d:
            continue
        a = int(d['WIDTH']) * int(d['HEIGHT'])
        if a > area:
            best = (int(d['X']), int(d['Y']), int(d['WIDTH']), int(d['HEIGHT']))
            area = a
    return best


def geom(tries=6):
    """X, Y, W, H главного окна Winbox (наибольшее окно с заголовком WinBox)."""
    for _ in range(tries):
        g = _geom_once()
        if g:
            return g
        time.sleep(5)
    raise SystemExit('окно Winbox не найдено')


def activate():
    """Фокус окну. В Xvfb нет оконного менеджера, поэтому windowfocus, а не
    windowactivate: без этого набранный текст уходит «в никуда»."""
    best, area = None, 0
    for wid in run(['xdotool', 'search', '--name', 'WinBox']).stdout.split():
        g = run(['xdotool', 'getwindowgeometry', '--shell', wid]).stdout
        d = dict(re.findall(r'^(\w+)=(\d+)$', g, re.M))
        if d and int(d['WIDTH']) * int(d['HEIGHT']) > area:
            best, area = wid, int(d['WIDTH']) * int(d['HEIGHT'])
    if best:
        if run(['xdotool', 'windowactivate', '--sync', best]).returncode != 0:
            run(['xdotool', 'windowfocus', '--sync', best])
        run(['xdotool', 'windowfocus', '--sync', best])
        time.sleep(0.5)
    return best


def click(x, y, repeat=1):
    run(['xdotool', 'mousemove', str(int(x)), str(int(y))])
    run(['xdotool', 'click', '--repeat', str(repeat), '--delay', '120', '1'])
    time.sleep(1.2)


# --------------------------------------------------------------- картинки ----
def ocr(x, y, w, h, tag='ocr'):
    """Слова в области экрана: [(текст, центр_x, центр_y)] в координатах экрана."""
    full = os.path.join(TMP, 'full.png')
    run(['import', '-window', 'root', full])
    crop = os.path.join(TMP, tag + '.png')
    run(['convert', full, '-crop', '%dx%d+%d+%d' % (int(w), int(h), int(x), int(y)),
         '+repage', '-colorspace', 'Gray', '-resize', '250%', '-sharpen', '0x1',
         '-normalize', crop])
    tsv = run(['tesseract', crop, '-', '--psm', '11', 'tsv']).stdout
    words = []
    for line in tsv.splitlines()[1:]:
        f = line.split('\t')
        if len(f) < 12 or not f[11].strip():
            continue
        try:
            conf = float(f[10])
        except ValueError:
            continue
        if conf < 40:
            continue
        words.append((f[11].strip(), int(x + int(f[6]) / 2.5), int(y + int(f[7]) / 2.5)))
    return words


def sd_now(X, Y, W, H):
    """Разброс яркости содержимого: 0 — пустой серый стол, >5 — открыто окно."""
    p = os.path.join(TMP, 'sd.png')
    run(['import', '-window', 'root', p])
    crop = os.path.join(TMP, 'sdcrop.png')
    run(['convert', p, '-crop', '%dx%d+%d+%d' % (int(W - 300), int(H - 200),
                                                 int(X + 200), int(Y + 60)),
         '+repage', crop])
    out = run(['convert', crop, '-format', '%[fx:int(standard_deviation*1000)]',
               'info:']).stdout
    try:
        return int(out.strip())
    except ValueError:
        return 0


def dbg(name):
    """Кадр для разбора: что было на экране, когда окно не открылось."""
    full = os.path.join(TMP, 'dbg.png')
    run(['import', '-window', 'root', full])
    run(['convert', full, '-resize', '1100x', '-quality', '78',
         os.path.join(OUT, 'dbg-%s.jpg' % name)])


def shoot(name, X, Y, W, H):
    full = os.path.join(TMP, 'shot.png')
    run(['import', '-window', 'root', full])
    png = os.path.join(OUT, name + '.png')
    run(['convert', full, '-crop', '%dx%d+%d+%d' % (int(W), int(H), int(X), int(Y)),
         '+repage', png])
    run(['convert', png, '-resize', '900x', '-quality', '82',
         os.path.join(JPG, name + '.jpg')])
    run(['rm', '-f', png])


# ------------------------------------------------------------ поиск слов -----
def find(words, needle, near=None, xmin=None):
    """Ищем пункт меню по названию (одно слово или фраза).

    OCR отдаёт слова по одному и иногда склеивает («PPPoEServers»), поэтому
    сверяем первое слово фразы, а остальные ищем следом в той же строке.
    """
    keys = [k for k in clean(needle).split() if k]
    if not keys:
        return None
    head, tail = keys[0], keys[1:]

    def tail_ok(x, y):
        if not tail:
            return True
        line = ' '.join(clean(t) for t, tx, ty in words
                        if abs(ty - y) < 12 and x - 10 <= tx <= x + 420)
        pos = 0
        for t in tail:
            i = line.find(t, pos)
            if i < 0:
                return False
            pos = i + len(t)
        return True

    exact, partial = [], []
    for w, x, y in words:
        cw = clean(w)
        if not cw.startswith(head):
            continue
        (exact if cw == head else partial).append((w, x, y))

    for group in (exact, partial):
        cand = [(w, x, y) for w, x, y in group
                if tail_ok(x, y) and (xmin is None or x >= xmin)]
        if cand:
            if near:
                cand.sort(key=lambda v: abs(v[2] - near[1]) + 0.35 * abs(v[1] - near[0]))
            return cand[0]
    return None


# ------------------------------------------------------------------ вход -----
def tree_words(X, Y, H):
    return ocr(X, Y + 16, 210, H - 120, 'tree')


def logged_in(X, Y, H):
    """Вошли, если в дереве есть пункты меню (на экране входа их нет)."""
    words = tree_words(X, Y, H)
    if find(words, 'Quick Set') or find(words, 'Interfaces'):
        return True
    names = ('wifi', 'bridge', 'ppp', 'mesh', 'ip', 'system', 'tools', 'files', 'log')
    return len([w for w in words if clean(w[0]) in names]) >= 3


def field_text(X, Y):
    return ' '.join(w[0] for w in ocr(X + 120, Y + 260, 420, 60, 'field'))


def fill_address(X, Y, wid):
    """Ввести адрес в Connect to и проверить результат по картинке."""
    click(X + 300, Y + 288)
    run(['xdotool', 'key', '--clearmodifiers', 'ctrl+a'])
    methods = (
        ['xdotool', 'type', '--delay', '90', '127.0.0.1'],
        ['xdotool', 'type', '--window', wid, '--delay', '90', '127.0.0.1'],
        ['xdotool', 'key', '--window', wid] + ['1', '2', '7', 'period', '0', '0', '1'],
    )
    for i, cmd in enumerate(methods):
        run(cmd)
        time.sleep(0.8)
        txt = field_text(X, Y)
        log('  ввод #%d: в поле %r' % (i + 1, txt))
        if any(c.isdigit() for c in txt):
            return True
        activate()
        click(X + 300, Y + 288)
        run(['xdotool', 'key', '--clearmodifiers', 'ctrl+a'])
    dbg('field')
    return False


def neighbors_connect(X, Y, W, H):
    """Вход без клавиатуры: вкладка Neighbors → двойной щелчок по роутеру.

    Надёжнее ввода адреса: в Xvfb фокус клавиатуры гуляет, а мышь работает
    всегда. CHR виден в Neighbors по MAC, даже если адрес не набирается.
    """
    click(X + 744, Y + 48)               # вкладка Neighbors
    time.sleep(1.5)
    words = ocr(X + 380, Y + 60, W - 430, 150, 'neighbors')
    hit = find(words, '127.0.0.1') or find(words, 'CHR')
    if not hit:
        log('  Neighbors: роутера в списке ещё нет (%s)' %
            ' '.join(w[0] for w in words[:14]))
        return False
    log('  Neighbors: нашёл %r, двойной щелчок' % hit[0])
    run(['xdotool', 'mousemove', str(hit[1]), str(hit[2])])
    run(['xdotool', 'click', '--repeat', '2', '--delay', '120', '1'])
    time.sleep(9)
    return logged_in(X, Y, H)


def connect(X, Y, W, H, tries=40):
    """Вход в роутер: Neighbors, затем ввод адреса, затем кнопка Connect.

    Порт 8291 у QEMU открыт сразу при старте, поэтому «порт отвечает» ничего
    не значит: единственный критерий — появилось дерево меню.
    """
    for attempt in range(1, tries + 1):
        X, Y, W, H = geom()
        if logged_in(X, Y, H):
            log('вход выполнен (попытка %d)' % attempt)
            return True
        activate()
        escape(1)
        if neighbors_connect(X, Y, W, H):
            log('вход через Neighbors (попытка %d)' % attempt)
            return True
        if attempt % 3 == 0:
            wid = activate()
            if fill_address(X, Y, wid):
                run(['xdotool', 'key', 'Return'])
                time.sleep(8)
                if logged_in(X, Y, H):
                    log('вход по Enter (попытка %d)' % attempt)
                    return True
            btn = find(ocr(X + 100, Y + 230, 520, 260, 'login'),
                       'Connect', near=(X + 200, Y + 300))
            if btn:
                click(btn[1], btn[2])
            else:
                click(X + 248, Y + 379)
            time.sleep(8)
            if logged_in(X, Y, H):
                log('вход по кнопке Connect (попытка %d)' % attempt)
                return True
        if attempt <= 2:
            dbg('attempt-%d' % attempt)
        time.sleep(12 if attempt < 8 else 25)
    return False


def restart_winbox(X, Y, W, H):
    """Перезапуск Winbox: за десятки окон копятся диалоги и клики перестают
    доходить. После перезапуска входим заново."""
    log('  перезапуск Winbox')
    for wid in run(['xdotool', 'search', '--name', 'WinBox']).stdout.split():
        run(['xdotool', 'windowkill', wid])
    run(['bash', '-lc', 'pkill -x WinBox || true'])
    time.sleep(4)
    run(['bash', '-lc', 'cd %s && %s nohup ./WinBox >> /tmp/wb/winbox.log 2>&1 &'
         % (WB_DIR, QT_ENV)])
    for _ in range(6):
        time.sleep(5)
        if _geom_once():
            break
    alive = run(['bash', '-lc', 'pgrep -af WinBox | head -3']).stdout.strip()
    log('  после перезапуска: %s' % (alive or 'процесс не поднялся'))
    if not alive:
        return False, X, Y, W, H
    X, Y, W, H = geom()
    ok = connect(X, Y, W, H, tries=12)
    if ok:
        escape(1)
    return ok, X, Y, W, H


# ------------------------------------------------------------ навигация ------
def menu_area_words(X, Y, W, H, tag='menu'):
    """Слова в области содержимого: так видно и окно, и раскрытое подменю."""
    return ocr(X + 110, Y + 16, W - 150, H - 130, tag)


def click_root(root, X, Y, W, H):
    """Открыть раздел из дерева: по OCR, затем по таблице высот."""
    cands = []
    hit = find(tree_words(X, Y, H), root)
    if hit:
        cands.append((hit[1], hit[2]))
    base = TREE_Y.get(clean(root))
    if base is not None:
        for dy in (0, -7, 7, -14, 14):
            cands.append((X + 60, Y + base + dy))
    for cx, cy in cands[:5]:
        click(cx, cy)
        words = menu_area_words(X, Y, W, H)
        if len(words) >= 6 or sd_now(X, Y, W, H) > 5:
            return cx, cy
        log('  «%s»: после клика пусто, пробую ещё' % root)
    return None


def open_window(parts, want_new, X, Y, W, H):
    root = parts[0]
    pos = click_root(root, X, Y, W, H)
    if not pos:
        log('!! раздел «%s» не открылся' % root)
        dbg(name_slug(parts))
        return False
    cur = pos
    for part in parts[1:]:
        words = menu_area_words(X, Y, W, H)
        hit = find(words, part, near=cur, xmin=X + 120)
        if not hit:
            # вкладки не помещаются в полосу — открываем список пунктов из
            # заголовка окна (рядом с названием есть «▾»)
            for _ in range(2):
                click(X + 291, Y + 113)
                words = ocr(X + 150, Y + 120, 520, H - 200, 'titlemenu')
                hit = find(words, part, xmin=X + 150)
                if hit:
                    break
        if not hit:
            # подменю могло ещё не раскрыться — щёлкаем узел ещё раз
            click(cur[0], cur[1], repeat=2)
            time.sleep(1.2)
            words = menu_area_words(X, Y, W, H)
            hit = find(words, part, near=cur, xmin=X + 120)
        if not hit:
            log('!! не нашёл «%s» (путь: %s); OCR: %s' %
                (part, ' → '.join(parts), ' '.join(w[0] for w in words[:30])))
            return False
        click(hit[1], hit[2])
        cur = (hit[1], hit[2])
    if want_new:
        words = menu_area_words(X, Y, W, H)
        hit = find(words, 'New', near=(X + 260, Y + 165))
        if not hit:
            log('!! не нашёл кнопку New (путь: %s)' % ' → '.join(parts))
            dbg(name_slug(parts))
            return False
        click(hit[1], hit[2])
    return True


# ------------------------------------------------------------------ старт ----
def main():
    X, Y, W, H = geom()
    log('окно %dx%d+%d+%d' % (W, H, X, Y))
    shoot('00-login', X, Y, W, H)
    if not connect(X, Y, W, H):
        log('!! войти в RouterOS не удалось — снимать нечего')
        return
    escape(1)
    time.sleep(2)
    X, Y, W, H = geom()
    log('окно после входа: %dx%d+%d+%d' % (W, H, X, Y))
    shoot('03-desktop', X, Y, W, H)

    with open(TASKS, encoding='utf-8') as f:
        tasks = [l.strip() for l in f if l.strip() and not l.startswith('#')]
    log('задач: %d' % len(tasks))

    ok, fail, started = 0, [], time.time()
    for i, line in enumerate(tasks):
        if time.time() - started > 5400:
            log('!! стоп по времени: снято %d из %d' % (ok, len(tasks)))
            break
        if i and i % 40 == 0:
            try:
                good, X, Y, W, H = restart_winbox(X, Y, W, H)
                if not good:
                    log('!! после перезапуска не вошли, продолжаю без него')
            except SystemExit:
                log('!! перезапуск не удался, продолжаю в том же окне')
            except Exception as exc:                     # noqa: BLE001
                log('!! перезапуск: ошибка %s' % exc)
        # чистый экран перед задачей: если что-то висит, закрываем
        for _ in range(3):
            if sd_now(X, Y, W, H) <= 5:
                break
            escape(3)

        fields = line.split('|')
        name = fields[0].strip()
        parts = [p.strip() for p in fields[1].split('→') if p.strip()] \
            if len(fields) > 1 else [name]
        want_new = len(fields) > 2 and fields[2].strip().lower() in ('new', '1', 'да')

        try:
            opened = open_window(parts, want_new, X, Y, W, H)
        except SystemExit:
            log('!! %s: окно Winbox пропало' % name)
            opened = False
        except Exception as exc:                         # noqa: BLE001
            log('!! %s: ошибка %s' % (name, exc))
            opened = False

        if not opened:
            fail.append(name)
            escape()
            continue

        sd = sd_now(X, Y, W, H)
        if sd <= 5:
            log('!! %s: окно пустое (sd=%d)' % (name, sd))
            fail.append(name)
            escape()
            continue

        shoot(name, X, Y, W, H)
        with open(MANIFEST, 'a', encoding='utf-8') as mf:
            mf.write('%s|1|%s\n' % (name, ' → '.join(parts)))
        log('снято %s: %s%s (sd=%d)' % (name, ' → '.join(parts),
                                        ' + New' if want_new else '', sd))
        ok += 1
        escape()

    log('итого: снято %d, не вышло %d%s' % (ok, len(fail),
                                           (': ' + ', '.join(fail)) if fail else ''))


if __name__ == '__main__':
    main()
