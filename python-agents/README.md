# python-agents

Python microservice that owns all **OpenAI / LLM calls** for the Glaucus Dive platform.  
The Nuxt/Nitro TypeScript layer still owns every **Supabase query** (shop search, booking storage, etc.) and calls this service only for the AI steps.

For local development, this service can optionally run model calls through
**LangChain** and emit traces to **LangSmith**.

## Architecture

```
Browser / Nuxt client
        │
        ▼
Nitro serverless functions  (TypeScript)
  ├─ server/api/guided-orchestrator.post.ts   ← main entry point
  ├─ server/utils/runAiSearchPostHandler.ts   ← orchestration logic
  │     │  calls ──────────────────────────────────────────┐
  │     │                                                   ▼
  │     │                                    python-agents (this service)
  │     │                                      POST /agents/nlu
  │     │                                      POST /agents/search
  │     │                                      POST /agents/booking
  │     │
  │     └─ buildDiveShopQuery()  ─────────────► Supabase (stays in TS)
  │     └─ getDiveSitesForShop()  ────────────► Supabase
  │     └─ getRentalEquipmentForShop()  ──────► Supabase
  │     └─ /api/booking.post.ts  ─────────────► Supabase + Resend email
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/agents/nlu` | NLU intent extraction — returns `InterpretedTurn` (goal, destination, activity terms, booking readiness …) |
| `POST` | `/agents/search` | Search filter extraction — returns `SearchFilters` + a short user message |
| `POST` | `/agents/booking` | Booking assistant turn — returns reply + `collectedPayload`; emits `finalPayload` when `bookingReady=true` |
| `POST` | `/agents/orchestrator` | TS-like orchestrator pass — fail-soft NLU + booking readiness + referent phrase + filter merges (+ optional chained agent calls) |
| `GET` | `/healthz` | Liveness probe |

### Orchestrator Routing Truth Table

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

### Orchestrator Supabase Integration

`POST /agents/orchestrator` can now run read-only Supabase calls (similar to TS runtime flow):
- referent probe (`dbProbe`) using country/region/dive-site/shop name matching
- shop search (`dbSearch`) using merged filters
- selected shop context (`selectedShop`) for shop + courses + dive sites + rental equipment

Request toggles:
- `runDbProbe` (default `true`)
- `runDbSearch` (default `true`)
- `selectedShopId` (optional)

If Supabase env vars are missing, orchestrator continues and returns:
- `dbProbe: { ok: false, error: "supabase_not_configured" }`
- `dbSearch: { ok: false, error: "supabase_not_configured" }`

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
```

