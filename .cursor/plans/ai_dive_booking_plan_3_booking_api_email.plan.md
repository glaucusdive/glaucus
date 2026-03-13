---
name: AI Booking Plan 3 — Booking API and email
overview: POST /api/booking to accept payload, validate, send email to diveshop and confirmation to user via Resend/SendGrid. Part of the AI Dive Trip Booking Agent (Plan 1).
todos: []
isProject: false
---

# Plan 3: Booking API and email (Micro plan 2)

**Context:** Part of the AI Dive Trip Booking Agent. See [Plan 1 (Phase 1)](.cursor/plans/ai_dive_trip_booking_agent_1a9a6565.plan.md) for overall scope and payload shape.

**Goal:** Accept booking payload, validate, send email to shop and confirmation to user.

---

## POST /api/booking

- Body: `shopId`, `name`, `email`, `startDate`, `endDate`, `desiredDiveSites[]`, `divers[]` (each with name, certificationNumber, numberOfDives, height, heightUnit, weight, weightUnit, gear).
- Validate required fields; fetch diveshop row (at least `email`, `business_name`). If no shop email, return 400 with "This shop has no email on file."

---

## Email provider

- Choose one (e.g. Resend). Add dependency and env var (e.g. `RESEND_API_KEY`).
- From address: e.g. `bookings@yourdomain.com` or provider default; ensure domain verified for production.

---

## Templates

- **To diveshop:** Subject "Dive trip booking request from [User name] via Glaucus". Body: trip dates, number of divers, diver details, desired dive sites, user contact (name, email). Plain text is enough for v1.
- **To user:** Subject "We've sent your booking request to [Shop name]". Body: "We've sent your request to [Shop]. They'll contact you at [user email]. If you don't hear back in a few days, reach out to them directly at [shop email]."

---

## After send

- Return 200 with `{ sent: true, message: '...' }`. Optionally store a minimal booking record (e.g. `bookings` table: id, shop_id, user_email, payload snapshot, created_at) for follow-up and debugging; not required for MVP.

---

## Deliverables

- POST /api/booking.
- Email sending with two templates.
- ENV_SETUP.md update for email API key.



