# python-agents

Python microservice that owns all **OpenAI / LLM calls** for the Glaucus Dive platform.  
The Nuxt/Nitro TypeScript layer **exclusively owns all Supabase operations** (reads AND writes) and calls this service only for AI/LLM extraction steps.

For local development, this service can optionally run model calls through
**LangChain** and emit traces to **LangSmith**.

## High-Level Design

This microservice implements a **strict separation of concerns**:

### Python-agents (This Service) — LLM Extraction ONLY
- **Owns all LLM calls**: NLU interpretation, search filter extraction, booking data collection
- **Returns structured extracted data** + routing decisions; does NOT persist anything
- **Makes NO Supabase writes** (ever)
- **Makes NO Supabase reads** (except optional diagnostics when explicitly requested via `runDbProbe`/`runDbSearch` — and TS discards these results)
- **Never touches bookings, emails, or user data**

### TypeScript/Nitro (TS Layer) — Supabase Authority
- **Exclusively owns ALL Supabase operations**:
  - ✅ Writes: booking creation, submission storage, email logs
  - ✅ Reads: shop search (`buildDiveShopQuery`), courses, dive sites, rental equipment
  - ✅ Persistence: all data mutations go through TS layer only
- **Orchestrates the full flow**:
  - Calls Python for NLU extraction
  - Injects Python's NLU results into TS pipeline
  - Runs authoritative Supabase queries (ignores any Python DB probes)
  - Returns UI-ready responses
  - Sends emails via Resend
  - Persists all bookings to Supabase

### Critical Boundaries

| Operation | Python | TypeScript |
|-----------|--------|------------|
| LLM calls (NLU, search extraction, booking dialogue) | ✅ Yes | ❌ No |
| Supabase writes (bookings, emails, audit logs) | ❌ Never | ✅ Exclusive |
| Supabase reads (shop search, courses, sites) | ❌ Only diagnostic | ✅ Authoritative |
| Sending emails | ❌ No | ✅ Yes (Resend) |
| Persisting booking submissions | ❌ No | ✅ Yes |
| User data mutations | ❌ No | ✅ Only |

### Example: Booking Flow Boundaries

```
User submits booking form in browser
    │
    ▼
Browser → POST /api/guided-orchestrator
    │
    ├─ TS reads body, calls Python orchestrator
    │  Python: runs NLU only, returns interpretTurn
    │
    ├─ TS injects NLU result into runAiSearchPostHandler
    │  TS: Runs buildDiveShopQuery, enrichment, booking form logic
    │
    └─ User confirms booking, sends to /api/booking
       │
       ├─ Python (booking agent): ❌ NOT called
       │
       ├─ TS: ✅ YES
       │    - Validates booking payload
       │    - Inserts booking_submissions row → Supabase
       │    - Sends confirmation email → Resend
       │    - Returns success
       │
       ▼
       Booking persisted in Supabase ✅
```

**Key Point**: Python's `/agents/booking` endpoint exists for LLM-driven multi-turn booking dialogue, but it:
- Returns `collectedPayload` + `reply` only
- Does NOT write anything
- Does NOT call Supabase
- TS takes `finalPayload` and calls `/api/booking` to actually persist it

## Swimlanes: Search vs. Booking Flows

### Search Flow (Happy Path)
```
Browser          Nuxt/Nitro                 Python-agents            Supabase
  │                 │                              │                     │
  ├─ "dive Komodo"─►│ POST /guided-orchestrator   │                     │
  │                 │                              │                     │
  │                 ├─ Call orchestrator ────────►│                      │
  │                 │                              │                     │
  │                 │                    POST /agents/nlu                │
  │                 │◄──── InterpretedTurn (goal: search_shops)          │
  │                 │                              │                     │
  │                 │  (optional) probe_referent  │                     │
  │                 │  (DIAGNOSTIC ONLY) ────────►│ → Supabase (skip)   │
  │                 │◄─────── probe results ◄─────┘ (not used)          │
  │                 │                              │                     │
  │                 ├─ runAiSearchPostHandler ────┘                     │
  │                 │    (skip TS NLU, use Python result)               │
  │                 │                                                    │
  │                 ├─ buildDiveShopQuery(filters) ◄─ AUTHORITATIVE     │
  │                 │ ◄────────────── [shop1, shop2, ...]───────────────┤
  │                 │                                                    │
  │                 ├─ enrichShopsForSearchCards()  ◄──────────────────►│
  │                 │                                                    │
  │◄─ UI-ready JSON─┤  (Python's dbSearch result discarded)             │
  │  (shops, reply, │                                                    │
  │   totalResults) │                                                    │
  │                 │                                                    │
```

**Note**: Python's optional `dbProbe` and `dbSearch` results are **diagnostic only**. TypeScript discards them and runs its own authoritative Supabase queries for shop data.

### Booking Flow (Happy Path)
```
Browser          Nuxt/Nitro                 Python-agents            Supabase
  │                 │                              │                     │
  ├─"I'll book Shop A"──►│ POST /guided-orchestrator                   │
  │                 │                              │                     │
  │                 ├─ Call orchestrator ────────►│                      │
  │                 │                              │                     │
  │                 │                    POST /agents/nlu                │
  │                 │                    POST /agents/booking            │
  │                 │◄── agentCall: booking, reply, collectedPayload     │
  │                 │                              │                     │
  │                 ├─ runAiSearchPostHandler ────┘                     │
  │                 │    (pre-computed NLU intent: start_booking)       │
  │                 │                                                    │
  │                 ├─ getShopById(shopId) ────────────────────────────►│
  │                 │◄──────── shop details ─────────────────────────────┤
  │                 │                                                    │
  │                 ├─ getDiveSitesForShop(shopId) ─────────────────────►│
  │                 │◄──────── dive sites ───────────────────────────────┤
  │                 │                                                    │
  │                 ├─ getCoursesForShop(shopId) ───────────────────────►│
  │                 │◄──────── courses ──────────────────────────────────┤
  │                 │                                                    │
  │◄─ UI-ready JSON─┤                                                    │
  │  (shopId, reply,│                                                    │
  │   courseOptions,│                                                    │
  │   diveSiteOptions)                                                   │
  │                 │                                                    │
```

## Architecture

```
Browser / Nuxt client
        │
        ▼
Nitro serverless functions  (TypeScript)  ◄─────── PRIMARY DATABASE LAYER
  ├─ server/api/guided-orchestrator.post.ts   ← unified entry point
  ├─ server/utils/runAiSearchPostHandler.ts   ← executes main Supabase queries
  │     │  calls for NLU extraction ──────────────────────┐
  │     │  injects pre-computed result                   │
  │     │                                                   ▼
  │     │                                    python-agents (this service)
  │     │                                      POST /agents/orchestrator
  │     │                                        ├─ POST /agents/nlu
  │     │                                        ├─ (optional) POST /agents/search
  │     │                                        ├─ (optional) POST /agents/booking
  │     │                                        └─ (optional, read-only) Supabase
  │     │
  │     ├─ buildDiveShopQuery()  ─────────────► Supabase  (MAIN QUERY)
  │     ├─ enrichShopsForSearchCards()  ─────► Supabase  (ENRICHMENT)
  │     ├─ getDiveSitesForShop()  ────────────► Supabase  (BOOKING CONTEXT)
  │     ├─ getCoursesForShop()  ────────────► Supabase  (BOOKING CONTEXT)
  │     ├─ getRentalEquipmentForShop()  ────► Supabase  (BOOKING CONTEXT)
  │     │  (Python's optional DB results are discarded; TS does its own queries)
  │     │
  │     └─ /api/booking.post.ts  ──────────────► Supabase + Resend email
```

**Key distinction**:
- **TS-executed queries** = authoritative shop data for UI rendering
- **Python-executed queries** (when `runDbProbe=true` or `runDbSearch=true`) = optional metadata for orchestration decisions only

## Endpoints

### 1. POST `/agents/nlu` — Intent Extraction

**Purpose**: Extract structured intent from a single user message about dive travel.

**Input** (`NluRequest`):
```json
{
  "message": "I want to dive cave diving in Mexico next month",
  "history": [
    { "role": "user", "content": "Hi, I'm planning a dive trip" },
    { "role": "assistant", "content": "Great! Where are you thinking of diving?" }
  ]
}
```

**Output** (`NluResponse`):
```json
{
  "ok": true,
  "data": {
    "goal": "search_shops",
    "destination_text": "Mexico",
    "shop_name_hint": null,
    "activity_terms": ["cave", "cave diving"],
    "certification_course_hint": null,
    "dive_site_type_label": "cavern",
    "trip_product_type": "dive_shop",
    "wants_booking": false,
    "booking_readiness": null,
    "primary_verb": "browse",
    "reasoning_summary": "User is looking for specific dive type (cave) in a destination (Mexico).",
    "confidence": 0.92
  }
}
```

| Field | Type | Possible Values | Usage |
|-------|------|-----------------|-------|
| `goal` | enum | `search_shops`, `start_booking`, `continue`, `shop_info`, `unclear` | Determines downstream routing (search vs booking) |
| `destination_text` | string\|null | e.g. "Bali", "Egypt", "Great Barrier Reef" | Input to destination→filters conversion |
| `shop_name_hint` | string\|null | e.g. "Coral Divers", "Blue Planet" | For shop name matching in probe |
| `activity_terms` | array\|null | e.g. ["wreck", "drift", "cave", "cenote"] | Maps to activity token search |
| `trip_product_type` | enum\|null | `liveaboard`, `dive_resort`, `dive_shop` | Filters shop type |
| `wants_booking` | boolean | true\|false | Signals booking intent |
| `primary_verb` | enum\|null | `browse`, `book`, `neutral` | Reinforces search vs booking signal |
| `confidence` | number | 0.0–1.0 | Trust score for this interpretation |

---

### 2. POST `/agents/search` — Search Filter Extraction

**Purpose**: Extract Supabase-ready filters from free-text user query (e.g. "show me highly rated drift diving shops in Bali").

**Input** (`SearchAgentRequest`):
```json
{
  "message": "Show me highly rated drift diving shops in Bali under $150/dive",
  "history": []
}
```

**Output** (`SearchAgentResponse`):
```json
{
  "ok": true,
  "filters": {
    "country": "Indonesia",
    "place": "Bali",
    "region": null,
    "minRating": 4.5,
    "languages": null,
    "diveTypes": ["dive_shop"],
    "activity_tokens": ["drift"]
  },
  "message": "I'll search for highly-rated drift diving operators in Bali."
}
```

| Filter | Type | Example | Used by |
|--------|------|---------|---------|
| `country` | string\|null | "Indonesia" | Country ID lookup → Supabase filter |
| `place` | string\|null | "Bali" | City/state ILIKE search |
| `region` | string\|null | "Carinthia" | Region ID lookup → Supabase filter |
| `minRating` | number\|null | 4.5 | google_rating >= filter |
| `languages` | array\|null | ["English", "French"] | Shop languages filter |
| `diveTypes` | array\|null | ["dive_shop", "liveaboard"] | Shop type filter |
| `activity_tokens` | array\|null | ["wreck", "cave", "drift"] | Activity token query |

**TS Integration**: Feed filters into `buildDiveShopQuery(supabaseUrl, supabaseKey, filters)` to execute the Supabase query.

---

### 3. POST `/agents/booking` — Booking Assistant (LLM Extraction Only)

**Purpose**: Multi-turn booking data collection via LLM dialogue. Returns conversational reply + updated payload.

⚠️ **CRITICAL**: This endpoint:
- ✅ Extracts structured booking data through LLM conversation
- ✅ Returns `collectedPayload` (partial) and `finalPayload` (complete)
- ❌ Does NOT write to Supabase
- ❌ Does NOT send emails
- ❌ Does NOT persist anything

When `bookingReady=true`, `finalPayload` is complete and ready for **TS** to POST to `/api/booking` for actual persistence.

**Input** (`BookingAgentRequest`):
```json
{
  "message": "I need an open water course for 2 divers next weekend",
  "history": [
    { "role": "user", "content": "I want to book a dive at Cool Divers" },
    { "role": "assistant", "content": "Great! Cool Divers offers several courses. How many people are diving?" }
  ],
  "shopName": "Cool Divers",
  "courseNames": ["Open Water Diver", "Advanced Open Water", "Rescue Diver"],
  "diveSiteNames": ["Blue Corner", "Padi House Reef", "German Channel"],
  "rentalEquipmentNames": ["BCD", "Regulator", "Wetsuit", "Tank"],
  "existingPayload": {
    "shop_id": "shop_123",
    "divers": [
      {
        "name": "John Doe",
        "certification_number": "PADI123456",
        "experience_level": "beginner"
      }
    ]
  },
  "nextStepHint": {
    "step": "course_selection",
    "diverIndex": 0
  }
}
```

**Output** (`BookingAgentResponse`):
```json
{
  "ok": true,
  "reply": "Perfect! I've noted Open Water Diver for John. What about the second diver? Do they need a course too, or are they certified?",
  "collectedPayload": {
    "shop_id": "shop_123",
    "divers": [
      {
        "name": "John Doe",
        "certification_number": "PADI123456",
        "course_name": "Open Water Diver",
        "experience_level": "beginner"
      },
      {
        "name": null,
        "certification_number": null,
        "course_name": null,
        "experience_level": null
      }
    ],
    "num_divers_total": 2
  },
  "bookingReady": false,
  "finalPayload": null,
  "error": null
}
```

When booking is complete after multi-turn dialogue:
```json
{
  "ok": true,
  "reply": "All set! I've booked 2 Open Water courses at Cool Divers for next Saturday at 9 AM. See you then!",
  "collectedPayload": { ... },
  "bookingReady": true,
  "finalPayload": {
    "shop_id": "shop_123",
    "shop_name": "Cool Divers",
    "divers": [
      {
        "name": "John Doe",
        "certification_number": "PADI123456",
        "course_name": "Open Water Diver",
        "height": "180cm",
        "weight": "75kg"
      },
      {
        "name": "Jane Smith",
        "certification_number": "PADI654321",
        "course_name": "Open Water Diver",
        "height": "165cm",
        "weight": "60kg"
      }
    ],
    "date": "2026-08-16",
    "time": "09:00",
    "dive_sites": ["Blue Corner"],
    "rental_equipment": ["BCD", "Regulator"],
    "special_requests": "Please arrange refresher for Jane"
  },
  "error": null
}
```

| Field | Type | Notes |
|-------|------|-------|
| `reply` | string | Conversational response to send to user |
| `collectedPayload` | object | Current booking state (partial or complete) |
| `bookingReady` | boolean | `true` when all required fields collected |
| `finalPayload` | object\|null | Complete booking data; used only when `bookingReady=true`; POST to `/api/booking` |
| `error` | string\|null | Error message if extraction failed |

---

### 4. POST `/agents/orchestrator` — Unified Orchestrator

**Purpose**: Runs fail-soft NLU + routing logic (search vs booking) + optional database probes, all in one call. This is the **primary TS entry point**.

**Input** (`OrchestratorRequest`):
```json
{
  "message": "Find me cave diving shops in Tulum",
  "history": [
    { "role": "user", "content": "Hi, I want to book a cave dive" },
    { "role": "assistant", "content": "Great! Where?" }
  ],
  "wantsBooking": false,
  "baseFilters": {
    "minRating": 4.0
  },
  "selectedShopId": null,
  "autoAgentRouting": true,
  "runDbProbe": true,
  "runDbSearch": true,
  "regexReferent": "Tulum",
  "preferShopOrRegexOverDestination": false
}
```

**Output** (`OrchestratorResponse`):
```json
{
  "ok": true,
  "nluOk": true,
  "nluError": null,
  "interpretTurn": {
    "goal": "search_shops",
    "destination_text": "Tulum",
    "shop_name_hint": null,
    "activity_terms": ["cave"],
    "certification_course_hint": null,
    "dive_site_type_label": null,
    "trip_product_type": "dive_shop",
    "wants_booking": false,
    "booking_readiness": null,
    "primary_verb": "browse",
    "reasoning_summary": "User looking for cave diving shops in a specific location.",
    "confidence": 0.89
  },
  "bookingReadiness": {
    "score": 5.5,
    "primaryVerb": "browse",
    "effectiveWantsToBook": false
  },
  "referentPhrase": "Tulum",
  "mergedFilters": {
    "place": "Tulum",
    "minRating": 4.0,
    "activity_tokens": ["cave"]
  },
  "activityLog": [
    "nlu_ok: goal=search_shops",
    "booking_readiness: score=5.5, primaryVerb=browse, wantsBook=false",
    "referent_phrase: Tulum",
    "agent_call: search (auto:search_intent)",
    "search_agent_ok: merged search + nlu filters",
    "db_probe_ok",
    "db_search_ok: count=3"
  ],
  "agentCall": "search",
  "search": {
    "ok": true,
    "filters": {
      "place": "Tulum",
      "minRating": 4.0,
      "activity_tokens": ["cave"]
    },
    "message": "Searching for cave diving shops in Tulum..."
  },
  "booking": null,
  "dbProbe": {
    "ok": true,
    "referent": "Tulum",
    "hits": {
      "shopHits": [
        { "id": "shop_1", "business_name": "Tulum Divers", "city": "Tulum", "google_rating": 4.8 },
        { "id": "shop_2", "business_name": "Cave Diving Specialists", "city": "Tulum", "google_rating": 4.6 }
      ],
      "placeShopHits": [],
      "countryHits": [],
      "regionHits": [],
      "diveSiteHits": [
        { "id": "site_1", "name": "Gran Cenote" },
        { "id": "site_2", "name": "Casa Cenote" }
      ]
    }
  },
  "dbSearch": {
    "ok": true,
    "filtersUsed": {
      "place": "Tulum",
      "minRating": 4.0,
      "activity_tokens": ["cave"]
    },
    "count": 3,
    "shops": [
      { "id": "shop_1", "business_name": "Tulum Divers", "city": "Tulum", "google_rating": 4.8, "type": "dive_shop" },
      { "id": "shop_2", "business_name": "Cave Diving Specialists", "city": "Tulum", "google_rating": 4.6, "type": "dive_shop" },
      { "id": "shop_3", "business_name": "Advanced Cenote Divers", "city": "Tulum", "google_rating": 4.4, "type": "dive_shop" }
    ]
  },
  "selectedShop": null
}
```

| Field | Type | Notes |
|-------|------|-------|
| `ok` | boolean | Overall success (false only on catastrophic failure) |
| `nluOk` | boolean | NLU step success |
| `nluError` | string\|null | NLU error message if nluOk=false |
| `interpretTurn` | object | Structured NLU output (always present, even if nluOk=false) |
| `bookingReadiness` | object | score (1–10), primaryVerb, effectiveWantsToBook |
| `referentPhrase` | string\|null | Canonical entity to probe (destination, shop name, dive site) |
| `mergedFilters` | object | NLU hints + activity terms merged into search filters |
| `activityLog` | array | Audit trail of orchestration steps |
| `agentCall` | enum | `"search"`, `"booking"`, or `"none"` — what to invoke next |
| `search` | object\|null | SearchAgentResponse if `agentCall="search"` and `runSearchAgent=true` |
| `booking` | object\|null | BookingAgentResponse if `agentCall="booking"` and `runBookingAgent=true` |
| `dbProbe` | object\|null | Referent phrase probe results (shops, places, sites) |
| `dbSearch` | object\|null | Merged-filters Supabase query results |
| `selectedShop` | object\|null | Full context for `selectedShopId` (shop + courses + sites + rental equipment) |

**TS Integration**: TypeScript reads `interpretTurn`, `mergedFilters`, and `agentCall`, then:
1. Injects `interpretTurn` into `runAiSearchPostHandler` as `preComputedInterpretTurn` (skips TS NLU LLM call)
2. Uses `mergedFilters` to feed `buildDiveShopQuery()` for Supabase shop search
3. Routes to search or booking branch based on `agentCall`
4. Returns final UI-ready response with shop cards or booking form

---

### 5. GET `/healthz` — Liveness Probe

**Purpose**: Health check for orchestration.

**Input**: None (query parameters optional for custom checks)

**Output**:
```json
{
  "status": "ok"
}
```

Use as Kubernetes/load-balancer health check endpoint.

---

## Happy Path Examples

### Example 1: Search Flow End-to-End

**User**: "Show me dive shops in Bali with high ratings"

1. **Browser** → `POST /api/guided-orchestrator` with `progressStream: true`
2. **TS**: Reads body, determines mode = `python`
3. **TS** → **Python** `POST /agents/orchestrator`:
   ```json
   {
     "message": "Show me dive shops in Bali with high ratings",
     "history": [],
     "autoAgentRouting": true,
     "runDbProbe": true,
     "runDbSearch": true
   }
   ```
4. **Python**:
   - NLU: goal = `search_shops`, destination = "Bali"
   - Routing: `agentCall=search` (browse intent)
   - Search agent: extracts filters (place: "Bali", minRating: 4.0)
   - DB probe: finds locations in Bali
   - DB search: runs filtered Supabase query → 12 shops
   - Returns `OrchestratorResponse` with `agentCall=search`, `dbSearch.shops`, `mergedFilters`

5. **TS** receives response, maps `interpretTurn` → `preComputedInterpretTurn`
6. **TS** calls `runAiSearchPostHandler()` with pre-computed NLU:
   - Skips NLU LLM (already ran in Python)
   - Runs `buildDiveShopQuery()` with merged filters
   - Enriches shops with course names, match badges, certification hints
   - Returns UI-ready JSON:
     ```json
     {
       "success": true,
       "intent": "search",
       "message": "Here are the top-rated dive shops in Bali.",
       "shops": [ { id, business_name, google_rating, city, ... }, ... ],
       "totalResults": 12,
       "hasMoreResults": false,
       "filters": { place: "Bali", minRating: 4.0 },
       "selectableOptions": [ ... ]
     }
     ```

7. **Browser** streams NDJSON progress lines, final result renders shop cards

---

### Example 2: Booking Flow End-to-End

**User**: "I want to book at Cool Divers" (after viewing search results)

1. **Browser** → `POST /api/guided-orchestrator` with intent = `booking`, selectedShopId = `cool_divers_1`
2. **TS** → **Python** `POST /agents/orchestrator`:
   ```json
   {
     "message": "I want to book at Cool Divers",
     "history": [ ... previous messages ... ],
     "wantsBooking": true,
     "selectedShopId": "cool_divers_1",
     "autoAgentRouting": true
   }
   ```
3. **Python**:
   - NLU: goal = `start_booking`, wants_booking = true
   - Routing: `agentCall=none` (orchestrator doesn't run booking agent; TS will)
   - Returns `OrchestratorResponse` with `interpretTurn.goal=start_booking`

4. **TS** receives, injects pre-computed NLU
5. **TS** calls `runAiSearchPostHandler()`:
   - Skips NLU (Python already ran it)
   - Detects intent = `booking`
   - Calls `getShopById()` → retrieves Cool Divers details
   - Calls `getCoursesForShop()` → ["Open Water", "Advanced", "Rescue"]
   - Calls `getDiveSitesForShop()` → ["Blue Corner", "Padi House Reef"]
   - Calls `getRentalEquipmentForShop()` → ["BCD", "Regulator", "Wetsuit"]
   - Returns booking-ready response:
     ```json
     {
       "success": true,
       "intent": "booking",
       "message": "Great! Let's book at Cool Divers. How many people are diving?",
       "shopId": "cool_divers_1",
       "shopName": "Cool Divers",
       "bookingPayload": { shop_id: "cool_divers_1", divers: [] },
       "selectableOptions": null,
       "courseOptions": ["Open Water", "Advanced", "Rescue"],
       "diveSiteOptions": ["Blue Corner", "Padi House Reef"],
       "rentalEquipmentOptions": ["BCD", "Regulator", "Wetsuit"]
     }
     ```

6. **Browser** displays booking form with pre-populated options
7. **User** enters name, email, selects course, etc.
8. For each form submission → **Browser** → `POST /api/guided-orchestrator` with `lastIntent=booking`, `bookingPayload` partial state
9. **TS** (Python mode):
   - Python orchestrator skipped (no new NLU needed, already in booking flow)
   - `runAiSearchPostHandler()` routes to booking continuation
   - Returns next step (e.g., "Which dive site?") + updated selectableOptions

10. After all fields collected → `bookingReady=true`
11. User confirms → **Browser** → `POST /api/booking` (direct to TS, Python not involved)
12. TS calls Resend to send confirmation email + inserts booking_submissions row in Supabase

---

## Request/Response Flow Diagram

```
HTTP Request Chain (Python Mode)

Browser
  │
  └─ POST /guided-orchestrator { message, history, lastIntent, bookingPayload, ... }
     │
     ├─ readBody()
     ├─ getOrchestratorMode() → "python"
     ├─ runPythonOrchestrator(event, body):
     │  │
     │  ├─ toPythonOrchestratorRequest(body)
     │  │
     │  └─ callOrchestratorAgent(req):
     │     │
     │     └─ fetch POST http://localhost:8001/agents/orchestrator {
     │        message, history, wantsBooking, baseFilters, selectedShopId,
     │        autoAgentRouting, runDbProbe, runDbSearch
     │     }
     │        │
     │        └─ Python Backend:
     │           ├─ run_nlu_agent()
     │           ├─ _decide_agent_call()
     │           ├─ (optionally) run_search_agent()
     │           ├─ (optionally) run_booking_agent()
     │           ├─ (OPTIONAL, diagnostic) probe_referent_phrase() → Supabase
     │           ├─ (OPTIONAL, diagnostic) search_shops() → Supabase
     │           └─ return OrchestratorResponse {
     │              ok, nluOk, interpretTurn, bookingReadiness,
     │              mergedFilters, activityLog, agentCall,
     │              search, booking, dbProbe, dbSearch
     │           }
     │
     │  ├─ mapPythonInterpretTurn(res.interpretTurn) → InterpretedTurn
     │  │
     │  └─ runAiSearchPostHandler(event, {
     │     body, preComputedInterpretTurn, onActivityLine
     │  }):
     │     │
     │     ├─ Skip NLU LLM (already have interpretTurn from Python)
     │     ├─ (IGNORE Python's dbProbe and dbSearch; they were diagnostic only)
     │     ├─ Merge filters based on interpretTurn
     │     ├─ buildDiveShopQuery() → Supabase  ◄─── AUTHORITATIVE QUERY
     │     ├─ enrichShopsForSearchCards() → Supabase
     │     ├─ Enrich shops with courses, badges, etc.
     │     ├─ formatEntitySearchResponse() or booking response
     │     └─ return UI-ready response {
     │        success, intent, message, shops, totalResults,
     │        bookingPayload, courseOptions, etc.
     │     }
     │
     └─ write({ type: "result", payload: {...} })
        └─ Browser receives NDJSON stream, renders UI

KEY PROPERTY: TS is the canonical database layer.
Even if Python's dbProbe/dbSearch are available, TS discards them
and runs its own authoritative Supabase queries.
```

---

## ABSOLUTE RULE: Python Never Writes to Supabase

**This is the core architectural boundary. No exceptions.**

### What Python NEVER Does
- ❌ Does NOT insert bookings into `booking_submissions` table
- ❌ Does NOT update shop data
- ❌ Does NOT send emails
- ❌ Does NOT create user records
- ❌ Does NOT persist any application state

### What Python CAN Do
- ✅ Extract NLU intent from messages (read-only LLM)
- ✅ Extract search filters (read-only LLM)
- ✅ Collect booking data via dialogue (read-only LLM, returns payload only)
- ✅ Make optional diagnostic reads to Supabase (dbProbe, dbSearch — if enabled and Supabase credentials present)
- ✅ Return structured data to TypeScript for TS to write

### What TypeScript ALWAYS Does
- ✅ Receives Python's LLM-extracted data
- ✅ Runs authoritative Supabase queries (ignoring Python's optional diagnostics)
- ✅ Formats data for UI presentation
- ✅ Persists all writes:
  - Booking creation → `booking_submissions`
  - Booking confirmation → email via Resend
  - Audit logs → Supabase
  - Any other data mutations

### Workflow Example: Booking End-to-End

```
1. User: "I want to book"
   Browser → POST /api/guided-orchestrator

2. TS: Calls Python orchestrator
   Python: Runs NLU → returns goal="start_booking"
   TS: Injects into runAiSearchPostHandler

3. For each booking form interaction:
   Browser → POST /api/guided-orchestrator
   TS: Calls Python booking agent
   Python: Extracts field data via LLM → returns collectedPayload
   TS: Returns progress to browser

4. User confirms booking:
   Browser → POST /api/booking (DIRECT TO TS, NOT PYTHON)
   
5. TS ONLY:
   - Validates finalPayload
   - INSERT into booking_submissions → Supabase ✅
   - POST to Resend → email ✅
   - Return success

6. Result: Booking written to Supabase ✅
   Python never touched the database.
```

---

## Clarification: Python's Optional DB Reads Are Diagnostic Only

### The Question
> "Why does Python make ANY Supabase calls if TS is supposed to own all DB operations?"

### The Answer
Python makes **optional, diagnostic READ-ONLY calls only** to provide context for LLM prompts and routing decisions. These calls:
- 🔒 Are read-only (never write)
- 📊 Return metadata for diagnostics (e.g., "there are 12 cave shops in Bali")
- 🗑️ Are discarded by TS (TS runs its own authoritative queries)
- 🚫 Are NOT authoritative (TS never trusts Python DB results)
- ⚙️ Are optional (can be disabled via `runDbProbe=false`, `runDbSearch=false`)

### What Happens in Practice

Python (optional diagnostics):
```python
# Python can optionally probe Supabase (when runDbProbe=true)
hits = await probe_referent_phrase("Bali")
# Returns: {"shopHits": [...], "countryHits": [...], "diveSiteHits": [...]}
# Purpose: Inform the LLM about what entities exist
# Authority: ZERO (TS discards this)
```

TypeScript (authoritative):
```typescript
// TS ALWAYS runs its own query, ignoring Python's results
const shops = await buildDiveShopQuery(supabaseUrl, supabaseKey, filters)
// These are the REAL results shown to user
// Authority: ABSOLUTE
```

### Critical Distinction

| Layer | Python DB Calls | TypeScript DB Calls |
|-------|-----------------|-------------------|
| **Type** | Read-only diagnostics | Authoritative reads + ALL writes |
| **Authority** | Zero (discarded) | Absolute (always trusted) |
| **Purpose** | LLM context | User data, persistence |
| **Used by** | Python LLM (for better prompts) | App logic (for UI, reports) |
| **Writes** | Never ❌ | Always ✅ |
| **Caches** | Ignored ❌ | Served to user ✅ |

### When to Disable Python's Optional Reads

If you want Python to make NO Supabase calls at all:

1. **In .env**:
   ```bash
   # Don't set SUPABASE_URL or SUPABASE_*_KEY
   # Python will skip DB probes gracefully
   ```

2. **In request**:
   ```json
   {
     "runDbProbe": false,
     "runDbSearch": false
   }
   ```

Result: Python returns `dbProbe: {ok: false, error: "supabase_not_configured"}` and TS works perfectly (it was going to ignore those results anyway).

### The Rule
> **Python: LLM extraction + optional diagnostic reads only.**  
> **TypeScript: ALL database writes, ALL authoritative reads, ALL persistence.**

No exceptions. Python can never write to Supabase under any circumstances.

---

`POST /agents/orchestrator` returns `agentCall` as exactly one of:
- `booking`
- `search`
- `none`

Decision precedence (top to bottom):

| Priority | Condition | `agentCall` | Notes |
|---|---|---|---|
| 1 | `runBookingAgent=true` and `bookingRequest` provided | `booking` | Manual override. Booking wins over all other signals. |
| 2 | `runBookingAgent=true` but missing `bookingRequest` | `none` | Guard rail; orchestrator logs skip reason. |
| 3 | `runSearchAgent=true` | `search` | Manual override when booking override is not active. |
| 4 | `autoAgentRouting=false` | `none` | Disable automatic downstream LLM calls. |
| 5 | Auto mode AND booking intent (`goal == start_booking` OR `effectiveWantsToBook`) AND `bookingRequest` provided | `booking` | Mirrors TS booking-branch precedence. |
| 6 | Auto mode AND search intent (`goal == search_shops` OR `primaryVerb == browse`) | `search` | Default browse/search path. |
| 7 | Anything else | `none` | No downstream search/booking call this turn. |

Examples:

| Input highlights | Result |
|---|---|
| `runBookingAgent=true`, valid `bookingRequest` | `agentCall=booking` |
| `runSearchAgent=true`, `runBookingAgent=false` | `agentCall=search` |
| Auto mode, NLU says `start_booking`, `bookingRequest` present | `agentCall=booking` |
| Auto mode, NLU says `search_shops` | `agentCall=search` |
| Auto mode off, no manual flags | `agentCall=none` |

### Orchestrator Supabase Integration (Optional, Read-Only)

`POST /agents/orchestrator` **can optionally** make read-only Supabase calls to provide context for orchestration routing decisions. These are **informational only** and do **not** drive the main search/booking results — TypeScript always executes its own queries.

**Toggles** (all optional, default `true`):
- `runDbProbe` — probe referent phrase (destination, shop name, dive site) for early matching diagnostics
- `runDbSearch` — run merged-filters Supabase query for cardinality estimation (e.g., "will this destination have any shops?")
- `selectedShopId` — fetch full context for a chosen shop (courses, dive sites, rental equipment)

**Response fields** when enabled:
- `dbProbe`: Shop/place/site name matches (informational; Python's optional enrichment)
- `dbSearch`: Merged-filter shop count + results (informational; TS will run its own authoritative query)
- `selectedShop`: Full shop context (informational; TS will fetch fresh data anyway)

**If Supabase env vars are missing** on Python side:
- `dbProbe: { ok: false, error: "supabase_not_configured" }`
- `dbSearch: { ok: false, error: "supabase_not_configured" }`
- Orchestrator continues normally; TS layer is unaffected

**TS layer behavior**:
- Receives Python's optional DB results but **ignores them**
- Always executes authoritative queries: `buildDiveShopQuery()`, `getDiveSitesForShop()`, etc.
- This ensures **TS remains the canonical database layer** even if Python is enabled

Interactive docs at **http://localhost:8001/docs** when running locally.

Local playground page at **http://localhost:8001/dev** for quickly calling
`/agents/nlu`, `/agents/search`, `/agents/booking`, and `/agents/orchestrator` without Nuxt.

## Agents

| File | Mirrors TypeScript | Role |
|------|--------------------|------|
| `agents/nlu_agent.py` | `server/utils/interpretUserTurn.ts` | Extracts structured intent from a user message |
| `agents/search_agent.py` | `SEARCH_DIVE_SYSTEM_PROMPT` call in `runAiSearchPostHandler.ts` | Extracts Supabase-ready search filters |
| `agents/booking_agent.py` | `buildBookingSystemPrompt` call in `runAiSearchPostHandler.ts` | Multi-turn booking data collection |
| `agents/orchestrator_agent.py` | Key control-flow blocks in `server/utils/runAiSearchPostHandler.ts` | Runs fail-soft orchestration and optional chained agent calls |

## Setup

```bash
cd python-agents

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and choose provider credentials:
# - OpenAI: OPENAI_API_KEY
# - Gemini: LLM_PROVIDER=gemini + GOOGLE_API_KEY
# Optional tracing path: USE_LANGCHAIN=true + LANGSMITH_* vars
```

## Running

```bash
# Development (auto-reload)
uvicorn main:app --reload --port 8001

# Or directly
python main.py
```

## TypeScript integration

The TypeScript layer calls this service via `server/utils/pythonAgentsClient.ts`:

```typescript
import { callNluAgent, callSearchAgent, callBookingAgent } from './pythonAgentsClient'

// NLU
const nlu = await callNluAgent({ message, history })
if (nlu.ok) { /* use nlu.data.goal, nlu.data.destination_text … */ }

// Search filters → feed into buildDiveShopQuery()
const search = await callSearchAgent({ message, history })
if (search.ok) { const shops = await buildDiveShopQuery(url, key, search.filters) }

// Booking assistant
const booking = await callBookingAgent({ message, history, shopName, … })
if (booking.bookingReady) { /* POST booking.finalPayload to /api/booking */ }
```

Set `NUXT_PYTHON_AGENTS_URL` (or `PYTHON_AGENTS_URL`) to point at your deployed instance.  
Defaults to `http://localhost:8001` for local development.

## Environment variables

| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | `openai` (default) or `gemini` (also accepts `google`) |
| `LLM_CHAT_MODEL` | Optional single override for chat model regardless of provider (recommended) |
| `OPENAI_API_KEY` | OpenAI API key (also accepts `NUXT_OPENAI_API_KEY`) |
| `OPENAI_CHAT_MODEL` | Model name (default: `gpt-5.5`) |
| `GOOGLE_API_KEY` | Google AI Studio key when `LLM_PROVIDER=gemini` (also accepts `GEMINI_API_KEY`) |
| `GEMINI_CHAT_MODEL` | Gemini model name (default: `gemini-2.0-flash`) |
| `USE_LANGCHAIN` | `true` to route calls via LangChain (`false` keeps direct OpenAI SDK path) |
| `LANGSMITH_TRACING` | `true` to enable LangSmith tracing |
| `LANGSMITH_API_KEY` | LangSmith API key |
| `LANGSMITH_PROJECT` | Project name for traces (example: `deepdive`) |
| `LANGSMITH_ENDPOINT` | LangSmith endpoint (default: `https://api.smith.langchain.com`) |
| `SUPABASE_URL` | Supabase project URL (required for orchestrator DB probe/search) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side Supabase reads (preferred) |
| `SUPABASE_ANON_KEY` | Fallback key used when service role key is not set |
| `PORT` | Port for the dev server (default: `8001`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (default: `http://localhost:3000,http://localhost:8888`) |

## LangChain + LangSmith tracing

When `USE_LANGCHAIN=true`, each agent call is executed through LangChain and
sent to LangSmith (when `LANGSMITH_TRACING=true` and key/project are set).

Example local `.env` values:

```dotenv
LLM_PROVIDER=gemini
GOOGLE_API_KEY=...
GEMINI_CHAT_MODEL=gemini-2.0-flash

USE_LANGCHAIN=true
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=...
LANGSMITH_PROJECT=deepdive
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

## Testing

```bash
# Run the demo client (service must be running)
python client_demo.py

# Trigger one NLU request (useful for validating LangSmith traces)
python tracing_smoke.py

# Trigger one orchestrator pass (fail-soft routing + filter merges)
python orchestrator_smoke.py

# Run deterministic alpha->beta parity evals (no API keys needed)
python evals/alpha_parity_eval.py
```

