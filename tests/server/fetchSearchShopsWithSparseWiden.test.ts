import { describe, expect, it } from 'vitest'
import { sliceSearchShopPage } from '../../server/utils/fetchSearchShopsWithSparseWiden'

describe('sliceSearchShopPage', () => {
  const shops = Array.from({ length: 17 }, (_, i) => ({ id: String(i + 1) }))

  it('returns the remaining shops after the first page of 10', () => {
    const { page, remaining, total } = sliceSearchShopPage(shops, 10, 10)
    expect(total).toBe(17)
    expect(page.map(s => s.id)).toEqual(['11', '12', '13', '14', '15', '16', '17'])
    expect(remaining).toBe(0)
  })

  it('returns empty when already past the end', () => {
    const { page, remaining } = sliceSearchShopPage(shops, 17, 10)
    expect(page).toEqual([])
    expect(remaining).toBe(0)
  })
})
