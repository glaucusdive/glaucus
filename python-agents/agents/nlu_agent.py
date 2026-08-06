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
from utils.openai_client import OPENAI_CHAT_MODEL, get_openai_client

logger = logging.getLogger(__name__)

# Maximum tokens returned by the NLU call (matches TypeScript: max_completion_tokens=400)
_MAX_TOKENS = 400


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
    client = get_openai_client()
    user_content = _build_user_content(request)

    try:
        response = await client.chat.completions.create(
            model=OPENAI_CHAT_MODEL,
            messages=[
                {"role": "system", "content": NLU_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            max_completion_tokens=_MAX_TOKENS,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        logger.error("NLU OpenAI call failed: %s", exc)
        return NluResponse(ok=False, error=str(exc))

    raw = response.choices[0].message.content or ""
    parsed = _parse_json_object(raw)
    if parsed is None:
        return NluResponse(ok=False, error="parse_failed: no JSON object in response")

    try:
        # Normalise trip_product_type (mirrors TypeScript preprocess)
        tpt = parsed.get("trip_product_type")
        if isinstance(tpt, str):
            t = tpt.lower().strip().replace(" ", "_").replace("-", "_")
            if t in ("liveaboard", "live_aboard", "liveboard"):
                parsed["trip_product_type"] = "liveaboard"
            elif t in ("dive_resort", "resort", "dive_resorts"):
                parsed["trip_product_type"] = "dive_resort"
            elif t in ("dive_shop", "dive_shops", "day_trip", "day_trips"):
                parsed["trip_product_type"] = "dive_shop"
            else:
                parsed["trip_product_type"] = None

        data = InterpretedTurn.model_validate(parsed)
        return NluResponse(ok=True, data=data)
    except Exception as exc:
        logger.warning("NLU validation failed: %s — raw: %s", exc, raw[:300])
        return NluResponse(ok=False, error=f"validation_failed: {exc}")

