# Memory and Retention Policy (ADR)

## Status
- Proposed policy drafted
- Implementation pending

## Why this ADR
Define how conversation memory works today, what is intentionally not used, and what retention/deletion controls are required for production.

## Current memory model

### What is used today
- `user_chats` for signed-in conversation persistence (`root` JSONB)
- Browser session/local state for guest continuity
- Structured state (`bookingPayload`, `tripRequirements`, `selectedShopId`) to reduce dependence on long raw transcripts

### What is NOT used today
- No vector database
- No semantic retrieval memory
- No embeddings-backed long-term memory

This system is transcript/state based, not RAG-memory based.

## Agent context policy
- Send recent-turn windows, not full thread replay
- Keep task-specific windows (NLU/search/booking can differ)
- Prefer structured state over replayed prose
- Add hard caps for history size (count/chars/tokens)

See `history-budget-policy.md` for concrete clipping windows and quick wins.

## Retention policy (recommended)

### Guest users
- Session-scoped memory only
- No guaranteed long-term persistence

### Signed-in users
- Persist in `user_chats`
- Define lifecycle explicitly:
  - retention period (for example: 90/180/365 days)
  - user-initiated delete behavior
  - account deletion cascade behavior
  - support/admin access boundaries

## Deletion and user controls (recommended)
- Add user-facing “Delete conversation history” action
- Add API to remove `user_chats` row for a user
- Ensure deletion behavior is reflected in product/privacy docs

## Security and privacy
- Minimize PII in model-bound history where possible
- Keep debug logs separate from chat history retention
- Do not treat telemetry tables (e.g., `chat_intent_signals`) as conversation history

## Decision summary
- Keep current transcript/state memory model
- Explicitly document “no vector memory today”
- Keep retention/deletion item in progress until implementation + policy approval

