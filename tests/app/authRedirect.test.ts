import { describe, it, expect } from 'vitest'
import { DEFAULT_AUTH_REDIRECT, normalizeAuthRedirect } from '../../app/utils/authRedirect'

describe('normalizeAuthRedirect', () => {
  it('returns chat home fallback for empty input', () => {
    expect(normalizeAuthRedirect(undefined)).toBe(DEFAULT_AUTH_REDIRECT)
    expect(normalizeAuthRedirect('')).toBe(DEFAULT_AUTH_REDIRECT)
    expect(DEFAULT_AUTH_REDIRECT).toBe('/?chat=1')
  })

  it('decodes pre-encoded booking resume redirect', () => {
    expect(normalizeAuthRedirect('%2F%3FbookingResume%3D1')).toBe('/?bookingResume=1')
    expect(normalizeAuthRedirect('/%2F%3FbookingResume%3D1')).toBe('/?bookingResume=1')
    expect(normalizeAuthRedirect('//?bookingResume=1')).toBe('/?bookingResume=1')
  })

  it('passes through normal paths', () => {
    expect(normalizeAuthRedirect('/?bookingResume=1')).toBe('/?bookingResume=1')
    expect(normalizeAuthRedirect('/profile')).toBe('/profile')
    expect(normalizeAuthRedirect('/?chat=1')).toBe('/?chat=1')
  })

  it('rejects external URLs', () => {
    expect(normalizeAuthRedirect('https://evil.com')).toBe(DEFAULT_AUTH_REDIRECT)
  })
})
