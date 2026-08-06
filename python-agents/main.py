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

