/**
 * Contract for AI-first search (NLU + deterministic DB).
 * Server extracts facets in `interpretUserTurn` (see InterpretedTurn in server/utils/interpretUserTurn.ts).
 * The main search LLM still emits FILTERS / MESSAGE; facets are merged post-parse and applied in `runTripTypeSearchAfterLlm`.
 */

/** Mirrors optional NLU fields used for the five search dimensions */
export interface SearchAiExtractedFacets {
  /** Location / destination (city, island, region, country) */
  destination_text?: string | null
  /** Liveaboard vs resort vs day-trip / dive shop operator */
  trip_product_type?: 'liveaboard' | 'dive_resort' | 'dive_shop' | null
  /** Certification course fragment (matched against courses.certification_name) */
  certification_course_hint?: string | null
  /** Dive environment / site type (mapped to activity tokens + dive_site_types) */
  dive_site_type_label?: string | null
  /** Named operator when user searches by business */
  shop_name_hint?: string | null
  /** Cave, wreck, muck, etc. */
  activity_terms?: string[] | null
}
