import { describe, expect, it } from 'vitest'
import { validateDiveSiteSuggestion } from '../../shared/diveSiteSuggestions'

const countryId = '10000000-0000-0000-0000-000000000001'

describe('validateDiveSiteSuggestion', () => {
  it('trims and collapses whitespace in the name', () => {
    expect(validateDiveSiteSuggestion({ name: '  Blue   Hole ', countryId })).toEqual({
      name: 'Blue Hole',
      countryId
    })
  })

  it('requires a specific name and a valid country UUID', () => {
    expect(() => validateDiveSiteSuggestion({ name: 'AB', countryId })).toThrow()
    expect(() => validateDiveSiteSuggestion({ name: 'Blue Hole', countryId: 'not-a-country' })).toThrow()
    expect(() => validateDiveSiteSuggestion({ name: 'x'.repeat(121), countryId })).toThrow()
  })
})
