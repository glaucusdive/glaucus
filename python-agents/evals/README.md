# Alpha -> Beta Parity Evals

This folder contains deterministic evals for beta `python-agents` that mirror key alpha (TS-only) expectations.

## What this covers

- NLU JSON parsing and fail-soft fallback behavior
- Search `FILTERS` extraction behavior
- Booking `COLLECTED` and `BOOKING_READY` block extraction
- Orchestrator routing precedence (`booking` over `search` when booking intent exists)
- Orchestrator filter merge behavior (destination + activity terms)

These evals patch LLM calls with fixed responses, so they do not require API keys.

## Run

From `python-agents/`:

```bash
python3 evals/tier1/run_all_tier1_eval.py
python3 evals/tier2/run_tier2_functional_eval.py
```

Expected output ends with:

```text
alpha->beta parity eval done: 7/7 passed
```

## Notes

- These are parity-style evals, not full endpoint integration tests.
- Keep adding cases as alpha behavior is migrated into beta Python agents.
- Tier 1 deterministic suites (golden dataset + snapshots + alpha->beta parity) live in `python-agents/evals/tier1/`.
- Tier 2 live functional checks (real agent + Supabase + LLM-judge) live in `python-agents/evals/tier2/` with dataset file `python-agents/evals/tier2/functional_cases.json`.

