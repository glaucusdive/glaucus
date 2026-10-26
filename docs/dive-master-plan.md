## Plan: Dive Professional Directory ADR

This document separates the existing divemaster implementation from the broader directory proposal below. Proposed capabilities are not evidence of shipped behavior or authorization to expand a fix.

## Current Implementation

**Status:** Implemented in application code as of 2026-10-20. See [implementation-log.md](implementation-log.md) for dated verification; this section does not establish remote migration or deployment status.

### Profile Editing

- Published profiles at `/divemaster/{username}` show a pencil only to the authenticated owner, verified using their own account's canonical username. Other visitors do not get edit controls; admins use the existing admin editor.
- The pencil opens the shared [DivemasterProfileEditor.vue](../app/components/DivemasterProfileEditor.vue), also used by [Profile Settings](../app/pages/settings/profile.vue). Initial username setup and moderation are outside embedded edit mode. Draft/unpublished profiles remain managed through Settings.
- Profile Settings places Save beside the Account heading, with save feedback beneath it, rather than in the top navigation bar. Existing accounts no longer see the Username box, URL helper, rename controls, or cooldown notice. Stored usernames, public links, and server-side username policy are unchanged. Accounts without a username retain one-time setup so they can create a draft. Inline editing keeps its existing Cancel/Save toolbar.
- Editing uses a local draft. Save persists it, refreshes the public profile, and returns to read-only view with the pencil available again. Failed saves retain the draft. If persistence succeeds but public refresh fails, a refresh-only retry does not resubmit writes.
- In inline public-profile editing, clean Cancel exits immediately. Dirty Cancel and internal navigation use an app-styled **Keep Editing / Discard Changes** dialog; Keep Editing is the default, and Escape/backdrop dismissal retains the draft. Confirmed discard makes no profile writes. Tab-close/reload warnings remain browser-controlled. Profile Settings retains its Account-level Save action and back arrow to Settings; the attempted Cancel/discard alignment was reverted.
- The shared [SettingsPage header](../app/components/settings/SettingsPage.vue) includes a 44px-wide **Open menu** button below the `lg` breakpoint. It opens the existing navigation drawer so mobile users can leave Settings after backing out of Profile Settings. Desktop continues to use the visible sidebar; existing back links and Save actions are unchanged. Regression coverage is in [settingsNavigation.test.ts](../tests/settingsNavigation.test.ts).
- Existing RLS and publication guards remain authoritative. Owners can edit published profile content immediately without a new profile review cycle; they cannot use the editor to change profile moderation/publication fields. Newly added certifications on published profiles are a separate exception: they are private to the owner until an admin approves them.
- Profile, certification, job, and dive-site saves are separate writes, not an atomic database transaction. A late failure can partially persist changes. The shared owner editor preserves existing certification metadata, linked job shops, and dive-site notes.
- Certification entry focuses on personal credentials: name, agency, number, and issued date. Existing certifications remain approved when edited; newly added certifications are marked pending, shown only to the owner and admins, and enter the public profile only after admin approval. The admin queue is `/admin/divemaster-certifications`. Rejected certifications remain visible only to the owner with a rejected label. **Students certified** is not shown in owner/admin forms or public certification cards; teaching-related features are deferred. Existing stored counts remain in the load/save contract so ordinary profile edits do not erase them.
- Training and certification-name pickers offer opt-in typo tolerance, agency-aware choices, and persistent Not listed actions. Custom entries can be used as self-reported personal profile text; only admin-approved suggestions enter the shared label catalog. Catalog approval does not verify a person's credential. Existing Other training text is retained. See [credential suggestion flow](profile-credential-suggestions.md) for the required catalog migration, moderation queue, permissions, and personal/shared distinction. Dive-site typo matching and moderated site creation remain separate pending work.
- In owner and admin editors, **Add certification**, **Add job**, and **Add dive site** sit below their respective rows, right-aligned. Each appends a draft row, scrolls it into view after rendering, and focuses the certification/site picker trigger or job Title input. Empty lists retain their add action; removal and re-addition follow the same pattern. No save or approval is triggered by Add.

### Sites Dived Display

- Public profiles use compact, text-first [site tiles](../app/components/DivemasterDiveSiteTile.vue): one column on phones, two from `sm`, and three from `lg`. Tiles align at the top, and long site names and notes wrap without truncation.
- Available photos appear as fixed 64px thumbnails beside the site name, country, and optional note. Missing or failed images are omitted entirely; there is no large empty photo placeholder. A replacement URL can load after a previous image fails.
- This changes presentation only. It does not add uploads, change shared dive-site cover photos, or modify profile records. [Tile tests](../tests/divemasterDiveSiteTile.test.ts) cover missing, valid, broken, and replaced photos plus long text.

### Public DivePros Directory

- Landing navigation and the footer now use **For DivePros**, opening `/for-dive-pros`. Existing homepage diver content and `/for-businesses` remain unchanged.
- The [directory](../app/components/divemaster/DivemasterDirectory.vue) follows the business directory layout: responsive tiles with photo, name, headline and location; name/location search; alphabetical ordering; and 24 profiles per page. Missing or broken photos use an icon fallback, and missing display names fall back to username. Tiles link to the existing `/divemaster/{username}` profiles.
- **Add your profile** opens `/auth?signup=1&redirect=/settings/profile` for guests and `/settings/profile` directly for signed-in users. Normal clicks wait for initial auth resolution before choosing the destination; links remain relative to the current origin. Switching between sign-up and sign-in preserves the return destination. New profiles remain drafts and require existing admin approval before publication. Existing professionals manage their current profile. No new registration page, approval rule, or profile-save behavior is introduced.
- `GET /api/divemasters` calls a bounded, server-only published-profile query and exposes only the five tile fields plus pagination metadata. Draft/pending profiles, account IDs, emails, moderation fields and certification details are excluded. Search matches literal text rather than treating user input as SQL or wildcard syntax.
- Deployment requires applying [20261025120000_divemaster_directory.sql](../supabase/migrations/20261025120000_divemaster_directory.sql) to the intended Supabase database before live listings can load. It adds a read-only, service-role-only function without changing RLS or existing records. The migration has not been applied by this implementation. Missing query/configuration produces a retryable error, not a misleading empty directory.
- Search URLs use `noindex, follow`; the base directory is included in the sitemap. See [implementation-log.md](implementation-log.md) for verification and database-testing limitations.

### Searchable Pickers On Mobile

- Adding a Sites Dived row from its bottom action scrolls the newly rendered row into view and focuses its picker trigger without opening the dropdown. This applies to Settings, inline editing, and admin editing; it does not save the draft.
- Opening a searchable picker focuses its Search input after rendering, without waiting for remote options or requiring a second tap. Quick close or disable prevents deferred focus; nonsearchable controls are unchanged. [Focus tests](../tests/profilePickerFocus.test.ts) cover these behaviors and repeated site additions.
- Choosing a single-select option keeps exactly that value, blurs Search, closes the panel, clears the query, and returns focus to the trigger. Choosing the same value again does not clear it; use the remove control to clear. Multi-select pickers remain open and keep their existing toggle behavior. Physical iPhone keyboard dismissal still needs device verification.
- Certification, agency, training, country, dive-site, and other fields using the shared [SearchMultiSelect](../app/components/ui/SearchMultiSelect.vue) constrain their search/results panel to the visible viewport and reposition when the on-screen keyboard resizes or pans it. Browsers without `visualViewport` retain window-based positioning.
- Search text uses 16px type below `lg` to avoid iPhone focus zoom. Result lists remain scrollable; profile persistence is unchanged. [Positioning tests](../tests/searchPickerPosition.test.ts) cover keyboard-sized viewports, offsets, covered triggers, result growth, and desktop placement. Physical iPhone keyboard behavior still requires device verification.

### Past Job Dates

- Past jobs and certification issue dates use explicit Month and Year dropdowns in the shared owner editor and admin editor. Year options descend from the current year to 1950, retaining saved years outside that range. The shared control is [DivemasterJobMonthInput.vue](../app/components/DivemasterJobMonthInput.vue).
- Public employment dates show abbreviated month and four-digit year ranges, such as `Apr 2021`, or Present. Formatting uses UTC to avoid timezone month shifts. Certification issue dates retain their existing month/year display. Training dates retain their existing full-date inputs and display rules.
- Certification issue dates remain optional. Existing full dates load as their month/year; explicit Save normalizes submitted issue dates to `YYYY-MM-01` before persistence. Date normalization runs before writes. No migration or bulk backfill is performed.
- Existing `2020-06-19` loads as June 2020 and displays as `Jun 2020`. Viewing or opening the editor does not write. Explicit Save normalizes all submitted job dates to `YYYY-MM-01`, even if only another profile field was edited. No bulk backfill is performed.
- Dates remain optional; partial month/year pairs must be completed before Save. Current role clears/disables End. A supplied end date takes precedence over inconsistent Current state when serializing.
- [Date helpers](../shared/divemasterJobDates.ts) validate legacy dates and picker values before persistence. The [admin update endpoint](../server/api/admin/divemasters/[userId].patch.ts) also normalizes/validates before writes. Existing DATE columns remain in use; these UI changes require no new migration.

### Reviews And Location

- Owners retain average rating, count, and review list, but are not invited to review themselves. Empty profiles show **No rating / 0 Reviews**. Review forms and author controls are suppressed for owners and while signed-in ownership is unresolved; other visitors retain the normal review flow. Server-side self-review rejection remains required. See [divemaster-review-flow.md](divemaster-review-flow.md).
- Profile Location supports TomTom suggestions in the shared owner editor and remains manually editable when suggestions are unavailable. The separate database-first and Google fallback design remains a [proposal](location-autocomplete-design.md).

## Pending Dive-Site Work

**Status:** Implemented in owner profile editing, admin profile editing, and the admin review queue. Apply migrations [20261025140000](../supabase/migrations/20261025140000_dive_site_suggestions.sql), [20261025141000](../supabase/migrations/20261025141000_dive_site_suggestion_profiles.sql), and [20261025150000](../supabase/migrations/20261025150000_divemaster_certification_review.sql) before enabling it on a hosted database. The training/certification suggestion feature remains separate.

### Search And Entry

- Scope: favorite local site, favorite destination site, and Sites Dived in owner Settings, inline profile editing, and admin editing. Chat, TomTom location fields, and directory searches remain outside this work.
- Keep normal exact/partial matches first. The small entry dialog shows up to eight country-scoped similar sites using normalized bigram similarity. Selection uses the canonical site ID; it never automatically corrects, merges, or creates a site.
- Add a persistent **Site not listed? Add new dive site** action outside filtered results, including when there are no matches. Keep it distinct from the bottom **Add dive site** row action.
- Open a small form with the searched name prefilled and a required country from the existing country list. Check normalized name/country and approved aliases for exact duplicates, then show possible similar sites in that country before submission.
- Reuse an exact existing site. If none of the suggestions is right, allow an explicit new-site submission; approximate similarity alone must not force a selection or merge. Repeated identical submissions should reuse the user's pending request rather than create duplicates. Failed lookup or empty search alone must never create anything.

### Pending And Public Visibility

- New user submissions remain separate from the canonical shared `dive_sites` catalog until reviewed. Only the submitter and admins can read pending/rejected submissions and private profile associations; enforce this with database permissions/RLS as well as endpoint authorization.
- Owners may select a pending site and see **Pending** privately. Save persists the pending profile association; the pending site stays hidden from public profiles and global suggestions. The rest of a profile remains usable and publishable.
- Submission and profile Save are separate explicit actions. Cancelling the new-site form creates nothing. Cancelling a profile edit does not undo an already submitted suggestion, but must not persist its unsaved profile association. Approval must not reattach a site the user removed or never saved.
- Keep submission references separate from existing canonical-site foreign keys. Reject unauthorized references and prevent ordinary users from bypassing review with direct canonical-site inserts/updates. Preserve trusted admin and approved shop-submission creation workflows.

### Admin Review And Reuse

- Provide an admin queue with **Approve**, **Merge into existing site**, and **Reject** with a reason. Admin-created canonical sites may publish directly; ordinary user submissions may not.
- Approval/merge must recheck duplicates and resolve saved pending selections transactionally. Preserve favorite slots, visited-site notes, and ordering; deduplicate existing profile/site associations without losing data. Concurrent or repeated review must not create another canonical site or repeat writes blindly.
- Only explicitly admin-approved alternate names become searchable aliases pointing to a canonical site ID. Pending/rejected names must not enter global suggestions automatically. Preserve country context and genuine ambiguity.
- Broader site suggestions may use canonical sites and approved aliases once available. A submitted or approved site does not prove that a shop visits it: operator discovery must use confirmed shop/site associations, not inferred relationships.

### Verification And Rollout

- Focused SQL tests exercise owner/admin visibility, normalized duplicates, alias approval, canonical write restrictions, saved profile links, approval resolution, notes/order preservation, and removal before approval with synthetic PostgreSQL roles and data.
- Apply reviewed migrations through the [Supabase CLI workflow](supabase-migrations.md) before enabling submissions or reviews on a hosted database. A local production build and focused tests do not verify hosted migration application or physical-device keyboard behavior.

## Broader Directory Proposal

**Proposed decision:** Extend the implemented public directory with chat-first profile creation, richer discovery, and a private contact form. Existing admin-approved publishing and reviews remain in place. Reuse Nuxt, Supabase, and the existing AI/email integrations; capabilities below are future scope unless listed in Current Implementation.

**Profile Experience**
- Shareable pages with photo, biography, roles, locations, languages, specialties, experience, certifications, achievements, and associations.
- LinkedIn, Facebook, portfolio, and other useful links.
- Directory filters for location, role, language, and specialty.
- Certifications clearly labeled **self-reported** unless separately verified. Profile approval does not imply credential verification.

**Easy Onboarding**
- Start with “Tell us about yourself and your diving work.”
- Extract several profile sections from free-form answers, then ask short follow-up questions.
- Allow optional sections to be skipped, save drafts, and resume later.
- Always offer a simple form editor and profile preview.
- Require explicit submission for admin review. The chatbot cannot publish, invent qualifications, or verify credentials.

**Privacy and Contact**
- Keep public professional profiles separate from private account and booking data.
- No public email addresses or phone numbers, including in profile text or platform contact links.
- Visitors submit their name, email, and message through a protected contact form.
- Share the sender’s email privately with the professional for replies.
- Ordinary replies may reveal the professional’s email privately; this is **public privacy, not two-way anonymity**.
- External social profiles remain outside Glaucus’s privacy controls.

**Publishing and Reviews**
- Admins approve profiles before publication.
- Subsequent edits await approval while the previous approved profile stays public.
- Owners can unpublish; admins can suspend.
- Signed-in divers can review professionals, but cannot review themselves.
- Reviews support reporting and admin moderation. Professionals cannot remove unfavorable reviews themselves.

**Architecture**
Reuse authentication from [useAuth.ts](../app/composables/useAuth.ts), structured extraction patterns from [interpretUserTurn.ts](../server/utils/interpretUserTurn.ts), and the existing shop-submission approval model.

Create a dedicated profile orchestrator rather than extending the booking agent. Document its tools, server-controlled selection, bounded retries, saved draft ownership, and explicit submission boundary. Contact delivery needs durable abuse controls and duplicate-send protection beyond the current [inquiry endpoint](../server/api/shop-inquiry.post.ts).

**Delivery Steps**
1. Write a **Proposed ADR** covering these decisions, alternatives, consequences, privacy boundaries, and the agent contract.
2. Document the implementation order: data/access controls first; onboarding, directory, and moderation next; reviews and contact delivery afterward.
3. Define verification for private-data exposure, unauthorized publication, model failures, review abuse, duplicate emails, and mobile usability.

**Excluded Initially**
Feeds, connections, payments, in-app messaging, social-profile scraping, automated credential verification, and certificate-document uploads. Structured certification details remain included.
