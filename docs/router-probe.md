# Опрос роутера из программы: версия, прошивка, плата

Задача: конструктор скрипта должен собирать конфиг **под конкретный роутер**, а не «под
RouterOS 7 вообще». Версия 6.x и 7.x, пакет `wireless` и пакет `wifi`, разные имена портов
(`ether1…ether5` у RB951G против `ether1…ether10` у RB4011) — всё это меняет команды.

## Где что лежит

| Файл | Что делает |
| --- | --- |
| `windows/rosapi.go` | Клиент протокола MikroTik API (8728/8729) на стандартной библиотеке Go: слова с префиксом длины, оба варианта входа (6.43+ с логином/паролем и старый challenge-вход), сбор «паспорта» роутера. |
| `windows/rosrest.go` | Второй транспорт — REST RouterOS 7 поверх HTTPS (`/rest/...`), с basic-auth и самоподписанным сертификатом. |
| `windows/discover.go` | Поиск роутеров без логина: MNDP (UDP 5678) плюс проверка портов 8728/8291 в своей подсети. |
| `windows/devices.go` | Список опрошенных роутеров в `%LOCALAPPDATA%\MikroTikGide\routers.json`. Пароль не сохраняется. |
| `windows/roshttp.go` | HTTP-мостик для страницы учебника: `/api/router/probe`, `/api/router/discover`, `/api/router/saved`. |
| `app/src/main/assets/www/js/rosprobe.js` | Профиль версии RouterOS, поиск модели по плате, поля мастера под роутер, вызовы мостика. |
| `app/src/main/assets/www/js/wizard.js` | Использует паспорт: шапка «Цель: …», раздел проверки версии, ветка 6.x (wireless, без WireGuard). |
| `app/src/main/assets/www/js/app.js` | Карточка «Версия роутера» в мастере и вся логика кнопок. |

## Почему опрос делает Go-сервер, а не страница

Страница — обычный HTML в WebView/браузере, из JavaScript нельзя открыть TCP к порту 8728.
Поэтому соединение с роутером держит Go-часть (она уже работает как локальный сервер для
обновлений), а страница получает готовый JSON. Заодно пароль не покидает локальный процесс.

Порядок попыток при опросе:

1. **REST 443** (`https://адрес/rest/system/resource`) — самый простой путь, но требует
   включённого `www-ssl` с сертификатом.
2. **API 8728** — `/ip service enable api`; работает и в 6.x, и в 7.x.
3. **API-SSL 8729** — если открыт только защищённый API.

Если все три закрыты, программа честно пишет, что включить на роутере, и показывает причину
по каждой попытке.

## Что именно забирается

```
/system resource        version, board-name, architecture-name, platform, uptime
/system routerboard     current-firmware, upgrade-firmware, model, serial-number
/system identity        name
/system package         routeros, wireless, wifi-qcom, container …
/system license         nlevel (6.x)
/ip service             включённые сервисы и их address
/interface              порты ether
/interface wireless     wlan1, wlan2  → пакет wireless (legacy)
/interface wifi         wifi1, wifi2  → пакет wifi
```

Из этого собирается «паспорт»: версия, мажор/минор, плата, модель, архитектура, прошивка
RouterBOOT (текущая и доступная для обновления), серийник, пакеты, порты, радиоинтерфейсы,
диапазон 5 ГГц, сервисы, лицензия, uptime.

## Как это влияет на конфиг

* **Модель и порты.** Плата `RB951G-2HnD` → модель `rb951` (WAN `ether1`, LAN `ether2-5`),
  `RB4011iGS+` → `rb4011` (LAN до `ether10`). Имена портов из `/interface` тоже показываются
  в отчёте — по ним видно, если на роутере переименованы интерфейсы.
* **Пакет Wi-Fi.** `wireless` → `/interface wireless security-profiles`, `wlan1/wlan2`.
  `wifi` (7.13+) → `/interface wifi security|configuration|datapath`, `wifi1/wifi2`.
* **Версия.** В шапку пишется «Цель: RouterOS 7.24.6 · RB951G-2HnD · прошивка RouterBOOT
  6.49.13», а в начало скрипта — раздел проверки:

  ```rsc
  :local rosVer [/system resource get version]
  :if ([:pick $rosVer 0 1] != "7") do={
    :put ("ВНИМАНИЕ! На роутере " . $rosVer . ", конфиг собран под 7.24.6")
  }
  ```

* **6.x.** Скрипт собирается для `wireless`, WireGuard не создаётся (в 6.x его нет),
  `service-ports` не используется — и всё это проговаривается в комментариях.
* **Прошивка RouterBOOT.** Если `upgrade-firmware` отличается от `current-firmware`,
  в отчёте видно `6.47.10 → 6.49.13` — перед обновлением RouterOS прошивку как раз и
  поднимают (`/system routerboard upgrade`).

## Ограничения

* **Android.** Автоопроса нет: WebView не умеет TCP к 8728, а REST не отдаёт CORS-заголовки.
  Поля «RouterOS / Плата / Прошивка» остаются — их заполняют вручную, логика сборки та же.
* **www-ssl по умолчанию выключен** нашей же защитой (`/ip service disable www-ssl`). Для
  REST-опроса его нужно включать осознанно: `/ip service enable www-ssl`.
* **Самоподписанный сертификат** принимается без проверки — соединение идёт внутри локальной
  сети, а проверять на роутере нечего. Это отмечено в коде.
* **Пароль не сохраняется.** `routers.json` содержит только адрес, имя, версию, плату и
  прошивку.

## Что дальше (логичное продолжение)

1. **Применение конфига прямо из программы** — через тот же API: разбить скрипт на команды и
   отправлять их по одной, показывая ответ роутера (сейчас конфиг копируют в терминал).
2. **Снимок текущего конфига** (`/export`) в паспорт — чтобы мастер видел занятые адреса и
   имена мостов до сборки.
3. **Проверка «что изменится»**: сравнить желаемый конфиг с текущим (`/ip address print`,
   `/ip firewall filter print`) и показать только различия — это уже есть в разделе «Аудит».
4. **Обновление прошивки и RouterOS из программы** — `/system package update install` через
   API, с подтверждением и логом.

## Как проверить руками

```bash
# REST (нужен включённый www-ssl)
curl -k -u admin:пароль https://192.168.88.1/rest/system/resource
curl -k -u admin:пароль https://192.168.88.1/rest/system/routerboard

# в терминале роутера
/system resource print
/system routerboard print
/interface wireless print
/ip service print
```

В приложении: **Инструменты → Мастер конфигурации → Версия роутера**.
