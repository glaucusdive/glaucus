import { createClient } from '@supabase/supabase-js'
import type { GuidedSearchState } from '../../shared/guidedFlow'
import {
  GuidedCommands,
  GUIDED_COURSE_CHIPS,
  GUIDED_SITE_TYPE_CHIPS,
  POPULAR_DESTINATION_KEYS,
  applyGuidedSearchCommandPure,
  filtersConstrainGuidedShops,
  guidedNeedsCombinedQuery,
  guidedPostResultsFilterChips,
  initialGuidedSearchState,
  isBookingHandoffUserMessage,
  parseGuidedCourse,
  parseGuidedDest,
  parseGuidedSiteType
} from '../../shared/guidedFlow'
import { buildDiveShopQuery, type SearchFilters } from './buildDiveShopQuery'
import { formatEntitySearchResponse } from './entityRouting'
import { listShopsMatchingName } from './resolveShop'
import { isSearchPaginationUserMessage } from '../../app/utils/searchPaginationIntent'
import { normalizeClientSearchFilters } from './normalizeClientSearchFilters'

export interface GuidedFlowRequestBody {
  guidedSearchState?: GuidedSearchState | null
  message: string
  shopsAlreadyShownCount?: number
  lastSearchFilters?: Record<string, unknown>
  lastSearchTotalResults?: number
}

export interface GuidedFlowSearchResponse {
  success: true
  intent: 'search'
  message: string
  shops: unknown[]
  totalResults: number
  hasMoreResults: boolean
  filters: SearchFilters
  selectableOptions?: { label: string; value: string }[]
  guidedSearchState: GuidedSearchState
  openShopId?: string
  /** Client merges into booking when user starts booking from guided search */
  bookingHints?: { desiredCourses?: string[]; diveSiteTypeLabel?: string | null }
  activityLog?: { stage: string; label: string; at: number }[]
}

function toSearchFilters (f: GuidedSearchState['filters']): SearchFilters {
  return { ...f }
}

function tripTypeChips (): { label: string; value: string }[] {
  return [
    { label: 'Any trip type', value: GuidedCommands.tripAny },
    { label: 'Dive Shop / Day Trip', value: GuidedCommands.tripDiveShop },
    { label: 'Liveaboard', value: GuidedCommands.tripLiveaboard },
    { label: 'Resort', value: GuidedCommands.tripResort }
  ]
}

function branchChips (): { label: string; value: string }[] {
  return [
    { label: 'By location', value: GuidedCommands.branchLocation },
    { label: 'By certification course', value: GuidedCommands.branchCourse },
    { label: 'By dive site type', value: GuidedCommands.branchSiteType },
    { label: 'By business name', value: GuidedCommands.branchName }
  ]
}

function destChips (): { label: string; value: string }[] {
  return POPULAR_DESTINATION_KEYS.map(d => ({
    label: d.label,
    value: `${GuidedCommands.destPrefix}${d.key}`
  }))
}

/** Readable place name for empty-result copy (chip vs typed text). */
function userPlaceLabelForEmptyMessage (rawMsg: string): string {
  const t = rawMsg.trim()
  if (t.toLowerCase().startsWith(GuidedCommands.destPrefix.toLowerCase())) {
    const key = t.slice(GuidedCommands.destPrefix.length).toLowerCase()
    const row = POPULAR_DESTINATION_KEYS.find(d => d.key === key)
    return row?.label ?? t
  }
  return t || 'that place'
}

/**
 * User was on the location destination step, picked/chtyped a place, and got zero shops — stay in the mini-flow
 * with popular destinations + free text (no extra "Change location" click).
 */
function emptySearchReopenLocationPicker (params: {
  state: GuidedSearchState
  rawMsg: string
  activityLog: GuidedFlowSearchResponse['activityLog']
  bookingHints?: GuidedFlowSearchResponse['bookingHints']
}): GuidedFlowSearchResponse {
  const { state, rawMsg, activityLog, bookingHints } = params
  const nextFilters = { ...state.filters }
  delete nextFilters.locale
  delete nextFilters.country
  delete nextFilters.region
  const nextState: GuidedSearchState = {
    ...state,
    step: 'location_destination',
    filters: nextFilters
  }
  const label = userPlaceLabelForEmptyMessage(rawMsg)
  return {
    success: true,
    intent: 'search',
    message: `No dive businesses matched “${label}” for your filters. Pick a popular place below or type another city or country.`,
    shops: [],
    totalResults: 0,
    hasMoreResults: false,
    filters: toSearchFilters(nextFilters),
    selectableOptions: [...destChips(), { label: 'Start over', value: GuidedCommands.reset }],
    guidedSearchState: nextState,
    bookingHints,
    activityLog
  }
}

function courseChips (): { label: string; value: string }[] {
  return GUIDED_COURSE_CHIPS.map(c => ({
    label: c.label,
    value: `${GuidedCommands.coursePrefix}${encodeURIComponent(c.search)}`
  }))
}

function siteTypeChips (): { label: string; value: string }[] {
  return GUIDED_SITE_TYPE_CHIPS.map(c => ({
    label: c.label,
    value: `${GuidedCommands.siteTypePrefix}${c.activityToken}`
  }))
}

async function shopIdsForCourseSearch (
  supabaseUrl: string,
  supabaseKey: string,
  searchTerm: string
): Promise<string[]> {
  const client = createClient(supabaseUrl, supabaseKey)
  const pattern = `%${searchTerm.replace(/%/g, '').trim()}%`
  const { data: courses, error } = await client
    .from('courses')
    .select('id')
    .ilike('certification_name', pattern)
    .limit(40)
  if (error || !courses?.length) return []
  const ids = [...new Set(courses.map((c: { id: string }) => c.id).filter(Boolean))]
  if (!ids.length) return []
  const { data: junction } = await client
    .from('diveshop_courses')
    .select('diveshop_id')
    .in('course_id', ids)
  if (!junction?.length) return []
  return [...new Set((junction as { diveshop_id: string }[]).map(j => j.diveshop_id).filter(Boolean))]
}

async function runCourseBranchQuery (
  supabaseUrl: string,
  supabaseKey: string,
  courseSearch: string
): Promise<{ shops: unknown[]; total: number }> {
  const shopIds = await shopIdsForCourseSearch(supabaseUrl, supabaseKey, courseSearch)
  if (!shopIds.length) return { shops: [], total: 0 }
  const client = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await client
    .from('diveshops')
    .select('*, country:countries(name), region:regions(name)')
    .in('id', shopIds.slice(0, 80))
    .order('google_rating', { ascending: false, nullsFirst: false })
    .order('business_name', { ascending: true })
    .limit(50)
  if (error || !data) return { shops: [], total: 0 }
  const list = data as unknown[]
  return { shops: list, total: list.length }
}

function intersectIdLists (lists: string[][]): string[] {
  const nonEmpty = lists.filter(l => l.length > 0)
  if (!nonEmpty.length) return []
  const sorted = [...nonEmpty].sort((a, b) => a.length - b.length)
  let out = [...new Set(sorted[0]!)]
  for (let i = 1; i < sorted.length; i++) {
    const s = new Set(sorted[i]!)
    out = out.filter(id => s.has(id))
  }
  return out
}

function shopRowSortKey (row: Record<string, unknown>): { r: number; n: string } {
  const gr = row.google_rating
  const r = typeof gr === 'number' ? gr : -1
  const n = String(row.business_name ?? '')
  return { r, n }
}

async function fetchShopsFullRowsByIds (
  supabaseUrl: string,
  supabaseKey: string,
  ids: string[]
): Promise<unknown[]> {
  if (!ids.length) return []
  const client = createClient(supabaseUrl, supabaseKey)
  const chunk = 80
  const rows: unknown[] = []
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk)
    const { data, error } = await client
      .from('diveshops')
      .select('*, country:countries(name), region:regions(name)')
      .in('id', slice)
    if (!error && data?.length) rows.push(...(data as unknown[]))
  }
  return (rows as Record<string, unknown>[]).sort((a, b) => {
    const A = shopRowSortKey(a)
    const B = shopRowSortKey(b)
    if (B.r !== A.r) return B.r - A.r
    return A.n.localeCompare(B.n)
  })
}

/**
 * Intersect course junction IDs, `buildDiveShopQuery` shop rows, and/or name matches; then load full rows sorted like search.
 */
async function runGuidedCombinedResultsQuery (
  supabaseUrl: string,
  supabaseKey: string,
  state: GuidedSearchState
): Promise<{ shops: unknown[]; total: number; filters: SearchFilters }> {
  const filters = toSearchFilters(state.filters)
  const empty = (): { shops: unknown[]; total: number; filters: SearchFilters } => ({
    shops: [],
    total: 0,
    filters
  })
  try {
    const lists: string[][] = []

    if (state.courseIntent?.trim()) {
      const cids = await shopIdsForCourseSearch(supabaseUrl, supabaseKey, state.courseIntent.trim())
      if (!cids.length) return empty()
      lists.push(cids)
    }
    if (filtersConstrainGuidedShops(state.filters)) {
      const { data, error } = await buildDiveShopQuery(supabaseUrl, supabaseKey, filters, null, {
        defaultLimit: 500
      })
      if (error) {
        console.error('[guided] buildDiveShopQuery in combined search:', error)
        return empty()
      }
      const shopIds = ((data || []) as { id: string }[]).map(r => r.id).filter(Boolean)
      if (!shopIds.length) return empty()
      lists.push(shopIds)
    }
    if (state.nameQuery?.trim()) {
      const matches = await listShopsMatchingName(
        supabaseUrl,
        supabaseKey,
        state.nameQuery.trim(),
        300
      )
      if (!matches.length) return empty()
      lists.push(matches.map(m => m.id).filter(Boolean))
    }

    const idOrder = intersectIdLists(lists)
    const capped = idOrder.slice(0, 500)
    const shops = await fetchShopsFullRowsByIds(supabaseUrl, supabaseKey, capped)
    return { shops, total: shops.length, filters }
  } catch (err) {
    console.error('[guided] runGuidedCombinedResultsQuery:', err)
    return empty()
  }
}

function guidedResultsSelectableOptions (
  state: GuidedSearchState,
  formatted: ReturnType<typeof formatEntitySearchResponse>
): { label: string; value: string }[] {
  return [
    ...(formatted.selectableOptions || []),
    ...guidedPostResultsFilterChips(state),
    { label: 'New search', value: GuidedCommands.reset }
  ]
}

function guidedPaginationSelectableOptions (
  state: GuidedSearchState,
  hasMore: boolean
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = []
  if (hasMore) out.push({ label: 'Load next 5', value: 'Show more' })
  out.push(...guidedPostResultsFilterChips(state))
  out.push({ label: 'New search', value: GuidedCommands.reset })
  return out
}

function mergeGuidedState (incoming: GuidedSearchState | null | undefined): GuidedSearchState {
  const base = initialGuidedSearchState()
  if (!incoming || typeof incoming !== 'object') return base
  return {
    step: incoming.step ?? base.step,
    branch: incoming.branch ?? null,
    filters: incoming.filters && typeof incoming.filters === 'object' ? { ...incoming.filters } : {},
    courseIntent: incoming.courseIntent ?? null,
    diveSiteTypeLabel: incoming.diveSiteTypeLabel ?? null,
    nameQuery: incoming.nameQuery ?? null
  }
}

export async function runGuidedSearchTurn (
  body: GuidedFlowRequestBody,
  supabaseUrl: string,
  supabaseKey: string
): Promise<GuidedFlowSearchResponse | { success: false; message: string }> {
  const activityLog: { stage: string; label: string; at: number }[] = []
  const pushLog = (stage: string, label: string) => {
    activityLog.push({ stage, label, at: Date.now() })
  }

  let state = mergeGuidedState(body.guidedSearchState)
  const rawMsg = String(body.message || '').trim()
  /** Captured before location_destination merges into `results` — used to reopen the place picker on zero hits. */
  const priorStepWasLocationDestination = state.step === 'location_destination'

  if (isBookingHandoffUserMessage(rawMsg)) {
    return {
      success: false,
      message: 'This phrase starts booking and is not handled by guided search.'
    }
  }

  const pagination =
    isSearchPaginationUserMessage(rawMsg) &&
    state.step === 'results' &&
    (Object.keys(state.filters).length > 0 || state.branch === 'name' || state.branch === 'course')

  if (pagination) {
    pushLog('pagination', 'Loading more results')
    const normalized = normalizeClientSearchFilters(body.lastSearchFilters ?? state.filters)
    const filters = normalized ?? toSearchFilters(state.filters)
    const clientTotal =
      typeof body.lastSearchTotalResults === 'number' &&
      Number.isFinite(body.lastSearchTotalResults) &&
      body.lastSearchTotalResults >= 1
        ? Math.floor(body.lastSearchTotalResults)
        : null
    const alreadyShown = Math.max(0, body.shopsAlreadyShownCount ?? 0)
    const pageSize = /\b(show next 20|load next 20|next 20)\b/i.test(rawMsg) ? 20 : 5

    if (guidedNeedsCombinedQuery(state)) {
      const { shops: allShops, total, filters: combinedFilters } = await runGuidedCombinedResultsQuery(
        supabaseUrl,
        supabaseKey,
        state
      )
      const effectiveTotal = clientTotal ?? total
      if (alreadyShown >= effectiveTotal) {
        const empty = formatEntitySearchResponse(combinedFilters, [], 'No more results for this search.')
        return {
          success: true,
          intent: 'search',
          ...empty,
          guidedSearchState: state,
          activityLog,
          selectableOptions: guidedPaginationSelectableOptions(state, false)
        }
      }
      const slice = allShops.slice(alreadyShown, alreadyShown + pageSize)
      const remaining = Math.max(0, effectiveTotal - alreadyShown - slice.length)
      const formatted = formatEntitySearchResponse(
        combinedFilters,
        slice,
        remaining > 0 ? 'Here are more dive businesses matching your filters.' : 'Here are the remaining dive businesses matching your filters.'
      )
      const bookingHints: GuidedFlowSearchResponse['bookingHints'] =
        state.courseIntent?.trim() || state.diveSiteTypeLabel
          ? {
              desiredCourses: state.courseIntent?.trim() ? [state.courseIntent.trim()] : undefined,
              diveSiteTypeLabel: state.diveSiteTypeLabel ?? null
            }
          : undefined
      return {
        success: true,
        intent: 'search',
        message: formatted.message,
        shops: formatted.shops,
        totalResults: effectiveTotal,
        hasMoreResults: remaining > 0,
        filters: combinedFilters,
        selectableOptions: guidedPaginationSelectableOptions(state, remaining > 0),
        guidedSearchState: state,
        bookingHints,
        activityLog
      }
    }

    if (state.branch === 'course' && state.courseIntent) {
      const { shops: allShops, total } = await runCourseBranchQuery(supabaseUrl, supabaseKey, state.courseIntent)
      const effectiveTotal = clientTotal ?? total
      if (alreadyShown >= effectiveTotal) {
        const empty = formatEntitySearchResponse(filters, [], 'No more results for this search.')
        return {
          success: true,
          intent: 'search',
          ...empty,
          guidedSearchState: state,
          activityLog,
          selectableOptions: guidedPaginationSelectableOptions(state, false),
          bookingHints: { desiredCourses: [state.courseIntent!], diveSiteTypeLabel: null }
        }
      }
      const slice = allShops.slice(alreadyShown, alreadyShown + pageSize)
      const remaining = Math.max(0, effectiveTotal - alreadyShown - slice.length)
      const formatted = formatEntitySearchResponse(
        filters,
        slice,
        remaining > 0
          ? `Here are more dive businesses for “${state.courseIntent}”.`
          : `Here are the remaining dive businesses for “${state.courseIntent}”.`
      )
      return {
        success: true,
        intent: 'search',
        message: formatted.message,
        shops: formatted.shops,
        totalResults: effectiveTotal,
        hasMoreResults: remaining > 0,
        filters,
        selectableOptions: guidedPaginationSelectableOptions(state, remaining > 0),
        guidedSearchState: state,
        activityLog,
        bookingHints: { desiredCourses: [state.courseIntent], diveSiteTypeLabel: null }
      }
    }

    if (state.branch === 'name' && state.nameQuery) {
      const matches = await listShopsMatchingName(supabaseUrl, supabaseKey, state.nameQuery, 50)
      const total = matches.length
      if (clientTotal != null && alreadyShown >= clientTotal) {
        const empty = formatEntitySearchResponse(filters, [], 'No more results for this search.')
        return {
          success: true,
          intent: 'search',
          ...empty,
          guidedSearchState: state,
          activityLog,
          selectableOptions: guidedPaginationSelectableOptions(state, false)
        }
      }
      const slice = matches.slice(alreadyShown, alreadyShown + pageSize)
      const remaining = Math.max(0, total - alreadyShown - slice.length)
      const formatted = formatEntitySearchResponse(
        filters,
        slice as unknown[],
        remaining > 0
          ? `Here are more shops matching "${state.nameQuery}".`
          : `Here are the remaining shops matching "${state.nameQuery}".`
      )
      return {
        success: true,
        intent: 'search',
        message: formatted.message,
        shops: formatted.shops,
        totalResults: total,
        hasMoreResults: remaining > 0,
        filters,
        selectableOptions: guidedPaginationSelectableOptions(state, remaining > 0),
        guidedSearchState: state,
        activityLog
      }
    }

    if (clientTotal != null) {
      const queryResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, filters, {
        offset: alreadyShown,
        limit: pageSize
      })
      const pageShops = (queryResult.data || []) as unknown[]
      if (alreadyShown >= clientTotal) {
        const empty = formatEntitySearchResponse(filters, [], 'No more results for this search.')
        return {
          success: true,
          intent: 'search',
          ...empty,
          guidedSearchState: state,
          activityLog,
          selectableOptions: guidedPaginationSelectableOptions(state, false)
        }
      }
      const remaining = Math.max(0, clientTotal - alreadyShown - pageShops.length)
      const formatted = formatEntitySearchResponse(
        filters,
        pageShops,
        remaining > 0 ? 'Here are more dive shops for your filters.' : 'Here are the remaining dive shops for your filters.'
      )
      return {
        success: true,
        intent: 'search',
        message: formatted.message,
        shops: formatted.shops,
        totalResults: clientTotal,
        hasMoreResults: remaining > 0,
        filters,
        selectableOptions: guidedPaginationSelectableOptions(state, remaining > 0),
        guidedSearchState: state,
        activityLog
      }
    }

    const full = await buildDiveShopQuery(supabaseUrl, supabaseKey, filters)
    const all = (full.data || []) as unknown[]
    const total = all.length
    const slice = all.slice(alreadyShown, alreadyShown + pageSize)
    const remaining = Math.max(0, total - alreadyShown - slice.length)
    const formatted = formatEntitySearchResponse(
      filters,
      slice,
      remaining > 0 ? 'Here are more dive shops for your filters.' : 'Here are the remaining dive shops for your filters.'
    )
    return {
      success: true,
      intent: 'search',
      message: formatted.message,
      shops: formatted.shops,
      totalResults: total,
      hasMoreResults: remaining > 0,
      filters,
      selectableOptions: guidedPaginationSelectableOptions(state, remaining > 0),
      guidedSearchState: state,
      activityLog
    }
  }

  const msg = rawMsg

  if (
    state.step === 'location_destination' &&
    !msg.toLowerCase().startsWith('guided:')
  ) {
    if (msg.length >= 2) {
      state = {
        ...state,
        filters: { ...state.filters, locale: msg },
        branch: state.branch ?? 'location',
        step: 'results'
      }
      pushLog('destination', 'Searching by place you entered')
    }
  } else if (state.step === 'name_search' && !msg.toLowerCase().startsWith('guided:')) {
    if (msg.length >= 2) {
      state = {
        ...state,
        nameQuery: msg,
        branch: state.branch ?? 'name',
        step: 'results'
      }
      pushLog('name', 'Searching by business name')
    }
  } else {
    state = applyGuidedSearchCommandPure(state, msg)
  }

  if (state.step !== 'results') {
    if (state.step === 'choose_branch') {
      return {
        success: true,
        intent: 'search',
        message: 'Search dive businesses by one of the options below.',
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        filters: {},
        selectableOptions: branchChips(),
        guidedSearchState: state,
        activityLog
      }
    }
    if (state.step === 'location_trip_type') {
      return {
        success: true,
        intent: 'search',
        message: 'What type of trip are you looking for? Pick one, then choose or type a destination.',
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        filters: toSearchFilters(state.filters),
        selectableOptions: tripTypeChips(),
        guidedSearchState: state,
        activityLog
      }
    }
    if (state.step === 'location_destination') {
      return {
        success: true,
        intent: 'search',
        message: 'Where do you want to dive? Pick a popular place or type a city or country in the box below and send.',
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        filters: toSearchFilters(state.filters),
        selectableOptions: [...destChips(), { label: 'Start over', value: GuidedCommands.reset }],
        guidedSearchState: state,
        activityLog
      }
    }
    if (state.step === 'course_pick') {
      return {
        success: true,
        intent: 'search',
        message: 'Which certification course are you interested in? We will show dive businesses that offer it.',
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        filters: {},
        selectableOptions: [...courseChips(), { label: 'Start over', value: GuidedCommands.reset }],
        guidedSearchState: state,
        activityLog
      }
    }
    if (state.step === 'site_type_pick') {
      return {
        success: true,
        intent: 'search',
        message: 'What kind of dive sites do you want? We will match businesses linked to sites of that type.',
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        filters: {},
        selectableOptions: [...siteTypeChips(), { label: 'Start over', value: GuidedCommands.reset }],
        guidedSearchState: state,
        activityLog
      }
    }
    if (state.step === 'name_search') {
      return {
        success: true,
        intent: 'search',
        message: 'Type the dive business name in the box below and send (e.g. Dive Porter).',
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        filters: {},
        selectableOptions: [{ label: 'Start over', value: GuidedCommands.reset }],
        guidedSearchState: state,
        activityLog
      }
    }
  }

  pushLog('search', 'Searching dive businesses')

  let bookingHints: GuidedFlowSearchResponse['bookingHints'] = undefined
  let openShopId: string | undefined

  if (guidedNeedsCombinedQuery(state)) {
    const { shops, total, filters: combinedFilters } = await runGuidedCombinedResultsQuery(
      supabaseUrl,
      supabaseKey,
      state
    )
    if (state.courseIntent?.trim()) {
      bookingHints = {
        desiredCourses: [state.courseIntent.trim()],
        diveSiteTypeLabel: state.diveSiteTypeLabel ?? null
      }
    } else if (state.diveSiteTypeLabel) {
      bookingHints = { desiredCourses: undefined, diveSiteTypeLabel: state.diveSiteTypeLabel }
    }
    if (total === 0 && priorStepWasLocationDestination) {
      return emptySearchReopenLocationPicker({ state, rawMsg, activityLog, bookingHints })
    }
    const formatted = formatEntitySearchResponse(
      combinedFilters,
      shops,
      total > 0
        ? 'Here are dive businesses matching your combined filters.'
        : 'No dive businesses matched these combined filters. Try widening one dimension or start a new search.'
    )
    return {
      success: true,
      intent: 'search',
      message: formatted.message,
      shops: formatted.shops,
      totalResults: formatted.totalResults,
      hasMoreResults: formatted.hasMoreResults,
      filters: formatted.filters as SearchFilters,
      selectableOptions: guidedResultsSelectableOptions(state, formatted),
      guidedSearchState: state,
      bookingHints,
      activityLog
    }
  }

  if (state.branch === 'course' && state.courseIntent) {
    const { shops, total } = await runCourseBranchQuery(supabaseUrl, supabaseKey, state.courseIntent)
    bookingHints = { desiredCourses: [state.courseIntent], diveSiteTypeLabel: null }
    const formatted = formatEntitySearchResponse(
      { ...toSearchFilters(state.filters), activityTokens: undefined },
      shops,
      total > 0
        ? `Here are dive businesses that may offer courses matching “${state.courseIntent}”.`
        : `No dive businesses in our directory matched courses for “${state.courseIntent}”. Try another course or search by location.`
    )
    return {
      success: true,
      intent: 'search',
      message: formatted.message,
      shops: formatted.shops,
      totalResults: total,
      hasMoreResults: formatted.hasMoreResults,
      filters: formatted.filters as SearchFilters,
      selectableOptions: guidedResultsSelectableOptions(state, formatted),
      guidedSearchState: state,
      bookingHints,
      activityLog
    }
  }

  if (state.branch === 'name' && state.nameQuery) {
    const matches = await listShopsMatchingName(supabaseUrl, supabaseKey, state.nameQuery, 50)
    const total = matches.length
    if (total === 1 && matches[0]) {
      openShopId = matches[0].id
    }
    const formatted = formatEntitySearchResponse(
      toSearchFilters(state.filters),
      matches as unknown[],
      total > 0
        ? `Found ${total} business(es) matching “${state.nameQuery}”.`
        : `No businesses matched “${state.nameQuery}”. Try a shorter name or search by location.`
    )
    return {
      success: true,
      intent: 'search',
      message: formatted.message,
      shops: formatted.shops,
      totalResults: total,
      hasMoreResults: formatted.hasMoreResults,
      filters: formatted.filters as SearchFilters,
      selectableOptions: guidedResultsSelectableOptions(state, formatted),
      guidedSearchState: state,
      openShopId,
      activityLog
    }
  }

  const filters = toSearchFilters(state.filters)
  const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, filters)
  const all = (dbResult.data || []) as unknown[]
  const total = all.length
  if (state.branch === 'site_type' && state.diveSiteTypeLabel) {
    bookingHints = { desiredCourses: undefined, diveSiteTypeLabel: state.diveSiteTypeLabel }
  }

  if (total === 0 && priorStepWasLocationDestination) {
    return emptySearchReopenLocationPicker({ state, rawMsg, activityLog, bookingHints })
  }

  const formatted = formatEntitySearchResponse(
    filters,
    all,
    total > 0
      ? `Here are dive businesses for your filters.`
      : `No dive businesses matched these filters. Try widening the area or trip type.`
  )

  return {
    success: true,
    intent: 'search',
    message: formatted.message,
    shops: formatted.shops,
    totalResults: total,
    hasMoreResults: formatted.hasMoreResults,
    filters: formatted.filters as SearchFilters,
    selectableOptions: guidedResultsSelectableOptions(state, formatted),
    guidedSearchState: state,
    bookingHints,
    activityLog
  }
}
