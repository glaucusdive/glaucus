# Dive shop multi-location audit

**Generated:** 2026-06-13  
**Updated:** 2026-06-13 — scoped to physical locations only (dive-site junction data out of scope)  
**Source:** Live Supabase (Glaucus production) + [`csvfiles/Scuba Master Database v.12 - DiveShops.csv`](../csvfiles/Scuba%20Master%20Database%20v.12%20-%20DiveShops.csv)  
**Phase:** 1 — inventory only (no database or CSV changes)

---

## Scope

This audit covers **dive shops that operate in more than one physical location** — i.e. they need (or already have) multiple `diveshops` rows differing in city, state, country, and/or region.

**Out of scope:** Shops that link to dive sites in many countries via `diveshop_dive_sites`. That is catalog/trip data, not evidence of a second storefront or embark base. No junction-table cleanup is planned.

---

## Summary

| Metric | Count |
|--------|------:|
| Total `diveshops` rows | 740 |
| Operators with duplicate `business_name` | **12** |
| Rows belonging to those operators | **43** |
| Rows with null `city` and null `state` (location stubs) | 17 |
| CSV multi-name operators (cross-check) | 12 (matches DB) |
| Section B split candidates (single row, multiple operating locations) | 26 |
| Section C manual-research candidates | 5 operator groups |

**How location search works today:** Each searchable place is one `diveshops` row. Chat/search filters on `city`, `state`, `country_id`, and `region_id` ([`server/utils/buildDiveShopQuery.ts`](../server/utils/buildDiveShopQuery.ts)). Rows with the same `business_name` are disambiguated in the UI via city/state ([`shared/bookShopPick.ts`](../shared/bookShopPick.ts)).

**Recommended action legend**

| Action | Meaning |
|--------|---------|
| `keep` | Row is correctly placed; no split needed |
| `fix stub` | Fill null city/state (and country if missing) |
| `dedupe` | Remove duplicate row at same location |
| `split` | Create additional location rows (city/state/country/region only; copy everything else) |
| `research` | Confirm physical bases on operator website before splitting |

---

## Section A — Existing duplicate `business_name` rows

Twelve operators already have multiple `diveshops` rows. CSV row counts match the database for all twelve.

### A.1 All Star Blackbeard's Cruises (5 rows)

| id | slug | city | state | country | region | stub | missing country | Action |
|----|------|------|-------|---------|--------|:----:|:---------------:|--------|
| `983b2051-…` | `all-star-blackbeard-s-cruises-4` | Exuma Cays | Exuma | Bahamas | Caribbean | | | `keep` |
| `8d6ce575-…` | `all-star-blackbeard-s-cruises-3` | — | — | British Virgin Islands | Caribbean | ✓ | | `fix stub` |
| `4879b10a-…` | `all-star-blackbeard-s-cruises-1` | — | — | Cuba | Caribbean | ✓ | | `fix stub` |
| `881dfdd3-…` | `all-star-blackbeard-s-cruises-2` | — | — | Egypt | Northern Africa | ✓ | | `fix stub` |
| `0c46f0b9-…` | `all-star-blackbeard-s-cruises` | — | — | Indonesia | Southeast Asia | ✓ | | `fix stub` |

**Issues:** Four country-only stubs are not findable by city search.

---

### A.2 Explorer Ventures Diving Fleet (9 rows)

| id | slug | city | state | country | region | stub | missing country | Action |
|----|------|------|-------|---------|--------|:----:|:---------------:|--------|
| `3a6d3ff0-…` | `explorer-ventures-diving-fleet-3` | Saba | Caribbean Netherlands | — | Caribbean | | ✓ | `fix stub` (country: Saba) |
| `cc6a53bf-…` | `explorer-ventures-diving-fleet-7` | St. Kitts | Saint George Basseterre | Saint Kitts and Nevis | Caribbean | | | `keep` |
| `68666bb9-…` | `explorer-ventures-diving-fleet-4` | Turks & Caicos | Providenciales | Turks and Caicos Islands | Caribbean | | | `keep` |
| `c74b8064-…` | `explorer-ventures-diving-fleet-6` | Palau | Koror | Micronesia | Pacific Islands | | | `keep` |
| `ac72049c-…` | `explorer-ventures-diving-fleet-5` | Galapagos | Galapagos Province | Ecuador | South America | | | `keep` |
| `cf7e17b4-…` | `explorer-ventures-diving-fleet-8` | Maldives | Kaafu Atoll | Maldives | South Asia | | | `keep` |
| `25994128-…` | `explorer-ventures-diving-fleet-2` | Red Sea | South Sinai | Egypt | Northern Africa | | | `keep` |
| `10262bb6-…` | `explorer-ventures-diving-fleet-1` | Indonesia | Bali | Indonesia | Southeast Asia | | | `keep` |
| `00e56e4c-…` | `explorer-ventures-diving-fleet` | Silver Bank | Puerto Plata | — | Caribbean | | ✓ | `fix stub` (country: Dominican Republic) |

**Issues:** Two rows missing `country_id`. Best existing model for multi-location liveaboards (one row per operating region).

---

### A.3 Force-E Scuba Centers (8 rows)

| id | slug | city | state | country | Action |
|----|------|------|-------|---------|--------|
| `6543a358-…` | `force-e-scuba-centers-3` | Boca Raton | Florida | United States | `dedupe` (duplicate Boca) |
| `bd7d3502-…` | `force-e-scuba-centers-6` | Boca Raton | Florida | United States | `dedupe` (duplicate Boca) |
| `5dd2057d-…` | `force-e-scuba-centers-2` | Pompano Beach | Florida | United States | `dedupe` (duplicate Pompano) |
| `7b8102fa-…` | `force-e-scuba-centers-4` | Pompano Beach | Florida | United States | `dedupe` (duplicate Pompano) |
| `38c4a617-…` | `force-e-scuba-centers-1` | Boynton | Florida | United States | `keep` |
| `94c0f56e-…` | `force-e-scuba-centers-5` | Jupiter | Florida | United States | `keep` |
| `bfb7f075-…` | `force-e-scuba-centers-7` | Riviera Beach | Florida | United States | `keep` |
| `29ddc835-…` | `force-e-scuba-centers` | Fort Laurderdale | Florida | United States | `keep` (fix typo: Lauderdale) |

**Issues:** Duplicate rows at Boca Raton and Pompano Beach. Legitimate multi-branch Florida operator otherwise.

---

### A.4 Emperor Divers (4 rows)

| id | slug | city | state | country | stub | Action |
|----|------|------|-------|---------|:----:|--------|
| `53030636-…` | `emperor-divers` | Malé | Malé | Maldives | | `keep` |
| `e5a8b3a8-…` | `emperor-divers-3` | Port Ghalib Marina | Red Sea Governorate | Egypt | | `keep` |
| `8c9a2c83-…` | `emperor-divers-1` | — | — | Indonesia | ✓ | `fix stub` |
| `d29bbba5-…` | `emperor-divers-2` | — | — | Solomon Islands | ✓ | `fix stub` |

---

### A.5 Blue Water Divers (2 rows)

| id | slug | city | state | country | Action | Notes |
|----|------|------|-------|---------|--------|-------|
| `3de3f3a8-…` | `blue-water-divers-1` | Turks & Caicos | Islands | Turks and Caicos Islands | `keep` | grandturkscuba.com |
| `2b506609-…` | `blue-water-divers` | Rochelle Park | New Jersey | United States | `keep` | bluewaterdivers.com — different operator, same name |

---

### A.6 Dive Concepts (2 rows)

| id | slug | city | state | country | dive sites | Action |
|----|------|------|-------|---------|----------:|--------|
| `6b721af4-…` | `dive-concepts` | Amed | Bali | Indonesia | 58 | `keep` |
| `c5e8c7b5-…` | `dive-concepts-1` | Tulamben | Bali | Indonesia | 58 | `keep` |

---

### A.7 Diventures (2 rows)

| id | slug | city | state | country | Action |
|----|------|------|-------|---------|--------|
| `b6c73b68-…` | `diventures` | Springfield | Missouri | United States | `keep` |
| `cce59bcb-…` | `diventures-1` | Battle Creek | Michigan | United States | `keep` |

---

### A.8 Ocean Safari Scuba (2 rows)

| id | slug | city | state | country | Action |
|----|------|------|-------|---------|--------|
| `536f41b3-…` | `ocean-safari-scuba` | San Gabriel | California | United States | `keep` |
| `d07c5915-…` | `ocean-safari-scuba-1` | Monterey Park | California | United States | `keep` |

---

### A.9 The Dive Academy (2 rows)

| id | slug | city | state | country | Action |
|----|------|------|-------|---------|--------|
| `0dbc9bc2-…` | `the-dive-academy` | Las Terrenas | Samaná | Dominican Republic | `keep` |
| `5152aa96-…` | `the-dive-academy-1` | Koh Samui | Surat Thani | Thailand | `keep` |

**Note:** Likely unrelated franchises sharing a name, not one brand.

---

### A.10 The Reef Marina (2 rows)

| id | slug | city | state | country | Action |
|----|------|------|-------|---------|--------|
| `8682c24a-…` | `the-reef-marina-1` | Playa del Carmen | Quintana Roo | Mexico | `keep` |
| `77d5a570-…` | `the-reef-marina` | Puerto Aventuras | Quintana Roo | Mexico | `keep` |

---

### A.11 Blue Planet Divers (2 rows) — duplicate

| id | slug | city | state | country | Action |
|----|------|------|-------|---------|--------|
| `2afb0228-…` | `blue-planet-divers` | Koh Lanta | Krabi | Thailand | `dedupe` |
| `82320578-…` | `blue-planet-divers-1` | Koh Lanta | Krabi | Thailand | `dedupe` |

**Issue:** Identical location; merge junctions into one row and delete the other.

---

### A.12 Catalina Divers Supply (2 rows) — duplicate

| id | slug | city | state | country | Action |
|----|------|------|-------|---------|--------|
| `515f5758-…` | `catalina-divers-supply` | Avalon | California | United States | `dedupe` |
| `68a7b163-…` | `catalina-divers-supply-1` | Avalon | California | United States | `dedupe` |

**Issue:** Identical location; merge and delete one row.

---

## Section B — Single-row split candidates

These operators have **one row** but run trips from **multiple embark regions** (e.g. Komodo and Raja Ampat). Each region should become its own location row so place search works. The “operating regions” column lists where we detected missing location rows — not a dive-site cleanup task.

| business_name | id | city | country | type | Operating regions (not yet separate rows) | Suggested split rows | Action |
|---------------|-----|------|---------|------|------------------------------|---------------------:|--------|
| Calico Jack Liveaboard | `dd60933e-…` | — | Indonesia | Liveaboard | Banda Sea, Cenderawasih Bay, Komodo, Raja Ampat | 4 | `split` + `fix stub` |
| Sea Safari Cruises | `f0beefd1-…` | Denpasar | Indonesia | Liveaboard | Alor, Banda Sea, Komodo, Labuan Bajo, Morotai, Raja Ampat, South Halmahera, Sumbawa, Wakatobi | 9 | `split` |
| Dive Damai | `c3554072-…` | Komodo | Indonesia | Liveaboard | Alor, Banda Sea, Cenderawasih Bay, Halmahera, Komodo, Raja Ampat, Sumbawa, Forgotten Islands, Triton Bay | 9 | `split` |
| Tiaré Cruise | `bb47c82a-…` | Kuta | Indonesia | Liveaboard | Banda Sea, Halmahera, Komodo, Raja Ampat, Forgotten Islands, Triton Bay | 6 | `split` |
| La Galigo Liveaboard | `0e45e21b-…` | Denpasar | Indonesia | Liveaboard | Halmahera, Komodo, Raja Ampat | 3 | `split` |
| Mermaid Liveaboards | `ce746c26-…` | Denpasar | Indonesia | Liveaboard | Alor, Banda Sea, Halmahera, Komodo, Raja Ampat | 5 | `split` |
| Pindito Liveaboard | `f81adff9-…` | Komodo | Indonesia | Liveaboard | Alor, Banda Sea, Halmahera, Komodo, Raja Ampat, Triton Bay, Wakatobi | 7 | `split` |
| Seven Seas Indonesia | `0c129b30-…` | Kuta | Indonesia | Liveaboard | Alor, Banda Sea, Komodo, Raja Ampat, Forgotten Islands, Triton Bay | 6 | `split` |
| White/Blue Manta Liveaboards | `d5541293-…` | Singapore | Singapore | Liveaboard | Banda Sea, Halmahera, Komodo, Raja Ampat, Triton Bay | 5 | `split` |
| Dune Bali | `996eb56b-…` | Sanur | Indonesia | Dive Shop, Liveaboard | Alor, Banda Sea, Komodo, Labuan Bajo, Misool, Raja Ampat, Triton Bay | 7 | `split` |
| Dive Concepts Penida | `7fc530c3-…` | Nusa Penida | Indonesia | Dive Shop, Liveaboard | Alor, Banda Sea, Komodo, Labuan Bajo, Misool, Raja Ampat | 6 | `split` |
| Scubaspa Indonesia | `7da1bd18-…` | Malé | Maldives | Liveaboard | Komodo, Maluku Islands, Misool, Raja Ampat, Triton Bay | 5 | `split` |
| White Pearl | `d5ac75d7-…` | Malé | Maldives | Liveaboard | Alor, Banda Sea, Central Atolls, Deep South, Komodo, Northern Atolls, Raja Ampat, South & Central Atolls | 8 | `split` |
| Maldives Master | `d9f395b0-…` | Malé | Maldives | Liveaboard | Banda Sea, Bikini Atoll, Galapagos Islands, Halmahera, Komodo, Raja Ampat, Triton Bay | 7+ | `split` |
| Nautilus Liveaboards | `1e103b5a-…` | Cabo San Lucas | Mexico | Liveaboard | Cocos Island, La Paz, San Ignacio, Sea of Cortez, Socorro Island | 5 | `split` |
| Fun Baja | `8ea916dc-…` | La Paz | Mexico | Liveaboard | Sea of Cortez, Socorro Island | 2 | `split` |
| Rocio del Mar Liveaboard | `9a0c6c62-…` | Puerto Peñasco | Mexico | Liveaboard | Sea of Cortez, Socorro Island | 2 | `split` |
| Dive Ninja Expeditions | `38e8e328-…` | Cabo San Lucas | Mexico | Liveaboard | Komodo, La Paz, Sea of Cortez, Socorro Island | 3 | `split` |
| Sunrise Divers | `f947f18f-…` | Phuket | Thailand | Liveaboard | Komodo, Raja Ampat (+ Thailand sites) | 2 | `split` |
| Jim Abernethy's Scuba Adventures | `e9a09e5b-…` | Riviera Beach | United States | Liveaboard | Sea of Cortez | 1 | `research` (may be trip-only) |
| Blue Marlin Komodo | `92ddc7d6-…` | Labuan Bajo | Indonesia | Liveaboard | Komodo | — | `keep` (already separate name from Blue Marlin Dive) |
| Dive Komodo | `d7862b22-…` | Labuan Bajo | Indonesia | Liveaboard | Komodo | — | `keep` (single-region operator) |
| Dragon Dive Komodo | `89b543f6-…` | Labuan Bajo | Indonesia | Liveaboard | Alor, Komodo | 2 | `split` |
| Gili Air Divers | `3ac8e812-…` | Gili Air | Indonesia | Liveaboard | Komodo, Labuan Bajo | 2 | `split` |
| Manta Rhei | `ed8d266d-…` | Labuan Bajo | Indonesia | Liveaboard | Komodo, Labuan Bajo | — | `keep` |
| Uber Scuba Komodo | `e912d13c-…` | Labuan Bajo | Indonesia | Liveaboard | Komodo | — | `keep` |

**Pilot recommendation:** Start with **Calico Jack Liveaboard** (clearest case: null city/state, four distinct operating regions).

---

## Section C — Manual research candidates

These likely operate at multiple physical bases but need website verification before adding rows.

### C.1 Dressel Divers

| Field | Value |
|-------|-------|
| id | `cf234735-2d20-49f8-b610-08f2f515ddb5` |
| Current row | Cozumel, Quintana Roo, Mexico |
| type | Dive Shop, Liveaboard |

**Likely bases to confirm:** Cozumel, Playa del Carmen, Punta Cana/Bayahibe (DR), Jamaica Iberostar properties, possibly Spain/Honduras (verify on dresseldivers.com).  
**Action:** `research` → then `split` per confirmed resort location.

---

### C.2 Pro Dive International

| Field | Value |
|-------|-------|
| id | `b94bb530-6a38-48b1-8120-50fea9df9fa5` |
| Current row | Puerto Aventuras, Quintana Roo, Mexico |
| Related rows | **Pro Dive Port Elizabeth** (South Africa) — separate name, already searchable |

**Action:** `research` for additional Mexican/Caribbean resort bases on prodiveinternational.com.

---

### C.3 Blue Ocean Dive Centers and Resorts

| Field | Value |
|-------|-------|
| id | `9e359cb4-cb6d-44ea-b84f-c6b9e1732a5a` |
| Current row | Abu Dabbab, Red Sea, Egypt |
| type | Liveaboard, Dive Resort |

**Likely bases to confirm:** Marsa Alam, Hurghada, Sharm area (verify on blueocean-eg.com).  
**Action:** `research` → then `split` per confirmed property.

---

### C.4 Prodivers network (Maldives)

Already **separate business names** per island — searchable today:

| business_name | city | country |
|---------------|------|---------|
| Prodivers Kuredu | Kuredu Island | Maldives |
| Prodivers Komandoo | Komandoo | Maldives |
| Prodivers Hurawalhi | Hurawalhi | Maldives |

**Action:** `keep` — already one searchable row per island/resort.

---

### C.5 Blue Marlin (Indonesia)

| business_name | city | country |
|---------------|------|---------|
| Blue Marlin Dive | Gili Trawangan | Indonesia |
| Blue Marlin Komodo | Labuan Bajo | Indonesia |

**Action:** `keep` (already two rows under related names). Optional: normalize to shared `business_name` + location suffix.

---

## CSV cross-check

| Check | Result |
|-------|--------|
| Multi-name operators in CSV | 12 — matches DB |
| Multi-name operators in DB | 12 |
| CSV rows per operator | Identical locations to DB for all 12 |
| CSV null city/state with country | 7 rows (All Star ×4, Calico Jack, Emperor ×2) — all present in DB |
| Extra DB rows vs CSV seed (737) | +3 (Okinawa imports, test shop, etc.) |

---

## Appendix — SQL queries used

### Summary counts

```sql
SELECT COUNT(*) AS total_shops,
  (SELECT COUNT(DISTINCT business_name) FROM diveshops d2
   WHERE (SELECT COUNT(*) FROM diveshops d3 WHERE d3.business_name = d2.business_name) > 1) AS operators_with_dup_names,
  (SELECT COUNT(*) FROM diveshops d4
   WHERE (d4.city IS NULL OR trim(d4.city) = '')
     AND (d4.state IS NULL OR trim(d4.state) = '')) AS null_city_state_rows
FROM diveshops;
```

### Section A — all duplicate-name rows

```sql
SELECT d.id, d.slug, d.business_name, d.city, d.state, c.name AS country, r.name AS region, d.type,
  (d.city IS NULL OR trim(d.city) = '') AND (d.state IS NULL OR trim(d.state) = '') AS is_stub,
  c.id IS NULL AS missing_country_id
FROM diveshops d
LEFT JOIN countries c ON c.id = d.country_id
LEFT JOIN regions r ON r.id = d.region_id
WHERE d.business_name IN (
  SELECT business_name FROM diveshops GROUP BY business_name HAVING COUNT(*) > 1
)
ORDER BY d.business_name, c.name NULLS LAST, d.city NULLS LAST;
```

### Section B — liveaboard region-name sites

```sql
SELECT d.id, d.business_name, d.city, c.name AS country, d.type,
  (SELECT string_agg(DISTINCT ds.name, ', ' ORDER BY ds.name)
   FROM diveshop_dive_sites dds
   JOIN dive_sites ds ON ds.id = dds.dive_site_id
   WHERE dds.diveshop_id = d.id
     AND ds.name IN ('Komodo','Raja Ampat','Banda Sea','Cenderawasih Bay','Alor',
                     'Triton Bay','Halmahera','Cocos Island','Socorro Island',
                     'Sea of Cortez','Bikini Atoll','Galapagos Islands')) AS region_like_sites
FROM diveshops d
LEFT JOIN countries c ON c.id = d.country_id
WHERE (SELECT COUNT(*) FROM diveshops d2 WHERE d2.business_name = d.business_name) = 1
  AND d.type ILIKE '%liveaboard%'
  AND EXISTS (
    SELECT 1 FROM diveshop_dive_sites dds
    JOIN dive_sites ds ON ds.id = dds.dive_site_id
    WHERE dds.diveshop_id = d.id
      AND ds.name IN ('Komodo','Raja Ampat','Banda Sea','Cenderawasih Bay')
  )
ORDER BY d.business_name;
```

---

## Next step

See [`diveshop-multi-location-fix-plan.md`](diveshop-multi-location-fix-plan.md) for the Phase 2 implementation plan (CSV + migrations). No changes should be made until this audit is reviewed.
