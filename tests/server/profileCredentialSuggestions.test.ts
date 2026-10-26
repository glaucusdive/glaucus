import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), userClient: vi.fn(), admin: vi.fn(), existing: vi.fn(), rpc: vi.fn(), from: vi.fn() }))
vi.mock('../../server/utils/getAuthUser', () => ({ getAuthUser: mocks.user, getBearerToken: mocks.token, createSupabaseClientForUser: mocks.userClient }))
vi.mock('../../server/utils/requireAdminUser', () => ({ requireAdminUser: mocks.admin }))
vi.mock('../../server/utils/profileCredentialCatalog', () => ({ findExistingProfileCredential: mocks.existing }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.user.mockResolvedValue({ id: 'test-user' })
  mocks.token.mockReturnValue('placeholder')
  mocks.userClient.mockReturnValue({ rpc: mocks.rpc })
  mocks.admin.mockResolvedValue({ client: { rpc: mocks.rpc, from: mocks.from } })
  mocks.existing.mockResolvedValue(null)
  mocks.rpc.mockResolvedValue({ data: { status: 'pending', name: 'Test Credential', agency: 'Agency A' }, error: null })
  mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { kind: 'certification', agency: 'Agency A' }, error: null }) }) }) })
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { supabaseUrl: 'https://example.invalid', supabaseKey: 'placeholder' } }))
  vi.stubGlobal('createError', (details: Record<string, unknown>) => Object.assign(new Error(String(details.statusMessage)), details))
  vi.stubGlobal('getRouterParam', () => '00000000-0000-0000-0000-000000000001')
})
afterEach(() => vi.unstubAllGlobals())

async function submit (body: unknown = { kind: 'certification', name: 'Test Credential', agency: 'Agency A' }) {
  const read = vi.fn().mockResolvedValue(body)
  vi.stubGlobal('readBody', read)
  const { default: handler } = await import('../../server/api/settings/profile-credential-submissions.post')
  return handler({} as never)
}
async function review (body: unknown) {
  vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body))
  const { default: handler } = await import('../../server/api/admin/profile-credential-submissions/[id].patch')
  return handler({} as never)
}

describe('Credential suggestion endpoints', () => {
  it('requires authentication before looking up or writing suggestions', async () => {
    mocks.user.mockResolvedValue(null)
    await expect(submit()).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.existing).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('rejects malformed names and missing agency context', async () => {
    await expect(submit({ kind: 'certification', name: 'Other' })).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('reuses exact existing names instead of creating a request', async () => {
    mocks.existing.mockResolvedValue({ status: 'existing', name: 'Existing Credential', agency: 'Agency A' })
    expect(await submit()).toMatchObject({ status: 'existing' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('passes only validated fields to the identity-derived database function', async () => {
    await submit({ kind: 'certification', name: ' Test  Credential ', agency: 'Agency A', created_by: 'another-user', status: 'approved' })
    expect(mocks.rpc).toHaveBeenCalledWith('submit_profile_credential', { p_kind: 'certification', p_name: 'Test Credential', p_agency: 'Agency A' })
  })
  it('does not create anything when the duplicate check fails', async () => {
    mocks.existing.mockRejectedValue(new Error('Lookup failed'))
    await expect(submit()).rejects.toMatchObject({ statusCode: 503 })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('requires admin authorization before moderation', async () => {
    mocks.admin.mockRejectedValue(Object.assign(new Error('Forbidden'), { statusCode: 403 }))
    await expect(review({ action: 'approve' })).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('rejects unknown merge targets instead of inventing catalog entries', async () => {
    await expect(review({ action: 'merge', targetName: 'Unknown Credential' })).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('uses the canonical same-agency merge target and explicit alias choice', async () => {
    mocks.existing.mockResolvedValue({ status: 'existing', name: 'Canonical Credential', agency: 'Agency A' })
    await review({ action: 'merge', targetName: 'Canonical Credential', addAlias: true })
    expect(mocks.rpc).toHaveBeenCalledWith('review_profile_credential', expect.objectContaining({ p_action: 'merge', p_target_name: 'Canonical Credential', p_add_alias: true }))
  })
  it('returns conflicts without blindly replaying moderation writes', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '40001' } })
    await expect(review({ action: 'approve' })).rejects.toMatchObject({ statusCode: 409 })
    expect(mocks.rpc).toHaveBeenCalledOnce()
  })
})