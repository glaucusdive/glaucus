"""
Tier 2 multi-turn response logger for beta python-agents.

Purpose:
- Run live orchestrator turns with history continuity.
- Persist full response payloads for human review.
- Compare each turn with the most recent previous run of the same prompt.
- Flag potential regressions when similarity drops below threshold (default 0.80).
- Write one timestamp-suffixed output file per run (instead of one shared log file).

Run from `python-agents/`:
  python3 evals/tier2/multi_turn_response_logger.py --turn "find me cave diving in Mexico"

Interactive mode (no --turn flags):
  python3 evals/tier2/multi_turn_response_logger.py
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any
from uuid import uuid4

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Load .env before importing modules that resolve provider env at import time.
load_dotenv(ROOT / ".env")

from agents.orchestrator_agent import run_orchestrator_agent
from models.orchestrator_models import OrchestratorRequest


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _timestamp_suffix() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _normalize_prompt(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().casefold())


def _assistant_text(response: dict[str, Any]) -> str:
    search = response.get("search") or {}
    booking = response.get("booking") or {}
    interpret = response.get("interpretTurn") or {}
    return (
        search.get("message")
        or booking.get("reply")
        or interpret.get("reasoning_summary")
        or ""
    )


def _comparable_view(response: dict[str, Any]) -> dict[str, Any]:
    interpret = response.get("interpretTurn") or {}
    merged = response.get("mergedFilters") or {}
    return {
        "agentCall": response.get("agentCall"),
        "interpretTurn": {
            "goal": interpret.get("goal"),
            "destination_text": interpret.get("destination_text"),
            "activity_terms": interpret.get("activity_terms"),
            "dive_site_type_label": interpret.get("dive_site_type_label"),
            "trip_product_type": interpret.get("trip_product_type"),
            "primary_verb": interpret.get("primary_verb"),
        },
        "mergedFilters": {
            "country": merged.get("country"),
            "place": merged.get("place"),
            "region": merged.get("region"),
            "diveTypes": merged.get("diveTypes"),
            "activityTokens": merged.get("activityTokens"),
        },
        "assistant": _assistant_text(response),
    }


def _to_similarity_text(view: dict[str, Any]) -> str:
    return json.dumps(view, sort_keys=True, ensure_ascii=True)


def _similarity_ratio(current_view: dict[str, Any], prior_view: dict[str, Any]) -> float:
    return SequenceMatcher(
        None,
        _to_similarity_text(current_view),
        _to_similarity_text(prior_view),
    ).ratio()


def _load_log_records(log_dir: Path) -> list[dict[str, Any]]:
    if not log_dir.exists() or not log_dir.is_dir():
        return []

    records: list[dict[str, Any]] = []
    # Read historical records from all prior timestamped session files.
    for file_path in sorted(log_dir.glob("functional_response_logs_*.json")):
        try:
            payload = json.loads(file_path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001 - keep logger fail-soft on corrupt historical files
            continue

        rows = payload.get("records") if isinstance(payload, dict) else None
        if not isinstance(rows, list):
            continue

        for row in rows:
            if isinstance(row, dict):
                records.append(row)

    return records


def _write_session_file(output_path: Path, payload: dict[str, Any]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")


def _looks_like_legacy_jsonl(path: Path) -> bool:
    return path.suffix.lower() == ".jsonl"


def _load_legacy_jsonl_records(path: Path) -> list[dict[str, Any]]:
    if not path.exists() or not path.is_file():
        return []

    out: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            raw = line.strip()
            if not raw:
                continue
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                out.append(parsed)
    return out


def _latest_record_for_prompt(records: list[dict[str, Any]], prompt_norm: str) -> dict[str, Any] | None:
    for record in reversed(records):
        if str(record.get("promptNorm") or "") == prompt_norm:
            return record
    return None


def _collect_turns(turn_args: list[str] | None) -> list[str]:
    if turn_args:
        return [t for t in (s.strip() for s in turn_args) if t]

    turns: list[str] = []
    print("Interactive mode. Type a user message per line. Empty line or /done to finish.")
    while True:
        raw = input("you> ").strip()
        if not raw or raw in {"/done", "/exit", "exit", "quit"}:
            break
        turns.append(raw)
    return turns


async def _run_turn(
    *,
    message: str,
    history: list[dict[str, str]],
    run_db_search: bool,
) -> dict[str, Any]:
    request = OrchestratorRequest.model_validate(
        {
            "message": message,
            "history": history,
            "wantsBooking": False,
            "baseFilters": {},
            "autoAgentRouting": True,
            "runSearchAgent": True,
            "runBookingAgent": False,
            "runDbProbe": False,
            "runDbSearch": run_db_search,
        }
    )
    result = await run_orchestrator_agent(request)
    return result.model_dump(by_alias=True)


async def main() -> int:
    parser = argparse.ArgumentParser(description="Run and log multi-turn live orchestrator responses.")
    parser.add_argument(
        "--turn",
        action="append",
        help="User turn text. Repeat for multi-turn non-interactive runs.",
    )
    parser.add_argument(
        "--log-dir",
        default=str(Path(__file__).resolve().with_name("functional_response_logs")),
        help="Directory where timestamped per-run JSON files are written.",
    )
    parser.add_argument(
        "--similarity-threshold",
        type=float,
        default=0.80,
        help="Flag as issue when similarity with latest same-prompt run is below this threshold.",
    )
    parser.add_argument(
        "--no-db-search",
        action="store_true",
        help="Disable read-only dbSearch for this run.",
    )
    args = parser.parse_args()

    turns = _collect_turns(args.turn)
    if not turns:
        print("No turns provided; exiting.")
        return 0

    log_dir = Path(args.log_dir).resolve()
    run_suffix = _timestamp_suffix()
    output_path = log_dir / f"functional_response_logs_{run_suffix}.json"

    if _looks_like_legacy_jsonl(log_dir):
        prior_records = _load_legacy_jsonl_records(log_dir)
        output_path = log_dir.with_name(f"functional_response_logs_{run_suffix}.json")
        log_dir = output_path.parent
    else:
        prior_records = _load_log_records(log_dir)

    session_id = f"session_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}_{uuid4().hex[:8]}"
    history: list[dict[str, str]] = []
    session_records: list[dict[str, Any]] = []

    print(f"logger start: turns={len(turns)} sessionId={session_id}")
    print(f"output file: {output_path}")

    for idx, message in enumerate(turns, start=1):
        response = await _run_turn(
            message=message,
            history=history,
            run_db_search=not args.no_db_search,
        )

        prompt_norm = _normalize_prompt(message)
        current_view = _comparable_view(response)
        prior = _latest_record_for_prompt(prior_records, prompt_norm)

        similarity = None
        issue = False
        prior_session_id = None
        prior_timestamp = None
        if prior is not None:
            prior_view = prior.get("comparableView") if isinstance(prior.get("comparableView"), dict) else {}
            similarity = _similarity_ratio(current_view, prior_view)
            issue = similarity < float(args.similarity_threshold)
            prior_session_id = prior.get("sessionId")
            prior_timestamp = prior.get("timestamp")

        assistant = _assistant_text(response)
        db_search = response.get("dbSearch") or {}
        db_count = int(db_search.get("count") or 0)
        top_shops = [
            {
                "business_name": shop.get("business_name"),
                "city": shop.get("city"),
                "type": shop.get("type"),
            }
            for shop in (db_search.get("shops") or [])[:10]
            if isinstance(shop, dict)
        ]

        record = {
            "timestamp": _utc_now_iso(),
            "sessionId": session_id,
            "turnIndex": idx,
            "prompt": message,
            "promptNorm": prompt_norm,
            "historyBeforeTurn": history,
            "request": {
                "wantsBooking": False,
                "baseFilters": {},
                "autoAgentRouting": True,
                "runSearchAgent": True,
                "runBookingAgent": False,
                "runDbProbe": False,
                "runDbSearch": not args.no_db_search,
            },
            "response": response,
            "comparableView": current_view,
            "comparison": {
                "threshold": float(args.similarity_threshold),
                "similarityWithLatestSamePrompt": similarity,
                "issue": issue,
                "priorSessionId": prior_session_id,
                "priorTimestamp": prior_timestamp,
            },
            "dbTop10Shops": top_shops,
            "assistantResponse": assistant,
            "dbSearchCount": db_count,
        }

        session_records.append(record)
        prior_records.append(record)

        print(f"\n[TURN {idx}] prompt={message}")
        print(f"- agentCall={response.get('agentCall')} dbSearchCount={db_count}")
        if similarity is None:
            print("- comparison: no prior same-prompt record")
        else:
            print(
                "- comparison: "
                f"similarity={similarity:.3f} threshold={args.similarity_threshold:.2f} issue={issue}"
            )
        print(f"- assistant: {assistant}")

        # Keep the next turn contextualized with user + assistant turns.
        history.append({"role": "user", "content": message})
        if assistant:
            history.append({"role": "assistant", "content": assistant})

    print("\nlogger done")
    session_payload = {
        "createdAt": _utc_now_iso(),
        "sessionId": session_id,
        "similarityThreshold": float(args.similarity_threshold),
        "recordCount": len(session_records),
        "records": session_records,
    }
    _write_session_file(output_path, session_payload)
    print(f"wrote: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

