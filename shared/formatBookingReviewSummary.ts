import { bookingReviewDetailLines } from './bookingReviewDetailLines'

export type { BookingReviewDiver, BookingReviewPayload } from './bookingReviewDetailLines'

export function formatBookingReviewSummary (
  shopName: string,
  p: import('./bookingReviewDetailLines').BookingReviewPayload
): { messagePreamble: string; message: string } {
  const lines = bookingReviewDetailLines(p)
  const body = lines.length > 0 ? lines.join('\n') : 'No details collected yet.'
  const preamble = `Here's your booking summary for ${shopName}. Please check everything before we send it to the shop.`
  return {
    messagePreamble: preamble,
    message: `${body}\n\nYou can say things like "change my email to …", "change diver 2 weight to 70 kg", or "can we change the trip dates?" Or tap Open form to edit. When everything looks right, tap Send booking request or say you're ready to send.`
  }
}
