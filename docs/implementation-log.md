# Implementation Log

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