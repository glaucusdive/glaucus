# GitHub Copilot Instructions

> For Glaucus Dive platform — Python-agents microservice architecture
>
> **Focus**: python-agents (LLM/AI layer) within larger TypeScript/Supabase system

## Quick Summary

This is a **Nuxt (Vue 3 + TypeScript) + Python microservice** architecture:

- **Python-agents** (`python-agents/`): Microservice that handles **ALL LLM calls** (NLU, search filters, booking dialogue). Stateless, no database writes.
- **TypeScript/Nitro** (`server/api`, `server/utils`): Owns **ALL Supabase reads/writes**. Orchestrates Python calls and formats responses for UI.
- **Supabase**: Central database. Only TS layer writes to it.

**Key principle**: Python ≠ Database. TypeScript ≠ LLM.

## Version Terminology

- **Alpha**: Pre-Python architecture. Agentic functionality lives in TypeScript only (before `python-agents/` was introduced).
- **Beta**: Current migration architecture. Agentic functionality is being moved from TypeScript into `python-agents/`.
- When discussing **alpha** behavior, treat it as historical TS-only logic and do not assume Python agents existed.

### Copilot Language Rule (Important)

- In docs, PRs, comments, and code-review notes, refer to:
  - **"alpha"** for pre-Python / TS-only behavior.
  - **"beta"** for Python-agent migration behavior.
- Avoid ambiguous wording like "old flow" or "new flow" when historical clarity matters; prefer alpha/beta labels.

---

## Architecture at a Glance

```
Browser (Vue 3)
     ↓
Nitro serverless functions (TypeScript)  ← PRIMARY CONTROL & DATABASE LAYER
     ├─ /api/guided-orchestrator
     ├─ /api/booking
     └─ /server/utils/pythonAgentsClient.ts
          ↓
     python-agents microservice (Python)  ← LLM EXTRACTION ONLY
          ├─ /agents/nlu
          ├─ /agents/search
          ├─ /agents/booking
          └─ /agents/orchestrator
               ↓ (OPTIONAL READ-ONLY DIAGNOSTICS)
          Supabase (via Python)  [DISCARDED BY TS]
```

### The Division of Labor

| Layer | Owns | Calls | Returns | Writes DB |
|-------|------|-------|---------|-----------|
| **Python** | LLM calls | NLU, search, booking agents | Structured intent/filters/payload | ❌ Never |
| **TypeScript** | DB operations | Python agents (optional), SQL queries via Supabase SDK | UI-ready response | ✅ Always |

---

## Python-Agents Structure

### Location
```
python-agents/
├── main.py                      # FastAPI app, endpoint routing
├── requirements.txt             # fastapi, openai, langchain, pydantic
├── .env.example                 # LLM & Supabase config
├── agents/
│   ├── nlu_agent.py            # Extract user intent (goal, destination, activity_terms)
│   ├── search_agent.py         # Extract search filters → Supabase query ready
│   ├── booking_agent.py        # Multi-turn booking data collection
│   └── orchestrator_agent.py   # Orchestrate NLU + routing + optional chained calls
├── models/
│   ├── nlu_models.py           # NluRequest, NluResponse (with InterpretedTurn)
│   ├── search_models.py        # SearchAgentRequest, SearchAgentResponse (filters)
│   ├── booking_models.py       # BookingAgentRequest, BookingAgentResponse (payload)
│   └── orchestrator_models.py  # OrchestratorRequest, OrchestratorResponse
├── prompts/                     # System prompts for LLM calls (e.g., nlu_prompt.txt)
├── utils/                       # Helper functions (LLM client, response parsing)
└── docs/                        # Internal documentation
```

### The Four Agents

#### 1. NLU Agent (`agents/nlu_agent.py`)
**Purpose**: Extract structured intent from user message.

**Input**: User message + chat history  
**Output**: `InterpretedTurn` with:
- `goal`: `search_shops`, `start_booking`, `continue`, `shop_info`, `unclear`
- `destination_text`: Destination name (e.g., "Bali")
- `activity_terms`: Activities user mentioned (e.g., ["cave", "wreck"])
- `shop_name_hint`: Shop name if user mentioned it
- `trip_product_type`: `dive_shop`, `liveaboard`, `dive_resort` (optional)
- `wants_booking`: Boolean (does user want to book?)
- `primary_verb`: `browse`, `book`, or `neutral`
- `confidence`: 0.0–1.0

**Mirrors TypeScript**: Replaces `server/utils/interpretUserTurn.ts` LLM call

#### 2. Search Agent (`agents/search_agent.py`)
**Purpose**: Extract Supabase-ready search filters from free-text query.

**Input**: User message (e.g., "Show me highly-rated drift shops in Bali")  
**Output**: `SearchFilters` with:
- `place`: City/location text
- `country`: Country name
- `minRating`: Numeric rating threshold (e.g., 4.5)
- `activity_tokens`: Activity types (e.g., `["drift", "wreck"]`)
- `languages`: Spoken languages
- `diveTypes`: Shop types (e.g., `["dive_shop"]`)

**Used by TypeScript**: `buildDiveShopQuery(supabaseUrl, supabaseKey, filters)` — filters feed directly into SQL WHERE clauses.

#### 3. Booking Agent (`agents/booking_agent.py`)
**Purpose**: Multi-turn booking assistant — extract booking fields via LLM dialogue.

**Input**: User message + booking context (shop name, course options, dive sites, rental equipment) + existing payload  
**Output**: `BookingAgentResponse` with:
- `reply`: Conversational response to user
- `collectedPayload`: Updated partial booking data (incremental)
- `bookingReady`: Boolean (is form complete?)
- `finalPayload`: Complete booking (only when `bookingReady=true`)

**Critical**: Does NOT write to Supabase or send emails. TS does that via `/api/booking.post.ts`.

#### 4. Orchestrator Agent (`agents/orchestrator_agent.py`)
**Purpose**: Fail-soft orchestration — run NLU + routing + optional chained agent calls + booking readiness scoring.

**Input**: User message + routing hints (intent, shop selection, filter preferences)  
**Output**: Full orchestration context:
- `interpretTurn`: NLU result
- `bookingReadiness`: Scoring (1–10) and primary verb
- `mergedFilters`: NLU hints + activity terms + base filters combined
- `agentCall`: Which agent to invoke next (`search`, `booking`, or `none`)
- Optional: `search`, `booking`, `dbProbe`, `dbSearch` results (if enabled)
- `activityLog`: Audit trail of orchestration steps

**Mirrors TypeScript orchestration logic** in `server/utils/runAiSearchPostHandler.ts`.

---

## Key Integration Points (TS ↔ Python)

### 1. TypeScript Calls Python via `pythonAgentsClient.ts`

```typescript
// server/utils/pythonAgentsClient.ts
import { callOrchestratorAgent } from './pythonAgentsClient'

const pythonResponse = await callOrchestratorAgent({
  message,
  history,
  wantsBooking,
  baseFilters,
  selectedShopId,
  autoAgentRouting: true,
  runDbProbe: true,
  runDbSearch: true
})

if (pythonResponse.ok) {
  const { interpretTurn, mergedFilters, agentCall } = pythonResponse
  // TS now has NLU result; inject as preComputedInterpretTurn
  // into runAiSearchPostHandler() to skip TS NLU LLM call
}
```

### 2. TypeScript Injects Python Results into Search Handler

```typescript
// TS skips its own NLU call when Python result is available
const preComputedInterpretTurn = mapPythonInterpretTurn(pythonResponse.interpretTurn)

const response = await runAiSearchPostHandler(event, {
  body,
  preComputedInterpretTurn,  // ← Use Python's NLU result
  onActivityLine
})
```

### 3. TS Runs Authoritative Supabase Queries

```typescript
// Even if Python returned dbProbe/dbSearch results, TS IGNORES them
// and runs its own queries:

const shops = await buildDiveShopQuery(supabaseUrl, supabaseKey, mergedFilters)
// This is the source of truth for UI rendering ✓

// Python's dbProbe/dbSearch are for LLM context only; discarded here
```

### 4. Python Makes OPTIONAL Diagnostic Reads Only

```python
# python-agents/agents/orchestrator_agent.py

# Only if runDbProbe=true and Supabase credentials are set:
db_probe = await probe_referent_phrase(referent)  # ← Read-only

# Only if runDbSearch=true:
db_search = await search_shops_by_filters(filters)  # ← Read-only

# Return these to TS, but TS will ignore them and run its own query
return OrchestratorResponse(
    dbProbe=db_probe,           # Informational only
    dbSearch=db_search,         # Informational only
    # ... other fields
)
```

---

## When to Migrate Functionality from TS to Python

This section describes **beta migration work** (moving capabilities from alpha TS-only logic into Python agents while TS stays the DB authority).

### Good Candidates for Migration to Python

1. **LLM-based extraction** (NLU, filter parsing, booking dialogue)
   - Example: Move TS NLU `interpretUserTurn.ts` → Python `nlu_agent.py` ✓
   - Benefit: Centralize LLM calls, reduce TS complexity, re-use same prompts

2. **Complex prompt-engineering logic**
   - Example: Booking form state machine → Python's system prompt context
   - Benefit: Python is better for prompt versioning and A/B testing

3. **LLM-driven routing and scoring**
   - Example: Booking readiness scoring → Python orchestrator ✓
   - Benefit: Keep complex decision logic in one place

### NOT Good for Migration to Python

1. **Database reads or writes**
   - Stay in TS: `buildDiveShopQuery()`, `getShopById()`, booking insertion
   - Reason: TS owns DB layer; Python must remain stateless

2. **Business logic that depends on DB state**
   - Example: Checking inventory, calculating pricing based on DB values
   - Stay in TS: Fetch from DB first, then call Python if needed

3. **Email sending or notification delivery**
   - Stay in TS: `Resend` email client runs in `server/api/booking.post.ts`
   - Reason: Python never touches external integrations except LLM provider

4. **Session or user context management**
   - Stay in TS: User auth, session validation via Nuxt auth plugins
   - Reason: Python is stateless and doesn't know about user context

### Migration Pattern

When migrating functionality from TS to Python (alpha -> beta):

1. **Identify the LLM call** (e.g., OpenAI API call in TS)
2. **Extract the system prompt** and move to `python-agents/prompts/`
3. **Create a new agent** or extend existing one (pydantic model + agent function)
4. **Test in Python** via `/dev` playground or `client_demo.py`
5. **Update TS to call Python endpoint** via `pythonAgentsClient.ts`
6. **Keep all DB operations in TS** — do not move Supabase calls to Python
7. **Update copilot instructions** with new agent details

**Example: Migrating InterpretUserTurn (TS) → NLU Agent (Python)**

**Before (TS)**:
```typescript
// server/utils/interpretUserTurn.ts
import { callOpenAI } from '...'

export async function interpretUserTurn(message, history) {
  const response = await callOpenAI({
    messages: [{ role: 'system', content: NLU_SYSTEM_PROMPT }, ...history],
    model: 'gpt-4'
  })
  return parseNluResponse(response.content)
}
```

**After (Python)**:
```python
# python-agents/agents/nlu_agent.py
async def run_nlu_agent(body: NluRequest) -> NluResponse:
    messages = [
        {"role": "system", "content": NLU_SYSTEM_PROMPT},
        *body.history,
        {"role": "user", "content": body.message}
    ]
    response = await llm_client.chat.completions.create(
        model=settings.llm_chat_model,
        messages=messages,
        temperature=0.7
    )
    interpreted = parse_nlu_response(response.choices[0].message.content)
    return NluResponse(ok=True, data=interpreted)
```

**TS now calls Python**:
```typescript
// server/utils/pythonAgentsClient.ts
const nlu = await callNluAgent({ message, history })
```

---

## Database & Persistence Rules

### ABSOLUTE: Python Never Writes to Supabase

| Operation | Python | TypeScript |
|-----------|--------|-----------|
| INSERT booking | ❌ | ✅ |
| UPDATE shop | ❌ | ✅ |
| INSERT audit log | ❌ | ✅ |
| Send email | ❌ | ✅ |
| Read shop data (diagnostic) | 🔍 Optional | ✅ Authoritative |
| Read user profile (diagnostic) | 🔍 Optional | ✅ Only |

### Workflow: Booking Submission

```
1. User fills booking form in browser
2. Browser → POST /api/guided-orchestrator
3. TS calls Python booking agent (multi-turn)
   Python: Extracts fields via LLM → returns collectedPayload
4. After user confirms booking:
   Browser → POST /api/booking (DIRECT TO TS, NOT PYTHON)
5. TS layer ONLY:
   - Validate payload
   - INSERT into booking_submissions table
   - POST to Resend (send email)
   - Return confirmation
6. Result: Booking in DB ✓, Python never touched DB
```

### Alpha vs Beta Booking Workflow (Important)

Use this section when historical behavior matters.

#### Alpha (pre-Python / TS-only)

In alpha, booking dialogue extraction runs fully in TypeScript inside `server/utils/runAiSearchPostHandler.ts`:

1. Build booking prompt in TS (`buildBookingSystemPrompt`)
2. Call LLM from TS
3. Parse `COLLECTED` / `BOOKING_READY` blocks in TS
4. Merge payload + continue booking state machine in TS
5. On final confirmation, persist via `POST /api/booking` (TS writes DB)

Alpha still follows the same persistence boundary: only TS writes to Supabase.

#### Beta (Python-agent migration)

In beta, booking dialogue extraction is being moved to `python-agents/agents/booking_agent.py`:

1. TS sends booking turn + context to Python booking agent
2. Python handles prompting, LLM call, and extraction
3. Python returns `reply`, `collectedPayload`, `bookingReady`, optional `finalPayload`
4. TS continues to own UI shaping, flow gating, and all authoritative Supabase reads/writes
5. Final booking submission still persists through `POST /api/booking` (TS only)

Beta goal: reduce LLM-specific complexity in `runAiSearchPostHandler.ts` while preserving TS database authority.

### Alpha -> Beta Booking Migration Checklist

Use this checklist when migrating booking dialogue logic from alpha (TS-only) to beta (Python-agent).

- [ ] Identify alpha booking LLM blocks in `server/utils/runAiSearchPostHandler.ts` (prompt build, LLM call, parse logic)
- [ ] Move/align booking prompt logic into `python-agents/prompts/booking_prompt.py`
- [ ] Ensure booking models in `python-agents/models/booking_models.py` cover all currently collected fields
- [ ] Route booking turns through `python-agents/agents/booking_agent.py` via `server/utils/pythonAgentsClient.ts`
- [ ] Keep TS as authority for UI flow gating, selectable options, and response shaping
- [ ] Preserve fail-soft behavior (Python errors should not crash the entire guided flow)
- [ ] Keep all authoritative Supabase reads/writes in TS (`buildDiveShopQuery`, `getShopById`, `/api/booking`)
- [ ] Verify final submission path remains `POST /api/booking` (TS-only persistence)
- [ ] Add/adjust tests for migrated behavior (alpha parity + beta path)
- [ ] Document migration notes using explicit alpha/beta terminology

### Minimizing Database Table Updates

Since Python cannot write, new features should:

1. **Use existing tables** when possible
   - Example: Don't create `booking_assistant_state` table; return state from Python directly in response

2. **Store Python output in transient response payloads** (not DB)
   - Example: Booking `collectedPayload` lives in browser state/response, not persisted until TS writes to `booking_submissions`

3. **Only add DB tables when TS needs to persist new entities**
   - Example: If adding "booking preferences" feature, create table in TS migration, populate via TS endpoint only

4. **Use TS to cache/denormalize Python results** if needed for performance
   - Example: Cache search filter suggestions → TS-owned cache table, populated via periodic job

---

## Coding Patterns in Python-Agents

### 1. Pydantic Models (Input/Output Contracts)

```python
# python-agents/models/nlu_models.py
from pydantic import BaseModel, Field

class NluRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = Field(default_factory=list)

class InterpretedTurn(BaseModel):
    goal: str
    destination_text: str | None = None
    activity_terms: list[str] = Field(default_factory=list)
    confidence: float

class NluResponse(BaseModel):
    ok: bool
    data: InterpretedTurn | None = None
    error: str | None = None
```

**Always use Pydantic** for:
- All request/response types
- Default values for optional fields
- Type validation (automatic via FastAPI)

### 2. Async Handlers

```python
# python-agents/agents/nlu_agent.py
from fastapi import FastAPI
import logging

logger = logging.getLogger(__name__)

async def run_nlu_agent(body: NluRequest) -> NluResponse:
    try:
        logger.info(f"NLU request: {body.message[:50]}...")
        
        # Call LLM
        response = await get_llm_client().chat.completions.create(...)
        
        # Parse response
        interpreted = parse_response(response.choices[0].message.content)
        
        return NluResponse(ok=True, data=interpreted)
    except Exception as e:
        logger.error(f"NLU failed: {e}")
        return NluResponse(ok=False, error=str(e))
```

**Patterns**:
- Always `async` (FastAPI expects it)
- Use try/except and return error in response (fail-soft)
- Log at INFO level for success, ERROR for exceptions
- Return detailed error messages

### 3. LLM Client Abstraction

```python
# python-agents/utils/llm_client.py (example)
async def get_llm_client():
    """Get LLM client based on LLM_PROVIDER setting."""
    provider = os.getenv("LLM_PROVIDER", "openai")
    if provider == "gemini":
        return GoogleGenerativeAI(api_key=os.getenv("GOOGLE_API_KEY"))
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Usage in agent
async def run_search_agent(body: SearchAgentRequest) -> SearchAgentResponse:
    client = await get_llm_client()
    response = await client.chat.completions.create(...)
    # ...
```

**Supports**: OpenAI, Gemini, with optional LangChain tracing

### 4. System Prompts

```python
# python-agents/prompts/nlu_system_prompt.py
NLU_SYSTEM_PROMPT = """
You are an expert NLU system for a dive travel booking platform.
Extract structured intent from the user's message.

Return a JSON object with fields:
- goal: one of [search_shops, start_booking, continue, shop_info, unclear]
- destination_text: optional string
- activity_terms: list of activities
- confidence: 0.0-1.0

Examples:
...
"""

# Usage
response = await llm_client.chat.completions.create(
    messages=[
        {"role": "system", "content": NLU_SYSTEM_PROMPT},
        *body.history,
        {"role": "user", "content": body.message}
    ],
    model="gpt-4"
)
```

**Store all prompts in `prompts/` folder** for easy versioning and testing.

### 5. Optional Supabase Reads (Diagnostic Only)

```python
# python-agents/utils/supabase_client.py (example)
async def probe_referent_phrase(referent: str) -> dict:
    """
    Optional read-only probe for orchestrator diagnostics.
    TS layer will ignore this; returned for LLM context only.
    """
    if not is_supabase_configured():
        return {"ok": False, "error": "supabase_not_configured"}
    
    try:
        # Read-only queries only
        shops = await supabase_client.table("dive_shops").select.ilike("business_name", f"%{referent}%").execute()
        dive_sites = await supabase_client.table("dive_sites").select.ilike("name", f"%{referent}%").execute()
        
        return {
            "ok": True,
            "shopHits": shops.data,
            "diveSiteHits": dive_sites.data
        }
    except Exception as e:
        logger.error(f"Probe failed: {e}")
        return {"ok": False, "error": str(e)}

# Usage in orchestrator
if run_db_probe:
    db_probe = await probe_referent_phrase(referent_phrase)
```

**Rules for Python DB reads**:
- ✅ Read-only (SELECT only, no INSERT/UPDATE/DELETE)
- ✅ Optional (can be disabled via request flags)
- ✅ Fail-soft (return error gracefully if Supabase not configured)
- ✅ Diagnostic-only (TS will ignore results)
- ❌ Never write or persist anything

---

## Development Workflow

### Local Setup

```bash
cd python-agents

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your LLM provider key (OPENAI_API_KEY or GOOGLE_API_KEY)
```

### Running Locally

```bash
# Development with auto-reload
uvicorn main:app --reload --port 8001

# Or directly
python main.py
```

### Testing Endpoints Locally

**Option 1**: Visit http://localhost:8001/dev (interactive playground)

**Option 2**: Use `client_demo.py`

```bash
python client_demo.py
# Makes requests to all 4 agents with sample data
```

**Option 3**: Use `orchestrator_smoke.py`

```bash
python orchestrator_smoke.py
# Tests orchestrator end-to-end with routing logic
```

**Option 4**: Use curl

```bash
curl -X POST http://localhost:8001/agents/nlu \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to dive in Bali",
    "history": []
  }'
```

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `LLM_PROVIDER` | Which AI provider to use | `openai`, `gemini` |
| `OPENAI_API_KEY` | OpenAI key | `sk-...` |
| `GOOGLE_API_KEY` | Google/Gemini key | `AIza...` |
| `LLM_CHAT_MODEL` | Override chat model | `gpt-4-turbo`, `gemini-2.0-flash` |
| `USE_LANGCHAIN` | Route through LangChain | `true`, `false` |
| `LANGSMITH_API_KEY` | LangSmith tracing key | `ls__...` |
| `LANGSMITH_PROJECT` | Project name for traces | `deepdive` |
| `SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase key (for reads) | `eyJhbG...` |
| `PORT` | Server port | `8001` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |

### Adding a New Agent

1. **Create Pydantic models** in `models/new_agent_models.py`
   ```python
   class NewAgentRequest(BaseModel):
       ...
   class NewAgentResponse(BaseModel):
       ...
   ```

2. **Create system prompt** in `prompts/new_agent_prompt.py`
   ```python
   NEW_AGENT_SYSTEM_PROMPT = "..."
   ```

3. **Implement agent** in `agents/new_agent.py`
   ```python
   async def run_new_agent(body: NewAgentRequest) -> NewAgentResponse:
       # Call LLM, parse, return response
   ```

4. **Add endpoint** in `main.py`
   ```python
   @app.post("/agents/new-agent", response_model=NewAgentResponse, tags=["agents"])
   async def new_agent_endpoint(body: NewAgentRequest) -> NewAgentResponse:
       return await run_new_agent(body)
   ```

5. **Add to TS client** in `server/utils/pythonAgentsClient.ts`
   ```typescript
   export async function callNewAgent(req: NewAgentRequest): Promise<NewAgentResponse> {
       return fetch(`${PYTHON_AGENTS_URL}/agents/new-agent`, ...)
   }
   ```

6. **Test via `/dev` or `client_demo.py`**

---

## TypeScript Integration Checklist

When updating TS code to work with Python agents:

- [ ] Import types from `pythonAgentsClient.ts`
- [ ] Call Python endpoint via `callXxxAgent()` function
- [ ] Inject `preComputedInterpretTurn` into `runAiSearchPostHandler` when NLU already ran in Python
- [ ] Ignore Python's optional `dbProbe`/`dbSearch` results; run own Supabase queries
- [ ] Only use Python's output for LLM-extracted data (intent, filters, payload)
- [ ] Never persist Python's data directly; TS owns the write
- [ ] Handle Python errors gracefully (fail-soft, return error response to browser)
- [ ] Update `pythonAgentsClient.ts` URL if deploying Python to different endpoint
- [ ] Use "alpha" / "beta" terminology in migration notes and PR descriptions for historical clarity

---

## Common Patterns When Extending

### Adding a New Search Filter

**Goal**: Extract a new filter type from user messages (e.g., `water_temperature`).

**Where to add**:

1. **Pydantic model** (`models/search_models.py`):
   ```python
   class SearchFilters(BaseModel):
       water_temperature: str | None = None  # "warm", "cold", etc.
   ```

2. **System prompt** (`prompts/search_agent_prompt.py`):
   ```python
   # Add example:
   # Input: "I want warm water diving"
   # Output: {"water_temperature": "warm", ...}
   ```

3. **Search agent logic** (`agents/search_agent.py`):
   ```python
   # Parse water_temperature from LLM response
   ```

4. **TS buildDiveShopQuery** (`server/utils/searchQuery.ts`):
   ```typescript
   // Add WHERE clause: where('dive_shops', 'water_temp', filter.water_temperature)
   // DB table must support this column (TS migration responsibility)
   ```

### Multi-Turn Booking Dialogue

**Goal**: Ask users for more booking details across multiple turns.

**Where to update**:

1. **Booking prompt** (`prompts/booking_agent_prompt.py`):
   - Add new field to "fields to collect" list
   - Add example dialogue turn

2. **Booking model** (`models/booking_models.py`):
   ```python
   class Diver(BaseModel):
       name: str | None = None
       certification_level: str | None = None  # NEW
   ```

3. **Booking agent logic** (`agents/booking_agent.py`):
   - Update system prompt context to include new field
   - Parse LLM response to extract new field value

4. **TS booking form** (`server/utils/bookingForm.ts`, `app/components/BookingForm.vue`):
   - Update form UI to show new field
   - Validate input before final submission

---

## Debugging & Diagnostics

### Enable Logging

```python
# In agents or main.py
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Use throughout
logger.debug(f"Request: {body.message}")
logger.info(f"NLU result: goal={interpreted.goal}")
logger.error(f"LLM error: {e}")
```

### Test via Playground

Visit http://localhost:8001/dev while service is running.

### Test via Python Script

```python
# test_nlu_agent.py
import asyncio
from agents.nlu_agent import run_nlu_agent
from models.nlu_models import NluRequest

async def main():
    body = NluRequest(message="I want to dive in Bali", history=[])
    response = await run_nlu_agent(body)
    print(response)

asyncio.run(main())
```

### Inspect LangSmith Traces

If `LANGSMITH_TRACING=true`:
1. Visit https://smith.langchain.com
2. Open your project (e.g., `deepdive`)
3. View traces for each agent call
4. Debug LLM prompts and responses

### Check Python Logs

```bash
# If running uvicorn, watch stderr
uvicorn main:app --reload --port 8001

# Should see:
# INFO:     Application startup complete
# INFO: agents.nlu_agent - NLU request: "I want to dive..."
# INFO: agents.search_agent - Search filters extracted...
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, endpoint routing, health check |
| `agents/nlu_agent.py` | NLU intent extraction (mirrors `interpretUserTurn.ts`) |
| `agents/search_agent.py` | Search filter extraction (mirrors `SEARCH_DIVE_SYSTEM_PROMPT` call) |
| `agents/booking_agent.py` | Multi-turn booking dialogue (mirrors `buildBookingSystemPrompt` call) |
| `agents/orchestrator_agent.py` | Orchestration & routing logic (mirrors TS `runAiSearchPostHandler` blocks) |
| `models/*_models.py` | Pydantic request/response contracts |
| `prompts/` | System prompts for LLM calls |
| `utils/llm_client.py` | LLM provider abstraction (OpenAI, Gemini) |
| `utils/supabase_client.py` | Optional read-only Supabase client (diagnostic only) |
| `../server/utils/pythonAgentsClient.ts` | TS HTTP client for calling Python endpoints |
| `../server/api/guided-orchestrator.post.ts` | Unified TS entry point calling Python orchestrator |

---

## Do's and Don'ts

### DO ✓

- ✅ Keep Python stateless (no session storage, no state between requests)
- ✅ Use Pydantic models for all I/O
- ✅ Make Python DB reads optional and diagnostic only
- ✅ Log at appropriate levels (INFO for success, ERROR for failures)
- ✅ Return fail-soft responses (always return proper HTTP 200 with error flag)
- ✅ Call Python endpoints via `pythonAgentsClient.ts` in TS layer
- ✅ Inject Python's NLU result into TS pipeline as `preComputedInterpretTurn`
- ✅ Keep all system prompts in `prompts/` folder for version control
- ✅ Test agents locally via `/dev` playground before deployment

### DON'T ✗

- ❌ Write to Supabase from Python (ever)
- ❌ Make Python calls from Python agents (only call LLM provider)
- ❌ Store session state in Python between requests
- ❌ Hardcode Supabase credentials in Python code
- ❌ Mix LLM provider logic; use abstraction layer (`llm_client.py`)
- ❌ Call external APIs beyond LLM from Python (email, payments, etc.)
- ❌ Return large binary data or non-JSON responses from endpoints
- ❌ Modify TS database layer based on Python's optional `dbProbe` results
- ❌ Create new database tables without TS migrations

---

## Questions? Refer to

- **Architecture deep-dive**: `python-agents/README.md` (1000+ lines of patterns and flows)
- **API docs**: http://localhost:8001/docs (when service running)
- **Type contracts**: `python-agents/models/*.py`
- **System prompts**: `python-agents/prompts/`
- **TS integration**: `server/utils/pythonAgentsClient.ts` and `server/api/guided-orchestrator.post.ts`
- **Tests**: `python-agents/client_demo.py`, `orchestrator_smoke.py`

---

**Last updated**: August 2026  
**Scope**: Python-agents microservice (LLM layer) + TypeScript/Supabase integration

