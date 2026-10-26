import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  serviceClient: vi.fn(),
  setHeader: vi.fn()
}))

vi.mock('../../server/utils/getAuthUser', () => ({
  getAuthUser: mocks.user
}))
vi.mock('../../server/utils/supabaseServiceRole', () => ({
  getSupabaseServiceRoleClient: mocks.serviceClient
}))

const routeParams = { username: 'ashok' }
let profileId = 'owner-id'
let pendingRows: unknown[] = []
let profileQueryCount = 0
let pendingQueryCount = 0

beforeEach(() => {
  vi.clearAllMocks()
  profileId = 'owner-id'
  pendingRows = [{
    submission_id: 'submission-id',
    slot: 'visited',
    note: null,
    sort_order: 4,
    submission: {
      name: 'Test Reef',
      status: 'pending',
      countries: { name: 'Albania' }
    }
  }]
  profileQueryCount = 0
  pendingQueryCount = 0
  mocks.user.mockResolvedValue({ id: 'owner-id' })
  mocks.serviceClient.mockReturnValue({
    from: (table: string) => {
      const builder = {
        select: vi.fn(() => builder),
        ilike: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => {
          profileQueryCount += 1
          return { data: { id: profileId }, error: null }
        }),
        then: (resolve: (result: unknown) => unknown, reject: (error: unknown) => unknown) => {
          pendingQueryCount += 1
          return Promise.resolve({ data: pendingRows, error: null }).then(resolve, reject)
        }
      }
      if (table === 'profiles') {
        delete (builder as Partial<typeof builder>).then
      }
      return builder
    }
  })
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', (_event: unknown, key: string) => routeParams[key as keyof typeof routeParams])
  vi.stubGlobal('createError', (details: Record<string, unknown>) => Object.assign(new Error(String(details.statusMessage)), details))
  vi.stubGlobal('setResponseHeader', mocks.setHeader)
})

afterEach(() => vi.unstubAllGlobals())

async function getPendingSites () {
  const { default: handler } = await import('../../server/api/divemaster/[username]/pending-sites.get')
  return handler({} as never)
}

describe('owner pending divemaster dive sites endpoint', () => {
  it('returns pending visited sites only to the authenticated profile owner', async () => {
    expect(await getPendingSites()).toEqual([{
      dive_site_id: 'submission-id',
      name: 'Test Reef',
      country_name: 'Albania',
      note: null,
      sort_order: 4,
      pending: true
    }])
    expect(pendingQueryCount).toBe(1)
    expect(mocks.setHeader).toHaveBeenCalledWith({}, 'Cache-Control', 'private, no-store')
  })

  it('requires authentication and refuses requests for another profile', async () => {
    mocks.user.mockResolvedValueOnce(null)
    await expect(getPendingSites()).rejects.toMatchObject({ statusCode: 401 })
    expect(profileQueryCount).toBe(0)

    profileId = 'someone-else'
    await expect(getPendingSites()).rejects.toMatchObject({ statusCode: 403 })
    expect(pendingQueryCount).toBe(0)
  })

  it('omits submissions that are no longer pending', async () => {
    pendingRows = [{
      submission_id: 'approved-id',
      slot: 'visited',
      note: null,
      sort_order: 0,
      submission: { name: 'Approved Reef', status: 'approved', countries: { name: 'Albania' } }
    }]
    expect(await getPendingSites()).toEqual([])
  })
})
