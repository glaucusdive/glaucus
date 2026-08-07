"""
Pydantic models for the Python orchestration endpoint.

This mirrors the high-level control flow in runAiSearchPostHandler.ts:
- NLU intent extraction
- fallback-safe continuation
- booking-readiness heuristics
- referent phrase selection
- filter merges
- optional search/booking agent sub-calls
"""
from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field

from models.booking_models import BookingAgentRequest, BookingAgentResponse
from models.nlu_models import ChatMessage, InterpretedTurn
from models.search_models import SearchAgentResponse, SearchFilters


class OrchestratorRequest(BaseModel):
    message: str = Field(..., description="Current user message.")
    history: list[ChatMessage] = Field(default_factory=list)
    wants_booking: bool = Field(False, alias="wantsBooking")
    regex_referent: Optional[str] = Field(None, alias="regexReferent")
    prefer_shop_or_regex_over_destination: bool = Field(
        False,
        alias="preferShopOrRegexOverDestination",
        description="When true, choose shop/regex phrases before destination text.",
    )
    base_filters: Optional[SearchFilters] = Field(None, alias="baseFilters")

    # Optional downstream agent calls. Keeping these opt-in avoids accidental
    # extra LLM calls when this endpoint is used for control-flow introspection.
    run_search_agent: bool = Field(False, alias="runSearchAgent")
    run_booking_agent: bool = Field(False, alias="runBookingAgent")
    booking_request: Optional[BookingAgentRequest] = Field(None, alias="bookingRequest")
    auto_agent_routing: bool = Field(
        True,
        alias="autoAgentRouting",
        description="When true, orchestrator auto-selects search/booking/none from NLU + readiness.",
    )
    run_db_probe: bool = Field(True, alias="runDbProbe")
    run_db_search: bool = Field(True, alias="runDbSearch")
    selected_shop_id: Optional[str] = Field(None, alias="selectedShopId")

    model_config = {"populate_by_name": True}


class BookingReadinessResult(BaseModel):
    score: float = Field(..., ge=1, le=10)
    primary_verb: str = Field(..., alias="primaryVerb")
    effective_wants_to_book: bool = Field(..., alias="effectiveWantsToBook")
    model_config = {"populate_by_name": True}


class OrchestratorResponse(BaseModel):
    ok: bool
    nlu_ok: bool = Field(..., alias="nluOk")
    nlu_error: Optional[str] = Field(None, alias="nluError")
    interpret_turn: InterpretedTurn = Field(..., alias="interpretTurn")
    booking_readiness: BookingReadinessResult = Field(..., alias="bookingReadiness")
    referent_phrase: Optional[str] = Field(None, alias="referentPhrase")
    merged_filters: SearchFilters = Field(..., alias="mergedFilters")
    activity_log: list[str] = Field(default_factory=list, alias="activityLog")
    agent_call: Literal["search", "booking", "none"] = Field(..., alias="agentCall")

    # Optional pass-through outputs from other agents.
    search: Optional[SearchAgentResponse] = None
    booking: Optional[BookingAgentResponse] = None

    # Optional Supabase outputs when DB integration is enabled.
    db_probe: Optional[dict] = Field(None, alias="dbProbe")
    db_search: Optional[dict] = Field(None, alias="dbSearch")
    selected_shop: Optional[dict] = Field(None, alias="selectedShop")

    model_config = {"populate_by_name": True}

