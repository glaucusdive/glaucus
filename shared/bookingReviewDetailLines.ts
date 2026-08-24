import { ageFromDateOfBirth } from './diverAge'

export interface BookingReviewDiver {
  name?: string
  dateOfBirth?: string
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

/** Structured booking detail lines (contact, trip, divers) shared by chat review and admin drawer. */
export function bookingReviewDetailLines (p: BookingReviewPayload): string[] {
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
    lines.push(`— Diver ${i + 1} —`)
    if (!d) {
      lines.push('  Full name: —')
      lines.push('  Date of birth: —')
      lines.push('  Certification #: —')
      lines.push('  Dives completed: —')
      lines.push('  Height: —')
      lines.push('  Weight: —')
      lines.push('  Rental gear: —')
      continue
    }
    lines.push(`  Full name: ${d.name || '—'}`)
    const dob = String(d.dateOfBirth || '').trim()
    const age = dob ? ageFromDateOfBirth(dob) : null
    lines.push(`  Date of birth: ${dob || '—'}${age != null ? ` (age ${age})` : ''}`)
    lines.push(`  Certification #: ${d.certificationNumber || '—'}`)
    lines.push(`  Dives completed: ${d.numberOfDives ?? '—'}`)
    const hu = String(d.heightUnit || '').trim()
    lines.push(`  Height: ${d.height || '—'}${hu ? ` (${hu})` : ''}`)
    const wu = String(d.weightUnit || '').trim()
    lines.push(`  Weight: ${d.weight || '—'}${wu ? ` (${wu})` : ''}`)
    lines.push(`  Rental gear: ${gearLine(d)}`)
  }

  return lines
}

export function bookingContactDisplayName (payload: Record<string, unknown>): string {
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  if (name) return name
  const email = typeof payload.email === 'string' ? payload.email.trim() : ''
  if (email) return email
  return '—'
}
