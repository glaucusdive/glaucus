"""
Booking Agent — multi-turn LLM assistant that collects booking details.

Equivalent to the booking LLM call (buildBookingSystemPrompt + streaming
chat completion) in runAiSearchPostHandler.ts. The agent returns:
  - a conversational reply for the user
  - the updated COLLECTED payload (for pre-filling the form on the TypeScript side)
  - bookingReady + finalPayload when BOOKING_READY is emitted

All actual Supabase writes (saving the booking_submission) stay in the
TypeScript /api/booking.post.ts handler.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from models.booking_models import BookingAgentRequest, BookingAgentResponse
from prompts.booking_prompt import build_booking_system_prompt
from utils.openai_client import OPENAI_CHAT_MODEL, get_openai_client

logger = logging.getLogger(__name__)

_MAX_TOKENS = 1024

# Patterns to extract BOOKING_READY and COLLECTED blocks
_BOOKING_READY_RE = re.compile(
    r"BOOKING_READY:\s*(\{.*?\}(?:\s*\]?\s*\})*)",
    re.DOTALL | re.IGNORECASE,
)
_COLLECTED_RE = re.compile(
    r"COLLECTED:\s*(\{.*?\}(?:\s*\]?\s*\})*)",
    re.DOTALL | re.IGNORECASE,
)


def _extract_json_block(pattern: re.Pattern[str], text: str) -> dict[str, Any] | None:
    m = pattern.search(text)
    if not m:
        return None
    # Try progressively-growing slices to find a valid JSON object
    raw = m.group(1).strip()
    # Find the outer braces
    start = raw.find("{")
    if start < 0:
        return None
    depth = 0
    for i in range(start, len(raw)):
        if raw[i] == "{":
            depth += 1
        elif raw[i] == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(raw[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _strip_structured_blocks(text: str) -> str:
    """Remove BOOKING_READY and COLLECTED lines from the user-facing reply."""
    text = _BOOKING_READY_RE.sub("", text)
    text = _COLLECTED_RE.sub("", text)
    return text.strip()


def _build_messages(request: BookingAgentRequest) -> list[dict[str, str]]:
    system_prompt = build_booking_system_prompt(
        shop_name=request.shop_name,
        course_names=request.course_names,
        dive_site_names=request.dive_site_names,
        existing_payload=request.existing_payload,
        next_step_hint=request.next_step_hint,
        rental_equipment_names=request.rental_equipment_names,
    )
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for h in request.history[-12:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": request.message})
    return messages


async def run_booking_agent(request: BookingAgentRequest) -> BookingAgentResponse:
    """Run one booking-assistant turn and return the structured response."""
    client = get_openai_client()
    messages = _build_messages(request)

    try:
        response = await client.chat.completions.create(
            model=OPENAI_CHAT_MODEL,
            messages=messages,  # type: ignore[arg-type]
            max_completion_tokens=_MAX_TOKENS,
        )
    except Exception as exc:
        logger.error("Booking OpenAI call failed: %s", exc)
        return BookingAgentResponse(ok=False, error=str(exc))

    raw = response.choices[0].message.content or ""

    booking_ready_payload = _extract_json_block(_BOOKING_READY_RE, raw)
    collected_payload = _extract_json_block(_COLLECTED_RE, raw)
    user_reply = _strip_structured_blocks(raw)

    if booking_ready_payload is not None:
        return BookingAgentResponse(
            ok=True,
            reply=user_reply or "Your booking details are complete!",
            booking_ready=True,
            final_payload=booking_ready_payload,
            collected_payload=collected_payload or booking_ready_payload,
        )

    return BookingAgentResponse(
        ok=True,
        reply=user_reply,
        booking_ready=False,
        collected_payload=collected_payload,
    )

