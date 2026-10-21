# Location Autocomplete Design

**Status:** TomTom autocomplete is implemented separately in the shared owner editor. The database-first directory and Google fallback below remain proposed, not implemented. Updated 2026-10-20. No Google integration, location-directory migration, or data import is enabled by this document.

## Goal And Scope

Let a divemaster type part of a location and select a city, state/region, and country instead of entering the complete label. Start with the profile Location field in the shared owner editor. Reuse for admin editing or past-job locations requires an explicit follow-up decision; chat search, maps, device geolocation, street-address collection, and bulk rewriting existing profiles are outside this initial scope.

Existing location strings must remain readable and editable. Keep manual entry available for islands, smaller destinations, missing results, and provider failures. Do not change stored data merely by viewing a profile or opening its editor.

Current profile behavior is documented in [dive-master-plan.md](dive-master-plan.md#current-implementation) and [implementation-log.md](implementation-log.md).

## Recommended Data Flow

1. After a short debounce and minimum input length, search an indexed local directory of independently sourced public geographical data.
2. Show relevant local matches with enough context to distinguish cities with the same name. Selecting a local match avoids a Google request.
3. If no suitable local match exists, offer Google search; consider automatic fallback only after agreeing on cost and request limits. A partial local match must not prevent searching for a different place.
4. Display Google suggestions separately from local results with the required Google Maps attribution. Ignore stale responses after the input changes.
5. Selecting a result updates only the editor draft. Profile Save persists the permitted location representation; Cancel follows the existing discard flow.
6. On errors, quota exhaustion, or no results, retain the entered text and allow manual completion. Do not block unrelated profile edits.

No AI agent is needed: the frontend/server deterministically choose local lookup or Google fallback. Neither autocomplete provider may publish a profile or change account state.

## Local Directory And Provenance

A proposed directory would hold a stable local ID, city/place name, state/region, country code/name, aliases, normalized search text, and source/license metadata. These are design fields, not an existing table contract.

Use independently curated data or a dataset whose license permits the intended storage and reuse. GeoNames is a candidate, subject to license, attribution, coverage, and import review. Verify the provenance of any existing geographical data before reusing it.

- Preserve diacritics and display names while supporting case-insensitive search and useful aliases.
- Rank exact/prefix matches before broader matches; distinguish same-named places by region/country.
- Do not collect private account/profile locations into a public suggestion directory.
- Do not build the directory by importing Google predictions or copying Google-derived city labels into supposedly independent records.
- Additions and imports need validation, deduplication, access controls, and attribution appropriate to their source.

## Google Storage Boundary

Google Place IDs may be stored indefinitely, although Google recommends refreshing IDs older than 12 months. This permission does not extend to all fields returned with an ID.

Suggestion labels, formatted addresses, address components, and other Google content remain subject to applicable restrictions. The limited permission to cache Places latitude/longitude for 30 days is not a general 30-day permission for all response content. Do not introduce a shared response cache or permanent suggestion-label store without an applicable permission.

Google documents a narrow exception for an end user's selected street address in a specific transaction. Do not assume it covers a profile's city/region field or reuse across users. Clicking Save alone does not make all Google-derived content unrestricted user-authored data.

**Launch gate:** resolve how a Google-selected location may be stored and displayed on a public profile under the applicable agreement before implementing that persistence path. Local selections and independently entered text can continue using the current location string; a Google Place ID can be an optional reference, but is not a searchable local label on its own. Keep provider provenance explicit. EEA billing addresses have separate terms that require review.

## Integration And Security

- Use Places API (New), not a new dependency on the legacy API. The autocomplete web-service endpoint is `POST https://places.googleapis.com/v1/places:autocomplete`.
- Build a shared accessible input matching existing form controls, with keyboard selection, loading/empty/error states, mobile layout, and a manual-entry path.
- Use authenticated, rate-limited server endpoints for Google calls. Validate query length, session-token shape, and supported filters; do not accept arbitrary upstream URLs or field masks from the client.
- Store a dedicated API-restricted key only in the root untracked `.env` locally and the hosting provider's secret store in production. Never put it in `runtimeConfig.public`, source, logs, or examples. No new environment setting exists until implementation defines one.
- Enable billing and Places API (New) in the intended Google project. Choose application restrictions suitable for the actual server hosting arrangement; do not assume serverless egress has a fixed IP.
- Select the appropriate city or region filter for the desired coverage. `(cities)` and `(regions)` are alternatives and cannot be combined in one `includedPrimaryTypes` filter.
- Request only needed fields. If Place Details is used on selection, prefer required Essentials address fields; unnecessary fields can trigger more expensive SKUs.
- Use a unique session token per autocomplete interaction and the same token for its selection/terminating Details request. Rotate after completion; never pool tokens across users or interactions. A local-directory selection does not require starting a Google session.
- Use bounded timeouts, controlled error handling, usage metrics without raw location-query logs, and rate/request limits. Do not blindly replay profile saves when a lookup or refresh fails.
- Keep Google attribution visibly associated with Google content. Update applicable privacy/terms notices before rollout; typed queries are sent to an external provider when Google fallback is used.

## Pricing Snapshot

Global pay-as-you-go list checked 2026-10-20; recheck before launch. Regional rates, contracts, and billing-account aggregation can affect the bill.

| SKU | Monthly free billable events | First paid tier, USD per 1,000 events |
| --- | --- | --- |
| Autocomplete Requests | 10,000 | $2.83 |
| Place Details Essentials | 10,000 | $5.00 |

These are requests, not people or completed searches. One typing interaction can issue multiple requests; the two SKUs have separate free caps.

For a session terminating in a paid Place Details Essentials request, the first 12 autocomplete requests use Autocomplete Requests pricing; later requests in that session use the no-charge Autocomplete Session Usage SKU. The terminating Details request has its own charge/free cap. Abandoned sessions revert to per-request autocomplete pricing; terminating with IDs-only Details does not provide the same session benefit. Do not assume a session token makes all requests free, or request expensive Details fields merely to change autocomplete billing.

Use debouncing, minimum query length, local matches, quotas, and server-side request limits to control usage. Budget alerts notify; they are not hard spending caps. Cancelling a stale browser request does not guarantee an already-sent Google request is unbilled.

## Delivery And Verification

1. Agree on scope, local dataset/license, Google-selected profile storage policy, expected traffic, and cost limits. This document does not approve paid provisioning or imports.
2. Implement and test local-directory lookup and manual entry first, including schema/index/RLS changes if needed. Keep legacy location strings compatible.
3. Add Google fallback only after the storage/attribution gate is resolved, with isolated server configuration and synthetic API fixtures.
4. Test duplicate city names, aliases/diacritics, no matches, incomplete queries, stale responses, keyboard/mobile use, save/cancel, provider errors, rate limits, key isolation, and zero Google calls for selected local matches.
5. Verify session-token isolation and lifecycle, field masks, provenance, attribution, and any permitted retention policy. Run focused tests and build; perform live API/billing checks only with explicit configuration and authorization.
6. Record actual implementation, deployment requirements, and verification in the implementation log. Do not label this design as shipped until those steps are complete.

## Official References

- [Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)
- [Session pricing](https://developers.google.com/maps/documentation/places/web-service/session-pricing)
- [Places policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Place ID storage and refresh](https://developers.google.com/maps/documentation/places/web-service/place-id)
- [Service-specific terms](https://cloud.google.com/maps-platform/terms/maps-service-terms)