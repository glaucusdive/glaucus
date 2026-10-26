import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const owner = '00000000-0000-0000-0000-000000000001'
const admin = '00000000-0000-0000-0000-000000000002'
const other = '00000000-0000-0000-0000-000000000003'
let db: PGlite

async function asUser (id: string) {
  await db.exec('RESET ROLE')
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id])
  await db.exec('SET ROLE authenticated')
}
async function submit (name: string, agency = 'Agency A') {
  const result = await db.query<{ result: { id: string; status: string; name: string } }>(
    "SELECT public.submit_profile_credential('certification', $1, $2) AS result", [name, agency])
  return result.rows[0].result
}
async function review (id: string, action: string, target: string | null = null, alias = false, reason: string | null = null) {
  const result = await db.query<{ result: { status: string; catalog_id: string } }>(
    'SELECT public.review_profile_credential($1::uuid, $2, $3, $4, $5) AS result', [id, action, target, alias, reason])
  return result.rows[0].result
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY, role text NOT NULL);
    CREATE TABLE public.agencies(id uuid PRIMARY KEY, name text NOT NULL);
    CREATE TABLE public.courses(agency_id uuid REFERENCES agencies(id), certification_name text NOT NULL);
    CREATE FUNCTION public.is_app_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
      $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;
    INSERT INTO profiles VALUES ('${owner}', 'standard'), ('${admin}', 'admin'), ('${other}', 'standard');
    INSERT INTO agencies VALUES ('10000000-0000-0000-0000-000000000001', 'Agency A'), ('10000000-0000-0000-0000-000000000002', 'Agency B');
    INSERT INTO courses VALUES ('10000000-0000-0000-0000-000000000001', 'Imported Credential');
  `)
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261025130000_profile_credential_suggestions.sql', import.meta.url), 'utf8'))
}, 30000)
afterAll(async () => { await db?.close() })

describe('Credential suggestion SQL security and moderation', () => {
  it('keeps a submission private and makes repeated submission idempotent', async () => {
    await asUser(owner)
    const first = await submit('Test Credential')
    const repeat = await submit('  TEST   Credential ')
    expect(repeat.id).toBe(first.id)
    expect(first.status).toBe('pending')
    expect((await db.query("SELECT * FROM public.profile_credential_catalog WHERE name = 'Test Credential'")).rows).toHaveLength(0)
    expect((await db.query('SELECT * FROM public.profile_credential_submissions')).rows).toHaveLength(1)
    await asUser(other)
    expect((await db.query('SELECT * FROM public.profile_credential_submissions')).rows).toHaveLength(0)
  })

  it('blocks direct catalog/submission writes and owner self-approval', async () => {
    await asUser(owner)
    await expect(db.exec("INSERT INTO profile_credential_catalog(kind,name,agency) VALUES ('certification','Bypass Credential','Agency A')")).rejects.toMatchObject({ code: '42501' })
    await expect(db.exec("UPDATE profile_credential_submissions SET status = 'approved'")).rejects.toMatchObject({ code: '42501' })
    const request = await submit('Owner Cannot Approve')
    await expect(review(request.id, 'approve')).rejects.toMatchObject({ code: '42501' })
  })

  it('only publishes an entry after an admin approves it', async () => {
    await asUser(owner)
    const request = await submit('Approved Credential')
    await asUser(admin)
    expect((await review(request.id, 'approve')).status).toBe('approved')
    await db.exec('RESET ROLE; SET ROLE anon')
    const catalog = await db.query<{ name: string }>('SELECT name FROM profile_credential_catalog')
    expect(catalog.rows.map(row => row.name)).toContain('Approved Credential')
    await expect(db.exec('SELECT * FROM profile_credential_submissions')).rejects.toMatchObject({ code: '42501' })
    await expect(db.query("SELECT submit_profile_credential('training','Anonymous Training','')")).rejects.toMatchObject({ code: '42501' })
  })

  it('merges same-agency names and adds an alias only when explicitly approved', async () => {
    await asUser(owner)
    const request = await submit('Alternate Credential')
    await asUser(admin)
    expect((await review(request.id, 'merge', 'Approved Credential', true)).status).toBe('merged')
    const result = await db.query<{ aliases: string[] }>("SELECT aliases FROM profile_credential_catalog WHERE name = 'Approved Credential'")
    expect(result.rows[0].aliases).toContain('Alternate Credential')
    await expect(review(request.id, 'merge', 'Approved Credential', true)).rejects.toMatchObject({ code: '40001' })
    await asUser(owner)
    const differentAgency = await submit('Different Agency Credential', 'Agency B')
    await asUser(admin)
    await expect(review(differentAgency.id, 'merge', 'Approved Credential', true)).rejects.toMatchObject({ code: '22023' })
    const pending = await db.query<{ status: string }>('SELECT status FROM profile_credential_submissions WHERE id = $1', [differentAgency.id])
    expect(pending.rows[0].status).toBe('pending')
  })

  it('rejects with an owner-visible reason and does not publish the name', async () => {
    await asUser(owner)
    const request = await submit('Rejected Credential')
    await asUser(admin)
    expect((await review(request.id, 'reject', null, false, 'Use an existing name.')).status).toBe('rejected')
    await asUser(owner)
    const result = await db.query<{ rejection_reason: string }>('SELECT rejection_reason FROM profile_credential_submissions WHERE id = $1', [request.id])
    expect(result.rows[0].rejection_reason).toBe('Use an existing name.')
    expect((await db.query("SELECT * FROM profile_credential_catalog WHERE name = 'Rejected Credential'")).rows).toHaveLength(0)
  })

  it('enforces pending limits and validates agencies at the database boundary', async () => {
    await asUser(other)
    await expect(submit('Invalid Agency Credential', 'Unknown Agency')).rejects.toMatchObject({ code: '22023' })
    for (let index = 0; index < 10; index++) await submit(`Limited Credential ${index}`)
    await expect(submit('One Too Many')).rejects.toMatchObject({ code: 'P0001' })
    expect((await submit('Limited Credential 0')).status).toBe('pending')
  })

  it('supports curated training merge targets without approving aliases by default', async () => {
    await asUser(owner)
    const response = await db.query<{ result: { id: string } }>("SELECT submit_profile_credential('training', 'Adaptive Technique Variant', '') AS result")
    await asUser(admin)
    expect((await review(response.rows[0].result.id, 'merge', 'Adaptive Techniques')).status).toBe('merged')
    const catalog = await db.query<{ aliases: string[] }>("SELECT aliases FROM profile_credential_catalog WHERE name = 'Adaptive Techniques'")
    expect(catalog.rows[0].aliases).toEqual([])
  })

  it('imports a baseline but does not promote later course writes without review', async () => {
    await asUser(owner)
    expect((await submit('Imported Credential')).status).toBe('existing')
    await db.exec('RESET ROLE')
    await db.exec("INSERT INTO courses VALUES ('10000000-0000-0000-0000-000000000001', 'Later Course Credential')")
    await asUser(owner)
    expect((await db.query("SELECT * FROM profile_credential_catalog WHERE name = 'Later Course Credential'")).rows).toHaveLength(0)
    expect((await submit('Later Course Credential')).status).toBe('pending')
  })
})