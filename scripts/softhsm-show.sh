#!/usr/bin/env bash
set -euo pipefail
command -v softhsm2-util >/dev/null 2>&1 || { echo "softhsm2-util introuvable" >&2; exit 1; }
softhsm2-util --show-slots
