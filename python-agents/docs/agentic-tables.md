# Agentic Tables — Supabase Schema Insights

> Captured: 2026-08-11
> Context: Understanding which Supabase tables are related to agentic interactions and how they fit the orchestrator pipeline.

---

## Quick Classification

| Table | Directly Agentic? | Layer | Python Read? |
|---|---|---|---|
| `chat_intent_signals` | ✅ Yes — agent telemetry | Runtime feedback / calibration | Read-only for analytics |
| `user_chats` | 🟡 Supporting | Conversation memory | Summary only |
| `profiles` | 🟠 Indirect | Identity / personalization | Summary only |

---

## 1) `chat_intent_signals` — Agent Calibration Log

### What it is
A **fire-and-forget telemetry table** written by the TypeScript orchestrator on every chat turn. It logs the orchestrator's NLU prediction and routing decision so it can be analyzed offline.

### Schema (from migration `20260613120000_chat_intent_signals.sql`)
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID (nullable) | Auth user if signed in |
| `session_id` | TEXT | Chat session identifier |
| `message` | TEXT | User message (truncated to 2000 chars) |
| `predicted_readiness` | SMALLINT (1–10) | Booking readiness score from orchestrator |
| `primary_verb` | TEXT | `browse`, `book`, or `neutral` |
| `nlu_goal` | TEXT | Extracted NLU goal (`search_shops`, `start_booking`, etc.) |
| `routed_intent` | TEXT | Actual routing decision taken |
| `outcome` | TEXT | Optional outcome label (Phase 2 learning loop) |
| `created_at` | TIMESTAMPTZ | Log timestamp |

### Where it's written in code
- `server/utils/logChatIntentSignal.ts` — fire-and-forget helper
- Called from `server/utils/runAiSearchPostHandler.ts` inside the orchestrator flow, after routing is decided

```typescript
// In runAiSearchPostHandler.ts
logChatIntentSignal({
  userId: authUser?.id ?? null,
  message: message.trim(),
  predictedReadiness: readiness.score,
  primaryVerb: readiness.primaryVerb,
  nluGoal: interpretTurn?.goal ?? null,
  routedIntent
})
```

### Why it matters for agents
- This is **not used to make the live decision** — it is written after the decision
- Purpose: **offline calibration and quality monitoring**
- The system was intentionally designed for a **Phase 2 learning loop** — meaning: compare prediction vs outcome, improve the routing model over time
- This is a real agentic pattern: **agent → acts → logs → learns**

### Access model
| Who | Access |
|---|---|
| TypeScript orchestrator | Write (service role, fire-and-forget) |
| App user | Read own rows (RLS: `auth.uid() = user_id`) |
| Python agent | Not currently. Could read own-user signals for calibration feedback |
| Admin | Read all (admin RLS policy) |

---

## 2) `user_chats` — Conversation Memory Store

### What it is
A **one-row-per-user JSON blob** that stores the entire chat root state — including chat sessions, messages, and conversation context — for signed-in users.

### Schema (from migration `20250321100000_user_chats.sql`)
| Column | Type | Description |
|---|---|---|
| `user_id` | UUID (PK) | Auth user |
| `root` | JSONB | `ChatsRoot` — full chat session tree |
| `updated_at` | TIMESTAMPTZ | Last sync timestamp |

### `ChatsRoot` structure (from composable)
```json
{
  "version": 1,
  "activeSessionId": "session-abc",
  "sessions": [
    {
      "id": "session-abc",
      "messages": [
        { "role": "user", "content": "..." },
        { "role": "assistant", "content": "..." }
      ],
      "updatedAt": "2026-08-11T..."
    }
  ]
}
```

### Where it's used in code
- `app/composables/userChatsRemote.ts` — handles upsert on change, merge on sign-in, sync on tab focus
- Sync logic:
  - **On sign-in**: fetch remote, merge with local sessionStorage by recency
  - **On change**: debounce 800ms, then upsert to Supabase
  - **On sign-out**: keep local copy, cancel pending push

### Why it matters for agents
- `user_chats` does **not drive agent decisions directly**
- But it is the **source of truth for `history`** that gets sent to Python:
  ```
  user_chats.root.sessions[activeSessionId].messages → history[]
  → POST /agents/orchestrator { message, history: [...] }
  ```
- So the quality and recency of `user_chats` directly affects how well the agent can continue context, handle references like "that one", and avoid re-asking for info already given
- Guests: sessionStorage only (no Supabase row)
- Signed-in: Supabase-backed, survives browser restart and device switch

### Access model
| Who | Access |
|---|---|
| TypeScript (client) | Read + Write own row (RLS) |
| Python agent | Not currently. Could read recent session summary for continuity planning |
| Admin | Not readable via RLS (user-only) |

---

## 3) `profiles` — User Identity and Personalization

### What it is
A **one-row-per-auth-user** profile table created automatically on sign-up. Stores display name, email, default diver info, and app role.

### Schema (from migrations `20250314000000`, `20250316000000`, `20260510000001`)
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Matches `auth.users.id` |
| `display_name` | TEXT | User-set name |
| `email` | TEXT | Email from sign-up |
| `default_diver` | JSONB | Saved diver defaults for booking prefill |
| `default_divers` | JSONB[] | Multiple saved divers |
| `role` | TEXT (`standard`/`admin`) | App role (non-admin cannot self-promote) |
| `updated_at` | TIMESTAMPTZ | Last update |

### `default_diver` shape (from migration comment)
```json
{
  "name": "Alex Rivera",
  "certification_number": "PADI123456",
  "height": "180",
  "height_unit": "cm",
  "weight": "75",
  "weight_unit": "kg"
}
```

### Where it's used in code
- `app/composables/useAuth.ts` — loads `profiles.role` on sign-in to determine admin access
- Booking flow — `default_diver` is forwarded to the booking agent as `profilePrefill` in `RequestBody`
- Admin UI — `is_app_admin()` checks `profiles.role`

### Why it matters for agents
`profiles` is **not a core agent table**, but it contributes to the agent experience in these specific ways:

1. **Booking continuation** — `default_diver` is sent as `profilePrefill` in the `POST /api/guided-orchestrator` body, so the booking agent doesn't need to ask for name, cert, height, weight again
2. **Access control** — `profiles.role` determines whether the user can reach admin agent/debug endpoints
3. **Personalization** — `display_name` could be included in agent prompts for a more personal experience (not currently done)

### Access model
| Who | Access |
|---|---|
| TypeScript (client) | Read + Write own row (RLS: `auth.uid() = id`) |
| TypeScript (server/service role) | Read + Write all rows |
| Python agent | Not currently. Could receive a summary via TS before calling orchestrator |
| Admin | Read + Write via service role or admin check |

---

## How the Three Tables Fit Together in an Agentic Turn

```
Signed-in user sends a message
        │
        ▼
Browser reads user_chats.root → builds history[]
        │
        ▼
Browser reads profiles.default_diver → profilePrefill
        │
        ▼
POST /api/guided-orchestrator {
  message,
  history: [...],         ← from user_chats
  profilePrefill: {...}   ← from profiles
}
        │
        ▼
TS calls Python orchestrator
  Python: NLU + routing using history as context
        │
        ▼
TS runs Supabase queries, builds UI response
        │
        ▼
logChatIntentSignal() ← writes to chat_intent_signals (fire-and-forget)
        │
        ▼
Browser updates user_chats.root with new messages → upserts to Supabase
```

---

## Summary for the Read-Only Agent Access Decision

When deciding what Python can read from Supabase, these three tables have different risk profiles:

| Table | Safe for Python to read? | Risk | Recommended access |
|---|---|---|---|
| `chat_intent_signals` | Yes, own-user rows | Low | Read-only for analytics/calibration feedback |
| `user_chats` | Yes, recent summary only | Medium (full history can be large + private) | Recent session summary, not full root |
| `profiles` | Yes, summary only | Medium (PII: name, email, cert number) | `display_name` + `default_diver` summary only; never raw email/certs unless needed |

See [`read-only-agent-access.md`](./read-only-agent-access.md) for the full access matrix and implementation recommendations.

