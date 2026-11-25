import { describe, expect, it } from 'vitest'
import {
  DIVE_DICTIONARY_TERMS,
  dictionaryLetterCounts,
  dictionarySitemapEntries,
  filterTerms,
  getDictionaryNeighbors,
  getDictionaryTerm,
  groupTermsByLetter,
  listDictionaryTerms,
  normalizeDictionarySearch
} from '../../shared/diveDictionary'

describe('diveDictionary', () => {
  it('lists unique slugs and includes seeded terms', () => {
    const terms = listDictionaryTerms()
    expect(terms.length).toBe(DIVE_DICTIONARY_TERMS.length)
    const slugs = terms.map(t => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(getDictionaryTerm('nitrogen-narcosis')?.term).toBe('Nitrogen narcosis')
    expect(getDictionaryTerm('no-decompression-limit')?.aliases).toContain('NDL')
  })

  it('filters by term, alias, and definition', () => {
    expect(filterTerms('nitrox').map(t => t.slug)).toContain('nitrox')
    expect(filterTerms('PFO').map(t => t.slug)).toContain('patent-foramen-ovale')
    expect(filterTerms('rapture').map(t => t.slug)).toContain('nitrogen-narcosis')
    expect(filterTerms('zzzz-no-match')).toEqual([])
  })

  it('groups by letter and reports counts', () => {
    const groups = groupTermsByLetter()
    expect(groups.every(g => g.terms.length > 0)).toBe(true)
    expect(groups.find(g => g.letter === 'N')?.terms.some(t => t.slug === 'nitrox')).toBe(true)
    const counts = dictionaryLetterCounts()
    expect(counts.N).toBeGreaterThan(0)
    expect(counts.Q).toBe(0)
  })

  it('returns alphabetical neighbors and sitemap locs', () => {
    const ordered = listDictionaryTerms()
    const mid = ordered[Math.floor(ordered.length / 2)]!
    const neighbors = getDictionaryNeighbors(mid.slug)
    expect(neighbors.prev?.slug).toBeTruthy()
    expect(neighbors.next?.slug).toBeTruthy()
    const entries = dictionarySitemapEntries()
    expect(entries[0]?.loc).toMatch(/^\/dictionary\//)
    expect(entries).toHaveLength(ordered.length)
  })

  it('normalizes search query input', () => {
    expect(normalizeDictionarySearch('  nitrox  ')).toBe('nitrox')
    expect(normalizeDictionarySearch(null)).toBe('')
  })
})
