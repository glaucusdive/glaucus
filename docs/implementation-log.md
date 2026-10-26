# Implementation Log

## 2026-10-25 - Moderated dive-site suggestions in profile pickers

- Added the persistent **Site not listed? Add new dive site** action to favorite local/destination and Sites Dived pickers in owner and admin profile editing. The owner form prefills the search and requires a country; exact canonical/approved-alias matches reuse the existing ID, and country-scoped similar sites are shown before an explicit submission.
- Ordinary users submit private suggestions rather than writing to `dive_sites`. Their pending/rejected submissions and saved profile associations are readable only by the submitter and admins. Pending links remain private in the profile editor and are stored separately from canonical favorite/site foreign keys; public profile queries remain canonical-only.
- Added an admin queue with approve, merge into an existing same-country site, and reject-with-reason. Admins may explicitly approve the submitted name as an alias. Approval/merge rechecks exact canonical/alias duplicates and transactionally resolves only saved links, preserving favorite fields, visited-site notes, and ordering without reattaching removed links.
- Admin profile editing can still add canonical sites directly. The previous owner direct-create endpoint now routes through the moderated submission procedure.
- Migrations [20261025140000](../supabase/migrations/20261025140000_dive_site_suggestions.sql) and [20261025141000](../supabase/migrations/20261025141000_dive_site_suggestion_profiles.sql) have been exercised in isolated PGlite tests; they have not been applied to a hosted Supabase database.
- Focused suggestion/picker tests passed, including SQL privacy, deduplication, canonical-write protection, alias approval, country-scoped similarity, profile-link resolution, and removal-before-approval. Full test suite: 728 passed / 1 skipped. Nuxt production build passed. Physical mobile-device and hosted migration rollout checks remain outstanding.

## 2026-10-25 - Booking next question is its own bubble

- Shop-pick replies such as “Got it — Dive Academy Fiji. What’s the name for the booking?” now render as two bubbles: the acknowledgement, then the next question in semibold.
- New booking responses send the acknowledgement as `messagePreamble` and the question as `message`. Older saved replies that still use one sentence split the same way in the chat.
- No database or config migration.
- Verification: local chat render of the combined name sentence shows two bubbles, with the question at font-weight 600.

## 2026-10-25 - Stale chat actions stay hidden

- Book this and answer chips render only on the latest assistant message, and only when that message has shops or chips. A later plain question, such as a contact name, hides every older action. Nothing is clickable while a reply is loading.
- The latest user message and the latest assistant message stay at full opacity. Every earlier message, including shop cards, is `opacity-50`. Older Book this buttons, answer chips, and the booking-form chevron are not rendered. Profile, website, call, and email links stay usable.
- A click on a stale Book this is ignored, so it cannot be stored as the next booking answer.
- No database or config migration.
- Verification: local chat at a 375px width. On a search result alone, Book this is present. After a later “What’s your name?” message, that Book this and the older chips are not in the page, and the current step’s chip still is. With an older search plus a later user and assistant pair, the older user message and the shop-card message compute to `opacity: 0.5`. The latest user message and the latest assistant message stay at `opacity: 1`. The shop website link still renders. A physical iPhone was not used.

## 2026-10-25 - Chat scrolls to the latest message

- Book this on an earlier shop now scrolls to the new booking messages. The exact/other search divider only pins the view when that divider is inside the latest message.
- Touch and iOS set the message pane `scrollTop` directly and retry after layout. The chat column uses `min-h-0` so that pane is the scrollport.
- A fixed blue “View latest message” pill (`min-h-12`, `min-w-12`, `whitespace-nowrap`, `rounded-full`, no icon) sits above the composer when the list is more than 80px from the bottom. The label stays on one line. Clicking it scrolls to the end and does not stop on an older divider.
- No database or config migration.
- Verification: local chat at `http://localhost:3000/?chat=1` on a 390px viewport. With a long thread, the message pane scrolls (`scrollHeight` greater than `clientHeight`). Scrolling up shows a `position: fixed` “View latest message” button with `min-height` and `min-width` of 48px, sitting just above the composer. Clicking it scrolls to the end and the button goes away. A physical iPhone was not used.

## 2026-10-25 - Mobile page zoom locked off

- Site viewport is now `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` in `app/app.vue`.
- Text inputs, textareas, and selects are 16px up to 1024px and on coarse pointers, so iOS does not zoom the page when the chat keyboard opens. Checkboxes, radios, and file inputs are unchanged.
- Desktop field sizes stay on the existing Tailwind scale. No database or config migration.
- Verification: local dev server at `http://localhost:3000`. Rendered viewport meta is `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`. At a 390px mobile viewport, the chat field, email field, and password field compute to 16px; focusing the chat field and typing left `visualViewport.scale` at 1. At 1440px the chat field stays 14px. A physical iPhone was not used.

## 2026-10-25 - Pending dive-site requirements recorded

- Added [Pending Dive-Site Work](dive-master-plan.md#pending-dive-site-work): persistent **Site not listed? Add new dive site**, prefilled name/required country, exact/similar duplicate checks, private pending submissions and saved profile associations, and admin approve/merge/reject with explicit alias review.
- Recorded public-visibility, cancellation, canonical-write protection, transaction, trusted-workflow compatibility, and verification requirements. Linked the pending scope from the credential guide so training/certification support is not mistaken for implemented dive-site support.
- Documentation only: no application, migration, permission, or database changes; dive-site implementation remains deferred.

## 2026-10-25 - Training and certification suggestions

- Added Fuse.js-backed, opt-in exact-first/similar-result matching and persistent Not listed actions for training and certification names in owner/admin editors. Certification choices preserve agency identity; shared SearchMultiSelect behavior for other fields remains unchanged.
- Added a custom-entry dialog with name prefill, required certification agency, existing-match choices, and explicit shared-list suggestion consent. Personal-only entries update the profile draft without shared writes; shared submissions require authentication. Existing training Other text and profile saves remain supported.
- Added a separate approved credential-label catalog and private suggestion queue, with authenticated submission, admin approval/merge/rejection, explicit alias approval, duplicate reuse, quotas, RLS and database-level authorization. Added `/admin/profile-credential-submissions` and its admin menu entry. No shop courses or dive-site records are created by this feature.
- The migration imports existing course-name/agency pairs as an initial baseline. Deployed profile pickers then read the moderated catalog instead of the live course table, preventing later legacy course writes from bypassing review without changing shop-course permissions. SQL and client tests cover the baseline and post-migration isolation.
- Migration [20261025130000_profile_credential_suggestions.sql](../supabase/migrations/20261025130000_profile_credential_suggestions.sql) must be applied before hosted shared submissions/review work. It has been executed only in isolated embedded PostgreSQL tests, not on a remote Supabase project.
- Matching, endpoint and SQL tests passed. SQL tests executed real PostgreSQL permission/state transitions with synthetic roles and data. Browser checks verified typo recovery, persistent Not listed, prefilled names/agencies, agency-distinct options, and personal-only entry at phone/desktop widths. No live account/profile write or admin approval was submitted. See [feature documentation](profile-credential-suggestions.md).
- Final verification: full suite 711 passed / 1 skipped; Nuxt production build passed. Ten matching/catalog tests, nine endpoint tests and eight SQL tests cover the new contracts; existing focus tests also cover persistent action query handoff. Browser checks confirmed cancel preserves the prior value and focus returns to the trigger. Hosted auth/review rollout remains untested until the migration is applied.
- Added runtime `fuse.js` and test-only `@electric-sql/pglite`. The package installer reported 98 dependency audit findings; no broad audit fix or unrelated dependency upgrade was performed.

## 2026-10-25 - Personal certification fields only

- Removed **Students certified** inputs from owner and admin certification forms and the related count from public certification cards. Teaching features are deferred; name, agency, certification number, issued date, and existing certificate images are unchanged.
- Kept existing student-count columns, values, loading, normalization, and save serialization intact. No database migration or backfill is required, and no saved counts were cleared.
- Thirty-two focused tests passed, including all three certification templates, an admin save retaining a legacy count, and existing add/picker behavior. No live profile changes were submitted.
- Integration verification: full suite 683 passed / 1 skipped; Nuxt production build passed. No live authenticated browser save or database mutation was performed for this UI-only change.

## 2026-10-25 - Bottom add actions for profile lists

- Moved Certifications, Past jobs, and Sites Dived add actions below their rows in both the shared owner editor and admin editor, right-aligned and labeled **Add certification**, **Add job**, and **Add dive site**.
- Each action appends a draft row, waits for rendering, and uses the shared [row reveal helper](../app/utils/revealLastProfileRow.ts) to scroll/focus the new picker trigger or job Title input. Explicit row markers keep the helper from selecting the new footer button. Existing rows, sort order, dates, saving, and admin approval are unchanged.
- Focused tests passed: 19 picker/list tests, five Account-control tests, and four admin date-validation tests. Coverage includes all six owner/admin add handlers, footer placement, removal/re-addition, and empty lists.
- Synthetic browser checks using the owner list templates and shared controls passed at 375px and 1280px: each action stays below rows, appends a visible row, focuses the correct control, and avoids horizontal overflow. Mobile screenshot checked. Admin handler/template behavior was tested without an authenticated admin session; no profile data was saved.
- Integration verification: full suite 679 passed / 1 skipped; Nuxt production build passed.

## 2026-10-25 - Signup-first DivePros profile CTA

- **For DivePros -> Add your profile** now defaults guests to the existing auth page in sign-up mode with `/settings/profile` as the return destination. Signed-in users still open Profile Settings directly. The origin is not hardcoded, and ordinary clicks resolve pending auth before navigation; modified clicks retain native link behavior.
- Existing registration forms, sign-in/sign-up switching, username setup, draft creation, and admin approval remain unchanged. No account or profile writes were made during validation.
- Ten [CTA tests](../tests/divemasterDirectoryCta.test.ts) and five existing directory tests pass, covering guest/signed-in targets, pending auth resolution, return destinations, and modified clicks. Browser checks verified the real guest CTA and sign-up/sign-in handoff; signed-in destination behavior was tested with synthetic auth state.
- Integration verification: full suite 670 passed / 1 skipped; Nuxt production build passed.

## 2026-10-25 - Profile Settings Account controls

- Moved the Settings Save button from the navigation header to the Account heading row, with save feedback underneath. The inline public-profile Edit toolbar retains Cancel and Save without duplicate Account actions.
- Removed existing-account username display, public URL helper, cooldown notice, and rename controls. First-time username setup remains available only while the account has no username, preserving the existing draft application prerequisite. Stored usernames, public URLs, server-side rename policy, and profile-save behavior are unchanged.
- Five [Account template tests](../tests/profileAccountControls.test.ts) and ten existing picker/focus tests pass. Tests render the actual Account and inline-toolbar templates with synthetic states; they do not submit account/profile changes.
- Synthetic browser layout checks using the actual Account template and shared controls passed at 320px, 375px, and 1280px: one Save beside Account, no existing-username block, and no horizontal overflow. Mobile screenshot checked. A signed-in save was not tested because the local session redirected to auth; no profile writes were submitted.
- Integration verification: full suite 660 passed / 1 skipped; Nuxt production build passed. Stored usernames and public profile links are unchanged.

## 2026-10-25 - Booking next question is its own bubble

- Shop-pick replies such as “Got it — Dive Academy Fiji. What’s the name for the booking?” now render as two bubbles: the acknowledgement, then the next question in semibold.
- New booking responses send the acknowledgement as `messagePreamble` and the question as `message`. Older saved replies that still use one sentence split the same way in the chat.
- No database or config migration.
- Verification: local chat render of the combined name sentence shows two bubbles, with the question at font-weight 600.

## 2026-10-25 - Stale chat actions stay hidden

- Book this and answer chips render only on the latest assistant message, and only when that message has shops or chips. A later plain question, such as a contact name, hides every older action. Nothing is clickable while a reply is loading.
- The latest user message and the latest assistant message stay at full opacity. Every earlier message, including shop cards, is `opacity-50`. Older Book this buttons, answer chips, and the booking-form chevron are not rendered. Profile, website, call, and email links stay usable.
- A click on a stale Book this is ignored, so it cannot be stored as the next booking answer.
- No database or config migration.
- Verification: local chat at a 375px width. On a search result alone, Book this is present. After a later “What’s your name?” message, that Book this and the older chips are not in the page, and the current step’s chip still is. With an older search plus a later user and assistant pair, the older user message and the shop-card message compute to `opacity: 0.5`. The latest user message and the latest assistant message stay at `opacity: 1`. The shop website link still renders. A physical iPhone was not used.

## 2026-10-25 - Chat scrolls to the latest message

- Book this on an earlier shop now scrolls to the new booking messages. The exact/other search divider only pins the view when that divider is inside the latest message.
- Touch and iOS set the message pane `scrollTop` directly and retry after layout. The chat column uses `min-h-0` so that pane is the scrollport.
- A fixed blue “View latest message” pill (`min-h-12`, `min-w-12`, `whitespace-nowrap`, `rounded-full`, no icon) sits above the composer when the list is more than 80px from the bottom. The label stays on one line. Clicking it scrolls to the end and does not stop on an older divider.
- No database or config migration.
- Verification: local chat at `http://localhost:3000/?chat=1` on a 390px viewport. With a long thread, the message pane scrolls (`scrollHeight` greater than `clientHeight`). Scrolling up shows a `position: fixed` “View latest message” button with `min-height` and `min-width` of 48px, sitting just above the composer. Clicking it scrolls to the end and the button goes away. A physical iPhone was not used.

## 2026-10-25 - Mobile page zoom locked off

- Site viewport is now `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` in `app/app.vue`.
- Text inputs, textareas, and selects are 16px up to 1024px and on coarse pointers, so iOS does not zoom the page when the chat keyboard opens. Checkboxes, radios, and file inputs are unchanged.
- Desktop field sizes stay on the existing Tailwind scale. No database or config migration.
- Verification: local dev server at `http://localhost:3000`. Rendered viewport meta is `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`. At a 390px mobile viewport, the chat field, email field, and password field compute to 16px; focusing the chat field and typing left `visualViewport.scale` at 1. At 1440px the chat field stays 14px. A physical iPhone was not used.

## 2026-10-25 - Experience month-name display

- Public Experience dates now use abbreviated month names and four-digit years, for example `Apr 2021`, instead of `04/21`. Current roles continue to show Present. UTC formatting prevents month shifts across timezones.
- Editing controls, validation, and persisted dates are unchanged. Thirty focused date-helper/admin-validation tests passed, including legacy full dates, month-only values, and early years. Touched-file diagnostics and diff whitespace checks passed; a full suite/build was not rerun for this formatting-only change.

## 2026-10-25 - Compact public-profile dive-site tiles

- Replaced full-width Sites Dived image areas and empty placeholders with compact [site tiles](../app/components/DivemasterDiveSiteTile.vue). Existing photos use 64px thumbnails; missing/broken photos have no image area. Site names, countries, and notes remain visible and wrap naturally.
- Retained a one/two/three-column responsive grid, with top-aligned tiles. No upload flow, database changes, or changes to shared site imagery were introduced.
- Five [rendered-component tests](../tests/divemasterDiveSiteTile.test.ts) pass, including collapse after a failed image and retrying a replacement URL. Synthetic public-profile browser checks at 320px, 375px, 768px, and 1280px verified mixed-photo layouts, thumbnail dimensions, and no tile overflow. Mobile and desktop screenshots were checked. No profile data was saved.
- Integration verification: full suite 650 passed / 1 skipped; Nuxt production build passed.

## 2026-10-25 - Supabase CLI migration workflow

- Added the [CLI migration guide](supabase-migrations.md) and linked it from the README documentation map. It covers project linking, history inspection, preview/apply, manually applied SQL, and carefully scoped history repair.
- Added Git ignore rules for generated `*_remote_schema.sql` snapshots (including double-underscore names) and local snapshot storage. The guide explicitly requires moving unwanted snapshots outside `supabase/migrations`: Git ignore rules do not prevent CLI execution.
- Routine deployment does not require `db pull`. Existing staged snapshot deletion was left unchanged; no snapshot files were deleted or moved by this documentation update, and no database push, pull, link, reset, or history repair was executed.
- Verification: both snapshot naming forms and local storage passed `git check-ignore`; documentation file links and diff whitespace checks passed. Push/list/repair flags were verified against installed CLI help (2.121.0). Application tests/build were not rerun for these documentation/ignore-only changes.

## 2026-10-25 - For DivePros directory

- Replaced the landing header/mobile menu/footer **For Divers** link with **For DivePros** at `/for-dive-pros`, using the existing business directory's layout and visual conventions. Existing homepage content and business flows remain intact.
- Added responsive photo/name/headline/location tiles, fallback media/name handling, literal name/location search, alphabetical pagination (24/page), loading/error/retry/empty states, canonical metadata, search `noindex`, and the directory sitemap entry.
- **Add your profile** links to the existing Profile Settings flow. Existing auth mode-switch links now preserve the normalized return destination. Draft creation, admin approval, published-profile editing, and existing per-profile URLs are unchanged.
- Added the server-only `GET /api/divemasters` read endpoint and [directory migration](../supabase/migrations/20261025120000_divemaster_directory.sql). The SQL function joins only published profiles, bounds query/page inputs, returns only tile fields and counts, and permits execution only by `service_role`. No remote migration or profile/account writes were executed. Apply this migration to the intended database before expecting live directory results.
- Ten focused shared/API tests pass. SQL checks assert the source contract; SQL execution against PostgreSQL was not available because no local PostgreSQL client/runtime was running. This is not evidence of a remotely applied or executed migration.
- Synthetic browser checks passed for 24+1 profile pagination, search/reset/clear, empty results, `noindex`, missing-photo/name fallback, tile links, desktop/mobile navigation, and guest sign-in/sign-up return destinations. Layout had no horizontal overflow at 320px, 375px, and 1280px; desktop used three columns. No signup or profile-save submission was made. Actual post-login and admin-approval workflows were not rerun.
- Integration verification: full suite 645 passed / 1 skipped; Nuxt production build passed. Desktop and mobile screenshots were checked with synthetic tile data. Live directory data remains gated on applying and verifying the migration.

## 2026-10-25 - Single-select picker dismissal

- Choosing an option in a shared single-select picker now selects that value, blurs Search, closes the panel through its existing cleanup path, and restores trigger focus with `preventScroll`. Re-selecting the same option keeps it selected; clearing remains an explicit remove action.
- Multi-select pickers remain open and preserve toggle-on/toggle-off selection. Profile persistence and the parked sizing work are unchanged.
- Ten [focus/selection tests](../tests/profilePickerFocus.test.ts) and six positioning tests pass. Synthetic browser checks verified single-select closure/focus, an empty search on reopening, repeated selection, and preserved multi-select addition/removal. No profile data was saved. Physical iPhone keyboard dismissal remains a device check.
- Integration verification: full suite 635 passed / 1 skipped; Nuxt production build passed.

## 2026-10-25 - New dive-site visibility and picker search focus

- Sites Dived Add now waits for the new draft row to render, scrolls it into view, and focuses its picker trigger. It does not open the dropdown or save profile changes. The behavior lives in the shared owner editor, covering Settings and inline public-profile editing.
- Opening a shared searchable picker focuses its Search input after rendering with `preventScroll`, without waiting for options to load. The deferred handler checks that the picker is still open, searchable, and enabled. Nonsearchable controls and selection behavior are unchanged.
- Six [focus regression tests](../tests/profilePickerFocus.test.ts) and six existing positioning tests pass. Signed-in browser checks at 375px and 1280px verified new-row visibility/focus, no automatic dropdown on Add, search focus on opening, and typing without a second click. Temporary empty rows were removed without saving; physical iPhone keyboard activation remains a device check.
- The broader mobile sizing work remains parked. This change does not restore the rejected Settings Cancel/discard alignment.
- Integration verification: full suite 631 passed / 1 skipped; Nuxt production build passed.

## 2026-10-25 - Keyboard-aware searchable pickers

- The shared [SearchMultiSelect](../app/components/ui/SearchMultiSelect.vue) now positions its panel using visible viewport dimensions and offsets, listens for `visualViewport` resize/scroll while open, and removes those listeners on close/unmount. This addresses certification and similar searches appearing under the iPhone keyboard.
- [Positioning logic](../app/utils/searchPickerPosition.ts) constrains panel bounds, including when the trigger is outside the visible area. Search inputs use 16px text on mobile to avoid focus zoom. Selection, remote pagination, and saves are unchanged.
- Six focused [positioning tests](../tests/searchPickerPosition.test.ts) pass. A synthetic browser picker verified visible bounds during simulated keyboard resize/pan, 16px search text, filtering, and selection without profile writes. This is not a physical iPhone/Safari keyboard test; device verification remains necessary.
- Integration verification: full suite 625 passed / 1 skipped; Nuxt production build passed.

## 2026-10-25 - Mobile Settings navigation

- Fixed the mobile dead end at Settings by adding an **Open menu** icon button to the shared [SettingsPage header](../app/components/settings/SettingsPage.vue). The button uses the existing `useDrawer().openMobileMenu`, with an accessible label, tooltip, expanded state, and 44px width.
- The button is visible below `lg` and hidden on desktop, where the sidebar remains visible. Existing subpage back links and Save actions are unchanged. The later Settings Cancel/discard experiment was reverted and is not part of this fix.
- [Navigation regression tests](../tests/settingsNavigation.test.ts) render the actual header with synthetic content and exercise its menu handler, expanded state, optional back link, and actions slot. They do not require authentication, profile records, or external services. Run with `npm test -- tests/settingsNavigation.test.ts`.
- Earlier browser checks verified menu visibility and no horizontal overflow at 320px and 375px, and a hidden menu button at 1280px. Component checks verified drawer state changes from root and subpage headers. The original authenticated end-to-end navigation check was limited by sign-in; these tests do not replace a viewport or signed-in browser check.

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