/**
 * pythonAgentsClient.ts
 *
 * Thin fetch-based client for the Python AI-agents service
 * (python-agents/main.py).  The TypeScript orchestrator calls these helpers
 * instead of calling OpenAI directly; all Supabase data-fetching stays here in
 * the TypeScript layer.
 *
 * Configure the base URL via:
 *   NUXT_PYTHON_AGENTS_URL  (runtimeConfig.pythonAgentsUrl)
 *   or PYTHON_AGENTS_URL environment variable
 * Defaults to http://localhost:8001 for local dev.
 */

// ── Types mirrored from python-agents/models/ ───────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// --- NLU ---

export interface NluRequest {
  message: string
  history?: ChatMessage[]
}

export interface InterpretedTurnFromPython {
  goal: 'search_shops' | 'start_booking' | 'continue' | 'shop_info' | 'unclear'
  destination_text?: string | null
  shop_name_hint?: string | null
  activity_terms?: string[] | null
  certification_course_hint?: string | null
  dive_site_type_label?: string | null
  trip_product_type?: 'liveaboard' | 'dive_resort' | 'dive_shop' | null
  wants_booking?: boolean
  booking_readiness?: number | null
  primary_verb?: 'browse' | 'book' | 'neutral' | null
  reasoning_summary?: string | null
  confidence?: number
}

export interface NluResponse {
  ok: boolean
  data?: InterpretedTurnFromPython
  error?: string
}

// --- Search ---

export interface SearchAgentRequest {
  message: string
  history?: ChatMessage[]
}

export interface SearchFiltersFromPython {
  country?: string | null
  place?: string | null
  region?: string | null
  minRating?: number | null
  languages?: string[] | null
  diveTypes?: string[] | null
}

export interface SearchAgentResponse {
  ok: boolean
  filters?: SearchFiltersFromPython
  message?: string
  error?: string
}

// --- Booking ---

export interface BookingAgentRequest {
  message: string
  history?: ChatMessage[]
  shopName: string
  courseNames?: string[]
  diveSiteNames?: string[]
  rentalEquipmentNames?: string[]
  existingPayload?: Record<string, unknown> | null
  nextStepHint?: { step: string; diverIndex?: number; diverName?: string } | null
}

export interface BookingAgentResponse {
  ok: boolean
  reply?: string
  collectedPayload?: Record<string, unknown> | null
  bookingReady: boolean
  finalPayload?: Record<string, unknown> | null
  error?: string
}

// --- Orchestrator ---

export interface OrchestratorRequest {
  message: string
  history?: ChatMessage[]
  wantsBooking?: boolean
  regexReferent?: string | null
  preferShopOrRegexOverDestination?: boolean
  baseFilters?: Record<string, unknown> | null
  runSearchAgent?: boolean
  runBookingAgent?: boolean
  bookingRequest?: BookingAgentRequest | null
  autoAgentRouting?: boolean
  runDbProbe?: boolean
  runDbSearch?: boolean
  selectedShopId?: string | null
}

export interface BookingReadinessFromPython {
  score: number
  primaryVerb: 'browse' | 'book' | 'neutral' | string
  effectiveWantsToBook: boolean
}

export interface OrchestratorResponse {
  ok: boolean
  nluOk: boolean
  nluError?: string | null
  interpretTurn: InterpretedTurnFromPython
  bookingReadiness: BookingReadinessFromPython
  referentPhrase?: string | null
  mergedFilters: SearchFiltersFromPython & { activityTokens?: string[] | null }
  activityLog: string[]
  agentCall: 'search' | 'booking' | 'none'
  search?: SearchAgentResponse | null
  booking?: BookingAgentResponse | null
  dbProbe?: Record<string, unknown> | null
  dbSearch?: Record<string, unknown> | null
  selectedShop?: Record<string, unknown> | null
}

// ── Client implementation ────────────────────────────────────────────────────

function getAgentsBaseUrl (): string {
  return (
    process.env.NUXT_PYTHON_AGENTS_URL ||
    process.env.PYTHON_AGENTS_URL ||
    'http://localhost:8001'
  )
}

async function postAgent<Req, Res> (path: string, body: Req, signal?: AbortSignal): Promise<Res> {
  const url = `${getAgentsBaseUrl()}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Python agents ${path} HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<Res>
}

/**
 * Call the NLU agent to extract structured intent from a user message.
 * Drop-in replacement for interpretUserTurn() in interpretUserTurn.ts.
 */
export async function callNluAgent (
  req: NluRequest,
  signal?: AbortSignal
): Promise<NluResponse> {
  try {
    return await postAgent<NluRequest, NluResponse>('/agents/nlu', req, signal)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Call the search-filter agent to extract Supabase-ready filters from free text.
 * The returned SearchFiltersFromPython maps directly to SearchFilters used by
 * buildDiveShopQuery().
 */
export async function callSearchAgent (
  req: SearchAgentRequest,
  signal?: AbortSignal
): Promise<SearchAgentResponse> {
  try {
    return await postAgent<SearchAgentRequest, SearchAgentResponse>('/agents/search', req, signal)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Call the booking assistant agent for one conversational turn.
 * Returns the reply text + updated COLLECTED payload.
 * When bookingReady=true, finalPayload contains the complete booking object
 * ready to POST to /api/booking.
 */
export async function callBookingAgent (
  req: BookingAgentRequest,
  signal?: AbortSignal
): Promise<BookingAgentResponse> {
  try {
    return await postAgent<BookingAgentRequest, BookingAgentResponse>('/agents/booking', req, signal)
  } catch (e) {
    return { ok: false, bookingReady: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Call the Python orchestrator endpoint for a single routed turn.
 */
export async function callOrchestratorAgent (
  req: OrchestratorRequest,
  signal?: AbortSignal
): Promise<OrchestratorResponse> {
  try {
    return await postAgent<OrchestratorRequest, OrchestratorResponse>('/agents/orchestrator', req, signal)
  } catch (e) {
    return {
      ok: false,
      nluOk: false,
      nluError: e instanceof Error ? e.message : String(e),
      interpretTurn: { goal: 'unclear' },
      bookingReadiness: { score: 1, primaryVerb: 'neutral', effectiveWantsToBook: false },
      mergedFilters: {},
      activityLog: [`orchestrator_error: ${e instanceof Error ? e.message : String(e)}`],
      agentCall: 'none'
    }
  }
}

