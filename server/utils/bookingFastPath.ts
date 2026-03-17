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
  /** True once we've asked for gear and they answered (none or items). Ensures we ask for every diver, not just the last. */
  gearAsked?: boolean
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

/** Determine which field we're waiting for based on current payload. Order: name → email → dates → diveSites → numberOfDivers → (per-diver details + gear). */
export function getNextBookingStep (payload: BookingPayloadLocal): NextStepResult | null {
  if (!payload) return null
  if (!payload.name || String(payload.name).trim() === '') return { step: 'name' }
  if (!payload.email || String(payload.email).trim() === '') return { step: 'email' }
  if (!payload.startDate || !payload.endDate) return { step: 'dates' }
  // Dive sites right after dates (before number of divers / diver details)
  if (payload.desiredDiveSites === undefined) return { step: 'diveSites' }
  // Number of divers
  if (payload.numberOfDivers == null || payload.numberOfDivers < 1) return { step: 'numberOfDivers' }
  const numDivers = payload.numberOfDivers
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
    // Ask for gear for every diver (not just the last)
    if (!d.gearAsked) {
      return { step: 'gear', diverIndex: idx, diverName: d.name || 'Diver ' + (idx + 1) }
    }
  }

  return { step: 'ready' }
}

/** True if the string looks like a single name (one word) rather than a full name. */
function looksLikeSingleName (s: string): boolean {
  const t = s.trim()
  if (!t) return false
  const parts = t.split(/\s+/)
  return parts.length === 1
}

export interface FastPathResult {
  message: string
  payload: BookingPayloadLocal
  selectableOptions?: { label: string; value: string }[]
}

/** Profile diver shape (from profiles.default_divers) for "use existing diver" flow. */
export interface ProfileDiverPrefill {
  name?: string
  certification_number?: string
  number_of_dives?: string
  height?: string
  height_unit?: string
  weight?: string
  weight_unit?: string
  gear?: { gear_type?: string }[]
  /** Number of times this diver has been used in a booking; used to show "most used" in chips. */
  times_used?: number
}

function profileDiverToPayload (d: ProfileDiverPrefill): BookingDiverLocal {
  const hu = (d.height_unit || 'cm').toLowerCase()
  const wu = (d.weight_unit || 'kg').toLowerCase()
  return {
    name: d.name ?? '',
    certificationNumber: d.certification_number ?? '',
    numberOfDives: d.number_of_dives ?? '',
    height: d.height ?? '',
    heightUnit: hu.includes('ft') || hu === 'ft-in' ? 'ft-in' : 'cm',
    weight: d.weight ?? '',
    weightUnit: wu.startsWith('lb') ? 'lbs' : 'kg',
    gear: (d.gear || []).map((g) => ({ gearType: (g && g.gear_type) ?? '' }))
  }
}

/** Try to parse a simple value and return next message + updated payload, or null to use LLM. */
export function tryFastPath (
  step: NextStepResult,
  userMessage: string,
  payload: BookingPayloadLocal,
  _shopName: string,
  options?: { rentalEquipmentNames?: string[]; profilePrefill?: { defaultDivers?: ProfileDiverPrefill[]; defaultDiver?: ProfileDiverPrefill } }
): FastPathResult | null {
  const msg = userMessage.trim()
  if (!msg) return null

  const pref = options?.profilePrefill
  const defaultDiversListFull = (pref?.defaultDivers?.length ? pref.defaultDivers : pref?.defaultDiver ? [pref.defaultDiver] : []) as ProfileDiverPrefill[]
  /** Top 2 most-used divers for chips (by times_used desc); fallback to first 2 if no usage. */
  const defaultDiversList = [...defaultDiversListFull].sort((a, b) => (b.times_used ?? 0) - (a.times_used ?? 0)).slice(0, 2)
  const defaultDiversListForMatch = defaultDiversListFull

  const p = JSON.parse(JSON.stringify(payload)) as BookingPayloadLocal
  const divers = ensureDivers(p)
  const i = step.diverIndex ?? 0

  switch (step.step) {
    case 'name': {
      if (msg.length < 2 || msg.length > 100) return null
      if (looksLikeSingleName(msg)) {
        return { message: `Got it — could you give me your full name (first and last)?`, payload: p }
      }
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
      const useProfileChips = defaultDiversList
        .filter((d) => (d.name || '').trim())
        .map((d) => ({ label: `Use ${(d.name || '').trim()}`, value: `Use ${(d.name || '').trim()}` }))
      if (defaultDiversListFull.length > 0 && useProfileChips.length > 0) {
        const chips: { label: string; value: string }[] = [...useProfileChips, { label: 'Create new diver', value: 'Create new diver' }]
        return { message: 'Use an existing diver from your profile or create a new one?', payload: p, selectableOptions: chips }
      }
      const contactName = (p.name || '').trim() || 'you'
      const contactDisplay = contactName.charAt(0).toUpperCase() + contactName.slice(1)
      return {
        message: `Is ${contactDisplay} one of the divers? I'll use that name for Diver 1 if yes — otherwise tell me Diver 1's full name.`,
        payload: p,
        selectableOptions: contactName !== 'you' ? [{ label: `Yes, use ${contactDisplay}`, value: 'yes' }, { label: "No, I'll give you the name", value: 'no' }] : undefined
      }
    }
    case 'diverName': {
      if (i === 0 && p.name && (/^no\s*$/i.test(msg) || /different|i'll give|i will give|give you the name/i.test(msg))) {
        return { message: `What's Diver 1's full name?`, payload: p }
      }
      if (defaultDiversListForMatch.length) {
        if (/^create\s+new\s+diver$/i.test(msg)) {
          return { message: `What's Diver ${i + 1}'s full name?`, payload: p }
        }
        const useMatch = msg.match(/^use\s+(.+)$/i)
        if (useMatch) {
          const namePart = useMatch[1].trim()
          const match = defaultDiversListForMatch.find((d) => (d.name || '').trim().toLowerCase() === namePart.toLowerCase())
          if (match) {
            if (!divers[i]) divers.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', gear: [] })
            const filled = profileDiverToPayload(match)
            divers[i] = { ...filled, gearAsked: divers[i].gearAsked }
            p.divers = divers
            const name = divers[i].name || 'They'
            return { message: `Thanks — I've added ${name} from your profile. Does ${name} need any rental gear?`, payload: p }
          }
        }
      }
      // Diver 1: if we have a contact name and user confirms they are Diver 1 (yes/yep/correct), use contact name and move on
      if (i === 0 && p.name && String(p.name).trim()) {
        const affirm = /\b(yes|yeah|yep|yup|correct|that's me|that is me|i am|i'm one|sure|please do)\b/i.test(msg) || /^\s*y\s*$/i.test(msg)
        if (affirm) {
          if (!divers[0]) divers.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', gear: [] })
          divers[0].name = String(p.name).trim()
          p.divers = divers
          const name = divers[0].name
          return { message: `Thanks — I'll use ${name} for Diver 1. What is ${name}'s certification number?`, payload: p }
        }
      }
      if (msg.length < 2 || msg.length > 80) return null
      if (looksLikeSingleName(msg)) {
        return { message: `Could you give me Diver ${i + 1}'s full name (first and last)?`, payload: p }
      }
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
        return { message: `Got it — recorded ${n}'s weight as ${divers[i].weight} ${divers[i].weightUnit}. Does ${n} need any rental gear?`, payload: p }
      }
      const weightMatch = msg.match(/^([\d.]+)\s*(lbs?|kg)?$/i)
      const value = (weightMatch && weightMatch[1]) ? weightMatch[1].trim() : msg.replace(/\s*(lbs?|kg)\s*/gi, ' ').trim()
      if (!value || Number.isNaN(parseFloat(value))) return null
      const hasUnitInMessage = weightMatch && weightMatch[2]
      // Do not assume unit when user gives only a number — ask for clarification (per AI agent rules)
      if (!hasUnitInMessage) {
        divers[i].weight = value
        divers[i].weightUnit = ''
        p.divers = divers
        const n = divers[i].name || 'They'
        return {
          message: `Is that ${value} kg or ${value} lbs?`,
          payload: p,
          selectableOptions: [
            { label: 'kg', value: 'kg' },
            { label: 'lbs', value: 'lbs' }
          ]
        }
      }
      const unit = weightMatch[2].toLowerCase().startsWith('lb') ? 'lbs' : 'kg'
      divers[i].weight = value
      divers[i].weightUnit = unit
      p.divers = divers
      const n = divers[i].name || 'They'
      return { message: `Thanks — recorded ${n}'s weight as ${value} ${unit}. Does ${n} need any rental gear?`, payload: p }
    }
    case 'gear': {
      const lower = msg.toLowerCase()
      const isDone = /\b(done|that's all|finish|that's it)\b/.test(lower)
      const isNone = /\b(none|no|nope|nothing|n\/a)\b/.test(lower) || (msg.trim() === '' && !isDone)
      // "I understand" (after no-rental-gear message) → same as none, continue
      const isIUnderstand = /\b(i understand|understood|got it|ok|okay)\b/i.test(msg)
      if (isIUnderstand && (!divers[i]?.gear || divers[i].gear.length === 0)) {
        if (!divers[i]) return null
        divers[i].gear = []
        divers[i].gearAsked = true
        p.divers = divers
        const numDivers = p.numberOfDivers ?? 1
        if (i < numDivers - 1) {
          return { message: `Got it — no rental gear for ${divers[i].name}. What's Diver ${i + 2}'s full name?`, payload: p }
        }
        return { message: `Got it — no rental gear. All set — ready to send your booking request.`, payload: p }
      }
      // "Yes" / "they do" etc. → acknowledge and ask what gear (chips shown by API); avoids LLM emitting JSON
      const wantsGear = /\b(yes|yeah|yep|yup|they do|she does|he does|we do|i do|please|sure)\b/i.test(msg) || /^\s*y\s*$/i.test(msg)
      const noRentalGearAvailable = !options?.rentalEquipmentNames || options.rentalEquipmentNames.length === 0
      if (wantsGear && (!divers[i]?.gear || divers[i].gear.length === 0)) {
        const n = divers[i]?.name || 'They'
        p.divers = divers
        if (noRentalGearAvailable) {
          return {
            message: `This dive shop doesn't offer rental gear. Please keep that in mind or arrange gear elsewhere.`,
            payload: p,
            selectableOptions: [
              { label: 'I understand', value: 'I understand' },
              { label: 'Pick a new diveshop', value: 'Pick a new diveshop' }
            ]
          }
        }
        return { message: `Got it — ${n} will need rental gear. What would ${n} like to rent? Pick from the options below or say "none" when done.`, payload: p }
      }
      if (isDone && divers[i]?.gear?.length) {
        if (divers[i]) divers[i].gearAsked = true
        p.divers = divers
        const numDivers = p.numberOfDivers ?? 1
        const n = divers[i].name || 'They'
        if (i < numDivers - 1) {
          return { message: `Got it — ${n}'s gear is set. What's Diver ${i + 2}'s full name?`, payload: p }
        }
        return { message: `Got it — ${n}'s gear is set. All set — ready to send your booking request.`, payload: p }
      }
      if (isNone || (isDone && !divers[i]?.gear?.length)) {
        if (!divers[i]) return null
        divers[i].gear = []
        divers[i].gearAsked = true
        p.divers = divers
        const numDivers = p.numberOfDivers ?? 1
        if (i < numDivers - 1) {
          return { message: `Got it — no rental gear for ${divers[i].name}. What's Diver ${i + 2}'s full name?`, payload: p }
        }
        return { message: `Got it — no rental gear. All set — ready to send your booking request.`, payload: p }
      }
      const equipmentNames = options?.rentalEquipmentNames ?? []
      if (equipmentNames.length > 0) {
        const removeMatch = msg.match(/^remove\s+(.+)$/i)
        if (removeMatch) {
          const toRemove = removeMatch[1].trim()
          const matchedName = equipmentNames.find(n => n.toLowerCase() === toRemove.toLowerCase())
          if (matchedName && divers[i].gear) {
            const before = divers[i].gear.length
            divers[i].gear = divers[i].gear.filter(g => (g.gearType || '').toLowerCase() !== matchedName.toLowerCase())
            if (divers[i].gear.length < before) {
              p.divers = divers
              const n = divers[i].name || 'They'
              const rest = divers[i].gear.length ? ' Add another or say "done" when finished.' : ' Do they need any other rental gear, or say "none" / "done"?'
              return { message: `Removed ${matchedName} for ${n}.${rest}`, payload: p }
            }
          }
        }
        const matched = equipmentNames.find(n => n.toLowerCase() === lower)
        if (matched) {
          if (!divers[i].gear) divers[i].gear = []
          const already = divers[i].gear.some(g => (g.gearType || '').toLowerCase() === lower)
          if (!already) divers[i].gear.push({ gearType: matched })
          p.divers = divers
          const n = divers[i].name || 'They'
          return { message: `Added ${matched} for ${n}. Add another or say "done" when finished.`, payload: p }
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
  return { message: `Got it — recorded ${n}'s weight as ${d[targetIdx].weight} ${unit}. Does ${n} need any rental gear?`, payload: p }
}
