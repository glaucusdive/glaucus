## Plan: Dive Professional Directory ADR

This document separates the existing divemaster implementation from the broader directory proposal below. Proposed capabilities are not evidence of shipped behavior or authorization to expand a fix.

## Current Implementation

**Status:** Implemented in application code as of 2026-10-20. See [implementation-log.md](implementation-log.md) for dated verification; this section does not establish remote migration or deployment status.

### Profile Editing

- Published profiles at `/divemaster/{username}` show a pencil only to the authenticated owner, verified using their own account's canonical username. Other visitors do not get edit controls; admins use the existing admin editor.
- The pencil opens the shared [DivemasterProfileEditor.vue](../app/components/DivemasterProfileEditor.vue), also used by [Profile Settings](../app/pages/settings/profile.vue). Username/account controls and moderation are outside embedded edit mode. Draft/unpublished profiles remain managed through Settings.
- Editing uses a local draft. Save persists it, refreshes the public profile, and returns to read-only view with the pencil available again. Failed saves retain the draft. If persistence succeeds but public refresh fails, a refresh-only retry does not resubmit writes.
- In inline public-profile editing, clean Cancel exits immediately. Dirty Cancel and internal navigation use an app-styled **Keep Editing / Discard Changes** dialog; Keep Editing is the default, and Escape/backdrop dismissal retains the draft. Confirmed discard makes no profile writes. Tab-close/reload warnings remain browser-controlled. Profile Settings retains its Save-only toolbar and back arrow to Settings; the attempted Cancel/discard alignment was reverted.
- The shared [SettingsPage header](../app/components/settings/SettingsPage.vue) includes a 44px-wide **Open menu** button below the `lg` breakpoint. It opens the existing navigation drawer so mobile users can leave Settings after backing out of Profile Settings. Desktop continues to use the visible sidebar; existing back links and Save actions are unchanged. Regression coverage is in [settingsNavigation.test.ts](../tests/settingsNavigation.test.ts).
- Existing RLS and publication guards remain authoritative. Owners can edit published content immediately without a new review cycle; they cannot use the editor to change moderation/publication fields. This differs from the future approval model proposed below.
- Profile, certification, job, and dive-site saves are separate writes, not an atomic database transaction. A late failure can partially persist changes. The shared owner editor preserves existing certification metadata, linked job shops, and dive-site notes.

### Sites Dived Display

- Public profiles use compact, text-first [site tiles](../app/components/DivemasterDiveSiteTile.vue): one column on phones, two from `sm`, and three from `lg`. Tiles align at the top, and long site names and notes wrap without truncation.
- Available photos appear as fixed 64px thumbnails beside the site name, country, and optional note. Missing or failed images are omitted entirely; there is no large empty photo placeholder. A replacement URL can load after a previous image fails.
- This changes presentation only. It does not add uploads, change shared dive-site cover photos, or modify profile records. [Tile tests](../tests/divemasterDiveSiteTile.test.ts) cover missing, valid, broken, and replaced photos plus long text.

### Public DivePros Directory

- Landing navigation and the footer now use **For DivePros**, opening `/for-dive-pros`. Existing homepage diver content and `/for-businesses` remain unchanged.
- The [directory](../app/components/divemaster/DivemasterDirectory.vue) follows the business directory layout: responsive tiles with photo, name, headline and location; name/location search; alphabetical ordering; and 24 profiles per page. Missing or broken photos use an icon fallback, and missing display names fall back to username. Tiles link to the existing `/divemaster/{username}` profiles.
- **Add your profile** uses the existing `/settings/profile` page. Guests sign in or sign up first; switching auth modes preserves the return destination. New profiles remain drafts and require existing admin approval before publication. Existing professionals manage their current profile. No new registration page, approval rule, or profile-save behavior is introduced.
- `GET /api/divemasters` calls a bounded, server-only published-profile query and exposes only the five tile fields plus pagination metadata. Draft/pending profiles, account IDs, emails, moderation fields and certification details are excluded. Search matches literal text rather than treating user input as SQL or wildcard syntax.
- Deployment requires applying [20261025120000_divemaster_directory.sql](../supabase/migrations/20261025120000_divemaster_directory.sql) to the intended Supabase database before live listings can load. It adds a read-only, service-role-only function without changing RLS or existing records. The migration has not been applied by this implementation. Missing query/configuration produces a retryable error, not a misleading empty directory.
- Search URLs use `noindex, follow`; the base directory is included in the sitemap. See [implementation-log.md](implementation-log.md) for verification and database-testing limitations.

### Searchable Pickers On Mobile

- Adding a Sites Dived row in the shared owner editor scrolls the newly rendered row into view and focuses its picker trigger without opening the dropdown. This applies to Settings and inline editing; it does not save the draft.
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
