# Session Notes — 2026-08-11

## Topics we clarified

### 1) Python vs TypeScript responsibilities
- **TypeScript is the authoritative database layer** for the app.
- **Python owns LLM extraction only**: NLU, search-filter extraction, booking dialogue.
- Python’s optional Supabase calls (`dbProbe`, `dbSearch`) are **diagnostic/read-only only** and are not the source of truth for UI results.
- **Python does not write to Supabase**.
- Actual booking persistence happens in **TypeScript** via `/api/booking`.

### 2) Guided orchestrator flow
- `server/api/guided-orchestrator.post.ts` can run in Python mode.
- Python orchestrator returns structured intent/routing data.
- TypeScript uses that output to continue the normal app flow and build the final UI-ready response.
- In Python mode, the Python NLU output can be injected into the TS search pipeline as pre-computed intent.

### 3) History / conversation context
- `history` is **conversation context** passed to the LLM for the current turn.
- It is not vector-memory or semantic long-term memory.
- The app uses stored conversation state (browser/session + persisted chat storage for signed-in users), then sends a slice of that state as `history`.
- History helps the model understand continuity, booking state, clarifications, and references like “that one” or “the first option”.

### 4) Persistence model
- **Signed-in users**: chat state can persist across time via Supabase-backed chat storage.
- **Guests**: chat state is mostly ephemeral/session-based.
- No vector database / embeddings-based memory was found in the current flow.

## Important takeaways
- Python orchestrator diagnostics are helpful, but they are **not authoritative**.
- TypeScript remains the canonical layer for app data and persistence.
- `history` should be kept small and relevant to avoid token bloat while preserving continuity.

## Links / files discussed
- `server/api/guided-orchestrator.post.ts`
- `server/utils/runAiSearchPostHandler.ts`
- `server/utils/pythonAgentsClient.ts`
- `server/utils/logChatIntentSignal.ts`
- `python-agents/main.py`
- `python-agents/agents/orchestrator_agent.py`
- `app/composables/useSearchCache.ts`
- `app/composables/userChatsRemote.ts`
- `app/composables/useChatSessions.ts`
- `app/composables/chatTabSync.ts`
- `app/composables/useAuth.ts`
- `supabase/migrations/20250321100000_user_chats.sql`
- `supabase/migrations/20250314000000_create_profiles_and_booking_drafts.sql`
- `supabase/migrations/20260613120000_chat_intent_signals.sql`

## Reference docs created
- [`agentic-tables.md`](./agentic-tables.md) — deep dive on `chat_intent_signals`, `user_chats`, `profiles`
- [`read-only-agent-access.md`](./read-only-agent-access.md) — access matrix and implementation recommendations
- [`backlog.md`](./backlog.md) — open items and resolved decisions

## Open question for later
- Whether to keep Python’s optional diagnostic Supabase reads enabled by default, or make them opt-in only for dev/debug builds.

