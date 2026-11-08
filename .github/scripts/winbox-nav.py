#!/usr/bin/env python3
"""winbox-nav.py — открывает окна Winbox 4 «по названию» и снимает их.

Как работает:
  1) читает геометрию главного окна Winbox (xdotool);
  2) чтобы открыть раздел, ищет его название в дереве через OCR (tesseract)
     и щёлкает по найденному месту — координаты берутся с экрана, поэтому
     попадание не зависит от шрифта и размера окна. Если OCR не разобрал
     дерево, работает запасная таблица высот пунктов;
  3) подменю и вкладки (IP → Firewall → NAT, Bridge → Ports) — так же: OCR
     области содержимого, поиск слова, клик;
  4) кнопка New — тоже по OCR;
  5) проверяет, что окно действительно открылось (разброс яркости области),
     и только тогда сохраняет PNG окна и JPEG 900 px.

Список задач — файл «имя|IP → Firewall → NAT|new», по одной в строке.

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
for d in (JPG, TMP, OUT):
    os.makedirs(d, exist_ok=True)
REPORT = os.path.join(OUT, 'report.txt')
MANIFEST = os.path.join(OUT, 'manifest.txt')

# Запасные высоты пунктов дерева (относительно верхнего левого угла окна),
# измерены по снимкам прошлых прогонов. Нужны, если OCR не разобрал дерево.
TREE_Y = {
    'quick set': 62, 'wifi': 87, 'interfaces': 111, 'wireguard': 135,
    'bridge': 160, 'ppp': 185, 'switch': 209, 'mesh': 236, 'ip': 260,
    'ipv6': 285, 'mpls': 310, 'routing': 333, 'system': 358, 'queues': 383,
    'dot1x': 407, 'files': 432, 'log': 458, 'new terminal': 483,
    'radius': 508, 'tools': 531,
}


def log(msg):
    print(msg, flush=True)
    with open(REPORT, 'a', encoding='utf-8') as f:
        f.write('  ' + msg + '\n')


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def clean(t):
    return t.lower().replace('ё', 'е').strip(' .,:;|·•<>()[]')


def geom(tries=6):
    """X, Y, W, H главного окна Winbox (наибольшее окно с заголовком WinBox)."""
    for attempt in range(tries):
        g = _geom_once()
        if g:
            return g
        time.sleep(5)
    raise SystemExit('окно Winbox не найдено')


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
    if not best:
        return None
    return best


def activate():
    """Фокус окну: без него xdotool type уходит в пустоту."""
    best, area = None, 0
    for wid in run(['xdotool', 'search', '--name', 'WinBox']).stdout.split():
        g = run(['xdotool', 'getwindowgeometry', '--shell', wid]).stdout
        d = dict(re.findall(r'^(\w+)=(\d+)$', g, re.M))
        if d and int(d['WIDTH']) * int(d['HEIGHT']) > area:
            best, area = wid, int(d['WIDTH']) * int(d['HEIGHT'])
    if best:
        # В Xvfb нет оконного менеджера: windowactivate падает, а windowfocus
        # работает и без него, иначе набранный адрес уходит «в никуда».
        if run(['xdotool', 'windowactivate', '--sync', best]).returncode != 0:
            run(['xdotool', 'windowfocus', '--sync', best])
        run(['xdotool', 'windowfocus', '--sync', best])
        time.sleep(0.6)
        log('  фокус: %s' % run(['xdotool', 'getwindowfocus']).stdout.strip())
    return best


def click(x, y, repeat=1):
    run(['xdotool', 'mousemove', str(int(x)), str(int(y))])
    run(['xdotool', 'click', '--repeat', str(repeat), '--delay', '120', '1'])
    time.sleep(1.3)


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
        words.append((f[11].strip(),
                      int(x + int(f[6]) / 2.5),
                      int(y + int(f[7]) / 2.5)))
    return words


def find(words, needle, near=None, xmin=None):
    """Ищем пункт меню по названию.

    OCR отдаёт слова по одному и иногда склеивает («PPPoEServers»), поэтому:
      * фраза разбивается на слова, первое ищется как отдельное слово;
      * «хвост» фразы может быть как следующим словом, так и частью того же.
    Возвращает (текст, x, y) лучшего совпадения или None.
    """
    keys = [k for k in clean(needle).split() if k]
    if not keys:
        return None
    head, tail = keys[0], keys[1:]

    def tail_ok(w, x, y):
        """Все слова хвоста есть рядом с найденным (та же строка)."""
        if not tail:
            return True
        rest = ' '.join(clean(t) for t, tx, ty in words
                        if abs(ty - y) < 12 and x - 10 <= tx <= x + 420)
        glued = clean(w) + rest
        pos = 0
        for t in tail:
            i = glued.find(t, pos)
            if i < 0:
                return False
            pos = i + len(t)
        return True

    exact, partial = [], []
    for w, x, y in words:
        cw = clean(w)
        if cw.startswith(head) and len(cw) > 1:
            (exact if cw == head else partial).append((w, x, y))
    cand = []
    for group in (exact, partial):
        for w, x, y in group:
            if tail_ok(w, x, y) and (xmin is None or x >= xmin):
                cand.append((w, x, y))
        if cand:
            break
    if not cand:
        return None
    if near:
        cand.sort(key=lambda v: abs(v[2] - near[1]) + 0.35 * abs(v[1] - near[0]))
    return cand[0]


def sd_now(X, Y, W, H):
    """Разброс яркости содержимого окна: 0 — пустой серый стол, >5 — есть окно."""
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



def tree_words(X, Y, H):
    return ocr(X, Y + 16, 210, H - 120, 'tree')


def logged_in(X, Y, H):
    """Вошли в роутер, если в дереве есть пункты меню (на экране входа их нет)."""
    words = tree_words(X, Y, H)
    if find(words, 'Quick Set') or find(words, 'Interfaces'):
        return True
    return len([w for w in words if clean(w[0]) in
                ('wifi', 'bridge', 'ppp', 'mesh', 'ip', 'system', 'tools', 'files', 'log')]) >= 3


def field_text(X, Y):
    """Что реально в поле Connect to (по OCR)."""
    words = ocr(X + 150, Y + 276, 300, 28, 'field')
    return ' '.join(w[0] for w in words)


def fill_address(X, Y, wid):
    """Ввести 127.0.0.1 в поле Connect to, проверяя результат по картинке."""
    click(X + 300, Y + 290)
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
        if '127' in txt or '0.0' in txt or any(c.isdigit() for c in txt):
            return True
        activate()
        click(X + 300, Y + 290)
        run(['xdotool', 'key', '--clearmodifiers', 'ctrl+a'])
    # не получилось — оставляем кадр для разбора
    run(['import', '-window', 'root', os.path.join(OUT, 'debug-field.png')])
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
    time.sleep(10)
    return logged_in(X, Y, H)


def connect(X, Y, W, H, tries=40):
    """Вход в роутер: сначала Neighbors, потом ввод адреса, потом кнопка Connect.

    RouterOS в QEMU грузится 10-15 минут, а порт 8291 открыт сразу, поэтому
    «порт отвечает» ничего не значит: единственный критерий — дерево меню.
    Между попытками ждём немного: попытки дешёвые, а прогон ограничен по времени.
    """
    for attempt in range(1, tries + 1):
        X, Y, W, H = geom()          # окно могло измениться после входа
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
            click(btn[1], btn[2]) if btn else click(X + 248, Y + 379)
            time.sleep(8)
            if logged_in(X, Y, H):
                log('вход по кнопке Connect (попытка %d)' % attempt)
                return True
        if attempt <= 2:
            dbg('attempt-%d' % attempt)
        time.sleep(12 if attempt < 8 else 25)
    return False


def maximize(X, Y, W, H):
    """Растянуть окно Winbox почти на весь экран.

    В окне 1200x700 вкладки не помещаются («Interface List», «Registration»
    уезжают в прокрутку), и найти их по тексту нельзя. В окне 1560x1040
    они видны все, а выпадающие списки раскрываются целиком.
    """
    wid = activate()
    if not wid:
        return X, Y, W, H
    run(['xdotool', 'windowsize', wid, '1560', '1040'])
    run(['xdotool', 'windowmove', wid, '20', '20'])
    time.sleep(1.5)
    return geom()


def restart_winbox(X, Y, W, H):
    """Перезапуск Winbox: за десятки окон он накапливает открытые диалоги,
    и клики по дереву перестают доходить. После перезапуска входим заново."""
    log('  перезапуск Winbox')
    run(['pkill', '-f', '/WinBox'])
    time.sleep(3)
    run(['bash', '-lc',
         'cd /tmp/wb/winbox && QT_QPA_PLATFORM=xcb QT_QUICK_BACKEND=software '
         'QT_OPENGL=software LIBGL_ALWAYS_SOFTWARE=1 QT_SCALE_FACTOR=0.75 '
         'nohup ./WinBox >> /tmp/wb/winbox.log 2>&1 &'])
    for _ in range(6):
        time.sleep(5)
        if _geom_once():
            break
    alive = run(['bash', '-lc', 'pgrep -af WinBox | head -3']).stdout.strip()
    log('  после перезапуска: %s' % (alive or 'процесс не поднялся'))
    dbg('restart')
    X, Y, W, H = geom()
    ok = connect(X, Y, W, H, tries=10)
    if ok:
        escape(1)
        X, Y, W, H = maximize(X, Y, W, H)
    return ok, X, Y, W, H


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


def main():
    X, Y, W, H = geom()
    log('окно %dx%d+%d+%d' % (W, H, X, Y))
    shoot('00-login', X, Y, W, H)
    if not connect(X, Y, W, H):
        log('!! войти в RouterOS не удалось — снимать нечего')
        return
    escape(1)
    time.sleep(2)
    X, Y, W, H = maximize(*geom())
    log('окно после входа: %dx%d+%d+%d' % (W, H, X, Y))
    shoot('03-desktop', X, Y, W, H)
    with open(TASKS, encoding='utf-8') as f:
        tasks = [l.strip() for l in f if l.strip() and not l.startswith('#')]
    log('задач: %d' % len(tasks))
    ok, fail = 0, []
    for i, line in enumerate(tasks):
        if i and i % 40 == 0:
            try:
                good, X, Y, W, H = restart_winbox(X, Y, W, H)
                if not good:
                    log('!! после перезапуска не вошли, продолжаю без него')
            except SystemExit:
                log('!! перезапуск не удался, продолжаю в том же окне')
            except Exception as exc:                   # noqa: BLE001
                log('!! перезапуск: ошибка %s' % exc)
        escape(3)
        fields = line.split('|')
        name = fields[0].strip()
        parts = [p.strip() for p in fields[1].split('→') if p.strip()] \
            if len(fields) > 1 else [name]
        want_new = len(fields) > 2 and fields[2].strip().lower() in ('new', '1', 'да')
        try:
            opened = open_window(parts, want_new, X, Y, W, H)
        except Exception as exc:                       # noqa: BLE001
            log('!! %s: ошибка %s' % (name, exc))
            dbg(name)
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
