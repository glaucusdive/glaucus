# Implementation Log

## 2026-10-25 - Mobile page zoom locked off

- Site viewport is now `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` in `app/app.vue`.
- Text inputs, textareas, and selects are 16px up to 1024px and on coarse pointers, so iOS does not zoom the page when the chat keyboard opens. Checkboxes, radios, and file inputs are unchanged.
- Desktop field sizes stay on the existing Tailwind scale. No database or config migration.
- Verification: local dev server at `http://localhost:3000`. Rendered viewport meta is `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`. At a 390px mobile viewport, the chat field, email field, and password field compute to 16px; focusing the chat field and typing left `visualViewport.scale` at 1. At 1440px the chat field stays 14px. A physical iPhone was not used.

## 2026-10-20 - Certification issue month and year

- Certification Issued fields now reuse the Month and Year dropdowns in owner settings, embedded public-profile editing, and admin editing. Training date controls are unchanged.
- Existing full dates load as month/year. Dates remain optional, and explicit Save normalizes supplied issue dates to the first day of the selected month before writes. No database migration or bulk backfill is required.
- Verification: both changed Vue templates compiled; 25 existing focused date-helper and admin job-date tests passed. Browser interaction and database saves were not exercised for this change.

## 2026-10-20 - Account and access-model discussion record

- Added [Accounts, Workspaces, And Access Model](accounts-workspaces-access-model.md) and linked it from the README documentation map.
- Captured overlapping diver/professional/business capabilities, multi-business management, separate many-to-many professional affiliations, consent/invitations, Team versus Access UI, and internal moderator/support/admin/developer/tester boundaries.
- The document is a proposal, not an implemented permission system. The current client role shape remains unchanged; no memberships, payroll system, schema, roles, access grants, or workspace UI were created.

## 2026-10-20 - Documentation map and docs-first workflow

- Added the [README documentation map](../README.md#documentation) and an always-on [Cursor docs-first rule](../.cursor/rules/docs-first.mdc). The rule directs agents to relevant docs, then owning code/tests, before solutions; it is guidance rather than a hook and is not automatically shared with other editors.
- Updated the [divemaster plan](dive-master-plan.md#current-implementation) to separate implemented editing/dates/reviews from the broader proposed directory and approval model. Updated [review documentation](divemaster-review-flow.md) for owner/visitor UI and server-side self-review protection.
- Added the [location-autocomplete design](location-autocomplete-design.md) as a proposal only: independently sourced local directory first, Google fallback with explicit storage/attribution/session/billing requirements. Google-selected profile persistence remains a terms-review gate. No location integration, schema/import, credential configuration, or paid provisioning was implemented.
- This entry records documentation and guidance changes, not a new application release or a rerun of the historical test/build results below. See the feature documents for implementation boundaries.
- Documentation verification: local file links and Markdown heading anchors passed checks across all six touched files; Cursor rule YAML parsed with `alwaysApply: true` and a nonempty description. Rule loading inside Cursor was not observed. Application tests/build were not rerun for this documentation-only update.

## 2026-10-20 - Divemaster profile editing and month-only job dates

### Past jobs

- Start/end inputs use explicit Month and Year dropdowns in owner Profile Settings, public-profile edit mode, and the admin editor. Year choices run from the current year back to 1950, newest first, retaining existing saved years outside that range. Certification and training dates are unchanged.
- Public employment dates use MM/YY. Existing full dates load as the same month/year without modifying the database; only an explicit Save normalizes submitted job dates to YYYY-MM-01, including when another profile field was edited.
- Date validation runs before writes. Blank dates and Current role behavior remain supported; selecting only a month or year requires completing the pair before saving. No migration or bulk backfill is required. Explicit dropdowns avoid unsupported native month inputs appearing as empty text boxes.

### Edit from the public profile

- The signed-in owner sees a pencil beside their name. It opens the same shared editor used by Profile Settings, with a sticky Save/Cancel toolbar and no account or moderation controls.
- Save refreshes the public profile before returning to read-only view. The pencil remains available for repeated editing. Cancel discards the draft; dirty navigation prompts before leaving.
- Dirty Cancel and internal navigation use a styled, accessible discard dialog with existing secondary/danger buttons. Keep Editing receives default focus; Escape and backdrop clicks preserve the draft. Clean Cancel exits immediately. Tab-close/reload warnings remain browser-controlled.
- Owners retain the rating, review count and review list, but see 0 Reviews rather than a self-review invitation when empty. The review form and review-author controls are hidden for owners and while signed-in ownership is unresolved; other visitors retain the existing review flow.
- Failed saves retain the draft. If saving succeeds but refreshing fails, a refresh-only retry does not repeat writes. Existing authenticated RLS and publication restrictions remain unchanged.
- The shared owner editor preserves certification metadata, linked job shops, and dive-site notes. Multi-table saves are still separate operations, not an atomic transaction; a late failure can partially persist changes.

### Verification

- Full suite: 616 passed, 1 live test skipped. Production build passed; touched-file editor diagnostics are clear.
- Added 25 focused date conversion and admin-handler tests, including rejection before any writes.
- Browser checks with synthetic in-memory data verified legacy-date display, no writes on view/open, owner-only pencil visibility, save/refresh/reopen, cancellation, save failure, refresh-only recovery, existing Settings, and admin month-date serialization.
- Discard-dialog checks verified no browser confirm calls, preserved drafts on Keep Editing/Escape/backdrop, no writes on discard, restored pencil focus, deferred internal navigation, mobile fit, and keyboard focus containment.
- Owner-review UI checks verified neutral zero-review wording, preserved rating/count/list with reviews, no self-review form or email prompt, no invitation during delayed ownership lookup, and unchanged signed-in visitor and guest review flows. The profile page compiles successfully.
- Desktop (1280px) and mobile (390px) checks passed; mobile editor has no horizontal overflow and Save/Cancel remain visible. No live profile records were read or changed during these browser checks. Dropdown display, current-job disabling, incomplete-date validation, year ordering and first-of-month persistence were checked in Chromium.

## 2026-10-16 — Reviews, ratings, and result-card navigation

### Divemaster reviews

- Added public reviews for published divemaster profiles, with confirmed-email posting, one review per user/profile, author-only edits/deletes, and self-review prevention.
- Added sanitized review read/write/delete endpoints and the profile review form/list.
- Added an average-rating summary row that links to the Reviews section. It shows an unrated/unavailable state rather than inventing a score when there is no data.
- Added chat routing for named divemasters and generic shop-vs-divemaster review requests. Chat links to the profile and does not collect review content.

### Shop review summaries and cards

- Search cards now use only Glaucus shop reviews for their average and count; Google ratings are not mixed with community review counts.
- Added a Postgres aggregate RPC to calculate average/count without fetching every review row.
- Changed the card's lower-right action from an up-caret drawer control to a labeled **View profile** link with a right arrow. **Book this** remains the booking action.
- Added a deterministic response for simple greetings so messages like “hi” do not invoke search/LLM work.

### Database changes

- `supabase/migrations/20261016120000_divemaster_reviews.sql` — divemaster review table, constraints, timestamp and author-name triggers.
- `supabase/migrations/20261016130000_shop_review_summaries.sql` — invoker-security function for Glaucus shop review summaries.

### Verification and rollout

- Full test suite: 566 passed, 1 existing live-OpenAI test skipped. Production build passed after the rating/count implementation.
- The focused shop-card enrichment tests passed; browser check confirmed **View profile** navigates to `/shops/{slug}`.
- The later border/style refinements passed editor diagnostics.
- Apply both migrations above in each Supabase environment before relying on divemaster review endpoints or shop-card summaries. Migrations were not applied to a remote environment as part of this work.

### Related documentation

- [Shop review flow](shop-review-flow.md)
- [Divemaster review flow](divemaster-review-flow.md)