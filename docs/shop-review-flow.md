# Shop Review Flow

**Status:** Implemented in application code. The verification migration must be applied to each Supabase environment before deploying the updated review-write path.

## Why This Changed

Shop reviews already existed on public dive shop profiles. The previous experience required sign-in but did not require a confirmed email, did not associate reviews with Glaucus booking requests, and allowed admins to delete another user's review. Chat had no deterministic path for a user asking to leave a shop review. Search tiles show the average rating and count of Glaucus-authored shop reviews; they do not mix those values with Google ratings.

## Product Decisions

- A user may review a business whether the booking was made through Glaucus, another provider, or outside the marketplace.
- Posting requires a signed-in account with a confirmed email.
- Reviews publish immediately. Review text is written by the user; chat does not draft, rewrite, or submit it.
- A review is marked **Verified Booking** only if the server matches it to the latest successfully sent Glaucus booking request for the same shop.
- Authenticated submissions match by `user_id` and `shop_id`. Guest submissions may match by exact, normalized email against the confirmed email on the signed-in account, and the same `shop_id`.
- An unmatched review remains allowed and has no verification label.
- **Verified Booking** means a request was sent through Glaucus. It does not mean the shop accepted the request or that the trip occurred.
- Each user continues to have one review per shop. Authors may edit or delete their own review. Admins cannot delete another user's review; no post-publication moderation or takedown workflow is provided.
- Shop review comments remain visible to signed-out visitors. Sign-in and confirmed email are required only to post.

## User Flow

1. The user asks chat to review a named business, for example, “want to review Dive Shash.”
2. The orchestrator resolves the business against the shop directory. An omitted name prompts for one; an ambiguous name returns an action for each matching profile; an unmatched name can be corrected or canceled.
3. Chat returns a structured link to `/shops/{slug}` (UUID fallback). The public shop profile opens on its Reviews tab.
4. The user writes a 1–5 rating and their own comment on the profile. On successful save, the review appears immediately.
5. Signed-out visitors can read reviews and are prompted to sign in to write. Signed-in accounts without a confirmed email are offered a confirmation-email resend action.

The booking pre-send “review” is separate. `parseShopReviewRequest` deliberately does not route booking-summary review wording to the shop-review flow.

## Data And Trust Boundary

- `shop_reviews.booking_submission_id` stores the matching submission, or `NULL` for an unverified review.
- `POST /api/shop-reviews` is the only create/update path. It authenticates with the bearer token, checks confirmed email, validates the rating and comment, and performs the upsert with the service-role client.
- The client sends only shop ID, rating, and user-authored comment. It cannot supply a booking ID or verification flag.
- The server selects the most recent matching request. The association is recomputed on review create/update.
- The migration backfills existing reviews when an eligible matching submission exists. Reviews with no match remain unverified.
- Public `SELECT` access for reviews remains enabled. Direct client `INSERT` and `UPDATE` policies are removed so verification cannot be spoofed. The admin-delete policy is removed; author-owned deletion remains.

## Implementation Map

- `shared/shopReviewIntent.ts` — deterministic shop-review phrase parsing and pending-name/cancel behavior.
- `server/utils/runAiSearchPostHandler.ts` — server-controlled review intent routing and structured `reviewActions` response.
- `server/utils/resolveShop.ts` — directory lookup includes public shop slug.
- `app/components/chat/ChatHome.vue` — structured profile action, pending intent serialization, guided-search bypass for review intents, and replay of unresolved review deep links from cache.
- `server/api/shop-reviews.post.ts` — confirmed-email gate, latest booking association, and trusted upsert.
- `server/utils/shopReviewVerification.ts` — email normalization, confirmed-email predicate, safe exact-match filter escaping, and newest-booking selection.
- `app/composables/useShopReviews.ts` and `app/components/ShopReviewForm.vue` — public review read and API-backed save; legacy-column fallback keeps public reviews readable before migration.
- `app/components/DiveShopDetail.vue` and `app/components/CardReview.vue` — verified-booking label and author-only delete control.
- `app/components/CardSearchResult.vue` and `server/utils/enrichShopsForSearchCards.ts` — Glaucus review average/count in search tiles; averages are aggregated in Postgres by `get_shop_review_summaries`.
- `supabase/migrations/20261011120000_shop_review_booking_verification.sql` — nullable booking link, backfill, index, and policy changes.

## Verification Record

- Focused booking-verification and review-intent tests passed.
- Full `npm test`: 528 passed, 1 live-OpenAI test skipped.
- `npm run build` passed.
- Local browser check: `/?chat=1&q=want+to+review+dive+shash` returns a **Review Dive Shash** action; opening it displays the existing review to a signed-out visitor and retains the sign-in prompt for posting.
- Direct local orchestrator check returned `/shops/dive-shash` as the structured action.

## Deployment And Limitations

1. Apply `supabase/migrations/20261011120000_shop_review_booking_verification.sql` before deploying the updated app. The migration has not been applied to production as part of this implementation.
2. Apply `supabase/migrations/20261016130000_shop_review_summaries.sql` before deploying search-card average ratings. It exposes an invoker-security aggregate over the public `shop_reviews` read policy.
3. The profile read has a fallback for environments missing `booking_submission_id`, so existing public reviews remain readable before migration. Verified labels require the migration.
4. The write endpoint requires `SUPABASE_SERVICE_ROLE_KEY`, already used by server-side guest booking logging. Keep it server-only.
5. Booking submissions record successful email sends, not acceptance, cancellation, or trip completion. A request later canceled outside Glaucus can still qualify as a verified booking.
6. Admin deletion and post-publication moderation are intentionally absent under the requested policy. There is no recovery workflow for abusive or unlawful review content.
