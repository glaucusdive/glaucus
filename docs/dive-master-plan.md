## Plan: Dive Professional Directory ADR

This document separates the existing divemaster implementation from the broader directory proposal below. Proposed capabilities are not evidence of shipped behavior or authorization to expand a fix.

## Current Implementation

**Status:** Implemented in application code as of 2026-10-20. See [implementation-log.md](implementation-log.md) for dated verification; this section does not establish remote migration or deployment status.

### Profile Editing

- Published profiles at `/divemaster/{username}` show a pencil only to the authenticated owner, verified using their own account's canonical username. Other visitors do not get edit controls; admins use the existing admin editor.
- The pencil opens the shared [DivemasterProfileEditor.vue](../app/components/DivemasterProfileEditor.vue), also used by [Profile Settings](../app/pages/settings/profile.vue). Username/account controls and moderation are outside embedded edit mode. Draft/unpublished profiles remain managed through Settings.
- Editing uses a local draft. Save persists it, refreshes the public profile, and returns to read-only view with the pencil available again. Failed saves retain the draft. If persistence succeeds but public refresh fails, a refresh-only retry does not resubmit writes.
- Clean Cancel exits immediately. Dirty Cancel and internal navigation use an app-styled **Keep Editing / Discard Changes** dialog; Keep Editing is the default, and Escape/backdrop dismissal retains the draft. Confirmed discard makes no profile writes. Tab-close/reload warnings remain browser-controlled.
- Existing RLS and publication guards remain authoritative. Owners can edit published content immediately without a new review cycle; they cannot use the editor to change moderation/publication fields. This differs from the future approval model proposed below.
- Profile, certification, job, and dive-site saves are separate writes, not an atomic database transaction. A late failure can partially persist changes. The shared owner editor preserves existing certification metadata, linked job shops, and dive-site notes.

### Past Job Dates

- Only Past jobs use explicit Month and Year dropdowns in the shared owner editor and admin editor. Year options descend from the current year to 1950, retaining saved years outside that range. The shared control is [DivemasterJobMonthInput.vue](../app/components/DivemasterJobMonthInput.vue).
- Public employment dates show `MM/YY` ranges or Present. Training and certification dates retain their existing full-date inputs and display rules.
- Existing `2020-06-19` loads as June 2020 and displays as `06/20`. Viewing or opening the editor does not write. Explicit Save normalizes all submitted job dates to `YYYY-MM-01`, even if only another profile field was edited. No bulk backfill is performed.
- Dates remain optional; partial month/year pairs must be completed before Save. Current role clears/disables End. A supplied end date takes precedence over inconsistent Current state when serializing.
- [Date helpers](../shared/divemasterJobDates.ts) validate legacy dates and picker values before persistence. The [admin update endpoint](../server/api/admin/divemasters/[userId].patch.ts) also normalizes/validates before writes. Existing DATE columns remain in use; these UI changes require no new migration.

### Reviews And Location

- Owners retain average rating, count, and review list, but are not invited to review themselves. Empty profiles show **No rating / 0 Reviews**. Review forms and author controls are suppressed for owners and while signed-in ownership is unresolved; other visitors retain the normal review flow. Server-side self-review rejection remains required. See [divemaster-review-flow.md](divemaster-review-flow.md).
- Profile Location is currently free text. Database-first location autocomplete with Google fallback is a [separate proposal](location-autocomplete-design.md), not an enabled integration.

## Broader Directory Proposal

**Proposed decision:** Add a public directory for all dive professionals, with chat-first profile creation, admin-approved publishing, independent reviews, and a private contact form. Reuse Nuxt, Supabase, and the existing AI/email integrations.

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
