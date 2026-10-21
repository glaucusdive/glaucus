import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  service: vi.fn(),
  from: vi.fn(),
  insert: vi.fn()
}))

vi.mock('../../server/utils/requireAdminUser', () => ({ requireAdminUser: mocks.requireAdmin }))
vi.mock('../../server/utils/supabaseServiceRole', () => ({ getSupabaseServiceRoleClient: mocks.service }))

describe('admin divemaster job date writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ user: { id: 'test-admin' } })
    mocks.insert.mockResolvedValue({ error: null })
    mocks.from.mockImplementation(() => ({
      delete: () => ({ eq: async () => ({ error: null }) }),
      insert: mocks.insert
    }))
    mocks.service.mockReturnValue({ from: mocks.from })
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('getRouterParam', () => 'test-owner')
    vi.stubGlobal('createError', (details: Record<string, unknown>) => Object.assign(new Error(String(details.statusMessage)), details))
  })

  afterEach(() => vi.unstubAllGlobals())

  async function invoke (jobs: unknown[]) {
    vi.stubGlobal('readBody', async () => ({ jobs }))
    const { default: handler } = await import('../../server/api/admin/divemasters/[userId].patch')
    return handler({} as never)
  }

  it('rejects invalid dates before acquiring a write client', async () => {
    await expect(invoke([{ title: 'Guide', organization: 'Test shop', start_date: '2026-13' }])).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.service).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('normalizes month input and legacy full dates before insertion', async () => {
    await invoke([{ title: 'Guide', organization: 'Test shop', start_date: '2020-06-19', end_date: '2026-03', is_current: true }])
    expect(mocks.insert).toHaveBeenCalledWith([expect.objectContaining({
      user_id: 'test-owner', start_date: '2020-06-01', end_date: '2026-03-01', is_current: false
    })])
  })

  it('keeps dates optional and preserves current jobs', async () => {
    await invoke([{ title: 'Guide', organization: 'Test shop', is_current: true }])
    expect(mocks.insert).toHaveBeenCalledWith([expect.objectContaining({ start_date: null, end_date: null, is_current: true })])
  })

  it('requires administrator authorization before reading the body or writing', async () => {
    mocks.requireAdmin.mockRejectedValue(new Error('Unauthorized'))
    await expect(invoke([])).rejects.toThrow('Unauthorized')
    expect(mocks.service).not.toHaveBeenCalled()
  })
})