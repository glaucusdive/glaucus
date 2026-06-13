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
