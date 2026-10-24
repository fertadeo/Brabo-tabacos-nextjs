#!/usr/bin/env bash
# Uso: ./scripts/fork-from-gold.sh <cliente-slug> <App Name>
# Ejemplo: ./scripts/fork-from-gold.sh brabo-tabacos "Brabo Tabacos"
set -euo pipefail
SLUG="${1:?slug}"
NAME="${2:?display name}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Checklist alta $NAME ($SLUG) — ver scripts/alta-instancia.md"
echo "1) Crear repos $SLUG + ${SLUG}-api"
echo "2) Copiar GOLD template → $SLUG"
echo "3) .env: NEXT_PUBLIC_APP_NAME=\"$NAME\" FEATURE_REPARACIONES=false"
echo "4) migrate/seed API"
echo "5) smoke login/stock/venta"
echo "6) push main"
