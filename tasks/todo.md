# Booking agent eval suite + CI wiring

## Plan

- [x] Create an offline booking-agent eval harness with 20-40 utterance cases.
- [x] Include edge-case coverage for proximity phrasing, ambiguous entity-style phrasing, and booking step-skip pressure.
- [x] Add KPI threshold assertions for:
  - hallucinated structured option rate (target near 0%)
  - intent routing accuracy (>90%)
  - entity phrase extraction accuracy (>90% on covered cases)
  - booking step progression guard checks (no skipped canonical steps in covered payload snapshots)
- [x] Add a dedicated npm script for running evals and wire CI to execute tests on pushes/PRs.
- [x] Update `README.md` with exact commands and KPI interpretation guidance.
- [ ] Run tests locally and capture outcomes.

## Review

- Pending.
