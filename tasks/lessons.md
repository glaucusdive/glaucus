# Lessons Learned

## 2026-04-01

- When chat actions (like "just send") depend on booking completeness, use the live booking form payload when the drawer is open, not only the last assistant message payload.
- Keep live form state in a dedicated drawer key (e.g. `liveBookingPayload`) so sync does not trigger `initialPayload` re-application loops.
- Respect explicit user intent words like "send" / "just send": do not add extra confirmation/checklist loops when the product behavior should execute immediately.
- For user-visible "incomplete vs sent" buckets, enforce state transition on send (e.g. clear matching draft) instead of relying only on passive readiness checks.
