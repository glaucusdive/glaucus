# Alpha -> Beta Migration Test Matrix

This document is the single planning board for migrating alpha (TS-only) agentic logic into beta (Python-agents), while keeping TypeScript as the authoritative DB layer.

## How to Use

- Keep this file updated during migration planning and implementation.
- Each row is a migration unit anchored to an existing alpha test file.
- Use the checkbox + owner/status fields to track progress.
- Risk is migration risk to beta behavior parity.

## Key Question: Do alpha tests help validate beta Python-agent migrations?

Short answer: **Yes, partially**.

- **What they help with:** Most alpha tests validate deterministic TS logic (intent normalization, filter merge/carry-forward, booking gating, phrase extraction, trip requirements). These are excellent parity references for beta behavior.
- **What they do not fully cover:** They do not directly test Python endpoints or TS<->Python integration contracts by default.
- **Implication:** Reuse alpha tests as parity specs, then add beta-path tests for:
  - Python endpoint response shape contracts
  - TS adapter mapping (`pythonAgentsClient.ts`, `mapPythonInterpretTurn`)
  - fail-soft fallbacks when Python errors/timeouts
  - end-to-end guided-orchestrator behavior in `ORCHESTRATOR_MODE=python|hybrid`

### Tier 1 Eval Growth Plan

**Current state**: `evals/alpha_parity_eval.py` has **7 deterministic baseline cases** (JSON parsing, filter merge, confidence gating, error handling).

**Future state** (as migrations proceed):
- **Each migrated alpha test** from this matrix should have a corresponding **Tier 1 parity case** in `alpha_parity_eval.py`
- Example: When migrating `interpretUserTurn.ts` → `nlu_agent.py`, add a Tier 1 test fixture that mocks LLM response, calls NLU agent, verifies parsed intent matches alpha parsing
- Target: **Expand Tier 1 to ~25 deterministic parity cases** (one per row in the migration tracker)
- **Ownership**: As you complete each migration row, add a Tier 1 test case and update the Status column

See `docs/evaluation-and-qc-approach.md` Section 1 for full 3-tier framework: Tier 1 is the fast parity gate that grows as migrations happen.

---

## Migration Tracker (Checkbox + Owner/Status)

Status legend: `todo`, `in_progress`, `blocked`, `done`.

| Track | Alpha Test File | Primary Function/Module Under Test | What It Validates | Risk | Owner | Status |
|---|---|---|---|---|---|---|
| [ ] | `tests/server/interpretUserTurn.test.ts` | `server/utils/interpretUserTurn.ts` | NLU parse, referent phrase choice, activity normalization, destination hint merge | High | TBD | todo |
| [ ] | `tests/server/destinationToSearchFilters.test.ts` | `server/utils/destinationToSearchFilters.ts` | Destination aliases and geo filter inference (`country` vs `place`) | Medium | TBD | todo |
| [ ] | `tests/server/searchNluMerge.test.ts` | `server/utils/searchNluMerge.ts` | Merge NLU facets into search filters without overriding explicit filters | High | TBD | todo |
| [ ] | `tests/server/searchFilterCarryForward.test.ts` | `server/utils/searchFilterCarryForward.ts` | Carry-forward logic for dates/activity/course hints across turns | High | TBD | todo |
| [ ] | `tests/server/searchFilterRelaxFromFollowUp.test.ts` | `server/utils/searchFilterRelaxFromFollowUp.ts` | Filter relaxation on user widen intent | Medium | TBD | todo |
| [ ] | `tests/server/tripTypeSearchPipeline.test.ts` | `server/utils/tripTypeSearchPipeline.ts` | Trip-type inference, relax chips, specificity checks | Medium | TBD | todo |
| [ ] | `tests/shared/tripRequirements.test.ts` | `shared/tripRequirements.ts` | Trip requirement extraction/merge from search state | High | TBD | todo |
| [ ] | `tests/shared/rankCourseOptionsForTripRequirements.test.ts` | `shared/rankCourseOptionsForTripRequirements.ts` | Course ranking by requirement/certification intent | Medium | TBD | todo |
| [ ] | `tests/server/entityRouting.test.ts` | `server/utils/entityRouting.ts` | Clarify/search route decisions for ambiguous entities | High | TBD | todo |
| [ ] | `tests/server/extractReferredEntityPhrase.test.ts` | `server/utils/extractReferredEntityPhrase.ts` | Booking/shop referent extraction from free text | High | TBD | todo |
| [ ] | `tests/server/resolveBookingTarget.test.ts` | `server/utils/resolveBookingTarget.ts` | Shop disambiguation and phrase-to-shop resolution | High | TBD | todo |
| [ ] | `tests/server/bookingFlowEscape.test.ts` | `server/utils/bookingFlowEscape.ts` | Mid-booking switch/browse escape detection | High | TBD | todo |
| [ ] | `tests/shared/bookingNounResolve.test.ts` | `shared/bookingNounResolve.ts` | Operator/place hint extraction and merge precedence | High | TBD | todo |
| [ ] | `tests/shared/bookShopPick.test.ts` | `shared/bookShopPick.ts` | Booking handoff token parsing and pick gating | High | TBD | todo |
| [ ] | `tests/booking/bookingPreSend.test.ts` | `server/utils/bookingPreSend.ts` | Pre-send review, signup gate timing, ack handling | High | TBD | todo |
| [ ] | `tests/booking/bookingSendIntentGate.test.ts` | `server/utils/bookingSendIntentGate.ts` | Confirm-send detection and immediate-send guardrails | High | TBD | todo |
| [ ] | `tests/booking/bookingReviewEdit.test.ts` | `server/utils/bookingReviewEdit.ts` | Post-summary review edits and token-driven edit flow | Medium | TBD | todo |
| [ ] | `tests/booking/bookingFastPath.clamp.test.ts` | `server/utils/bookingFastPath.ts` | Next-step clamp and field-order integrity across diver payloads | High | TBD | todo |
| [ ] | `tests/booking/tripDateUserInput.test.ts` | `server/utils/tripDateUserInput.ts` | Date extraction and clarification behavior | Medium | TBD | todo |
| [ ] | `tests/booking/parseTripDates.test.ts` | `server/utils/parseTripDates.ts` | Date parsing/normalization robustness | Medium | TBD | todo |
| [ ] | `tests/server/bookingHandoffTripDates.test.ts` | booking handoff date seeding pipeline | Trip dates flow from search context into booking payload | High | TBD | todo |
| [ ] | `tests/shared/filterGearToShopOfferings.test.ts` | `shared/filterGearToShopOfferings.ts` | Rental gear sanitization against shop inventory | Low | TBD | todo |
| [ ] | `tests/shared/formatBookingReviewSummary.test.ts` | `shared/formatBookingReviewSummary.ts` | Human-readable booking summary correctness | Low | TBD | todo |
| [ ] | `tests/guided/guidedFlow.test.ts` | `shared/guidedFlow.ts` | Guided flow branch transitions and booking handoff signals | Medium | TBD | todo |
| [ ] | `tests/app/chatGuidedFlowRouting.test.ts` | `app/utils/chatGuidedFlowRouting.ts` | Guided-vs-orchestrator route decision boundaries | Medium | TBD | todo |

---

## Beta Integration Rows (New Tests to Add)

These are not alpha tests, but are required so migrated beta behavior is truly validated.

| Track | New Beta Test Target | Purpose | Risk if Missing | Owner | Status |
|---|---|---|---|---|---|
| [ ] | `server/utils/pythonAgentsClient.ts` contract tests | Ensure request/response mappings and shape compatibility with Python models | High | TBD | todo |
| [ ] | `server/api/guided-orchestrator.post.ts` mode tests | Validate `ts` vs `python` vs `hybrid` mode behavior and fail-soft paths | High | TBD | todo |
| [ ] | Python endpoint tests (`python-agents/agents/*`) | Validate `reply`, `collectedPayload`, `bookingReady`, `finalPayload` semantics | High | TBD | todo |
| [ ] | Cross-layer parity tests (alpha fixture -> beta output) | Ensure migrated behavior matches alpha intent and routing expectations | High | TBD | todo |

---

## Recommended Migration Order (from this matrix)

### 1) Migrate first (high value + deterministic + well-scoped)

- `interpretUserTurn` parity into `python-agents/agents/nlu_agent.py`
- `searchNluMerge` + `destinationToSearchFilters` semantics into beta search/orchestrator
- `tripRequirements` + `rankCourseOptionsForTripRequirements` support logic

### 2) Migrate second (booking extraction core)

- TS booking prompt/extraction flow from `runAiSearchPostHandler.ts` to `python-agents/agents/booking_agent.py`
- Preserve TS-side gates from:
  - `bookingPreSend`
  - `bookingSendIntentGate`
  - `bookingFastPath`
  - `bookingReviewEdit`

### 3) Defer last (orchestrator/high-coupling decisions)

- `entityRouting`, `resolveBookingTarget`, `bookingFlowEscape`, guided-orchestrator mode behavior
- Run only after beta contract tests are in place

---

## Known Coverage Gaps That Increase Beta Risk

- No direct unit test coverage for full `server/utils/runAiSearchPostHandler.ts` orchestration as a single system.
- No direct handler-level tests for `server/api/guided-orchestrator.post.ts` mode switching in this matrix.
- Alpha tests are mostly utility-level; integration-level parity must be added for beta path.

---

## Tier 1 Parity Test Growth (Future Milestone)

Once a migration is in progress, add a deterministic parity test to `evals/alpha_parity_eval.py`:

**Template** (using NLU as an example):
```python
# evals/alpha_parity_eval.py (to be expanded)

# Tier 1 Case: NLU intent extraction parity
def test_nlu_parity_direct_booking_intent():
    """
    Fixtures:
      - Mock LLM to return: {"goal": "start_booking", "shop_name_hint": "Cool Divers", ...}
    Test:
      - Call Python nlu_agent with mocked llm_client
      - Verify parsed intent == alpha's interpretUserTurn logic for same input
    """
    pass

# Tier 1 Case: Filter merge parity
def test_search_nlu_merge_parity():
    """
    Fixture: NLU result {destination: "Bali", activity_terms: ["drift"]} + 
             existing filters {minRating: 4.0}
    Test: Verify merged filters preserve both NLU + existing without override
    """
    pass
```

**Recommended first 5 Tier 1 additions** (highest value for parity):
1. `interpretUserTurn` → NLU intent + confidence parsing
2. `searchNluMerge` → Filter merge semantics
3. `destinationToSearchFilters` → Geo filter inference
4. `extractReferredEntityPhrase` → Shop name / booking target extraction
5. `bookingFlowEscape` → Mid-booking clarify detection

---

## Planning Cadence (Suggested)

- Weekly update owner + status fields.
- For each migrated unit, require:
  1. Alpha parity check (existing tests still pass where relevant)
  2. **Tier 1 parity case added** to `evals/alpha_parity_eval.py` (mock LLM, verify parsing)
  3. Beta contract test added (real Python endpoint)
  4. Fail-soft behavior verified
  5. DB boundary verified (TS-only writes)

Last updated: 2026-08-11

