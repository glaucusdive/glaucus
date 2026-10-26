import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_DIVEMASTER_USERNAMES, isTestDivemasterUsername } from '../../shared/testDivemasters'

let db: PGlite
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE TABLE profiles (id integer PRIMARY KEY, username text, display_name text);
    CREATE TABLE divemaster_profiles (user_id integer, status text, headline text, location text, avatar_url text);
    INSERT INTO profiles SELECT n, 'pro-' || n, 'Pro ' || lpad(n::text, 2, '0') FROM generate_series(1, 25) n;
    INSERT INTO divemaster_profiles SELECT n, 'published', NULL, 'Test Island', NULL FROM generate_series(1, 25) n;
    INSERT INTO profiles VALUES (26, 'SashDivemasterTest', 'AAA Synthetic Test Profile');
    INSERT INTO divemaster_profiles VALUES (26, 'published', NULL, 'Test Island', NULL);
    GRANT SELECT ON profiles, divemaster_profiles TO service_role;
  `)
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261025120000_divemaster_directory.sql', import.meta.url), 'utf8'))
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261025160000_hide_test_divemaster_directory.sql', import.meta.url), 'utf8'))
  await db.exec('SET ROLE service_role')
})
afterAll(async () => { await db.close() })

async function directory (search = '', page = 1) {
  const result = await db.query<{ result: { profiles: Array<{ username: string }>; total: number; page: number; pageSize: number } }>(
    'SELECT list_public_divemasters($1, $2) AS result', [search, page]
  )
  return result.rows[0].result
}

describe('Designated test DivePro discovery', () => {
  it('matches only the designated username, not arbitrary test names', () => {
    expect(isTestDivemasterUsername(' SashDivemasterTest ')).toBe(true)
    expect(isTestDivemasterUsername('another-test-pro')).toBe(false)
    expect(isTestDivemasterUsername(null)).toBe(false)
  })

  it('excludes test profiles before counting and pagination', async () => {
    const first = await directory()
    const second = await directory('', 2)
    expect(first.total).toBe(25)
    expect(first.profiles).toHaveLength(24)
    expect(second.total).toBe(25)
    expect(second.profiles).toHaveLength(1)
    expect([...first.profiles, ...second.profiles].some(profile => isTestDivemasterUsername(profile.username))).toBe(false)
  })

  it('excludes every configured test username in direct searches but keeps ordinary matches', async () => {
    for (const username of TEST_DIVEMASTER_USERNAMES) {
      expect(await directory(username)).toMatchObject({ profiles: [], total: 0 })
    }
    expect(await directory('Synthetic')).toMatchObject({ profiles: [], total: 0 })
    expect((await directory('Test Island')).total).toBe(25)
    expect((await directory('pro-25')).profiles).toEqual([expect.objectContaining({ username: 'pro-25' })])
  })

  it('leaves the profile published and directly readable by existing profile queries', async () => {
    const result = await db.query("SELECT username FROM profiles JOIN divemaster_profiles ON user_id = id WHERE lower(username) = 'sashdivemastertest' AND status = 'published'")
    expect(result.rows).toHaveLength(1)
  })

  it('retains service-role-only RPC permissions', async () => {
    const result = await db.query<{ anon: boolean; authenticated: boolean; service: boolean }>(`
      SELECT has_function_privilege('anon', 'list_public_divemasters(text,integer)', 'execute') AS anon,
        has_function_privilege('authenticated', 'list_public_divemasters(text,integer)', 'execute') AS authenticated,
        has_function_privilege('service_role', 'list_public_divemasters(text,integer)', 'execute') AS service
    `)
    expect(result.rows[0]).toEqual({ anon: false, authenticated: false, service: true })
  })
})
