import { describe, expect, it } from 'vitest'
import { hasSupabaseAuthCookie } from '../../app/utils/hasSupabaseAuthCookie'

describe('hasSupabaseAuthCookie', () => {
  it('returns false for missing cookie header', () => {
    expect(hasSupabaseAuthCookie(undefined)).toBe(false)
    expect(hasSupabaseAuthCookie('')).toBe(false)
  })

  it('returns false when no Supabase auth cookie is present', () => {
    expect(hasSupabaseAuthCookie('theme=dark; nuxt-color-mode=system')).toBe(false)
  })

  it('returns true when sb auth token cookie is present', () => {
    expect(
      hasSupabaseAuthCookie('sb-hyldglninkgngaweejmw-auth-token=base64payload; other=x')
    ).toBe(true)
  })
})
