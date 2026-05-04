import { extractMidBookingShopSwitchPhrase } from './bookingFlowEscape'
import { contactNameInputLikelyNotAPlainName } from './bookingFieldReplyHeuristics'

/** Minimal booking types to avoid circular import from ai-search.post */
export interface BookingDiverLocal {
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

export interface BookingPayloadLocal {
  /** Set when booking is tied to a shop (chat/orchestrator; same as top-level BookingPayload). */
  shopId?: string
  name?: string
  email?: string
  startDate?: string
  endDate?: string
  /** When trip length >21 days, server stores proposed range until user confirms. */
  pendingLongTripConfirmation?: { startDate: string; endDate: string }
  numberOfDivers?: number
  divers?: BookingDiverLocal[]
  desiredCourses?: string[]
  /** When false, user is still adding courses (multi-select); when true, advance past courses. Omit = legacy (desiredCourses alone completes the step). */
  coursesSelectionComplete?: boolean
  desiredDiveSites?: string[]
  /** Chat/orchestrator only: user saw pre-send review and confirmed (not sent to /api/booking). */
  preSendReviewAck?: boolean
  /** Guest skipped before-send signup prompt (not sent to /api/booking). */
  preSendSignupSkipped?: boolean
  /**
   * Chat-only: after a vague review edit ("can we change the name?") the next user message
   * is treated as the replacement value. Cleared when applied or when pre-send flags reset.
   */
  pendingReviewEdit?: PendingReviewEdit
  /** Chat-only: last long line held until user picks a clarify chip (not sent to /api/booking). */
  pendingVerbatimContactName?: string
}

export type PendingReviewEdit =
  | {
      kind: 'awaiting_value'
      target: 'contact_name' | 'contact_email' | 'trip_dates' | 'number_of_divers'
    }
  | {
      kind: 'awaiting_value'
      target: 'diver_field'
      diverIndex: number
      field: 'name' | 'certificationNumber' | 'numberOfDives' | 'height' | 'weight' | 'gear'
    }

export type BookingStep =
  | 'name'
  | 'email'
  | 'dates'
  | 'courses'
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

/** Courses step is complete when user tapped Done (or legacy payload had desiredCourses set without the in-progress flag). */
export function isCoursesStepComplete (p: BookingPayloadLocal): boolean {
  if (p.coursesSelectionComplete === false) return false
  if (p.coursesSelectionComplete === true) return true
  return p.desiredCourses !== undefined
}

/** Determine which field we're waiting for based on current payload. Order: name → email → dates → courses → diveSites → numberOfDivers → (per-diver details + gear). */
export function getNextBookingStep (payload: BookingPayloadLocal): NextStepResult | null {
  if (!payload) return null
  if (!payload.name || String(payload.name).trim() === '') return { step: 'name' }
  if (!payload.email || String(payload.email).trim() === '') return { step: 'email' }
  if (!payload.startDate || !payload.endDate) return { step: 'dates' }
  if (!isCoursesStepComplete(payload)) return { step: 'courses' }
  if (payload.desiredDiveSites === undefined) return { step: 'diveSites' }
  // Number of divers
  if (payload.numberOfDivers == null || payload.numberOfDivers < 1) return { step: 'numberOfDivers' }
  const numDivers = payload.numberOfDivers
  const divers = ensureDivers(payload)
  for (let j = divers.length; j < numDivers; j++) {
    divers.push({
      name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in',
      weight: '', weightUnit: 'lbs', gear: []
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

function diverHasAnyData (d: BookingDiverLocal | undefined): boolean {
  if (!d) return false
  return Boolean(
    (d.name && String(d.name).trim()) ||
    (d.certificationNumber && String(d.certificationNumber).trim()) ||
    (d.numberOfDives !== undefined && d.numberOfDives !== null && String(d.numberOfDives).trim() !== '') ||
    (d.height && String(d.height).trim()) ||
    (d.weight && String(d.weight).trim()) ||
    (d.gear && d.gear.length > 0) ||
    d.gearAsked
  )
}

/**
 * Enforce canonical booking order: strip fields that cannot exist yet (e.g. profile-prefilled divers
 * before courses/sites/numberOfDivers). Auto-fill desiredCourses/desiredDiveSites as [] when the shop
 * has none so the step machine can advance. Safe to call on every orchestrator response.
 */
export function clampBookingPayloadToNextStep (
  payload: BookingPayloadLocal | undefined | null,
  options: { shopCourseCount: number; shopDiveSiteCount: number }
): BookingPayloadLocal {
  const shopCourseCount = Math.max(0, options.shopCourseCount)
  const shopDiveSiteCount = Math.max(0, options.shopDiveSiteCount)
  if (!payload || typeof payload !== 'object') return {}
  const p = JSON.parse(JSON.stringify(payload)) as BookingPayloadLocal

  for (let guard = 0; guard < 32; guard++) {
    const next = getNextBookingStep(p)
    if (!next || next.step === 'ready') break

    if (next.step === 'name') {
      if (p.startDate !== undefined) delete p.startDate
      if (p.endDate !== undefined) delete p.endDate
      if (p.pendingLongTripConfirmation !== undefined) delete p.pendingLongTripConfirmation
      if (p.desiredCourses !== undefined) delete p.desiredCourses
      if (p.coursesSelectionComplete !== undefined) delete p.coursesSelectionComplete
      if (p.desiredDiveSites !== undefined) delete p.desiredDiveSites
      if (p.numberOfDivers !== undefined) delete p.numberOfDivers
      if (p.divers?.length) p.divers = undefined
      continue
    }
    if (next.step === 'email') {
      if (p.startDate !== undefined) delete p.startDate
      if (p.endDate !== undefined) delete p.endDate
      if (p.pendingLongTripConfirmation !== undefined) delete p.pendingLongTripConfirmation
      if (p.desiredCourses !== undefined) delete p.desiredCourses
      if (p.coursesSelectionComplete !== undefined) delete p.coursesSelectionComplete
      if (p.desiredDiveSites !== undefined) delete p.desiredDiveSites
      if (p.numberOfDivers !== undefined) delete p.numberOfDivers
      if (p.divers?.length) p.divers = undefined
      continue
    }
    if (next.step === 'dates') {
      if (p.desiredCourses !== undefined) delete p.desiredCourses
      if (p.coursesSelectionComplete !== undefined) delete p.coursesSelectionComplete
      if (p.desiredDiveSites !== undefined) delete p.desiredDiveSites
      if (p.numberOfDivers !== undefined) delete p.numberOfDivers
      if (p.divers?.length) p.divers = undefined
      continue
    }
    if (next.step === 'courses') {
      if (shopCourseCount === 0) {
        p.desiredCourses = []
        p.coursesSelectionComplete = true
        continue
      }
      let changed = false
      if (p.desiredDiveSites !== undefined) {
        delete p.desiredDiveSites
        changed = true
      }
      if (p.numberOfDivers !== undefined) {
        delete p.numberOfDivers
        changed = true
      }
      if (p.divers?.length) {
        p.divers = undefined
        changed = true
      }
      if (Array.isArray(p.desiredCourses) && p.desiredCourses.length === 0) {
        p.desiredCourses = undefined
        if (p.coursesSelectionComplete !== undefined) delete p.coursesSelectionComplete
        changed = true
      }
      if (!changed) break
      continue
    }
    if (next.step === 'diveSites') {
      if (shopDiveSiteCount === 0) {
        p.desiredDiveSites = []
        continue
      }
      let changed = false
      if (p.numberOfDivers !== undefined) {
        delete p.numberOfDivers
        changed = true
      }
      if (p.divers?.length) {
        p.divers = undefined
        changed = true
      }
      if (Array.isArray(p.desiredDiveSites) && p.desiredDiveSites.length === 0) {
        p.desiredDiveSites = undefined
        changed = true
      }
      if (!changed) break
      continue
    }
    if (next.step === 'numberOfDivers') {
      if (p.divers?.some((d) => diverHasAnyData(d))) {
        p.divers = []
        continue
      }
      break
    }

    // Per-diver: strip profile/LLM-prefilled fields that are ahead of the canonical next step
    const di = next.diverIndex
    if (di != null && Array.isArray(p.divers) && p.divers[di]) {
      const d = p.divers[di]
      let changed = false
      const clearAfterName = () => {
        if (String(d.certificationNumber || '').trim()) {
          d.certificationNumber = ''
          changed = true
        }
        if (d.numberOfDives !== undefined && d.numberOfDives !== null && String(d.numberOfDives).trim() !== '') {
          d.numberOfDives = ''
          changed = true
        }
        if (String(d.height || '').trim()) {
          d.height = ''
          changed = true
        }
        if (String(d.weight || '').trim()) {
          d.weight = ''
          changed = true
        }
        if (d.gear?.length) {
          d.gear = []
          changed = true
        }
        if (d.gearAsked) {
          delete d.gearAsked
          changed = true
        }
      }
      const clearAfterCert = () => {
        if (d.numberOfDives !== undefined && d.numberOfDives !== null && String(d.numberOfDives).trim() !== '') {
          d.numberOfDives = ''
          changed = true
        }
        if (String(d.height || '').trim()) {
          d.height = ''
          changed = true
        }
        if (String(d.weight || '').trim()) {
          d.weight = ''
          changed = true
        }
        if (d.gear?.length) {
          d.gear = []
          changed = true
        }
        if (d.gearAsked) {
          delete d.gearAsked
          changed = true
        }
      }
      const clearAfterDives = () => {
        if (String(d.height || '').trim()) {
          d.height = ''
          changed = true
        }
        if (String(d.weight || '').trim()) {
          d.weight = ''
          changed = true
        }
        if (d.gear?.length) {
          d.gear = []
          changed = true
        }
        if (d.gearAsked) {
          delete d.gearAsked
          changed = true
        }
      }
      const clearAfterHeight = () => {
        if (String(d.weight || '').trim()) {
          d.weight = ''
          changed = true
        }
        if (d.gear?.length) {
          d.gear = []
          changed = true
        }
        if (d.gearAsked) {
          delete d.gearAsked
          changed = true
        }
      }
      const clearAfterWeight = () => {
        if (d.gear?.length) {
          d.gear = []
          changed = true
        }
        if (d.gearAsked) {
          delete d.gearAsked
          changed = true
        }
      }

      if (next.step === 'diverName') {
        clearAfterName()
        if (changed) continue
        break
      }
      if (next.step === 'certificationNumber') {
        clearAfterCert()
        if (changed) continue
        break
      }
      if (next.step === 'numberOfDives') {
        clearAfterDives()
        if (changed) continue
        break
      }
      if (next.step === 'height') {
        clearAfterHeight()
        if (changed) continue
        break
      }
      if (next.step === 'weight') {
        clearAfterWeight()
        if (changed) continue
        break
      }
    }
    break
  }

  return p
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
  /** Short ack bubble before `message` when one turn closes a topic and asks the next (e.g. dates → courses). */
  messagePreamble?: string
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

/** Non-empty diver names already on this booking (for chip filtering). */
export function collectAssignedDiverNamesLower (payload: BookingPayloadLocal): Set<string> {
  const out = new Set<string>()
  const divers = payload.divers || []
  const num = payload.numberOfDivers
  const n = num != null && num >= 1 ? Math.min(num, divers.length) : divers.length
  for (let j = 0; j < n; j++) {
    const t = (divers[j]?.name || '').trim()
    if (t) out.add(t.toLowerCase())
  }
  return out
}

/** Top profile divers (by times_used) not already on this trip, plus "Create new diver". */
export function profileDiverSelectableChipsFromPrefill (
  profilePrefill?: { defaultDivers?: ProfileDiverPrefill[]; defaultDiver?: ProfileDiverPrefill },
  options?: { bookingPayload?: BookingPayloadLocal }
): { label: string; value: string }[] | undefined {
  const defaultDiversListFull = (profilePrefill?.defaultDivers?.length ? profilePrefill.defaultDivers : profilePrefill?.defaultDiver ? [profilePrefill.defaultDiver] : []) as ProfileDiverPrefill[]
  if (defaultDiversListFull.length === 0) return undefined
  const assigned = options?.bookingPayload ? collectAssignedDiverNamesLower(options.bookingPayload) : new Set<string>()
  const available = [...defaultDiversListFull]
    .sort((a, b) => (b.times_used ?? 0) - (a.times_used ?? 0))
    .filter((d) => {
      const nm = (d.name || '').trim().toLowerCase()
      return nm && !assigned.has(nm)
    })
  const topTwo = available.slice(0, 2)
  const useChips = topTwo.map((d) => ({
    label: `Use ${(d.name || '').trim()}`,
    value: `Use ${(d.name || '').trim()}`
  }))
  if (useChips.length === 0) {
    return [{ label: 'Create new diver', value: 'Create new diver' }]
  }
  return [...useChips, { label: 'Create new diver', value: 'Create new diver' }]
}

function profileDiverToPayload (d: ProfileDiverPrefill): BookingDiverLocal {
  const hu = (d.height_unit || 'ft-in').toLowerCase()
  const wu = (d.weight_unit || 'lbs').toLowerCase()
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

/**
 * Recognize common height inputs without spelling "ft-in" or "cm":
 * - Feet/inches: 5'3", 5'3, 5′3″, 5-3, 5 ft 3 in
 * - Centimeters: 170, 170 cm
 */
export function parseHeightInputForFastPath (raw: string): { value: string; heightUnit: 'ft-in' | 'cm' } | null {
  const msg = raw.trim()
  if (!msg) return null

  const cmSuffix = msg.match(/^(\d+(?:\.\d+)?)\s*(cm|centimeters?)\s*$/i)
  if (cmSuffix) return { value: cmSuffix[1].trim(), heightUnit: 'cm' }

  const ftInWords = msg.match(/^(\d)\s*(?:ft|feet|foot)\s*(\d{1,2})\s*(?:in|inches|")?\s*$/i)
  if (ftInWords) {
    const ft = parseInt(ftInWords[1], 10)
    const inch = parseInt(ftInWords[2], 10)
    if (ft >= 4 && ft <= 7 && inch >= 0 && inch <= 11) {
      return { value: `${ft}'${inch}"`, heightUnit: 'ft-in' }
    }
  }

  // 5'3, 5'3", 5′3″ — allow straight/curly quotes and inch marks
  const ftPrime = msg.match(/^(\d)\s*['′`´]\s*(\d{1,2})\s*(?:"|″|"|"|''|′′)?\s*$/i)
  if (ftPrime) {
    const ft = parseInt(ftPrime[1], 10)
    const inch = parseInt(ftPrime[2], 10)
    if (ft >= 4 && ft <= 7 && inch >= 0 && inch <= 11) {
      return { value: `${ft}'${inch}"`, heightUnit: 'ft-in' }
    }
  }

  // Shorthand 5-3 or 5 - 11 (feet-inches; feet 4–7, inches 0–11)
  const hyphen = msg.match(/^(\d)\s*[-–]\s*(\d{1,2})\s*$/)
  if (hyphen) {
    const ft = parseInt(hyphen[1], 10)
    const inch = parseInt(hyphen[2], 10)
    if (ft >= 4 && ft <= 7 && inch >= 0 && inch <= 11) {
      return { value: `${ft}'${inch}"`, heightUnit: 'ft-in' }
    }
  }

  // Plain integer without unit: treat 100–230 as cm (typical adult height)
  const plain = msg.match(/^(\d{2,3})$/)
  if (plain) {
    const n = parseInt(plain[1], 10)
    if (n >= 100 && n <= 230) return { value: String(n), heightUnit: 'cm' }
  }

  // e.g. "5 10" with space between feet and inches
  const spaced = msg.match(/^(\d)\s+(\d{1,2})\s*$/)
  if (spaced) {
    const ft = parseInt(spaced[1], 10)
    const inch = parseInt(spaced[2], 10)
    if (ft >= 4 && ft <= 7 && inch >= 0 && inch <= 11) {
      return { value: `${ft}'${inch}"`, heightUnit: 'ft-in' }
    }
  }

  return null
}

/** Feet/inches-style height (not a weight); avoids parseFloat("5'4…") → 5 on the weight step. */
export function looksLikeFeetInchesHeightInput (raw: string): boolean {
  const p = parseHeightInputForFastPath(raw)
  return p != null && p.heightUnit === 'ft-in'
}

/**
 * After recording height or weight for a diver, ask for the next missing field (weight, gear, or ready).
 * When the next step is gear and the shop lists no rental equipment, return the no-rental message here
 * — do not rely on the ai-search wrapper (that must not run on height→gear transitions).
 */
function followUpAfterDiverMeasurementAck (
  p: BookingPayloadLocal,
  diverIndex: number,
  ackLine: string,
  options?: { rentalEquipmentNames?: string[]; profilePrefill?: { defaultDivers?: ProfileDiverPrefill[]; defaultDiver?: ProfileDiverPrefill } }
): FastPathResult {
  const next = getNextBookingStep(p)
  const divers = ensureDivers(p)
  const n = (divers[diverIndex]?.name || '').trim() || `Diver ${diverIndex + 1}`

  if (next?.step === 'weight' && (next.diverIndex ?? 0) === diverIndex) {
    return { messagePreamble: ackLine, message: `What's ${n}'s weight? Please include the unit (lbs or kg).`, payload: p }
  }
  if (next?.step === 'gear' && (next.diverIndex ?? 0) === diverIndex) {
    const noGear = !options?.rentalEquipmentNames?.length
    if (noGear) {
      return {
        message: 'This dive shop doesn\'t offer rental gear. Please keep that in mind or arrange gear elsewhere.',
        payload: p,
        selectableOptions: [
          { label: 'I understand', value: 'I understand' },
          { label: 'Pick a new diveshop', value: 'Pick a new diveshop' }
        ]
      }
    }
    return { messagePreamble: ackLine, message: `Does ${n} need any rental gear?`, payload: p }
  }
  if (next?.step === 'ready') {
    return { messagePreamble: ackLine, message: 'All set — ready to send your booking request.', payload: p }
  }
  return { message: ackLine, payload: p }
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
  const defaultDiversListForMatch = defaultDiversListFull

  const p = JSON.parse(JSON.stringify(payload)) as BookingPayloadLocal
  const divers = ensureDivers(p)
  const i = step.diverIndex ?? 0

  switch (step.step) {
    case 'name': {
      // Mid-booking shop switch ("Wait, let's book with …") — orchestrator handles; never store as contact name.
      if (extractMidBookingShopSwitchPhrase(msg)) return null
      // Long / question-shaped lines — defer to orchestrator (LLM / classifier), not blind name capture.
      if (contactNameInputLikelyNotAPlainName(msg)) return null
      if (msg.length < 2 || msg.length > 100) return null
      if (looksLikeSingleName(msg)) {
        return { message: `Got it — could you give me your full name (first and last)?`, payload: p }
      }
      p.name = msg
      return {
        messagePreamble: 'Thanks — got your name.',
        message: "What's the best email address for the booking?",
        payload: p
      }
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
          name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in',
          weight: '', weightUnit: 'lbs', gear: []
        })
      }
      const chips = profileDiverSelectableChipsFromPrefill(pref, { bookingPayload: p })
      if (chips && chips.length > 0) {
        return { message: 'Use an existing diver from your profile or create a new one for Diver 1?', payload: p, selectableOptions: chips }
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
      // Structured chip / phrase: always advance to manual name entry (never re-show profile chips — that looped for Diver 2+).
      if (/^create\s+new\s+diver$/i.test(msg)) {
        return { message: `What's Diver ${i + 1}'s full name?`, payload: p }
      }
      if (defaultDiversListForMatch.length) {
        const useMatch = msg.match(/^use\s+(.+)$/i)
        if (useMatch) {
          const namePart = useMatch[1].trim()
          const match = defaultDiversListForMatch.find((d) => (d.name || '').trim().toLowerCase() === namePart.toLowerCase())
          if (match) {
            const nameLc = (match.name || '').trim().toLowerCase()
            if (nameLc) {
              const dlist = p.divers || []
              const cap = Math.max(0, p.numberOfDivers ?? dlist.length, dlist.length)
              for (let j = 0; j < cap && j < dlist.length; j++) {
                if (j === i) continue
                const t = (dlist[j]?.name || '').trim().toLowerCase()
                if (t && t === nameLc) {
                  return {
                    message: 'That diver is already on this trip. Pick someone else or say "Create new diver".',
                    payload: p,
                    selectableOptions: profileDiverSelectableChipsFromPrefill(pref, { bookingPayload: p })
                  }
                }
              }
            }
            if (!divers[i]) divers.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] })
            const filled = profileDiverToPayload(match)
            divers[i] = { ...filled, gearAsked: divers[i].gearAsked }
            p.divers = divers
            const name = divers[i].name || 'They'
            const next = getNextBookingStep(p)
            if (next?.step === 'courses') {
              return {
                messagePreamble: `Thanks — I've added ${name} from your profile.`,
                message: 'Are you interested in any courses on this trip?',
                payload: p
              }
            }
            if (next?.step === 'diveSites') {
              return {
                messagePreamble: `Thanks — I've added ${name} from your profile.`,
                message: 'Which dive sites would you like to dive?',
                payload: p
              }
            }
            if (next?.step === 'gear') {
              return {
                messagePreamble: `Thanks — I've added ${name} from your profile.`,
                message: `Does ${name} need any rental gear?`,
                payload: p
              }
            }
            if (next?.step === 'certificationNumber') {
              return {
                messagePreamble: `Thanks — I've added ${name} from your profile.`,
                message: `What is ${name}'s certification number?`,
                payload: p
              }
            }
            return { message: `Thanks — I've added ${name} from your profile.`, payload: p }
          }
        }
      }
      // Diver 1: if we have a contact name and user confirms they are Diver 1 (yes/yep/correct), use contact name and move on
      if (i === 0 && p.name && String(p.name).trim()) {
        const affirm = /\b(yes|yeah|yep|yup|correct|that's me|that is me|i am|i'm one|sure|please do)\b/i.test(msg) || /^\s*y\s*$/i.test(msg)
        if (affirm) {
          if (!divers[0]) divers.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] })
          divers[0].name = String(p.name).trim()
          p.divers = divers
          const name = divers[0].name
          return {
            messagePreamble: `Thanks — I'll use ${name} for Diver 1.`,
            message: `What is ${name}'s certification number?`,
            payload: p
          }
        }
      }
      if (msg.length < 2 || msg.length > 80) return null
      if (looksLikeSingleName(msg)) {
        const diverChips = i >= 1 ? profileDiverSelectableChipsFromPrefill(pref, { bookingPayload: p }) : undefined
        if (diverChips?.length) {
          return {
            message: `Use an existing diver from your profile or create a new one for Diver ${i + 1}?`,
            payload: p,
            selectableOptions: diverChips
          }
        }
        return { message: `Could you give me Diver ${i + 1}'s full name (first and last)?`, payload: p }
      }
      if (!divers[i]) divers.push({ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] })
      divers[i].name = msg
      p.divers = divers
      return {
        messagePreamble: `Thanks — ${msg}, got it.`,
        message: `What is ${msg}'s certification number?`,
        payload: p
      }
    }
    case 'certificationNumber': {
      if (!divers[i]) return null
      divers[i].certificationNumber = msg
      p.divers = divers
      const n = divers[i].name || 'They'
      return {
        messagePreamble: `Thanks — got ${n}'s certification number as ${msg}.`,
        message: `How many dives has ${n} completed?`,
        payload: p
      }
    }
    case 'numberOfDives': {
      if (!divers[i]) return null
      const num = msg.replace(/\D/g, '') || msg
      if (num === '') return null
      divers[i].numberOfDives = num
      p.divers = divers
      const n = divers[i].name || 'They'
      return {
        messagePreamble: `Thanks — got ${n}'s dive count as ${num}.`,
        message: `What's ${n}'s height? (e.g. 5'4", 5-3, or 170 cm — say or type the unit if it's not obvious.)`,
        payload: p
      }
    }
    case 'height': {
      if (!divers[i]) return null
      const n = divers[i].name || 'They'
      const parsed = parseHeightInputForFastPath(msg)
      let value: string
      let unit: 'ft-in' | 'cm'
      if (parsed) {
        value = parsed.value
        unit = parsed.heightUnit
      } else {
        const heightMatch = msg.match(/^([\d.'\-\s]+)\s*(ft[- ]?in|cm|in)?$/i)
        value = (heightMatch && heightMatch[1]) ? heightMatch[1].trim() : msg
        unit = (heightMatch && heightMatch[2]) ? (heightMatch[2].toLowerCase().includes('cm') ? 'cm' : 'ft-in') : (/\d+\s*cm/i.test(msg) ? 'cm' : 'ft-in')
      }
      divers[i].height = value
      divers[i].heightUnit = unit
      p.divers = divers
      const ack = `Thanks — I've recorded ${n}'s height as ${value} ${unit === 'ft-in' ? 'ft-in' : 'cm'}.`
      return followUpAfterDiverMeasurementAck(p, i, ack, options)
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
        const ack = `Got it — recorded ${n}'s weight as ${divers[i].weight} ${divers[i].weightUnit}.`
        return followUpAfterDiverMeasurementAck(p, i, ack, options)
      }
      if (looksLikeFeetInchesHeightInput(msg)) {
        const n = divers[i].name || 'They'
        return {
          message: `That looks like a height in feet and inches. What's ${n}'s weight? Please include the unit (lbs or kg).`,
          payload: p
        }
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
          message: `Is that ${value} lbs or ${value} kg?`,
          payload: p,
          selectableOptions: [
            { label: 'lbs', value: 'lbs' },
            { label: 'kg', value: 'kg' }
          ]
        }
      }
      const unit = weightMatch[2].toLowerCase().startsWith('lb') ? 'lbs' : 'kg'
      divers[i].weight = value
      divers[i].weightUnit = unit
      p.divers = divers
      const n = divers[i].name || 'They'
      const ack = `Thanks — recorded ${n}'s weight as ${value} ${unit}.`
      return followUpAfterDiverMeasurementAck(p, i, ack, options)
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
          const diverChips = profileDiverSelectableChipsFromPrefill(pref, { bookingPayload: p })
          const dn = (divers[i].name || 'They').trim()
          if (diverChips?.length) {
            return {
              messagePreamble: `Got it — no rental gear for ${dn}.`,
              message: `Use an existing diver from your profile or create a new one for Diver ${i + 2}?`,
              payload: p,
              selectableOptions: diverChips
            }
          }
          return {
            messagePreamble: `Got it — no rental gear for ${divers[i].name}.`,
            message: `What's Diver ${i + 2}'s full name?`,
            payload: p
          }
        }
        return {
          messagePreamble: 'Got it — no rental gear.',
          message: 'All set — ready to send your booking request.',
          payload: p
        }
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
        return {
          messagePreamble: `Got it — ${n} will need rental gear.`,
          message: `What would ${n} like to rent? Pick from the options below or say "none" when done.`,
          payload: p
        }
      }
      if (isDone && divers[i]?.gear?.length) {
        if (divers[i]) divers[i].gearAsked = true
        p.divers = divers
        const numDivers = p.numberOfDivers ?? 1
        const n = divers[i].name || 'They'
        if (i < numDivers - 1) {
          const diverChips = profileDiverSelectableChipsFromPrefill(pref, { bookingPayload: p })
          if (diverChips?.length) {
            return {
              messagePreamble: `Got it — ${n}'s gear is set.`,
              message: `Use an existing diver from your profile or create a new one for Diver ${i + 2}?`,
              payload: p,
              selectableOptions: diverChips
            }
          }
          return {
            messagePreamble: `Got it — ${n}'s gear is set.`,
            message: `What's Diver ${i + 2}'s full name?`,
            payload: p
          }
        }
        return {
          messagePreamble: `Got it — ${n}'s gear is set.`,
          message: 'All set — ready to send your booking request.',
          payload: p
        }
      }
      if (isNone || (isDone && !divers[i]?.gear?.length)) {
        if (!divers[i]) return null
        divers[i].gear = []
        divers[i].gearAsked = true
        p.divers = divers
        const numDivers = p.numberOfDivers ?? 1
        if (i < numDivers - 1) {
          const diverChips = profileDiverSelectableChipsFromPrefill(pref, { bookingPayload: p })
          const dn = (divers[i].name || 'They').trim()
          if (diverChips?.length) {
            return {
              messagePreamble: `Got it — no rental gear for ${dn}.`,
              message: `Use an existing diver from your profile or create a new one for Diver ${i + 2}?`,
              payload: p,
              selectableOptions: diverChips
            }
          }
          return {
            messagePreamble: `Got it — no rental gear for ${divers[i].name}.`,
            message: `What's Diver ${i + 2}'s full name?`,
            payload: p
          }
        }
        return {
          messagePreamble: 'Got it — no rental gear.',
          message: 'All set — ready to send your booking request.',
          payload: p
        }
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
    case 'courses':
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
): { message: string; messagePreamble?: string; payload: BookingPayloadLocal } | null {
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
  return {
    messagePreamble: `Got it — recorded ${n}'s weight as ${d[targetIdx].weight} ${unit}.`,
    message: `Does ${n} need any rental gear?`,
    payload: p
  }
}
