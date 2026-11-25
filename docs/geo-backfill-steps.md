# Geo Backfill Steps

Backfills missing `diveshops.latitude` and `diveshops.longitude` using **Google Geocoding** (preferred), OpenStreetMap Nominatim, or TomTom. Match order: street → city (soft city/state match) → **admin** (Google hit in the same country when city/state disagree) → **country** (centroid from `countries.latitude` / `longitude`). Run from the repo root.

New and edited shops are geocoded automatically on admin create/update (and approved portal submissions) when `NUXT_GOOGLE_GEOCODING_API_KEY` is set. This runbook is for the one-time backfill of existing null rows.

## Prerequisites

- `.env` in the repo root with `NUXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Do not commit it.
- For `--provider=google` (recommended): `NUXT_GOOGLE_GEOCODING_API_KEY` or `GOOGLE_GEOCODING_API_KEY` (server-only; never `NUXT_PUBLIC_*`).
- For `--provider=tomtom`: `NUXT_PUBLIC_TOMTOM_API_KEY` in the same `.env`.
- Node 22 or later (Google provider imports shared TypeScript via `--experimental-strip-types`).
- Dependencies installed (`npm install`).
- **Ask before any `--apply` / `--from-report` write against hosted Supabase.**

## Step 1: Export the list of shops missing coordinates (read-only)

```sh
node --env-file=.env scripts/list-missing-geocodes.mjs
```

Writes `csvfiles/missing-geo-shops.csv`.

## Step 2: Dry run (no database writes)

Google (preferred):

```sh
node --env-file=.env --experimental-strip-types scripts/backfill-shop-geocodes.mjs --provider=google
```

Optional: `--limit=N` for a small sample.

Nominatim (default, ~1 req/s):

```sh
node --env-file=.env --experimental-strip-types scripts/backfill-shop-geocodes.mjs
```

TomTom:

```sh
node --env-file=.env --experimental-strip-types scripts/backfill-shop-geocodes.mjs --provider=tomtom
```

Either provider prints a summary and the path to a JSON report in the temp folder.

## Step 3: Convert the dry-run report to CSV

```sh
R=$(ls -t "$TMPDIR"geocode-backfill-*.json | head -1) && node -e 'const r=require(process.argv[1]);const q=v=>`"${String(v??"").replace(/"/g,"\"\"")}"`;const h=["id","business_name","status","reason","query","latitude","longitude","match_city","match_state","match_country","match_display","level"];const rows=r.map(x=>[x.id,x.name,x.status,x.reason,x.query,x.latitude,x.longitude,x.match?.city,x.match?.state,x.match?.country_code,x.match?.display_name,x.level].map(q).join(","));console.log([h.join(","),...rows].join("\n"))' "$R" > csvfiles/geocode-dry-run.csv && wc -l csvfiles/geocode-dry-run.csv
```

## Step 4: Count results by status

```sh
cut -d, -f3 csvfiles/geocode-dry-run.csv | sort | uniq -c
```

Statuses:

- `would-apply`: passed the city, state, and country check. Will be written on apply.
- `skipped`: no result, or the address did not match. The `reason` column says which.
- `failed`: request or write error.

## Step 5: Review

Open `csvfiles/geocode-dry-run.csv` and check a sample of `would-apply` rows. Compare `query` with `match_display`. Flag rows where the city or state looks wrong. `level` is `street`, `city`, `admin` (province/island Google hit in the right country), or `country` (DB country centroid — coarsest).

## Step 6: Apply the reviewed dry-run results (only after review + approval)

Uses the Step 2 report. No geocode API calls. Only `would-apply` rows are written, and only where `latitude` is still null.

```sh
node --env-file=.env --experimental-strip-types scripts/backfill-shop-geocodes.mjs --from-report="$(ls -t "$TMPDIR"geocode-backfill-*.json | head -1)"
```

Alternative: `--apply` re-runs the lookups. Prefer `--from-report` after review.

## Step 7: Post-write check

```sh
node --env-file=.env scripts/list-missing-geocodes.mjs && wc -l csvfiles/missing-geo-shops.csv
```

Expected: the row count drops by the number of applied shops.

## Country centroid gaps (optional)

Two countries may lack centroids (used as SQL nearby fallback when a shop has no coords):

```sh
node --env-file=.env scripts/fill-missing-country-geocodes.mjs
# after approval:
node --env-file=.env scripts/fill-missing-country-geocodes.mjs --apply
```

## Ongoing: new shops

Admin create (`POST /api/admin/shops`), admin patch when address fields change, approved portal submissions, and `POST /api/geocode-shop` use Google via `shared/geocodeAddress.ts` when the server key is set. Shop save succeeds even if geocoding fails; coords stay null.

## Current database status (checked 2026-11-18, after Google apply)

| Check | Count |
|---|---|
| Total `diveshops` rows | 752 |
| `latitude` or `longitude` null | 11 |
| Both coordinates set | 741 |
| Countries missing centroids | 0 (Curaçao + U.S. Minor Outlying Islands filled 2026-11-18) |

Google dry-run then `--from-report` applied **509** of 520 missing rows (street/city/admin/country levels). Remaining 11 are mostly shops with no address (and one address mismatch).

## Notes

- Google Geocoding requests count against your Cloud billing/quota. Enable the Geocoding API on the key.
- Nominatim usage policy: keep one request per second and the descriptive User-Agent. Do not parallelize.
- City-level matches do not guarantee street-level accuracy. Spot-check a sample on a map.
- The `csvfiles/*.csv` outputs are for review and can be deleted after the backfill.
- There is no `cities` table; city fallback writes coordinates onto the shop row.
