import { createClient } from '@supabase/supabase-js'
import type { GuidedSearchState } from '../../shared/guidedFlow'
import {
  GuidedCommands,
  GUIDED_COURSE_CHIPS,
  GUIDED_SITE_TYPE_CHIPS,
  POPULAR_DESTINATION_KEYS,
  applyGuidedSearchCommandPure,
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

    if (state.branch === 'course' && state.courseIntent) {
      const { shops: allShops, total } = await runCourseBranchQuery(supabaseUrl, supabaseKey, state.courseIntent)
      const effectiveTotal = clientTotal ?? total
      if (alreadyShown >= effectiveTotal) {
        const empty = formatEntitySearchResponse(filters, [], 'No more results for this search.')
        return { success: true, intent: 'search', ...empty, guidedSearchState: state, activityLog }
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
        selectableOptions: remaining > 0 ? [{ label: 'Load next 5', value: 'Show more' }] : undefined,
        guidedSearchState: state,
        activityLog
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
          activityLog
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
        selectableOptions: remaining > 0 ? [{ label: 'Load next 5', value: 'Show more' }] : undefined,
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
        return { success: true, intent: 'search', ...empty, guidedSearchState: state, activityLog }
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
        selectableOptions: remaining > 0 ? [{ label: 'Load next 5', value: 'Show more' }] : undefined,
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
      selectableOptions: remaining > 0 ? [{ label: 'Load next 5', value: 'Show more' }] : undefined,
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
        step: 'results'
      }
      pushLog('destination', 'Searching by place you entered')
    }
  } else if (state.step === 'name_search' && !msg.toLowerCase().startsWith('guided:')) {
    if (msg.length >= 2) {
      state = {
        ...state,
        nameQuery: msg,
        branch: 'name',
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
      selectableOptions: [
        ...(formatted.selectableOptions || []),
        { label: 'New search', value: GuidedCommands.reset }
      ],
      guidedSearchState: state,
      bookingHints,
      activityLog
    }
  }

  if (state.branch === 'name' && state.nameQuery) {
    const matches = await listShopsMatchingName(supabaseUrl, supabaseKey, state.nameQuery, 50)
    const total = matches.length
    const firstPage = matches.slice(0, 5)
    if (total === 1 && firstPage[0]) {
      openShopId = firstPage[0].id
    }
    const formatted = formatEntitySearchResponse(
      toSearchFilters(state.filters),
      firstPage as unknown[],
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
      selectableOptions: [
        ...(formatted.selectableOptions || []),
        { label: 'New search', value: GuidedCommands.reset }
      ],
      guidedSearchState: state,
      openShopId,
      activityLog
    }
  }

  const filters = toSearchFilters(state.filters)
  const dbResult = await buildDiveShopQuery(supabaseUrl, supabaseKey, filters)
  const all = (dbResult.data || []) as unknown[]
  const total = all.length
  const firstPage = all.slice(0, 5)
  if (state.branch === 'site_type' && state.diveSiteTypeLabel) {
    bookingHints = { desiredCourses: undefined, diveSiteTypeLabel: state.diveSiteTypeLabel }
  }

  const formatted = formatEntitySearchResponse(
    filters,
    firstPage,
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
    selectableOptions: [
      ...(formatted.selectableOptions || []),
      { label: 'New search', value: GuidedCommands.reset }
    ],
    guidedSearchState: state,
    bookingHints,
    activityLog
  }
}
