---
name: AI Booking Plan 5 — Follow-up email (optional)
overview: "Optional reminder email 2–3 days after booking request: ask user if they and the shop have confirmed. Requires bookings storage and cron/scheduler. Part of the AI Dive Trip Booking Agent (Plan 1)."
todos: []
isProject: false
---

# Plan 5: Follow-up email (Micro plan 4, optional)

**Context:** Part of the AI Dive Trip Booking Agent. See [Plan 1 (Phase 1)](.cursor/plans/ai_dive_trip_booking_agent_1a9a6565.plan.md) for overall scope. Build after Plan 3 (booking API) stores or can store a booking record.

**Goal:** Remind user to confirm with the shop after a few days.

---

## Option A — Cron/scheduler

- Store minimal booking record when sending (shop_id, user_email, created_at). Cron (e.g. Supabase Edge Cron or external) runs daily, finds bookings where `created_at` is 2–3 days ago and no "follow-up sent" flag, sends one email: "Have you and [Shop] confirmed your booking? If not, contact them at [shop email]." Set flag so we don't send again.

---

## Option B — No storage

- Skip follow-up in v1; add later when you have a `bookings` table and a scheduler.

---

## Deliverables

- Optional: `bookings` table, send follow-up email job, env for "enable follow-up".
