/** Minimal booking types to avoid circular import from ai-search.post */
interface BookingDiverLocal {
  name: string
  certificationNumber: string
  numberOfDives: string
  height: string
  heightUnit: string
  weight: string
  weightUnit: string
  gear: { gearType: string }[]
}

interface BookingPayloadLocal {
  name?: string
  email?: string
  startDate?: string
  endDate?: string
  numberOfDivers?: number
  divers?: BookingDiverLocal[]
  desiredDiveSites?: string[]
}

export type BookingStep =
  | 'name'
  | 'email'
  | 'dates'
  | 'numberOfDivers'
  | 'isContactDiver1'
  | 'diverName'
  | 'certificationNumber'
  | 'numberOfDives'
  | 'height'
  | 'weight'
  | 'gear'
  | 'diveSites'
  | 'ready'

export interface NextStepResult {
  step: BookingStep
  diverIndex?: number
  diverName?: string
}

function ensureDivers (p: BookingPayloadLocal): BookingDiverLocal[] {
  if (!p.divers || !Array.isArray(p.divers)) return []
  return p.divers
}

/** Determine which field we're waiting for based on current payload. */
export function getNextBookingStep (payload: BookingPayloadLocal): NextStepResult | null {
  if (!payload) return null
  if (!payload.name || String(payload.name).trim() === '') return { step: 'name' }
  if (!payload.email || String(payload.email).trim() === '') return { step: 'email' }
  if (!payload.startDate || !payload.endDate) return { step: 'dates' }
  const numDivers = payload.numberOfDivers != null && payload.numberOfDivers >= 1 ? payload.numberOfDivers : 1
  const divers = ensureDivers(payload)
  for (let j = divers.length; j < numDivers; j++) {
    divers.push({
      name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'cm',
      weight: '', weightUnit: 'kg', gear: []
    })
  }
  payload.divers = divers

  for (let idx = 0; idx < numDivers; idx++) {
    const d = divers[idx] || {}
    if (!d.name || String(d.name).trim() === '') return { step: 'diverName', diverIndex: idx, diverName: '' }
    if (!d.certificationNumber || String(d.certificationNumber).trim() === '') return { step: 'certificationNumber', diverIndex: idx, diverName: d.name }
    if (d.numberOfDives === undefined || d.numberOfDives === null || String(d.numberOfDives).trim() === '') return { step: 'numberOfDives', diverIndex: idx, diverName: d.name }
    if (!d.height || String(d.height).trim() === '') return { step: 'height', diverIndex: idx, diverName: d.name }
    if (!d.weight || String(d.weight).trim() === '') return { step: 'weight', diverIndex: idx, diverName: d.name }
    const wu = String(d.weightUnit || '').trim().toLowerCase()
    if (d.weight && wu !== 'lbs' && wu !== 'kg') return { step: 'weight', diverIndex: idx, diverName: d.name }
  }

  const lastDiver = divers[numDivers - 1]
  const gearEmpty = !lastDiver?.gear || !Array.isArray(lastDiver.gear) || lastDiver.gear.length === 0
  if (lastDiver && gearEmpty) {
    return { step: 'gear', diverIndex: numDivers - 1, diverName: lastDiver.name || 'Diver ' + numDivers }
  }
  return { step: 'diveSites' }
}

/** Try to parse a simple value and return next message + updated payload, or null to use LLM. */
export function tryFastPath (
  step: NextStepResult,
  userMessage: string,
  payload: BookingPayloadLocal,
  _shopName: string,
  options?: { rentalEquipmentNames?: string[] }
): { message: string; payload: BookingPayloadLocal } | null {
  const msg = userMessage.trim()
  if (!msg) return null

  const p = JSON.parse(JSON.stringify(payload)) as BookingPayloadLocal
  const divers = ensureDivers(p)
  const i = step.diverIndex ?? 0

  switch (step.step) {
    case 'name': {
      if (msg.length < 2 || msg.length > 100) return null
      p.name = msg
      return { message: `Thanks — got your name. What's the best email address for the booking?`, payload: p }
    }
    case 'email': {
      const email = msg.replace(/\s+/g, '')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
      p.email = email
      return { message: `What are your diving start and end dates? You can say them in any format (e.g. April 4–20, 2026).`, payload: p }
    }
    case 'dates':
    case 'isContactDiver1':
      return null
    case 'numberOfDivers': {
      const n = parseInt(msg, 10)
      if (Number.isNaN(n) || n < 1 || n > 20) return null
      p.numberOfDivers = n
      while (ensureDivers(p).length < n) {
        (p.divers = p.divers || []).push({
          name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'cm',
          weight: '', weightUnit: 'kg', gear: []
        })
      }
      const contactName = p.name || 'You'
      return { message: `Is ${contactName} one of the divers? I'll use that name for Diver 1 if yes — otherwise tell me Diver 1's full name.`, payload: p }
    }
    case 'diverName': {
      if (msg.length < 2 || msg.length > 80) return null
      if (!divers[i]) divers.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', gear: [] })
      divers[i].name = msg
      p.divers = divers
      return { message: `Thanks — ${msg}, got it. What is ${msg}'s certification number?`, payload: p }
    }
    case 'certificationNumber': {
      if (!divers[i]) return null
      divers[i].certificationNumber = msg
      p.divers = divers
      const n = divers[i].name || 'They'
      return { message: `Thanks — got ${n}'s certification number as ${msg}. How many dives has ${n} completed?`, payload: p }
    }
    case 'numberOfDives': {
      if (!divers[i]) return null
      const num = msg.replace(/\D/g, '') || msg
      if (num === '') return null
      divers[i].numberOfDives = num
      p.divers = divers
      const n = divers[i].name || 'They'
      return { message: `Thanks — got ${n}'s dive count as ${num}. What's ${n}'s height? Please include the unit (cm or ft-in).`, payload: p }
    }
    case 'height': {
      if (!divers[i]) return null
      const heightMatch = msg.match(/^([\d.'\s]+)\s*(ft[- ]?in|cm|in)?$/i)
      const value = (heightMatch && heightMatch[1]) ? heightMatch[1].trim() : msg
      const unit = (heightMatch && heightMatch[2]) ? (heightMatch[2].toLowerCase().includes('cm') ? 'cm' : 'ft-in') : (/\d+\s*cm/i.test(msg) ? 'cm' : 'ft-in')
      divers[i].height = value
      divers[i].heightUnit = unit
      p.divers = divers
      const n = divers[i].name || 'They'
      return { message: `Thanks — I've recorded ${n}'s height as ${value} ${unit === 'ft-in' ? 'ft-in' : 'cm'}. What's ${n}'s weight? Please include the unit (kg or lbs).`, payload: p }
    }
    case 'weight': {
      if (!divers[i]) return null
      const lower = msg.toLowerCase()
      const unitOnly = /^(lbs?|kg|pounds)$/.test(lower)
      if (unitOnly) {
        if (!divers[i].weight) return null
        divers[i].weightUnit = lower.startsWith('lb') || lower === 'pounds' ? 'lbs' : 'kg'
        p.divers = divers
        const n = divers[i].name || 'They'
        const numDivers = p.numberOfDivers ?? 1
        if (i < numDivers - 1) {
          return { message: `Got it — recorded ${n}'s weight as ${divers[i].weight} ${divers[i].weightUnit}. What's Diver ${i + 2}'s full name?`, payload: p }
        }
        return { message: `Got it — recorded ${n}'s weight as ${divers[i].weight} ${divers[i].weightUnit}. Does ${n} need any rental gear?`, payload: p }
      }
      const weightMatch = msg.match(/^([\d.]+)\s*(lbs?|kg)?$/i)
      const value = (weightMatch && weightMatch[1]) ? weightMatch[1].trim() : msg.replace(/\s*(lbs?|kg)\s*/gi, ' ').trim()
      if (!value || Number.isNaN(parseFloat(value))) return null
      const unit = (weightMatch && weightMatch[2]) ? (weightMatch[2].toLowerCase().startsWith('lb') ? 'lbs' : 'kg') : (/\d+\s*lbs?/i.test(msg) ? 'lbs' : 'kg')
      divers[i].weight = value
      divers[i].weightUnit = unit
      p.divers = divers
      const n = divers[i].name || 'They'
      const numDivers = p.numberOfDivers ?? 1
      if (i < numDivers - 1) {
        return { message: `Thanks — recorded ${n}'s weight as ${value} ${unit}. What's Diver ${i + 2}'s full name?`, payload: p }
      }
      return { message: `Thanks — recorded ${n}'s weight as ${value} ${unit}. Does ${n} need any rental gear?`, payload: p }
    }
    case 'gear': {
      const lower = msg.toLowerCase()
      const isDone = /\b(done|that's all|finish|that's it)\b/.test(lower)
      const isNone = /\b(none|no|nope|nothing|n\/a)\b/.test(lower) || (msg.trim() === '' && !isDone)
      if (isDone && divers[i]?.gear?.length) {
        p.divers = divers
        const numDivers = p.numberOfDivers ?? 1
        const n = divers[i].name || 'They'
        if (i < numDivers - 1) {
          return { message: `Got it — ${n}'s gear is set. What's Diver ${i + 2}'s full name?`, payload: p }
        }
        return { message: `Got it — ${n}'s gear is set. Pick one or more below, or say "any". Add another or say "done" when finished.`, payload: p }
      }
      if (isNone || (isDone && !divers[i]?.gear?.length)) {
        if (!divers[i]) return null
        divers[i].gear = []
        p.divers = divers
        const numDivers = p.numberOfDivers ?? 1
        if (i < numDivers - 1) {
          return { message: `Got it — no rental gear for ${divers[i].name}. What's Diver ${i + 2}'s full name?`, payload: p }
        }
        return { message: `Got it — no rental gear. Pick one or more below, or say "any". Add another or say "done" when finished.`, payload: p }
      }
      const equipmentNames = options?.rentalEquipmentNames ?? []
      if (equipmentNames.length > 0) {
        const matched = equipmentNames.find(n => n.toLowerCase() === lower)
        if (matched) {
          if (!divers[i].gear) divers[i].gear = []
          const already = divers[i].gear.some(g => (g.gearType || '').toLowerCase() === lower)
          if (!already) divers[i].gear.push({ gearType: matched })
          p.divers = divers
          const n = divers[i].name || 'They'
          return { message: `Added ${matched} for ${n}. Add another or say "none" when done.`, payload: p }
        }
      }
      return null
    }
    case 'diveSites':
    case 'ready':
      return null
    default:
      return null
  }
}

/** When user replies only with a unit (e.g. "lbs" after "135"), apply it to the diver we're currently asking for (weight set but unit missing). */
export function tryFastPathUnitOnly (
  userMessage: string,
  payload: BookingPayloadLocal,
  _shopName: string
): { message: string; payload: BookingPayloadLocal } | null {
  const msg = userMessage.trim().toLowerCase()
  if (!/^(lbs?|kg|pounds)$/.test(msg)) return null
  const unit = msg.startsWith('lb') || msg === 'pounds' ? 'lbs' : 'kg'
  const divers = ensureDivers(payload)
  let targetIdx = -1
  for (let idx = 0; idx < divers.length; idx++) {
    const w = String(divers[idx].weight || '').trim()
    const wu = String(divers[idx].weightUnit || '').trim().toLowerCase()
    if (w !== '' && wu !== 'lbs' && wu !== 'kg') targetIdx = idx
  }
  if (targetIdx < 0) return null
  const p = JSON.parse(JSON.stringify(payload)) as BookingPayloadLocal
  const d = ensureDivers(p)
  if (!d[targetIdx]) return null
  d[targetIdx].weightUnit = unit
  p.divers = d
  const n = d[targetIdx].name || 'They'
  const numDivers = p.numberOfDivers ?? 1
  if (targetIdx < numDivers - 1) {
    return { message: `Got it — recorded ${n}'s weight as ${d[targetIdx].weight} ${unit}. What's Diver ${targetIdx + 2}'s full name?`, payload: p }
  }
  return { message: `Got it — recorded ${n}'s weight as ${d[targetIdx].weight} ${unit}. Does ${n} need any rental gear?`, payload: p }
}
