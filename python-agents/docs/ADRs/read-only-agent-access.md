# Read-Only Agent Access to Supabase

## Goal

Give the Python agent a **safe, limited read-only view** of user-interacting data so it can plan better, reduce hallucinations, and provide structured responses in production — **without owning writes** or becoming the source of truth.

This document describes the low-level implementation recommendation for the idea discussed in the backlog:
> Python may have Supabase access for data related to the user interaction, but access must be read-only, curated, and intentionally scoped.

## Guiding principles

1. **TypeScript remains the authority for writes and final application state**.
2. **Python reads only curated data shapes**, not arbitrary raw tables.
3. **Prefer summary/read models over direct table reads** for privacy, stability, and prompt quality.
4. **Do not expose more data than needed** for planning, routing, or explanation.
5. **All Python DB access must be optional, observable, and revocable**.

## Recommended access model

### Allowed for Python
- Shop listings and shop detail summaries
- Course catalogs and certification summaries
- Dive site catalogs and dive-site type summaries
- User profile summary fields needed for booking continuation
- Saved certificate summaries needed for eligibility checks
- Past booking summaries needed for continuity and personalization
- Persisted chat/session summaries needed for conversational continuity

### Not allowed for Python
- Direct booking writes
- Email sends
- Admin-only data mutation paths
- Broad raw-table access without a read model
- Unbounded access to all user rows or all historical records
- Any side-effecting workflow

## Suggested implementation pattern

### 1) Create read models
Expose Python-facing data through one of these:
- SQL views
- RPC functions
- server-side read endpoints
- materialized views for hot paths

Use these to normalize the schema into stable shapes such as:
- `shop_summary`
- `shop_booking_context`
- `user_booking_context`
- `user_certificate_summary`
- `chat_continuity_summary`

### 2) Scope the read models by use case
Examples:
- **Search planning**: city/country/region, rating, shop type, languages, linked courses, linked dive sites
- **Booking planning**: selected shop, required course names, dive sites, rental equipment, past booking context
- **Personalization**: default diver info, saved certificates, prior booking preferences

### 3) Keep Python on a least-privilege key
Use a dedicated service identity or service-role only for the read endpoints that are explicitly allowed.

If direct Supabase access is used:
- Use a dedicated read-only client path where possible
- If a service role is required, restrict it by code path and data shape
- Do not let Python construct arbitrary SQL against the full database

### 4) Validate every read result
Python should treat database rows as **input**, not truth.

Before using a read result for routing or explanation:
- Validate the shape
- Validate required fields
- Drop unknown fields
- Apply confidence thresholds if the result is incomplete or ambiguous

### 5) Keep TS as the source of truth
Even if Python reads these summaries:
- TS still owns the final UI payload
- TS still owns booking creation and persistence
- TS still performs the authoritative query if needed

## Low-level access matrix

| Data category | Python access | Purpose | Notes |
|---|---:|---|---|
| Dive shop summaries | Yes | Search planning, explanation | Prefer summaries over raw rows |
| Dive shop relationships (courses/sites/equipment) | Yes | Booking planning | Read-only only |
| Countries / regions | Yes | Destination disambiguation | Stable reference data |
| Courses / agencies / levels | Yes | Eligibility planning | Useful for matching certification |
| Dive site catalog / types | Yes | Activity and destination planning | Useful for structured explanations |
| Booking drafts | Possibly | Continuity | Only if user-owned and needed |
| Booking submissions | Summaries only | Continuity / history | Do not expose raw sensitive details unless needed |
| Saved certificates | Summary only | Eligibility planning | Minimize sensitive exposure |
| Profiles / default diver | Summary only | Booking continuation | Redact unnecessary fields |
| Chats / sessions | Summary only | Conversation continuity | Prefer recent turn summaries |
| Reviews | Yes, public read-only | Recommendation/explanation | Safe if already public |
| Admin portal submissions | No | None | Keep excluded from Python |

## Data available in the current Supabase schema

From the migrations currently in the repo, the main entities are:

### Reference / catalog tables
- `regions`
- `countries`
- `agencies`
- `course_levels`
- `courses`
- `dive_site_types`
- `dive_sites`
- `gases`
- `rental_equipment`
- `country_aliases`

### Core commerce tables
- `diveshops`
- `diveshop_courses`
- `diveshop_rental_equipment`
- `diveshop_gases`
- `diveshop_dive_sites`

### User / conversation tables
- `profiles`
- `booking_drafts`
- `booking_submissions`
- `user_chats`

### Public trust / content tables
- `shop_reviews`

### Admin / partner workflow tables
- `diveshop_portal_tokens`
- `shop_update_submissions`

## ER-style summary

```text
regions 1 ── * countries
countries 1 ── * diveshops
regions 1 ── * diveshops (via region_id)

agencies 1 ── * course_levels 1 ── * courses

countries 1 ── * dive_sites
"dive_site_types" 1 ── * dive_sites

"diveshops" * ── * courses (via diveshop_courses)
"diveshops" * ── * rental_equipment (via diveshop_rental_equipment)
"diveshops" * ── * gases (via diveshop_gases)
"diveshops" * ── * dive_sites (via diveshop_dive_sites)

auth.users 1 ── 1 profiles
auth.users 1 ── * booking_drafts
auth.users 1 ── * booking_submissions
auth.users 1 ── 1 user_chats
auth.users 1 ── * shop_reviews

diveshops 1 ── * booking_drafts

diveshops 1 ── * booking_submissions

diveshops 1 ── * shop_reviews

diveshops 1 ── * shop_update_submissions

diveshops 1 ── * diveshop_portal_tokens
```

## Recommended Python-facing read models

### A. Shop discovery model
Use for:
- answering “what shops are in Bali?”
- ranking shops
- surfacing course/site/equipment info

Suggested fields:
- `shop_id`
- `business_name`
- `city`
- `state`
- `country_name`
- `region_name`
- `google_rating`
- `languages`
- `shop_type`
- `courses[]`
- `dive_sites[]`
- `rental_equipment[]`
- `gases[]`

### B. Booking planning model
Use for:
- continuation after shop selection
- explaining course eligibility
- collecting the next missing booking field

Suggested fields:
- `shop_id`
- `shop_name`
- `course_summaries[]`
- `site_summaries[]`
- `rental_equipment_summaries[]`
- `last_booking_summary`
- `certificate_summary`
- `default_diver_summary`

### C. User continuity model
Use for:
- returning user personalization
- “use my previous booking info”

Suggested fields:
- `display_name`
- `email`
- `default_diver_summary`
- `saved_certificate_summary[]`
- `recent_booking_summary[]`
- `active_chat_summary`

## Suggested implementation steps

1. **Define the read models** in SQL or server-side endpoints.
2. **Whitelist the exact fields** Python is allowed to see.
3. **Add schema validation** in Python for each response shape.
4. **Keep writes in TS only**.
5. **Add logging/trace IDs** for every Python read request.
6. **Add docs/tests** for the allowed access matrix.
7. **Review retention/privacy** before exposing user-specific data.

## Decision checkpoint

Before enabling this in production, decide:
- Which reads are public and safe for all users
- Which reads require the current user to be authenticated
- Which data must be summarized instead of exposed raw
- Whether any read path should be debug-only

## Practical recommendation

For the current system, a good production path is:
- **Public, read-only shop/catalog data** for Python now
- **Authenticated summary views** for user-specific continuity later
- **TS remains authoritative** for all writes and final response shaping

That gives the Python agent enough context to be useful without making it the system of record.

