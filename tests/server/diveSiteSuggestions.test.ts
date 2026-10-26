import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  token: vi.fn(),
  userClient: vi.fn(),
  admin: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn()
}))

vi.mock('../../server/utils/getAuthUser', () => ({
  getAuthUser: mocks.user,
  getBearerToken: mocks.token,
  createSupabaseClientForUser: mocks.userClient
}))
vi.mock('../../server/utils/requireAdminUser', () => ({ requireAdminUser: mocks.admin }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.user.mockResolvedValue({ id: 'test-user' })
  mocks.token.mockReturnValue('placeholder')
  mocks.rpc.mockResolvedValue({ data: { status: 'pending', name: 'Blue Hole' }, error: null })
  mocks.userClient.mockReturnValue({ rpc: mocks.rpc })
  mocks.admin.mockResolvedValue({ client: { rpc: mocks.rpc, from: mocks.from } })
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { supabaseUrl: 'https://example.invalid', supabaseKey: 'placeholder' } }))
  vi.stubGlobal('createError', (details: Record<string, unknown>) => Object.assign(new Error(String(details.statusMessage)), details))
  vi.stubGlobal('readBody', vi.fn().mockResolvedValue({
    name: 'Blue Hole',
    countryId: '10000000-0000-0000-0000-000000000001'
  }))
  vi.stubGlobal('getQuery', () => ({ status: 'pending' }))
  vi.stubGlobal('getRouterParam', () => '00000000-0000-0000-0000-000000000001')
})

afterEach(() => vi.unstubAllGlobals())

async function submit () {
  const { default: handler } = await import('../../server/api/settings/dive-site-submissions.post')
  return handler({} as never)
}

async function review (body: unknown) {
  vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body))
  const { default: handler } = await import('../../server/api/admin/dive-site-submissions/[id].patch')
  return handler({} as never)
}

describe('dive site suggestion endpoints', () => {
  it('requires sign-in and validates the submission before calling the database', async () => {
    mocks.user.mockResolvedValue(null)
    await expect(submit()).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.rpc).not.toHaveBeenCalled()

    mocks.user.mockResolvedValue({ id: 'test-user' })
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ name: 'AB', countryId: 'bad' }))
    await expect(submit()).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('sends only validated fields to the submission RPC and returns duplicate status', async () => {
    mocks.rpc.mockResolvedValue({ data: { status: 'existing', name: 'Blue Hole' }, error: null })
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue({
      name: ' Blue   Hole ',
      countryId: '10000000-0000-0000-0000-000000000001',
      status: 'approved',
      created_by: 'another-user'
    }))
    expect(await submit()).toEqual({ status: 'existing', name: 'Blue Hole' })
    expect(mocks.rpc).toHaveBeenCalledWith('submit_dive_site_suggestion', {
      p_name: 'Blue Hole',
      p_country_id: '10000000-0000-0000-0000-000000000001'
    })
  })

  it('requires admin authorization for review and forwards the action', async () => {
    mocks.admin.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { statusCode: 403 }))
    await expect(review({ action: 'approve' })).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.rpc).not.toHaveBeenCalled()

    mocks.admin.mockResolvedValue({ client: { rpc: mocks.rpc } })
    await review({ action: 'reject', reason: 'Duplicate site.' })
    expect(mocks.rpc).toHaveBeenCalledWith('review_dive_site_suggestion', {
      p_id: '00000000-0000-0000-0000-000000000001',
      p_action: 'reject',
      p_reason: 'Duplicate site.',
      p_existing_dive_site_id: null,
      p_add_alias: false
    })
  })
})
