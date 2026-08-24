import { readBody, type H3Event } from 'h3'
import { getAuthUser } from '../utils/getAuthUser'
import {
  applyPreSendTokenToPayload,
  clearBookingPreSendFlags,
  lastAssistantWasPreSendReview,
  parseBookingPreSendToken,
  resolvePreSendWhenPayloadReady,
  type BookingSignupTiming
} from '../utils/bookingPreSend'
import { buildDiveShopQuery, type SearchFilters } from '../utils/buildDiveShopQuery'
import {
  bookingGotItWithShopMessage,
  bookingShopFieldsForClient,
  shopDisplayLabel
} from '../utils/shopDisplayForClient'
import { getShopById } from '../utils/resolveShop'
import { getDiveSitesForShop } from '../utils/getDiveSitesForShop'
import { getCoursesForShop } from '../utils/getCoursesForShop'
import { getRentalEquipmentForShop } from '../utils/getRentalEquipmentForShop'
import { mergeProfileContactIntoBookingPayload } from '~~/shared/mergeProfileContactIntoBookingPayload'
import { clampBookingPayloadToNextStep, getBookingMultiSelectAdvanceCopy, getNextBookingStep, isBookingOptionalClearSelectionToken, isBookingOptionalStepToken, tryFastPath, tryFastPathUnitOnly, profileDiverSelectableChipsFromPrefill, type BookingPayloadLocal, type NextStepResult, type PendingReviewEdit } from '../utils/bookingFastPath'
import { sanitizeBookingPayloadGearForShop } from '../../shared/filterGearToShopOfferings'
import {
  bookingCoursesStepMessage,
  bookingDiveSitesStepMessage,
  bookingGearStepMessage,
  BOOKING_GEAR_ADD_HINT,
  bookingMultiSelectChipHint
} from '../../shared/bookingMultiSelectPrompts'
import { tryHandleBookingReviewEditTurn } from '../utils/bookingReviewEdit'
import {
  canImmediateSendBookingReply,
  isAssistantAwaitingAddAnotherDiverReply,
  isConfirmSendMessage,
  shouldShowPreSendReviewOnFirstConfirm
} from '../utils/bookingSendIntentGate'
import { inclusiveTripDays } from '../utils/parseTripDates'
import { resolveTripDatesUserMessage } from '../utils/tripDateUserInput'
import { applyParsedTripDatesToBookingPayload } from '../utils/bookingApplyParsedTripDates'
import { mergeCollectedIntoBookingPayload } from '../utils/mergeBookingCollected'
import {
  bookingNounHintsFromInterpret,
  collectBookingNounHints,
  mergeBookingNounHints
} from '../../shared/bookingNounResolve'
import { parseBookShopPickMessage, shopDisambiguationSelectableOptions, canCommitBookingHandoffForShop } from '../../shared/bookShopPick'
import { formatBookingReviewSummary } from '../../shared/formatBookingReviewSummary'
import { bookingDobStepMessage } from '../../shared/diverAge'
import { extractBookingTargetFallback, extractReferredEntityPhrase, extractShopSelectionPhrase } from '../utils/extractReferredEntityPhrase'
import { parseEntityClarifyMessage } from '../utils/entityClarify'
import {
  closestShopSuggestionResponsePayload,
  clarifyResponsePayload,
  formatEntitySearchResponse,
  handleForcedEntityClarify,
  probeReferentPhrase,
  routeReferentFromProbe,
  shopDisambiguationResponsePayload
} from '../utils/entityRouting'
import {
  isCourseDiscoveryFollowUpMessage,
  tryBuildCourseDiscoverySearchResponse
} from '../utils/courseDiscoveryFromSearch'
import {
  fetchSearchShopsWithSparseWiden,
  sliceSearchShopPage
} from '../utils/fetchSearchShopsWithSparseWiden'
import { capSparseWidenShopList, buildSearchMatchContext } from '../../shared/searchResultGroups'
import { formatHereAreOperatorsInPlace } from '../../shared/searchOperatorNoun'
import { filtersWithActivityMatchContext, formatNoActivityMatchesMessage } from '../utils/searchActivityWidenMessage'
import { normalizeClientSearchFilters } from '../utils/normalizeClientSearchFilters'
import { OPENAI_CHAT_COMPLETIONS_URL, OPENAI_CHAT_MODEL } from '../utils/openAiChatModel'
import { resolveOpenAiApiKey } from '../utils/openAiApiKey'
import { tryApplySearchFilterRelax } from '../utils/searchFilterRelaxFromFollowUp'
import { resolveBookingTargetFromPhrase } from '../utils/resolveBookingTarget'
import { extractMidBookingShopSwitchPhrase, extractMidBookingLocationBrowsePhrase, userMessageWantsResumeSearchDuringBooking } from '../utils/bookingFlowEscape'
import {
  formatActivityStyleFilterLine,
  formatBookingLlmActivityLine,
  formatGeoDirectoryQueryLine,
  formatInterpretActivityLine,
  formatProbeDirectoryLine,
  formatSearchLlmActivityLine,
  formatSearchRelaxActivityLine
} from '../utils/formatSearchActivityLog'
import { tryShopInfoResponse } from '../utils/shopInfoForChat'
import { applyBookingCourseSeedIfEligible } from '../utils/inferCoursesFromConversation'
import {
  mergeTripRequirements,
  normalizeTripRequirements,
  type TripRequirements
} from '../../shared/tripRequirements'
import { rankCourseOptionsForTripRequirements } from '../../shared/rankCourseOptionsForTripRequirements'
import { tripRequirementsAfterSearchTurn } from '../utils/tripRequirementsFromSearchTurn'
import { runWithRetries } from '../utils/retryWithBackoff'
import { SEARCH_DIVE_SYSTEM_PROMPT } from '../utils/searchDiveSystemPrompt'
import {
  mergeInferredDiveTypesIntoFilters,
  runTripTypeSearchAfterLlm,
  searchFlowResetResponse
} from '../utils/tripTypeSearchPipeline'
import { mergeInterpretSearchFacetsIntoFilters } from '../utils/searchNluMerge'
import {
  formatBookingReadinessLine,
  inferBookingReadinessFromMessage,
  type BookingReadinessResult
} from '../utils/bookingReadiness'
import { logChatIntentSignal } from '../utils/logChatIntentSignal'
import {
  buildDiverFieldEditPrompt,
  clearDiverFieldOnCopy,
  snapshotDiverField,
  tryParseDiverFieldEditIntent
} from '../utils/bookingDiverEditIntent'
import {
  interpretUserTurn,
  mergeActivityIntoFilters,
  mergeNluHintsIntoFilters,
  normalizeActivityTerms,
  pickReferentPhraseForProbe,
  resolveEffectiveCertificationCourseHint,
  shouldRunInterpretNlu,
  type InterpretedTurn
} from '../utils/interpretUserTurn'
import { enrichShopsForSearchCards } from '../utils/enrichShopsForSearchCards'
import { attachSearchMatchGroups } from '../utils/searchMatchGroups'
import { shopIdsForCourseSearch } from '../utils/shopIdsForCourseSearch'
import { buildSearchMatchBadges } from '../../shared/searchMatchBadges'
import { isSearchPaginationUserMessage } from '../../app/utils/searchPaginationIntent'
import { buildSearchPaginationSelectableOption, SEARCH_PAGINATION_PAGE_SIZE_DEFAULT } from '../../shared/searchPaginationChip'
import { GuidedCommands } from '../../shared/guidedFlow'
import {
  BOOKING_CONTACT_MEANT_SOMETHING_ELSE,
  BOOKING_CONTACT_USE_PENDING_VERBATIM,
  BOOKING_PRESEND_OPEN_FORM
} from '../../shared/bookingPreSendTokens'
import { contactNameInputLikelyNotAPlainName } from '../utils/bookingFieldReplyHeuristics'
import { classifyBookingContactReply } from '../utils/bookingContactReplyClassifier'
import {
  applyResolvedTripDatesToBookingPayload,
  mergeResolvedTripDatesIntoRequirements,
  resolveTripDatesForBookingHandoff
} from '../utils/resolveTripDatesForBookingHandoff'

function abortSignalFromH3Event (event: H3Event): AbortSignal | undefined {
  const req = event.node.req
  if (!req) return undefined
  const ac = new AbortController()
  const onAbort = () => {
    try {
      ac.abort()
    } catch { /* ignore */ }
  }
  req.once('close', onAbort)
  req.once('aborted', onAbort)
  return ac.signal
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

/** Acknowledges what’s already on the payload (dates, courses, sites) — first bubble before the next-step question. */
function buildBookingAckSummaryForPayload (p: BookingPayload): string | undefined {
  const dateSeg = p.startDate && p.endDate
    ? `your dates (${p.startDate} to ${p.endDate})`
    : ''
  const tailParts: string[] = []
  if (Array.isArray(p.desiredCourses) && p.desiredCourses.length > 0) {
    tailParts.push(p.desiredCourses.join(', '))
  }
  if (Array.isArray(p.desiredDiveSites) && p.desiredDiveSites.length > 0) {
    tailParts.push(p.desiredDiveSites.join(', '))
  }
  if (dateSeg && tailParts.length > 0) {
    return `Great — I have ${dateSeg} and ${tailParts.join(' and ')}.`
  }
  if (dateSeg) return `Great — I have ${dateSeg}.`
  if (tailParts.length > 0) return `Great — I have ${tailParts.join(' and ')}.`
  return undefined
}

function isLongTripConfirmMessage (msg: string): boolean {
  const t = msg.trim()
  return /^(yes|yeah|yep|correct|right|confirmed|confirm|absolutely|sure)$/i.test(t) ||
    /^that'?s?\s*(right|correct)\b/i.test(t) ||
    /^yes,?\s*(that'?s?\s*)?(is\s*)?correct\b/i.test(t) ||
    /\bthat'?s?\s+correct\s+for\s+my\s+plans\b/i.test(t)
}

function isLongTripRejectMessage (msg: string): boolean {
  return /^(no|nope)\b/i.test(msg.trim()) || /\b(wrong|not\s+right|different\s+dates)\b/i.test(msg.trim())
}

function formatReplyAfterAppliedTripDates (
  p: BookingPayload,
  parsedDates: { startDate: string; endDate: string },
  coursesLen: number,
  diveSitesLen: number
): { message: string; messagePreamble?: string } {
  const nextAfter = getNextBookingStep(p as BookingPayloadLocal)
  let msg = `Got it — diving ${parsedDates.startDate} to ${parsedDates.endDate}.`
  let dateStepPreamble: string | undefined
  if (nextAfter?.step === 'courses' && coursesLen > 0) {
    const parts = bookingCoursesDateAckParts(p, parsedDates.startDate, parsedDates.endDate)
    dateStepPreamble = parts.messagePreamble
    msg = parts.message
  } else if (nextAfter?.step === 'diveSites' && diveSitesLen > 0) {
    dateStepPreamble = `Got it — ${parsedDates.startDate} to ${parsedDates.endDate}.`
    msg = bookingDiveSitesStepMessage(p)
  } else if (nextAfter?.step === 'numberOfDivers') {
    dateStepPreamble = `Got it — ${parsedDates.startDate} to ${parsedDates.endDate}.`
    msg = p.desiredCourses?.length && coursesLen > 0
      ? `I noted ${p.desiredCourses.join(', ')} from your search. How many divers should we book for?`
      : `How many divers should we book for?`
  }
  return { message: msg, messagePreamble: dateStepPreamble }
}

function bookingCoursesDateAckParts (p: BookingPayload, startDate: string, endDate: string) {
  return {
    messagePreamble: `Got it — ${startDate} to ${endDate}.`,
    message: bookingCoursesStepMessage(p)
  }
}

/**
 * User-visible copy for the booking UI: optional preamble bubble + main message from step + payload (not from parsing LLM prose).
 */
function orchestratorSplitBookingCopyForStep (
  next: NextStepResult,
  p: BookingPayload,
  opts: {
    shopCourseCount: number
    shopDiveSiteCount: number
  }
): { message: string; messagePreamble?: string } | null {
  const { shopCourseCount, shopDiveSiteCount } = opts
  if (next.step === 'numberOfDivers') {
    const preamble = buildBookingAckSummaryForPayload(p)
    return {
      message: 'How many divers will be on the trip?',
      ...(preamble ? { messagePreamble: preamble } : {})
    }
  }
  if (next.step === 'courses' && shopCourseCount > 0 && p.startDate && p.endDate) {
    return bookingCoursesDateAckParts(p, p.startDate, p.endDate)
  }
  if (next.step === 'diveSites' && shopDiveSiteCount > 0) {
    return { message: bookingDiveSitesStepMessage(p) }
  }

  const di = next.diverIndex ?? 0
  const diverRow = p.divers?.[di]
  const displayName = (diverRow?.name || next.diverName || '').trim() || `Diver ${di + 1}`

  if (next.step === 'dateOfBirth') {
    return { message: bookingDobStepMessage(displayName) }
  }
  if (next.step === 'certificationNumber') {
    return { message: `What's ${displayName}'s certification number?` }
  }
  if (next.step === 'numberOfDives') {
    return { message: `How many dives has ${displayName} completed?` }
  }
  if (next.step === 'height') {
    return { message: `What's ${displayName}'s height? (e.g. 5'10" or 175 cm)` }
  }
  if (next.step === 'weight') {
    return { message: `What's ${displayName}'s weight? Please include the unit (lbs or kg).` }
  }
  if (next.step === 'gear') {
    return { message: bookingGearStepMessage(displayName) }
  }

  return null
}

/** Booking payload shape (frontend sends accumulated state; backend returns updated payload when in booking flow). */
export interface BookingDiver {
  name: string
  dateOfBirth: string
  certificationNumber: string
  numberOfDives: string
  height: string
  heightUnit: string
  weight: string
  weightUnit: string
  gear: { gearType: string }[]
  /** Set when we've asked for gear and user answered (so we ask for every diver). */
  gearAsked?: boolean
}

export interface BookingPayload {
  shopId?: string
  name?: string
  email?: string
  startDate?: string
  endDate?: string
  pendingLongTripConfirmation?: { startDate: string; endDate: string }
  numberOfDivers?: number
  divers?: BookingDiver[]
  desiredCourses?: string[]
  coursesSelectionComplete?: boolean
  desiredDiveSites?: string[]
  diveSitesSelectionComplete?: boolean
  /** Chat state only — not sent to /api/booking. */
  preSendReviewAck?: boolean
  /** Guest skipped before-send signup (not sent to /api/booking). */
  preSendSignupSkipped?: boolean
  /** Chat-only: follow-up for vague review edits (not sent to /api/booking). */
  pendingReviewEdit?: PendingReviewEdit
  /** Chat-only: clarify flow for long name-step lines (not sent to /api/booking). */
  pendingVerbatimContactName?: string
}

function isSendAnywayMessage (msg: string): boolean {
  const t = msg.trim()
  return /^(send anyway|still send|send it anyway|yes send anyway|confirm send anyway)$/i.test(t)
}

function isFinishRemainingTasksMessage (msg: string): boolean {
  const t = msg.trim()
  return /^(finish|finish tasks|finish remaining tasks|complete (the )?(form|tasks)|i('| a)?ll finish|let'?s finish)$/i.test(t)
}

function parseBookingSignupTimingFromConfig (raw: unknown): BookingSignupTiming {
  if (raw === 'before_send' || raw === 'after_send' || raw === 'off') return raw
  return 'off'
}

function listIncompleteBookingTasks (
  p: BookingPayload,
  options: { shopCourseCount: number; shopDiveSiteCount: number }
): string[] {
  const tasks: string[] = []
  if (!String(p.name || '').trim()) tasks.push('Add booking contact name')
  if (!String(p.email || '').trim()) tasks.push('Add booking contact email')
  if (!String(p.startDate || '').trim() || !String(p.endDate || '').trim()) tasks.push('Set trip start and end dates')

  const coursesSelectionPending = p.coursesSelectionComplete === false || p.desiredCourses === undefined
  if (options.shopCourseCount > 0 && coursesSelectionPending) {
    tasks.push('Choose courses (or mark none)')
  }
  const diveSitesSelectionPending =
    p.diveSitesSelectionComplete === false || p.desiredDiveSites === undefined
  if (options.shopDiveSiteCount > 0 && diveSitesSelectionPending) {
    tasks.push('Choose desired dive sites (or mark none)')
  }

  const numDivers = Number(p.numberOfDivers || 0)
  if (!Number.isFinite(numDivers) || numDivers < 1) {
    tasks.push('Set number of divers')
    return tasks
  }

  for (let i = 0; i < numDivers; i++) {
    const d = p.divers?.[i]
    const diverLabel = `Diver ${i + 1}`
    if (!String(d?.name || '').trim()) tasks.push(`${diverLabel}: add full name`)
    if (!String(d?.dateOfBirth || '').trim()) tasks.push(`${diverLabel}: add date of birth`)
    if (!String(d?.certificationNumber || '').trim()) tasks.push(`${diverLabel}: add certification number`)
    if (d?.numberOfDives === undefined || d?.numberOfDives === null || String(d.numberOfDives).trim() === '') {
      tasks.push(`${diverLabel}: add number of dives`)
    }
    if (!String(d?.height || '').trim()) tasks.push(`${diverLabel}: add height`)
    if (!String(d?.weight || '').trim()) tasks.push(`${diverLabel}: add weight with unit`)
    const hasSelectedGear = Array.isArray(d?.gear) &&
      d.gear.some(g => String(g?.gearType || '').trim() !== '')
    const gearConfirmed = Boolean(d?.gearAsked) || hasSelectedGear
    if (!gearConfirmed) tasks.push(`${diverLabel}: confirm rental gear needed or none`)
  }

  return tasks
}

function normalizeBookingPayloadForSendCheck (payload: BookingPayload): BookingPayload {
  const p: BookingPayload = JSON.parse(JSON.stringify(payload || {}))
  const divers = Array.isArray(p.divers) ? p.divers : []
  const currentNum = Number(p.numberOfDivers || 0)
  // If diver rows already exist, infer diver count so "just send" does not block on numberOfDivers.
  if ((!Number.isFinite(currentNum) || currentNum < 1) && divers.length > 0) {
    p.numberOfDivers = divers.length
  }
  return p
}

export interface RequestBody {
  message: string
  history: Message[]
  selectedShopId?: string
  lastShops?: { id: string, business_name: string, city?: string | null, state?: string | null, city?: string | null, state?: string | null }[]
  /** Total number of shop cards already shown in this conversation (for pagination). */
  shopsAlreadyShownCount?: number
  bookingPayload?: BookingPayload
  /** Carried-over form data when user chose "Pick a new diveshop"; merge with new shop when they book. */
  pendingBookingPayload?: Omit<BookingPayload, 'shopId'>
  /** When the last assistant reply was in booking flow, so this message is form input (e.g. name, email). */
  lastIntent?: 'booking' | 'search'
  lastBookingShopId?: string
  /** Shop name when in booking flow (avoids fetching shop for unit-only fast path). */
  lastBookingShopName?: string
  /** Optional prefill from user profile (name, email, all divers) for signed-in users. */
  profilePrefill?: {
    name?: string
    email?: string
    defaultDiver?: { name?: string; certification_number?: string; number_of_dives?: string; height?: string; height_unit?: string; weight?: string; weight_unit?: string; gear?: { gear_type?: string }[] }
    /** Full list of divers from last booking (name, certification_number, number_of_dives, height, height_unit, weight, weight_unit, gear). */
    defaultDivers?: Array<{ name?: string; certification_number?: string; number_of_dives?: string; height?: string; height_unit?: string; weight?: string; weight_unit?: string; gear?: { gear_type?: string }[] }>
  }
  /** Phrase from last assistant entityClarifyPending (user is answering with a clarification chip). */
  pendingEntityClarifyPhrase?: string
  /** Echo of last search filters (client) so pagination can skip LLM filter extraction. */
  lastSearchFilters?: SearchFilters
  /** Echo of last search totalResults (client); with lastSearchFilters enables a single DB range page. */
  lastSearchTotalResults?: number
  /** Canonical trip constraints (search → booking handoff). */
  tripRequirements?: TripRequirements
  /** When true, POST handler may be invoked with a pre-read body; client uses NDJSON progress on `/api/guided-orchestrator`. */
  progressStream?: boolean
}

export type RunAiSearchPostHandlerOptions = {
  body?: RequestBody
  onActivityLine?: (label: string) => void
}

function inferAlreadyShownForPagination (history: Message[], shopsAlreadyShownCount: number | undefined): number {
  let alreadyShown = typeof shopsAlreadyShownCount === 'number' && shopsAlreadyShownCount >= 0 ? shopsAlreadyShownCount : 0
  if (alreadyShown === 0 && history?.length) {
    for (let i = 0; i < history.length; i++) {
      const msg = history[i]
      if (msg.role === 'assistant') {
        const hasResultsPhrase = msg.content?.includes('Here are') ||
          msg.content?.includes('top results') ||
          msg.content?.includes('Here are the')
        // Count any assistant bubble that announces card results. Do not use trailing "?" or
        // "Would you…" to skip — many first pages end with a narrowing question after "top results".
        if (hasResultsPhrase) {
          const nextN = msg.content?.match(/next (\d+)\s+results?/i)?.[1]
          const shown = nextN ? parseInt(nextN, 10) : SEARCH_PAGINATION_PAGE_SIZE_DEFAULT
          alreadyShown += Number.isNaN(shown) ? SEARCH_PAGINATION_PAGE_SIZE_DEFAULT : shown
          console.log(`[AI Search] Found result message at index ${i}, shown: ${shown}, total shown: ${alreadyShown}`)
        }
      }
    }
  }
  return alreadyShown
}

/**
 * Pagination responses previously returned raw `buildDiveShopQuery` rows — no `cardCourseNames`,
 * no `searchMatchBadges`, and no course-directory filter. Align with `runTripTypeSearchAfterLlm` presentation.
 */
async function finalizeSearchPaginationApiResponse (
  supabaseUrl: string,
  supabaseKey: string,
  userMessage: string,
  interpretTurn: InterpretedTurn | null,
  lastFilters: SearchFilters,
  nextShopsRaw: unknown[],
  resultCount: number,
  alreadyShown: number,
  paginationPageSize: number = SEARCH_PAGINATION_PAGE_SIZE_DEFAULT
) {
  let filters: SearchFilters = { ...lastFilters }
  const inferredHint = resolveEffectiveCertificationCourseHint(userMessage, interpretTurn ?? null)
  if (inferredHint?.trim() && !filters.certificationCourseHint?.trim()) {
    filters = { ...filters, certificationCourseHint: inferredHint.trim() }
  }

  let presentationShops = [...(nextShopsRaw || [])]
  const hint = filters.certificationCourseHint?.trim()
  if (hint && presentationShops.length > 0) {
    const allowed = new Set(await shopIdsForCourseSearch(supabaseUrl, supabaseKey, hint))
    presentationShops = (presentationShops as { id?: string }[]).filter(s => s.id && allowed.has(s.id))
  }
  if (presentationShops.length > 0) {
    await enrichShopsForSearchCards(supabaseUrl, supabaseKey, presentationShops)
    presentationShops = await attachSearchMatchGroups(
      supabaseUrl,
      supabaseKey,
      presentationShops as Parameters<typeof attachSearchMatchGroups>[2],
      filters,
      null
    )
  }

  const searchMatchBadges = buildSearchMatchBadges(filters, null)
  const rawLen = (nextShopsRaw || []).length
  const remaining = Math.max(0, resultCount - alreadyShown - rawLen)

  if (presentationShops.length > 0) {
    return {
      success: true as const,
      message: '',
      shops: presentationShops,
      totalResults: resultCount,
      hasMoreResults: remaining > 0,
      filters,
      selectableOptions: remaining > 0
        ? [buildSearchPaginationSelectableOption(remaining, paginationPageSize)]
        : undefined,
      ...(searchMatchBadges.length ? { searchMatchBadges } : {})
    }
  }
  if (rawLen > 0) {
    return {
      success: true as const,
      message:
        'No shops in this page match your course filter. You can load more results or widen the search.',
      shops: [],
      totalResults: resultCount,
      hasMoreResults: remaining > 0,
      filters,
      selectableOptions: remaining > 0
        ? [buildSearchPaginationSelectableOption(remaining, paginationPageSize)]
        : undefined,
      ...(searchMatchBadges.length ? { searchMatchBadges } : {})
    }
  }
  return {
    success: true as const,
    message: remaining > 0
      ? 'Could not load this page of results. Try Load next again, or widen the search.'
      : 'No more results available.',
    shops: [],
    totalResults: resultCount,
    hasMoreResults: remaining > 0,
    filters,
    selectableOptions: remaining > 0
      ? [buildSearchPaginationSelectableOption(remaining, paginationPageSize)]
      : undefined,
    ...(searchMatchBadges.length ? { searchMatchBadges } : {})
  }
}

const SYSTEM_PROMPT = SEARCH_DIVE_SYSTEM_PROMPT

const BOOKING_INTENT_PATTERN = /\b(book|reserve|booking|reservation|i want to book|i'd like to book|send my request|submit my request)\b/i

/** Orchestrator: user wants to abandon the current thread and restart at the trip-type question (not model-inferred). */
function wantsSearchFlowReset (trimmed: string): boolean {
  if (!trimmed) return false
  const t = trimmed
  if (/\b(?:let\s*'?s|let us)\s+start\s+over\b/i.test(t)) return true
  if (/\bstart\s+over\b/i.test(t)) return true
  if (/\bstart\s+again\b/i.test(t)) return true
  if (/\bbegin\s+again\b/i.test(t)) return true
  if (/\bfrom\s+scratch\b/i.test(t)) return true
  if (/\bnew\s+search\b/i.test(t)) return true
  if (/^\s*reset\s*$/i.test(t)) return true
  if (/\breset\s+(?:my\s+)?search\b/i.test(t)) return true
  if (/\bclear\s+(?:this|it|everything)\s+and\s+start\b/i.test(t)) return true
  return false
}

function buildBookingSystemPrompt (
  shopName: string,
  courseNames: string[],
  diveSiteNames: string[],
  existingPayload: BookingPayload | undefined,
  nextStepHint?: { step: string; diverIndex?: number; diverName?: string } | null,
  rentalEquipmentNames: string[] = []
): string {
  const coursesList = courseNames.length > 0 ? `\nCourses at this shop (for recognizing user choices only — do NOT list these in your message; the user sees them as chips): ${courseNames.join(', ')}. When asking about courses, ask only e.g. "Are you interested in any courses on this trip?" — do not repeat the course names.` : ''
  const sitesList = diveSiteNames.length > 0 ? `\nDive sites at this shop (for recognizing user choices only — do NOT list these in your message; the user sees them as chips): ${diveSiteNames.join(', ')}. When asking for dive sites, ask only e.g. "Which dive sites would you like to dive?" — do not repeat the site names.` : ''
  const equipmentList = rentalEquipmentNames.length > 0 ? `\nRental equipment at this shop (for COLLECTED payload only; do not invent others): ${rentalEquipmentNames.join(', ')}. When asking for rental gear, ask only "Does [name] need any rental gear?" — do NOT list the equipment in your message (chips are shown separately).` : ''
  const collected = existingPayload ? `\nAlready collected: ${JSON.stringify(existingPayload)}` : ''
  const stepLabel: Record<string, string> = {
    name: "the booking contact's name",
    email: 'email address',
    dates: 'start and end dates',
    numberOfDivers: 'number of divers',
    isContactDiver1: 'confirmation if the contact is Diver 1',
    diverName: "this diver's full name",
    dateOfBirth: 'date of birth (YYYY-MM-DD)',
    certificationNumber: 'certification number',
    numberOfDives: 'number of dives completed',
    height: 'height (with unit)',
    weight: 'weight (with unit: lbs or kg)',
    gear: 'rental gear (pick chips or say "done" to finish)',
    courses: 'which courses they are interested in (optional)',
    diveSites: 'which dive sites they want',
    ready: 'nothing — output BOOKING_READY when all fields are in COLLECTED'
  }
  const nextLine = nextStepHint
    ? `\nNEXT REQUIRED (use this — do not re-ask anything already in "Already collected"): Ask for ${stepLabel[nextStepHint.step] ?? nextStepHint.step}${nextStepHint.diverIndex != null ? ` for Diver ${nextStepHint.diverIndex + 1}${nextStepHint.diverName ? ` (${nextStepHint.diverName})` : ''}` : ''}.`
    : ''
  return `You are a friendly dive travel agent collecting a dive trip booking. The shop the user is booking with is: ${shopName}.${coursesList}${sitesList}${equipmentList}${collected}${nextLine}

Names: For the booking contact and for each diver, you need a full name (first and last). If the user gives only one name (e.g. just "Chris" or "Smith"), politely ask for their full name before moving on — e.g. "Could you give me your full name (first and last)?"

Ask for ONE piece of information at a time in this order: 1) name (the person making the booking), 2) email, 3) start date and end date for diving, 4) which courses they want (optional — pick from chips or say "done" / "no" / "none" to skip; do not list course names in your message), 5) which dive sites they want (optional — same; do not list site names in your message), 6) number of divers, 7) confirm whether the person whose name you have is Diver 1 or not: ask "Is [name] one of the divers? I'll use that name for Diver 1 if yes — otherwise tell me Diver 1's full name." If they say yes (or that they are Diver 1), set Diver 1's name to that name. If they say no, ask for Diver 1's full name. 8) For each diver: date of birth (YYYY-MM-DD), certification number, number of dives completed, height (with unit: ft-in or cm), weight (with unit: lbs or kg), and any rental gear they need.

When "Already collected" includes diver details from a previous booking (e.g. numberOfDives or gear already filled): (1) For number of dives — briefly confirm or ask to update, e.g. "Last time you had 21 dives — is this trip still 21 or have they done another?" or "Is this still 21 dives or 22 now?" so the count stays accurate. (2) For rental gear — mention what they had last time and that they can add or remove for this trip, e.g. "Last time you had Wetsuit and BCD. This shop offers [list from rental equipment]. Add or remove any for this trip?" Then let them pick from the chips or say "same" / "none" / etc.

Dates (step 3): The server parses most trip date formats (numeric ranges, month names, ISO, and many natural phrases). Do not spend tokens re-explaining parsing rules. If the user’s dates are still ambiguous after their message, put startDate and endDate in COLLECTED as YYYY-MM-DD. For trips longer than 21 days the server asks for confirmation first — follow its lead if the user is in that flow. Do not ask the user to type YYYY-MM-DD.

Optional steps: For desiredCourses and desiredDiveSites, omit these keys from COLLECTED until you have asked that step and the user answered (or use a non-empty array when they picked courses/sites). Do not send empty arrays [] for those fields until the user has completed that step — otherwise use omit or null in COLLECTED if your JSON schema allows. For courses: if the user is still adding courses, set coursesSelectionComplete to false; when they are done, set coursesSelectionComplete to true. For dive sites: same with diveSitesSelectionComplete (false while adding sites, true when done).

Weight (step 8): If the user gives only a number for weight (e.g. "200" or "85") with no unit (lbs or kg), do NOT assume a unit. Ask for clarification: "Is that [number] lbs or [number] kg?" and only set weightUnit in COLLECTED when they specify. Never record weight as e.g. "200 lbs" unless the user said "kg" or "lbs".

Be warm and conversational. When you have collected all required fields (name, email, startDate, endDate, numberOfDivers, and for each diver: name, dateOfBirth, certificationNumber, numberOfDives, height, heightUnit, weight, weightUnit; gear can be empty array), output exactly:

BOOKING_READY: <valid JSON object>

The JSON must have this shape (use empty string "" for missing optional fields, [] for empty arrays):
{
  "shopId": "<shop id if you have it>",
  "name": "string",
  "email": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "numberOfDivers": number,
  "divers": [
    {
      "name": "string",
      "dateOfBirth": "YYYY-MM-DD",
      "certificationNumber": "string",
      "numberOfDives": "string",
      "height": "string",
      "heightUnit": "ft-in or cm",
      "weight": "string",
      "weightUnit": "lbs or kg",
      "gear": [{"gearType": "string"}]
    }
  ],
  "desiredCourses": ["string"],
  "coursesSelectionComplete": true,
  "desiredDiveSites": ["string"],
  "diveSitesSelectionComplete": true
}

Do not output BOOKING_READY until every required field is present. If the user corrects something, update and continue.

The app shows a mandatory review (and optional account prompt) on the server before any booking email is sent — do not say the request was already sent until the user completes those steps.

After every reply you must output the current collected state so we can pre-fill the form. IMPORTANT: always write your full conversational reply first (ask the next question or confirm — e.g. "Thanks, got the gear. What's Diver 2's full name?"). Then on a new line, output only:
COLLECTED: {"name":"...","email":"...","startDate":"...","endDate":"...","numberOfDivers":1,"divers":[...],"desiredCourses":[...],"coursesSelectionComplete":true,"desiredDiveSites":[...],"diveSitesSelectionComplete":true}
Never put COLLECTED in the middle of your reply — your message to the user must come first, then COLLECTED on its own line. Include every field you have collected so far (use empty string or [] for not yet collected). Use the exact same JSON shape as BOOKING_READY. Always proceed to the next empty field question (e.g. after dates ask for courses; after courses ask for dive sites; after dive sites ask for number of divers; after gear for last diver, output BOOKING_READY).`
}

export async function runAiSearchPostHandler (event: H3Event, options?: RunAiSearchPostHandlerOptions) {
  try {
    const onActivityLine = options?.onActivityLine
    const body = options?.body ?? await readBody<RequestBody>(event)
    const { message, history, selectedShopId, lastShops, shopsAlreadyShownCount, bookingPayload: bodyBookingPayload, pendingBookingPayload: bodyPendingPayload, lastIntent, lastBookingShopId, lastBookingShopName, profilePrefill, pendingEntityClarifyPhrase, lastSearchFilters: bodyLastSearchFilters, lastSearchTotalResults: bodyLastSearchTotalResults, tripRequirements: bodyTripRequirements } = body

    if (!message || typeof message !== 'string') {
      throw new Error('Message is required')
    }

    if (wantsSearchFlowReset(message.trim())) {
      return searchFlowResetResponse()
    }

    // Unit-only "lbs"/"kg" fast path: instant reply. Skip early return when next step is gear so we can attach rentalEquipmentOptions (chips) to the first "Does X need any rental gear?" message.
    const continuingBooking = lastIntent === 'booking' && !!lastBookingShopId
    if (continuingBooking && bodyBookingPayload && /^(lbs?|kg|pounds)$/i.test(message.trim())) {
      const fastUnit = tryFastPathUnitOnly(message, bodyBookingPayload, lastBookingShopName || '')
      const nextStepAfterUnit = fastUnit ? getNextBookingStep(fastUnit.payload)?.step : null
      if (fastUnit && nextStepAfterUnit !== 'gear') {
        return {
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: fastUnit.message,
          shopId: lastBookingShopId,
          shopName: lastBookingShopName ?? 'Dive shop',
          bookingPayload: fastUnit.payload,
          selectableOptions: undefined
        }
      }
    }

    const config = useRuntimeConfig()
    const openaiApiKey = resolveOpenAiApiKey(config.openaiApiKey)
    const supabaseUrl = config.public.supabaseUrl
    const supabaseKey = config.public.supabaseKey
    const chatAiOff =
      String(config.public.disableChatAi ?? 'false').toLowerCase() !== 'false'

    if (!continuingBooking && supabaseUrl && supabaseKey) {
      const shopInfoTurn = await tryShopInfoResponse(message, selectedShopId, lastShops, supabaseUrl, supabaseKey)
      if (shopInfoTurn) {
        return shopInfoTurn
      }
    }

    if (!chatAiOff && !openaiApiKey) {
      throw new Error('OpenAI API key not configured (set NUXT_OPENAI_API_KEY or OPENAI_API_KEY for serverless)')
    }
    return await runWithRetries(async () => {
      let activeTripRequirements = normalizeTripRequirements(bodyTripRequirements)
      const authUser = await getAuthUser(event)
      const bookingSignupTiming = parseBookingSignupTimingFromConfig(useRuntimeConfig().public.bookingSignupTiming)

      const agentMeta = {
        activityLog: [] as { stage: string; label: string; at: number }[],
        reasoningSummary: undefined as string | undefined
      }
      let interpretTurn: InterpretedTurn | null = null
      let interpretNluRan = false
      let interpretNluOk = false
      let bookingReadiness: BookingReadinessResult | null = null
      let allowAutoBook = !!continuingBooking
      const logIntentTurn = (routedIntent: string) => {
        const readiness = bookingReadiness
        if (!readiness) return
        logChatIntentSignal({
          userId: authUser?.id ?? null,
          message: message.trim(),
          predictedReadiness: readiness.score,
          primaryVerb: readiness.primaryVerb,
          nluGoal: interpretTurn?.goal ?? null,
          routedIntent
        })
      }
      const pushActivity = (stage: string, label: string) => {
        agentMeta.activityLog.push({ stage, label, at: Date.now() })
        onActivityLine?.(label)
      }
      const withAgentMeta = <T extends Record<string, unknown>>(payload: T): T => {
        const out = { ...payload } as T & { activityLog?: typeof agentMeta.activityLog; reasoningSummary?: string }
        if (agentMeta.activityLog.length > 0) {
          (out as { activityLog: typeof agentMeta.activityLog }).activityLog = [...agentMeta.activityLog]
        }
        if (agentMeta.reasoningSummary?.trim()) {
          (out as { reasoningSummary: string }).reasoningSummary = agentMeta.reasoningSummary.trim()
        }
        return out as T
      }

      const aiSearchFirst =
        String(useRuntimeConfig().public.aiSearchFirst ?? 'false').toLowerCase() === 'true'
      const searchAbortSignal = abortSignalFromH3Event(event)

      // --- Booking agent (per .cursor/rules/ai-agent-structure.mdc) ---
      // Tools: entity routing (extractReferredEntityPhrase, probeReferentPhrase, routeReferentFromProbe, handleForcedEntityClarify), getShopById, listShopsMatchingName, getDiveSitesForShop, getRentalEquipmentForShop, buildDiveShopQuery, tryFastPath, tryFastPathUnitOnly, LLM chat.
      // Tool selection: Orchestrator (this handler) chooses — intent (book vs search), then fast path vs LLM; no model-driven tool calls.
      // Retries: Outer runWithRetries replays this handler on failure; booking email is sent only via /api/booking.
      // Steps: Multi-turn until BOOKING_READY or user chooses "Pick a new diveshop"; one user message → one API response (possibly with selectableOptions chips).
      // State: Frontend holds messages + selectedShopId + pendingBookingPayload; backend is stateless; agent returns updated bookingPayload; destructive (send email) only after explicit user confirm.

      // --- Intent: booking vs search ---
      const wantsToBookRegex = BOOKING_INTENT_PATTERN.test(message)
      const shopSelectionPhrase = extractShopSelectionPhrase(message)
      /** NLU may add start_booking / wants_booking inside entity-routing branch — updated there. */
      let effectiveWantsToBook = wantsToBookRegex || !!shopSelectionPhrase

      let resolvedShop: Awaited<ReturnType<typeof getShopById>> = null
      let resolvedByNamedShop = false

      const bookShopPickId = parseBookShopPickMessage(message)
      if (bookShopPickId && supabaseUrl && supabaseKey) {
        const picked = await getShopById(supabaseUrl, supabaseKey, bookShopPickId)
        if (picked) {
          resolvedShop = picked
          resolvedByNamedShop = true
          effectiveWantsToBook = true
          allowAutoBook = true
        }
      } else if (
        !resolvedShop &&
        selectedShopId &&
        supabaseUrl &&
        supabaseKey &&
        canCommitBookingHandoffForShop(message, selectedShopId, { lastShops, selectedShopId })
      ) {
        const picked = await getShopById(supabaseUrl, supabaseKey, selectedShopId)
        if (picked) {
          resolvedShop = picked
          resolvedByNamedShop = true
          effectiveWantsToBook = true
          allowAutoBook = true
        }
      } else if (!continuingBooking) {
        allowAutoBook = wantsToBookRegex || !!shopSelectionPhrase
      }

      // --- Entity-aware routing: "dive with X", clarification chips (orchestrator; see .cursor/rules/ai-agent-structure.mdc) ---
      const clarifyChoice = parseEntityClarifyMessage(message)

      // Widen-search chip (e.g. "Any trip type"): last FILTERS + DB only — run before NLU / entity probe.
      if (!continuingBooking && !clarifyChoice && supabaseUrl && supabaseKey) {
        const normalizedLast = normalizeClientSearchFilters(bodyLastSearchFilters)
        const relaxed =
          normalizedLast && tryApplySearchFilterRelax(message.trim(), normalizedLast)
        if (relaxed) {
          console.log('[AI Search] Filter relax fast path — NLU + search LLM skipped')
          pushActivity(
            'search_relax',
            formatSearchRelaxActivityLine(
              relaxed.place?.trim() || relaxed.country?.trim() || relaxed.region?.trim() || 'your area'
            )
          )
          try {
            const queryResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, relaxed)
            const { data: shops, error: dbErr } = queryResult
            if (!dbErr) {
              const place =
                relaxed.place?.trim() ||
                relaxed.country?.trim() ||
                relaxed.region?.trim() ||
                'that area'
              return withAgentMeta({
                ...(await formatEntitySearchResponse(
                  supabaseUrl,
                  supabaseKey,
                  relaxed,
                  shops as unknown[],
                  `Showing dive shops for a broader search in ${place}.`
                )),
                intent: 'search' as const
              })
            }
          } catch (e) {
            console.error('[AI Search] Filter relax fast path error:', e)
          }
        }
      }

      if (clarifyChoice && pendingEntityClarifyPhrase?.trim()) {
        const phraseCtx = pendingEntityClarifyPhrase.trim()
        const forced = await handleForcedEntityClarify(clarifyChoice, phraseCtx, supabaseUrl, supabaseKey)
        if (forced.kind === 'search') {
          return withAgentMeta({ ...forced.response, intent: 'search' as const })
        }
        if (forced.kind === 'clarify') {
          return withAgentMeta({ ...clarifyResponsePayload(forced.phrase), intent: 'search' as const })
        }
        if (forced.kind === 'shop_disambiguation') {
          return withAgentMeta({ ...shopDisambiguationResponsePayload(forced.phrase, forced.shops), intent: 'search' as const })
        }
        if (forced.kind === 'booking') {
          return withAgentMeta({
            ...(await formatEntitySearchResponse(
              supabaseUrl,
              supabaseKey,
              {},
              [forced.shop as unknown as Record<string, unknown>],
              `Here is a dive shop matching your selection. Pick one to start booking.`
            )),
            intent: 'search' as const
          })
        }
        // forced.kind === 'browse': fall through to normal search flow (trip-type / LLM)
      } else if (!continuingBooking && !clarifyChoice && supabaseUrl && supabaseKey) {
        const referredPhraseRegex = extractReferredEntityPhrase(message) ?? extractBookingTargetFallback(message)
        if (!chatAiOff && shouldRunInterpretNlu(message, wantsToBookRegex, referredPhraseRegex)) {
          interpretNluRan = true
          const ir = await interpretUserTurn({
            message,
            history: history || [],
            openaiApiKey,
            signal: abortSignalFromH3Event(event)
          })
          interpretNluOk = ir.ok
          if (ir.ok) {
            interpretTurn = ir.data
            if (interpretTurn.reasoning_summary?.trim()) {
              agentMeta.reasoningSummary = interpretTurn.reasoning_summary.trim()
            }
            const interpretLine = formatInterpretActivityLine(interpretTurn, true)
            if (interpretLine) pushActivity('interpret', interpretLine)
            console.log('[NLU]', {
              regexReferent: referredPhraseRegex,
              destination_text: interpretTurn.destination_text,
              activity_terms: interpretTurn.activity_terms,
              certification_course_hint: interpretTurn.certification_course_hint,
              dive_site_type_label: interpretTurn.dive_site_type_label,
              trip_product_type: interpretTurn.trip_product_type,
              goal: interpretTurn.goal
            })
          } else {
            const failLine = formatInterpretActivityLine(null, false)
            if (failLine) pushActivity('interpret', failLine)
          }
        }
        effectiveWantsToBook =
          wantsToBookRegex ||
          !!shopSelectionPhrase ||
          interpretTurn?.goal === 'start_booking' ||
          interpretTurn?.wants_booking === true
        bookingReadiness = inferBookingReadinessFromMessage(message, history || [], interpretTurn, {
          continuingBooking,
          bookShopPick: !!bookShopPickId,
          effectiveWantsToBook
        })
        allowAutoBook = bookingReadiness.allowAutoBook
        pushActivity('interpret', formatBookingReadinessLine(bookingReadiness))
        const referredPhrase = pickReferentPhraseForProbe(interpretTurn, referredPhraseRegex, {
          preferShopOrRegexOverDestination:
            !!shopSelectionPhrase || !!interpretTurn?.shop_name_hint?.trim()
        })
        const destText = interpretTurn?.destination_text?.trim()
        const shopHint = interpretTurn?.shop_name_hint?.trim()
        const tryLocationFirst =
          !!destText &&
          !shopHint &&
          !shopSelectionPhrase &&
          (wantsToBookRegex ||
            interpretTurn?.goal === 'start_booking' ||
            interpretTurn?.goal === 'search_shops')

        let skipEntityProbeFromGeo = false
        let skipEntityProbeFromActivity = false
        if (tryLocationFirst) {
          const buildGeoFilters = () =>
            mergeInferredDiveTypesIntoFilters(
              mergeInterpretSearchFacetsIntoFilters(
                mergeActivityIntoFilters(
                  mergeNluHintsIntoFilters(
                    inferSearchFiltersFromDestination(destText),
                    interpretTurn
                  ),
                  interpretTurn
                ),
                interpretTurn
              ),
              message
            )
          let geoFilters = buildGeoFilters()
          const preferredDiveTypes = geoFilters.diveTypes
          let fetchedGeo = await fetchSearchShopsWithSparseWiden(supabaseUrl, supabaseKey, geoFilters)
          let geoList = fetchedGeo.shops as Array<{ id: string; business_name?: string; type?: string | null; google_rating?: number | null }>
          let widenedTripType = fetchedGeo.widenedTripType
          let widenedActivity = fetchedGeo.widenedActivity
          const activityExactShopIds = fetchedGeo.activityExactShopIds
          let geoError = fetchedGeo.error
          if (!geoError && geoList.length === 0 && (preferredDiveTypes?.length ?? 0) > 0) {
            const { diveTypes: _dropTypes, ...relaxedGeo } = geoFilters
            geoFilters = relaxedGeo
            const retry = await buildDiveShopQuery(supabaseUrl, supabaseKey, geoFilters)
            geoError = retry.error
            geoList = (retry.data || []) as typeof geoList
            widenedTripType = false
          }
          geoFilters = filtersWithActivityMatchContext(geoFilters, activityExactShopIds, widenedActivity)
          const placeLabel = geoFilters.place?.trim() || destText
          pushActivity('probe', formatGeoDirectoryQueryLine(placeLabel, geoList.length))
          if (!geoError && geoList.length > 0) {
            const countryOnly = isCountryOnlyGeoFilters(geoFilters)
            const geoIntro = formatHereAreOperatorsInPlace({
              place: placeLabel,
              diveTypes: preferredDiveTypes,
              count: geoList.length,
              shops: geoList,
              widenedTripType
            })
            const geoMessage = widenedActivity && activityExactShopIds.length === 0
              ? formatNoActivityMatchesMessage(geoFilters)
              : geoIntro
            // Destination-only query: always show options — never auto-book a single geo match.
            logIntentTurn('search')
            const pickIntro = formatHereAreOperatorsInPlace({
              place: placeLabel,
              diveTypes: preferredDiveTypes,
              count: geoList.length,
              shops: geoList,
              placeQualifier:
                geoList.length > 1 && !countryOnly ? ' (matched by location, not just name)' : undefined
            })
            const pickMessage =
              geoList.length === 1
                ? `${pickIntro} Pick one to start booking, or name a city or area to narrow down.`
                : `${pickIntro} Which one would you like to book?`
            return withAgentMeta({
              ...(await formatEntitySearchResponse(
                supabaseUrl,
                supabaseKey,
                geoFilters,
                geoList as unknown[],
                widenedTripType ? geoMessage : pickMessage
              )),
              intent: 'search' as const
            })
          }
        }

        const nluActivityTerms = normalizeActivityTerms(interpretTurn?.activity_terms)
        const tryActivityOnlySearch =
          nluActivityTerms.length > 0 &&
          !shopHint &&
          !shopSelectionPhrase &&
          !destText &&
          (interpretTurn?.goal === 'search_shops' || interpretTurn?.goal === 'start_booking')

        if (tryActivityOnlySearch) {
          const actFilters = mergeActivityIntoFilters({}, interpretTurn)
          const actQuery = await buildDiveShopQuery(supabaseUrl, supabaseKey, actFilters)
          const actList = (actQuery.data || []) as Array<{ id: string; business_name?: string }>
          const label = nluActivityTerms.join(', ')
          pushActivity('probe', formatActivityStyleFilterLine(label, actList.length))
          if (!actQuery.error && actList.length === 0) {
            return withAgentMeta({
              success: true,
              intent: 'search' as const,
              message: `We didn't find dive shops in our directory that match "${nluActivityTerms.join(', ')}" in listings, linked dive sites, or site types. Try adding a country or region, or rephrase.`,
              shops: [],
              totalResults: 0,
              hasMoreResults: false,
              filters: actFilters
            })
          }
          if (!actQuery.error && actList.length > 0) {
            const actMessage =
              actList.length === 1
                ? `Here is a shop that matches “${label}” in our data. Pick one to start booking, or add a region to narrow down.`
                : `Here are shops that match “${label}” in our data (site types, shop type, or linked sites). Which one would you like to book?`
            return withAgentMeta({
              ...(await formatEntitySearchResponse(
                supabaseUrl,
                supabaseKey,
                actFilters,
                actList as unknown[],
                actMessage
              )),
              intent: 'search' as const
            })
          }
        }

        if (referredPhrase && !resolvedShop && !skipEntityProbeFromGeo && !skipEntityProbeFromActivity) {
          if (effectiveWantsToBook) {
            const bookingNouns = interpretTurn
              ? mergeBookingNounHints(
                collectBookingNounHints(referredPhrase),
                bookingNounHintsFromInterpret(interpretTurn)
              )
              : collectBookingNounHints(referredPhrase)
            const target = await resolveBookingTargetFromPhrase(
              referredPhrase,
              lastShops,
              supabaseUrl,
              supabaseKey,
              bookingNouns
            )
            if (target.kind === 'single') {
              if (
                canCommitBookingHandoffForShop(message, target.shop.id, { lastShops, selectedShopId })
              ) {
                resolvedShop = await getShopById(supabaseUrl, supabaseKey, target.shop.id)
                resolvedByNamedShop = !!resolvedShop
              } else {
                pushActivity('probe', formatProbeDirectoryLine(referredPhrase))
                logIntentTurn('search')
                return withAgentMeta({
                  ...(await formatEntitySearchResponse(
                    supabaseUrl,
                    supabaseKey,
                    {},
                    [target.shop as unknown as Record<string, unknown>],
                    `Here is a dive shop matching "${referredPhrase}". Pick one to start booking.`
                  )),
                  intent: 'search' as const
                })
              }
            } else if (target.kind === 'ambiguous') {
              pushActivity('probe', formatProbeDirectoryLine(target.phrase))
              return withAgentMeta({ ...shopDisambiguationResponsePayload(target.phrase, target.shops), intent: 'search' as const })
            }
          }
          pushActivity('probe', formatProbeDirectoryLine(referredPhrase))
          const probe = await probeReferentPhrase(supabaseUrl, supabaseKey, referredPhrase)
          const routed = await routeReferentFromProbe(supabaseUrl, supabaseKey, probe, {
            allowAutoBook
          })
            if (routed.type === 'closest_shop_suggestion') {
              logIntentTurn('search')
              return withAgentMeta({ ...closestShopSuggestionResponsePayload(routed.phrase, routed.shop), intent: 'search' as const })
            }
            if (routed.type === 'clarify') {
              logIntentTurn('clarify')
              return withAgentMeta({ ...clarifyResponsePayload(routed.phrase), intent: 'search' as const })
            }
            if (routed.type === 'search') {
              if (effectiveWantsToBook && allowAutoBook) {
                const resultCount = routed.response.totalResults ?? routed.response.shops?.length ?? 0
                if (resultCount > 0) {
                  const label =
                    routed.response.filters.country?.trim() ||
                    routed.response.filters.place?.trim() ||
                    referredPhrase
                  const msg =
                    resultCount === 1
                      ? `Here is a dive shop in ${label}. Pick one to start booking, or name a city or area to narrow down.`
                      : `Here are dive shops in ${label}. Which one would you like to book?`
                  return withAgentMeta({
                    ...routed.response,
                    message: msg,
                    intent: 'search' as const
                  })
                }
                const pickFromRecent = shopDisambiguationSelectableOptions((lastShops || []).slice(0, 8))
                logIntentTurn('search')
                return withAgentMeta({
                  success: true,
                  intent: 'search' as const,
                  message: pickFromRecent.length
                    ? `I couldn't match "${referredPhrase}" to a single dive shop. Pick one from your recent results below, or say the full shop name (e.g. "Let's book at [name]").`
                    : `I couldn't match "${referredPhrase}" to a dive shop for booking. Try the full shop name, or search for shops first.`,
                  shops: [],
                  totalResults: 0,
                  hasMoreResults: false,
                  filters: {} as SearchFilters,
                  selectableOptions: pickFromRecent.length ? pickFromRecent : undefined
                })
              }
              logIntentTurn('search')
              return withAgentMeta({ ...routed.response, intent: 'search' as const })
            }
            if (routed.type === 'shop_disambiguation') {
              logIntentTurn('search')
              return withAgentMeta({ ...shopDisambiguationResponsePayload(routed.phrase, routed.shops), intent: 'search' as const })
            }
            if (routed.type === 'booking') {
              logIntentTurn('search')
              return withAgentMeta({
                ...(await formatEntitySearchResponse(
                  supabaseUrl,
                  supabaseKey,
                  {},
                  [routed.shop as unknown as Record<string, unknown>],
                  `Here is a dive shop matching "${referredPhrase}". Pick one to start booking.`
                )),
                intent: 'search' as const
              })
            }
        }
      }
      if (effectiveWantsToBook && !resolvedShop) {
        if (!resolvedShop && message.match(/\b(first|second|third|1st|2nd|3rd)\s+(one|shop|result)\b/i) && lastShops?.length) {
          const idx = message.match(/\b(first|1st)\b/i) ? 0 : message.match(/\b(second|2nd)\b/i) ? 1 : 2
          const shop = lastShops[Math.min(idx, lastShops.length - 1)]
          if (shop) resolvedShop = await getShopById(supabaseUrl, supabaseKey, shop.id)
        }
      }
      if (continuingBooking && !resolvedShop && lastBookingShopId) {
        resolvedShop = await getShopById(supabaseUrl, supabaseKey, lastBookingShopId)
      }

      if (resolvedShop && (effectiveWantsToBook || continuingBooking || (resolvedByNamedShop && allowAutoBook))) {
        logIntentTurn('booking')
        // Use carried-over payload when starting a new booking after "Pick a new diveshop"
        let bookingPayload = continuingBooking
          ? bodyBookingPayload
          : (effectiveWantsToBook && bodyPendingPayload ? { ...bodyPendingPayload, shopId: resolvedShop.id } : bodyBookingPayload)

        const [diveSites, rentalEquipment, courses] = await Promise.all([
          getDiveSitesForShop(supabaseUrl, supabaseKey, resolvedShop.id),
          getRentalEquipmentForShop(supabaseUrl, supabaseKey, resolvedShop.id),
          getCoursesForShop(supabaseUrl, supabaseKey, resolvedShop.id)
        ])
        const resolvedHandoffDates = resolveTripDatesForBookingHandoff({
          tripRequirements: activeTripRequirements,
          lastSearchFilters: normalizeClientSearchFilters(bodyLastSearchFilters),
          history: history || []
        })
        const effectiveTripReq = mergeResolvedTripDatesIntoRequirements(
          mergeTripRequirements(activeTripRequirements, {
            selectedShopId: resolvedShop.id
          }),
          resolvedHandoffDates
        )
        const courseSeedBase = {
          tripRequirements: effectiveTripReq,
          history: history || [],
          currentMessage: message,
          courseOptions: courses,
          diveSiteOptions: diveSites,
          supabaseUrl,
          supabaseKey,
          shopId: resolvedShop.id
        }
        const rankCourses = (list: { id: string; name: string }[]) =>
          rankCourseOptionsForTripRequirements(list, effectiveTripReq)
        const rankedCourses = () => rankCourses(courses)
        if (continuingBooking && bookingPayload) {
          if (profilePrefill) {
            bookingPayload = mergeProfileContactIntoBookingPayload(
              bookingPayload as Record<string, unknown>,
              profilePrefill
            ) as BookingPayload
          }
          bookingPayload = clampBookingPayloadToNextStep(bookingPayload as BookingPayloadLocal, {
            shopCourseCount: courses.length,
            shopDiveSiteCount: diveSites.length
          }) as BookingPayload
          bookingPayload = await applyBookingCourseSeedIfEligible(
            bookingPayload as BookingPayloadLocal,
            courseSeedBase
          ) as BookingPayload
          const msgTrimPreSend = message.trim()
          const preTok = parseBookingPreSendToken(msgTrimPreSend)
          let bpPre = bookingPayload as BookingPayload
          if (preTok === 'confirm_send') {
            bpPre = applyPreSendTokenToPayload('confirm_send', bpPre as BookingPayloadLocal, resolvedShop.id) as BookingPayload
          }
          if (preTok === 'skip_signup') {
            bpPre = applyPreSendTokenToPayload('skip_signup', bpPre as BookingPayloadLocal, resolvedShop.id) as BookingPayload
          }
          const lastAssistPreSend = history?.filter(m => m.role === 'assistant').pop()?.content ?? ''
          if (!bpPre.preSendReviewAck && lastAssistantWasPreSendReview(lastAssistPreSend) && isConfirmSendMessage(msgTrimPreSend)) {
            bpPre = applyPreSendTokenToPayload('confirm_send', bpPre as BookingPayloadLocal, resolvedShop.id) as BookingPayload
          }
          bookingPayload = bpPre
        }
        const courseNames = courses.map(c => c.name)
        const diveSiteNames = diveSites.map(d => d.name)
        const rentalEquipmentNames = rentalEquipment.map(e => e.name)
        if (continuingBooking && bookingPayload) {
          bookingPayload = sanitizeBookingPayloadGearForShop(
            bookingPayload as BookingPayloadLocal,
            rentalEquipmentNames
          ) as BookingPayload
        }
        const shopClient = bookingShopFieldsForClient(resolvedShop)
        const shopLabel = shopClient.shopDisplayName

        // When user explicitly named a shop and we resolved it: go straight to form details (first question: name)
        const startingFreshBooking = (effectiveWantsToBook || (resolvedByNamedShop && allowAutoBook)) && !continuingBooking
        const noPayloadYet = !bookingPayload || !(bookingPayload.name && String(bookingPayload.name).trim())

        const coursesIntroMessage = (displayName: string, p: BookingPayload) =>
          bookingGotItWithShopMessage(displayName, bookingCoursesStepMessage(p))

        // If shop has no rental gear and user is just starting booking, tell them and offer to continue or pick another shop
        if (startingFreshBooking && noPayloadYet && rentalEquipment.length === 0) {
          return withAgentMeta({
            success: true,
            intent: 'booking' as const,
            bookingReady: false,
            message: `${shopLabel} doesn't offer rental gear. You can still book with them (arrange gear elsewhere) or choose a different dive shop.`,
            shopId: resolvedShop.id,
            shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
            bookingPayload: undefined,
            selectableOptions: [
              { label: 'Continue with this shop', value: 'Continue with this shop' },
              { label: 'Pick a new diveshop', value: 'Pick a new diveshop' }
            ],
            rentalEquipmentOptions: undefined,
            courseOptions: undefined,
            diveSiteOptions: undefined
          })
        }

        if (startingFreshBooking && noPayloadYet) {
          const base = bookingPayload || {}
          let fromProfile: Record<string, unknown> = {}
          if (profilePrefill) {
            fromProfile = {
              name: profilePrefill.name ?? base.name,
              email: profilePrefill.email ?? base.email
            }
            // Do not inject numberOfDivers/divers here — profilePrefill is passed to tryFastPath for chips later.
            // Prefilling divers skips courses/sites/diver-count in the step machine.
          }
          let initialPayload: BookingPayload = { shopId: resolvedShop.id, ...base, ...fromProfile }
          initialPayload = applyResolvedTripDatesToBookingPayload(
            initialPayload as BookingPayloadLocal,
            resolvedHandoffDates
          ) as BookingPayload
          let nextHint = getNextBookingStep(initialPayload)
          if (nextHint?.step === 'courses' && courses.length === 0) {
            initialPayload = { ...initialPayload, desiredCourses: [] }
            nextHint = getNextBookingStep(initialPayload)
          }
          initialPayload = clampBookingPayloadToNextStep(initialPayload as BookingPayloadLocal, {
            shopCourseCount: courses.length,
            shopDiveSiteCount: diveSites.length
          }) as BookingPayload
          initialPayload = await applyBookingCourseSeedIfEligible(
            initialPayload as BookingPayloadLocal,
            courseSeedBase
          ) as BookingPayload
          nextHint = getNextBookingStep(initialPayload)
          const firstMessage = nextHint?.step === 'name'
            ? bookingGotItWithShopMessage(shopLabel, "What's the name for the booking?")
            : nextHint?.step === 'email'
              ? bookingGotItWithShopMessage(shopLabel, 'What email should we use for the booking?')
              : nextHint?.step === 'dates'
                ? bookingGotItWithShopMessage(shopLabel, 'What are your trip dates (start and end)?')
                : nextHint?.step === 'courses'
                  ? coursesIntroMessage(shopLabel, initialPayload)
                  : nextHint?.step === 'diveSites'
                    ? bookingGotItWithShopMessage(shopLabel, bookingDiveSitesStepMessage(initialPayload))
                    : bookingGotItWithShopMessage(shopLabel, "What's the name for the booking?")
          const rankedFresh = rankedCourses()
          return withAgentMeta({
            success: true,
            intent: 'booking' as const,
            bookingReady: false,
            message: firstMessage,
            shopId: resolvedShop.id,
            shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
            bookingPayload: initialPayload,
            tripRequirements: effectiveTripReq,
            selectableOptions: undefined,
            rentalEquipmentOptions: undefined,
            courseOptions: getNextBookingStep(initialPayload)?.step === 'courses' && rankedFresh.length > 0 ? rankedFresh : undefined,
            diveSiteOptions: getNextBookingStep(initialPayload)?.step === 'diveSites' && diveSites.length > 0 ? diveSites : undefined
          })
        }

        const addGearOptions = (payload: BookingPayload) =>
          getNextBookingStep(payload)?.step === 'gear' ? rentalEquipment : undefined
        const addCourseOptions = (payload: BookingPayload) => {
          const ranked = rankedCourses()
          return getNextBookingStep(payload)?.step === 'courses' && ranked.length > 0 ? ranked : undefined
        }
        const addDiveSiteOptions = (payload: BookingPayload) =>
          getNextBookingStep(payload)?.step === 'diveSites' && diveSites.length > 0 ? diveSites : undefined
        /** Gear step uses Done only (no separate "None" chip). */
        const hideNoneForGear = (_payload: BookingPayload | undefined): boolean => true

        const tryMidBookingShopSwitchResponse = async (
          switchPhrase: string | null,
          directShopId?: string | null,
          premergedNouns?: { operatorName: string | null, placeName: string | null } | null
        ) => {
          if (!supabaseUrl || !supabaseKey) return null
          let target: Awaited<ReturnType<typeof resolveBookingTargetFromPhrase>> | null = null
          const pickId = directShopId?.trim() || null
          if (pickId) {
            const picked = await getShopById(supabaseUrl, supabaseKey, pickId)
            target = picked ? { kind: 'single', shop: picked } : { kind: 'none', phrase: pickId }
          } else if (switchPhrase?.trim()) {
            const sp = switchPhrase.trim()
            let nounHints = mergeBookingNounHints(collectBookingNounHints(sp), premergedNouns)
            if (openaiApiKey && !chatAiOff) {
              const irSwitch = await interpretUserTurn({
                message: message.trim(),
                history: history || [],
                openaiApiKey,
                signal: searchAbortSignal
              })
              if (irSwitch.ok) {
                nounHints = mergeBookingNounHints(nounHints, bookingNounHintsFromInterpret(irSwitch.data))
                if (irSwitch.data.reasoning_summary?.trim()) {
                  agentMeta.reasoningSummary = irSwitch.data.reasoning_summary.trim()
                }
                const switchInterpretLine = formatInterpretActivityLine(irSwitch.data, true)
                if (switchInterpretLine) pushActivity('interpret', switchInterpretLine)
              }
            }
            target = await resolveBookingTargetFromPhrase(
              sp,
              lastShops,
              supabaseUrl,
              supabaseKey,
              nounHints
            )
          } else {
            return null
          }
          const sp = switchPhrase?.trim() || pickId || ''
          if (target.kind === 'none' && switchPhrase?.trim()) {
            const probeSw = await probeReferentPhrase(supabaseUrl, supabaseKey, sp)
            const routedSw = await routeReferentFromProbe(supabaseUrl, supabaseKey, probeSw, {
              allowAutoBook: true
            })
            if (routedSw.type === 'search') {
              const { shopId: _s, ...carrySearch } = clearBookingPreSendFlags(
                bookingPayload as BookingPayloadLocal
              ) as BookingPayload
              return withAgentMeta({
                ...routedSw.response,
                intent: 'search' as const,
                shopId: undefined,
                shopName: undefined,
                bookingPayload: undefined,
                pendingBookingPayload: carrySearch
              })
            }
            if (routedSw.type === 'shop_disambiguation') {
              const { shopId: _s, ...carryAmb } = clearBookingPreSendFlags(
                bookingPayload as BookingPayloadLocal
              ) as BookingPayload
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: `Which shop did you mean? Pick one to switch your booking.`,
                shopId: undefined,
                shopName: undefined,
                bookingPayload: undefined,
                pendingBookingPayload: carryAmb,
                selectableOptions: shopDisambiguationSelectableOptions(routedSw.shops),
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
          }

          if (target.kind === 'ambiguous') {
            const { shopId: _s, ...carryAmb } = clearBookingPreSendFlags(
              bookingPayload as BookingPayloadLocal
            ) as BookingPayload
            return withAgentMeta({
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: `Which "${sp}" did you mean? Tap a shop to switch your booking.`,
              shopId: undefined,
              shopName: undefined,
              bookingPayload: undefined,
              pendingBookingPayload: carryAmb,
              selectableOptions: shopDisambiguationSelectableOptions(target.shops),
              rentalEquipmentOptions: undefined,
              courseOptions: undefined,
              diveSiteOptions: undefined
            })
          }

          if (target.kind === 'single') {
            if (!pickId) {
              const { shopId: _s, ...carrySingle } = clearBookingPreSendFlags(
                bookingPayload as BookingPayloadLocal
              ) as BookingPayload
              return withAgentMeta({
                ...(await formatEntitySearchResponse(
                  supabaseUrl,
                  supabaseKey,
                  {},
                  [target.shop as unknown as Record<string, unknown>],
                  `Here is a dive shop matching "${sp}". Pick one to switch your booking.`
                )),
                intent: 'search' as const,
                shopId: undefined,
                shopName: undefined,
                bookingPayload: undefined,
                pendingBookingPayload: carrySingle
              })
            }
            const newShop = await getShopById(supabaseUrl, supabaseKey, target.shop.id)
            if (newShop && newShop.id !== resolvedShop.id) {
              const [dsSw, reSw, coSw] = await Promise.all([
                getDiveSitesForShop(supabaseUrl, supabaseKey, newShop.id),
                getRentalEquipmentForShop(supabaseUrl, supabaseKey, newShop.id),
                getCoursesForShop(supabaseUrl, supabaseKey, newShop.id)
              ])
              let mergedSw: BookingPayload = {
                ...clearBookingPreSendFlags(bookingPayload as BookingPayloadLocal),
                shopId: newShop.id
              }
              mergedSw = clampBookingPayloadToNextStep(mergedSw as BookingPayloadLocal, {
                shopCourseCount: coSw.length,
                shopDiveSiteCount: dsSw.length
              }) as BookingPayload
              mergedSw = await applyBookingCourseSeedIfEligible(
                mergedSw as BookingPayloadLocal,
                {
                  ...courseSeedBase,
                  courseOptions: coSw,
                  diveSiteOptions: dsSw,
                  shopId: newShop.id,
                  tripRequirements: mergeTripRequirements(effectiveTripReq, {
                    selectedShopId: newShop.id
                  })
                }
              ) as BookingPayload
              const nextSw = getNextBookingStep(mergedSw)
              const switchedClient = bookingShopFieldsForClient(newShop)
              const switchedLabel = switchedClient.shopDisplayName
              const switchOpen =
                nextSw?.step === 'name'
                  ? bookingGotItWithShopMessage(switchedLabel, "What's the name for the booking?")
                  : nextSw?.step === 'email'
                    ? bookingGotItWithShopMessage(switchedLabel, 'What email should we use for the booking?')
                    : nextSw?.step === 'dates'
                      ? bookingGotItWithShopMessage(switchedLabel, 'What are your trip dates (start and end)?')
                      : nextSw?.step === 'courses'
                        ? bookingGotItWithShopMessage(switchedLabel, bookingCoursesStepMessage(mergedSw))
                        : nextSw?.step === 'diveSites'
                          ? bookingGotItWithShopMessage(switchedLabel, bookingDiveSitesStepMessage(mergedSw))
                          : bookingGotItWithShopMessage(switchedLabel, "What's the name for the booking?")
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: switchOpen,
                ...switchedClient,
                bookingPayload: mergedSw,
                selectableOptions: undefined,
                rentalEquipmentOptions:
                  getNextBookingStep(mergedSw)?.step === 'gear' && reSw.length > 0 ? reSw : undefined,
                hideNoneForGear: hideNoneForGear(mergedSw),
                courseOptions:
                  getNextBookingStep(mergedSw)?.step === 'courses' && coSw.length > 0 ? rankCourses(coSw) : undefined,
                diveSiteOptions:
                  getNextBookingStep(mergedSw)?.step === 'diveSites' && dsSw.length > 0 ? dsSw : undefined
              })
            }
            if (newShop && newShop.id === resolvedShop.id) {
              const sameNext = getNextBookingStep(bookingPayload as BookingPayloadLocal)
              const sameCopy = sameNext
                ? orchestratorSplitBookingCopyForStep(sameNext, bookingPayload, {
                  shopCourseCount: courses.length,
                  shopDiveSiteCount: diveSites.length
                })
                : null
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: `You're already booking ${shopDisplayLabel(newShop)}. ${sameCopy?.message ?? 'Continue with your booking below.'}`,
                ...(sameCopy?.messagePreamble ? { messagePreamble: sameCopy.messagePreamble } : {}),
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload,
                selectableOptions: undefined,
                rentalEquipmentOptions: addGearOptions(bookingPayload),
                hideNoneForGear: hideNoneForGear(bookingPayload),
                courseOptions: addCourseOptions(bookingPayload),
                diveSiteOptions: addDiveSiteOptions(bookingPayload)
              })
            }
          }

          return withAgentMeta({
            success: true,
            intent: 'booking' as const,
            bookingReady: false,
            message: `I couldn't find "${sp}" in our directory. Try another spelling, search first, or say "go back to search" to browse without this booking.`,
            shopId: resolvedShop.id,
            shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
            bookingPayload,
            selectableOptions: [
              { label: 'Pick a new diveshop', value: 'Pick a new diveshop' },
              { label: 'Go back to search', value: 'Show me dive shops to search again' }
            ],
            rentalEquipmentOptions: addGearOptions(bookingPayload),
            hideNoneForGear: hideNoneForGear(bookingPayload),
            courseOptions: addCourseOptions(bookingPayload),
            diveSiteOptions: addDiveSiteOptions(bookingPayload)
          })
        }

        const messageAsksForDiveSites = (text: string) => /dive sites|which sites|sites would you like|available sites|pick one or more/i.test(text)
        const messageAsksForCourses = (text: string) => /courses|which course|interested in any course|certification course/i.test(text)

        // User replied to "shop has no gear" with no payload yet: Pick a new diveshop (clear shop) or Continue (start form)
        if (continuingBooking && !bookingPayload) {
          const msgTrim = message.trim()
          if (
            /pick a new diveshop|choose another shop|different (shop|diveshop)|go back to search|show me dive shops to search again/i.test(
              msgTrim
            )
          ) {
            return withAgentMeta({
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: 'No problem — search or pick from your results, then say "Book with [shop name]" to start a booking with a different shop.',
              shopId: undefined,
              shopName: undefined,
              bookingPayload: undefined,
              pendingBookingPayload: undefined,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              courseOptions: undefined,

              diveSiteOptions: undefined
            })
          }
          if (/continue with this shop|continue booking|proceed with this shop/i.test(msgTrim)) {
            const base: BookingPayload = { shopId: resolvedShop.id }
            let fromProfile: Record<string, unknown> = {}
            if (profilePrefill) {
              fromProfile = {
                name: profilePrefill.name ?? base.name,
                email: profilePrefill.email ?? base.email
              }
            }
            let initialPayload = { ...base, ...fromProfile } as BookingPayload
            initialPayload = applyResolvedTripDatesToBookingPayload(
              initialPayload as BookingPayloadLocal,
              resolvedHandoffDates
            ) as BookingPayload
            let nextHint = getNextBookingStep(initialPayload)
            if (nextHint?.step === 'courses' && courses.length === 0) {
              initialPayload = { ...initialPayload, desiredCourses: [] }
              nextHint = getNextBookingStep(initialPayload)
            }
            initialPayload = clampBookingPayloadToNextStep(initialPayload as BookingPayloadLocal, {
              shopCourseCount: courses.length,
              shopDiveSiteCount: diveSites.length
            }) as BookingPayload
            initialPayload = await applyBookingCourseSeedIfEligible(
              initialPayload as BookingPayloadLocal,
              courseSeedBase
            ) as BookingPayload
            nextHint = getNextBookingStep(initialPayload)
            const firstMessage = nextHint?.step === 'name'
              ? bookingGotItWithShopMessage(shopLabel, "What's the name for the booking?")
              : nextHint?.step === 'email'
                ? bookingGotItWithShopMessage(shopLabel, 'What email should we use for the booking?')
                : nextHint?.step === 'dates'
                  ? bookingGotItWithShopMessage(shopLabel, 'What are your trip dates (start and end)?')
                  : nextHint?.step === 'courses'
                    ? coursesIntroMessage(shopLabel, initialPayload)
                    : nextHint?.step === 'diveSites'
                      ? bookingGotItWithShopMessage(shopLabel, bookingDiveSitesStepMessage(initialPayload))
                      : bookingGotItWithShopMessage(shopLabel, "What's the name for the booking?")
            const rankedContinue = rankedCourses()
            return withAgentMeta({
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: firstMessage,
              shopId: resolvedShop.id,
              shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
              bookingPayload: initialPayload,
              tripRequirements: effectiveTripReq,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              courseOptions: getNextBookingStep(initialPayload)?.step === 'courses' && rankedContinue.length > 0 ? rankedContinue : undefined,
              diveSiteOptions: getNextBookingStep(initialPayload)?.step === 'diveSites' && diveSites.length > 0 ? diveSites : undefined
            })
          }
        }

        // Fast path: simple field (name, email, certification, height, weight, "none" or single gear item) → instant template response, no LLM
        if (continuingBooking && bookingPayload) {
          const msgTrim = message.trim()
          const payloadForSendCheck = normalizeBookingPayloadForSendCheck(bookingPayload)
          const nextStepBeforeInput = getNextBookingStep(payloadForSendCheck as BookingPayloadLocal)
          const lastAssistantForSendGate = history?.filter(m => m.role === 'assistant').pop()?.content ?? ''
          // Structured chip only: do not route this through NL `isConfirmSendMessage` (defense in depth).
          if (
            parseBookingPreSendToken(msgTrim) === 'confirm_send' &&
            nextStepBeforeInput?.step === 'ready' &&
            !/add another diver/i.test(lastAssistantForSendGate)
          ) {
            const pChip = { ...payloadForSendCheck, shopId: resolvedShop.id }
            const gatedChip = resolvePreSendWhenPayloadReady({
              payload: pChip as BookingPayloadLocal,
              shopId: resolvedShop.id,
              shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
              hasAuthUser: !!authUser,
              timing: bookingSignupTiming
            })
            if (gatedChip) return gatedChip
          }

          if (msgTrim === BOOKING_CONTACT_USE_PENDING_VERBATIM) {
            const rawV = bookingPayload.pendingVerbatimContactName?.trim()
            if (rawV) {
              const pUse = { ...bookingPayload, name: rawV } as BookingPayload
              delete pUse.pendingVerbatimContactName
              const fp = clampBookingPayloadToNextStep(pUse as BookingPayloadLocal, {
                shopCourseCount: courses.length,
                shopDiveSiteCount: diveSites.length
              }) as BookingPayload
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                messagePreamble: 'Thanks — got your name.',
                message: "What's the best email address for the booking?",
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: fp,
                selectableOptions: undefined,
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
          }
          if (msgTrim === BOOKING_CONTACT_MEANT_SOMETHING_ELSE) {
            const pElse = { ...bookingPayload } as BookingPayload
            delete pElse.pendingVerbatimContactName
            return withAgentMeta({
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message:
                'No problem — say the dive shop you want to switch to (e.g. “Let’s book with …”), or say you want to go back to search. I will not use your last message as the contact name.',
              shopId: resolvedShop.id,
              shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
              bookingPayload: pElse,
              selectableOptions: undefined,
              rentalEquipmentOptions: addGearOptions(pElse),
              hideNoneForGear: hideNoneForGear(pElse),
              courseOptions: addCourseOptions(pElse),
              diveSiteOptions: addDiveSiteOptions(pElse)
            })
          }

          // Mid-booking: browse operators in a place (e.g. "Dive shops in Alaska").
          const locationBrowsePlace = extractMidBookingLocationBrowsePhrase(msgTrim)
          if (locationBrowsePlace && supabaseUrl && supabaseKey) {
            const browseFilters = mergeInferredDiveTypesIntoFilters(
              inferSearchFiltersFromDestination(locationBrowsePlace),
              msgTrim
            )
            const browseQuery = await buildDiveShopQuery(supabaseUrl, supabaseKey, browseFilters)
            const browseList = (browseQuery.data || []) as unknown[]
            const placeLabel =
              browseFilters.place?.trim() ||
              browseFilters.country?.trim() ||
              locationBrowsePlace
            const { shopId: _browseSid, ...payloadWithoutShop } = clearBookingPreSendFlags(
              bookingPayload as BookingPayloadLocal
            ) as BookingPayload
            if (!browseQuery.error && browseList.length > 0) {
              return withAgentMeta({
                ...(await formatEntitySearchResponse(
                  supabaseUrl,
                  supabaseKey,
                  browseFilters,
                  browseList,
                  `${formatHereAreOperatorsInPlace({
                    place: placeLabel,
                    diveTypes: browseFilters.diveTypes,
                    count: browseList.length,
                    shops: browseList as Array<{ type?: string | null }>
                  })} Pick one to start booking.`
                )),
                intent: 'search' as const,
                shopId: undefined,
                shopName: undefined,
                bookingPayload: undefined,
                pendingBookingPayload: payloadWithoutShop
              })
            }
            return withAgentMeta({
              success: true,
              intent: 'search' as const,
              message: `I couldn't find dive shops in ${placeLabel} in our directory. Try a nearby city or country, or say "go back to search".`,
              shops: [],
              totalResults: 0,
              hasMoreResults: false,
              filters: browseFilters,
              shopId: undefined,
              shopName: undefined,
              bookingPayload: undefined,
              pendingBookingPayload: payloadWithoutShop
            })
          }

          // Mid-booking: go back to search, or switch to a different shop (before tryFastPath treats text as e.g. contact name).
          if (userMessageWantsResumeSearchDuringBooking(msgTrim)) {
            const { shopId: _carrySid, ...payloadWithoutShop } = clearBookingPreSendFlags(
              bookingPayload as BookingPayloadLocal
            ) as BookingPayload
            return withAgentMeta({
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message:
                'No problem — you’re back to browsing. Search or pick a shop from your results, then say "Book with [shop name]" to start again. Details you already entered will carry over.',
              shopId: undefined,
              shopName: undefined,
              bookingPayload: undefined,
              pendingBookingPayload: payloadWithoutShop,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              courseOptions: undefined,
              diveSiteOptions: undefined
            })
          }

          const switchOut = await tryMidBookingShopSwitchResponse(
            extractMidBookingShopSwitchPhrase(msgTrim),
            parseBookShopPickMessage(msgTrim)
          )
          if (switchOut) return switchOut

          // "Yes — add another" chip sends value `yes` — handle before confirm-send shortcuts.
          if (
            isAssistantAwaitingAddAnotherDiverReply(lastAssistantForSendGate) &&
            continuingBooking &&
            bookingPayload
          ) {
            const numDiversEarly = Math.max(1, bookingPayload.numberOfDivers ?? 1)
            const noMoreEarly =
              /^(no|nope|nah|that's all|just (these|two|them)|no other|no more|there's no|there are only|only two|just the two)$/i.test(
                msgTrim
              ) || /no other diver|just (the )?two divers/i.test(msgTrim)
            if (noMoreEarly) {
              const p = { ...bookingPayload, shopId: resolvedShop.id }
              const gatedNoMore = resolvePreSendWhenPayloadReady({
                payload: p as BookingPayloadLocal,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                hasAuthUser: !!authUser,
                timing: bookingSignupTiming
              })
              if (gatedNoMore) return gatedNoMore
            }
            const yesMoreEarly =
              /^(yes|yeah|yep|add one|add another|yes please|sure)$/i.test(msgTrim)
            if (yesMoreEarly) {
              const newNum = numDiversEarly + 1
              const p = { ...bookingPayload, numberOfDivers: newNum }
              const divers = Array.isArray(bookingPayload.divers) ? [...bookingPayload.divers] : []
              while (divers.length < newNum) {
                divers.push({
                  name: '',
                  dateOfBirth: '',
                  certificationNumber: '',
                  numberOfDives: '',
                  height: '',
                  heightUnit: 'ft-in',
                  weight: '',
                  weightUnit: 'lbs',
                  gear: []
                })
              }
              p.divers = divers
              const selectableOptions = profileDiverSelectableChipsFromPrefill(profilePrefill, {
                bookingPayload: p
              })
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: selectableOptions?.length
                  ? `Use an existing diver from your profile or create a new one for Diver ${newNum}?`
                  : `What's Diver ${newNum}'s full name?`,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions,
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
            if (msgTrim) {
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message:
                  'Tap "No — just these divers" or "Yes — add another", or name a different dive shop to switch (e.g. "Let\'s book with …" or "I want to dive with …").',
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload,
                selectableOptions: [
                  { label: 'No — just these divers', value: 'no' },
                  { label: 'Yes — add another', value: 'yes' }
                ],
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
          }

          const sendIntent = isConfirmSendMessage(msgTrim)
          const sendAnywayIntent = isSendAnywayMessage(msgTrim)
          const finishTasksIntent = isFinishRemainingTasksMessage(msgTrim)
          const canImmediateSendBooking = canImmediateSendBookingReply({
            sendIntent,
            sendAnywayIntent,
            nextStep: nextStepBeforeInput,
            lastAssistantContent: lastAssistantForSendGate,
            preSendReviewAck: Boolean(payloadForSendCheck.preSendReviewAck)
          })

          if (
            shouldShowPreSendReviewOnFirstConfirm({
              sendIntent,
              sendAnywayIntent,
              nextStep: nextStepBeforeInput,
              preSendReviewAck: Boolean(payloadForSendCheck.preSendReviewAck),
              lastAssistantContent: lastAssistantForSendGate
            })
          ) {
            const pRev = { ...payloadForSendCheck, shopId: resolvedShop.id }
            const gatedRev = resolvePreSendWhenPayloadReady({
              payload: pRev as BookingPayloadLocal,
              shopId: resolvedShop.id,
              shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
              hasAuthUser: !!authUser,
              timing: bookingSignupTiming
            })
            if (gatedRev) return gatedRev
          }

          // Explicit send intents: only short-circuit when canonical step is ready (or user said send anyway).
          if (sendIntent || sendAnywayIntent || finishTasksIntent) {
            if ((sendIntent || sendAnywayIntent) && canImmediateSendBooking) {
              const p = { ...payloadForSendCheck, shopId: resolvedShop.id }
              if (sendAnywayIntent) {
                if (nextStepBeforeInput?.step === 'ready') {
                  const gatedAnyway = resolvePreSendWhenPayloadReady({
                    payload: p as BookingPayloadLocal,
                    shopId: resolvedShop.id,
                    shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                    hasAuthUser: !!authUser,
                    timing: bookingSignupTiming
                  })
                  if (gatedAnyway) return gatedAnyway
                }
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: true,
                  payload: p,
                  message: 'Understood — sending your booking request now.',
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  selectableOptions: undefined
                })
              }
              const gatedSend = resolvePreSendWhenPayloadReady({
                payload: p as BookingPayloadLocal,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                hasAuthUser: !!authUser,
                timing: bookingSignupTiming
              })
              if (gatedSend) return gatedSend
            }

            // User chose to continue form completion after seeing send options.
            if (finishTasksIntent && nextStepBeforeInput) {
              const stepCopy = orchestratorSplitBookingCopyForStep(nextStepBeforeInput, bookingPayload, {
                shopCourseCount: courses.length,
                shopDiveSiteCount: diveSites.length
              })
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: stepCopy?.message ?? 'No problem — let’s finish the remaining details.',
                ...(stepCopy?.messagePreamble ? { messagePreamble: stepCopy.messagePreamble } : {}),
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: payloadForSendCheck,
                selectableOptions: undefined,
                rentalEquipmentOptions: addGearOptions(payloadForSendCheck),
                hideNoneForGear: hideNoneForGear(payloadForSendCheck),
                courseOptions: addCourseOptions(payloadForSendCheck),
                diveSiteOptions: addDiveSiteOptions(payloadForSendCheck)
              })
            }

          }

          // Orchestrator: parse trip dates without LLM so payload + form stay aligned and steps are not skipped
          if (getNextBookingStep(bookingPayload)?.step === 'dates') {
            const applyTripDatesCtx = {
              shopCourseCount: courses.length,
              shopDiveSiteCount: diveSites.length,
              userMessage: msgTrim,
              history,
              courses,
              tripRequirements: effectiveTripReq
            }

            let bp: BookingPayload = { ...bookingPayload }
            if (bp.pendingLongTripConfirmation) {
              const pend = bp.pendingLongTripConfirmation
              if (isLongTripConfirmMessage(msgTrim)) {
                const p = applyParsedTripDatesToBookingPayload(
                  { ...bp, pendingLongTripConfirmation: undefined } as BookingPayloadLocal,
                  pend,
                  applyTripDatesCtx
                ) as BookingPayload
                const copy = formatReplyAfterAppliedTripDates(
                  p,
                  pend,
                  courses.length,
                  diveSites.length
                )
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message: copy.message,
                  ...(copy.messagePreamble ? { messagePreamble: copy.messagePreamble } : {}),
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  bookingPayload: p,
                  selectableOptions: undefined,
                  rentalEquipmentOptions: addGearOptions(p),
                  hideNoneForGear: hideNoneForGear(p),
                  courseOptions: addCourseOptions(p),
                  diveSiteOptions: addDiveSiteOptions(p)
                })
              }
              if (isLongTripRejectMessage(msgTrim)) {
                const cleared = clampBookingPayloadToNextStep(
                  { ...bp, pendingLongTripConfirmation: undefined } as BookingPayloadLocal,
                  { shopCourseCount: courses.length, shopDiveSiteCount: diveSites.length }
                ) as BookingPayload
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message: 'No problem — what are your diving start and end dates?',
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  bookingPayload: cleared,
                  selectableOptions: undefined,
                  rentalEquipmentOptions: undefined,
                  hideNoneForGear: hideNoneForGear(cleared),
                  courseOptions: undefined,
                  diveSiteOptions: undefined
                })
              }
              const pendingDateRes = resolveTripDatesUserMessage(msgTrim)
              if (pendingDateRes.status === 'clarify') {
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message: pendingDateRes.message,
                  ...(pendingDateRes.selectableOptions?.length
                    ? { selectableOptions: pendingDateRes.selectableOptions }
                    : {}),
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  bookingPayload: bp,
                  rentalEquipmentOptions: undefined,
                  hideNoneForGear: hideNoneForGear(bp),
                  courseOptions: undefined,
                  diveSiteOptions: undefined
                })
              }
              if (pendingDateRes.status === 'past') {
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message: pendingDateRes.message,
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  bookingPayload: bp,
                  selectableOptions: undefined,
                  rentalEquipmentOptions: undefined,
                  hideNoneForGear: hideNoneForGear(bp),
                  courseOptions: undefined,
                  diveSiteOptions: undefined
                })
              }
              if (pendingDateRes.status === 'noop') {
                const days = inclusiveTripDays(pend.startDate, pend.endDate)
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message: `That's ${days} days (${pend.startDate} to ${pend.endDate}). Most dive trips are a week or two — is that the window you want? Reply yes to keep it, no to change dates, or type new dates.`,
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  bookingPayload: bp,
                  selectableOptions: undefined,
                  rentalEquipmentOptions: undefined,
                  hideNoneForGear: hideNoneForGear(bp),
                  courseOptions: undefined,
                  diveSiteOptions: undefined
                })
              }
              bp = { ...bp, pendingLongTripConfirmation: undefined }
              const parsedDatesFromPending = pendingDateRes.range
              const daysFromPending = inclusiveTripDays(parsedDatesFromPending.startDate, parsedDatesFromPending.endDate)
              if (daysFromPending > 21) {
                const pendingPayload: BookingPayload = {
                  ...bp,
                  pendingLongTripConfirmation: {
                    startDate: parsedDatesFromPending.startDate,
                    endDate: parsedDatesFromPending.endDate
                  }
                }
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message: `That's ${daysFromPending} days (${parsedDatesFromPending.startDate} to ${parsedDatesFromPending.endDate}). Most dive trips are a few days to a week or two — is that correct? Reply yes to confirm or no / new dates to adjust.`,
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  bookingPayload: pendingPayload,
                  selectableOptions: undefined,
                  rentalEquipmentOptions: undefined,
                  hideNoneForGear: hideNoneForGear(pendingPayload),
                  courseOptions: undefined,
                  diveSiteOptions: undefined
                })
              }
              const pPending = applyParsedTripDatesToBookingPayload(bp as BookingPayloadLocal, parsedDatesFromPending, applyTripDatesCtx) as BookingPayload
              const copyPending = formatReplyAfterAppliedTripDates(
                pPending,
                parsedDatesFromPending,
                courses.length,
                diveSites.length
              )
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: copyPending.message,
                ...(copyPending.messagePreamble ? { messagePreamble: copyPending.messagePreamble } : {}),
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: pPending,
                selectableOptions: undefined,
                rentalEquipmentOptions: addGearOptions(pPending),
                hideNoneForGear: hideNoneForGear(pPending),
                courseOptions: addCourseOptions(pPending),
                diveSiteOptions: addDiveSiteOptions(pPending)
              })
            }

            const dateRes = resolveTripDatesUserMessage(msgTrim)
            if (dateRes.status === 'clarify') {
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: dateRes.message,
                ...(dateRes.selectableOptions?.length ? { selectableOptions: dateRes.selectableOptions } : {}),
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: bp,
                rentalEquipmentOptions: undefined,
                hideNoneForGear: hideNoneForGear(bp),
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
            if (dateRes.status === 'past') {
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: dateRes.message,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: bp,
                selectableOptions: undefined,
                rentalEquipmentOptions: undefined,
                hideNoneForGear: hideNoneForGear(bp),
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
            if (dateRes.status === 'ok') {
              const parsedDates = dateRes.range
              const days = inclusiveTripDays(parsedDates.startDate, parsedDates.endDate)
              if (days > 21) {
                const pendingPayload: BookingPayload = {
                  ...bp,
                  pendingLongTripConfirmation: { startDate: parsedDates.startDate, endDate: parsedDates.endDate }
                }
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message: `That's ${days} days (${parsedDates.startDate} to ${parsedDates.endDate}). Most dive trips are a few days to a week or two — is that correct? Reply yes to confirm or no / new dates to adjust.`,
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  bookingPayload: pendingPayload,
                  selectableOptions: undefined,
                  rentalEquipmentOptions: undefined,
                  hideNoneForGear: hideNoneForGear(pendingPayload),
                  courseOptions: undefined,
                  diveSiteOptions: undefined
                })
              }
              const p = applyParsedTripDatesToBookingPayload(bp as BookingPayloadLocal, parsedDates, applyTripDatesCtx) as BookingPayload
              const copy = formatReplyAfterAppliedTripDates(
                p,
                parsedDates,
                courses.length,
                diveSites.length
              )
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: copy.message,
                ...(copy.messagePreamble ? { messagePreamble: copy.messagePreamble } : {}),
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: addGearOptions(p),
                hideNoneForGear: hideNoneForGear(p),
                courseOptions: addCourseOptions(p),
                diveSiteOptions: addDiveSiteOptions(p)
              })
            }
          }
          // User already saw the booking-ready prompt and is confirming — never re-ask for gear; return ready so client can submit
          const lastAssistantContent = history?.filter(m => m.role === 'assistant').pop()?.content ?? ''
          const reviewTurn = tryHandleBookingReviewEditTurn({
            message: msgTrim,
            bookingPayload: bookingPayload as BookingPayloadLocal,
            shopId: resolvedShop.id,
            shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
            hasAuthUser: !!authUser,
            bookingSignupTiming,
            shopCourseCount: courses.length,
            shopDiveSiteCount: diveSites.length,
            lastAssistantContent,
            rentalEquipment,
            courses,
            diveSites,
            tripRequirements: effectiveTripReq
          })
          if (reviewTurn) {
            const rt = reviewTurn as { bookingPayload?: BookingPayload; payload?: BookingPayload }
            const bp = rt.bookingPayload ?? rt.payload
            return withAgentMeta({
              ...(reviewTurn as Record<string, unknown>),
              ...(bp
                ? {
                    rentalEquipmentOptions: addGearOptions(bp),
                    hideNoneForGear: hideNoneForGear(bp),
                    courseOptions: addCourseOptions(bp),
                    diveSiteOptions: addDiveSiteOptions(bp)
                  }
                : {})
            } as Record<string, unknown>)
          }
          const lastWasReadyToSend = /(?:ready to send your booking request|can i send the booking request)/i.test(lastAssistantContent)
          const confirmSend = isConfirmSendMessage(msgTrim) ||
            (lastWasReadyToSend && /^(yes|send|submit|confirm|ok)$/i.test(msgTrim))
          if (lastWasReadyToSend && confirmSend) {
            const p = { ...bookingPayload, shopId: resolvedShop.id }
            const gatedLast = resolvePreSendWhenPayloadReady({
              payload: p as BookingPayloadLocal,
              shopId: resolvedShop.id,
              shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
              hasAuthUser: !!authUser,
              timing: bookingSignupTiming
            })
            if (gatedLast) return gatedLast
          }
          // "Pick a new diveshop" → return current form data so client can carry it over to the next shop
          if (
            /pick a new diveshop|choose another shop|different (shop|diveshop)|go back to search|show me dive shops to search again/i.test(
              msgTrim
            )
          ) {
            const { shopId: _s, ...payloadWithoutShop } = clearBookingPreSendFlags(bookingPayload as BookingPayloadLocal) as BookingPayload
            return withAgentMeta({
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              message: 'No problem — search or pick from your results, then say "Book with [shop name]" to start a booking with a different shop. Your details will be carried over.',
              shopId: undefined,
              shopName: undefined,
              bookingPayload: undefined,
              pendingBookingPayload: payloadWithoutShop,
              selectableOptions: undefined,
              rentalEquipmentOptions: undefined,
              courseOptions: undefined,

              diveSiteOptions: undefined
            })
          }
          // Edit/review intents: user asks to change a specific form item — clear it and re-ask
          const editEmail = /(?:change|update|edit|fix)\s+(?:my\s+)?(?:email|e-?mail)/i.test(msgTrim) || /(?:update|change)\s+email/i.test(msgTrim)
          const editName = /(?:change|update|edit|fix)\s+(?:my\s+)?name/i.test(msgTrim)
          const editDates = /(?:change|update|edit|fix)\s+(?:my\s+)?(?:dates?|trip dates?)/i.test(msgTrim) || /(?:update|change)\s+dates/i.test(msgTrim)
          const editGearDiver1 = /(?:change|update|edit)\s+(?:diver\s*1'?s?|my)\s+(?:rental\s+)?gear/i.test(msgTrim) || /(?:rental\s+)?gear\s+for\s+(?:diver\s*1|me)/i.test(msgTrim)
          const editGearDiver2 = /(?:change|update|edit)\s+diver\s*2'?s?\s+(?:rental\s+)?gear/i.test(msgTrim) || /(?:rental\s+)?gear\s+for\s+diver\s*2/i.test(msgTrim)
          const reviewBooking = /\b(?:review|show|see|check)\s+(?:my\s+)?(?:booking|details|form|info)\b/i.test(msgTrim)
          // "Add gear for Chris Porter" / "I need to add gear for [name]" — go back to that diver's gear step (by name)
          const addGearForNameMatch = msgTrim.match(/(?:add|need to add|want to add)\s+(?:some\s+)?(?:rental\s+)?gear\s+for\s+(.+?)(?:\.|$)/i)
          const addGearForName = addGearForNameMatch?.[1]?.trim()
          if (editEmail || editName || editDates || editGearDiver1 || editGearDiver2 || reviewBooking || addGearForName) {
            const onlyReviewBooking =
              reviewBooking && !editEmail && !editName && !editDates && !editGearDiver1 && !editGearDiver2 && !addGearForName
            const baseForEdit = onlyReviewBooking
              ? bookingPayload
              : clearBookingPreSendFlags(bookingPayload as BookingPayloadLocal)
            const p = { ...baseForEdit, divers: [...(bookingPayload.divers || [])].map(d => ({ ...d })) } as BookingPayload
            if (addGearForName && p.divers?.length) {
              const nameLower = addGearForName.toLowerCase()
              const diverIdx = p.divers.findIndex(d => d?.name && String(d.name).trim().toLowerCase().includes(nameLower))
              if (diverIdx >= 0 && p.divers[diverIdx]) {
                p.divers[diverIdx] = { ...p.divers[diverIdx], gearAsked: false }
                const name = p.divers[diverIdx].name || 'Diver ' + (diverIdx + 1)
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message: bookingGearStepMessage(name),
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  bookingPayload: p,
                  selectableOptions: undefined,
                  rentalEquipmentOptions: rentalEquipment.length > 0 ? rentalEquipment : undefined,
                  hideNoneForGear: hideNoneForGear(p),
                  courseOptions: undefined,
                  diveSiteOptions: undefined
                })
              }
            }
            if (editEmail) {
              p.email = ''
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: "No problem — what's the best email address for the booking?",
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,

                diveSiteOptions: undefined
              })
            }
            if (editName) {
              p.name = ''
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: "What's the name for the booking?",
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,

                diveSiteOptions: undefined
              })
            }
            if (editDates) {
              p.startDate = undefined
              p.endDate = undefined
              delete p.pendingLongTripConfirmation
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: 'What are your diving start and end dates? You can say them in any format (e.g. April 4–20, 2026).',
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,

                diveSiteOptions: undefined
              })
            }
            const numDivers = Math.max(1, p.numberOfDivers ?? 1)
            if (editGearDiver1 && p.divers?.[0]) {
              p.divers[0] = { ...p.divers[0], gear: [], gearAsked: false }
              const name = p.divers[0].name || 'Diver 1'
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: `Does ${name} need any rental gear?`,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: rentalEquipment.length > 0 ? rentalEquipment : undefined,
                hideNoneForGear: hideNoneForGear(p),
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
            if (editGearDiver2 && numDivers >= 2 && p.divers?.[1]) {
              p.divers[1] = { ...p.divers[1], gear: [], gearAsked: false }
              const name = p.divers[1].name || 'Diver 2'
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: `Does ${name} need any rental gear?`,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: rentalEquipment.length > 0 ? rentalEquipment : undefined,
                hideNoneForGear: hideNoneForGear(p),
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
            if (reviewBooking) {
              const nextRev = getNextBookingStep(p as BookingPayloadLocal)
              if (nextRev?.step === 'ready') {
                const pReady = { ...p, shopId: resolvedShop.id }
                const gatedReview = resolvePreSendWhenPayloadReady({
                  payload: pReady as BookingPayloadLocal,
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  hasAuthUser: !!authUser,
                  timing: bookingSignupTiming
                })
                if (gatedReview) {
                  return withAgentMeta({
                    ...(gatedReview as Record<string, unknown>),
                    rentalEquipmentOptions: undefined,
                    hideNoneForGear: false,
                    courseOptions: undefined,
                    diveSiteOptions: undefined
                  } as Record<string, unknown>)
                }
              }
              const { messagePreamble, message } = formatBookingReviewSummary(shopLabel, p)
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: `${message}\n\nYou can say "change my email", "update diver 1's gear", or "edit dates" to change something, or keep answering the questions above.`,
                messagePreamble,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,

                diveSiteOptions: undefined
              })
            }
          }
          // User asked to change a diver's weight/height/cert/dives (e.g. during gear) — clear field, show current value, re-ask
          const nextForDiverEdit = getNextBookingStep(bookingPayload)
          const diverFieldEdit = tryParseDiverFieldEditIntent(msgTrim, bookingPayload as BookingPayloadLocal, {
            currentGearDiverIndex: nextForDiverEdit?.step === 'gear' ? nextForDiverEdit.diverIndex ?? null : null
          })
          if (diverFieldEdit) {
            const numDiversEdit = Math.max(1, bookingPayload.numberOfDivers ?? 1)
            const diversEdit = Array.isArray(bookingPayload.divers) ? bookingPayload.divers.map(d => ({ ...d })) : []
            while (diversEdit.length < numDiversEdit) {
              diversEdit.push({ name: '', dateOfBirth: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] })
            }
            const di = diverFieldEdit.diverIndex
            if (diversEdit[di]) {
              const prevVal = snapshotDiverField(diversEdit[di], diverFieldEdit.field)
              diversEdit[di] = clearDiverFieldOnCopy(diversEdit[di], diverFieldEdit.field)
              let pEdit = { ...clearBookingPreSendFlags(bookingPayload as BookingPayloadLocal), divers: diversEdit } as BookingPayload
              pEdit = clampBookingPayloadToNextStep(pEdit as BookingPayloadLocal, {
                shopCourseCount: courses.length,
                shopDiveSiteCount: diveSites.length
              }) as BookingPayload
              const editMsg = buildDiverFieldEditPrompt(diverFieldEdit.field, diverFieldEdit.displayName, prevVal)
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: editMsg,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: pEdit,
                selectableOptions: undefined,
                rentalEquipmentOptions: addGearOptions(pEdit),
                hideNoneForGear: hideNoneForGear(pEdit),
                courseOptions: addCourseOptions(pEdit),
                diveSiteOptions: addDiveSiteOptions(pEdit)
              })
            }
          }
          // Equipment-name tap (e.g. "Regulator", "Fins"): add to the diver we're currently asking for (gear step), not always the last diver
          const nextStepForGearTap = getNextBookingStep(bookingPayload)
          if (rentalEquipmentNames.length > 0 && msgTrim.length > 0 && nextStepForGearTap?.step === 'gear' && nextStepForGearTap.diverIndex != null) {
            const matched = rentalEquipmentNames.find(n => n.toLowerCase() === msgTrim.toLowerCase())
            if (matched) {
              const numDivers = Math.max(1, bookingPayload.numberOfDivers ?? 1)
              const divers = Array.isArray(bookingPayload.divers) ? [...bookingPayload.divers] : []
              while (divers.length < numDivers) {
                divers.push({ name: '', dateOfBirth: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] })
              }
              const targetIdx = nextStepForGearTap.diverIndex
              const targetDiver = divers[targetIdx]
              if (targetDiver && !targetDiver.gear?.some((g: { gearType?: string }) => (g.gearType || '').toLowerCase() === msgTrim.toLowerCase())) {
                const p = { ...bookingPayload, divers: [...divers] }
                p.divers[targetIdx] = { ...targetDiver, gear: [...(targetDiver.gear || []), { gearType: matched }] }
                const name = p.divers[targetIdx].name || 'They'
                const gearChipsForFast = rentalEquipment.length > 0 ? rentalEquipment : undefined
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message: `Added ${matched} for ${name}. ${BOOKING_GEAR_ADD_HINT}`,
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  bookingPayload: p,
                  selectableOptions: undefined,
                  rentalEquipmentOptions: gearChipsForFast,
                  hideNoneForGear: hideNoneForGear(p),
                  courseOptions: undefined,
                  diveSiteOptions: undefined
                })
              }
            }
          }
          // Courses fast path before dive sites (so "done" on courses isn't conflated). No LLM.
          let workingPayload = bookingPayload
          if (getNextBookingStep(workingPayload)?.step === 'courses' && courses.length === 0) {
            workingPayload = { ...workingPayload, desiredCourses: [] }
          }
          const nextStepForCourse = getNextBookingStep(workingPayload)
          if (nextStepForCourse?.step === 'courses' && courses.length > 0) {
            const matchedCourse = courses.find(c => c.name.toLowerCase() === msgTrim.toLowerCase())
            if (matchedCourse) {
              const list = [...(workingPayload.desiredCourses || [])]
              if (!list.includes(matchedCourse.name)) list.push(matchedCourse.name)
              const p = { ...workingPayload, desiredCourses: list, coursesSelectionComplete: false }
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: `Added ${matchedCourse.name}. ${bookingMultiSelectChipHint('courses', true)}`,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: undefined,
                courseOptions: courses,
                diveSiteOptions: undefined
              })
            }
            if (isBookingOptionalStepToken(msgTrim)) {
              let p = clampBookingPayloadToNextStep(
                {
                  ...workingPayload,
                  desiredCourses: isBookingOptionalClearSelectionToken(msgTrim)
                    ? []
                    : (workingPayload.desiredCourses || []),
                  coursesSelectionComplete: true
                },
                { shopCourseCount: courses.length, shopDiveSiteCount: diveSites.length }
              ) as BookingPayload
              const nextAfterCourses = getNextBookingStep(p as BookingPayloadLocal)
              if (nextAfterCourses && nextAfterCourses.step !== 'courses') {
                if (nextAfterCourses.step === 'diveSites' && diveSites.length === 0) {
                  p = clampBookingPayloadToNextStep(
                    { ...p, desiredDiveSites: [], diveSitesSelectionComplete: true } as BookingPayloadLocal,
                    { shopCourseCount: courses.length, shopDiveSiteCount: diveSites.length }
                  ) as BookingPayload
                }
                const next = getNextBookingStep(p as BookingPayloadLocal)
                if (next && next.step !== 'courses') {
                  const copy = getBookingMultiSelectAdvanceCopy(next, p as BookingPayloadLocal)
                  return withAgentMeta({
                    success: true,
                    intent: 'booking' as const,
                    bookingReady: false,
                    message: copy.message,
                    ...(copy.messagePreamble ? { messagePreamble: copy.messagePreamble } : {}),
                    shopId: resolvedShop.id,
                    shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                    bookingPayload: p,
                    selectableOptions: undefined,
                    rentalEquipmentOptions: addGearOptions(p),
                    hideNoneForGear: hideNoneForGear(p),
                    courseOptions: addCourseOptions(p),
                    diveSiteOptions: addDiveSiteOptions(p)
                  })
                }
              }
            }
          }
          // Dive-sites fast path first (so "done" on dive sites isn't caught by gear "done"). No LLM.
          const nextStepForDive = getNextBookingStep(workingPayload)
          if (nextStepForDive?.step === 'diveSites') {
            if (diveSites.length === 0) {
              const p = { ...workingPayload, desiredDiveSites: [], diveSitesSelectionComplete: true }
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                messagePreamble: 'No specific dive sites for this shop.',
                message: 'How many divers will be on the trip?',
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
          }
          if (nextStepForDive?.step === 'diveSites' && diveSites.length > 0) {
            const matchedSite = diveSiteNames.find(n => n.toLowerCase() === msgTrim.toLowerCase())
            if (matchedSite) {
              const sites = [...(workingPayload.desiredDiveSites || [])]
              if (!sites.includes(matchedSite)) sites.push(matchedSite)
              const p = {
                ...workingPayload,
                desiredDiveSites: sites,
                diveSitesSelectionComplete: false
              }
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: `Added ${matchedSite}. ${bookingMultiSelectChipHint('diveSites', true)}`,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,
                diveSiteOptions: diveSites
              })
            }
            if (isBookingOptionalStepToken(msgTrim)) {
              let p = clampBookingPayloadToNextStep(
                {
                  ...workingPayload,
                  desiredDiveSites: isBookingOptionalClearSelectionToken(msgTrim)
                    ? []
                    : (workingPayload.desiredDiveSites || []),
                  diveSitesSelectionComplete: true
                },
                { shopCourseCount: courses.length, shopDiveSiteCount: diveSites.length }
              ) as BookingPayload
              const next = getNextBookingStep(p as BookingPayloadLocal)
              const copy =
                next && next.step !== 'diveSites'
                  ? getBookingMultiSelectAdvanceCopy(next, p as BookingPayloadLocal)
                  : { message: 'How many divers will be on the trip?' }
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: copy.message,
                ...(copy.messagePreamble ? { messagePreamble: copy.messagePreamble } : {}),
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: p,
                selectableOptions: undefined,
                rentalEquipmentOptions: addGearOptions(p),
                hideNoneForGear: hideNoneForGear(p),
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
          }
          // "Done" (or "none") when last diver has gear: ask if they want to add another diver (don't assume Diver 3)
          const numDiversForDone = Math.max(1, bookingPayload.numberOfDivers ?? 1)
          const lastDiverForDone = bookingPayload.divers?.[numDiversForDone - 1]
          if (
            lastDiverForDone?.gear?.length &&
            isBookingOptionalStepToken(msgTrim) &&
            !isBookingOptionalClearSelectionToken(msgTrim)
          ) {
            const name = lastDiverForDone.name || 'They'
            const payloadWithGearAsked = { ...bookingPayload, divers: [...(bookingPayload.divers || [])] }
            const lastIdx = numDiversForDone - 1
            if (payloadWithGearAsked.divers && payloadWithGearAsked.divers[lastIdx]) {
              payloadWithGearAsked.divers[lastIdx] = { ...payloadWithGearAsked.divers[lastIdx], gearAsked: true }
            }
            return withAgentMeta({
              success: true,
              intent: 'booking' as const,
              bookingReady: false,
              messagePreamble: `Got it — ${name}'s gear is set.`,
              message: 'Do you want to add another diver? (yes/no)',
              shopId: resolvedShop.id,
              shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
              bookingPayload: payloadWithGearAsked,
              selectableOptions: [{ label: 'No — just these divers', value: 'no' }, { label: 'Yes — add another', value: 'yes' }],
              rentalEquipmentOptions: undefined,
              courseOptions: undefined,

              diveSiteOptions: undefined
            })
          }
          if (/^(lbs?|kg|pounds)$/i.test(msgTrim)) {
            const fastUnit = tryFastPathUnitOnly(message, bookingPayload, shopLabel)
            if (fastUnit) {
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: fastUnit.message,
                ...(fastUnit.messagePreamble ? { messagePreamble: fastUnit.messagePreamble } : {}),
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: fastUnit.payload,
                selectableOptions: undefined,
                rentalEquipmentOptions: addGearOptions(fastUnit.payload),
                hideNoneForGear: hideNoneForGear(fastUnit.payload),
                courseOptions: addCourseOptions(fastUnit.payload),
                diveSiteOptions: addDiveSiteOptions(fastUnit.payload)
              })
            }
          }
          const nextStep = getNextBookingStep(bookingPayload)
          // Already complete: user said "send" / "yes" / "confirm" — return ready to send, don't re-ask or call LLM
          if (nextStep?.step === 'ready') {
            const confirmSend =
              isConfirmSendMessage(msgTrim) &&
              !isAssistantAwaitingAddAnotherDiverReply(lastAssistantContent)
            if (confirmSend) {
              const p = { ...bookingPayload, shopId: resolvedShop.id }
              const gatedConfirm = resolvePreSendWhenPayloadReady({
                payload: p as BookingPayloadLocal,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                hasAuthUser: !!authUser,
                timing: bookingSignupTiming
              })
              if (gatedConfirm) return gatedConfirm
            }
          }
          if (nextStep) {
            const fastOptions: { rentalEquipmentNames?: string[]; profilePrefill?: typeof body.profilePrefill } = {}
            fastOptions.rentalEquipmentNames = rentalEquipmentNames
            if (profilePrefill) fastOptions.profilePrefill = profilePrefill
            const fast = tryFastPath(nextStep, message, bookingPayload, shopLabel, fastOptions)
            if (fast) {
              const fp = clampBookingPayloadToNextStep(fast.payload as BookingPayloadLocal, {
                shopCourseCount: courses.length,
                shopDiveSiteCount: diveSites.length
              }) as BookingPayload
              const nextAfterFast = getNextBookingStep(fp)?.step
              if (nextAfterFast === 'ready') {
                const p = { ...fp, shopId: resolvedShop.id }
                const gatedFast = resolvePreSendWhenPayloadReady({
                  payload: p as BookingPayloadLocal,
                  shopId: resolvedShop.id,
                  shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                  hasAuthUser: !!authUser,
                  timing: bookingSignupTiming
                })
                if (gatedFast) return gatedFast
              }
              // No blanket "no rental gear" here: height/weight → gear is handled inside tryFastPath (followUpAfterDiverMeasurementAck).
              const gearChipsForFast = rentalEquipment.length > 0 ? rentalEquipment : undefined
              // When fast path returns selectableOptions (e.g. no-rental-gear: "I understand" / "Pick a new diveshop"), use them and skip gear chips
              const noRentalGearOptions = fast.selectableOptions?.length ? fast.selectableOptions : undefined
              const showGearChips =
                noRentalGearOptions
                  ? undefined
                  : getNextBookingStep(fp as BookingPayloadLocal)?.step === 'gear'
                    ? gearChipsForFast
                    : undefined
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message: fast.message,
                ...(fast.messagePreamble ? { messagePreamble: fast.messagePreamble } : {}),
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: fp,
                selectableOptions: noRentalGearOptions ?? undefined,
                rentalEquipmentOptions: showGearChips ?? undefined,
                hideNoneForGear: hideNoneForGear(fp),
                courseOptions: addCourseOptions(fp),
                diveSiteOptions: addDiveSiteOptions(fp)
              })
            }
            if (
              !fast &&
              nextStep.step === 'name' &&
              !chatAiOff &&
              openaiApiKey &&
              (contactNameInputLikelyNotAPlainName(msgTrim) || msgTrim.length > 100)
            ) {
              const classified = await classifyBookingContactReply({
                message: msgTrim,
                openaiApiKey,
                signal: abortSignalFromH3Event(event)
              })
              if (classified.intent === 'exit_to_search') {
                const { shopId: _carrySid, ...payloadWithoutShop } = clearBookingPreSendFlags(
                  bookingPayload as BookingPayloadLocal
                ) as BookingPayload
                return withAgentMeta({
                  success: true,
                  intent: 'booking' as const,
                  bookingReady: false,
                  message:
                    'No problem — you’re back to browsing. Search or pick a shop from your results, then say "Book with [shop name]" to start again. Details you already entered will carry over.',
                  shopId: undefined,
                  shopName: undefined,
                  bookingPayload: undefined,
                  pendingBookingPayload: payloadWithoutShop,
                  selectableOptions: undefined,
                  rentalEquipmentOptions: undefined,
                  courseOptions: undefined,
                  diveSiteOptions: undefined
                })
              }
              if (classified.intent === 'switch_shop' && classified.shop_name_hint?.trim()) {
                const hinted = classified.shop_name_hint.trim()
                const synthetic =
                  extractMidBookingShopSwitchPhrase(`Let's book with ${hinted}`) ?? hinted
                const switchFromHint = await tryMidBookingShopSwitchResponse(
                  synthetic,
                  null,
                  mergeBookingNounHints(collectBookingNounHints(msgTrim), {
                    operatorName: hinted,
                    placeName: classified.place_hint?.trim() || null
                  })
                )
                if (switchFromHint) return switchFromHint
              }
              if (classified.intent === 'contact_name') {
                const nameLine = (classified.contact_name?.trim() || msgTrim).slice(0, 100)
                const safe =
                  nameLine.length >= 2 &&
                  nameLine.length <= 100 &&
                  !contactNameInputLikelyNotAPlainName(nameLine)
                if (safe) {
                  const pNamed = { ...bookingPayload, name: nameLine } as BookingPayload
                  delete pNamed.pendingVerbatimContactName
                  const fp = clampBookingPayloadToNextStep(pNamed as BookingPayloadLocal, {
                    shopCourseCount: courses.length,
                    shopDiveSiteCount: diveSites.length
                  }) as BookingPayload
                  return withAgentMeta({
                    success: true,
                    intent: 'booking' as const,
                    bookingReady: false,
                    messagePreamble: 'Thanks — got your name.',
                    message: "What's the best email address for the booking?",
                    shopId: resolvedShop.id,
                    shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                    bookingPayload: fp,
                    selectableOptions: undefined,
                    rentalEquipmentOptions: undefined,
                    courseOptions: undefined,
                    diveSiteOptions: undefined
                  })
                }
              }
              const pPending = { ...bookingPayload, pendingVerbatimContactName: msgTrim } as BookingPayload
              return withAgentMeta({
                success: true,
                intent: 'booking' as const,
                bookingReady: false,
                message:
                  'I’m not sure how to read that line. Should I use it as the name for this booking, or were you switching to another dive shop / going back to browse?',
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                bookingPayload: pPending,
                selectableOptions: [
                  { label: 'Use that as my contact name', value: BOOKING_CONTACT_USE_PENDING_VERBATIM },
                  { label: 'I meant another shop or browsing', value: BOOKING_CONTACT_MEANT_SOMETHING_ELSE }
                ],
                rentalEquipmentOptions: undefined,
                courseOptions: undefined,
                diveSiteOptions: undefined
              })
            }
          }
        }

        if (chatAiOff) {
          return withAgentMeta({
            success: true,
            intent: 'booking' as const,
            bookingReady: false,
            message:
              `Chat booking assistant (GPT-5.5) is turned off. Use Show form in the shop panel to finish with ${shopLabel}, or set NUXT_PUBLIC_DISABLE_CHAT_AI=false and configure NUXT_OPENAI_API_KEY.`,
            shopId: resolvedShop.id,
            shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
            bookingPayload: bookingPayload ?? { shopId: resolvedShop.id },
            selectableOptions: [{ label: 'Open booking form', value: BOOKING_PRESEND_OPEN_FORM }]
          })
        }

        const nextStepHint = bookingPayload ? getNextBookingStep(bookingPayload) : null
        const systemPrompt = buildBookingSystemPrompt(shopLabel, courseNames, diveSiteNames, bookingPayload, nextStepHint, rentalEquipmentNames)
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...(history || []),
          { role: 'user' as const, content: message }
        ]
        pushActivity('booking_llm', formatBookingLlmActivityLine())
        const aiResponse = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: OPENAI_CHAT_MODEL,
            messages,
            max_completion_tokens: 1200
          })
        })
        if (!aiResponse.ok) {
          const errText = await aiResponse.text()
          console.error('[AI Search] Booking flow API error:', errText)
          throw new Error('Booking flow failed')
        }
        const aiData = await aiResponse.json()
        const aiMessage = aiData.choices[0]?.message?.content || ''
        const bookingReadyIdx = aiMessage.indexOf('BOOKING_READY:')
        if (bookingReadyIdx >= 0) {
          const braceStart = aiMessage.indexOf('{', bookingReadyIdx)
          if (braceStart >= 0) {
            let depth = 0
            let end = braceStart
            for (let i = braceStart; i < aiMessage.length; i++) {
              if (aiMessage[i] === '{') depth++
              else if (aiMessage[i] === '}') { depth--; if (depth === 0) { end = i; break } }
            }
            const jsonStr = aiMessage.slice(braceStart, end + 1)
            try {
              const raw = JSON.parse(jsonStr) as BookingPayload
              raw.shopId = raw.shopId || resolvedShop.id
              const payload = mergeCollectedIntoBookingPayload(
                bookingPayload as BookingPayloadLocal | undefined,
                raw as BookingPayloadLocal,
                {
                  shopCourseCount: courses.length,
                  shopDiveSiteCount: diveSites.length,
                  userMessage: message
                }
              ) as BookingPayload
              payload.shopId = payload.shopId || resolvedShop.id
              const gatedLlm = resolvePreSendWhenPayloadReady({
                payload: payload as BookingPayloadLocal,
                shopId: resolvedShop.id,
                shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
                hasAuthUser: !!authUser,
                timing: bookingSignupTiming
              })
              if (gatedLlm) return gatedLlm
            } catch (e) {
              console.error('[AI Search] BOOKING_READY parse error:', e)
            }
          }
        }
        let replyMessage = (bookingReadyIdx >= 0 ? aiMessage.slice(0, bookingReadyIdx) : aiMessage).trim() || aiMessage
        let collectedPayload: BookingPayload | undefined = bookingPayload ?? undefined
        const collectedIdx = aiMessage.indexOf('COLLECTED:')
        if (collectedIdx >= 0) {
          const braceStart = aiMessage.indexOf('{', collectedIdx)
          if (braceStart >= 0) {
            let depth = 0
            let end = braceStart
            for (let i = braceStart; i < aiMessage.length; i++) {
              if (aiMessage[i] === '{') depth++
              else if (aiMessage[i] === '}') { depth--; if (depth === 0) { end = i; break } }
            }
            try {
              const parsed = JSON.parse(aiMessage.slice(braceStart, end + 1)) as BookingPayload
              parsed.shopId = parsed.shopId || resolvedShop.id
              collectedPayload = mergeCollectedIntoBookingPayload(
                bookingPayload as BookingPayloadLocal | undefined,
                parsed as BookingPayloadLocal,
                {
                  shopCourseCount: courses.length,
                  shopDiveSiteCount: diveSites.length,
                  userMessage: message
                }
              ) as BookingPayload
              collectedPayload.shopId = collectedPayload.shopId || resolvedShop.id
              if (collectedPayload && getNextBookingStep(collectedPayload as BookingPayloadLocal)?.step === 'dates') {
                const dateResCollected = resolveTripDatesUserMessage(message.trim())
                if (dateResCollected.status === 'ok') {
                  const reparsed = dateResCollected.range
                  const days = inclusiveTripDays(reparsed.startDate, reparsed.endDate)
                  const base = { ...collectedPayload } as BookingPayload
                  delete base.pendingLongTripConfirmation
                  if (days > 21) {
                    collectedPayload = {
                      ...base,
                      startDate: undefined,
                      endDate: undefined,
                      pendingLongTripConfirmation: { startDate: reparsed.startDate, endDate: reparsed.endDate }
                    }
                  } else {
                    collectedPayload = applyParsedTripDatesToBookingPayload(
                      base as BookingPayloadLocal,
                      reparsed,
                      {
                        shopCourseCount: courses.length,
                        shopDiveSiteCount: diveSites.length,
                        userMessage: message,
                        history,
                        courses,
                        tripRequirements: effectiveTripReq
                      }
                    ) as BookingPayload
                  }
                  collectedPayload.shopId = collectedPayload.shopId || resolvedShop.id
                } else if (dateResCollected.status === 'clarify' || dateResCollected.status === 'past') {
                  collectedPayload = {
                    ...collectedPayload,
                    startDate: undefined,
                    endDate: undefined,
                    pendingLongTripConfirmation: undefined
                  }
                  collectedPayload.shopId = collectedPayload.shopId || resolvedShop.id
                }
              }
            } catch (e) {
              // ignore parse error, keep previous payload
            }
          }
        }
        // Strip every COLLECTED: {...} block from the visible reply so JSON never appears in chat
        while (replyMessage.includes('COLLECTED:')) {
          const inReply = replyMessage.indexOf('COLLECTED:')
          const replyBrace = replyMessage.indexOf('{', inReply)
          if (replyBrace >= 0) {
            let d = 0
            let replyEnd = replyBrace
            for (let i = replyBrace; i < replyMessage.length; i++) {
              if (replyMessage[i] === '{') d++
              else if (replyMessage[i] === '}') { d--; if (d === 0) { replyEnd = i; break } }
            }
            replyMessage = (replyMessage.slice(0, inReply) + replyMessage.slice(replyEnd + 1)).replace(/\n\n+/g, '\n').trim()
          } else break
        }
        // Also strip any raw {...} that looks like booking payload (LLM sometimes emits JSON without COLLECTED: prefix).
        // Use brace-matching that skips { } inside string literals so we don't cut mid-JSON.
        const findMatchingBrace = (s: string, start: number): number => {
          let d = 0
          let inString: '"' | "'" | null = null
          let escape = false
          for (let j = start; j < s.length; j++) {
            const c = s[j]
            if (escape) { escape = false; continue }
            if (c === '\\' && inString) { escape = true; continue }
            if (!inString) {
              if (c === '{') d++
              else if (c === '}') { d--; if (d === 0) return j }
              else if (c === '"' || c === "'") inString = c
            } else if (c === inString) inString = null
          }
          return -1
        }
        const payloadLike = /\b(shopId|shopid|numberOfDivers|startDate|endDate|"divers")\b/
        let prev = ''
        while (prev !== replyMessage) {
          prev = replyMessage
          let i = 0
          while (i < replyMessage.length) {
            const brace = replyMessage.indexOf('{', i)
            if (brace < 0) break
            const end = findMatchingBrace(replyMessage, brace)
            if (end < 0) { i = brace + 1; continue }
            const slice = replyMessage.slice(brace, end + 1)
            if (payloadLike.test(slice)) {
              replyMessage = (replyMessage.slice(0, brace) + replyMessage.slice(end + 1)).replace(/\n\n+/g, '\n').trim()
              i = 0
            } else {
              i = end + 1
            }
          }
        }
        // Fallback: LLM may emit JSON without outer braces — strip any trailing payload-like content so it never appears in chat
        const payloadKeyMatch = replyMessage.match(/"shopId"|"numberOfDivers"|"startDate"|"endDate"|"divers"\s*:/)
        if (payloadKeyMatch && payloadKeyMatch.index !== undefined) {
          const cut = payloadKeyMatch.index
          const lineStart = replyMessage.lastIndexOf('\n', cut - 1)
          const trimTo = lineStart >= 0 ? lineStart : cut
          replyMessage = replyMessage.slice(0, trimTo).replace(/\n+$/, '').trim()
        }
        const genericFallback = 'Got it — continuing with your booking. What\'s the next detail? (e.g. more gear, or Diver 2\'s name if you have more than one diver)'
        if (!replyMessage || !replyMessage.trim()) {
          replyMessage = genericFallback
        }
        const gearChips = rentalEquipment.length > 0 ? rentalEquipment : undefined
        // When showing gear chips, strip redundant listing from message (chips replace the equipment list and "please list items")
        if (gearChips) {
          replyMessage = replyMessage
            .replace(/\s*Available rentals at[^.]*\./gi, '')
            .replace(/\s*Please list items[^.]*\.?/gi, '')
            .replace(/\s*Tell me which items[^.]*\.?/gi, '')
            .replace(/\s*Which of these (does|should)[^.]*\.?/gi, '')
            .replace(/\s*\(or reply\s*["']none["']\)\.?/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim()
        }
        const courseChips = courses.length > 0 ? courses : undefined
        if (courseChips && messageAsksForCourses(replyMessage)) {
          replyMessage = replyMessage
            .replace(/\s*(Our )?available courses are:[^.]*\./gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim()
        }
        const diveSiteChips = diveSites.length > 0 ? diveSites : undefined
        // When showing dive site chips, strip redundant listing of site names from message (chips already show them)
        if (diveSiteChips && messageAsksForDiveSites(replyMessage)) {
          replyMessage = replyMessage
            .replace(/\s*(Our )?available sites are:[^.]*\./gi, '')
            .replace(/\s*You can pick (one or several|from):[^.]*\.?/gi, '')
            .replace(/\s*, or just say ["']any["'][^.]*\.?/gi, '')
            .replace(/\s*— or just say ["']any["'][^.]*\.?/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim()
        }
        const willShowCourseOptions = collectedPayload ? addCourseOptions(collectedPayload) : undefined
        if (willShowCourseOptions && replyMessage === genericFallback) {
          const cp = collectedPayload ?? bookingPayload
          replyMessage = bookingCoursesStepMessage(cp)
        }
        // If we're showing dive site chips but the message is still the generic fallback (e.g. AI reply was stripped to empty), show context
        const willShowDiveSiteOptions = collectedPayload ? addDiveSiteOptions(collectedPayload) : undefined
        if (willShowDiveSiteOptions && replyMessage === genericFallback && !willShowCourseOptions) {
          replyMessage = bookingDiveSitesStepMessage((collectedPayload ?? bookingPayload) ?? {})
        }
        // Same for gear: if canonical next step is gear and message was stripped to generic fallback, ask for rental gear
        const mergedForGearUi = (collectedPayload ?? bookingPayload) as BookingPayload | undefined
        const gearOptionsFromStep = mergedForGearUi ? addGearOptions(mergedForGearUi) : undefined
        if (gearOptionsFromStep && replyMessage === genericFallback) {
          const numDivers = Math.max(1, mergedForGearUi?.numberOfDivers ?? 1)
          const divers = mergedForGearUi?.divers ?? []
          const idx = getNextBookingStep(mergedForGearUi as BookingPayloadLocal)?.diverIndex ?? numDivers - 1
          const nm = divers[idx]?.name?.trim() || `Diver ${idx + 1}`
          replyMessage = bookingGearStepMessage(nm)
        }
        const finalGearOptions = gearOptionsFromStep
        const mergedForDiverChips = (collectedPayload ?? bookingPayload) ?? ({} as BookingPayloadLocal)
        const nextHintDiverChips = getNextBookingStep(mergedForDiverChips)
        const profileDiverOptionsFromLlm =
          nextHintDiverChips?.step === 'diverName' &&
          (nextHintDiverChips.diverIndex ?? 0) >= 1 &&
          profilePrefill
            ? profileDiverSelectableChipsFromPrefill(profilePrefill, { bookingPayload: mergedForDiverChips })
            : undefined
        if (profileDiverOptionsFromLlm?.length && nextHintDiverChips?.diverIndex != null) {
          const diverNum = nextHintDiverChips.diverIndex + 1
          replyMessage = `Use an existing diver from your profile or create a new one for Diver ${diverNum}?`
        }
        const mergedForClientUi = (collectedPayload ?? bookingPayload) as BookingPayload | undefined
        const nextForClientUi = mergedForClientUi ? getNextBookingStep(mergedForClientUi as BookingPayloadLocal) : null
        const orchestratorBubbles =
          nextForClientUi && mergedForClientUi
            ? orchestratorSplitBookingCopyForStep(nextForClientUi, mergedForClientUi, {
                shopCourseCount: courses.length,
                shopDiveSiteCount: diveSites.length
              })
            : null
        const messageForClient = orchestratorBubbles ? orchestratorBubbles.message : replyMessage
        const messagePreambleForClient = orchestratorBubbles?.messagePreamble
        return withAgentMeta({
          success: true,
          intent: 'booking' as const,
          bookingReady: false,
          message: messageForClient,
          ...(messagePreambleForClient ? { messagePreamble: messagePreambleForClient } : {}),
          shopId: resolvedShop.id,
          shopName: shopLabel,
            shopLocation: shopClient.shopLocation,
            shopDisplayName: shopClient.shopDisplayName,
          bookingPayload: collectedPayload,
          selectableOptions: profileDiverOptionsFromLlm?.length ? profileDiverOptionsFromLlm : undefined,
          rentalEquipmentOptions: finalGearOptions?.length ? finalGearOptions : undefined,
          hideNoneForGear: hideNoneForGear(collectedPayload ?? bookingPayload),
          courseOptions: collectedPayload ? addCourseOptions(collectedPayload) : undefined,
          diveSiteOptions: collectedPayload ? addDiveSiteOptions(collectedPayload) : undefined
        })
      }

      // --- Search flow (existing) ---
      // Course / certification follow-up: show aggregated course chips for the current search area (not another shop page).
      if (supabaseUrl && supabaseKey && isCourseDiscoveryFollowUpMessage(message.trim())) {
        const normalizedForCourses = normalizeClientSearchFilters(bodyLastSearchFilters)
        if (
          normalizedForCourses &&
          (normalizedForCourses.country?.trim() ||
            normalizedForCourses.place?.trim() ||
            normalizedForCourses.region?.trim())
        ) {
          const coursePayload = await tryBuildCourseDiscoverySearchResponse(
            message,
            normalizedForCourses,
            supabaseUrl,
            supabaseKey
          )
          return withAgentMeta({ ...coursePayload, intent: 'search' as const })
        }
      }

      // Check if user is asking for more results (pagination) or first page after a count-only reply
      const isPaginationRequest = isSearchPaginationUserMessage(message)
      const paginationPageSize = /\b(show next 20|load next 20|next 20)\b/i.test(message) ? 20 : SEARCH_PAGINATION_PAGE_SIZE_DEFAULT
    
      if (isPaginationRequest && history && history.length > 0) {
        console.log(`[AI Search] Pagination request detected: "${message}"`)
        const alreadyShown = inferAlreadyShownForPagination(history, shopsAlreadyShownCount)
        const normalizedFromClient = normalizeClientSearchFilters(bodyLastSearchFilters)

        if (supabaseUrl && supabaseKey && normalizedFromClient != null) {
          try {
            const fetched = await fetchSearchShopsWithSparseWiden(
              supabaseUrl,
              supabaseKey,
              normalizedFromClient
            )
            if (fetched.error) {
              console.error('[AI Search] Pagination shop fetch error:', fetched.error)
            } else {
              const cappedShops = capSparseWidenShopList(
                fetched.shops,
                buildSearchMatchContext(normalizedFromClient)
              )
              const resultCount = cappedShops.length
              const { page: nextShops } = sliceSearchShopPage(
                cappedShops,
                alreadyShown,
                paginationPageSize
              )
              console.log(
                `[AI Search] Pagination: offset=${alreadyShown} rows=${nextShops.length} total=${resultCount} widened=${fetched.widenedTripType}`
              )
              return await finalizeSearchPaginationApiResponse(
                supabaseUrl,
                supabaseKey,
                message,
                interpretTurn,
                normalizedFromClient,
                nextShops,
                resultCount,
                alreadyShown,
                paginationPageSize
              )
            }
          } catch (fastPathErr) {
            console.error('[AI Search] Pagination client-filters path error:', fastPathErr)
          }
        }

        // Reconstruct filters via LLM when the client did not echo last search state (older clients / edge cases).
        let lastFilters: SearchFilters = {}
        const conversationContext = history.map(h => h.content).join(' ')

        const filterExtractionPrompt = `Extract search filters from this conversation history. The user is asking to see dive shops from the same search (more results, next page, or listing shops from the last search), so just return the filters that were used in the previous search.

  Conversation history: ${conversationContext}

  Return ONLY the filters in this exact format:
  FILTERS: {
    "country": "string or null",
    "place": "string or null", 
    "region": "string or null",
    "minRating": number or null,
    "languages": ["array", "of", "languages"] or null,
    "diveTypes": ["Liveaboard"] or ["Dive Resort"] or ["Dive Shop"] or null
  }

  Do not include a MESSAGE. Just return the FILTERS.`

        if (!chatAiOff) {
        try {
          const filterResponse = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: OPENAI_CHAT_MODEL,
              messages: [
                { role: 'system', content: 'You extract search filters from conversations. Return only FILTERS in the specified format.' },
                { role: 'user', content: filterExtractionPrompt }
              ],
              max_completion_tokens: 200
            })
          })

          if (filterResponse.ok) {
            const filterData = await filterResponse.json()
            const filterMessage = filterData.choices[0]?.message?.content || ''
            const filtersMatch = filterMessage.match(/FILTERS:\s*(\{[^}]+\})/s)

            if (filtersMatch) {
              lastFilters = JSON.parse(filtersMatch[1])
              console.log('[AI Search] Extracted filters for pagination (LLM):', lastFilters)

              const fetched = await fetchSearchShopsWithSparseWiden(supabaseUrl, supabaseKey, lastFilters)
              if (fetched.error) {
                console.error('Database error during pagination:', fetched.error)
                throw new Error('Failed to fetch more results')
              }

              const cappedShops = capSparseWidenShopList(
                fetched.shops,
                buildSearchMatchContext(lastFilters)
              )
              const resultCount = cappedShops.length
              const { page: nextShops } = sliceSearchShopPage(
                cappedShops,
                alreadyShown,
                paginationPageSize
              )
              console.log(`[AI Search] Pagination (LLM): already shown ${alreadyShown} shops, total results: ${resultCount}, pageSize: ${paginationPageSize}`)
              return await finalizeSearchPaginationApiResponse(
                supabaseUrl,
                supabaseKey,
                message,
                interpretTurn,
                lastFilters,
                nextShops,
                resultCount,
                alreadyShown,
                paginationPageSize
              )
            }
          }
        } catch (paginationError) {
          console.error('[AI Search] Error handling pagination:', paginationError)
          // Fall through to normal processing
        }
        }
        if (chatAiOff && isPaginationRequest) {
          return withAgentMeta({
            success: true,
            intent: 'search' as const,
            message:
              'Pagination without echoed filters needs the legacy search AI, which is off. Use guided search or scroll earlier results.',
            shops: [],
            totalResults: 0,
            hasMoreResults: false,
            filters: {} as SearchFilters,
            selectableOptions: [{ label: 'Start over (guided)', value: GuidedCommands.reset }]
          })
        }
      }

      // Booking intent but no shop resolved — do not run trip-type or generic search
      if (effectiveWantsToBook && !continuingBooking && !resolvedShop && !clarifyChoice) {
        const pickFromRecent = shopDisambiguationSelectableOptions((lastShops || []).slice(0, 8))
        return withAgentMeta({
          success: true,
          intent: 'search' as const,
          message: pickFromRecent.length
            ? `Which dive shop do you want to book? Pick one below or say the full name (e.g. "Let's book at [shop name]").`
            : `Which dive shop do you want to book? Say the full shop name, or run a search first and pick from the list.`,
          shops: [],
          totalResults: 0,
          hasMoreResults: false,
          filters: {} as SearchFilters,
          selectableOptions: pickFromRecent.length ? pickFromRecent : undefined
        })
      }

      if (chatAiOff) {
        return withAgentMeta({
          success: true,
          intent: 'search' as const,
          message:
            'Free-form search and trip-type assistant are turned off. Use chip-based guided search or pick a shop and use Start booking / the booking form.',
          shops: [],
          totalResults: 0,
          hasMoreResults: false,
          filters: {} as SearchFilters,
          selectableOptions: [{ label: 'Start over (guided)', value: GuidedCommands.reset }]
        })
      }

      const nluActivityForHint = normalizeActivityTerms(interpretTurn?.activity_terms)

      let nluHint = ''
      if (interpretTurn?.destination_text?.trim()) {
        nluHint += `\n\n[System hint for FILTERS: the user mentioned this place — ${interpretTurn.destination_text.trim()}]`
      }
      if (nluActivityForHint.length > 0) {
        nluHint += `\n\n[System hint for FILTERS: match dive style / environment — ${nluActivityForHint.join(', ')}]`
      }
      const effectiveCertForNlu = resolveEffectiveCertificationCourseHint(message, interpretTurn ?? null)
      if (effectiveCertForNlu?.trim()) {
        nluHint +=
          `\n\n[System hint: user wants shops that offer a certification/course matching — ${effectiveCertForNlu.trim()}]`
      }
      if (interpretTurn?.dive_site_type_label?.trim()) {
        nluHint +=
          `\n\n[System hint for FILTERS: dive site / environment preference — ${interpretTurn.dive_site_type_label.trim()}]`
      }
      if (interpretTurn?.trip_product_type) {
        const dt =
          interpretTurn.trip_product_type === 'liveaboard'
            ? 'Liveaboard'
            : interpretTurn.trip_product_type === 'dive_resort'
              ? 'Dive Resort'
              : 'Dive Shop'
        nluHint += `\n\n[System hint for FILTERS: set diveTypes to ["${dt}"] if not already set]`
      }
      const userMessageForSearch = message + nluHint

      // Build conversation history for the AI
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(history || []),
        { role: 'user', content: userMessageForSearch }
      ]

      pushActivity('search_llm', formatSearchLlmActivityLine())
      const aiResponse = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: OPENAI_CHAT_MODEL,
          messages,
          max_completion_tokens: 1000
        })
      })

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text()
        console.error('OpenAI API error:', errorText)
        throw new Error(`OpenAI API error: ${aiResponse.statusText}`)
      }

      const aiData = await aiResponse.json()
      const aiMessage = aiData.choices[0]?.message?.content || ''
      console.log(`[AI Search] Raw AI response:`, aiMessage)

      const searchResult = await runTripTypeSearchAfterLlm({
        message,
        history: history || [],
        aiMessage,
        openaiApiKey,
        supabaseUrl,
        supabaseKey,
        shopsAlreadyShownCount,
        onStatus: onActivityLine,
        interpretTurn,
        aiSearchFirst,
        signal: searchAbortSignal,
        lastSearchFilters: normalizeClientSearchFilters(bodyLastSearchFilters) ?? undefined
      })
      activeTripRequirements = tripRequirementsAfterSearchTurn(
        activeTripRequirements,
        searchResult.filters,
        interpretTurn
      )
      return withAgentMeta({
        ...searchResult,
        tripRequirements: activeTripRequirements
      })
    }, {
      maxAttempts: 4,
      baseDelayMs: 280,
      onRetry: ({ attempt, maxAttempts, error }) => {
        console.warn(`[AI Search] attempt ${attempt}/${maxAttempts} failed, retrying:`, error)
      }
    })

  } catch (error: any) {
    console.error('AI Search error:', error)
    return {
      success: false,
      message: error.message || 'An error occurred while searching',
      shops: [],
      totalResults: 0,
      hasMoreResults: false,
      filters: {},
      selectableOptions: undefined
    }
  }
}

