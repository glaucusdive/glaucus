# Tier 1 Golden Dataset

Tier 1 covers deterministic, dataset-backed normalization checks for beta `python-agents`.

## Files

- `python-agents/evals/tier1/run_all_tier1_eval.py`
- `python-agents/evals/tier1/run_tier1_eval.py`
- `python-agents/evals/tier1/alpha_parity_eval.py`
- `python-agents/evals/tier1/alias_normalization_snapshot_eval.py`
- `python-agents/evals/tier1/golden_cases.json`

## Purpose

- Validate alias normalization and filter-shape expectations.
- Keep checks deterministic by default (no live DB/LLM required).

## Run

From `python-agents/`:

```bash
python3 evals/tier1/run_all_tier1_eval.py
```

This runs:

- `run_tier1_eval.py` (golden dataset)
- `alias_normalization_snapshot_eval.py` (snapshot checks)
- `alpha_parity_eval.py` (alpha->beta parity checks)

You can still run only the golden dataset suite directly:

```bash
python3 evals/tier1/run_tier1_eval.py
```

Optional live country-alias resolver mode:

```bash
python3 evals/tier1/run_tier1_eval.py --use-live-country-resolver
```

## Notes

- Default mode patches country alias resolver from dataset map to avoid external dependencies.
- This is Tier 1 only; live agent + DB + LLM-judge tests are Tier 2 in `python-agents/evals/tier2/`.

