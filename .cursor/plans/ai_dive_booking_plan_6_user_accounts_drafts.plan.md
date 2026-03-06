---
name: AI Booking Plan 6 — User accounts, profiles, and drafts
overview: "Supabase Auth (Google + email/password + magic link), profiles table, booking_drafts table and APIs; prefill for recurring bookings; Save draft / Resume draft UI. Part of the AI Dive Trip Booking Agent (Plan 1)."
todos: []
isProject: false
---

# Plan 6: User accounts, profiles, and drafts (Micro plan 5)

**Context:** Part of the AI Dive Trip Booking Agent. See [Plan 1 (Phase 1)](.cursor/plans/ai_dive_trip_booking_agent_1a9a6565.plan.md) for overall scope, auth scope (Google + email + magic link), and design choices for profiles/drafts.

**Goal:** Signed-in users get prefilled bookings (recurring) and can save/resume drafts.

---

## Auth (Supabase Auth)

- Enable auth in app: sign-up with Google, email/password, or magic link; sign-in, sign-out. Use `supabase.auth.getSession()` / `onAuthStateChange` so the app knows current user.
- Protect routes or features as needed (e.g. "My drafts" and "Profile" require auth). Guest users can still search and complete a one-shot booking without an account.
- Server APIs that need user identity: accept `Authorization: Bearer <jwt>` or cookie; verify with Supabase and use `user.id` for profile/drafts.

---

## Profiles table

- `profiles` (or `user_profiles`): `id` (uuid, FK to `auth.users.id`), `display_name`, `email`, `default_diver` (jsonb: name, certification_number, height, height_unit, weight, weight_unit), `updated_at`.
- RLS: users can read/update only their own row. Create row on first sign-up (trigger or app).
- Agent and BookingForm: when `user` is present, load profile and prefill name, email, and first diver from `default_diver`; user can change before sending.

---

## Recurring bookings

- No extra tables. "Recurring" = prefill from profile each time. Optional: after sending a booking, update profile's `default_diver` from the submitted payload so next time it's even closer to last trip.

---

## Drafts table

- `booking_drafts`: `id`, `user_id` (FK to `auth.users.id`), `shop_id` (FK to `diveshops`), `payload` (jsonb, same shape as booking payload), `created_at`, `updated_at`.
- RLS: user can only select/insert/update/delete their own drafts.
- **Save draft:** POST /api/booking/draft with `{ shopId, payload }` (and optional `draftId` to update). Requires auth; store or update row.
- **List drafts:** GET /api/booking/drafts returns user's drafts with shop name (join diveshops).
- **Resume:** GET /api/booking/drafts/:id returns one draft; frontend opens form or chat with that shop + payload so user can continue and then send or save again.
- **Delete draft:** DELETE /api/booking/drafts/:id (optional).

---

## Frontend

- "Save as draft" button in form and/or in chat when booking is partially filled; if guest, show "Sign in to save draft" and redirect to auth.
- Profile page (or "My trips"): list drafts with "Resume" and "Delete"; list past sent bookings if you store them.
- Prefill: when opening booking for a shop, if user is signed in, fetch profile and (optionally) last booking; prefill form/agent context.

---

## Deliverables

- Supabase Auth wired in app (sign-up, sign-in, sign-out, session).
- `profiles` table + RLS; create/update profile on sign-up and when user updates.
- `booking_drafts` table + RLS; POST/GET/DELETE draft API.
- Prefill from profile in agent and BookingForm.
- "Save draft" / "Resume draft" UI and Profile (or My drafts) page.
