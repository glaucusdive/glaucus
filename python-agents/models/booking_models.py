"""
Pydantic models for the booking assistant agent.
Mirrors BookingPayload and related types in runAiSearchPostHandler.ts.
"""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field

from models.nlu_models import ChatMessage


# ── Sub-models ────────────────────────────────────────────────────────────────

class GearItem(BaseModel):
    gear_type: str = Field("", alias="gearType")
    model_config = {"populate_by_name": True}


class DiverPayload(BaseModel):
    name: str = ""
    certification_number: str = Field("", alias="certificationNumber")
    number_of_dives: str = Field("", alias="numberOfDives")
    height: str = ""
    height_unit: str = Field("ft-in", alias="heightUnit")
    weight: str = ""
    weight_unit: str = Field("lbs", alias="weightUnit")
    gear: list[GearItem] = Field(default_factory=list)
    gear_asked: Optional[bool] = Field(None, alias="gearAsked")
    model_config = {"populate_by_name": True}


class BookingPayload(BaseModel):
    shop_id: Optional[str] = Field(None, alias="shopId")
    name: Optional[str] = None
    email: Optional[str] = None
    start_date: Optional[str] = Field(None, alias="startDate")
    end_date: Optional[str] = Field(None, alias="endDate")
    number_of_divers: Optional[int] = Field(None, alias="numberOfDivers")
    divers: Optional[list[DiverPayload]] = None
    desired_courses: Optional[list[str]] = Field(None, alias="desiredCourses")
    courses_selection_complete: Optional[bool] = Field(None, alias="coursesSelectionComplete")
    desired_dive_sites: Optional[list[str]] = Field(None, alias="desiredDiveSites")
    dive_sites_selection_complete: Optional[bool] = Field(None, alias="diveSitesSelectionComplete")
    model_config = {"populate_by_name": True}


# ── Request ──────────────────────────────────────────────────────────────────

class BookingAgentRequest(BaseModel):
    message: str = Field(..., description="Current user message in the booking flow.")
    history: list[ChatMessage] = Field(default_factory=list)
    shop_name: str = Field(..., alias="shopName", description="Display name of the shop being booked.")
    course_names: list[str] = Field(default_factory=list, alias="courseNames")
    dive_site_names: list[str] = Field(default_factory=list, alias="diveSiteNames")
    rental_equipment_names: list[str] = Field(default_factory=list, alias="rentalEquipmentNames")
    existing_payload: Optional[dict[str, Any]] = Field(None, alias="existingPayload")
    next_step_hint: Optional[dict[str, Any]] = Field(None, alias="nextStepHint")
    model_config = {"populate_by_name": True}


# ── Response ──────────────────────────────────────────────────────────────────

class BookingAgentResponse(BaseModel):
    ok: bool
    reply: Optional[str] = Field(None, description="Conversational reply for the user.")
    collected_payload: Optional[dict[str, Any]] = Field(
        None, alias="collectedPayload", description="Updated booking payload parsed from COLLECTED: ..."
    )
    booking_ready: bool = Field(False, alias="bookingReady")
    final_payload: Optional[dict[str, Any]] = Field(
        None, alias="finalPayload", description="Present when BOOKING_READY emitted."
    )
    error: Optional[str] = None
    model_config = {"populate_by_name": True}

