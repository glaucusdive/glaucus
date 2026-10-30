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

1. Reproduce both queries with debug logs to confirm which branch returns results.
2. Parse structured places ("City ST", "City, State", "City, Country") in `server/utils/destinationToSearchFilters.ts`.
3. Let the current message set the country before conversation history does.
4. Add a geo guard: if no shop matches the requested place, say so and offer nearby or broader options instead of unrelated shops.
5. Restrict dive-site-linked shops in place searches to the same country and place.
6. Skip geo carry-forward when the current message names a place.
7. Rank place results: tier (same city, then state, then country), then distance from the anchor, then `google_rating`, then `business_name`. Shops without coordinates rank last within their tier.

## Geo data

- Distance needs `diveshops.latitude` and `diveshops.longitude`.
- The anchor for a city is the centroid of geocoded shops in that city.
- Missing coordinates are filled by a one-time backfill, `scripts/backfill-shop-geocodes.mjs`. It defaults to a dry run, accepts only results that match the stored city, state, and country, and writes a report of everything it skipped.
- Cities with no geocoded shops have no anchor yet. This is a follow-up.

## Decisions

- No schema changes or migrations in this step.
- No external place API for now. A place index (GeoNames or cached geocoder results) is a candidate for later.
- Rating stays the tie-breaker, not the primary sort.

## Open questions

- If nothing matches "Monterey, CA": show "none in Monterey, CA" with nearby options (recommended), silently broaden to the state, or show all of California.
- Keep dive-site-linked shops for place queries but only within the same country (recommended), or remove them.
- Geocoding provider for the backfill: Nominatim (free, slow, one request per second) or TomTom (keyed, faster).
- Anchor for cities with no shops.

## Verification

- Unit tests for place parsing, country precedence, and the proximity comparator.
- Existing suite: `npm test`.
- Manual: "dive in Monterey CA" returns only Monterey and California shops, nearest first. "dive sites in Fiji" returns only Fiji shops.
