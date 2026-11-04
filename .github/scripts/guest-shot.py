#!/usr/bin/env python3
"""Снять экран гостя (RouterOS CHR) через QEMU monitor.

Использование: python3 guest-shot.py <unix-socket> <out.ppm>
Отправляет команду screendump и ждёт появления файла.
"""
import os
import socket
import sys
import time

sock_path, out = sys.argv[1], sys.argv[2]
try:
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.settimeout(5)
    s.connect(sock_path)
    time.sleep(0.2)
    s.sendall(("screendump %s\n" % out).encode())
    deadline = time.time() + 10
    while time.time() < deadline:
        if os.path.exists(out) and os.path.getsize(out) > 1000:
            # подождать, пока QEMU допишет файл
            size = -1
            while size != os.path.getsize(out):
                size = os.path.getsize(out)
                time.sleep(0.3)
            print("ok: %s (%d байт)" % (out, os.path.getsize(out)))
            break
        time.sleep(0.3)
    else:
        print("файл не появился")
    s.close()
except Exception as exc:  # noqa: BLE001
    print("ошибка monitor: %s" % exc)
