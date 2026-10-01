# Booking Email Flow

This document describes the email behavior of `POST /api/booking`, including internal end-to-end test routing.

## Recipients and configuration

- `BOOKING_BCC_EMAILS` is an optional comma-separated list of addresses BCCed on every booking notification. It applies whether the notification goes to the selected business or is redirected to the internal fallback list. Duplicate addresses are removed, and addresses already present in `to` are not duplicated in `bcc`.
- `BOOKING_FALLBACK_EMAILS_LIST` is a comma-separated list of internal addresses. It is required when a booking is submitted with an address on the exact `@glaucusdive.com` domain. Matching is case-insensitive; subdomains such as `@qa.glaucusdive.com` do not match.
- Both values are server-only runtime configuration. Configure them in each deployment environment; do not expose them through `runtimeConfig.public`.
- The BCC list may be empty. Every configured recipient can see the diver and booking details, so keep it limited to authorized recipients.

## Happy paths

### Regular booking

1. The endpoint validates required fields and the email address, then looks up the selected business.
2. If the business has an email and passes the existing test-mode allowlist, Resend sends the booking notification to the business. Configured BCC recipients are included. The submitted user address remains `replyTo`.
3. The endpoint records the submission and clears the authenticated user's matching draft on a best-effort basis.
4. Resend sends the existing confirmation to the submitted user address, with the existing subject and body unchanged.
5. The response says the booking request was sent and asks the user to check their email.

### Glaucus-domain test booking

1. The same required-field and email syntax validation runs. A valid address ending in `@glaucusdive.com` selects the internal-routing path.
2. Instead of sending the booking notification to the selected business, Resend sends it to `BOOKING_FALLBACK_EMAILS_LIST`. Configured BCC recipients are included, except any already in the `to` list. The submitted address remains `replyTo`.
3. The booking is recorded with the actual notification recipients, and the authenticated user's matching draft is cleared on a best-effort basis.
4. The endpoint sends the same user confirmation to the submitted address. Its subject and body are unchanged so the demo has the same confirmation flow.
5. The test-mode business-email allowlist does not block this path because no notification is sent to the business.

## Error paths

- Missing `shopId`, name, email, dates, or divers returns HTTP 400. A malformed email returns HTTP 400 and is not eligible for internal routing.
- Missing Resend API key or booking from address returns HTTP 500 before any email is sent.
- Invalid configured BCC recipients return HTTP 500 before any email is sent. An empty BCC list is valid.
- If a Glaucus-domain booking has no valid fallback recipients configured, it returns HTTP 500 and sends neither business notification nor user confirmation.
- A missing business returns HTTP 404. A business without an email on file returns HTTP 400, including on the redirected path, because the existing user confirmation references the business email.
- For a regular address, test mode still blocks businesses outside the existing allowlist with HTTP 403. Glaucus-domain redirects bypass this check because they do not email the business.
- A failure sending the business or fallback notification is retried up to four attempts. If all attempts fail, the endpoint returns HTTP 502 and does not send the user confirmation.
- A failure sending the user confirmation is retried up to four attempts. The booking remains sent; the response states that confirmation could not be sent.
- Submission logging and draft cleanup failures are logged but do not undo an email that has already been sent.

## Email order and meaning

The notification to the business or fallback recipients is sent first. Only after it succeeds does the endpoint log the booking, clear a matching draft, and send the user confirmation. The user confirmation deliberately keeps its existing wording on both routes; on the internal test route, it still follows the demo's normal user-visible path even though the business did not receive the notification.