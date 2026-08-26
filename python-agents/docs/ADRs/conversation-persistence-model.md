# Conversation Persistence Model

## Scope

This note documents how conversation state is persisted today, and what gaps still remain for production governance.

## Status

- Persistence mechanics: implemented
- Retention/deletion governance: in progress (see `memory-and-retention-policy.md`)

## Current model (implemented)

### Guest users
- Primary storage: browser `sessionStorage`
- No Supabase-backed `user_chats` row
- Conversation continuity is best-effort and local to that browser context

### Signed-in users
- Primary storage: browser state + Supabase `user_chats`
- `user_chats` stores one JSONB root per user (`root`)
- Client syncs local chat root to Supabase with debounce and merge logic
- On sign-in, local + remote roots are merged by recency

## Key table roles

- `user_chats`: canonical persisted conversation state for signed-in users
- `chat_intent_signals`: per-turn routing telemetry (not conversation history)
- `profiles`: user identity, role, and booking prefill context (adjacent to chat)

## Explicit memory boundary

- No vector database / semantic memory is used today
- Conversation continuity is transcript/state based (`user_chats` + structured payloads)

## Is `user_chats` sufficient?

For basic continuity, yes:
- It supports cross-refresh / cross-device continuity for signed-in users
- It preserves message history used as `history` context for agent calls

For production-grade governance, not fully by itself. You still need:
- retention policy and deletion policy
- PII minimization/redaction policy
- history trimming strategy for token control
- incident/debug access policy

## Recommended stance

- Treat `user_chats` as sufficient for runtime continuity
- Keep the backlog open for governance and policy items
- Mark the backlog item "Document exact persistence model" as done once this file is linked

## Related files

- `app/composables/userChatsRemote.ts`
- `app/composables/useSearchCache.ts`
- `supabase/migrations/20250321100000_user_chats.sql`
- `supabase/migrations/20260613120000_chat_intent_signals.sql`
- `python-agents/docs/ADRs/agentic-tables.md`
- `python-agents/docs/ADRs/history-budget-policy.md`
- `python-agents/docs/ADRs/memory-and-retention-policy.md`

