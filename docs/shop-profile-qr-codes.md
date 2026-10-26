# Dive Shop Profiles: Functionality, SEO, and QR Codes

This document describes the current dive-shop profile experience and the proposed work to make profiles easier to discover, share, and use. It is a product and implementation brief, not a claim that every proposed capability is already shipped.

For reusable public-page search guidance, see [SEO and indexing guidelines](seo-indexing-guidelines.md).

## Product Purpose

A dive shop profile is the public, shareable home for a business in Glaucus. It should help a diver:

- Understand what the business offers and where it operates.
- Review destinations, courses, rental equipment, gases, and available contact details.
- Read customer reviews and contribute their own review when signed in.
- Start a booking request through Glaucus.
- Share the business profile using a stable URL or QR code.

Profiles are for businesses, not individual Divemasters or instructors. Public professional profiles are a separate proposed product documented in `docs/dive-master-plan.md`.

## Actors and Entry Points

### Business navigation and directory

The landing-page **For Businesses** nav item links directly to `/for-businesses`, the shop directory.

- The directory's **List your shop** button opens `/for-businesses/list-your-shop`, the existing business inquiry form. This sends an inquiry notification to Glaucus; it does not create or publish a shop profile.
- The directory is searchable, shows 24 shops per page, keeps search and page number in the URL, and links each tile directly to `/shops/{slug}`.
- The directory query includes all current shop rows, including Dive Porter and Dive Shash.

Bare `/shops` redirects to `/for-businesses` for compatibility. Individual profiles remain at `/shops/{slug}`. A formal persisted approval workflow for new listings is proposed below.

### New shop submission and admin approval

**Current behavior:**

1. The business submits shop details plus the submitter's name, email, and optional notes on `/for-businesses/list-your-shop`.
2. `POST /api/shop-inquiry` validates the fields, formats the full proposal into an email, and sends it to the configured Glaucus notification address. The email includes the submitter's contact address and proposed business/offerings.
3. The endpoint returns success to the form. It does not store the request, create a `diveshops` row, or create an admin approval item. No automatic confirmation or follow-up email is sent to the submitter; the page only displays a success message.
4. There is no in-app reply or approval step for this new-shop inquiry. If staff choose to proceed, they must contact the submitter manually using the email in the notification, then manually create the shop and linked offerings through the protected Admin Shops workflow. The notification does not set `Reply-To`, so staff should use the submitter address shown in the email rather than assume their mail client's Reply action targets the submitter. The admin insert makes the shop an ordinary live shop row; there is no new-listing approval status attached to it.

The form copy says the team will review the details and follow up, but the follow-up and decision are manual and are not tracked by the application.

**Proposed workflow:**

1. Persist each new listing inquiry in a dedicated `shop_listing_submissions` table with `pending`, `approved`, or `denied` status, submitter contact details, proposed shop payload, submission timestamp, reviewer, review timestamp, and optional notes.
2. Add an admin queue for pending new listings. Review business identity, duplicate matches, contact details, location, business type, and linked offerings before approval.
3. On approval, validate duplicates and atomically create the `diveshops` row and its course, equipment, gas, and dive-site junctions. The existing insert trigger assigns the public slug.
4. On denial, retain the decision and reviewer notes for audit. Notify the submitter with an appropriate outcome; do not expose pending/denied submissions publicly.
5. Add a clear success state to the inquiry form explaining that submission is not publication and that the team will follow up.

Keep this workflow separate from `shop_update_submissions`: that table tracks proposed edits to an existing `diveshop_id` via `/partner/{token}`. It cannot represent a new business because a new listing has no existing shop ID yet.

### Public visitor / diver

- Discovers a business in chat search results, the `/for-businesses` directory, a QR code, or opens its public `/shops/{slug}` page directly.
- Can view public profile information and existing reviews without signing in.
- Can use website, phone, email, and map links when those values are present.
- Can start a booking request. Sending the request follows the separate confirmation rules in `docs/booking-email-flow.md`.
- Must sign in to write a shop review. The current shop-review policy allows public reads and authenticated users' own writes; current review UI does not require a matching Glaucus booking.

### Shop owner / representative

- Uses the token-based partner page at `/partner/{token}` to submit profile changes.
- Partner submissions are reviewed before changes go live; the portal is not an authenticated self-service profile editor.
- The validated partner page includes QR flyer preview, PDF download, and Print for the linked shop. These use the persisted public listing, never pending form changes or the private partner token.

### Glaucus administrator

- Uses the admin shop-management page to create, edit, import, or remove shop records and linked offerings.
- Controls the data that appears on public profiles and issues partner update links.
- For a new-shop inquiry, currently reviews the notification email and, if accepted, manually contacts the submitter and creates the shop in Admin Shops; the system records neither the inquiry nor the decision.
- The current directory proposal includes every shop row; the schema has no publication status or per-shop indexing control.
- Under the proposed new-listing workflow, reviews and approves/denies persisted pending submissions before they become `diveshops` rows.

## Current Public Profile

### Route and data

- Public route: `/shops/{slug}`. The route also accepts legacy shop UUIDs.
- Slugs are unique and generated from the business name on insert. The current trigger does not automatically change the slug when a shop is renamed.
- The route resolves the shop and related country, region, courses, rental equipment, gases, and dive sites through `useShopDetail`.
- The page sets a per-shop title and description using `app/utils/shopSeo.ts`.
- The profile exposes business name, address/location, phone, email, website, and linked offering data. Search cards show the Google rating when present.

### Visible sections and actions

- **Reviews:** Publicly readable reviews with author display name, date, rating, and comment. A signed-out visitor sees a sign-in prompt instead of the review form. A signed-in author can edit or delete their review; admins currently have an additional delete path. Reviews are fetched client-side.
- **Dive Destinations:** Linked dive sites grouped by dive-site type.
- **Courses:** Linked course names and descriptions when available; empty listings have an explanatory state.
- **More Information:** Rental equipment and gas mixture are displayed. Hours, languages, and business description are present in code but currently behind a disabled feature constant. Payment methods are not wired.
- **Booking:** The full profile has a booking call-to-action. Chat detail panels may hide that sidebar CTA and use the chat result card's booking action instead.
- **Contact:** Address opens a map search; phone and email use `tel:` and `mailto:`; website opens externally.
- **Social and review links:** Configured links such as Facebook, Instagram, X, Google Reviews, or TripAdvisor appear below contact details. Only validated HTTP(S) URLs are shown.
- **Nearby shops:** A related-shops tab exists in the component but is currently disabled.

### Search result card

Search cards show the business name, Google rating, location, available website/phone/email links, and selected type/course/site highlights. Actions are **Book this** and **View shop details**. The detail action opens a panel; the card does not currently provide a normal anchor to the public shop profile, which limits crawler discovery from search-result pages.

The `/for-businesses` directory is a separate public browse surface, not a replacement for chat search cards or the individual shop profile. Directory tiles use real crawlable links; the existing chat card retains its detail and booking actions. Bare `/shops` redirects to the directory, while `/shops/{slug}` remains the individual profile route.

## Data Managed For A Shop

The current admin and partner form shape covers:

- Business name and business type(s).
- Street address, city, state, country, and region.
- Website URL, phone, and email.
- Up to 12 labeled social-media and review URLs.
- Linked courses, rental equipment, gases, and dive sites.

The public detail component also knows how to display operating hours, languages, and business description, but that section is currently disabled. Payment methods, self-service owner control, profile photos, and richer business-story content are not currently part of the active shop form/profile experience.

Social and review links are stored in `diveshops.social_links`. Admins can set them directly; partner-submitted changes pass through the existing admin review workflow. The database column is added by `supabase/migrations/20261011130000_diveshop_social_links.sql`; apply that migration before deploying the new write path.

## QR Code and Sharing

### Implemented public profile action

The shared shop detail header has a **Share** control on each public business profile. It opens an accessible sharing-only dialog containing:

- The shop name and readable absolute URL.
- **Copy link** and native **Share**, with copy fallback when native sharing is unavailable.

The same public control appears on the full profile page and chat shop-detail panel. Public sharing does not render a QR or generate flyer artwork.

### Partner and admin access

The existing private `/partner/{token}` page provides **QR flyer and sharing** after server-side token validation for its linked shop, including after submitting updates. Invalid or revoked links expose no promotional tools. Changing partner routes clears the previous shop and closes its dialog; stale loads are ignored.

The server returns a separate public sharing snapshot from persisted shop fields. Unsaved form edits, pending submissions, and submitter contact details are not flyer inputs. Flyers encode only the canonical public `/shops/{slug}` URL (legacy shop ID fallback), never the partner path or token. They contain public name, business type/location, and available website/phone/email.

Authorized representatives get a branded A4 flyer preview, **Download PDF**, and **Print**, alongside Copy link and Share. Preview, PDF, and printout use identical browser-generated artwork with a high-error-correction black-and-white QR and quiet zone. PDF code is lazy-loaded locally; no remote document service is used. SVG download is not offered.

DivePros use this same dialog, with flyer access enabled only for the verified profile owner. Flyer capability defaults off and is cleared when permission or profile changes. This is a UI distinction, not a privacy boundary: visitors can still copy public URLs, generate their own QR codes, or use browser printing. Partner links authorize representatives rather than establishing account-linked ownership. Admin bulk distribution remains outside this change.

### Destination lifecycle

- Encode the canonical public URL, normally `https://glaucusdive.com/shops/{slug}` or the origin from `NUXT_SITE_URL`.
- Do not encode UUIDs, authentication state, partner tokens, temporary URLs, or required tracking parameters.
- Printed codes can outlive business-name changes. Preserve old slugs as aliases and permanently redirect them if a slug ever changes.
- QR codes direct human visitors; they do not themselves make a page discoverable to search crawlers.

## SEO and Indexing Plan

See [SEO and indexing guidelines](seo-indexing-guidelines.md) for general implementation principles. Shop-specific work:

1. **Implemented:** `/for-businesses` is a public searchable directory with stable business-name ordering, 24 shops per page, URL-addressable search/pagination, and crawlable profile links. Bare `/shops` redirects there; individual profiles remain `/shops/{slug}`.
2. **Implemented:** The dynamic shop sitemap source includes all current `diveshops` rows, including Dive Porter and Dive Shash. This is the explicit product choice for this directory; no publication filter is applied.
3. Set one canonical slug URL per public profile. Keep UUID routes for compatibility but canonicalize or redirect them to the slug URL.
4. Add crawlable profile links from other public discovery surfaces as needed; search cards currently retain their interactive detail and booking actions.
5. Keep important profile content in server-rendered HTML. Reviews currently load client-side, so do not assume Google sees review text or ratings in the initial response.
6. Verify with Search Console URL Inspection. Sitemap inclusion and QR availability do not guarantee indexing or ranking.

## Reviews and Ranking Claims

Google describes local results using relevance, distance, and prominence. Review quantity and positive ratings can contribute to prominence alongside other signals, but Google does not guarantee a ranking improvement. Glaucus reviews do not automatically alter a business's Google Business Profile review count or rating.

Do not promise review stars in Google results. Google restricts self-serving LocalBusiness review snippets and does not guarantee rich-result display. Any future markup must reflect genuine Glaucus reviews that are visible on the page, not imported Google ratings or an aggregate across external sources. Confirm current eligibility and test the rendered URL before release.

## Implementation Sequence

1. **Implemented:** Direct For Businesses navigation to `/for-businesses`, the `/for-businesses` directory, the `/for-businesses/list-your-shop` inquiry form, a `/shops` compatibility redirect, public search/pagination API, crawlable profile tiles, and dynamic shop sitemap.
2. **New-listing approval:** Persist new inquiries, add an admin review queue, and create the public shop plus junction rows only after approval. Keep pending/denied submissions out of public profile, directory, and sitemap queries. Keep partner edits in their existing approval flow.
3. **Implemented:** Admin, new-listing, and partner forms can enter up to 12 labeled social/review URLs. Writes normalize to valid HTTP(S); partner changes remain pending until admin approval; public profiles render configured links below contact details. Apply the social-links migration before deploying. Re-enabling hours/languages/description, adding business media, payment methods, and nearby-shop navigation remain future decisions.
4. **SEO foundations:** Add canonical metadata for shop profiles and validate direct and UUID routes.
5. **Implemented:** Public profile Share dialog with copy link and native share/copy fallback. Validated shop partners and verified DivePro owners additionally get flyer preview, PDF download, and matching print layout using public details only. Admin bulk distribution remains future work.
6. **Reviews and measurement:** Decide if review content should be server-rendered; keep Google and Glaucus rating sources distinct. Monitor Search Console without making indexing/rich snippets acceptance guarantees.

## Acceptance Checks

- Each public shop has one canonical slug URL; legacy UUID URLs resolve or redirect without duplicate canonical pages.
- Public profile exposes accurate business data, useful empty states, and accessible booking/contact actions on desktop and mobile.
- Sitemap and `/for-businesses` directory currently contain every shop row, including Dive Porter and Dive Shash.
- A new listing submission creates a persisted `pending` record but no public shop profile until an authorized administrator approves it.
- Approval creates exactly one shop with its linked offerings; denial preserves an auditable decision and leaves no public shop row.
- Existing partner edits remain independently pending until approved and do not use the new-listing queue.
- Directory supports search and pagination, has stable ordering, and its tiles link directly to the matching profile slug.
- The For Businesses link opens the directory on desktop and mobile; **List your shop** opens `/for-businesses/list-your-shop` and retains the reviewed inquiry flow.
- Search/discovery surfaces contain crawlable profile links in addition to interactive drawer and booking actions.
- Public Share offers Copy link and native Share without flyer generation. Validated partner flyers encode the canonical public slug URL; download and print include the published shop name and readable URL. QR destinations resolve without sign-in.
- Previously printed QR codes remain valid if a shop slug is changed.
- Public reviews remain readable when signed out; review writing follows the current sign-in and RLS rules.
- Admin/new-listing/partner forms round-trip labeled social links; unsafe or invalid protocols do not render as external links.
- Google ranking claims distinguish Glaucus reviews from Google Business Profile reviews; any review structured data is policy-checked and describes only visible, genuine reviews.
- Search Console URL Inspection confirms the intended rendered content and canonical on deployed sample pages. Indexing and ranking are not guaranteed.

## References

- [SEO and indexing guidelines](seo-indexing-guidelines.md)
- [Booking email flow](booking-email-flow.md)
- [Google Business Profile: Improve local ranking](https://support.google.com/business/answer/7091?hl=en)
- [Google Search Central: Review snippet structured data](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- [Google Search Central: Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google Search Central: Crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)