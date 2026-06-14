# TripRequirements — Phase 1 State Mapping

Pre-implementation inventory of existing state structures and constraint propagation gaps.

## Existing structures

| Structure | Location | Created | Updated | Consumed |
|-----------|----------|---------|---------|----------|
| **SearchFilters** | `server/utils/buildDiveShopQuery.ts` | Search LLM `FILTERS:`, NLU merge, guided `state.filters` | Each search turn; `carryForwardUnsetSearchAxes` | `buildDiveShopQuery`, pagination, badges, client `msg.filters`, `lastSearchFilters` echo |
| **bookingPayload** | `server/utils/runAiSearchPostHandler.ts`, `server/utils/bookingFastPath.ts` | Booking entry, fast path, LLM `COLLECTED:` | Each booking turn; `clampBookingPayloadToNextStep` | `getNextBookingStep`, chips, `/api/booking`, client `msg.payload` |
| **bookingHints** (guided) | `server/utils/runGuidedSearchTurn.ts` | `courseIntent`, `diveSiteTypeLabel` on results | Each guided results step | Client → `guidedBookingHints` |
| **guidedBookingHints** | `app/components/chat/ChatHome.vue` | Guided response `bookingHints` | Guided search only | `handleStartBookingFromPanel` → `pendingBookingPayload` (panel/card only) |
| **lastSearchFilters** | Client-derived from last search assistant msg | N/A (echo) | Per request from `lastSearchContext.filters` | Server search pagination/relax only — **not booking** |
| **inferDesiredCourseNamesFromConversation** | `server/utils/inferCoursesFromConversation.ts` | N/A | At courses step | `applyInferredCoursesToPayloadIfEligible` (5 call sites) |
| **Session memory** | `app/composables/useSearchCache.ts` | Cache restore | `persistCache` watch | Session switch, restore |

## Property trace (constraint-relevant)

| User constraint | Search phase | Booking phase | Gap |
|-----------------|--------------|---------------|-----|
| Location (Bali) | `SearchFilters.place/country/region` on assistant `filters` | Not on payload | Lost at handoff |
| Advanced course | `SearchFilters.certificationCourseHint` | `desiredCourses` via text inference | **Critical gap** |
| Wreck diving | `SearchFilters.activityTokens` | `desiredDiveSites` via guided client helper only | **Critical gap on orchestrator path** |
| Liveaboard | `SearchFilters.diveTypes` | Not stored | `tripProductType` in TripRequirements |
| Dates | `SearchFilters.dates` (weak) | `startDate/endDate` | Separate collection |
| Party size | Not captured | `numberOfDivers` step 6 | Not in scope |
| Budget | Not implemented | Not implemented | Not in scope |

## Inference call sites (Phase 4 targets)

- `server/utils/runAiSearchPostHandler.ts`: ~1024, 1101, 1248, 1381
- `server/utils/bookingApplyParsedTripDates.ts`
- `server/utils/bookingReviewEdit.ts` (via `applyParsedTripDatesToBookingPayload`)
