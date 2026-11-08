#!/usr/bin/env python3
"""ros-api.py — минимальный клиент RouterOS API (порт 8728) без зависимостей.

Зачем: чтобы снимки Winbox показывали ТЕ ЖЕ данные, что написаны в инструкциях,
роутер перед съёмкой нужно настроить. Набирать конфиг руками в Winbox через
xdotool ненадёжно (фокус гуляет), а API отвечает строго и с ошибкой на каждую
неверную строку.

Протокол — «слова с длиной»: длина кодируется 1–5 байтами, слово это UTF-8.
Команда заканчивается пустым словом. Ответ идёт до !done / !trap / !fatal.

Запуск:
    python3 ros-api.py 127.0.0.1 8728 admin "" .github/scripts/lab-setup.rsc

Код возврата 0 — все строки применены; 1 — были отказы (они напечатаны).
Отказ отдельной строки не останавливает посев: одно отсутствующее поле не
должно лишать нас всей остальной конфигурации стенда.
"""
import socket
import sys
import time


# ------------------------------------------------------------------ протокол --
def enc_len(n):
    if n < 0x80:
        return bytes([n])
    if n < 0x4000:
        return (n | 0x8000).to_bytes(2, 'big')
    if n < 0x200000:
        return (n | 0xC00000).to_bytes(3, 'big')
    if n < 0x10000000:
        return (n | 0xE0000000).to_bytes(4, 'big')
    return b'\xF0' + n.to_bytes(4, 'big')


def dec_len(sock):
    b = sock.recv(1)
    if not b:
        raise ConnectionError('роутер закрыл соединение')
    x = b[0]
    if x & 0x80 == 0:
        return x
    if x & 0xC0 == 0x80:
        return ((x & 0x3F) << 8) + sock.recv(1)[0]
    if x & 0xE0 == 0xC0:
        rest = sock.recv(2)
        return ((x & 0x1F) << 16) + (rest[0] << 8) + rest[1]
    if x & 0xF0 == 0xE0:
        rest = sock.recv(3)
        return ((x & 0x0F) << 24) + (rest[0] << 16) + (rest[1] << 8) + rest[2]
    if x == 0xF0:
        return int.from_bytes(sock.recv(4), 'big')
    raise ConnectionError('непонятная длина слова: %r' % x)


def recv_exact(sock, n):
    buf = b''
    while len(buf) < n:
        part = sock.recv(n - len(buf))
        if not part:
            raise ConnectionError('соединение оборвалось на середине слова')
        buf += part
    return buf


class Api:
    def __init__(self, host, port, user, password, timeout=25):
        self.sock = socket.create_connection((host, port), timeout=timeout)
        self.sock.settimeout(timeout)
        self.user, self.password = user, password

    def send(self, words):
        out = b''
        for w in words:
            raw = w.encode('utf-8')
            out += enc_len(len(raw)) + raw
        self.sock.sendall(out + b'\x00')

    def read_sentence(self):
        words = []
        while True:
            n = dec_len(self.sock)
            if n == 0:
                return words
            words.append(recv_exact(self.sock, n).decode('utf-8', 'replace'))

    def talk(self, words):
        """Ответ одной команды: (данные, ошибка)."""
        self.send(words)
        rows, err = [], None
        while True:
            s = self.read_sentence()
            if not s:
                continue
            kind = s[0]
            if kind == '!done':
                return rows, err
            if kind == '!trap':
                err = ' '.join(w[1:] for w in s[1:] if w.startswith('=')) or 'trap'
            elif kind == '!fatal':
                raise ConnectionError('!fatal: ' + ' '.join(s[1:]))
            else:
                rows.append(s)

    def login(self):
        # RouterOS 6.43+ принимает логин одной командой, без challenge.
        rows, err = self.talk(['/login', '=name=' + self.user,
                               '=password=' + self.password])
        if err:
            raise ConnectionError('вход по API не удался: ' + err)
        return True

    def close(self):
        try:
            self.sock.close()
        except OSError:
            pass


# ------------------------------------------------------- разбор строк конфига --
def split_args(line):
    """Разбить строку CLI на слова, уважая кавычки: name="a b" → одно слово."""
    out, cur, quote, esc = [], '', None, False
    for ch in line:
        if esc:
            cur += {'n': '\n', 't': '\t', 'r': '\r'}.get(ch, ch)
            esc = False
            continue
        if ch == '\\':
            esc = True
            continue
        if quote:
            if ch == quote:
                quote = None
            else:
                cur += ch
            continue
        if ch in '"\'':
            quote = ch
            continue
        if ch.isspace():
            if cur:
                out.append(cur)
                cur = ''
            continue
        cur += ch
    if cur:
        out.append(cur)
    return out


def cli_to_words(line):
    """/ip/address/add address=10.0.0.1/24 → ['/ip/address/add', '=address=…'].

    Позиционное слово (например `set wlan1`) в API называется numbers.
    """
    parts = split_args(line)
    if not parts:
        return None
    path = parts[0]
    if not path.startswith('/'):
        return None
    words = [path.replace(' ', '/')]
    for p in parts[1:]:
        if '=' in p and not p.startswith('='):
            words.append('=' + p)
        else:
            words.append('=numbers=' + p)
    return words


def wait_api(host, port, user, password, minutes=32):
    """Ждать, пока RouterOS поднимется и пустит по API."""
    deadline = time.time() + minutes * 60
    attempt = 0
    while time.time() < deadline:
        attempt += 1
        try:
            api = Api(host, port, user, password, timeout=12)
            api.login()
            print('API готов (попытка %d)' % attempt, flush=True)
            return api
        except Exception as exc:                                  # noqa: BLE001
            # «timed out» без пояснений не отличает закрытый порт от
            # загружающегося роутера — пишем, что именно произошло.
            kind = ('соединение не установлено' if isinstance(exc, (ConnectionRefusedError,
                    OSError)) and not isinstance(exc, socket.timeout) else 'роутер молчит')
            print('  попытка %d: %s (%s)' % (attempt, exc, kind), flush=True)
            time.sleep(15)
    raise SystemExit('API так и не поднялся за %d минут' % minutes)


def apply_file(api, path):
    ok, bad = 0, []
    with open(path, encoding='utf-8') as f:
        lines = f.read().splitlines()
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        words = cli_to_words(line)
        if not words:
            continue
        try:
            rows, err = api.talk(words)
        except Exception as exc:                                  # noqa: BLE001
            bad.append((line, str(exc)))
            print('!! %s → %s' % (line, exc), flush=True)
            continue
        if err:
            bad.append((line, err))
            print('!! %s → %s' % (line, err), flush=True)
        else:
            ok += 1
    print('стенд: применено %d строк, отказов %d' % (ok, len(bad)), flush=True)
    return ok, bad


# --------------------------------------------------------------- самопроверка --
def selftest():
    """Протокол проверяется на игрушечном сервере: длину слова легко испортить,
    а в CI ошибка всплывёт только через 10 минут загрузки CHR."""
    import threading

    def server(sock):
        conn, _ = sock.accept()
        with conn:
            while True:
                words, buf = [], b''
                try:
                    while True:
                        n = dec_len(conn)
                        if n == 0:
                            break
                        words.append(recv_exact(conn, n).decode('utf-8'))
                except (ConnectionError, OSError):
                    return
                if not words:
                    return
                if words[0] == '/login':
                    reply = [['!done']]
                elif any('bad=1' in w for w in words):
                    reply = [['!trap', '=message=no such item'], ['!done']]
                else:
                    reply = [['!re', '=echo=' + '|'.join(words[1:])], ['!done']]
                for sentence in reply:
                    out = b''
                    for w in sentence:
                        raw = w.encode('utf-8')
                        out += enc_len(len(raw)) + raw
                    conn.sendall(out + b'\x00')

    srv = socket.socket()
    srv.bind(('127.0.0.1', 0))
    srv.listen(1)
    port = srv.getsockname()[1]
    th = threading.Thread(target=server, args=(srv,), daemon=True)
    th.start()
    api = Api('127.0.0.1', port, 'admin', '')
    api.login()
    long_value = 'ы' * 400                      # многобайтный UTF-8 и длина >127
    rows, err = api.talk(['/test', '=value=' + long_value])
    assert err is None, err
    assert rows and rows[0][1] == '=echo==value=' + long_value, rows
    rows, err = api.talk(['/test', '=bad=1'])
    assert err == 'message=no such item', err
    api.close()
    srv.close()
    for n in (0, 1, 127, 128, 0x3FFF, 0x4000, 0x1FFFFF, 0x200000):
        assert len(enc_len(n)) == (1 if n < 0x80 else 2 if n < 0x4000
                                   else 3 if n < 0x200000 else 4), n
    assert cli_to_words('/ip/address/add address=10.10.10.5/32 interface=wg-office') == \
        ['/ip/address/add', '=address=10.10.10.5/32', '=interface=wg-office']
    assert cli_to_words('/system/logging/action/set remote remote-address=10.0.0.1') == \
        ['/system/logging/action/set', '=numbers=remote', '=remote-address=10.0.0.1']
    assert cli_to_words('/system/backup/save name="backups/2026-11-02"') == \
        ['/system/backup/save', '=name=backups/2026-11-02']
    print('самопроверка API: протокол, длины, разбор строк — в порядке')
    return 0


def main():
    if '--selftest' in sys.argv:
        return selftest()
    host = sys.argv[1] if len(sys.argv) > 1 else '127.0.0.1'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8728
    user = sys.argv[3] if len(sys.argv) > 3 else 'admin'
    password = sys.argv[4] if len(sys.argv) > 4 else ''
    script = sys.argv[5] if len(sys.argv) > 5 else '.github/scripts/lab-setup.rsc'
    api = wait_api(host, port, user, password)
    try:
        rows, err = api.talk(['/system/resource/print'])
        for r in rows:
            info = dict(w[1:].split('=', 1) for w in r if w.startswith('=') and '=' in w[1:])
            print('роутер: %s %s, плата %s' % (info.get('version'),
                                              info.get('board-name'), info.get('uptime')),
                  flush=True)
        ok, bad = apply_file(api, script)
    finally:
        api.close()
    return 1 if not ok else 0


if __name__ == '__main__':
    sys.exit(main())
