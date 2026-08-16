"""
Tier 1 golden-dataset eval runner for beta python-agents.

This runner validates deterministic alias/filter normalization behavior from a
JSON dataset at `python-agents/evals/tier1/golden_cases.json`.

Run from `python-agents/`:
  python3 evals/tier1/run_tier1_eval.py
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from models.search_models import SearchFilters
from utils import supabase_directory


def _patch_attr(module: Any, attr: str, replacement: Any) -> Callable[[], None]:
    original = getattr(module, attr)
    setattr(module, attr, replacement)

    def restore() -> None:
        setattr(module, attr, original)

    return restore


def _normalize_key(text: str) -> str:
    phrase = re.sub(r"^the\s+", "", str(text or "").strip(), flags=re.IGNORECASE).strip()
    return re.sub(r"[\s_\-]+", " ", phrase.casefold())


def _build_alias_map(raw: dict[str, str] | None) -> dict[str, str]:
    out: dict[str, str] = {}
    for alias, canonical in (raw or {}).items():
        if not canonical:
            continue
        out[_normalize_key(alias)] = str(canonical).strip()
    return out


def _load_dataset(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        dataset = json.load(f)
    if not isinstance(dataset, dict):
        raise ValueError("Dataset must be a JSON object")
    if not isinstance(dataset.get("cases"), list):
        raise ValueError("Dataset must include a `cases` array")
    return dataset


def _normalise_filter_shape(raw: dict[str, Any]) -> dict[str, Any]:
    return SearchFilters.model_validate(raw).model_dump(by_alias=True)


def _assert_subset(expected: dict[str, Any], actual: dict[str, Any]) -> list[str]:
    mismatches: list[str] = []
    for key, expected_value in expected.items():
        actual_value = actual.get(key)
        if actual_value != expected_value:
            mismatches.append(
                f"{key}: expected={json.dumps(expected_value, sort_keys=True)} actual={json.dumps(actual_value, sort_keys=True)}"
            )
    return mismatches


async def _run_case(case: dict[str, Any]) -> tuple[bool, str]:
    case_id = str(case.get("id") or "unnamed_case")
    message = str(case.get("message") or "")

    input_filters_raw = case.get("inputFilters") or {}
    expected_raw = case.get("expectedNormalizedFilters") or {}
    assert_mode = str(case.get("assertMode") or "exact").strip().lower()

    input_filters = SearchFilters.model_validate(input_filters_raw)
    expected = _normalise_filter_shape(expected_raw)

    normalized = await supabase_directory.normalize_search_filters_aliases(input_filters)
    actual = normalized.model_dump(by_alias=True)

    snapshot = {
        "id": case_id,
        "message": message,
        "inputFilters": _normalise_filter_shape(input_filters_raw),
        "actualNormalizedFilters": actual,
    }
    print(json.dumps(snapshot, indent=2, sort_keys=True))

    if assert_mode == "subset":
        mismatches = _assert_subset(expected_raw, actual)
        if mismatches:
            return False, f"subset mismatch -> {'; '.join(mismatches)}"
        return True, ""

    if actual != expected:
        return (
            False,
            "exact mismatch -> "
            f"expected={json.dumps(expected, sort_keys=True)} "
            f"actual={json.dumps(actual, sort_keys=True)}",
        )
    return True, ""


async def main() -> int:
    parser = argparse.ArgumentParser(description="Run Tier 1 golden dataset evals.")
    parser.add_argument(
        "--dataset",
        default=str(Path(__file__).resolve().with_name("golden_cases.json")),
        help="Path to Tier 1 golden dataset JSON",
    )
    parser.add_argument(
        "--use-live-country-resolver",
        action="store_true",
        help="Use live country alias resolver (Supabase/env dependent) instead of dataset map.",
    )
    args = parser.parse_args()

    dataset_path = Path(args.dataset).resolve()
    dataset = _load_dataset(dataset_path)

    alias_map = _build_alias_map(dataset.get("countryAliasMap"))

    async def _fake_resolve_country_alias(country_text: str | None) -> str | None:
        if not country_text:
            return None
        return alias_map.get(_normalize_key(country_text))

    restore_resolver = None
    if not args.use_live_country_resolver:
        restore_resolver = _patch_attr(supabase_directory, "resolve_country_alias", _fake_resolve_country_alias)

    failures = 0
    cases = dataset.get("cases", [])
    print(f"tier1 eval start: dataset={dataset_path}")
    try:
        for raw_case in cases:
            try:
                ok, reason = await _run_case(raw_case)
                case_id = str(raw_case.get("id") or "unnamed_case")
                if ok:
                    print(f"[PASS] {case_id}")
                else:
                    failures += 1
                    print(f"[FAIL] {case_id}: {reason}")
            except Exception as exc:  # noqa: BLE001
                failures += 1
                case_id = str(raw_case.get("id") or "unnamed_case")
                print(f"[FAIL] {case_id}: {exc}")
    finally:
        if restore_resolver:
            restore_resolver()

    total = len(cases)
    passed = total - failures
    print(f"tier1 eval done: {passed}/{total} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))


