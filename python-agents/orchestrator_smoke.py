"""Local smoke test for the Python orchestrator agent.

Run from python-agents/:
  python orchestrator_smoke.py
"""
from __future__ import annotations

import asyncio
import json

from agents.orchestrator_agent import run_orchestrator_agent
from models.orchestrator_models import OrchestratorRequest


async def _main() -> None:
    req = OrchestratorRequest.model_validate(
        {
            "message": "find me cave diving in Mexico",
            "history": [],
            "wantsBooking": False,
            "regexReferent": "Mexico",
            "preferShopOrRegexOverDestination": False,
            "baseFilters": None,
            "runSearchAgent": False,
            "runBookingAgent": False,
            "bookingRequest": None,
        }
    )
    res = await run_orchestrator_agent(req)
    print("######=>", json.dumps(res.model_dump(by_alias=True), indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(_main())

