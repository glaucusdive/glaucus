# Geo Backfill Steps

Backfills missing `diveshops.latitude` and `diveshops.longitude` using OpenStreetMap Nominatim (default) or TomTom (`--provider=tomtom`). Only accepted matches are written. Run from the repo root.

## Prerequisites

- `.env` in the repo root with `NUXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Do not commit it.
- For `--provider=tomtom`: `NUXT_PUBLIC_TOMTOM_API_KEY` in the same `.env`.
- Node 22 or later.
- Dependencies installed (`npm install`).

## Step 1: Export the list of shops missing coordinates (read-only)

```sh
node --env-file=.env scripts/list-missing-geocodes.mjs
```

Writes `csvfiles/missing-geo-shops.csv`. Expected: 752 rows before the backfill.

## Step 2: Dry run (no database writes)

Nominatim (default): about 14 minutes, one request per second.

```sh
node --env-file=.env scripts/backfill-shop-geocodes.mjs
```

TomTom: much faster, with a 100 ms delay between shops.

```sh
node --env-file=.env scripts/backfill-shop-geocodes.mjs --provider=tomtom
```

Either provider prints a summary and the path to a JSON report in the temp folder.

## Step 3: Convert the dry-run report to CSV

```sh
R=$(ls -t "$TMPDIR"geocode-backfill-*.json | head -1) && node -e 'const r=require(process.argv[1]);const q=v=>`"${String(v??"").replace(/"/g,"\"\"")}"`;const h=["id","business_name","status","reason","query","latitude","longitude","match_city","match_state","match_country","match_display"];const rows=r.map(x=>[x.id,x.name,x.status,x.reason,x.query,x.latitude,x.longitude,x.match?.city,x.match?.state,x.match?.country_code,x.match?.display_name].map(q).join(","));console.log([h.join(","),...rows].join("\n"))' "$R" > csvfiles/geocode-dry-run.csv && wc -l csvfiles/geocode-dry-run.csv
```

## Step 4: Count results by status

```sh
cut -d, -f3 csvfiles/geocode-dry-run.csv | sort | uniq -c
```

Statuses:

- `would-apply`: passed the city, state, and country check. Will be written on apply.
- `skipped`: no result, or the address did not match. The `reason` column says which.
- `failed`: request error.

## Step 5: Review

Open `csvfiles/geocode-dry-run.csv` and check a sample of `would-apply` rows. Compare `query` with `match_display`. Flag rows where the city or state looks wrong.

## Step 6: Apply the reviewed dry-run results (only after review)

Uses the Step 2 report. No Nominatim calls, so it takes seconds. Only `would-apply` rows are written.

```sh
node --env-file=.env scripts/backfill-shop-geocodes.mjs --from-report="$(ls -t "$TMPDIR"geocode-backfill-*.json | head -1)"
```

Writes `latitude` and `longitude` only where they are still null. Re-running is safe.

Alternative: `--apply` re-runs the lookups for all shops, with `--provider=tomtom` if that was the provider used. Use it only if the report is missing.

## Step 7: Post-write check

```sh
node --env-file=.env scripts/list-missing-geocodes.mjs && wc -l csvfiles/missing-geo-shops.csv
```

Expected: the row count drops by the number of applied shops.

## Notes

- Nominatim usage policy: keep one request per second and the descriptive User-Agent. Do not parallelize.
- TomTom requests count against your plan's quota. Check the remaining quota before large runs.
- City-level matches do not guarantee street-level accuracy. Spot-check a sample on a map.
- The `docs/*.csv` outputs are for review and can be deleted after the backfill.
