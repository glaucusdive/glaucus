import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fetchSearchShopsWithSparseWiden, sliceSearchShopPage } from '../../server/utils/fetchSearchShopsWithSparseWiden'

vi.mock('../../server/utils/buildDiveShopQuery', () => ({
  buildDiveShopQuery: vi.fn()
}))

vi.mock('../../server/utils/searchActivityWidenMessage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/utils/searchActivityWidenMessage')>()
  return {
    ...actual,
    resolveActivityExactShopIdsInList: vi.fn()
  }
})

import { buildDiveShopQuery } from '../../server/utils/buildDiveShopQuery'
import { resolveActivityExactShopIdsInList } from '../../server/utils/searchActivityWidenMessage'

const buildDiveShopQueryMock = vi.mocked(buildDiveShopQuery)
const resolveActivityExactMock = vi.mocked(resolveActivityExactShopIdsInList)

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

describe('fetchSearchShopsWithSparseWiden activity widen', () => {
  beforeEach(() => {
    buildDiveShopQueryMock.mockReset()
    resolveActivityExactMock.mockReset()
    resolveActivityExactMock.mockResolvedValue([])
  })

  it('widens when activity query returns zero and geo query returns shops', async () => {
    const geoShops = [
      { id: 'au1', business_name: 'Shop A' },
      { id: 'au2', business_name: 'Shop B' }
    ]
    buildDiveShopQueryMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: geoShops, error: null })

    const result = await fetchSearchShopsWithSparseWiden('url', 'key', {
      country: 'Australia',
      activityTokens: ['cave']
    })

    expect(result.widenedActivity).toBe(true)
    expect(result.activityExactShopIds).toEqual([])
    expect(result.shops.map(s => s.id)).toEqual(['au1', 'au2'])
    expect(buildDiveShopQueryMock).toHaveBeenCalledTimes(2)
    expect(buildDiveShopQueryMock.mock.calls[1]?.[2]).toEqual({ country: 'Australia' })
    expect(resolveActivityExactMock).toHaveBeenCalled()
  })

  it('reclassifies activity-exact ids from widened shop list', async () => {
    const geoShops = [
      { id: 'cave1', business_name: 'Cave Shop' },
      { id: 'au2', business_name: 'Generic Shop' }
    ]
    buildDiveShopQueryMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: geoShops, error: null })
    resolveActivityExactMock.mockResolvedValue(['cave1'])

    const result = await fetchSearchShopsWithSparseWiden('url', 'key', {
      country: 'Australia',
      activityTokens: ['cave', 'cavern']
    })

    expect(result.activityExactShopIds).toEqual(['cave1'])
  })
})
