import { describe, expect, it } from 'vitest'
import { buildSearchMatchBadges } from '../../shared/searchMatchBadges'

describe('buildSearchMatchBadges', () => {
  it('includes activity tokens and dates but not filter geo or trip type', () => {
    const badges = buildSearchMatchBadges(
      {
        place: 'Bali',
        country: 'Indonesia',
        diveTypes: ['Dive Shop'],
        activityTokens: ['wreck'],
        dates: { start: '2026-06-17', end: '2026-06-23' }
      },
      null
    )
    expect(badges.some(b => b.includes('Bali'))).toBe(false)
    expect(badges.some(b => /Indonesia/i.test(b))).toBe(false)
    expect(badges.some(b => /Dive shop/i.test(b))).toBe(false)
    expect(badges).toContain('Wreck diving')
    expect(badges.some(b => b.startsWith('Dates:'))).toBe(true)
  })

  it('adds course and NLU activity / site labels without place chips', () => {
    const badges = buildSearchMatchBadges(
      { place: 'Cozumel', country: 'Mexico' },
      {
        certification_course_hint: 'Open Water',
        activity_terms: ['drift'],
        dive_site_type_label: 'wall dives'
      }
    )
    expect(badges.some(b => b.includes('Cozumel'))).toBe(false)
    expect(badges.some(b => b.includes('Open Water'))).toBe(true)
    expect(badges).toContain('Drift diving')
    expect(badges).toContain('Wall Dives')
  })

  it('dedupes overlapping activity signals', () => {
    const badges = buildSearchMatchBadges(
      { activityTokens: ['wreck'] },
      { activity_terms: ['wreck'], dive_site_type_label: null, certification_course_hint: null }
    )
    expect(badges.filter(b => b === 'Wreck diving').length).toBe(1)
  })

  it('adds Course directory from filters.certificationCourseHint when facets omit it', () => {
    const badges = buildSearchMatchBadges(
      { country: 'Mexico', certificationCourseHint: 'Advanced' },
      null
    )
    expect(badges.some(b => /^Course \(directory\):\s*Advanced$/i.test(b))).toBe(true)
  })
})
