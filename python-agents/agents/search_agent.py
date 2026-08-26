"""
Search Agent — extracts FILTERS + conversational MESSAGE from a free-text query.

Equivalent to the SYSTEM_PROMPT / first LLM pass in runAiSearchPostHandler.ts
(SEARCH_DIVE_SYSTEM_PROMPT). The TypeScript layer feeds these filters into
buildDiveShopQuery() against Supabase.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from models.search_models import SearchAgentRequest, SearchAgentResponse, SearchFilters
from prompts.search_prompt import SEARCH_DIVE_SYSTEM_PROMPT
from utils.llm_chat import run_chat_completion
from utils.supabase_directory import normalize_search_filters_aliases, normalize_trip_product_type

logger = logging.getLogger(__name__)

_MAX_TOKENS = 512

# Regex to capture the FILTERS: {...} block and the MESSAGE: line
_FILTERS_RE = re.compile(
    r"FILTERS:\s*(\{.*?})\s*MESSAGE:\s*(.*)",
    re.DOTALL | re.IGNORECASE,
)


def _build_messages(request: SearchAgentRequest) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [
        {"role": "system", "content": SEARCH_DIVE_SYSTEM_PROMPT}
    ]
    for h in request.history[-10:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": request.message})
    return messages


def _parse_response(raw: str) -> tuple[dict[str, Any] | None, str | None]:
    """Extract FILTERS dict and MESSAGE string from the raw model output."""
    m = _FILTERS_RE.search(raw)
    if not m:
        return None, None
    filters_str = m.group(1).strip()
    message_text = m.group(2).strip()
    try:
        filters_dict = json.loads(filters_str)
        return filters_dict, message_text
    except json.JSONDecodeError:
        return None, message_text


async def run_search_agent(request: SearchAgentRequest) -> SearchAgentResponse:
    """Call the search LLM and return validated SearchFilters + a user-facing message."""
    messages = _build_messages(request)

    try:
        raw = await run_chat_completion(
            messages=messages,
            max_completion_tokens=_MAX_TOKENS,
            run_name="search_agent",
            metadata={"goal": "search_filter_extraction"},
        )
    except Exception as exc:
        logger.error("Search LLM call failed: %s", exc)
        return SearchAgentResponse(ok=False, message=None, error=str(exc))

    filters_dict, message_text = _parse_response(raw)

    if filters_dict is None:
        logger.warning("Search agent: could not parse FILTERS from: %s", raw[:400])
        return SearchAgentResponse(
            ok=False,
            message=message_text,
            error="parse_failed: no FILTERS block in response",
        )

    try:
        trip_type = normalize_trip_product_type(
            filters_dict.get("trip_product_type") if isinstance(filters_dict.get("trip_product_type"), str) else None
        )
        dive_type_from_trip = None
        if trip_type == "liveaboard":
            dive_type_from_trip = ["Liveaboard"]
        elif trip_type == "dive_resort":
            dive_type_from_trip = ["Dive Resort"]
        elif trip_type == "dive_shop":
            dive_type_from_trip = ["Dive Shop"]

        # Map camelCase keys from model output to SearchFilters aliases
        normalised: dict[str, Any] = {
            "country": filters_dict.get("country"),
            "place": filters_dict.get("place"),
            "region": filters_dict.get("region"),
            "minRating": filters_dict.get("minRating"),
            "languages": filters_dict.get("languages"),
            "diveTypes": filters_dict.get("diveTypes") or dive_type_from_trip,
            "activityTokens": filters_dict.get("activityTokens"),
        }
        filters = SearchFilters.model_validate(normalised)
        filters = await normalize_search_filters_aliases(filters)
        return SearchAgentResponse(ok=True, filters=filters, message=message_text)
    except Exception as exc:
        logger.warning("Search filter validation failed: %s", exc)
        return SearchAgentResponse(ok=False, message=message_text, error=str(exc))

