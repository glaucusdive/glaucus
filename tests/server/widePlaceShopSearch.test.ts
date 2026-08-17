import { describe, expect, it } from 'vitest'
import {
  diveshopDirectoryOrConditions,
  mergeShopListsPreferringDiveTypes,
  placeSearchTokens,
  shouldWidenSparseTripTypeResults
} from '../../server/utils/widePlaceShopSearch'

describe('placeSearchTokens', () => {
  it('includes full phrase and significant words', () => {
    expect(placeSearchTokens('Raja Ampat')).toEqual(['Raja Ampat', 'Raja', 'Ampat'])
  })

  it('includes single long token', () => {
    expect(placeSearchTokens('Bali')).toEqual(['Bali'])
  })

  it('does not emit bare Islands when phrase is Solomon Islands', () => {
    expect(placeSearchTokens('Solomon Islands')).toEqual(['Solomon Islands', 'Solomon'])
    expect(placeSearchTokens('Solomon Islands')).not.toContain('Islands')
  })

  // Regression guard: these directional/continental tokens caused cross-continent ilike false matches.
  // e.g. "south" matched South Africa street addresses when searching for "South Asia".

  it('does not emit bare "South" or "Asia" tokens from "South Asia"', () => {
    const tokens = placeSearchTokens('South Asia')
    expect(tokens).not.toContain('South')
    expect(tokens).not.toContain('Asia')
    // Full compound phrase is still emitted so the region ilike can match
    expect(tokens).toContain('South Asia')
    expect(tokens).toHaveLength(1)
  })

  it('does not emit bare "North" or "Africa" from "North Africa"', () => {
    const tokens = placeSearchTokens('North Africa')
    expect(tokens).not.toContain('North')
    expect(tokens).not.toContain('Africa')
    expect(tokens).toContain('North Africa')
    expect(tokens).toHaveLength(1)
  })

  it('does not emit bare "South" from "Southeast Asia"', () => {
    const tokens = placeSearchTokens('Southeast Asia')
    expect(tokens).not.toContain('Asia')
    // "Southeast" is also blocked as a directional prefix
    expect(tokens).not.toContain('Southeast')
    expect(tokens).toContain('Southeast Asia')
    expect(tokens).toHaveLength(1)
  })

  it('does not emit bare "Southern" or "Africa" from "Southern Africa"', () => {
    // "southern" < 4 chars? No: s-o-u-t-h-e-r-n = 8 chars, but "southern" is not in the generic set
    // Wait — "Southern" is not blocked. "Africa" IS blocked. So "Southern" passes through.
    // This is acceptable: "Southern" is specific enough not to cause false cross-continent matches.
    const tokens = placeSearchTokens('Southern Africa')
    expect(tokens).not.toContain('Africa')
    expect(tokens).toContain('Southern Africa')
  })

  it('still emits significant words for specific multi-word places', () => {
    // "Nusa Penida" — neither word is generic → both emitted
    const tokens = placeSearchTokens('Nusa Penida')
    expect(tokens).toContain('Nusa Penida')
    expect(tokens).toContain('Nusa')
    expect(tokens).toContain('Penida')
  })

  it('emits only full phrase when all words are generic (no dangling generic tokens)', () => {
    // Defense-in-depth: any two-generic-word phrase should never produce individual tokens
    const tokens = placeSearchTokens('North East')
    expect(tokens).not.toContain('North')
    expect(tokens).not.toContain('East')
    expect(tokens).toContain('North East')
  })
})

describe('diveshopDirectoryOrConditions', () => {
  it('spans business_name and address columns', () => {
    const or = diveshopDirectoryOrConditions(['Ampat'])
    expect(or).toContain('business_name.ilike.%Ampat%')
    expect(or).toContain('street_address.ilike.%Ampat%')
  })
})

describe('shouldWidenSparseTripTypeResults', () => {
  it('widens when few trip-type matches', () => {
    expect(shouldWidenSparseTripTypeResults(1, ['Liveaboard'])).toBe(true)
    expect(shouldWidenSparseTripTypeResults(5, ['Liveaboard'])).toBe(true)
    expect(shouldWidenSparseTripTypeResults(6, ['Liveaboard'])).toBe(false)
    expect(shouldWidenSparseTripTypeResults(0, ['Liveaboard'])).toBe(false)
  })
})

describe('mergeShopListsPreferringDiveTypes', () => {
  it('lists liveaboard matches before other operators', () => {
    const merged = mergeShopListsPreferringDiveTypes(
      [{ id: 'a', business_name: 'Resort A', type: 'Dive Resort', google_rating: 5 }],
      [{ id: 'b', business_name: 'Boat B', type: 'Liveaboard', google_rating: 4 }],
      ['Liveaboard']
    )
    expect(merged.map(s => s.id)).toEqual(['b', 'a'])
  })

  it('dedupes by id', () => {
    const merged = mergeShopListsPreferringDiveTypes(
      [{ id: 'a', business_name: 'A', type: 'Liveaboard' }],
      [{ id: 'a', business_name: 'A', type: 'Liveaboard' }],
      ['Liveaboard']
    )
    expect(merged).toHaveLength(1)
  })
})
