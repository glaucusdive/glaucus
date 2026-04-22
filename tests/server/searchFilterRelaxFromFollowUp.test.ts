import { describe, expect, it } from 'vitest'
import { tryApplySearchFilterRelax } from '../../server/utils/searchFilterRelaxFromFollowUp'

describe('tryApplySearchFilterRelax', () => {
  it('drops diveTypes for chip phrasing', () => {
    const last = { country: 'Maldives', diveTypes: ['Dive Resort'] as string[] }
    const msg =
      'List all dive shops in Maldives (do not filter by resort, liveaboard, or dive shop only)'
    const r = tryApplySearchFilterRelax(msg, last)
    expect(r).toEqual({ country: 'Maldives' })
  })

  it('drops diveTypes for short “Any trip type”', () => {
    const last = { country: 'Maldives', diveTypes: ['Dive Resort'] as string[] }
    expect(tryApplySearchFilterRelax('Any trip type', last)).toEqual({ country: 'Maldives' })
  })

  it('returns null when nothing to widen', () => {
    const last = { country: 'Maldives' }
    expect(
      tryApplySearchFilterRelax(
        'List all dive shops in Maldives (do not filter by resort, liveaboard, or dive shop only)',
        last
      )
    ).toBeNull()
  })

  it('returns null without geo on last filters', () => {
    expect(
      tryApplySearchFilterRelax('Any trip type', { diveTypes: ['Dive Resort'] })
    ).toBeNull()
  })
})
