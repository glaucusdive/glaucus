# Python Booking Agent Boundary (ADR)

## Decision
Python booking agent is LLM-only. It does not persist bookings.

## Python responsibilities
- Extract booking intent/details from messages
- Ask follow-up questions for missing fields
- Return structured payload progress (`collectedPayload`, `finalPayload`, `bookingReady`)

## Python non-responsibilities
- No Supabase writes
- No email sending
- No booking submission mutation

## TypeScript responsibilities
- Validate final booking payload
- Persist booking records
- Send notifications/emails
- Own authoritative write path and side effects

## Rationale
- Stronger security boundary
- Deterministic write behavior
- Easier auditing and rollback
- Safer handling of model uncertainty

## Rule
Model output is input to TS validation/persistence, never a direct write command.

