import { describe, expect, it, vi } from 'vitest'
import {
  lookupExactCountryByPhrase,
  normalizeCountryLookupPhrase,
  promotePlaceToCountryFilters,
  resolveCountryIdsForSearchScope
} from '../../server/utils/resolveSearchCountryIds'

function mockClient (opts: {
  countriesByIlike?: { id: string, name: string }[]
  countriesByEq?: { id: string, name: string } | null
  aliases?: { country_id: string, alias: string }[]
}) {
  const countryRows = opts.countriesByIlike ?? []
  const aliasRows = opts.aliases ?? []

  const countriesIlikeChain = () => {
    const resolved = { data: countryRows }
    return {
      limit: vi.fn().mockResolvedValue(resolved),
      then: (resolve: (v: typeof resolved) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(resolved).then(resolve, reject)
    }
  }

  const aliasesIlikeChain = () => {
    const resolved = { data: aliasRows }
    return {
      limit: vi.fn().mockResolvedValue(resolved),
      then: (resolve: (v: typeof resolved) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(resolved).then(resolve, reject)
    }
  }

  const from = vi.fn((table: string) => {
    if (table === 'countries') {
      return {
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockImplementation(() => countriesIlikeChain()),
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: opts.countriesByEq ?? null
            })
          })
        })
      }
    }
    if (table === 'country_aliases') {
      return {
        select: vi.fn().mockReturnValue({
          ilike: vi.fn().mockImplementation(() => aliasesIlikeChain())
        })
      }
    }
    return {
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockImplementation(() => countriesIlikeChain())
      })
    }
  })
  return { from } as unknown as Parameters<typeof resolveCountryIdsForSearchScope>[0]
}


describe('normalizeCountryLookupPhrase', () => {
  it('strips leading the', () => {
    expect(normalizeCountryLookupPhrase('the Solomon Islands')).toBe('Solomon Islands')
  })
})

describe('lookupExactCountryByPhrase', () => {
  it('matches exact country name', async () => {
    const client = mockClient({
      countriesByIlike: [{ id: 'si', name: 'Solomon Islands' }]
    })
    const row = await lookupExactCountryByPhrase(client, 'Solomon Islands')
    expect(row).toEqual({ id: 'si', name: 'Solomon Islands' })
  })

  it('matches via alias', async () => {
    const client = mockClient({
      countriesByIlike: [],
      aliases: [{ country_id: 'us', alias: 'USA' }],
      countriesByEq: { id: 'us', name: 'United States' }
    })
    const row = await lookupExactCountryByPhrase(client, 'USA')
    expect(row).toEqual({ id: 'us', name: 'United States' })
  })
})

describe('promotePlaceToCountryFilters', () => {
  it('promotes Solomon Islands place to country via heuristics', async () => {
    const client = mockClient({})
    const out = await promotePlaceToCountryFilters(client, {
      place: 'Solomon Islands',
      diveTypes: ['Liveaboard']
    })
    expect(out).toEqual({ country: 'Solomon Islands', diveTypes: ['Liveaboard'] })
    expect(out.place).toBeUndefined()
  })

  it('promotes unknown-to-allowlist country via DB exact match', async () => {
    const client = mockClient({
      countriesByIlike: [{ id: 'pg', name: 'Papua New Guinea' }]
    })
    // If somehow not in sync allowlist path with different casing still works via DB when allowlist misses
    const out = await promotePlaceToCountryFilters(client, {
      place: 'Papua New Guinea',
      diveTypes: ['Liveaboard']
    })
    expect(out.country).toBe('Papua New Guinea')
    expect(out.place).toBeUndefined()
    expect(out.diveTypes).toEqual(['Liveaboard'])
  })

  it('leaves city place alone when not a country', async () => {
    const client = mockClient({ countriesByIlike: [] })
    const out = await promotePlaceToCountryFilters(client, { place: 'Some Unknown Cove' })
    expect(out).toEqual({ place: 'Some Unknown Cove' })
  })
})

describe('resolveCountryIdsForSearchScope', () => {
  it('resolves explicit filters.country', async () => {
    const client = mockClient({
      countriesByIlike: [{ id: 'id-indonesia', name: 'Indonesia' }]
    })
    const ids = await resolveCountryIdsForSearchScope(client, { country: 'Indonesia' })
    expect(ids).toEqual(['id-indonesia'])
  })

  it('infers country from known place when country filter absent', async () => {
    const client = mockClient({
      countriesByIlike: [{ id: 'id-indonesia', name: 'Indonesia' }]
    })
    const ids = await resolveCountryIdsForSearchScope(client, { place: 'Raja Ampat' })
    expect(ids).toEqual(['id-indonesia'])
  })

  it('resolves Solomon Islands place via heuristic then name lookup', async () => {
    const client = mockClient({
      countriesByIlike: [{ id: 'id-si', name: 'Solomon Islands' }]
    })
    const ids = await resolveCountryIdsForSearchScope(client, { place: 'Solomon Islands' })
    expect(ids).toEqual(['id-si'])
  })

  it('returns null when no country scope can be derived', async () => {
    const client = mockClient({ countriesByIlike: [] })
    const ids = await resolveCountryIdsForSearchScope(client, { place: 'Some Unknown Cove' })
    expect(ids).toBeNull()
  })
})
