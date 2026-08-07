"""
Glaucus Dive — Python AI Agents service.

Exposes three HTTP endpoints called by the Nuxt/Nitro TypeScript layer:

  POST /agents/nlu        — intent extraction  (replaces interpretUserTurn.ts)
  POST /agents/search     — search filter LLM  (replaces SEARCH_DIVE_SYSTEM_PROMPT call)
  POST /agents/booking    — booking assistant  (replaces buildBookingSystemPrompt call)

The TypeScript server still owns all Supabase queries (buildDiveShopQuery,
getShopById, getDiveSitesForShop, etc.) — it calls this service only for
the LLM steps and feeds the returned filters / payload back into its own
data-fetching pipeline.

Start in development:
  uvicorn main:app --reload --port 8001
"""
from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

load_dotenv()

from agents.nlu_agent import run_nlu_agent
from agents.search_agent import run_search_agent
from agents.booking_agent import run_booking_agent
from models.nlu_models import NluRequest, NluResponse
from models.search_models import SearchAgentRequest, SearchAgentResponse
from models.booking_models import BookingAgentRequest, BookingAgentResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Glaucus Dive — AI Agents",
    description=(
        "Python microservice that wraps OpenAI LLM calls for the Glaucus Dive platform. "
        "All Supabase data-fetching stays in the TypeScript/Nitro layer."
    ),
    version="1.0.0",
)

# Allow calls from the Nuxt dev server and Netlify functions
_ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:8888",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/healthz", tags=["health"])
async def healthz() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/dev", response_class=HTMLResponse, include_in_schema=False)
async def dev_playground() -> str:
    """Simple local playground to call agent endpoints without Nuxt."""
    return """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Python Agents Dev Playground</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #0b0f19;
      color: #e5e7eb;
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0 0 18px; color: #9ca3af; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .card {
      border: 1px solid #334155;
      border-radius: 12px;
      background: #111827;
      padding: 14px;
    }
    .path { font-size: 12px; color: #94a3b8; margin: 6px 0 10px; }
    textarea {
      width: 100%;
      min-height: 180px;
      box-sizing: border-box;
      border-radius: 8px;
      border: 1px solid #475569;
      background: #0f172a;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      padding: 10px;
    }
    button {
      margin-top: 10px;
      border: 0;
      border-radius: 8px;
      background: #2563eb;
      color: white;
      padding: 8px 12px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { background: #1d4ed8; }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      margin: 10px 0 0;
      min-height: 110px;
      border: 1px solid #334155;
      border-radius: 8px;
      background: #020617;
      color: #cbd5e1;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      padding: 10px;
    }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>Python Agents Local Playground</h1>
    <p>Use this page during local development to call each agent endpoint directly.</p>

    <div class="grid">
      <section class="card">
        <h2>NLU</h2>
        <div class="path">POST /agents/nlu</div>
        <textarea id="nlu-input">{
  "message": "I want to dive in Komodo next month",
  "history": []
}</textarea>
        <button onclick="sendRequest('/agents/nlu', 'nlu-input', 'nlu-output')">Send</button>
        <pre id="nlu-output">Waiting...</pre>
      </section>

      <section class="card">
        <h2>Search Filters</h2>
        <div class="path">POST /agents/search</div>
        <textarea id="search-input">{
  "message": "Show me highly rated drift diving shops in Bali",
  "history": []
}</textarea>
        <button onclick="sendRequest('/agents/search', 'search-input', 'search-output')">Send</button>
        <pre id="search-output">Waiting...</pre>
      </section>

      <section class="card">
        <h2>Booking Assistant</h2>
        <div class="path">POST /agents/booking</div>
        <textarea id="booking-input">{
  "message": "I need open water course for 2 divers next weekend",
  "history": [],
  "shopName": "Demo Dive Shop",
  "courseNames": ["Open Water Diver"],
  "diveSiteNames": ["Blue Corner"],
  "rentalEquipmentNames": ["BCD", "Regulator"],
  "existingPayload": null,
  "nextStepHint": null
}</textarea>
        <button onclick="sendRequest('/agents/booking', 'booking-input', 'booking-output')">Send</button>
        <pre id="booking-output">Waiting...</pre>
      </section>
    </div>
  </main>

  <script>
    async function sendRequest(path, inputId, outputId) {
      const output = document.getElementById(outputId);
      const raw = document.getElementById(inputId).value;
      let payload;

      try {
        payload = JSON.parse(raw);
      } catch (e) {
        output.textContent = "Invalid JSON: " + (e && e.message ? e.message : String(e));
        return;
      }

      output.textContent = "Loading...";

      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const text = await res.text();
        let body;
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }

        output.textContent = JSON.stringify(
          {
            status: res.status,
            ok: res.ok,
            body
          },
          null,
          2
        );
      } catch (e) {
        output.textContent = "Request failed: " + (e && e.message ? e.message : String(e));
      }
    }
  </script>
</body>
</html>
"""


# ── NLU endpoint ─────────────────────────────────────────────────────────────

@app.post(
    "/agents/nlu",
    response_model=NluResponse,
    tags=["agents"],
    summary="Extract structured intent from a user message",
    description=(
        "Calls OpenAI with the NLU system prompt and returns an InterpretedTurn "
        "(goal, destination_text, shop_name_hint, activity_terms, …). "
        "Used by the TypeScript orchestrator to decide whether to run a Supabase "
        "shop search, start a booking flow, or clarify."
    ),
)
async def nlu_endpoint(body: NluRequest) -> NluResponse:
    return await run_nlu_agent(body)


# ── Search-filter endpoint ────────────────────────────────────────────────────

@app.post(
    "/agents/search",
    response_model=SearchAgentResponse,
    tags=["agents"],
    summary="Extract Supabase-ready search filters from a free-text query",
    description=(
        "Calls OpenAI with the search-dive system prompt and parses the FILTERS/MESSAGE "
        "response. The TypeScript layer feeds SearchFilters directly into "
        "buildDiveShopQuery() — no LLM involvement in the actual Supabase query."
    ),
)
async def search_endpoint(body: SearchAgentRequest) -> SearchAgentResponse:
    return await run_search_agent(body)


# ── Booking assistant endpoint ────────────────────────────────────────────────

@app.post(
    "/agents/booking",
    response_model=BookingAgentResponse,
    tags=["agents"],
    summary="Run one booking-assistant turn",
    description=(
        "Calls OpenAI with the booking system prompt (shop context, collected payload, "
        "next step hint) and returns a conversational reply + updated COLLECTED payload. "
        "When BOOKING_READY is emitted the finalPayload is included. "
        "The TypeScript /api/booking.post.ts handler still owns the Resend email send "
        "and the Supabase booking_submissions insert."
    ),
)
async def booking_endpoint(body: BookingAgentRequest) -> BookingAgentResponse:
    return await run_booking_agent(body)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

