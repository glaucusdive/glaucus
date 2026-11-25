# Dive dictionary

Public scuba glossary for Glaucus marketing.

## Status

**Implemented** (static curated terms). Not a CMS. Definitions are authored in repo, not mined from third-party books under `docs/learning/`.

## Routes

| Path | Purpose |
| --- | --- |
| `/dictionary` | Browse: search, A–Z jump links, letter tiles + term cards |
| `/dictionary/[slug]` | Minimal detail: term name + definition |

Uses `layout: 'blog'` (`LandingHeader` / `LandingFooter`). Section padding matches homepage feature sections (`LandingHome` `#feature1`).

## Data

Canonical list: [`shared/diveDictionary.ts`](../shared/diveDictionary.ts)

- Fields: `slug`, `term`, `definition`, optional `aliases`
- Helpers: list / get / filter / group by letter / neighbors / sitemap entries

Add or edit terms only in that module. Keep slugs stable once published.

## SEO

- Index + detail pages are public (`index, follow`).
- Search with `?q=` on the index is `noindex, follow` (directory pattern).
- `/dictionary` is in `nuxt.config` sitemap `urls`.
- Term URLs come from [`server/api/__sitemap__/dictionary.ts`](../server/api/__sitemap__/dictionary.ts) (requires `x-sitemap-key`, same as other sitemap sources).
- Detail pages emit BreadcrumbList + DefinedTerm JSON-LD for visible content.

## Nav

Header and footer include a Dictionary link to `/dictionary`.

## Limitations

- No admin editor, categories, images, or related-term graph.
- No “Group by topic” mode (alphabetical only).
- Expanding the glossary is a code change, not a database write.

## Related

- [SEO and indexing guidelines](seo-indexing-guidelines.md)
- [Design conventions](design.md)
