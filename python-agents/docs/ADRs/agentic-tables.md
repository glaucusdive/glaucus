# Agentic Table Roles (ADR)

## Scope
Clarifies how `chat_intent_signals`, `user_chats`, and `profiles` relate to agentic interactions.

## Table classification

| Table | Role | Agentic relationship |
|---|---|---|
| `chat_intent_signals` | Per-turn telemetry | Direct (routing calibration/analytics) |
| `user_chats` | Conversation persistence | Supporting (history context for agent calls) |
| `profiles` | Identity/prefill/access | Indirect (context and permissions) |

## Details

### `chat_intent_signals`
- One row per user turn prediction
- Stores: message snapshot, predicted readiness, primary verb, NLU goal, routed intent, outcome
- Written server-side (fire-and-forget)
- Used for offline evaluation, not as live memory source

### `user_chats`
- One row per signed-in user (`root` JSONB)
- Contains sessions/messages used to reconstruct `history`
- Source of continuity across reload/sign-in/device

### `profiles`
- User metadata (role, display name, default diver fields)
- Supports auth role checks and booking prefill
- Not a conversation memory table

## Key rule
- `user_chats` is conversation memory
- `chat_intent_signals` is telemetry
- `profiles` is identity/context

