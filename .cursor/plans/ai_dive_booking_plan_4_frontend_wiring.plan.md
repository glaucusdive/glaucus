---
name: AI Booking Plan 4 — Frontend wiring
overview: "Chat UI: BOOKING_READY + confirm button, call POST /api/booking; form submit to same API; selectedShopId and dive sites in form. Part of the AI Dive Trip Booking Agent (Plan 1)."
todos: []
isProject: false
---

# Plan 4: Frontend wiring (Micro plan 3)

**Context:** Part of the AI Dive Trip Booking Agent. See [Plan 1 (Phase 1)](.cursor/plans/ai_dive_trip_booking_agent_1a9a6565.plan.md) for overall scope. Depends on Plan 2 (agent returns BOOKING_READY) and Plan 3 (POST /api/booking exists).

**Goal:** Chat shows "Send booking request?" when BOOKING_READY; user confirms; call booking API and show success.

---

## Request body to agent

- Include `selectedShopId` and optionally `lastShops` (ids + names) so "book with the first one" can be resolved.
- If user says "book with [name]" and no `selectedShopId`, backend resolves by name.

---

## Handling BOOKING_READY

- When response has `bookingReady: true` and `payload`: show assistant message "I have everything. Should I send your booking request to [Shop]?" and a button "Send request".
- On click: POST /api/booking with `payload` (and `shopId`). On success: "Request sent. Check your email for confirmation." On failure: show error and allow retry.

---

## Form path

- Keep "Book" on DiveShopDetail opening the drawer. Recommendation: drawer keeps current form; add "Submit" that POSTs to same /api/booking so manual entry still works. Optionally later add "Or answer a few questions in chat" CTA that focuses chat on booking for the open shop.

---

## Dive sites in form

- For the manual form, load dive sites for the shop (e.g. new composable or `GET /api/shops/[id]/dive-sites`) and replace the static list in [BookingForm.vue](app/components/BookingForm.vue). Same list can back the agent's "desired sites" question.

---

## Prefill and drafts

- If user is signed in, load profile (and optional draft for this shop) when opening the form or starting a booking in chat; prefill fields. Show "Save draft" in form and in chat when booking is incomplete; "Resume" from Profile/drafts list (see Plan 6).

---

## Deliverables

- Chat UI: BOOKING_READY + confirm button + call to POST /api/booking.
- BookingForm: submit → POST /api/booking; optionally load dive sites from API.
- Pass `selectedShopId` (and last results) into agent request.
