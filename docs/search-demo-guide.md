# Search demo guide

Use this list to pick demo queries. Coverage is based on geocoded `diveshops` rows (232 of 752) as of 2026-10-29.

## Queries that work

| Query | Geocoded shops | Notes |
|---|---|---|
| Cozumel | Many | Distance sorting works well. |
| Playa del Carmen | Many | Distance sorting works well. |
| Cancún | Many | Distance sorting works well. |
| Isla Mujeres | Many | Distance sorting works well. |
| Florida Keys (Key Largo, Key West, Islamorada) | 15+ | Distance sorting works well. |
| San Diego, Avalon, Temecula, Huntington Beach | 10+ | Distance sorting works well. |
| Monterey, CA | 3 | Use the comma form. Results appear with the closest first. |
| Nice, Marseille, La Londe, Calvi | 34 across France | Distance sorting works well. |
| Denpasar, Bali | 3 | Works, but only a few shops to compare. |

## Queries to avoid during the demo

- **Fiji** and **Raja Ampat**: no geocoded shops. The search returns a "no shops" message. This is correct, but it is a weak demo.
- **Carmel, Pacific Grove, Seaside**: nearby towns to Monterey are not geocoded, so they will not appear.
- **Indonesia outside Bali** and **Australia**: only a few geocoded shops (6 and 5).
- **Two-letter state codes alone** (for example "CA" without a city): ignored by design. Always include the city.
- **Any place with many shops still missing coordinates**: those shops rank last with no distance order.

## Before the demo

- Run the queries above against the live app. Live search has not been tested end to end yet, only with unit tests.
- Keep to the "works" list. Avoid improvising with places outside it.
