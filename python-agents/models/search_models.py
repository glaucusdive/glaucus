"""
Pydantic models for the search-filter extraction agent.
Mirrors SearchFilters in server/utils/buildDiveShopQuery.ts.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field

from models.nlu_models import ChatMessage


# ── Request ──────────────────────────────────────────────────────────────────

class SearchAgentRequest(BaseModel):
    message: str = Field(..., description="Current user message.")
    history: list[ChatMessage] = Field(
        default_factory=list,
        description="Conversation history so the model can preserve location context.",
    )


# ── Response ─────────────────────────────────────────────────────────────────

class SearchFilters(BaseModel):
    country: Optional[str] = None
    place: Optional[str] = None
    region: Optional[str] = None
    min_rating: Optional[float] = Field(None, alias="minRating")
    languages: Optional[list[str]] = None
    dive_types: Optional[list[str]] = Field(None, alias="diveTypes")
    activity_tokens: Optional[list[str]] = Field(None, alias="activityTokens")

    model_config = {"populate_by_name": True}


class SearchAgentResponse(BaseModel):
    ok: bool
    filters: Optional[SearchFilters] = None
    message: Optional[str] = Field(None, description="Conversational reply for the user.")
    error: Optional[str] = None

