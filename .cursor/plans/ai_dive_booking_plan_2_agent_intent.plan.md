---
name: AI Booking Plan 2 — Agent intent and booking flow
overview: Extend ai-search with intent detection (search vs book), collect booking payload via conversation, return BOOKING_READY; tone/UX and selectable options. Part of the AI Dive Trip Booking Agent (Plan 1).
todos: []
isProject: false
---

# Plan 2: Agent intent and booking flow (Micro plan 1)

**Context:** Part of the AI Dive Trip Booking Agent. See [Plan 1 (Phase 1)](.cursor/plans/ai_dive_trip_booking_agent_1a9a6565.plan.md) for overall scope, conversational style, and architecture.

**Goal:** One agent that does search OR booking; booking = collect slots then return payload for confirmation.

---

## Tone and UX

- Search and booking prompts should follow **Conversational style and chat UX** from Plan 1 (travel-agent-like tone, selectable options for dive type/courses when relevant, broadening suggestions when results are few). Keep existing "broaden search" behavior (e.g. Bali → Indonesia → Southeast Asia) and expose it as selectable suggestions.

---

## Intent detection

- In the same `ai-search` API, first turn or when user says "book", "reserve", "I want to book with…", "send my request", etc. → set intent to `book`. Otherwise `search`.
- If `book`: require `shopId`. If user said "book with [name]", resolve shop by name (fuzzy match on `diveshops.business_name`); if coming from UI after search, pass `selectedShopId` in request body so backend has context.

---

## Booking state

- **Frontend** holds the structured payload and sends it with each message so the backend can see what's already collected; backend stays stateless (no session store).
- Required slots: `name`, `email`, `startDate`, `endDate`, `numberOfDivers`, then for each diver: `name`, `certificationNumber`, `numberOfDives`, `height`, `heightUnit`, `weight`, `weightUnit`, `gear[]`. Optional: `desiredDiveSites[]` (from that shop's sites).

---

## System prompt for book

- "You are collecting a dive trip booking. The shop is [name]. Ask for one piece of information at a time: name, email, dates, number of divers, then for each diver… When all required fields are collected, output BOOKING_READY: ."

---

## Structured output

- When the model outputs BOOKING_READY with valid JSON, API returns `{ intent: 'booking', bookingReady: true, payload: {...}, message: '...' }`. Frontend then shows confirmation and "Send request" button.

---

## Dive sites for the shop

- Backend loads dive sites for the chosen shop (e.g. `diveshop_dive_sites` join `dive_sites`) and injects the list into the prompt so the agent can ask "Which of these sites interest you?" and fill `desiredDiveSites`.

---

## Optional: profile and draft context

- If the request includes a signed-in user (JWT), backend can load `profiles` and optionally a `booking_drafts` row for this shop; pass prefilled values or "resumed draft" payload into the booking prompt so the agent starts with name, email, dates, etc. already filled and asks only for what's missing.

---

## Deliverables

- Extended `ai-search` (or single route) with intent + booking collection.
- BOOKING_READY response shape and parsing.
- Resolve shop by id or name.
- Optional: GET or inline load of dive sites by shop for prompt.
- Response shape for **selectable options** (dive types, courses, broaden suggestions) so the frontend can render chips/quick-replies.

