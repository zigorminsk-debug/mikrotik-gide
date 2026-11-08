/*
 * win4-review.js — ручная проверка кадров Winbox 4 перед публикацией.
 *
 * Кадр может попасть в галерею только если на нём действительно то окно,
 * которое обещает подпись. Кадр может попасть ПОД ШАГ только если совпадают
 * и окно, и значимые данные шага (адреса, интерфейсы, имена, числа).
 *
 * `values` — значения, которые реально видны на снимке. Пустой список
 * означает: кадр показывает окно/пустой учебный CHR, но не подтверждает
 * никаких значений из инструкции. Такой кадр нельзя ставить под шаг,
 * где инструкция задаёт конкретные Address/Interface/Name/лимиты.
 */
module.exports = {
  /* Не публиковать: подпись обещает одно, на снимке другое окно. */
  quarantine: {
    'wifi-wps': 'На снимке главное окно WiFi и меню Actions, а не настройка WPS.',
    'bridge-new': 'На снимке Bridge Filter Rule → New, а не создание Bridge.',
    'backup': 'На снимке Files → Cloud Backup с ошибкой CHR free licence, а не окно Backup.'
  },

  /* Честные подписи к тому, что действительно видно (вместо обещаний из titles). */
  desc: {
    'ip-address.jpg': 'Окно IP → Address в учебном CHR: виден DHCP-адрес 10.0.2.15/24 на ether1. Это не адрес wg-office из примеров; под конкретные шаги такой кадр не ставится.',
    'simple-new.jpg': 'New Simple Queue: пустая форма, имя queue1 и Target 0.0.0.0/0. Лимиты из инструкции здесь не заданы.',
    'wg-new.jpg': 'New WireGuard Peer: пустая форма, Interface пока unknown. Ключи и Endpoint из инструкции здесь не заполнены.',
    'terminal.jpg': 'New Terminal при первом входе: баннер RouterOS 7.24.6 и вопрос о лицензии. Команды конфига ещё не вводились.',
    'system.jpg': 'Раскрытое меню System: Identity, Clock, NTP, Users, Certificates, Logging, Packages, Scheduler, Scripts и другие пункты.',
    'routing.jpg': 'Раскрытое меню Routing: BFD, BGP, Filters, IGMP Proxy, Nexthops, OSPF, RIP, Rules, Settings, Tables.',
    'wifi-registration.jpg': 'Вкладка Registration окна WiFi. В учебном CHR клиентов нет, поэтому таблица пустая.',
    'wg-peers.jpg': 'Вкладка Peers окна WireGuard. В учебном CHR пиры не созданы, поэтому таблица пустая.',
    'ppp-active.jpg': 'PPP → Active Connections. В учебном CHR активных сессий нет.',
    'bridge-hosts.jpg': 'Bridge → Hosts. Таблица MAC-адресов моста; в учебном CHR записей может не быть.'
  },

  /* Подписи к кадрам, переснятым на настроенном стенде (есть OCR-текст
     в docs/shots/verified.json). Пока стенд не снят, действует desc ниже. */
  descLab: {
    'ip-address.jpg': 'IP → Address на учебном стенде: адреса офиса 192.168.88.1/24 и VLAN на bridge-lan, адрес клиента WireGuard 10.10.10.5/32 на wg-office — те же значения, что в инструкциях.',
    'wg-peers.jpg': 'WireGuard → Peers на учебном стенде: пир office с Endpoint 203.0.113.20:13231, Allowed Address 10.10.10.0/24 и 192.168.10.0/24, keepalive 25s, и пир phone с 10.10.10.2/32.'
  },

  /* Видимые значения. Добавлять только после просмотра самого jpg. */
  values: {
    'ip-address.jpg': ['10.0.2.15/24', '10.0.2.0', 'ether1'],
    'simple-new.jpg': ['queue1', '0.0.0.0/0']
  }
};
