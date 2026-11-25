# Search Improvement Plan

Status: draft. Refine after the geo backfill and first verification pass.

## Problem

Location searches return the wrong places:

- "dive in Monterey CA" returns Thousand Oaks shops.
- "dive sites in Fiji" returns Bali shops.
- Results appear alphabetical. They are ordered by `google_rating`, then `business_name`, with no distance term.

## Root causes (from code reading, not yet reproduced live)

- `shared/placeSearchTokens.ts` drops tokens under 4 characters, so "CA" is lost.
- `server/utils/widePlaceShopSearch.ts` ORs dive-site-linked shops into place results, so shops from other cities can enter the set.
- `server/utils/tripTypeSearchPipeline.ts` (`inferCountryFromConversation`) scans conversation history, so an earlier "Bali" can override "Fiji".
- `server/utils/searchFilterCarryForward.ts` carries geo filters forward even when the new message names a place.
- No stage checks that returned shops match the requested place.

## Plan

1. Reproduce both queries with debug logs to confirm which branch returns results. (Not done; verification was by code reading and unit tests only.)
2. Parse structured places ("City ST", "City, State", "City, Country"). **Implemented** as `parsePlaceCityState` in `shared/placeSearchTokens.ts` (US state codes and names; non-US phrases return no state). Tests: `tests/server/placeCityState.test.ts`.
3. Let the current message set the country before conversation history does. **Implemented** in `server/utils/tripTypeSearchPipeline.ts` (message checked before history).
4. Add a geo guard: if no shop matches the requested place, say so instead of returning unrelated shops. **Implemented** in the geo block of `server/utils/runAiSearchPostHandler.ts`, using `formatNoPlaceMatchesMessage`. Not yet covered by a handler-level test. Nearby or broader suggestions are not implemented.
5. Restrict dive-site-linked shops in place searches to the same country and place. **Implemented** in `server/utils/widePlaceShopSearch.ts` (no dedicated test).
6. Skip geo carry-forward when the current message names a place. **Implemented** via `userMessageNamesPlace` in `server/utils/searchFilterCarryForward.ts`.
7. Rank place results: tier, then distance from the anchor, then `google_rating`, then `business_name`. **Implemented** in `server/utils/placeProximityRank.ts`, used by the tail of `server/utils/buildDiveShopQuery.ts`. Tiers: 0 city and state match; 1 state-name token match; 2 city match in another state (dropped when a state is given); 3 other. Shops without coordinates rank last within their tier.
8. **50-mile hard radius for city/local place search (2026-11-18).** Geocode the place string with Google at query time (`geocodePlaceQuery` — no cities table / city-centroid backfill). Candidate shops come from a lat/long bounding box, then haversine keeps those within 50 miles of the place anchor (`filterShopsWithinRadiusKm`). Rank by distance from that anchor (`rankPlaceShopsByDistance`), not by city-name text. Bare US-state browse skips the radius and still uses text place matching. Expand chip (`place_radius:expand` → `skipPlaceRadius`) widens to **150 miles** of the same geocoded place; the chip stays on **Load next** pages and when the 50-mile set is exhausted (typed expand also works). If Google geocode fails, falls back to directory text match + tier ranking.

### Expected results by place (geo coverage, 2026-10-29)

| Search | Geocoded shops | Expected behavior |
|---|---|---|
| Monterey, CA | 3 | Tier 0 first, sorted by distance. Nearby towns (Carmel, Pacific Grove) are not geocoded and will not appear. |
| Cozumel, Playa del Carmen, Cancún, Isla Mujeres | 37 | Distance sorting works well. |
| Florida Keys (Key Largo, Key West, Islamorada) | 15+ | Distance sorting works. |
| San Diego, Avalon, Temecula, Huntington Beach | 10+ | Distance sorting works. |
| Nice, Marseille, La Londe, Calvi | 34 across France | Distance sorting works. |
| Denpasar, Bali | 3 | Works, but few shops to compare. |
| Fiji | 0 | Zero-result guard returns "no shops" instead of unrelated shops. |
| Raja Ampat | 0 in Raja Ampat | Zero-result guard applies. Indonesia has 6 geocoded shops, mostly Bali. |

Shops without coordinates rank last within their tier and have no distance order.

### Known limitations

- Place radius needs Google geocode success; if geocode fails, behavior falls back to tier ranking only (no hard radius).
- Bare US state names that are also cities (e.g. “New York”) skip the 50-mile radius by design (state browse).
- State matching depends on `diveshops.state` storing a name or ISO code; other formats will not match.
- A small number of shops still lack coordinates and are dropped from radius-filtered place results.

## Geo data

- Distance needs `diveshops.latitude` and `diveshops.longitude` (shop backfill; no cities table).
- The place-search anchor is Google Geocoding of the query string at request time (cached in-process). Nearby towns appear when their shop coords fall inside the radius, even if `city` text differs from the query.
- Missing shop coordinates are filled by `scripts/backfill-shop-geocodes.mjs` (dry-run by default).

## Decisions

- No schema changes or migrations in this step.
- **Place search geocode:** city/local place queries use Google Geocoding (same server key as shop backfill) to anchor the radius and to fetch shops by lat/long — not by city-name ilike. Cached in-process per place string. Bare country / bare US-state searches do not use the radius.
- Rating stays the tie-breaker after tier and distance, not the primary sort.

## Open questions

- If nothing matches "Monterey, CA": show "none in Monterey, CA" with nearby options (recommended), silently broaden to the state, or show all of California.
- Keep dive-site-linked shops for place queries but only within the same country (recommended), or remove them.
- Geocoding provider for the backfill: Nominatim (free, slow, one request per second) or TomTom (keyed, faster).
- Anchor for cities with no shops.

## Next steps

1. Done: multi-result place message now offers to narrow by city or dive type, or ask for more shops. Paging for this branch is not yet confirmed.
2. Streamline the `diveshops` table:
   - Audit duplicates and inconsistent `city`, `state`, and `country_id` values. The state filter needs one format.
   - Confirm whether the 163 TomTom rows were applied, by comparing the dry-run report with non-null `latitude`.
   - Review the 232 written coordinates for accuracy before relying on distance ranking.
   - Backfill the remaining 520 only from reviewed results, then remove `csvfiles/missing-geo-shops.csv`.
3. Live verification in the app: "dive in Monterey CA", "Fiji", "Cozumel", "Florida Keys". Record results in [search-demo-guide.md](search-demo-guide.md).
4. Add a handler-level test for the zero-result guard in `runAiSearchPostHandler.ts`.
5. Reproduce with debug logs (plan step 1) to confirm which branch returns results.
6. Raise the candidate fetch size for place queries — **done** (default 500 when `place` is set).
7. Confirm "ask for more shops" paging works in the geo branch.

### Future enhancements

- **Bug: "I want to dive in CA" returns Italian shops.** A two-letter place token is matched as a substring (`ilike '%CA%'`) across shop fields in any country. Fix: match a bare state code by exact `state` value, default to the US, and add a test that no non-US shops appear.
- **Ambiguous "CA"** (California or Canada). Resolve from conversation context or from which candidates exist in the data. If both match, ask with chips. Never default silently.
- **State-level intent via the NLU step.** Extend the JSON with `country`, `state`, and `targets` (`shops`, `dive_sites`). Search both, and label the groups separately in the reply. Zero-result groups should say so.
- **Place hierarchy.** Build a lookup that maps names and aliases to `{level, canonical name, parent}` for city, state, country, region, ocean, and continent. Use the existing `regions` table as a starting point. One filter function applies any level.
- **GenAI for fallback and wording only.** Use the model when the lookup misses (constrained JSON with a fixed level enum, validated server-side) and to summarize structured results. The database decides which shops match.
- **Dive-site coverage for state queries.** Check how many dive sites have a state or country set before relying on state-level dive-site searches.

## Verification

- Unit tests for place parsing, country precedence, and the proximity comparator.
- Existing suite: `npm test`.
- Manual: "dive in Monterey CA" returns only Monterey and California shops, nearest first. "dive sites in Fiji" returns only Fiji shops.
