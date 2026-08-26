"""
Pydantic models for the NLU agent.
Mirrors InterpretedTurnSchema in shared/searchAiContract.ts and interpretUserTurn.ts.
"""
from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


# ── Request ──────────────────────────────────────────────────────────────────

class NluRequest(BaseModel):
    message: str = Field(..., description="Current user message to interpret.")
    history: list[ChatMessage] = Field(
        default_factory=list,
        description="Recent conversation history (last ~6 messages).",
    )


# ── Response ─────────────────────────────────────────────────────────────────

class InterpretedTurn(BaseModel):
    goal: Literal["search_shops", "start_booking", "continue", "shop_info", "unclear"]
    destination_text: Optional[str] = None
    shop_name_hint: Optional[str] = None
    activity_terms: Optional[list[str]] = None
    certification_course_hint: Optional[str] = None
    dive_site_type_label: Optional[str] = None
    trip_product_type: Optional[Literal["liveaboard", "dive_resort", "dive_shop"]] = None
    wants_booking: Optional[bool] = None
    booking_readiness: Optional[float] = Field(None, ge=1, le=10)
    primary_verb: Optional[Literal["browse", "book", "neutral"]] = None
    reasoning_summary: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0, le=1)


class NluResponse(BaseModel):
    ok: bool
    data: Optional[InterpretedTurn] = None
    error: Optional[str] = None

