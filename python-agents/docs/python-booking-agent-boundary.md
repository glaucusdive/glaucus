# Python Booking Agent Boundary (Architecture Note)

## Purpose

Make the production boundary explicit:
- The Python booking agent is **LLM-only** (understanding and structuring booking conversations).
- The TypeScript layer is **system-of-record** (validation, persistence, side effects).

## Decision

### Python booking agent is responsible for
- Parsing user booking messages
- Asking follow-up questions for missing fields
- Returning:
  - `reply`
  - `collectedPayload`
  - `bookingReady`
  - `finalPayload` (when complete)

### Python booking agent is NOT responsible for
- Writing to Supabase
- Sending emails
- Creating/updating booking submission records
- Mutating user profile or chat persistence tables

## Write path ownership

Only TypeScript writes booking outcomes:
1. Browser confirms booking
2. Request goes to TS booking endpoint (`/api/booking`)
3. TS validates payload
4. TS writes to `booking_submissions` (and related records)
5. TS sends notifications/emails

Python is never on the write path.

## Why this boundary exists

- **Reliability**: one authoritative write path
- **Security**: fewer privileged components
- **Auditability**: deterministic server writes and logs
- **Safety**: LLM output is treated as input, never persisted blindly

## Data flow summary

```text
User message -> guided-orchestrator (TS) -> booking agent (Python)
           <- reply + structured payload

User confirms -> /api/booking (TS only) -> Supabase write + email side effects
```

## Tables and implications

- `booking_submissions`: written by TS only
- `booking_drafts`: managed by TS/user flow
- `profiles`: TS/client ownership for profile data
- `user_chats`: client/TS sync ownership
- `chat_intent_signals`: TS telemetry logging

Python may read curated, read-only summaries where approved, but does not own persistence.

## Status

This boundary is an architectural rule for production operation.

