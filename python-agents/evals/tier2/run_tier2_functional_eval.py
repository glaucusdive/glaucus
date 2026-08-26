"""
Tier 2 functional eval runner for beta python-agents.

This runner executes live beta behavior:
- Calls real orchestrator agent logic (LLM-backed NLU/search path)
- Forces read-only Supabase DB search via runDbSearch=true
- Grades assistant response quality with an LLM judge and threshold gate

Run from `python-agents/`:
  python3 evals/tier2/run_tier2_functional_eval.py
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Load python-agents/.env before importing modules that resolve LLM provider/key at import time.
load_dotenv(ROOT / ".env")

from agents.orchestrator_agent import run_orchestrator_agent
from models.orchestrator_models import OrchestratorRequest
from models.search_models import SearchFilters
from utils.llm_chat import run_chat_completion
from utils.llm_client import get_llm_api_key, get_llm_provider
from utils.supabase_directory import is_supabase_configured

_JUDGE_MAX_TOKENS = 500


def _load_dataset(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("Dataset must be a JSON object")
    cases = data.get("cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("Dataset must contain a non-empty `cases` array")
    return data


def _check_runtime_prereqs() -> list[str]:
    issues: list[str] = []
    if not is_supabase_configured():
        issues.append("Supabase is not configured (need SUPABASE_URL + service/anon key)")
    try:
        get_llm_api_key()
    except Exception as exc:  # noqa: BLE001
        issues.append(f"LLM API key is not configured: {exc}")
    return issues


async def _judge_case(
    *,
    case_id: str,
    message: str,
    rubric: str,
    threshold: float,
    assistant_response: str,
    orchestrator_snapshot: dict[str, Any],
) -> dict[str, Any]:
    judge_prompt = (
        "You are an evaluation judge for a scuba dive search assistant. "
        "Score how well the assistant response satisfies the user message and rubric.\n\n"
        f"CASE ID: {case_id}\n"
        f"USER MESSAGE: {message}\n"
        f"RUBRIC: {rubric}\n"
        f"THRESHOLD: {threshold}\n\n"
        "ASSISTANT RESPONSE:\n"
        f"{assistant_response}\n\n"
        "ORCHESTRATOR SNAPSHOT (JSON):\n"
        f"{json.dumps(orchestrator_snapshot, sort_keys=True)}\n\n"
        "Return JSON only with schema:\n"
        "{\n"
        '  "score": number,\n'
        '  "pass": boolean,\n'
        '  "reason": string\n'
        "}\n"
        "Rules:\n"
        "- score is 0.0 to 1.0\n"
        "- pass=true only if score >= threshold\n"
        "- reason must be concise and specific\n"
    )
    raw = await run_chat_completion(
        messages=[
            {"role": "system", "content": "You are a strict, fair QA evaluator."},
            {"role": "user", "content": judge_prompt},
        ],
        max_completion_tokens=_JUDGE_MAX_TOKENS,
        response_format={"type": "json_object"},
        run_name="tier2_functional_judge",
        metadata={"goal": "functional_eval_judging", "case_id": case_id},
    )
    return json.loads(raw)


def _contains_all(required: list[str] | None, actual: list[str] | None) -> bool:
    if not required:
        return True
    if not actual:
        return False
    actual_l = {s.strip().casefold() for s in actual if isinstance(s, str)}
    return all(str(v).strip().casefold() in actual_l for v in required)


async def _run_case(case: dict[str, Any], default_threshold: float) -> tuple[bool, dict[str, Any]]:
    case_id = str(case.get("id") or "unnamed_case")
    message = str(case.get("message") or "").strip()
    if not message:
        raise ValueError(f"{case_id}: message is required")

    history = case.get("history") or []
    base_filters_raw = case.get("baseFilters") or {}
    base_filters = SearchFilters.model_validate(base_filters_raw)

    req = OrchestratorRequest.model_validate(
        {
            "message": message,
            "history": history,
            "wantsBooking": False,
            "baseFilters": base_filters.model_dump(by_alias=True),
            "autoAgentRouting": True,
            "runSearchAgent": True,
            "runBookingAgent": False,
            "runDbProbe": False,
            "runDbSearch": True,
        }
    )
    
    print(f"[RUN CASE] {case_id}: message={message} baseFilters={base_filters.model_dump(by_alias=True)} history={history}")

    result = await run_orchestrator_agent(req)
    
    print(f"[RUN CASE] {case_id}: result={result.model_dump(by_alias=True)}")

    expects = case.get("expects") or {}
    min_db_results = int(expects.get("minDbResults", 0) or 0)
    required_country = expects.get("requiredCountry")
    required_dive_types = expects.get("requiredDiveTypes")

    db_ok = bool(result.db_search and result.db_search.get("ok") is True)
    db_count = int((result.db_search or {}).get("count") or 0)

    merged_filters = result.merged_filters.model_dump(by_alias=True)
    country_ok = True
    if isinstance(required_country, str) and required_country.strip():
        country_ok = str(merged_filters.get("country") or "").strip().casefold() == required_country.strip().casefold()

    dive_types_ok = _contains_all(required_dive_types if isinstance(required_dive_types, list) else None, merged_filters.get("diveTypes"))

    assistant_response = ""
    if result.search and result.search.message:
        assistant_response = result.search.message
    elif result.booking and result.booking.reply:
        assistant_response = result.booking.reply

    judge_cfg = case.get("judge") or {}
    threshold = float(judge_cfg.get("threshold") or default_threshold)
    rubric = str(judge_cfg.get("rubric") or "Response should be relevant, concise, and aligned with user intent.")

    orchestrator_snapshot = {
        "agentCall": result.agent_call,
        "interpretTurn": result.interpret_turn.model_dump(by_alias=True),
        "mergedFilters": merged_filters,
        "dbSearch": result.db_search,
        "activityLog": result.activity_log,
    }

    judge = await _judge_case(
        case_id=case_id,
        message=message,
        rubric=rubric,
        threshold=threshold,
        assistant_response=assistant_response,
        orchestrator_snapshot=orchestrator_snapshot,
    )

    judge_score = float(judge.get("score") or 0.0)
    judge_pass = bool(judge.get("pass")) and judge_score >= threshold

    pass_reasons: list[str] = []
    if not db_ok:
        pass_reasons.append("dbSearch not ok")
    if db_count < min_db_results:
        pass_reasons.append(f"dbSearch count {db_count} < minDbResults {min_db_results}")
    if not country_ok:
        pass_reasons.append(f"country mismatch: expected {required_country}, got {merged_filters.get('country')}")
    if not dive_types_ok:
        pass_reasons.append(
            f"diveTypes mismatch: required {required_dive_types}, got {merged_filters.get('diveTypes')}"
        )
    if not judge_pass:
        pass_reasons.append(
            f"judge score {judge_score:.2f} below threshold {threshold:.2f}; reason={judge.get('reason')}"
        )

    case_pass = len(pass_reasons) == 0

    snapshot = {
        "id": case_id,
        "message": message,
        "llmProvider": get_llm_provider(),
        "agentCall": result.agent_call,
        "mergedFilters": merged_filters,
        "dbSearch": result.db_search,
        "assistantResponse": assistant_response,
        "judge": {
            "threshold": threshold,
            "score": judge_score,
            "pass": judge_pass,
            "reason": judge.get("reason"),
        },
        "checks": {
            "dbOk": db_ok,
            "minDbResults": min_db_results,
            "dbCount": db_count,
            "countryOk": country_ok,
            "diveTypesOk": dive_types_ok,
        },
    }

    if not case_pass:
        snapshot["failReasons"] = pass_reasons

    return case_pass, snapshot


async def main() -> int:
    parser = argparse.ArgumentParser(description="Run Tier 2 functional eval (live orchestrator + DB + LLM judge).")
    parser.add_argument(
        "--dataset",
        default=str(Path(__file__).resolve().with_name("functional_cases.json")),
        help="Path to Tier 2 functional dataset JSON",
    )
    parser.add_argument(
        "--default-threshold",
        type=float,
        default=0.75,
        help="Fallback judge threshold when a case does not provide one",
    )
    parser.add_argument(
        "--max-cases",
        type=int,
        default=0,
        help="Optional cap on number of cases (0 means all)",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate dataset shape only; skip live agent, DB, and judge calls.",
    )
    args = parser.parse_args()

    dataset_path = Path(args.dataset).resolve()
    dataset = _load_dataset(dataset_path)
    default_threshold = float(dataset.get("defaultJudgeThreshold") or args.default_threshold)

    cases = dataset.get("cases", [])
    if args.max_cases > 0:
        cases = cases[: args.max_cases]

    print(f"tier2 functional eval start: dataset={dataset_path} cases={len(cases)}")

    if args.validate_only:
        for case in cases:
            _ = str(case.get("id") or "unnamed_case")
            _ = str(case.get("message") or "")
            _ = SearchFilters.model_validate(case.get("baseFilters") or {})
        print("tier2 functional eval validate-only: dataset is valid")
        return 0

    prereq_issues = _check_runtime_prereqs()
    if prereq_issues:
        for issue in prereq_issues:
            print(f"[ERROR] {issue}")
        return 2

    failures = 0
    for case in cases:
        case_id = str(case.get("id") or "unnamed_case")
        try:
            ok, snapshot = await _run_case(case, default_threshold)
            print(json.dumps(snapshot, indent=2, sort_keys=True))
            if ok:
                print(f"[PASS] {case_id}")
            else:
                failures += 1
                print(f"[FAIL] {case_id}")
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print(f"[FAIL] {case_id}: {exc}")

    total = len(cases)
    passed = total - failures
    print(f"tier2 functional eval done: {passed}/{total} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

