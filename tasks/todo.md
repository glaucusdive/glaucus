# Admin Shops Runtime Debug — in progress

- [x] Inspect admin shops API, schema migrations, auth/layout hydration paths
- [x] Define runtime hypotheses for `diveshops.notes` 500 and sidebar hydration mismatch
- [x] Add focused instrumentation without changing behavior
- [x] Reproduce and analyze debug logs
- [x] Apply only evidence-backed fix
- [ ] Verify post-fix logs and remove instrumentation after success

## Review

Runtime logs confirmed `public.diveshops.notes` is missing in the live Glaucus Supabase project (`42703`) and the layout SSR/client auth state differs on `/admin/shops`. MCP schema inspection confirmed the app and MCP point at the same Supabase project and that `notes`, `latitude`, and `longitude` are absent. MCP is read-only, so schema application must use CLI/dashboard access.
User clarified `notes` is not part of the intended schema. Removed admin/shop-info code references to `notes` and renamed the pending migration to coordinates-only.

---

# Chat home search-path examples — done

- [x] Restore the pre-search chat home landing prompt
- [x] Add five example cards matching the five search paths
- [x] Keep the five guided search-path chips visible before search
- [x] Verify: `ReadLints` on `ChatHome.vue`; `npm run build`

## Review

The empty chat state now shows the landing headline, five path-specific examples, and the rounded search path chips for location, dive shop type, certification course, dive site type, and business name. In AI-first mode the examples send natural-language searches; in guided mode they enter the matching guided path.

---

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

---

# Bottom detail drawer (chat) — done

- [x] `ChatHome.vue`: full-width chat; shop detail in bottom sheet (`detailDrawerShopId`); GSAP slide-up; close keeps `selectedShopId` for booking chip
- [x] `useSearchCache.ts`: `detailDrawerShopId` + legacy `mobileDetailShopId` read/write mirror on persist
- [x] `CardSearchResult.vue`: small bottom-right `ChevronUp` opens details; AI bubbles keep `ChevronRight` for booking form
- [x] `DiveShopDetail.vue` / `ShopDetailPanel.vue`: `showBookingCta` (false in chat drawer)
- [x] Verify: `npm test`, `npm run build`

## Review

Booking form stays in `default.vue` right drawer; shop tabs + contact live in the chat bottom sheet. Opening the booking form clears the detail sheet so the two don’t fight.

---

# AI Search Chat Reintegration — done

- [x] Feature flag: `NUXT_PUBLIC_AI_SEARCH_FIRST` (default `false`) + `nuxt.config.ts` `public.aiSearchFirst`
- [x] NLU contract: `interpretUserTurn` — `certification_course_hint`, `dive_site_type_label`, `trip_product_type`; `shared/searchAiContract.ts` doc type
- [x] Merge + DB: `searchNluMerge.ts`, course filter via `shopIdsForCourseSearch.ts` (shared with guided), `mergeInterpretSearchFacetsIntoFilters` before `buildDiveShopQuery`
- [x] Client routing: `ChatHome.vue` — AI-first empty state, `preferGuidedThisSession`, `useGuidedTurn` skips `/api/guided-flow` when AI-first unless user opts into chips; loading hints use `useGuidedTurn`
- [x] Orchestrator: `runAiSearchPostHandler` — skip trip-type chip gate when `aiSearchFirst` or NLU pinned an axis; extended NLU hints; `runTripTypeSearchAfterLlm` gets `aiSearchFirst` + abort signal
- [x] Grounded narration: `searchResultNarration.ts` after results; fewer chips when `aiSearchFirst` (`capSelectableOptionsForAiSearchFirst`, no trip-type chips on broad follow-up)
- [x] Session cache: `useSearchCache` persists `guidedSearchState`, `guidedBookingHints`, `preferGuidedThisSession` via `payloadToSessionFields`
- [x] Vitest: `tests/server/searchNluMerge.test.ts`

## Review

Enable with `NUXT_PUBLIC_AI_SEARCH_FIRST=true` and `NUXT_PUBLIC_DISABLE_CHAT_AI=false` plus `NUXT_OPENAI_API_KEY` (or `OPENAI_API_KEY`). Guided chips remain available via “Prefer step-by-step chips instead”. `npm test` passes.
