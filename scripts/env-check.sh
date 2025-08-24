#!/usr/bin/env bash
set -euo pipefail

fail=0

# Charger automatiquement .env s'il existe (export de toutes les variables)
if [ -f ./.env ]; then
  # Préserver IFS et options
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

check(){
  local var="$1"; local val="${!1:-}";
  if [ -z "$val" ]; then
    echo "[MISSING] $var"; fail=1; else echo "[OK] $var=$val"; fi
}

check PKCS11_MODULE_PATH || true
check PKCS11_TOKEN_LABEL || true
check PKCS11_PIN || true

if [ $fail -eq 1 ]; then
  echo "Certaines variables sont manquantes. Voir .env.example" >&2
  exit 1
fi

# Si le module path n'est pas défini tenter une détection simple (macOS Homebrew)
if [ -z "${PKCS11_MODULE_PATH:-}" ]; then
  if command -v brew >/dev/null 2>&1; then
    guess="$(brew --prefix softhsm 2>/dev/null)/lib/softhsm/libsofthsm2.so"
    if [ -f "$guess" ]; then
      echo "Suggestion: export PKCS11_MODULE_PATH=$guess" >&2
    fi
  fi
fi

echo "Environnement PKCS#11 prêt."
