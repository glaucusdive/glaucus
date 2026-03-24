# Booking agent hardening plan

- [x] Add runtime booking payload guard in `server/api/ai-search.post.ts`
  - Wrap existing clamp calls with a helper that:
    - applies `clampBookingPayloadToNextStep`
    - compares before/after payload snapshots
    - logs a structured warning when clamping had to remove or fix fields
  - Keep behavior unchanged; only add visibility.

- [x] Add test runner support (Vitest)
  - Add `test` and `test:run` scripts in `package.json`.
  - Add `vitest` as a dev dependency.
  - Add a simple `vitest.config.ts` targeting server utility tests.

- [x] Add booking flow unit tests
  - `server/utils/bookingFastPath.test.ts`:
    - step order checks (`name -> email -> dates -> courses -> diveSites -> numberOfDivers -> diver fields -> gear -> ready`)
    - clamp strips premature diver data before optional steps complete
    - clamp auto-completes courses/diveSites when shop has none
    - unit-only weight reply updates correct diver
  - `server/utils/mergeBookingCollected.test.ts`:
    - empty optional arrays from LLM stay pending unless user explicitly finished
    - merge retains prior data and only overlays parsed fields

- [x] Verify and document
  - Run tests.
  - Add review notes and outcomes to this file.

---

## Review

- Implemented:
  - Added runtime booking payload guard wrapper in `server/api/ai-search.post.ts` that logs when clamp corrected out-of-order payload fields.
  - Added Vitest setup:
    - `vitest.config.ts`
    - npm scripts: `test`, `test:run` (both run `nuxt prepare` first so `.nuxt/tsconfig.*` exists)
  - Added focused unit tests:
    - `server/utils/bookingFastPath.test.ts` (step order, clamping, unit-only weight update)
    - `server/utils/mergeBookingCollected.test.ts` (optional-step empty-array sanitation and merge overlay)

- Verification:
  - Ran `npm run test:run`
  - Result: 2 test files passed, 6 tests passed.
