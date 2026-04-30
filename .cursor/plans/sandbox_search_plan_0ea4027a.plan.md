---
name: Rails Search Plan
overview: Rebuild the chat/search and booking experience around deterministic rails for the time crunch. Remove the LLM from route decisions, replace most free typing with chips/forms, and use DB-backed steps so repeated inputs produce the same flow.
todos:
  - id: define-state-machine
    content: Define one deterministic state machine for search and booking, with explicit allowed transitions.
    status: completed
  - id: remove-llm-routing
    content: Remove LLM-owned routing from search/booking decisions; keep only deterministic regex, chips, DB lookups, and forms.
    status: completed
  - id: chip-first-ui
    content: Replace most open-ended search prompts with chip-first guided steps and controlled inputs.
    status: completed
  - id: unify-endpoints
    content: Make stream and JSON paths share the same deterministic route output or temporarily disable stream for guided flows.
    status: completed
  - id: add-tests
    content: Add golden flow tests proving repeated user actions produce the same route and chips.
    status: completed
isProject: false
---

# Rails Search Plan

## Current Diagnosis

The screenshots show a deeper problem than a bad prompt: the app currently lets the LLM and two separate endpoint paths influence flow control. That makes repeated inputs unpredictable.

- `server/api/ai-search-stream.post.ts` and `server/api/ai-search.post.ts` do not share one route function. The same user phrase can take different paths depending on stream eligibility, NLU output, timing, and fallback behavior.
- `interpretUserTurn()` lets a model classify intent, destination, shop name, and activity. Even with JSON output, that is probabilistic enough to produce different route decisions.
- `server/utils/tripTypeSearchPipeline.ts` has a hard trip-type gate, but location fast paths can bypass it. That is why “I want to dive in Bali” can sometimes show chips and sometimes show results.
- Booking and search are interleaved in `server/api/ai-search.post.ts`, so a shop match can accidentally behave like booking progression.
- The UI currently encourages free text, then expects the backend to infer where the user wanted to go. That is the wrong tradeoff under time pressure.

## New Product Direction

Make the whole experience rails-first for now:

- The app, not the LLM, owns state and route decisions.
- Free text becomes secondary. Chips, result cards, forms, and controlled selectors become the main navigation.
- The LLM is removed from most situations. If kept, it only writes optional copy after deterministic state is known.
- Search and booking become two explicit flows with a clear handoff: search finds/selects a shop; booking collects details.
- Repeated inputs must produce repeated outputs.

## Proposed Super Flow

```mermaid
flowchart TD
  start[New Search]
  searchBy[Search Dive Businesses By]
  location[Location]
  course[Certification Course]
  siteType[Dive Site Type]
  name[Business Name]
  tripType[Optional Trip Type]
  results[Show Results]
  shopDetail[Open Shop Detail]
  bookingStart[Start Booking]
  contactName[Contact Name]
  contactEmail[Contact Email]
  tripDates[Trip Dates]
  bookingCourses[Optional Courses]
  bookingSites[Optional Dive Sites]
  diverCount[Number Of Divers]
  diverLoop[Diver Details Loop]
  diverName[Diver Name]
  diverCert[Certification Number]
  diverDives[Number Of Dives]
  diverHeight[Height]
  diverWeight[Weight]
  diverGear[Rental Gear]
  review[Review Request]
  done[Submit Request]

  start --> searchBy
  searchBy --> location
  searchBy --> course
  searchBy --> siteType
  searchBy --> name
  location --> tripType
  tripType --> results
  course --> results
  siteType --> results
  name --> results
  results --> shopDetail
  shopDetail --> bookingStart
  bookingStart --> contactName
  contactName --> contactEmail
  contactEmail --> tripDates
  tripDates --> bookingCourses
  bookingCourses --> bookingSites
  bookingSites --> diverCount
  diverCount --> diverLoop
  diverLoop --> diverName
  diverName --> diverCert
  diverCert --> diverDives
  diverDives --> diverHeight
  diverHeight --> diverWeight
  diverWeight --> diverGear
  diverGear -->|"next diver"| diverLoop
  diverGear -->|"all divers complete"| review
  review --> done
```

Primary chips:

- Search dive businesses by: `Location`, `Certification Course`, `Dive Site Type`, `Business Name`.
- Location: popular destinations plus controlled destination typeahead/search input.
- Certification course: `Discover Scuba`, `Open Water`, `Advanced Open Water`, `Rescue Diver`, `Divemaster`, `Nitrox`, `Specialty`.
- Dive site type: DB-backed labels from `dive_site_types`, including `Beach`, `Cavern/Cave`, `Cenote`, `Lake`, `Pier`, `Reef`, `Wreck`, `Wall`, `Reef/Wall`, `Wreck/Reef`, `Drop-off`, `Pinnacle`, `Marine Park`, `Marine Reserve`, `Jetty`, `Grotto`.
- Business name: controlled shop-name search input, then exact/fuzzy DB matches.
- Trip type: `Dive Shop / Day Trip`, `Liveaboard`, `Resort`, `Any`.
- Result actions: `View details`, `Start booking`, `Show more`, `Change filters`.

Search-to-booking handoff:

- Location route: carries destination/filter context for display only; it should not preselect courses or dive sites.
- Business-name route: carries selected `shopId` only; it should not preselect courses or dive sites.
- Certification-course route: carries selected course intent into booking. When booking starts, matching courses for that business should be preselected in `desiredCourses`, but the courses step still shows all course chips so the user can remove, add, or confirm with `Done`.
- Dive-site-type route: carries selected site type into booking. When booking starts, linked dive sites for that business matching the selected type should be preselected in `desiredDiveSites`, but the dive-sites step still shows all site chips so the user can add other sites or confirm with `Done`.
- Preselected choices are defaults, not hidden commitments. The user must still see and confirm them during the booking rails.

Booking rails:

- Start booking: only from a known selected business (`shopId`) via `Start booking`.
- Contact name: collect the booking contact's full name.
- Contact email: collect the booking contact's email address.
- Trip dates: collect `startDate` and `endDate`; handle long-trip confirmation if needed.
- Courses: if the business lists certification courses, offer course chips plus `None / Skip` and `Done`; preselect matching course-search context when present; if no courses are listed, auto-skip with `desiredCourses: []`.
- Dive sites: if the business lists dive sites, offer dive-site chips plus `Any / Skip` and `Done`; preselect matching dive-site-type context when present; if no sites are listed, auto-skip with `desiredDiveSites: []`.
- Diver count: collect `numberOfDivers`.
- Diver details loop: repeat one diver at a time from Diver 1 through `numberOfDivers`. For each diver, collect full name, certification number, number of dives, height plus height unit, weight plus weight unit, then rental gear, in that order.
- Rental gear: belongs inside each diver's loop. Ask gear needs for the current diver using the shop's rental gear chips; allow no gear or multiple gear items. If no rental gear is listed, show the no-rental notice, mark the current diver's gear step complete, and then move to the next diver or review.
- Review: show a pre-send summary and require explicit `Confirm send`; optional signup prompt follows the configured signup timing.
- Submit: send the booking request only after review confirmation.

Diver loop invariant:

- The booking state must carry `activeDiverIndex`, starting at `0` for Diver 1.
- The only valid field order for each diver is `name` -> `certificationNumber` -> `numberOfDives` -> `height` + `heightUnit` -> `weight` + `weightUnit` -> `gear`.
- `gear` is complete when the diver has either selected one or more `gearType` items, chosen `No rental gear`, or the shop has no listed rental gear and the no-rental notice has been acknowledged.
- After `gear`, if `activeDiverIndex + 1 < numberOfDivers`, increment `activeDiverIndex` and return to `name` for the next diver.
- After the last diver's `gear`, advance to review.
- Downstream fields for later divers must not be accepted or stored early. If a payload contains out-of-order diver fields, clamp/drop them before responding.
- Profile defaults may suggest a diver, but choosing that diver still fills only the current `activeDiverIndex` and then resumes the same field order.

## Implementation Plan

1. Define a deterministic flow contract:
   - Add a shared state shape such as `SearchFlowState` with `step`, `mode`, `destination`, `tripType`, `course`, `diveSiteType`, `selectedShopId`.
   - Define allowed steps and transitions in one utility, for example `shared/searchFlow.ts`.
   - Treat chips as commands, not natural-language suggestions.

2. Remove LLM routing from the hot path:
   - Stop using `interpretUserTurn()` for deciding search vs booking vs entity route.
   - Keep deterministic handlers for chip values, shop-name search, pagination, and booking continuation.
   - If an unsupported typed question arrives, return a controlled response with chips instead of asking the LLM to choose the flow.

3. Build chip-first search UI in `app/components/chat/ChatHome.vue`:
   - Show the next allowed choices from the flow state.
   - Start with “Search dive businesses by…” and the four branches: location, certification course, dive site type, business name.
   - Prefer controlled typeahead/search inputs for location and business name rather than general chat input.
   - Keep the existing result cards and shop detail panel, but drive them from state transitions.

4. Use existing Supabase dive site type data:
   - `supabase/migrations/20250228000006_create_dive_site_types_and_dive_sites.sql` defines `dive_site_types` and `dive_sites.dive_site_type_id`.
   - `supabase/migrations/20250228000007_insert_dive_site_types_and_dive_sites_data.sql` seeds the canonical labels.
   - `server/utils/collectShopIdsForActivityTokens.ts` already maps tokens like `cave` / `wreck` through `dive_site_types` -> `dive_sites` -> `diveshop_dive_sites`.
   - The rails implementation should expose those labels as chips and pass the selected label through deterministic `activityTokens`, not through LLM extraction.

5. Split search from booking:
   - Search returns results, selected shops, and filter chips only.
   - Booking starts only from a `Start booking` chip/button or existing booking form CTA.
   - Booking receives a known `shopId` and proceeds through the explicit rails: contact name, contact email, dates, courses, dive sites, diver count, indexed per-diver loop including gear, review, submit.
   - Booking also receives optional search context (`course`, `diveSiteType`) to preselect relevant booking chips without skipping the user-visible confirmation step.

6. Temporarily reduce or disable streaming for guided flows:
   - Either make `/api/ai-search-stream` call the same deterministic flow engine, or route guided search through `/api/ai-search` only.
   - Avoid maintaining two independent implementations while the flow is being stabilized.

7. Keep a narrow typed fallback:
   - Recognize exact deterministic patterns like a shop name, country/city, or “show more”.
   - For open-ended education text like “how can I learn how to dive”, show a fixed beginner path: explanation card plus `Find beginner courses`, `Search destinations`, `Talk to a shop`.
   - Do not let the LLM decide where that user goes.

8. Verify with golden tests:
   - Same state + same command always returns same next state.
   - “I want to dive in Bali” always enters the same destination/trip-type/results path.
   - “Dive Porter” always performs shop-name search/open behavior.
   - “Cave dive” / `Cavern/Cave` always uses the dive-site-type rail and deterministic activity-token filtering.
   - “Start booking” is the only path from selected shop into booking.
   - Stream and JSON either share identical output or stream is bypassed for guided steps.

9. Fence off legacy AI orchestration:
   - Treat `server/api/ai-search.post.ts`, `server/api/ai-search-stream.post.ts`, `interpretUserTurn()`, and the old trip-type gate as legacy orchestration, not as the foundation for the new rails.
   - Keep reusable deterministic utilities where useful: Supabase query helpers, shop detail components, result cards, course/site/gear loaders, booking send endpoint, and profile default-diver helpers.
   - Build the new guided flow behind a new route/module first, for example `server/api/guided-search.post.ts` plus shared flow utilities. Do not thread the new state machine through the old 2,000-line orchestrator.
   - Once the guided flow works, point the UI to the new route and leave the old AI route disabled or reachable only behind a feature flag for rollback.
   - Archive legacy files only after parity tests pass. Prefer moving old orchestration to clearly named legacy modules or deleting it in a follow-up cleanup PR, rather than letting both systems run in production.
   - Add tests that fail if the guided route calls OpenRouter/LLM routing helpers or returns legacy ambiguous chips.

## Acceptance Criteria

- No LLM call is required to decide the user’s next step in search or booking.
- Chips/forms drive the main experience; free text is optional and constrained.
- The same input from the same state always produces the same response.
- Search never starts booking unless the user clicks/taps an explicit booking CTA.
- “I want to dive in Bali” follows one consistent guided flow.
- “Dive Porter” consistently searches/selects that shop from the DB.
- New guided flows do not call old LLM routing, old stream routing, or the legacy trip-type gate.
- The implementation is small enough to ship under time pressure by stabilizing the existing UI instead of inventing a full new agent.