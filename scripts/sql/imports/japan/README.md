# Japan dive shop manual SQL reimport (v.13)

Reimport Okinawa dive shops from [`csvfiles/Scuba Master Database v.13 - Japan Export.csv`](../../../../csvfiles/Scuba%20Master%20Database%20v.13%20-%20Japan%20Export.csv) using idempotent SQL. This workflow documents the manual process before building a bulk country importer.

## CSV column layout (no header row)

| Col | Field | DB column / notes |
|-----|-------|-------------------|
| 0 | business_name | `diveshops.business_name` |
| 1 | street_address | `diveshops.street_address` |
| 2 | website_url | Match key for existing UUID |
| 3 | city | `diveshops.city` |
| 4 | state | `diveshops.state` |
| 5 | country | Resolve → `country_id` (`Japan`) |
| 6 | region | Resolve → `region_id` (`East Asia`) |
| 7 | phone | Trim whitespace |
| 8 | email | Trim whitespace |
| 9 | courses | `diveshop_courses` via `courses.certification_name` |
| 10 | rental gear | `diveshop_rental_equipment` via `rental_equipment.name` |
| 11 | gases | `diveshop_gases` via `gases.name` |
| 12 | type | Store as `Dive Shop` (UI shows “Dive Shop / Day Trip”) |
| 13 | dive sites | `diveshop_dive_sites` via alias map + Japan scope |

## Normalization rules

- **Locale:** `city || ', ' || state` when both present.
- **Type:** CSV `Dive Shop / Day Trip` → DB `Dive Shop` ([`shared/diveBusinessTypes.ts`](../../../../shared/diveBusinessTypes.ts)).
- **Match key:** Normalized `website_url` (trim, lowercase, strip trailing `/`) maps to stable UUIDs from v.12 bulk import stubs.
- **Courses:** When multiple agencies share a `certification_name`, prefer **PADI**, then NAUI, then SSI.
- **Dive sites:** Map CSV colloquial names through alias table; only link sites where `dive_sites.country_id = Japan`. Unmapped CSV names are skipped (see gap report).

## Dive site alias map (Okinawa)

| CSV name | Canonical DB name (Japan) |
|----------|---------------------------|
| Blue Cave | Maeda Point (Blue Cave) |
| Cape Maeda | Maeda Point (Blue Cave) |
| Zanpa / Zampa | Maeda Point (Blue Cave) |
| Kerama Islands | Kerama Island Reef |
| Tokashiki Island | Kerama Island - Tokashiki Reef |
| Yonaguni Island | Yonaguni Monument |
| USS Emmons | USS Emmons |

Many CSV site names (Manza, Aguni Island, Sunabe, Manta Point, etc.) have **no Japan row** in `dive_sites` yet. They appear as `missing` in the gap report and are not linked until sites are added.

## Run order

1. **`00-preflight-audit.sql`** — Confirm target UUIDs exist, junction counts, Japan/East Asia FKs, website match status.
2. **`01-reference-data-gaps.sql`** — Courses, rental, gases, dive sites: missing / duplicate / alias-mapped.
3. **Prerequisite migration** — [`supabase/migrations/20260531100000_rental_equipment_camera.sql`](../../../../supabase/migrations/20260531100000_rental_equipment_camera.sql) adds `Camera` rental row.
4. **Reimport migration** — [`supabase/migrations/20260531100001_reimport_japan_diveshops_v13.sql`](../../../../supabase/migrations/20260531100001_reimport_japan_diveshops_v13.sql) (regenerate with `node scripts/generate-japan-reimport-migration.cjs` if CSV changes).
5. **`04-post-verify.sql`** — Core fields, junction counts, smoke SELECT.
6. **Geocode** (optional, per shop after addresses are filled):

```bash
./scripts/geocode-one-shop.sh e832b005-4050-4345-9dea-736125dbeb68
```

Requires dev server and `SUPABASE_SERVICE_ROLE_KEY`.

## One-shop manual variant

Copy one shop block from the reimport migration:

1. `UPDATE diveshops SET … WHERE id = '<uuid>'`
2. Junction `INSERT … ON CONFLICT DO NOTHING` blocks for that UUID

Use the same PADI-preferring course subquery and dive-site alias `VALUES` list.

## Target shop UUIDs

| Shop | UUID |
|------|------|
| Alpha Dive | `e832b005-4050-4345-9dea-736125dbeb68` |
| Blue Magic | `1d862843-0a79-49dd-be9b-860e29c1b167` |
| Dive Centre Okinawa 39ers | `fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c` |
| Divers 7 | `cf1b2154-8f41-472f-8f5f-7adcb2521cba` |
| English Empire Divers Okinawa | `70de74c3-cab5-4d32-8adc-b858b8488dd9` |
| Isles | `6e7279fe-6681-4f2c-8487-b146c487b7c1` |
| Lagoon Dive Shop | `ab56b705-85d3-4d36-9fd4-983868c02f65` |
| Okidives | `2800435d-1d7e-4935-9315-3398c75415cd` |
| Okinawa Diving Center | `7e255a99-2864-4a55-b676-7771e3783b53` |
| Okinawa Diving Shop Sensuiya | `ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e` |
| Reef Encounters | `b955fdb5-5fb3-411d-a34f-b668a577c165` |

## Lessons for bulk importer (`generate-diveshops-migration.cjs`)

| v.12 generator gap | Manual fix to encode |
|--------------------|----------------------|
| Random UUIDs | Match by normalized `website_url`; UPDATE stubs |
| No idempotency | `ON CONFLICT DO NOTHING` on junctions |
| Course name only | PADI-first `DISTINCT ON (certification_name)` |
| Dive site exact match | Country-scoped alias map |
| Type passthrough | Normalize to `Dive Shop` |
| No preflight | Emit audit SQL alongside migration |
| NULL country on stubs | Always subselect `countries` / `regions` |

Reference generator for this import: [`scripts/generate-japan-reimport-migration.cjs`](../../../../scripts/generate-japan-reimport-migration.cjs).

## Prior one-by-one paths in repo

- **Admin UI:** [`app/pages/admin/shops.vue`](../../../../app/pages/admin/shops.vue)
- **Idempotent SQL template:** [`supabase/migrations/20250308000000_insert_test_diveshops_dive_porter_dive_shash.sql`](../../../../supabase/migrations/20250308000000_insert_test_diveshops_dive_porter_dive_shash.sql)
- **Geocode:** [`scripts/geocode-one-shop.sh`](../../../../scripts/geocode-one-shop.sh)
