#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Постоянный ключ подписи.
#
# Задача: каждая новая сборка должна ставиться поверх уже установленной,
# значит все APK подписываются ОДНИМ И ТЕМ ЖЕ ключом.
#
# Приоритет источников ключа:
#   1) GitHub Secrets: KEYSTORE_BASE64 (+ KEYSTORE_PASSWORD) — рекомендованный способ;
#   2) файл в репозитории: keystore/release.jks + keystore/keystore.properties;
#   3) если ключа нет вообще — он создаётся здесь и коммитится в репозиторий,
#      чтобы все последующие сборки использовали его же.
# ---------------------------------------------------------------------------
set -euo pipefail

KS_DIR="keystore"
KS="$KS_DIR/release.jks"
PROP="$KS_DIR/keystore.properties"
ALIAS="mikrotik-gide"

mkdir -p "$KS_DIR"

if [ -n "${KEYSTORE_BASE64:-}" ]; then
  echo "→ Ключ берём из GitHub Secrets (KEYSTORE_BASE64)"
  echo "$KEYSTORE_BASE64" | base64 -d > "$KS"
  if [ -z "${KEYSTORE_PASSWORD:-}" ]; then
    echo "::error::Секрет KEYSTORE_BASE64 задан, а KEYSTORE_PASSWORD — нет"
    exit 1
  fi
  cat > "$PROP" <<EOF
storeFile=keystore/release.jks
storePassword=${KEYSTORE_PASSWORD}
keyAlias=${KEYSTORE_ALIAS:-$ALIAS}
keyPassword=${KEYSTORE_KEY_PASSWORD:-${KEYSTORE_PASSWORD}}
storeType=JKS
EOF
  exit 0
fi

if [ -f "$KS" ] && [ -f "$PROP" ]; then
  echo "→ Постоянный ключ найден в репозитории: $KS"
  exit 0
fi

echo "→ Ключа нет — создаём новый постоянный ключ подписи"

STORE_PASS="$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
KEY_PASS="$STORE_PASS"

keytool -genkeypair -v \
  -keystore "$KS" \
  -storetype JKS \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 4096 \
  -validity 36500 \
  -dname "CN=MikroTik Gide, OU=Mobile, O=mikrotik-gide, L=Minsk, C=BY" \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" > /dev/null

cat > "$PROP" <<EOF
storeFile=keystore/release.jks
storePassword=$STORE_PASS
keyAlias=$ALIAS
keyPassword=$KEY_PASS
storeType=JKS
EOF

echo "→ Ключ создан. Сохраняем его в репозиторий, чтобы следующие сборки подписывались им же."

git config user.name "mikrotik-gide bot"
git config user.email "bot@users.noreply.github.com"
git add "$KS_DIR/release.jks" "$KS_DIR/keystore.properties"
git commit -m "chore(keystore): постоянный ключ подписи APK [skip ci]" || echo "нечего коммитить"
git push || echo "::warning::Не удалось отправить ключ в репозиторий (проверьте права workflow)"

echo "Готово."
