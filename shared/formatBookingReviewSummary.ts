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
  if (p.name) lines.push(`Contact: ${p.name}`)
  if (p.email) lines.push(`Email: ${p.email}`)
  if (p.startDate && p.endDate) lines.push(`Trip dates: ${p.startDate} → ${p.endDate}`)
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
  const divers = p.divers || []
  for (let i = 0; i < n; i++) {
    const d = divers[i]
    const label = `Diver ${i + 1}`
    if (!d) {
      lines.push(`${label}: —`)
      continue
    }
    lines.push(`${label}: ${d.name || '—'}`)
    lines.push(`  Certification: ${d.certificationNumber || '—'}`)
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
    message: `${body}\n\nSay "change my email", "update dates", or open the form to edit. When you're ready, tap Send booking request.`
  }
}
