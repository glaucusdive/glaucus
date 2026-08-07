"""
Orchestrator Agent — Python mirror of key control-flow blocks in
server/utils/runAiSearchPostHandler.ts.

This module intentionally focuses on orchestration behavior (continue-on-NLU-fail,
readiness inference, referent selection, and filter merges). Supabase reads/writes
remain in the TypeScript layer.
"""
from __future__ import annotations

import logging
import re
from typing import Literal

from models.nlu_models import InterpretedTurn, NluRequest
from models.orchestrator_models import (
    BookingReadinessResult,
    OrchestratorRequest,
    OrchestratorResponse,
)
from models.search_models import SearchAgentRequest, SearchFilters
from agents.booking_agent import run_booking_agent
from agents.nlu_agent import run_nlu_agent
from agents.search_agent import run_search_agent
from utils.supabase_directory import (
    get_courses_for_shop,
    get_dive_sites_for_shop,
    get_rental_equipment_for_shop,
    get_shop_by_id,
    is_supabase_configured,
    probe_referent_phrase,
    search_shops,
)

logger = logging.getLogger(__name__)


def _decide_agent_call(
    request: OrchestratorRequest,
    interpret: InterpretedTurn,
    readiness: BookingReadinessResult,
) -> tuple[Literal["search", "booking", "none"], str]:
    """Map downstream call selection to a TS-like single-branch route."""
    if request.run_booking_agent:
        if request.booking_request is not None:
            return "booking", "manual_override:runBookingAgent"
        return "none", "manual_override_missing_bookingRequest"

    if request.run_search_agent:
        return "search", "manual_override:runSearchAgent"

    if not request.auto_agent_routing:
        return "none", "auto_routing_disabled"

    # TS-like precedence: booking branch before search branch when booking intent exists.
    if request.booking_request is not None and (
        interpret.goal == "start_booking" or readiness.effective_wants_to_book
    ):
        return "booking", "auto:booking_intent"

    if interpret.goal == "search_shops" or readiness.primary_verb == "browse":
        return "search", "auto:search_intent"

    return "none", "auto:no_llm_needed"


def _is_garbage_referent_phrase(phrase: str) -> bool:
    s = phrase.strip().lower()
    if len(s) < 2 or len(s) > 120:
        return True
    if re.match(r"^(a\s+)?dive\s+in\b", s):
        return True
    if re.match(r"^(to\s+)?book\s+a\s+dive\b", s):
        return True
    if re.match(r"^let'?s\s+dive\s+in\b", s):
        return False
    return False


def _normalize_place(value: str | None) -> str | None:
    if value is None:
        return None
    t = value.strip()
    if not t:
        return None
    t = re.sub(r"^the\s+", "", t, flags=re.IGNORECASE).strip()
    if _is_garbage_referent_phrase(t):
        return None
    return t


def _pick_referent_phrase_for_probe(
    interpret: InterpretedTurn,
    regex_phrase: str | None,
    prefer_shop_or_regex_over_destination: bool,
) -> str | None:
    from_dest = _normalize_place(interpret.destination_text)
    from_shop = _normalize_place(interpret.shop_name_hint)
    reg = regex_phrase.strip() if regex_phrase and regex_phrase.strip() else None
    reg_ok = reg if reg and not _is_garbage_referent_phrase(reg) else None

    if prefer_shop_or_regex_over_destination:
        if from_shop:
            return from_shop
        if reg_ok:
            return reg_ok
        if from_dest:
            return from_dest
        return reg

    if from_dest:
        return from_dest
    if from_shop:
        return from_shop
    if reg_ok:
        return reg_ok
    return reg


def _normalize_activity_terms(terms: list[str] | None) -> list[str]:
    if not terms:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for token in terms:
        s = re.sub(r"[^a-z0-9\s_-]", "", token.lower()).strip()
        s = re.sub(r"\s+", " ", s)
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
        if len(out) >= 8:
            break
    return out


def _merge_nlu_hints_into_filters(filters: SearchFilters, interpret: InterpretedTurn) -> SearchFilters:
    place = _normalize_place(interpret.destination_text)
    if not place:
        return filters
    if filters.country and filters.country.strip():
        return filters
    if not (filters.place and filters.place.strip()) and not (filters.region and filters.region.strip()):
        return filters.model_copy(update={"place": place})
    return filters


def _merge_activity_into_filters(filters: SearchFilters, interpret: InterpretedTurn) -> SearchFilters:
    tokens = _normalize_activity_terms(interpret.activity_terms)
    if not tokens:
        return filters
    merged = list(filters.activity_tokens or [])
    for t in tokens:
        if t not in merged:
            merged.append(t)
    return filters.model_copy(update={"activity_tokens": merged})


def _infer_booking_readiness(
    message: str,
    interpret: InterpretedTurn,
    explicit_wants_booking: bool,
) -> BookingReadinessResult:
    txt = message.lower()

    book_re = r"\b(book|booking|reserve|reservation|schedule|lets\s+do|let'?s\s+do|go\s+with|i'?ll\s+take|choose)\b"
    browse_re = r"\b(find|show|search|recommend|compare|looking\s+for|options?)\b"

    has_book = bool(re.search(book_re, txt))
    has_browse = bool(re.search(browse_re, txt))
    effective_wants = explicit_wants_booking or bool(interpret.wants_booking) or interpret.goal == "start_booking"

    # Trust model-provided value first when available.
    if interpret.booking_readiness is not None:
        score = float(interpret.booking_readiness)
    elif interpret.goal == "start_booking" or effective_wants:
        score = 8.5
    elif has_browse:
        score = 6.0
    elif has_book:
        score = 7.5
    else:
        score = 4.0

    if interpret.primary_verb:
        primary = interpret.primary_verb
    elif has_browse and not has_book:
        primary = "browse"
    elif has_book and not has_browse:
        primary = "book"
    elif has_book and has_browse:
        primary = "browse"
    else:
        primary = "neutral"

    score = max(1.0, min(10.0, score))
    return BookingReadinessResult(
        score=score,
        primaryVerb=primary,
        effectiveWantsToBook=effective_wants,
    )


async def run_orchestrator_agent(request: OrchestratorRequest) -> OrchestratorResponse:
    """Run a TS-like orchestration pass with fail-soft NLU handling."""
    activity_log: list[str] = []

    ir = await run_nlu_agent(NluRequest(message=request.message, history=request.history))
    interpret = ir.data or InterpretedTurn.model_validate({"goal": "unclear", "confidence": 0.0})

    if ir.error:
        activity_log.append(f"nlu_failed: {ir.error}")
    else:
        activity_log.append(f"nlu_ok: goal={interpret.goal}")

    readiness = _infer_booking_readiness(request.message, interpret, request.wants_booking)
    activity_log.append(
        f"booking_readiness: score={readiness.score:.1f}, primaryVerb={readiness.primary_verb}, wantsBook={readiness.effective_wants_to_book}"
    )

    referent = _pick_referent_phrase_for_probe(
        interpret=interpret,
        regex_phrase=request.regex_referent,
        prefer_shop_or_regex_over_destination=request.prefer_shop_or_regex_over_destination,
    )
    if referent:
        activity_log.append(f"referent_phrase: {referent}")

    merged_filters = request.base_filters or SearchFilters.model_validate({})
    merged_filters = _merge_nlu_hints_into_filters(merged_filters, interpret)
    merged_filters = _merge_activity_into_filters(merged_filters, interpret)

    search_result = None
    booking_result = None
    db_probe = None
    db_search = None
    selected_shop = None
    agent_call, agent_reason = _decide_agent_call(request, interpret, readiness)
    final_agent_call: Literal["search", "booking", "none"] = agent_call
    activity_log.append(f"agent_call: {agent_call} ({agent_reason})")

    if agent_call == "search":
        search_result = await run_search_agent(
            SearchAgentRequest(message=request.message, history=request.history)
        )
        if search_result.ok and search_result.filters:
            merged_filters = SearchFilters.model_validate(
                search_result.filters.model_dump(mode="python", by_alias=False)
            )
            merged_filters = _merge_nlu_hints_into_filters(merged_filters, interpret)
            merged_filters = _merge_activity_into_filters(merged_filters, interpret)
            activity_log.append("search_agent_ok: merged search + nlu filters")
        else:
            activity_log.append(f"search_agent_failed: {search_result.error or 'unknown'}")

    elif agent_call == "booking":
        # Guard again to keep runtime robust even if request model changes.
        if request.booking_request is None:
            activity_log.append("booking_agent_skipped: missing bookingRequest")
            final_agent_call = "none"
        else:
            booking_result = await run_booking_agent(request.booking_request)
            if booking_result.ok:
                activity_log.append("booking_agent_ok")
            else:
                activity_log.append(f"booking_agent_failed: {booking_result.error or 'unknown'}")

    if request.run_db_probe and referent:
        if not is_supabase_configured():
            activity_log.append("db_probe_skipped: supabase_not_configured")
            db_probe = {"ok": False, "error": "supabase_not_configured"}
        else:
            try:
                hits = await probe_referent_phrase(referent)
                db_probe = {"ok": True, "referent": referent, "hits": hits}
                activity_log.append("db_probe_ok")
            except Exception as exc:
                db_probe = {"ok": False, "error": str(exc)}
                activity_log.append(f"db_probe_failed: {exc}")

    if request.selected_shop_id:
        if not is_supabase_configured():
            activity_log.append("selected_shop_skipped: supabase_not_configured")
            selected_shop = {"ok": False, "error": "supabase_not_configured"}
        else:
            try:
                shop = await get_shop_by_id(request.selected_shop_id)
                dive_sites = await get_dive_sites_for_shop(request.selected_shop_id)
                courses = await get_courses_for_shop(request.selected_shop_id)
                rental = await get_rental_equipment_for_shop(request.selected_shop_id)
                selected_shop = {
                    "ok": True,
                    "shop": shop,
                    "diveSites": dive_sites,
                    "courses": courses,
                    "rentalEquipment": rental,
                }
                activity_log.append("selected_shop_ok")
            except Exception as exc:
                selected_shop = {"ok": False, "error": str(exc)}
                activity_log.append(f"selected_shop_failed: {exc}")

    if request.run_db_search and agent_call == "search":
        if not is_supabase_configured():
            activity_log.append("db_search_skipped: supabase_not_configured")
            db_search = {"ok": False, "error": "supabase_not_configured"}
        else:
            effective_filters = merged_filters
            if search_result and search_result.ok and search_result.filters:
                effective_filters = search_result.filters
            try:
                result = await search_shops(effective_filters)
                db_search = {"ok": True, **result}
                activity_log.append(f"db_search_ok: count={result.get('count', 0)}")
            except Exception as exc:
                db_search = {"ok": False, "error": str(exc)}
                activity_log.append(f"db_search_failed: {exc}")
                
    print(f"orchestrator_activity_log: {activity_log}")
    
    return OrchestratorResponse(
        ok=True,
        nluOk=ir.error is None,
        nluError=ir.error,
        interpretTurn=interpret,
        bookingReadiness=readiness,
        referentPhrase=referent,
        mergedFilters=merged_filters,
        activityLog=activity_log,
        agentCall=final_agent_call,
        search=search_result,
        booking=booking_result,
        dbProbe=db_probe,
        dbSearch=db_search,
        selectedShop=selected_shop,
    )


