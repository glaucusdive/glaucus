/**
 * User-visible booking summary for pre-send review (chat + orchestrator).
 * Pure helper — no server imports.
 */

export interface BookingReviewDiver {
  name?: string
  certificationNumber?: string
  numberOfDives?: string
  height?: string
  heightUnit?: string
  weight?: string
  weightUnit?: string
  gear?: { gearType?: string }[]
  gearAsked?: boolean
}

export interface BookingReviewPayload {
  name?: string
  email?: string
  startDate?: string
  endDate?: string
  numberOfDivers?: number
  divers?: BookingReviewDiver[]
  desiredCourses?: string[]
  desiredDiveSites?: string[]
}

function gearLine (d: BookingReviewDiver): string {
  const items = (d.gear || []).map(g => String(g?.gearType || '').trim()).filter(Boolean)
  if (items.length) return items.join(', ')
  if (d.gearAsked) return 'none'
  return '—'
}

export function formatBookingReviewSummary (
  shopName: string,
  p: BookingReviewPayload
): { messagePreamble: string; message: string } {
  const lines: string[] = []
  lines.push('— Booking contact —')
  lines.push(`Name: ${p.name?.trim() ? p.name : '—'}`)
  lines.push(`Email: ${p.email?.trim() ? p.email : '—'}`)
  if (p.startDate && p.endDate) {
    lines.push(`Trip dates: ${p.startDate} → ${p.endDate}`)
  } else {
    lines.push('Trip dates: —')
  }
  if (Array.isArray(p.desiredCourses) && p.desiredCourses.length > 0) {
    lines.push(`Courses: ${p.desiredCourses.join(', ')}`)
  } else if (Array.isArray(p.desiredCourses) && p.desiredCourses.length === 0) {
    lines.push('Courses: none selected')
  }
  if (Array.isArray(p.desiredDiveSites) && p.desiredDiveSites.length > 0) {
    lines.push(`Dive sites: ${p.desiredDiveSites.join(', ')}`)
  } else if (Array.isArray(p.desiredDiveSites) && p.desiredDiveSites.length === 0) {
    lines.push('Dive sites: none selected')
  }

  const n = Math.max(1, Number(p.numberOfDivers) || (p.divers?.length ?? 0) || 1)
  lines.push(`Number of divers: ${n}`)
  const divers = p.divers || []
  for (let i = 0; i < n; i++) {
    const d = divers[i]
    const label = `— Diver ${i + 1} —`
    lines.push(label)
    if (!d) {
      lines.push('  Full name: —')
      lines.push('  Certification #: —')
      lines.push('  Dives completed: —')
      lines.push('  Height: —')
      lines.push('  Weight: —')
      lines.push('  Rental gear: —')
      continue
    }
    lines.push(`  Full name: ${d.name || '—'}`)
    lines.push(`  Certification #: ${d.certificationNumber || '—'}`)
    lines.push(`  Dives completed: ${d.numberOfDives ?? '—'}`)
    const hu = String(d.heightUnit || '').trim()
    lines.push(`  Height: ${d.height || '—'}${hu ? ` (${hu})` : ''}`)
    const wu = String(d.weightUnit || '').trim()
    lines.push(`  Weight: ${d.weight || '—'}${wu ? ` (${wu})` : ''}`)
    lines.push(`  Rental gear: ${gearLine(d)}`)
  }

  const body = lines.length > 0 ? lines.join('\n') : 'No details collected yet.'
  const preamble = `Here's your booking summary for ${shopName}. Please check everything before we send it to the shop.`
  return {
    messagePreamble: preamble,
    message: `${body}\n\nYou can say things like "change my email to …", "change diver 2 weight to 70 kg", or "can we change the trip dates?" Or tap Open form to edit. When everything looks right, tap Send booking request or say you're ready to send.`
  }
}
