import { describe, expect, it } from 'vitest'
import { LruCache } from '../../shared/lruCache'

describe('LruCache', () => {
  it('evicts oldest when over capacity', () => {
    const cache = new LruCache<number, string>(2)
    cache.set(1, 'a')
    cache.set(2, 'b')
    cache.get(1)
    cache.set(3, 'c')
    expect(cache.has(2)).toBe(false)
    expect(cache.get(1)).toBe('a')
    expect(cache.get(3)).toBe('c')
  })
})
