"""
NLU Agent — extracts structured intent from a user message.

Equivalent to interpretUserTurn() in server/utils/interpretUserTurn.ts.
The agent calls OpenAI with response_format=json_object and validates the
output against InterpretedTurn.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from models.nlu_models import InterpretedTurn, NluRequest, NluResponse
from prompts.nlu_prompt import NLU_SYSTEM_PROMPT
from utils.llm_chat import run_chat_completion

logger = logging.getLogger(__name__)

# Maximum tokens returned by the NLU call (matches TypeScript: max_completion_tokens=400)
_MAX_TOKENS = 4000


def _fallback_interpreted_turn() -> InterpretedTurn:
    """Fail-soft fallback so callers can continue their routing pipeline."""
    return InterpretedTurn.model_construct(
        goal="unclear",
        booking_readiness=None,
        reasoning_summary="I could not confidently parse structured intent, so I am continuing with fallback routing.",
        confidence=0.0,
    )


def _build_user_content(request: NluRequest) -> str:
    """Combine recent history with the current message (mirrors TypeScript behaviour)."""
    recent = request.history[-6:]
    if recent:
        lines = "\n".join(f"{m.role}: {m.content}" for m in recent)
        return f"Recent conversation:\n{lines}\n\nCurrent message:\n{request.message}"
    return request.message


def _parse_json_object(text: str) -> dict[str, Any] | None:
    """Extract the first JSON object from raw model output."""
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


async def run_nlu_agent(request: NluRequest) -> NluResponse:
    """Call the NLU LLM and return a validated InterpretedTurn."""
    user_content = _build_user_content(request)
    messages: list[dict[str, str]] = [
        {"role": "system", "content": NLU_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
    print(f"NLU Agent messages: {messages}")
    try:
        raw = await run_chat_completion(
            messages=messages,
            max_completion_tokens=_MAX_TOKENS,
            response_format={"type": "json_object"},
            run_name="nlu_agent",
            metadata={"goal": "intent_extraction"},
        )
    except Exception as exc:
        logger.error("NLU LLM call failed: %s", exc)
        fallback = _fallback_interpreted_turn()
        return NluResponse(ok=True, data=fallback, error=f"llm_failed: {exc}")

    print(f"NLU raw output: {raw[:400]}")  # Debugging
    parsed = _parse_json_object(raw)
    if parsed is None:
        logger.warning("NLU parse failed: no JSON object in response")
        fallback = _fallback_interpreted_turn()
        return NluResponse(ok=True, data=fallback, error="parse_failed: no JSON object in response")

    try:
        # Normalise trip_product_type 
        print(f"NLU parsed output: {parsed}")  # Debugging
        tpt = parsed.get("trip_product_type")
        if tpt is None:
            parsed["trip_product_type"] = None
        elif isinstance(tpt, str):
            t = tpt.lower().strip().replace(" ", "_").replace("-", "_")
            if t in ("", "null", "none", "unknown", "n/a"):
                parsed["trip_product_type"] = None
            elif t in ("liveaboard", "live_aboard", "liveboard"):
                parsed["trip_product_type"] = "liveaboard"
            elif t in ("dive_resort", "resort", "dive_resorts"):
                parsed["trip_product_type"] = "dive_resort"
            elif t in ("dive_shop", "dive_shops", "day_trip", "day_trips"):
                parsed["trip_product_type"] = "dive_shop"
            else:
                parsed["trip_product_type"] = None
        else:
            parsed["trip_product_type"] = None

        data = InterpretedTurn.model_validate(parsed)
        return NluResponse(ok=True, data=data)
    except Exception as exc:
        logger.warning("NLU validation failed: %s — raw: %s", exc, raw[:300])
        fallback = _fallback_interpreted_turn()
        return NluResponse(ok=True, data=fallback, error=f"validation_failed: {exc}")

