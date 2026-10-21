# Divemaster Review Flow

**Status:** Implemented in application code. Apply `20261016120000_divemaster_reviews.sql` before deploying the review endpoints.

## User Flow

1. The user asks chat to review a named divemaster, or asks generally to review a shop or divemaster.
2. Chat asks for the entity type and profile name when either is missing. Only published divemaster profiles are eligible for matching.
3. Chat returns a structured link to `/divemaster/{username}`. It does not collect, draft, or submit review content.
4. The profile displays public reviews and an average/count summary link to the Reviews section. Eligible visitors get a 1–5 rating/comment form and can maintain one review per divemaster.

## Owner And Visitor Presentation

- A divemaster viewing their own profile still sees the average rating, review count, and public review list. With no reviews, the summary shows **No rating / 0 Reviews**, not **Be the first to review**.
- Owners do not see the review form, review-related email-confirmation prompts, or review-author edit/delete controls. This is separate from the owner's pencil for editing profile content.
- While signed-in ownership is unresolved, use neutral empty-state wording and suppress review forms/actions. Do not briefly invite an owner to review themselves; unresolved/failed ownership lookup must not enable posting UI.
- Other signed-in visitors retain the existing confirmed-email review flow. Signed-out visitors retain the sign-in prompt. Review-fetch errors retain **Reviews unavailable** rather than inventing a rating or count.
- UI checks are not authorization. The server must reject self-reviews even if a caller bypasses the page.

See [current profile editing behavior](dive-master-plan.md#current-implementation) for owner editing, job dates, and discard confirmation.

## Trust And Access

- Posting requires an authenticated account with a confirmed email.
- Posting a review of one's own divemaster profile is rejected server-side.
- Review text is user-authored. The server validates rating and comment length, derives the author display name, and upserts on `(user_id, divemaster_user_id)`.
- Authors can edit or delete their own review. Reviews are immediately visible on published profiles.
- The public endpoint omits reviewer account IDs. Direct table access is denied by RLS; reads and writes go through server endpoints.
- Divemaster reviews do not have a booking-verification badge or booking association. This differs from shop reviews, documented in [shop-review-flow.md](shop-review-flow.md).
- Admins can hide or delete any divemaster review from `/admin/reviews`. Hidden reviews are omitted from public profiles. Hide needs the `review_hidden` migration in that Supabase environment.

## API

- `GET /api/divemaster/{username}/reviews` returns sanitized public review fields and, when authenticated, the current user's review.
- `POST /api/divemaster/{username}/reviews` creates or updates the caller's review.
- `DELETE /api/divemaster/{username}/reviews` deletes only the caller's review.

The chat recognizes simple greetings with a local fast path; other search requests keep the normal orchestrator flow. Shop result cards link to the shop profile using a labeled **View profile** action, distinct from **Book this**.

All profile-scoped reads and writes require the divemaster profile to be published, except author deletion, which remains available if the profile is later unpublished.

## Deployment And Verification

1. Apply `supabase/migrations/20261016120000_divemaster_reviews.sql` before deploying application code.
2. Configure the existing server-only `SUPABASE_SERVICE_ROLE_KEY`; review endpoints use it to enforce the public-field boundary and author-scoped writes.
3. Run the focused review-intent, divemaster resolver, and review-input tests, then the full test suite and application build.
4. In a configured environment, test profile visibility, generic and named chat requests, confirmed-email submission, edit/delete, and non-published profile behavior.
5. Check owners with zero and multiple reviews, delayed ownership lookup, review-fetch failure, other signed-in visitors, and guests. Verify rating/count/list remain visible while owner self-review invitations and forms are absent. Use synthetic fixtures; do not assume browser mock checks prove remote RLS or migration deployment.

See [implementation-log.md](implementation-log.md) for the dated change record.