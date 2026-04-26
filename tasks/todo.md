# Fix City Search — progress

- [x] Port location-first search into `ai-search-stream` before trip-type gate
- [x] Use pagination offset only for explicit pagination (`tripTypeSearchPipeline` + `ChatHome` body)
- [x] Scope result range labels to same `filters` fingerprint in `ChatHome.vue`
- [x] Verify: `npm run build`; curl `/api/ai-search-stream` for city + refinement + trip-type with bogus offset

## Review

Streaming path now matches JSON for NLU + geo hits: city diving queries return shop cards immediately. Non-pagination turns ignore `shopsAlreadyShownCount` on the server; the client only sends a non-zero count when the user message matches pagination patterns, summed since the last assistant message that carried search `filters`.
