import { describe, expect, it, vi } from 'vitest'
import { buildProfileCredentialOptions, credentialOptionId, fetchProfileCertificationOptions, matchPickerOptions, validateCredentialSuggestion } from '../../shared/profileCredentialCatalog'

describe('Profile credential suggestions', () => {
  const options = [{ label: 'Advanced Nitrox Diver' }, { label: 'Open Water Diver' }, { label: 'Rescue Diver' }]
  it('prefers normal partial matches and recovers a misspelling only as fallback', () => {
    expect(matchPickerOptions(options, 'Nitrox', true)).toEqual({ options: [options[0]], similar: false })
    expect(matchPickerOptions(options, 'Advnced Nitrox', true)).toEqual({ options: [options[0]], similar: true })
    expect(matchPickerOptions(options, 'Advnced Nitrox').options).toEqual([])
  })
  it('does not fuzzy-match short or unrelated queries and preserves browse order', () => {
    expect(matchPickerOptions(options, 'zz', true).options).toEqual([])
    expect(matchPickerOptions(options, 'zzzzzzzz', true).options).toEqual([])
    expect(matchPickerOptions(options, '', true).options).toEqual(options)
  })
  it('supports diacritics and approved alternate names', () => {
    expect(matchPickerOptions([{ label: 'Récupération' }], 'recuperation', true).similar).toBe(false)
    expect(matchPickerOptions([{ label: 'Canonical Training', searchTerms: ['Alternate Training'] }], 'Alternate').options).toHaveLength(1)
  })
  it('keeps same-name certifications from different agencies distinct', () => {
    const base = [{ id: 'Open Water', label: 'Open Water', agency: 'Agency A' }, { id: 'Open Water', label: 'Open Water', agency: 'Agency B' }]
    expect(buildProfileCredentialOptions('certification', base, [])).toHaveLength(2)
    expect(buildProfileCredentialOptions('certification', base, [], 'Agency B')[0].agency).toBe('Agency B')
    expect(credentialOptionId('Open Water', 'Agency A')).not.toBe(credentialOptionId('Open Water', 'Agency B'))
  })
  it('merges approved additions without duplicating existing names', () => {
    const merged = buildProfileCredentialOptions('training', [{ id: 'Test Training', label: 'Test Training' }], [{ id: 'catalog', kind: 'training', name: 'Test Training', agency: '', aliases: ['Alternate'] }])
    expect(merged).toHaveLength(1)
    expect(merged[0].searchTerms).toContain('Alternate')
  })
  it('keeps the existing training Other choice last', () => {
    const options = buildProfileCredentialOptions('training', ['Other', 'Wreck Diver', 'Adaptive Techniques'].map(name => ({ id: name, label: name })), [])
    expect(options.map(option => option.name)).toEqual(['Adaptive Techniques', 'Wreck Diver', 'Other'])
  })
  it('validates specific names and requires agency context for certifications', () => {
    expect(validateCredentialSuggestion({ kind: 'certification', name: ' Test  Credential ', agency: 'Agency A' })).toEqual({ kind: 'certification', name: 'Test Credential', agency: 'Agency A' })
    expect(() => validateCredentialSuggestion({ kind: 'training', name: 'Other' })).toThrow()
    expect(() => validateCredentialSuggestion({ kind: 'certification', name: 'Test Credential' })).toThrow()
    expect(() => validateCredentialSuggestion({ kind: 'unknown', name: 'Test' })).toThrow()
  })

  it('reads deployed certification suggestions only from the approved catalog', async () => {
    const from = vi.fn(() => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: [{ name: 'Approved Credential', agency: 'Agency A' }], error: null }) }) }) }) }))
    expect(await fetchProfileCertificationOptions({ from } as never)).toEqual([{ id: 'Approved Credential', label: 'Approved Credential', agency: 'Agency A' }])
    expect(from).toHaveBeenCalledOnce()
    expect(from).toHaveBeenCalledWith('profile_credential_catalog')
  })

  it('falls back to legacy options only when the new table is not deployed', async () => {
    const from = vi.fn((table: string) => table === 'profile_credential_catalog'
      ? { select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: null, error: { code: 'PGRST205' } }) }) }) }) }
      : { select: () => ({ order: async () => ({ data: [{ certification_name: 'Legacy Credential', agencies: { name: 'Agency A' } }], error: null }) }) })
    expect((await fetchProfileCertificationOptions({ from } as never))[0].agency).toBe('Agency A')
    expect(from).toHaveBeenCalledWith('courses')
  })

  it('does not bypass catalog permissions on other database errors', async () => {
    const from = vi.fn(() => ({ select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: null, error: { code: '42501' } }) }) }) }) }))
    await expect(fetchProfileCertificationOptions({ from } as never)).rejects.toThrow('approved credential names')
    expect(from).toHaveBeenCalledTimes(1)
  })
})