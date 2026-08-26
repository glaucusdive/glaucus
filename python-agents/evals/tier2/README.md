# Tier 2 Functional Evals

This folder contains Tier 2 live functional evals for beta `python-agents`.

- `run_tier2_functional_eval.py`: actual beta agent + Supabase + LLM-as-judge threshold checks
- `multi_turn_response_logger.py`: live multi-turn runner that logs full agent responses and flags low similarity against prior same-prompt runs

## Dataset path

Functional live cases are maintained at:

- `python-agents/evals/tier2/functional_cases.json`

## Functional dataset schema

```json
{
  "version": "1.0",
  "suite": "tier2_functional_live_agent_db",
  "defaultJudgeThreshold": 0.75,
  "cases": [
    {
      "id": "unique_case_id",
      "message": "user utterance",
      "history": [],
      "baseFilters": {},
      "expects": {
        "minDbResults": 1,
        "requiredDiveTypes": ["Liveaboard"],
        "requiredCountry": "Fiji"
      },
      "judge": {
        "threshold": 0.75,
        "rubric": "Assistant should correctly align response with user intent."
      }
    }
  ]
}
```

## Run

From `python-agents/`:

```bash
python3 evals/tier2/run_tier2_functional_eval.py
```

Validate functional dataset shape only:

```bash
python3 evals/tier2/run_tier2_functional_eval.py --validate-only
```

Run a limited live functional subset:

```bash
python3 evals/tier2/run_tier2_functional_eval.py --max-cases 1
```

Run a multi-turn logging session (non-interactive):

```bash
python3 evals/tier2/multi_turn_response_logger.py \
  --turn "find me cave diving in Mexico" \
  --turn "show me options in Cozumel"
```

Run in interactive mode:

```bash
python3 evals/tier2/multi_turn_response_logger.py
```

Notes for logger output:

- Full responses are written per run to timestamped files under `python-agents/evals/tier2/functional_response_logs/`.
- Each turn compares with the latest prior record for the same prompt.
- Similarity below `0.80` is flagged as `issue=true` for human review.

## Notes

- Tier 2 is intentionally live/integration-oriented (agent + DB + judge model).
- Requires configured Supabase env and LLM API key.
- Deterministic normalization checks are Tier 1 in `python-agents/evals/tier1/`.

