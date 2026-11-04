# Снимки окон Winbox 4 из CI

Эти файлы создаёт workflow `.github/workflows/winbox-shots.yml`:

1. ставятся QEMU, Xvfb, Winbox 4.4, xdotool, ImageMagick;
2. скачивается CHR RouterOS 7.24.6 и запускается в QEMU (`-cpu max`, диск `if=ide`,
   проброс порта 8291 на 127.0.0.1);
3. поднимается Xvfb 1600×1100, запускается Winbox 4 и подключается к CHR;
4. `capture()` открывает окна по координатам дерева и снимает экран (`import`),
   кадр обрезается до окна приложения (1200×700+200+200);
5. всё складывается в артефакт `winbox-shots` и коммитится в ветку
   (`CI: настоящие скриншоты Winbox 4 [skip ci]`).

## Что важно знать про координаты

* Клики считаются от главного окна Winbox (`appwin()` — окно, в заголовке которого
  есть `WinBox`). Раньше брали «самое большое окно», и после открытия диалога клики
  уезжали в другое меню — подписи файлов не совпадали с содержимым.
* Каждое окно снимается **после перезапуска Winbox**: так на кадре нет наложенных
  окон (перезапуск ≈ 15 секунд, прогон ≈ 22 минуты).
* Координаты пунктов дерева (x = +80, y относительно окна):
  `quickset 50`, `interfaces 95`, `bridge 146`, `wireguard 122`, `ppp 170`,
  `ip 238` (подпункты: `53` — адреса, `399` — маршруты, `492` — сервисы),
  `queues 353`, `files 398`, `log 421`, `system 530`.
* Если в файле оказалось не то окно — сдвиньте координату на 22–24 px
  (высота строки дерева) и перезапустите workflow.

## Связь с приложением

Кадры, отобранные для учебника, лежат в `app/src/main/assets/www/img/shots/`
(JPEG, ширина 900 px), а их подписи — в `app/src/main/assets/www/js/data/win4.js`.
Страница приложения: **Инструменты → Окна Winbox 4** (`#/win4`).

## Текущий набор

| Файл CI | Что на снимке | В приложении |
| --- | --- | --- |
| `01-login.png` | окно входа Winbox | `login.jpg` |
| `03-desktop.png` | рабочий стол после входа | `desktop.jpg` |
| `win-quickset.png` | Quick Set | `quickset.jpg` |
| `win-interfaces.png` | Interfaces | `interfaces.jpg` |
| `win-bridge.png` | Bridge | `bridge.jpg` |
| `win-fw-new.png` | Bridge → New | `bridge-new.jpg` |
| `win-wireguard.png` | Interfaces → WireGuard | `wireguard.jpg` |
| `win-ip-address.png` | IP → Address | `ip-address.jpg` |
| `win-ip-dns.png` | IP → DHCP Server | `dhcp-server.jpg` |
| `win-ip-routes.png` | IP → Routes | `ip-routes.jpg` |
| `win-ip-services.png` | IP → Services | `ip-services.jpg` |
| `win-firewall.png` | IP → DNS Settings | `ip-dns.jpg` |
| `win-log.png` | Files | `files.jpg` |
| `win-files.png` | Dot1X → Client | `dot1x.jpg` |
| `win-ppp.png` | PPP | `ppp.jpg` |

Остальные файлы (`08-chr-*.png`, `report.txt`, `xwininfo*.txt`) — журнал загрузки CHR:
по ним видно, на какой секунде RouterOS поднялся и что ответил Winbox.
