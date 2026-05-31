# PostHog dashboards (AI prompts)

Use these prompts in **PostHog AI** (sidebar chat in the PostHog app) after deploy and custom events appear in **Live events**. Event names match `app/composables/useAnalytics.ts`.

## How to run

1. Deploy with `NUXT_PUBLIC_POSTHOG_ENABLED=true` and your project key on Netlify.
2. Complete at least one user flow (open chat → search → optional booking) so events exist.
3. Open PostHog → AI chat → paste a prompt below.
4. Refine with follow-ups (e.g. “last 7 days only”, “24 hour funnel window”).

Include this line in every prompt until production turns off test mode:

> Exclude events where property `test_mode` is true.

## Master dashboard

Creates **Glaucus — Product KPIs** with core tiles:

```
Create a dashboard named "Glaucus — Product KPIs" for our dive-booking app.
Exclude events where test_mode = true.

Include these insights:
1. Trend: unique users per day for event chat_opened, last 30 days.
2. Funnel (1 hour window): chat_message_sent → search_results_shown → booking_started → booking_submitted. Use exact event names.
3. Trend: count of booking_submitted per day, last 30 days (north-star).
4. Breakdown: booking_submitted by property is_guest (true vs false), last 30 days.
5. Trend: booking_submit_failed per day with breakdown by source (chat vs form), last 30 days.
6. Funnel: auth_signed_up and auth_signed_in counts vs booking_submitted for identified users, last 30 days.
```

## Follow-up prompts

| Goal | Prompt |
|------|--------|
| Search quality | `Funnel from chat_message_sent to search_results_shown in the last 7 days. Break down search_results_shown by shop_count buckets 0, 1-5, 6+. Exclude test_mode = true.` |
| Entity clarify | `Trend of entity_clarify_selected by clarify_kind, last 30 days. Exclude test_mode = true.` |
| Pre-send drop-off | `Funnel booking_started → booking_presend_review → booking_submitted, 24 hour window. Exclude test_mode = true.` |
| Web traffic | `Create a dashboard tile: pageviews and unique visitors by path for the last 7 days.` |
| Session replay playlist | `Create a playlist of session recordings where users triggered booking_started but did not trigger booking_submitted in the same session, last 7 days.` |
| Hog function (optional) | `Create a Hog function that drops events where test_mode = true or environment is staging.` |

## Event reference

| Event | Properties |
|-------|----------------|
| `chat_opened` | `is_guest`, `entry` (`landing` \| `direct`) |
| `chat_message_sent` | `in_booking_flow`, `is_chip`, `message_kind` |
| `search_results_shown` | `shop_count`, `total_results`, `has_more` |
| `entity_clarify_selected` | `clarify_kind` |
| `booking_started` | `shop_id`, `source` (`card` \| `panel`) |
| `booking_presend_review` | `shop_id` |
| `booking_submitted` | `shop_id`, `diver_count`, `source` (`chat` \| `form`), `is_guest` |
| `booking_submit_failed` | `shop_id`, `source`, `error_code` |
| `auth_signed_up` | `method` |
| `auth_signed_in` | `method` (`email` \| `google`) |

## Tips

- Use exact event names (`booking_submitted`, not “booking complete”).
- Specify insight type when needed: “as a funnel”, “as a trend”, “broken down by …”.
- Optional: [PostHog MCP](https://posthog.com/docs/product-analytics/build-insights-mcp) in Cursor can run the same prompts via `dashboard-create` / `insight-create-from-query`.

## Project settings (one-time)

- **Session replay:** Settings → Session replay → enable.
- **Web analytics:** Pageviews are captured automatically when PostHog is enabled.
