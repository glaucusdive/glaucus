import { describe, expect, it, vi } from 'vitest'
import { resolveCountryIdsForSearchScope } from '../../server/utils/resolveSearchCountryIds'

function mockClient (countryRows: { id: string }[]) {
  const ilike = vi.fn().mockResolvedValue({ data: countryRows })
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike
      })
    })
  } as unknown as Parameters<typeof resolveCountryIdsForSearchScope>[0]
}

describe('resolveCountryIdsForSearchScope', () => {
  it('resolves explicit filters.country', async () => {
    const client = mockClient([{ id: 'id-indonesia' }])
    const ids = await resolveCountryIdsForSearchScope(client, { country: 'Indonesia' })
    expect(ids).toEqual(['id-indonesia'])
  })

  it('infers country from known place when country filter absent', async () => {
    const client = mockClient([{ id: 'id-indonesia' }])
    const ids = await resolveCountryIdsForSearchScope(client, { place: 'Raja Ampat' })
    expect(ids).toEqual(['id-indonesia'])
  })

  it('returns null when no country scope can be derived', async () => {
    const client = mockClient([])
    const ids = await resolveCountryIdsForSearchScope(client, { place: 'Some Unknown Cove' })
    expect(ids).toBeNull()
  })
})
