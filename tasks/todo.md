# Fix City Search — progress

- [x] Port location-first search into `ai-search-stream` before trip-type gate
- [x] Use pagination offset only for explicit pagination (`tripTypeSearchPipeline` + `ChatHome` body)
- [x] Scope result range labels to same `filters` fingerprint in `ChatHome.vue`
- [x] Verify: `npm run build`; curl `/api/ai-search-stream` for city + refinement + trip-type with bogus offset

## Review

Streaming path now matches JSON for NLU + geo hits: city diving queries return shop cards immediately. Non-pagination turns ignore `shopsAlreadyShownCount` on the server; the client only sends a non-zero count when the user message matches pagination patterns, summed since the last assistant message that carried search `filters`.

---

# Bali resort / trip-type filtering — done

- [x] Shared `TRIP_TYPE_GATE_PATTERN`, `inferCanonicalDiveTypesFromUserMessage`, `mergeInferredDiveTypesIntoFilters` in `tripTypeSearchPipeline.ts`
- [x] Location-first paths merge inferred `diveTypes` (JSON + stream APIs)
- [x] `runTripTypeSearchAfterLlm` merges inferred types after LLM parse when missing
- [x] Vitest: `tests/server/tripTypeSearchPipeline.test.ts`

## Review

Explicit phrasing like “dive resorts in Bali” now applies `Dive Resort` before the location-first DB query and as a fallback after FILTERS parse. Plural `resorts` / `liveaboards` match the trip-type gate. Multi-type rows still come from `diveshops.type` + existing `CardSearchResult` display.

---

# Booking review gate — done

- [x] Confirm ready paths use `resolvePreSendWhenPayloadReady` (fix `send anyway` when payload already `ready`)
- [x] Richer pre-send summary in `shared/formatBookingReviewSummary.ts`
- [x] `server/utils/bookingReviewEdit.ts` + `shared/bookingReviewEditTokens.ts` for NL + chip follow-ups; `pendingReviewEdit` on `BookingPayloadLocal`
- [x] Wire `tryHandleBookingReviewEditTurn` in `ai-search.post.ts`; `review my booking` when ready uses pre-send gate
- [x] Client + server send phrases: “I’m ready to send”, “send form”; `ChatHome.vue` + `isConfirmSendMessage`
- [x] Vitest: `tests/booking/bookingReviewEdit.test.ts`, formatter + `bookingPreSend` clear flags

## Review

Mandatory review remains `resolvePreSendWhenPayloadReady`. Edits during/after review clear presend ack via `clearBookingPreSendFlags`; re-open review after one-shot field updates when the step machine returns to `ready`.

---

# Rails Search Plan (guided flow) — done

- [x] Shared deterministic state + commands: `shared/guidedFlow.ts` (`applyGuidedSearchCommandPure`, chips, parsers)
- [x] Server: `server/utils/runGuidedSearchTurn.ts` + `server/api/guided-flow.post.ts` (no LLM on search path)
- [x] Client: `ChatHome.vue` — when `useGuidedSearch` and not booking / entity-clarify, POST `/api/guided-flow`; persist `guidedSearchState` / hints in cache; chip-first empty state; `streamEligible` excludes guided search
- [x] Step back restores `guidedSearchState` and `guidedBookingHintsSnapshot` from history
- [x] Start booking merges optional course / dive-site-type hints without empty-array placeholders
- [x] Vitest: `tests/guided/guidedFlow.test.ts`

## Review

Guided search uses `/api/guided-flow` for search rails; booking and other JSON turns use POST `/api/guided-orchestrator` (implementation in `server/utils/runAiSearchPostHandler.ts`). POST `/api/ai-search` returns 410. `npm test` passes (including new guided tests).
