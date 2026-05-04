import { describe, expect, it } from 'vitest'
import {
  CHAT_LOADING_BOOKING_LINES,
  CHAT_LOADING_SEARCH_LINES,
  chatLoadingLinesForKind,
  mapOrchestratorActivityToStatusLine
} from '../../app/utils/chatLoadingStatus'

describe('chatLoadingLinesForKind', () => {
  it('returns search lines by default', () => {
    expect(chatLoadingLinesForKind('search')).toBe(CHAT_LOADING_SEARCH_LINES)
    expect(chatLoadingLinesForKind('booking')).toBe(CHAT_LOADING_BOOKING_LINES)
  })
})

describe('mapOrchestratorActivityToStatusLine', () => {
  it('maps NLU and Supabase patterns', () => {
    expect(mapOrchestratorActivityToStatusLine('NLU (OpenRouter) — goal: find shops')).toBe(
      'Understanding your request…'
    )
    expect(mapOrchestratorActivityToStatusLine('Supabase dive shop query for "Bali" → 16 rows')).toBe(
      'Searching our dive directory…'
    )
    expect(mapOrchestratorActivityToStatusLine('OpenRouter — drafting FILTERS/MESSAGE for dive shop search (search model)')).toBe(
      'Shaping your search…'
    )
  })

  it('returns null for unknown labels', () => {
    expect(mapOrchestratorActivityToStatusLine('')).toBe(null)
    expect(mapOrchestratorActivityToStatusLine('Something else entirely')).toBe(null)
  })
})
