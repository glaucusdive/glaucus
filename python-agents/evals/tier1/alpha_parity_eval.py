"""
Alpha parity eval runner for beta python-agents.

Purpose:
- Reuse alpha (TS-only) behavior expectations as parity checks for beta agents.
- Run deterministic evals without real LLM calls by patching agent chat helpers.

Run:
  python3 evals/tier1/alpha_parity_eval.py
"""
from __future__ import annotations

import asyncio
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable

# Allow running this script directly from python-agents/
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agents import booking_agent, nlu_agent, orchestrator_agent, search_agent
from models.booking_models import BookingAgentRequest, BookingAgentResponse
from models.nlu_models import InterpretedTurn, NluRequest, NluResponse
from models.orchestrator_models import BookingReadinessResult, OrchestratorRequest
from models.search_models import SearchAgentRequest, SearchAgentResponse


@dataclass
class EvalCase:
    name: str
    run: Callable[[], Awaitable[None]]


def _patch_attr(module: Any, attr: str, replacement: Any):
    original = getattr(module, attr)
    setattr(module, attr, replacement)

    def restore() -> None:
        setattr(module, attr, original)

    return restore


async def _case_nlu_wrapped_json() -> None:
    async def fake_chat_completion(**_: Any) -> str:
        return (
            'Here you go:\n'
            '{"goal":"search_shops","destination_text":"Bali","shop_name_hint":null,'
            '"activity_terms":["wreck"],"trip_product_type":"liveboard",'
            '"wants_booking":false,"primary_verb":"browse","confidence":0.93}\n'
        )

    restore = _patch_attr(nlu_agent, "run_chat_completion", fake_chat_completion)
    try:
        result = await nlu_agent.run_nlu_agent(NluRequest(message="Show me liveboards in Bali", history=[]))
    finally:
        restore()
        
    print(f"NLU result: {result}")

    assert result.ok is True
    assert result.data is not None
    assert result.data.goal == "search_shops"
    assert result.data.destination_text == "Bali"
    # Matches alpha behavior where common variant spellings normalize.
    assert result.data.trip_product_type == "liveaboard"


async def _case_nlu_fail_soft_parse() -> None:
    async def fake_chat_completion(**_: Any) -> str:
        return "not a json response"

    restore = _patch_attr(nlu_agent, "run_chat_completion", fake_chat_completion)
    try:
        result = await nlu_agent.run_nlu_agent(NluRequest(message="hello", history=[]))
    finally:
        restore()

    assert result.ok is True
    assert result.data is not None
    assert result.data.goal == "unclear"
    assert result.error is not None
    assert "parse_failed" in result.error


async def _case_search_filters_parse() -> None:
    async def fake_chat_completion(**_: Any) -> str:
        return (
            'FILTERS: {"country":"Indonesia","place":"Bali","minRating":4.5,'
            '"diveTypes":["Dive Resort"],"activityTokens":["drift"]}\n'
            'MESSAGE: I\'ll search Bali dive resorts with strong ratings.'
        )

    restore = _patch_attr(search_agent, "run_chat_completion", fake_chat_completion)
    try:
        result = await search_agent.run_search_agent(
            SearchAgentRequest(message="highly rated drift resorts in Bali", history=[])
        )
    finally:
        restore()

    assert result.ok is True
    assert result.filters is not None
    assert result.filters.country == "Indonesia"
    assert result.filters.place == "Bali"
    assert result.filters.min_rating == 4.5
    assert result.filters.dive_types == ["Dive Resort"]
    assert result.filters.activity_tokens == ["drift"]


async def _case_booking_collected_extract() -> None:
    async def fake_chat_completion(**_: Any) -> str:
        return (
            "Perfect, thanks. What dates are you planning to dive?\n"
            'COLLECTED: {"name":"Chris Porter","email":"chris@example.com"}'
        )

    restore = _patch_attr(booking_agent, "run_chat_completion", fake_chat_completion)
    try:
        result = await booking_agent.run_booking_agent(
            BookingAgentRequest(
                message="My name is Chris and email is chris@example.com",
                history=[],
                shopName="Demo Dive Shop",
            )
        )
    finally:
        restore()

    assert result.ok is True
    assert result.booking_ready is False
    assert result.collected_payload is not None
    assert result.collected_payload.get("name") == "Chris Porter"
    assert result.collected_payload.get("email") == "chris@example.com"


async def _case_booking_ready_extract() -> None:
    async def fake_chat_completion(**_: Any) -> str:
        return (
            "All set.\n"
            'BOOKING_READY: {"shopId":"shop-1","name":"Chris Porter","email":"chris@example.com",'
            '"startDate":"2026-10-01","endDate":"2026-10-03","numberOfDivers":1,'
            '"divers":[{"name":"Chris Porter","certificationNumber":"A1",'
            '"numberOfDives":"25","height":"5ft10","heightUnit":"ft-in",'
            '"weight":"170","weightUnit":"lbs","gear":[]}]}'
        )

    restore = _patch_attr(booking_agent, "run_chat_completion", fake_chat_completion)
    try:
        result = await booking_agent.run_booking_agent(
            BookingAgentRequest(
                message="ready",
                history=[],
                shopName="Demo Dive Shop",
            )
        )
    finally:
        restore()

    assert result.ok is True
    assert result.booking_ready is True
    assert result.final_payload is not None
    assert result.final_payload.get("shopId") == "shop-1"


async def _case_orchestrator_booking_precedence() -> None:
    async def fake_nlu(_: NluRequest) -> NluResponse:
        return NluResponse(
            ok=True,
            data=InterpretedTurn(
                goal="start_booking",
                destination_text="Bali",
                wants_booking=True,
                primary_verb="book",
                confidence=0.9,
            ),
        )

    async def fake_booking(_: BookingAgentRequest) -> BookingAgentResponse:
        return BookingAgentResponse(ok=True, reply="Got it", bookingReady=False, collectedPayload={})

    restore_nlu = _patch_attr(orchestrator_agent, "run_nlu_agent", fake_nlu)
    restore_booking = _patch_attr(orchestrator_agent, "run_booking_agent", fake_booking)
    try:
        request = OrchestratorRequest(
            message="I want to book",
            history=[],
            wantsBooking=True,
            runDbProbe=False,
            runDbSearch=False,
            autoAgentRouting=True,
            bookingRequest=BookingAgentRequest(message="I want to book", history=[], shopName="Demo"),
        )
        result = await orchestrator_agent.run_orchestrator_agent(request)
    finally:
        restore_booking()
        restore_nlu()

    assert result.ok is True
    assert result.agent_call == "booking"
    assert result.booking is not None


async def _case_orchestrator_filter_merge() -> None:
    async def fake_nlu(_: NluRequest) -> NluResponse:
        return NluResponse(
            ok=True,
            data=InterpretedTurn(
                goal="search_shops",
                destination_text="Bali",
                activity_terms=["Cave", "Wreck"],
                primary_verb="browse",
                confidence=0.8,
            ),
        )

    restore_nlu = _patch_attr(orchestrator_agent, "run_nlu_agent", fake_nlu)
    try:
        request = OrchestratorRequest(
            message="show cave and wreck dives",
            history=[],
            autoAgentRouting=False,
            runDbProbe=False,
            runDbSearch=False,
        )
        result = await orchestrator_agent.run_orchestrator_agent(request)
    finally:
        restore_nlu()

    assert result.ok is True
    assert result.agent_call == "none"
    assert result.merged_filters.place == "Bali"
    assert result.merged_filters.activity_tokens is not None
    assert "cave" in result.merged_filters.activity_tokens
    assert "wreck" in result.merged_filters.activity_tokens


def build_cases() -> list[EvalCase]:
    return [
        EvalCase("nlu_wrapped_json", _case_nlu_wrapped_json),
        EvalCase("nlu_fail_soft_parse", _case_nlu_fail_soft_parse),
        EvalCase("search_filters_parse", _case_search_filters_parse),
        EvalCase("booking_collected_extract", _case_booking_collected_extract),
        EvalCase("booking_ready_extract", _case_booking_ready_extract),
        EvalCase("orchestrator_booking_precedence", _case_orchestrator_booking_precedence),
        EvalCase("orchestrator_filter_merge", _case_orchestrator_filter_merge),
    ]


async def main() -> int:
    cases = build_cases()
    failures = 0
    print("alpha->beta parity eval start")
    for case in cases:
        try:
            await case.run()
            print(f"[PASS] {case.name}")
        except Exception as exc:  # noqa: BLE001 - eval runner should continue through all cases
            failures += 1
            print(f"[FAIL] {case.name}: {exc}")

    total = len(cases)
    passed = total - failures
    print(f"alpha->beta parity eval done: {passed}/{total} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))


