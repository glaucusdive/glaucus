# Lessons Learned

## 2026-04-27

- When asked for manual ship-test scenarios, make each scenario match the requested outcome boundary. If the user asks for end-to-end bookings, every item should start from a realistic search/use case and continue through a completed booking review/final-send gate, not isolate subfeatures as standalone tests.
- Before recommending manual test scenarios that depend on marketplace data, verify the actual Supabase-backed data shape first. Do not suggest scenarios that depend on sparse/unpopulated fields like ratings or languages when current data is stronger for courses, dive sites, rental gear, gases, trip type, location, and named shops.
- When the user asks for specific manual tests, avoid template language, alternatives, and "if needed" branches. Provide exact prompts, exact target records, exact booking inputs, and exact expected checkpoints for each scenario.
- For manual chat feature tests, distinguish scenario specificity from form-field specificity: define the exact chat path and expected feature checkpoints, but keep routine booking form values flexible unless a field value is needed to test validation, parsing, or a branch.

## 2026-04-01

- When chat actions (like "just send") depend on booking completeness, use the live booking form payload when the drawer is open, not only the last assistant message payload.
- Keep live form state in a dedicated drawer key (e.g. `liveBookingPayload`) so sync does not trigger `initialPayload` re-application loops.
- Respect explicit user intent words like "send" / "just send": do not add extra confirmation/checklist loops when the product behavior should execute immediately.
- For user-visible "incomplete vs sent" buckets, enforce state transition on send (e.g. clear matching draft) instead of relying only on passive readiness checks.
- When "New Chat" can be triggered from non-chat routes, proactively clear one-time resume/session handoff keys (like `glaucus-pending-draft-resume`) before navigation to avoid unintended auto-resume on mount.
- For cross-route "New Chat", use a durable one-time flag (sessionStorage) and consume it in index `onMounted`; watcher-only triggers can be missed during navigation timing.
