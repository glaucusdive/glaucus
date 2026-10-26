import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  normalizeDivemasterDirectorySearch,
  parseDivemasterDirectoryPage,
  publicDivemasterDirectoryResponse
} from '../../shared/divemasterDirectory'

describe('DivePros directory', () => {
  it('normalizes and bounds search and pagination inputs', () => {
    expect(normalizeDivemasterDirectorySearch('  Test   Place  ')).toBe('Test Place')
    expect(normalizeDivemasterDirectorySearch(['test'])).toBe('')
    expect(normalizeDivemasterDirectorySearch('a'.repeat(200))).toHaveLength(100)
    for (const value of [undefined, '', -1, 0, 1.5, 'invalid', Infinity]) {
      expect(parseDivemasterDirectoryPage(value)).toBe(1)
    }
    expect(parseDivemasterDirectoryPage(['2'])).toBe(2)
    expect(parseDivemasterDirectoryPage(1_000_000)).toBe(100_000)
  })

  it('returns only public tile fields', () => {
    const response = publicDivemasterDirectoryResponse({ profiles: [{
      username: 'test-pro', display_name: ' Test Pro ', headline: null,
      location: 'Test Place', avatar_url: null, user_id: 'internal',
      email: 'redacted', admin_notes: 'private', status: 'published'
    }], total: 1 }, 1)
    expect(response).toEqual({ profiles: [{
      username: 'test-pro', display_name: 'Test Pro', headline: null,
      location: 'Test Place', avatar_url: null
    }], total: 1, page: 1, pageSize: 24 })
  })

  it('preserves counts for empty and out-of-range pages', () => {
    expect(publicDivemasterDirectoryResponse({ profiles: [], total: 30 }, 3)).toEqual({
      profiles: [], total: 30, page: 3, pageSize: 24
    })
    expect(publicDivemasterDirectoryResponse({ profiles: [], total: 0 }, 1).total).toBe(0)
  })

  it('rejects malformed results and omits invalid profile links', () => {
    expect(() => publicDivemasterDirectoryResponse(null, 1)).toThrow()
    expect(() => publicDivemasterDirectoryResponse({ profiles: [], total: -1 }, 1)).toThrow()
    const response = publicDivemasterDirectoryResponse({ profiles: [{ username: '../private' }, null], total: 0 }, 1)
    expect(response.profiles).toEqual([])
  })

  it('limits database reads to published profiles and service-role callers', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/20261025120000_divemaster_directory.sql', import.meta.url), 'utf8')
    expect(sql).toContain("professional.status = 'published'")
    expect(sql).toContain('SECURITY INVOKER')
    expect(sql).toContain('FROM PUBLIC, anon, authenticated')
    expect(sql).toContain('TO service_role')
    expect(sql).toContain('LIMIT 24')
    expect(sql).toContain('strpos(')
    expect(sql).not.toContain('SECURITY DEFINER')
  })
})