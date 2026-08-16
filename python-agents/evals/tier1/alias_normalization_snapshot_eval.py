"""
Alias normalization snapshot eval for beta python-agents.

Purpose:
- Guard alpha->beta parity for country and dive type alias normalization.
- Keep deterministic outputs without requiring live Supabase connectivity.

Run:
  python3 evals/tier1/alias_normalization_snapshot_eval.py
"""
from __future__ import annotations

import asyncio
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from models.search_models import SearchFilters
from utils import supabase_directory


@dataclass
class SnapshotCase:
    name: str
    message: str
    raw_filters: dict[str, Any]
    expected_filters: dict[str, Any]


def _patch_attr(module: Any, attr: str, replacement: Any) -> Callable[[], None]:
    original = getattr(module, attr)
    setattr(module, attr, replacement)

    def restore() -> None:
        setattr(module, attr, original)

    return restore


def _country_alias_map() -> dict[str, str]:
    return {
        "fiji": "Fiji",
        "usa": "United States",
        "u s a": "United States",
        "united states": "United States",
        "bahamas": "Bahamas",
        "bahama": "Bahamas",
    }


def _norm_key(text: str) -> str:
    phrase = re.sub(r"^the\s+", "", text.strip(), flags=re.IGNORECASE).strip()
    return re.sub(r"[\s_\-]+", " ", phrase.casefold())


async def _fake_resolve_country_alias(country_text: str | None) -> str | None:
    if not country_text:
        return None
    return _country_alias_map().get(_norm_key(country_text))


async def _run_case(case: SnapshotCase) -> None:
    filters = SearchFilters.model_validate(case.raw_filters)
    normalized = await supabase_directory.normalize_search_filters_aliases(filters)
    snapshot = normalized.model_dump(by_alias=True)

    print(f"[SNAPSHOT] {case.name}")
    print(json.dumps({"message": case.message, "filters": snapshot}, indent=2, sort_keys=True))

    assert snapshot == case.expected_filters, (
        f"snapshot mismatch for {case.name}\n"
        f"expected={json.dumps(case.expected_filters, sort_keys=True)}\n"
        f"actual={json.dumps(snapshot, sort_keys=True)}"
    )


def build_cases() -> list[SnapshotCase]:
    return [
        SnapshotCase(
            name="liveboard_in_fiji",
            message="I want liveboard in Fiji",
            raw_filters={"country": None, "place": "Fiji", "diveTypes": ["liveboard"]},
            expected_filters={
                "country": "Fiji",
                "place": None,
                "region": None,
                "minRating": None,
                "languages": None,
                "diveTypes": ["Liveaboard"],
                "activityTokens": None,
            },
        ),
        SnapshotCase(
            name="resorts_in_usa",
            message="show resorts in USA",
            raw_filters={"country": "USA", "place": None, "diveTypes": ["resort"]},
            expected_filters={
                "country": "United States",
                "place": None,
                "region": None,
                "minRating": None,
                "languages": None,
                "diveTypes": ["Dive Resort"],
                "activityTokens": None,
            },
        ),
        SnapshotCase(
            name="day_trips_in_the_bahamas",
            message="day trips in the bahamas",
            raw_filters={"country": None, "place": "the bahamas", "diveTypes": ["day trips"]},
            expected_filters={
                "country": "Bahamas",
                "place": None,
                "region": None,
                "minRating": None,
                "languages": None,
                "diveTypes": ["Dive Shop"],
                "activityTokens": None,
            },
        ),
    ]


async def main() -> int:
    restore_resolver = _patch_attr(supabase_directory, "resolve_country_alias", _fake_resolve_country_alias)
    try:
        failures = 0
        cases = build_cases()
        print("alias normalization snapshot eval start")
        for case in cases:
            try:
                await _run_case(case)
                print(f"[PASS] {case.name}")
            except Exception as exc:  # noqa: BLE001
                failures += 1
                print(f"[FAIL] {case.name}: {exc}")

        total = len(cases)
        passed = total - failures
        print(f"alias normalization snapshot eval done: {passed}/{total} passed")
        return 1 if failures else 0
    finally:
        restore_resolver()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))




