# Backlog

This file tracks follow-up work and documentation gaps discovered while reviewing the Python agents / TS orchestrator flow.

## How to read this backlog

- **High Priority**: needed to prevent confusion or correctness issues now
- **Medium Priority**: important for robustness and clarity
- **Low Priority**: useful documentation and polish
- **Productionization**: checklist for taking the multi-agent system to production quality

---

## 1) Core Architecture Clarifications

- [ ] Clarify the exact default behavior for Python optional Supabase diagnostics (`runDbProbe`, `runDbSearch`, `selectedShopId`) in README and code comments.
- [ ] Document the canonical response shape returned by `POST /api/guided-orchestrator` for the UI (search vs booking vs progress stream).
- [ ] Define a single source of truth for each field in the orchestration chain (`interpretTurn`, `mergedFilters`, `bookingPayload`, `selectedShop`, `dbSearch`, `dbProbe`).
- [ ] Add a short diagram for data ownership boundaries: Python LLM extraction vs TS database authority.
- [x] Add an explicit note in docs that no vector database / semantic memory is used today. **See [`memory-and-retention-policy.md`](./ADRs/memory-and-retention-policy.md).**
- [ ] Confirm whether chat history retention has an expiration policy or user-facing deletion policy. **Status: in progress (policy drafted in [`memory-and-retention-policy.md`](./ADRs/memory-and-retention-policy.md); implementation + product/legal sign-off pending).**

## 1a) Resolved Decisions

- [x] Verify whether Python optional Supabase reads should stay enabled in production or be dev-only. **Decision:** keep them available in production only as curated, read-only, optional reads; never as a write path or source of truth.
- [x] Review the low-level read-only access design in [`read-only-agent-access.md`](./ADRs/read-only-agent-access.md) and decide which user-interaction tables should be exposed to Python. **Decision:** expose only curated read models / summaries for user-interaction data; keep writes and broad raw-table access in TS.
- [x] Investigate how `chat_intent_signals`, `user_chats`, and `profiles` relate to agentic interactions. **Findings documented in [`agentic-tables.md`](./ADRs/agentic-tables.md).**
- [x] Document the exact persistence model for conversation state (guest vs signed-in, browser storage vs Supabase-backed storage). **See [`conversation-persistence-model.md`](./ADRs/conversation-persistence-model.md).**
- [x] Add a small architecture note explaining that Python booking agent is LLM-only and does not persist bookings. **See [`python-booking-agent-boundary.md`](./ADRs/python-booking-agent-boundary.md).**
- [x] Document how much `history` should be sent to Python (recent turns only vs full thread). **See [`history-budget-policy.md`](./ADRs/history-budget-policy.md).**

---

## 2) Correctness, Safety, and Hallucination Control

- [ ] Add explicit guardrails for hallucination-prone fields: destination, shop name, certification course, dive site, and trip type.
- [ ] Add validation rules that reject or downgrade low-confidence Python outputs before they reach UI-facing logic.
- [ ] Add strict schema validation on every model output before downstream use.
- [ ] Require confidence thresholds for route changes, entity selection, and booking handoff.
- [ ] Add clarification-first behavior for ambiguous destinations, shop names, course names, and dates.
- [ ] Define a "do not guess" policy for booking, pricing, availability, and user identity fields.
- [ ] Add prompt-injection defenses for tool inputs, chat history, and retrieved content.
- [ ] Add output sanitization for tool calls and user-facing messages to strip unsupported claims.
- [ ] Create confidence thresholds that decide when to ask a clarifying question instead of guessing.
- [ ] Add a list of “do not infer” fields that must never be guessed without explicit user confirmation.

---

## 3) Reliability and Fail-Soft Behavior

- [ ] Document the retry/fail-soft strategy for each agent call so the system degrades safely when one model call fails.
- [ ] Add timeouts, retries with jitter, and circuit breakers for each agent hop.
- [ ] Add fallback behavior when one agent fails (e.g. TS-only safe mode, static clarifying response, or chip-based fallback).
- [ ] Add idempotency handling for booking submission and any side-effecting workflow.
- [ ] Add partial-failure handling so one failed sub-agent does not break the entire turn.
- [ ] Add graceful degradation when optional diagnostics or enrichment APIs are unavailable.
- [ ] Add explicit error taxonomy (validation error, tool error, model error, upstream timeout, auth failure).
- [ ] Add backpressure / timeout policy for slow LLM or Supabase requests.
- [ ] Add failure-mode matrix covering missing credentials, malformed JSON, partial agent output, and empty search results.

---

## 4) Evaluation and Quality Control

**Status**: Framework + implementation guide complete. See `docs/evaluation-and-qc-approach.md` for full spec.

- [ ] **Establish a canonical prompt/versioning policy** so TS and Python stay in sync across model and schema changes.
  - ✅ **Solution**: Section 9 (Prompt Versioning & Change Management) in evaluation-and-qc-approach.md
  - Implementation: `agents/nlu_agent.py` → NLU_SYSTEM_PROMPT_VERSION, docs/prompt-changelog.md

- [ ] **Build a golden dataset** of real user prompts covering search, booking, clarifications, and edge cases.
  - ✅ **Solution**: Section 4.1 (Golden Dataset Structure) + Implementation Guide Phase 1
  - Implementation: `python-agents/evals/golden_dataset.json` (50 curated examples, version-controlled)

- [ ] **Add offline evals** for intent routing accuracy, filter extraction accuracy, booking completion accuracy, and hallucination rate.
  - ✅ **Solution**: Sections 4.2–4.5 (Detailed Eval Specifications)
  - Implementation: `python-agents/evals/nlu_eval.py`, `search_eval.py`, `booking_readiness_eval.py`, `hallucination_detector.py`

- [ ] **Add regression tests** for ambiguous prompts, entity references, incomplete bookings, and out-of-domain inputs.
  - ✅ **Solution**: Section 4.1 ("by_accuracy_focus" golden dataset) + Section 4.2–4.5 (eval scripts)
  - Implementation: Golden dataset includes hallucination_detection, ambiguous_destinations, multi_destination categories

- [ ] **Add human review** for high-risk prompt categories (pricing, availability, policies, cancellation, refunds).
  - ✅ **Solution**: Section 5 (Confidence Threshold Model) + Section 8 (Do-Not-Infer Policy)
  - Implementation: Confidence gates in TypeScript + docs/eval-release-checklist.md approval workflow

- [ ] **Track precision/recall** for critical extracted fields and compare against a baseline before release.
  - ✅ **Solution**: Section 4.2–4.4 (Eval Specs with precision/recall metrics) + Section 7.4 (Dashboard)
  - Implementation: eval_harness.py computes by-field accuracy, CSV trend tracking, BigQuery dashboards (Phase 4)

- [ ] **Add regression tests** for ambiguous prompts that commonly cause hallucinations or wrong routing.
  - ✅ **Solution**: Section 4.4 (Hallucination Detection) in detailed specs
  - Implementation: `hallucination_detector.py` flags shop_name_hints that don't exist in DB

- [ ] **Add a periodic review checklist** for prompt quality, schema drift, and outdated assumptions.
  - ✅ **Solution**: Section 6 (Release & Rollout Checklist) + Section 9.2 (Prompt Changelog)
  - Implementation: `docs/eval-release-checklist.md` (pre-release approval gate)

- [ ] **Add a design note** on how to keep prompts short and stable to reduce token usage and output drift.
  - 🟡 **In Progress**: Section 9.2 (Prompt Changelog changelog tracks cost per version)
  - Phase 4 deliverable: Cost tracking dashboard, token budget per agent

---

**Quick Links**:
- 📄 **Main Framework**: `../../../docs/evaluation-and-qc-approach.md`
- 🛠️ **Implementation Guide**: `../../../docs/eval-implementation-guide.md`
- 📋 **Backlog Mapping**: `../../../docs/eval-backlog-summary.md`
- ⚡ **Quick Card**: `../../../docs/EVAL-QUICKCARD.md`
- ✅ **Release Checklist**: `../../../docs/eval-release-checklist.md`

---

## 5) Observability and Debuggability

- [ ] Add observability for per-turn trace IDs so one user message can be traced across TS, Python, and Supabase.
- [ ] Add end-to-end trace IDs across browser, TS, Python, Supabase, and email/booking events.
- [ ] Log model version, prompt version, and schema version for every turn.
- [ ] Add turn-level metrics: latency, token usage, tool-call counts, retry counts, and failure rate.
- [ ] Add an admin/debug view to inspect one conversation turn end-to-end.
- [ ] Add sampled payload logging with redaction for PII and secrets.
- [ ] Add dashboards for cost per conversation, success rate, and escalation rate.
- [ ] Add an example payload for `progressStream: true` NDJSON responses.

---

## 6) Security, Privacy, and Compliance

- [ ] Add PII redaction before sending history to models where possible.
- [ ] Minimize stored conversation data to what is required for continuity and support.
- [ ] Define retention policy for chat history, bookings, and debug logs.
- [ ] Add role-based access control for admin/debug endpoints.
- [ ] Audit all externally called tools for least privilege and allowed actions.
- [ ] Verify secrets handling and environment variable boundaries for TS vs Python.

---

## 7) Scalability and Cost Control

- [ ] Add latency budgets per agent hop (NLU, search, booking, orchestrator, TS query, Supabase enrichment).
- [ ] Add caching strategy for repeated lookups such as shop details, course lists, and dive sites.
- [ ] Add caching for repeated lookups and repeated NLU results when safe.
- [ ] Shorten prompts and trim history to the minimum useful context.
- [ ] Define batching and pagination strategy for large chat histories and large search result sets.
- [ ] Add rate limiting and per-user quotas for expensive agent paths.
- [ ] Use cheaper/faster models for low-risk steps and reserve stronger models for hard cases.
- [ ] Add batching or queueing for non-interactive tasks like nightly evals and reindex jobs.
- [ ] Add budget alerts for token spend and external API usage.
- [ ] Add guidance for rate-limit handling and retry jitter across external APIs.
- [ ] Add a scaling note for parallelizing safe read-only calls without increasing duplication or race conditions.

---

## 8) Release and Rollout Process

- [ ] Document when to short-circuit the multi-agent chain to reduce unnecessary model calls.
- [ ] Add canary rollout for model, prompt, and orchestration changes.
- [ ] Add feature flags for new agents, new tools, and risky fallback paths.
- [ ] Define a rollback plan if accuracy or latency regresses.
- [ ] Add version pinning for prompts, schemas, and model providers.
- [ ] Create a release checklist for prompt updates, eval passing, and trace review.

---

## 9) Architecture / Product Decisions

- [ ] Decide which parts of orchestration should be deterministic rules vs model-driven.
- [ ] Decide which responsibilities are deterministic rules vs model-driven decisions.
- [ ] Decide whether `dbSearch` results should ever be surfaced in debug UI or remain internal only.
- [ ] Decide whether Python optional DB reads stay enabled in prod or are debug-only.
- [ ] Decide which user-facing actions must always require confirmation from the user.
- [ ] Decide whether a memory layer is needed later beyond session/history persistence.
- [ ] Decide which failures should block booking vs merely degrade search quality.

---

## 10) Notes

- These items came up during discussion about session-based memory, history forwarding, and the Python/TypeScript ownership split.
- The new items emphasize architect-level concerns: correctness, reliability, scaling, observability, and hallucination control.
- Keep this list updated whenever we discover a missing doc or an unclear boundary in the architecture.

