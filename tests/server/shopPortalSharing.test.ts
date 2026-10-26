import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  token: vi.fn(), service: vi.fn(), meta: vi.fn(), lookups: vi.fn(), snapshot: vi.fn(), merge: vi.fn()
}))
vi.mock('../../server/utils/portalToken', () => ({ requirePortalToken: mocks.token }))
vi.mock('../../server/utils/supabaseServiceRole', () => ({ getSupabaseServiceRoleClient: mocks.service }))
vi.mock('../../server/utils/buildShopSnapshot', () => ({ fetchPortalLookups: mocks.lookups, fetchShopFormSnapshot: mocks.snapshot }))
vi.mock('../../server/utils/mergeDiveSitesIntoLookups', () => ({ mergeDiveSitesIntoLookups: mocks.merge }))

describe('Partner public sharing snapshot', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('createError', (details: Record<string, unknown>) => Object.assign(new Error(String(details.statusMessage)), details))
    mocks.token.mockResolvedValue({ diveshop_id: 'synthetic-shop', token: 'synthetic-partner-token' })
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: mocks.meta }
    mocks.service.mockReturnValue({ from: vi.fn(() => query) })
    mocks.meta.mockResolvedValue({ data: { business_name: 'Public Scuba', country_id: 'c1', slug: 'public-scuba' }, error: null })
    mocks.lookups.mockResolvedValue({ countries: [{ id: 'c1', name: 'Indonesia' }], diveBusinessTypes: [] })
    mocks.snapshot.mockResolvedValue({
      business_name: 'Public Scuba', type: 'Dive Shop', city: 'Amed', state: null,
      website_url: 'https://example.com', phone: null, email: 'public@example.com', dive_site_ids: []
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  async function invoke () {
    const { default: handler } = await import('../../server/api/shop-portal/[token]/index.get')
    return handler({ context: { params: { token: 'synthetic-partner-token' } } } as never)
  }

  it('returns a minimal published snapshot separate from editable form data', async () => {
    const result = await invoke()
    expect(mocks.token).toHaveBeenCalledWith('synthetic-partner-token')
    expect(result.publicProfile).toEqual({
      slugOrId: 'public-scuba', name: 'Public Scuba', subtitle: 'Dive Shop · Amed · Indonesia',
      contacts: ['https://example.com', 'public@example.com']
    })
    result.snapshot.business_name = 'Unsaved business'
    expect(result.publicProfile.name).toBe('Public Scuba')
    expect(JSON.stringify(result.publicProfile)).not.toContain('synthetic-partner-token')
    expect(JSON.stringify(result.publicProfile)).not.toContain('/partner/')
  })

  it('falls back to a public shop ID when no slug exists', async () => {
    mocks.meta.mockResolvedValue({ data: { business_name: 'Public Scuba', slug: null }, error: null })
    expect((await invoke()).publicProfile.slugOrId).toBe('synthetic-shop')
  })

  it('does not read shop details when the token is invalid or revoked', async () => {
    mocks.token.mockRejectedValue(new Error('Invalid partner link'))
    await expect(invoke()).rejects.toThrow('Invalid partner link')
    expect(mocks.service).not.toHaveBeenCalled()
    expect(mocks.snapshot).not.toHaveBeenCalled()
  })

  it('fails explicitly for a failed shop query or missing shop', async () => {
    mocks.meta.mockResolvedValue({ data: null, error: { message: 'Shop query failed' } })
    await expect(invoke()).rejects.toMatchObject({ statusCode: 500 })
    mocks.meta.mockResolvedValue({ data: null, error: null })
    await expect(invoke()).rejects.toMatchObject({ statusCode: 404 })
  })
})
