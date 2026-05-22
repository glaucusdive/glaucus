import { describe, it, expect } from 'vitest'
import { normalizeAuthRedirect } from '../../app/utils/authRedirect'

describe('normalizeAuthRedirect', () => {
  it('returns fallback for empty input', () => {
    expect(normalizeAuthRedirect(undefined)).toBe('/')
    expect(normalizeAuthRedirect('')).toBe('/')
  })

  it('decodes pre-encoded booking resume redirect', () => {
    expect(normalizeAuthRedirect('%2F%3FbookingResume%3D1')).toBe('/?bookingResume=1')
    expect(normalizeAuthRedirect('/%2F%3FbookingResume%3D1')).toBe('/?bookingResume=1')
    expect(normalizeAuthRedirect('//?bookingResume=1')).toBe('/?bookingResume=1')
  })

  it('passes through normal paths', () => {
    expect(normalizeAuthRedirect('/?bookingResume=1')).toBe('/?bookingResume=1')
    expect(normalizeAuthRedirect('/profile')).toBe('/profile')
  })

  it('rejects external URLs', () => {
    expect(normalizeAuthRedirect('https://evil.com')).toBe('/')
  })
})
