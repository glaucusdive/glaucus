import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ service: vi.fn(), rpc: vi.fn() }))
vi.mock('../../server/utils/supabaseServiceRole', () => ({ getSupabaseServiceRoleClient: mocks.service }))

describe('Public DivePros directory endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.service.mockReturnValue({ rpc: mocks.rpc })
    mocks.rpc.mockResolvedValue({ data: { profiles: [], total: 0 }, error: null })
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('createError', (details: Record<string, unknown>) => Object.assign(new Error(String(details.statusMessage)), details))
  })
  afterEach(() => vi.unstubAllGlobals())

  async function invoke (query: Record<string, unknown> = {}) {
    vi.stubGlobal('getQuery', () => query)
    const { default: handler } = await import('../../server/api/divemasters.get')
    return handler({} as never)
  }

  it('calls only the published directory RPC with bounded parameters', async () => {
    const result = await invoke({ page: '99999999', q: ' Test   Place ', status: 'draft' })
    expect(mocks.rpc).toHaveBeenCalledWith('list_public_divemasters', { p_search: 'Test Place', p_page: 100_000 })
    expect(result).toEqual({ profiles: [], total: 0, page: 100_000, pageSize: 24 })
  })

  it('returns public fields only, without forwarding database columns', async () => {
    mocks.rpc.mockResolvedValue({ data: { profiles: [{ username: 'test-pro', display_name: null, user_id: 'internal', email: 'redacted', admin_notes: 'private' }], total: 1 }, error: null })
    const result = await invoke()
    expect(result.profiles).toEqual([{ username: 'test-pro', display_name: null, headline: null, location: null, avatar_url: null }])
  })

  it('returns a controlled error if the migration or query is unavailable', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Internal database details' } })
    await expect(invoke()).rejects.toMatchObject({ statusCode: 503, message: 'Could not load DivePros. Please try again later.' })
  })

  it('does not expose server configuration errors', async () => {
    mocks.service.mockImplementation(() => { throw new Error('Private server configuration') })
    await expect(invoke()).rejects.toMatchObject({ statusCode: 503, message: 'DivePros directory is temporarily unavailable.' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('fails closed on malformed RPC data', async () => {
    mocks.rpc.mockResolvedValue({ data: { profiles: 'invalid', total: 1 }, error: null })
    await expect(invoke()).rejects.toMatchObject({ statusCode: 503 })
  })
})