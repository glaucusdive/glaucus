# python-agents

Python microservice that owns all **OpenAI / LLM calls** for the Glaucus Dive platform.  
The Nuxt/Nitro TypeScript layer still owns every **Supabase query** (shop search, booking storage, etc.) and calls this service only for the AI steps.

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
| `GET` | `/healthz` | Liveness probe |

Interactive docs at **http://localhost:8001/docs** when running locally.

## Agents

| File | Mirrors TypeScript | Role |
|------|--------------------|------|
| `agents/nlu_agent.py` | `server/utils/interpretUserTurn.ts` | Extracts structured intent from a user message |
| `agents/search_agent.py` | `SEARCH_DIVE_SYSTEM_PROMPT` call in `runAiSearchPostHandler.ts` | Extracts Supabase-ready search filters |
| `agents/booking_agent.py` | `buildBookingSystemPrompt` call in `runAiSearchPostHandler.ts` | Multi-turn booking data collection |

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
# Edit .env and set OPENAI_API_KEY
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
| `OPENAI_API_KEY` | OpenAI API key (also accepts `NUXT_OPENAI_API_KEY`) |
| `OPENAI_CHAT_MODEL` | Model name (default: `gpt-5.5`) |
| `PORT` | Port for the dev server (default: `8001`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (default: `http://localhost:3000,http://localhost:8888`) |

## Testing

```bash
# Run the demo client (service must be running)
python client_demo.py
```

