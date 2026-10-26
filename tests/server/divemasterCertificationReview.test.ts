import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  serviceClient: vi.fn(),
  admin: vi.fn(),
  setHeader: vi.fn(),
  update: vi.fn()
}))

vi.mock('../../server/utils/getAuthUser', () => ({
  getAuthUser: mocks.user
}))
vi.mock('../../server/utils/supabaseServiceRole', () => ({
  getSupabaseServiceRoleClient: mocks.serviceClient
}))
vi.mock('../../server/utils/requireAdminUser', () => ({
  requireAdminUser: mocks.admin
}))

let profileId = 'owner-id'
let certificationRows: unknown[] = []
let updatedCertification: { id: string } | null = { id: 'cert-id' }
const certificationId = '00000000-0000-0000-0000-000000000004'
const params = { username: 'owner', id: certificationId }

beforeEach(() => {
  vi.clearAllMocks()
  profileId = 'owner-id'
  certificationRows = [{
    id: certificationId,
    name: 'Test certification',
    approval_status: 'pending'
  }]
  updatedCertification = { id: certificationId }
  mocks.user.mockResolvedValue({ id: 'owner-id' })
  mocks.update.mockImplementation(() => undefined)
  mocks.serviceClient.mockReturnValue({
    from: (table: string) => {
      let updateMode = false
      const builder = {
        select: vi.fn(() => builder),
        ilike: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        maybeSingle: vi.fn(async () => ({
          data: table === 'profiles' ? { id: profileId } : updateMode ? updatedCertification : null,
          error: null
        })),
        update: vi.fn((values: unknown) => {
          updateMode = true
          mocks.update(values)
          return builder
        }),
        then: (resolve: (result: unknown) => unknown, reject: (error: unknown) => unknown) =>
          Promise.resolve({ data: certificationRows, error: null }).then(resolve, reject)
      }
      if (table === 'profiles') delete (builder as Partial<typeof builder>).then
      return builder
    }
  })
  mocks.admin.mockResolvedValue({
    user: { id: 'admin-id' },
    client: { from: mocks.serviceClient().from }
  })
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', (_event: unknown, key: string) => params[key as keyof typeof params])
  vi.stubGlobal('createError', (details: Record<string, unknown>) => Object.assign(new Error(String(details.statusMessage)), details))
  vi.stubGlobal('setResponseHeader', mocks.setHeader)
  vi.stubGlobal('readBody', vi.fn())
})

afterEach(() => vi.unstubAllGlobals())

async function getOwnerPendingCertifications () {
  const { default: handler } = await import('../../server/api/divemaster/[username]/pending-certifications.get')
  return handler({} as never)
}

async function reviewCertification (body: unknown) {
  vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body))
  const { default: handler } = await import('../../server/api/admin/divemaster-certifications/[id].patch')
  return handler({} as never)
}

describe('divemaster certification review endpoints', () => {
  it('returns private pending entries only to the profile owner', async () => {
    expect(await getOwnerPendingCertifications()).toEqual(certificationRows)
    expect(mocks.setHeader).toHaveBeenCalledWith({}, 'Cache-Control', 'private, no-store')

    mocks.user.mockResolvedValueOnce({ id: 'other-user' })
    await expect(getOwnerPendingCertifications()).rejects.toMatchObject({ statusCode: 403 })
  })

  it('requires authentication for owner-only certification reads', async () => {
    mocks.user.mockResolvedValue(null)
    await expect(getOwnerPendingCertifications()).rejects.toMatchObject({ statusCode: 401 })
  })

  it('records admin decisions and rejects invalid or stale reviews', async () => {
    expect(await reviewCertification({ action: 'approve' })).toEqual({ id: certificationId, status: 'approved' })
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      approval_status: 'approved',
      reviewed_by: 'admin-id',
      reviewed_at: expect.any(String)
    }))

    await expect(reviewCertification({ action: 'hold' })).rejects.toMatchObject({ statusCode: 400 })

    updatedCertification = null
    await expect(reviewCertification({ action: 'reject' })).rejects.toMatchObject({ statusCode: 409 })
  })
})
