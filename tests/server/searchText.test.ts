import { describe, expect, it } from 'vitest'
import { fuzzyNameScore, normalizeSearchText } from '../../server/utils/searchText'

describe('normalizeSearchText', () => {
  it('normalizes case, accents, and whitespace', () => {
    expect(normalizeSearchText('  CoCó   ViEw  ')).toBe('coco view')
  })
})

describe('fuzzyNameScore', () => {
  it('scores accent-only differences as near exact', () => {
    const score = fuzzyNameScore('coco view', 'CoCó View')
    expect(score).toBeGreaterThan(0.95)
  })

  it('prefers near name variants over unrelated names', () => {
    const close = fuzzyNameScore('coco view resort', 'CoCo View Dive Resort')
    const far = fuzzyNameScore('coco view resort', 'Blue Corner Dive')
    expect(close).toBeGreaterThan(0.6)
    expect(close).toBeGreaterThan(far)
  })
})
