/**
 * Merge booking/chat diver payloads into profiles.default_divers (snake_case JSON).
 * - bumpTimesUsed: true — match BookingForm post-submit behavior (booking divers only + times_used bump).
 * - bumpTimesUsed: false — incremental chat sync: field-wise merge by name, preserve other divers, no times_used bump.
 */

export interface ProfileDefaultDiverRow {
  name: string
  date_of_birth: string
  certification_number: string
  number_of_dives: string
  height: string
  height_unit: string
  weight: string
  weight_unit: string
  gear: { gear_type: string }[]
  times_used?: number
}

export interface BookingDiverLike {
  name?: string
  dateOfBirth?: string
  certificationNumber?: string
  numberOfDives?: string
  height?: string
  heightUnit?: string
  weight?: string
  weightUnit?: string
  gear?: { gearType?: string }[]
}

function normalizeExisting (existingRaw: unknown[]): ProfileDefaultDiverRow[] {
  if (!Array.isArray(existingRaw)) return []
  return existingRaw.map((e) => {
    const r = e as Record<string, unknown>
    const gearRaw = r.gear
    const gear = Array.isArray(gearRaw)
      ? gearRaw.map((g) => ({
          gear_type: String((g as { gear_type?: string; gearType?: string }).gear_type
            ?? (g as { gearType?: string }).gearType ?? '')
        }))
      : []
    return {
      name: String(r.name ?? ''),
      date_of_birth: String(r.date_of_birth ?? ''),
      certification_number: String(r.certification_number ?? ''),
      number_of_dives: String(r.number_of_dives ?? ''),
      height: String(r.height ?? ''),
      height_unit: String(r.height_unit ?? 'ft-in'),
      weight: String(r.weight ?? ''),
      weight_unit: String(r.weight_unit ?? 'lbs'),
      gear,
      times_used: typeof r.times_used === 'number' ? r.times_used : undefined
    }
  })
}

export function diverRowFromBookingLike (d: BookingDiverLike): Omit<ProfileDefaultDiverRow, 'times_used'> {
  return {
    name: d.name ?? '',
    date_of_birth: d.dateOfBirth ?? '',
    certification_number: d.certificationNumber ?? '',
    number_of_dives: d.numberOfDives ?? '',
    height: d.height ?? '',
    height_unit: d.heightUnit ?? 'ft-in',
    weight: d.weight ?? '',
    weight_unit: d.weightUnit ?? 'lbs',
    gear: (d.gear || []).map((g) => ({ gear_type: g?.gearType ?? '' }))
  }
}

function pickField (prev: string | undefined, next: string): string {
  const nt = String(next ?? '').trim()
  if (nt !== '') return String(next)
  return String(prev ?? '').trim()
}

function mergeGear (
  prev: { gear_type: string }[] | undefined,
  next: { gear_type: string }[]
): { gear_type: string }[] {
  const nextHas = next.some((g) => String(g.gear_type ?? '').trim() !== '')
  if (nextHas) return next
  return prev ?? []
}

function mergeDiverIncremental (
  prev: ProfileDefaultDiverRow | undefined,
  next: Omit<ProfileDefaultDiverRow, 'times_used'>
): ProfileDefaultDiverRow {
  const name = (next.name || '').trim() || (prev?.name ?? '')
  return {
    name,
    date_of_birth: pickField(prev?.date_of_birth, next.date_of_birth),
    certification_number: pickField(prev?.certification_number, next.certification_number),
    number_of_dives: pickField(prev?.number_of_dives, next.number_of_dives),
    height: pickField(prev?.height, next.height),
    height_unit: pickField(prev?.height_unit, next.height_unit) || 'ft-in',
    weight: pickField(prev?.weight, next.weight),
    weight_unit: pickField(prev?.weight_unit, next.weight_unit) || 'lbs',
    gear: mergeGear(prev?.gear, next.gear),
    times_used: prev?.times_used ?? 0
  }
}

/** Same semantics as BookingForm after successful submit. */
function mergeCompletedBooking (
  existingRaw: unknown[],
  payloadDivers: BookingDiverLike[]
): ProfileDefaultDiverRow[] {
  const existing = existingRaw as Array<Record<string, unknown> & { times_used?: number }>
  const byName = new Map<string, (typeof existing)[0]>()
  for (const e of existing) {
    const k = String(e.name ?? '').trim().toLowerCase()
    if (k) byName.set(k, e)
  }
  const merged: ProfileDefaultDiverRow[] = []
  for (const d of payloadDivers) {
    const base = diverRowFromBookingLike(d)
    const row = {
      name: base.name,
      date_of_birth: base.date_of_birth,
      certification_number: base.certification_number,
      number_of_dives: base.number_of_dives,
      height: base.height,
      height_unit: base.height_unit,
      weight: base.weight,
      weight_unit: base.weight_unit,
      gear: base.gear
    }
    const k = row.name.trim().toLowerCase()
    const prev = k ? byName.get(k) : undefined
    const times_used = prev ? (prev.times_used ?? 0) + 1 : 1
    merged.push({ ...row, times_used })
    if (k) byName.set(k, { ...row, times_used })
  }
  for (const e of existing) {
    const k = String(e.name ?? '').trim().toLowerCase()
    if (k && !byName.has(k)) {
      const [one] = normalizeExisting([e])
      if (one) merged.push(one)
    }
  }
  return merged.sort((a, b) => (b.times_used ?? 0) - (a.times_used ?? 0))
}

function mergeIncremental (
  existingRaw: unknown[],
  payloadDivers: BookingDiverLike[]
): ProfileDefaultDiverRow[] {
  const existing = normalizeExisting(existingRaw)
  const byNameInit = new Map<string, ProfileDefaultDiverRow>()
  for (const e of existing) {
    const k = e.name.trim().toLowerCase()
    if (k) byNameInit.set(k, { ...e })
  }
  const byKey = new Map<string, ProfileDefaultDiverRow>()
  for (const d of payloadDivers) {
    const next = diverRowFromBookingLike(d)
    const k = next.name.trim().toLowerCase()
    if (!k) continue
    const prevRow = byKey.get(k) ?? byNameInit.get(k)
    byKey.set(k, mergeDiverIncremental(prevRow, next))
  }
  const merged: ProfileDefaultDiverRow[] = [...byKey.values()]
  for (const e of existing) {
    const k = e.name.trim().toLowerCase()
    if (k && !byKey.has(k)) merged.push(e)
  }
  return merged.sort((a, b) => (b.times_used ?? 0) - (a.times_used ?? 0))
}

export function mergeDefaultDiversFromBookingPayload (
  existingDefaultDivers: unknown[] | null | undefined,
  payloadDivers: BookingDiverLike[] | null | undefined,
  options: { bumpTimesUsed: boolean }
): ProfileDefaultDiverRow[] {
  const existing = Array.isArray(existingDefaultDivers) ? existingDefaultDivers : []
  const divers = Array.isArray(payloadDivers) ? payloadDivers : []
  if (options.bumpTimesUsed) {
    return mergeCompletedBooking(existing, divers)
  }
  return mergeIncremental(existing, divers)
}

export function defaultDiverJsonFromFirst (first: ProfileDefaultDiverRow | undefined): Record<string, unknown> | null {
  if (!first?.name?.trim()) return null
  return {
    name: first.name,
    date_of_birth: first.date_of_birth,
    certification_number: first.certification_number,
    number_of_dives: first.number_of_dives,
    height: first.height,
    height_unit: first.height_unit,
    weight: first.weight,
    weight_unit: first.weight_unit,
    gear: first.gear
  }
}
