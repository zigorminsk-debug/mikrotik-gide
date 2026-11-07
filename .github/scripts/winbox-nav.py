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


def geom():
    """X, Y, W, H главного окна Winbox (наибольшее окно с заголовком WinBox)."""
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
        raise SystemExit('окно Winbox не найдено')
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
    key = clean(needle)
    exact = [w for w in words if clean(w[0]) == key]
    cand = exact or [w for w in words if key in clean(w[0])]
    if xmin is not None and cand:
        cand = [w for w in cand if w[1] >= xmin] or cand
    if not cand:
        return None
    if near:
        cand.sort(key=lambda w: abs(w[2] - near[1]) + 0.35 * abs(w[1] - near[0]))
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


def escape(times=2):
    for _ in range(times):
        run(['xdotool', 'key', 'Escape'])
        time.sleep(0.4)


def open_window(parts, want_new, X, Y, W, H):
    root = parts[0]
    words = ocr(X + 2, Y + 20, 150, H - 130, 'tree')
    hit = find(words, root)
    if not hit:
        y = TREE_Y.get(clean(root))
        if y is None:
            log('!! не нашёл «%s» в дереве; OCR: %s' %
                (root, ' '.join(w[0] for w in words[:25])))
            return False
        log('  «%s» взял из таблицы высот (y=+%d), OCR дерева: %s' %
            (root, y, ' '.join(w[0] for w in words[:20])))
        click(X + 60, Y + y)
        cur = (X + 60, Y + y)
    else:
        click(hit[1], hit[2])
        cur = (hit[1], hit[2])
    for part in parts[1:]:
        words = ocr(X + 100, Y + 20, W - 140, H - 130, 'menu')
        hit = find(words, part, near=cur, xmin=X + 120)
        if not hit:
            log('!! не нашёл «%s» (путь: %s); OCR: %s' %
                (part, ' → '.join(parts), ' '.join(w[0] for w in words[:30])))
            return False
        click(hit[1], hit[2])
        cur = (hit[1], hit[2])
    if want_new:
        words = ocr(X + 100, Y + 60, W - 140, H - 200, 'new')
        hit = find(words, 'New', near=(X + 260, Y + 165))
        if not hit:
            log('!! не нашёл кнопку New (путь: %s)' % ' → '.join(parts))
            return False
        click(hit[1], hit[2])
    return True


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
    with open(TASKS, encoding='utf-8') as f:
        tasks = [l.strip() for l in f if l.strip() and not l.startswith('#')]
    log('задач: %d' % len(tasks))
    ok, fail = 0, []
    for line in tasks:
        fields = line.split('|')
        name = fields[0].strip()
        parts = [p.strip() for p in fields[1].split('→') if p.strip()] \
            if len(fields) > 1 else [name]
        want_new = len(fields) > 2 and fields[2].strip().lower() in ('new', '1', 'да')
        if not open_window(parts, want_new, X, Y, W, H):
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
