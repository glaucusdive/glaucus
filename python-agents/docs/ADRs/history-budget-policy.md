# History Budget Policy (Python Agent Calls)

## Goal

Reduce token usage and latency while preserving conversation quality.

This policy defines how much `history` should be sent to Python and which low-effort optimizations should be implemented first.

## Current behavior (observed)

- Frontend sends full user+assistant thread in request body.
- Downstream components already clip history per task:
  - TS NLU: last 6 messages
  - TS booking-readiness heuristic: last 4 messages
  - Python NLU: last 6 messages
  - Python Search: last 10 messages
  - Python Booking: last 12 messages

## Decision

Use **recent-turn windows** (not full thread) plus structured context.

### Per-agent history windows

| Component | History window |
|---|---:|
| TS booking-readiness heuristic | last 4 messages |
| TS NLU (`interpretUserTurn`) | last 6 messages |
| Python NLU agent | last 6 messages |
| Python search agent | last 10 messages |
| Python booking agent | last 12 messages |

### Rule

- Always prefer **recent turns + structured state** over full thread replay.
- Structured state includes: `selectedShopId`, `lastSearchFilters`, `bookingPayload`, `profilePrefill`, `tripRequirements`.

## Low-hanging fruit (low effort, high impact)

1. **Client-side trim before send**
   - Send only last 16 message turns to `/api/guided-orchestrator` instead of full thread.
   - Keep existing server-side clipping as a second safety layer.

2. **Drop low-value turns before send**
   - Remove empty assistant messages, duplicate system preambles, and redundant confirmations.

3. **Standardize one helper for clipping**
   - Create shared utility for history clipping policies to avoid drift between TS and Python.

4. **Add lightweight token guard**
   - If total request text exceeds threshold, drop oldest turns first.

5. **Measure and log**
   - Add per-turn metrics: input message count, estimated tokens, and clipped count.

## Medium effort improvements

1. **Rolling session summary**
   - Summarize older turns into a compact "summary" block and keep only recent turns verbatim.

2. **Intent-lane filtering**
   - For search turn, prioritize search-relevant turns; for booking turn, prioritize booking-relevant turns.

3. **Context compaction of assistant responses**
   - Keep key facts only (selected shop, date, divers, course choices), drop verbose narrative text.

## Guardrails

- Never remove user-provided booking facts that are not captured in structured state yet.
- Never rely on full-thread replay for correctness.
- Preserve evidence for disambiguation when the user references "that one", "same as before", "the first option".

## Acceptance criteria for this policy

- P95 prompt token usage decreases vs baseline.
- No regression in booking completion rate.
- No regression in NLU route accuracy (browse vs book).
- No increase in clarification loops caused by over-trimming.

## Notes

This policy complements:
- `conversation-persistence-model.md` (where history is stored)
- `agentic-tables.md` (`user_chats` vs `chat_intent_signals` roles)
- `python-booking-agent-boundary.md` (write-path boundaries)

