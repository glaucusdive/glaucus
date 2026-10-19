# SEO and Indexing Guidelines

Reusable guidance for public, search-facing pages in Glaucus. This is an implementation checklist, not a promise of search ranking or indexing.

## Crawling, Indexing, and Ranking Are Different

- **Crawling:** Search engines can fetch the URL. Do not block public pages in `robots.txt` when crawlers need to see their content or a `noindex` directive.
- **Indexing:** A crawler may choose to include a fetched page in its index. Sitemaps and internal links help discovery; they do not guarantee indexing.
- **Ranking:** Search engines choose where an indexed page appears. Metadata, structured data, reviews, and sitemap inclusion do not guarantee a ranking position.

## Public Page Checklist

1. Use a stable, readable URL. If a public URL changes, preserve the old URL with a permanent redirect where possible.
2. Render meaningful page content on the server. Do not rely on client-only data for the primary business description, title, canonical URL, or other search-critical content.
3. Set a unique title and useful description for each page. Add one canonical URL for the preferred URL form to prevent duplicate routes from competing.
4. Use crawlable links: semantic `<a href>` or Nuxt links with real destinations. Do not make a JavaScript-only click handler the sole path to public content.
5. Include only intended public pages in the sitemap. Use absolute canonical URLs and accurate `lastmod` values; omit `lastmod` if there is no reliable modification timestamp.
6. Decide publication and indexability explicitly. Keep private, draft, duplicate, low-value, and test content out of the sitemap. Use `noindex` for pages that must remain directly accessible but should not appear in search.
7. Add structured data only when it describes visible, accurate page content and follows the relevant search-engine policies. Valid markup does not guarantee a rich result.
8. Check mobile rendering, HTTP status, canonical, robots directives, page content, and internal links before release.

## Dynamic Routes

Dynamic routes can be indexed. A route such as `/shops/{slug}` is a template; each valid slug resolves to its own page. For discovery at scale, pair dynamic routes with:

- A sitemap endpoint that enumerates eligible public records.
- A public browse surface with crawlable links to those records.
- A stable canonical URL per record and redirect behavior for changed slugs.
- Explicit publication/indexability rules so test or unpublished records are not promoted as public results.

Do not assume that a QR code, an API response, a search result loaded only after interaction, or a client-rendered modal makes a URL discoverable to search crawlers.

## Reviews and Search Claims

Reviews can help visitors evaluate a business. Google says local results are mainly based on relevance, distance, and prominence, and that review quantity and positive ratings can contribute to prominence. This is one signal, not a ranking guarantee. Glaucus reviews do not automatically update the business's Google Business Profile reviews or ratings.

Review structured data must follow Google's current rules. Only mark up genuine reviews and ratings visible on the page, and do not aggregate ratings from other sites. Google restricts self-serving review snippets for businesses reviewing themselves. Rich-result eligibility and display are never guaranteed. Review content loaded only in the browser should not be assumed to appear in the initial HTML inspected by crawlers.

## Glaucus Shop Profile Snapshot

As of 2026-10-19:

- Public shop pages are `/shops/[slug]`. Titles and descriptions come from `app/utils/shopSeo.ts`. The canonical URL is the absolute slug URL. A legacy `/shops/{uuid}` URL 301s to the slug.
- Shop profile pages are indexable (`index, follow`). Seeded test shops Dive Porter and Dive Shash (`shared/testShops.ts`) are `noindex, nofollow` and are left out of the sitemap and the directory.
- `/for-businesses`, including `?page=` and `?q=`, and `/for-businesses/list-your-shop` are `noindex, follow` and are not in the sitemap.
- `robots.txt` does not disallow `/shops/` or `/divemaster/`. It still disallows `/api/`.
- The sitemap lists fixed routes plus blog posts, shop slugs, and published divemaster usernames. Sitemap source routes require the `x-sitemap-key` header.
- Each shop page renders a short server-side list of nearby shop links.
- Shop reviews are loaded client-side by `app/composables/useShopReviews.ts`.
- Published divemaster pages (`/divemaster/[username]`) are indexable and included in the sitemap. Draft and pending profiles are not.

Related shop-specific QR plan: [Shop Profile QR Codes](shop-profile-qr-codes.md).

## Verification

- Inspect representative production URLs in Google Search Console's URL Inspection tool.
- Verify sitemap contents and robots access for both eligible and excluded pages.
- Check that rendered HTML contains the expected title, description, canonical, and important page content.
- Use the Rich Results Test only when structured data is implemented; fix policy/technical issues, but do not treat rich-result display as an acceptance requirement.
- After release, monitor crawl/index coverage and search performance. Allow time for recrawl; sitemap submission is not an indexing command.

## References

- [Google Business Profile: Improve local ranking](https://support.google.com/business/answer/7091?hl=en)
- [Google Search Central: Review snippet structured data](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- [Google Search Central: Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google Search Central: Crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Google Search Central: Block indexing with `noindex`](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Search Console Help: URL Inspection](https://support.google.com/webmasters/answer/9012289?hl=en)