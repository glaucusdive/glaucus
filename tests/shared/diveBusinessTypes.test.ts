import { describe, expect, it } from 'vitest'
import {
  businessTypeIdsFromStored,
  businessTypeNamesFromIds,
  formatDiveBusinessTypeLabel,
  parseDiveBusinessTypesFromStored,
  serializeDiveBusinessTypes
} from '../../shared/diveBusinessTypes'

const OPTIONS = [
  { id: 'a', name: 'Dive Shop' },
  { id: 'b', name: 'Dive Resort' },
  { id: 'c', name: 'Liveaboard' }
]

describe('parseDiveBusinessTypesFromStored', () => {
  it('splits comma-separated values and trims', () => {
    expect(parseDiveBusinessTypesFromStored('Dive Resort, Dive Shop')).toEqual(['Dive Resort', 'Dive Shop'])
  })

  it('dedupes case-insensitively', () => {
    expect(parseDiveBusinessTypesFromStored('Liveaboard, liveaboard')).toEqual(['Liveaboard'])
  })

  it('returns empty for null/empty', () => {
    expect(parseDiveBusinessTypesFromStored(null)).toEqual([])
    expect(parseDiveBusinessTypesFromStored('')).toEqual([])
  })
})

describe('serializeDiveBusinessTypes', () => {
  it('orders canonical types consistently', () => {
    expect(serializeDiveBusinessTypes(['Liveaboard', 'Dive Shop', 'Dive Resort'])).toBe(
      'Dive Shop, Dive Resort, Liveaboard'
    )
  })

  it('returns null when empty', () => {
    expect(serializeDiveBusinessTypes([])).toBeNull()
    expect(serializeDiveBusinessTypes(['', '  '])).toBeNull()
  })

  it('places unknown types after canonical', () => {
    expect(serializeDiveBusinessTypes(['Yacht Charter', 'Dive Shop'])).toBe('Dive Shop, Yacht Charter')
  })
})

describe('formatDiveBusinessTypeLabel', () => {
  it('formats dive shop for display', () => {
    expect(formatDiveBusinessTypeLabel('Dive Shop')).toBe('Dive Shop / Day Trip')
    expect(formatDiveBusinessTypeLabel('Liveaboard')).toBe('Liveaboard')
  })
})

describe('businessTypeIdsFromStored / businessTypeNamesFromIds', () => {
  it('round-trips via lookup options', () => {
    const raw = 'Dive Resort, Dive Shop'
    const ids = businessTypeIdsFromStored(raw, OPTIONS)
    expect(ids).toEqual(['b', 'a'])
    expect(serializeDiveBusinessTypes(businessTypeNamesFromIds(ids, OPTIONS))).toBe('Dive Shop, Dive Resort')
  })

  it('ignores unknown stored fragments', () => {
    expect(businessTypeIdsFromStored('Dive Shop, Typo Type', OPTIONS)).toEqual(['a'])
  })
})
