#!/usr/bin/env bash
# Geocode a single dive shop by ID (uses OpenStreetMap Nominatim via your running app).
# Usage: ./scripts/geocode-one-shop.sh <shop-uuid>
# Example: ./scripts/geocode-one-shop.sh 7f7ff68a-f63f-4386-bfc5-6a281932e3ac
# Requires: dev server running (e.g. npm run dev), SUPABASE_SERVICE_ROLE_KEY in .env

set -e
SHOP_ID="${1:?Usage: $0 <shop-uuid>}"
BASE_URL="${BASE_URL:-http://localhost:4000}"

echo "Geocoding shop $SHOP_ID..."
res=$(curl -s -X POST "$BASE_URL/api/geocode-shop" \
  -H "Content-Type: application/json" \
  -d "{\"shopId\": \"$SHOP_ID\"}")

echo "$res" | head -c 500
echo ""
if echo "$res" | grep -q '"ok":true'; then
  echo "Done. Reload the shop's Nearby tab to see updated distance."
else
  echo "Geocoding failed or returned no result. Check address data and .env (SUPABASE_SERVICE_ROLE_KEY)."
  exit 1
fi
