# Lessons Learned

## 2026-04-01

- When chat actions (like "just send") depend on booking completeness, use the live booking form payload when the drawer is open, not only the last assistant message payload.
- Keep live form state in a dedicated drawer key (e.g. `liveBookingPayload`) so sync does not trigger `initialPayload` re-application loops.
- Respect explicit user intent words like "send" / "just send": do not add extra confirmation/checklist loops when the product behavior should execute immediately.
- For user-visible "incomplete vs sent" buckets, enforce state transition on send (e.g. clear matching draft) instead of relying only on passive readiness checks.
- When "New Chat" can be triggered from non-chat routes, proactively clear one-time resume/session handoff keys (like `glaucus-pending-draft-resume`) before navigation to avoid unintended auto-resume on mount.
- For cross-route "New Chat", use a durable one-time flag (sessionStorage) and consume it in index `onMounted`; watcher-only triggers can be missed during navigation timing.
- When planning user-facing guided flows, avoid vague internal labels like "search mode"; name the exact user choice, e.g. "Search dive businesses by location, certification course, or business name."
