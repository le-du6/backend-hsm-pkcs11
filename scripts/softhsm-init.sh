#!/usr/bin/env bash
set -euo pipefail
: "${SOFTHSM2_CONF:=}"
: "${PKCS11_TOKEN_LABEL:=HSMDev}"
: "${PKCS11_PIN:=1234}"
: "${PKCS11_SO_PIN:=1234}"
: "${SOFTHSM_SLOT:=0}"

echo "Initialisation du token SoftHSM: $PKCS11_TOKEN_LABEL (slot $SOFTHSM_SLOT)"
command -v softhsm2-util >/dev/null 2>&1 || { echo "softhsm2-util introuvable" >&2; exit 1; }

softhsm2-util --show-slots || true

softhsm2-util --init-token --slot "$SOFTHSM_SLOT" --label "$PKCS11_TOKEN_LABEL" --so-pin "$PKCS11_SO_PIN" --pin "$PKCS11_PIN"

echo "Token initialisé"
softhsm2-util --show-slots
