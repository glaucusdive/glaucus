---
name: Booking Intent Routing
overview: Fix follow-up shop-selection messages like “Let’s do Joe’s Gone Diving” so they start booking with a shown shop instead of running a new search. The plan keeps the orchestrator in charge of routing, but lets the existing NLU contribute semantic booking intent and shop-name hints.
todos:
  - id: extract-selection
    content: Add bounded selection phrase extraction for recent-result choice language.
    status: completed
  - id: nlu-booking-intent
    content: Use NLU `start_booking` / `wants_booking` plus `shop_name_hint` as effective booking intent.
    status: completed
  - id: stream-fallback
    content: Route semantic booking selections from stream endpoint to JSON booking handler.
    status: completed
  - id: regression-tests
    content: Add focused unit/regression tests and run relevant verification.
    status: completed
isProject: false
---

# Booking Intent Routing Plan

## Diagnosis
- Current booking routing in [`server/api/ai-search.post.ts`](server/api/ai-search.post.ts) starts with `BOOKING_INTENT_PATTERN`, which only catches words like `book`, `reserve`, and `booking`.
- `"Let's do Joe's Gone Diving"` does not match that regex, so `wantsToBook` stays false.
- The NLU can return `goal: "start_booking"` and `shop_name_hint: "Joe's Gone Diving"`, but the JSON route only uses `resolveBookingTargetFromPhrase(...)` when `wantsToBook` is already true.
- The streaming route in [`server/api/ai-search-stream.post.ts`](server/api/ai-search-stream.post.ts) also only falls back to the JSON booking-capable route for obvious regex/extractor matches, so this message can proceed down the search path.

## Approach
- Do not keep adding one-off “let’s book this place” cases as the main solution.
- Add a small, bounded “selection phrase” extractor for obvious post-search choice language like `let's do X`, `go with X`, `choose X`, and `I'll take X`; this helps route quickly when the shop name is present.
- Use the existing NLU as the semantic layer: after `interpretUserTurn`, compute an `effectiveWantsToBook` from explicit booking intent OR `interpretTurn.goal === 'start_booking'` OR `interpretTurn.wants_booking === true`.
- When `effectiveWantsToBook` is true and there is a `shop_name_hint` or extracted selection phrase, resolve it through `resolveBookingTargetFromPhrase(...)`, which already prefers `lastShops` before falling back to DB name matches.
- Keep ambiguity safe: if multiple shops match, show disambiguation chips; if no shop resolves, ask the user to pick from recent results rather than running a new generic search.

## Files To Change
- [`server/utils/extractReferredEntityPhrase.ts`](server/utils/extractReferredEntityPhrase.ts): add bounded selection phrase extraction and tests for `"Let's do Joe's Gone Diving"`.
- [`server/utils/interpretUserTurn.ts`](server/utils/interpretUserTurn.ts): update prompt rules so shop-selection language after search is classified as `start_booking` with `shop_name_hint`; keep model unchanged unless model docs require an update.
- [`server/api/ai-search.post.ts`](server/api/ai-search.post.ts): replace raw `wantsToBook` branching with an effective booking intent after NLU, and resolve `shop_name_hint` against `lastShops`.
- [`server/api/ai-search-stream.post.ts`](server/api/ai-search-stream.post.ts): make semantically detected booking/shop-selection turns fall back to JSON instead of streaming a search response.
- Tests under [`tests/server/`](tests/server/): add unit coverage for selection phrase extraction and NLU helper behavior; add focused regression coverage where possible without requiring live OpenRouter/Supabase.

## Verification
- Run the relevant Vitest suite, especially `tests/server/extractReferredEntityPhrase.test.ts` and `tests/server/interpretUserTurn.test.ts`.
- Manually verify the local chat flow: search Denpasar, then type `Let's do Joe's Gone Diving`; expected result is the booking flow for that shop, starting with the next booking question.
- Confirm normal searches like `I want to go diving in Denpasar`, pagination, and shop-info questions still route as search/info rather than booking.