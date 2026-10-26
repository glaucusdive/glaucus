import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const owner = '00000000-0000-0000-0000-000000000001'
const admin = '00000000-0000-0000-0000-000000000002'
const other = '00000000-0000-0000-0000-000000000003'
const fiji = '10000000-0000-0000-0000-000000000001'
const belize = '10000000-0000-0000-0000-000000000002'
let db: PGlite

async function asUser (id: string) {
  await db.exec('RESET ROLE')
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id])
  await db.exec('SET ROLE authenticated')
}

async function submit (name: string, countryId = fiji) {
  const result = await db.query<{ result: { status: string; name?: string; id?: string; diveSiteId?: string } }>(
    'SELECT public.submit_dive_site_suggestion($1, $2::uuid) AS result',
    [name, countryId]
  )
  return result.rows[0].result
}

async function review (
  id: string,
  action: string,
  reason: string | null = null,
  existingSiteId: string | null = null,
  addAlias = false
) {
  const result = await db.query<{ result: { status: string; diveSiteId?: string } }>(
    'SELECT public.review_dive_site_suggestion($1::uuid, $2, $3, $4::uuid, $5) AS result',
    [id, action, reason, existingSiteId, addAlias]
  )
  return result.rows[0].result
}

async function submissionId (normalizedName: string) {
  await db.exec('RESET ROLE')
  const result = await db.query<{ id: string }>(
    'SELECT id FROM public.dive_site_submissions WHERE normalized_name = $1',
    [normalizedName]
  )
  return result.rows[0]?.id
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
    CREATE FUNCTION public.is_app_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
      $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;
    INSERT INTO profiles VALUES ('${owner}', 'standard'), ('${admin}', 'admin'), ('${other}', 'standard');
    CREATE TABLE public.countries(id uuid PRIMARY KEY, name text NOT NULL);
    CREATE TABLE public.dive_sites(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      country_id uuid NOT NULL REFERENCES public.countries(id),
      UNIQUE(name, country_id)
    );
    ALTER TABLE public.dive_sites ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Public can read dive sites" ON public.dive_sites FOR SELECT USING (true);
    CREATE TABLE public.divemaster_profiles(
      user_id uuid PRIMARY KEY REFERENCES public.profiles(id),
      favorite_local_dive_site_id uuid,
      favorite_destination_dive_site_id uuid
    );
    CREATE TABLE public.divemaster_dive_sites(
      user_id uuid NOT NULL REFERENCES public.divemaster_profiles(user_id),
      dive_site_id uuid NOT NULL REFERENCES public.dive_sites(id),
      note text,
      sort_order integer NOT NULL DEFAULT 0,
      PRIMARY KEY(user_id, dive_site_id)
    );
    INSERT INTO public.divemaster_profiles(user_id) VALUES ('${owner}'), ('${other}');
    GRANT SELECT ON public.countries, public.dive_sites TO anon, authenticated;
    GRANT SELECT ON public.divemaster_profiles, public.divemaster_dive_sites TO authenticated;
    INSERT INTO countries VALUES ('${fiji}', 'Fiji'), ('${belize}', 'Belize');
  `)
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261025140000_dive_site_suggestions.sql', import.meta.url), 'utf8'))
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261025141000_dive_site_suggestion_profiles.sql', import.meta.url), 'utf8'))
}, 30000)

afterAll(async () => { await db?.close() })

describe('dive site suggestion privacy and moderation', () => {
  it('keeps suggestions private and makes normalized pending duplicates idempotent', async () => {
    await asUser(owner)
    const first = await submit('Blue Hole')
    expect(first.status).toBe('pending')
    expect(first.id).toBeTruthy()
    expect((await submit('  BLUE   HOLE ')).id).toBe(first.id)
    expect((await db.query('SELECT * FROM public.dive_site_submissions')).rows).toHaveLength(1)

    await asUser(other)
    expect((await submit('Blue Hole')).status).toBe('already_pending')
    expect((await db.query('SELECT * FROM public.dive_site_submissions')).rows).toHaveLength(0)
  })

  it('does not publish before admin approval and publishes the site on approval', async () => {
    await asUser(owner)
    await submit('Rainbow Reef', fiji)
    expect((await db.query("SELECT name FROM public.dive_sites WHERE name = 'Rainbow Reef'")).rows).toHaveLength(0)

    const id = await submissionId('rainbow reef')
    await asUser(admin)
    const result = await review(id, 'approve')
    expect(result.status).toBe('approved')

    await db.exec('RESET ROLE; SET ROLE anon')
    const site = await db.query<{ name: string; country_id: string }>("SELECT name, country_id FROM public.dive_sites WHERE name = 'Rainbow Reef'")
    expect(site.rows).toEqual([{ name: 'Rainbow Reef', country_id: fiji }])
    await expect(db.query('SELECT * FROM public.dive_site_submissions')).rejects.toMatchObject({ code: '42501' })
  })

  it('detects already listed sites by normalized name and country', async () => {
    await db.exec('RESET ROLE')
    await db.exec(`INSERT INTO public.dive_sites(name, country_id) VALUES ('Shark Point', '${fiji}')`)
    await asUser(owner)
    expect((await submit('  SHARK   POINT ')).status).toBe('existing')
    expect((await submit('Shark Point', belize)).status).toBe('pending')
  })

  it('merges a submission if an equivalent site is added before review', async () => {
    await asUser(owner)
    await submit('Garden of Eden', fiji)
    await db.exec('RESET ROLE')
    await db.exec(`INSERT INTO public.dive_sites(name, country_id) VALUES ('  garden   of eden ', '${fiji}')`)
    const id = await submissionId('garden of eden')
    await asUser(admin)
    expect((await review(id, 'approve')).status).toBe('merged')
    expect((await db.query("SELECT COUNT(*)::int AS count FROM public.dive_sites WHERE lower(name) LIKE '%garden%'")).rows[0].count).toBe(1)
  })

  it('requires an admin to approve or reject and stores rejection reasons privately', async () => {
    await asUser(owner)
    await submit('Blue Lagoon', belize)
    const id = await submissionId('blue lagoon')
    await asUser(owner)
    await expect(review(id, 'approve')).rejects.toMatchObject({ code: '42501' })

    await asUser(admin)
    await expect(review(id, 'reject')).rejects.toMatchObject({ code: '22023' })
    expect((await review(id, 'reject', 'Duplicate listing.')).status).toBe('rejected')
    await asUser(other)
    expect((await db.query('SELECT * FROM public.dive_site_submissions')).rows).toHaveLength(0)
  })

  it('rejects invalid countries and anonymous submission attempts', async () => {
    await asUser(owner)
    await expect(submit('Unknown Coast', '20000000-0000-0000-0000-000000000001')).rejects.toMatchObject({ code: '22023' })
    await db.exec('RESET ROLE')
    await db.query("SELECT set_config('request.jwt.claim.sub', '', false)")
    await db.exec('SET ROLE anon')
    await expect(submit('Anonymous Reef')).rejects.toMatchObject({ code: '42501' })
  })

  it('stores saved pending links privately and resolves favorite, note, and order on approval', async () => {
    await asUser(owner)
    const suggestion = await submit('Manta Garden', fiji)
    await db.query(
      'SELECT public.save_divemaster_pending_dive_sites($1::uuid, NULL, $2::jsonb)',
      [suggestion.id, JSON.stringify([{ submission_id: suggestion.id, note: 'Mantas here', sort_order: 2 }])]
    )
    expect((await db.query('SELECT * FROM public.divemaster_pending_dive_sites')).rows).toHaveLength(2)

    await asUser(other)
    expect((await db.query('SELECT * FROM public.divemaster_pending_dive_sites')).rows).toHaveLength(0)
    await db.exec('RESET ROLE; SET ROLE anon')
    await expect(db.query('SELECT * FROM public.divemaster_pending_dive_sites')).rejects.toMatchObject({ code: '42501' })

    const id = await submissionId('manta garden')
    await asUser(admin)
    const result = await review(id, 'approve')
    expect(result.status).toBe('approved')
    const favorite = await db.query<{ favorite_local_dive_site_id: string }>(
      `SELECT favorite_local_dive_site_id FROM public.divemaster_profiles WHERE user_id = '${owner}'`
    )
    expect(favorite.rows[0].favorite_local_dive_site_id).toBe(result.diveSiteId)
    const visited = await db.query<{ note: string; sort_order: number }>(
      `SELECT note, sort_order FROM public.divemaster_dive_sites WHERE user_id = '${owner}'`
    )
    expect(visited.rows).toEqual([{ note: 'Mantas here', sort_order: 2 }])
    expect((await db.query('SELECT * FROM public.divemaster_pending_dive_sites')).rows).toHaveLength(0)
  })

  it('does not reattach a pending site removed before admin approval', async () => {
    await asUser(owner)
    const suggestion = await submit('Coral Window', belize)
    await db.query(
      'SELECT public.save_divemaster_pending_dive_sites(NULL, $1::uuid, $2::jsonb)',
      [suggestion.id, JSON.stringify([])]
    )
    await db.query(
      'SELECT public.save_divemaster_pending_dive_sites(NULL, NULL, $1::jsonb)',
      [JSON.stringify([])]
    )

    const id = await submissionId('coral window')
    await asUser(admin)
    const result = await review(id, 'approve')
    expect(result.status).toBe('approved')
    const favorite = await db.query<{ favorite_destination_dive_site_id: string | null }>(
      `SELECT favorite_destination_dive_site_id FROM public.divemaster_profiles WHERE user_id = '${owner}'`
    )
    expect(favorite.rows[0].favorite_destination_dive_site_id).toBeNull()
    expect((await db.query(
      'SELECT * FROM public.divemaster_dive_sites WHERE user_id = $1::uuid AND dive_site_id = $2::uuid',
      [owner, result.diveSiteId]
    )).rows).toHaveLength(0)
  })

  it('merges to a same-country site and indexes the submitted name only when approved as an alias', async () => {
    await db.exec('RESET ROLE')
    const canonical = await db.query<{ id: string }>(
      `INSERT INTO public.dive_sites(name, country_id) VALUES ('Garden Reef', '${fiji}') RETURNING id`
    )
    await asUser(owner)
    const suggestion = await submit('Garden of Reefs', fiji)
    const id = await submissionId('garden of reefs')
    const wrongCountry = await db.query<{ id: string }>(
      `INSERT INTO public.dive_sites(name, country_id) VALUES ('Belize Reef', '${belize}') RETURNING id`
    )
    await asUser(admin)
    await expect(review(id, 'merge', null, wrongCountry.rows[0].id)).rejects.toMatchObject({ code: '22023' })
    const merged = await review(id, 'merge', null, canonical.rows[0].id, true)
    expect(merged.status).toBe('merged')
    expect((await db.query(
      `SELECT dive_site_id FROM public.dive_site_aliases WHERE normalized_name = 'garden of reefs'`
    )).rows).toEqual([{ dive_site_id: canonical.rows[0].id }])
    await asUser(owner)
    expect((await submit('Garden of Reefs', fiji)).status).toBe('existing')
    expect(suggestion.id).toBeTruthy()
  })

  it('blocks ordinary users from writing canonical sites while allowing admins', async () => {
    await asUser(owner)
    await expect(db.query(
      `INSERT INTO public.dive_sites(name, country_id) VALUES ('Unreviewed Reef', $1::uuid)`,
      [fiji]
    )).rejects.toMatchObject({ code: '42501' })
    await asUser(admin)
    const result = await db.query<{ id: string }>(
      `INSERT INTO public.dive_sites(name, country_id) VALUES ('Admin Reef', $1::uuid) RETURNING id`,
      [fiji]
    )
    expect(result.rows[0].id).toBeTruthy()
    await asUser(owner)
    const blockedUpdate = await db.query(
      `UPDATE public.dive_sites SET name = 'Changed Reef' WHERE id = $1::uuid RETURNING id`,
      [result.rows[0].id]
    )
    expect(blockedUpdate.rows).toHaveLength(0)
    await asUser(admin)
    const adminUpdate = await db.query(
      `UPDATE public.dive_sites SET name = 'Admin Reef Updated' WHERE id = $1::uuid RETURNING id`,
      [result.rows[0].id]
    )
    expect(adminUpdate.rows).toHaveLength(1)
  })

  it('returns bounded similar-site candidates only from the selected country', async () => {
    await db.exec('RESET ROLE')
    const site = await db.query<{ id: string }>(
      `INSERT INTO public.dive_sites(name, country_id) VALUES ('Coral Rainbow Garden', '${fiji}') RETURNING id`
    )
    await asUser(owner)
    const matches = await db.query<{ id: string; similarity: string }>(
      'SELECT id, similarity FROM public.find_similar_dive_sites($1, $2::uuid)',
      ['Coral Rainbwo Garden', fiji]
    )
    expect(matches.rows[0].id).toBe(site.rows[0].id)
    expect(Number(matches.rows[0].similarity)).toBeGreaterThan(0.2)
    expect(matches.rows.length).toBeLessThanOrEqual(8)
    const otherCountry = await db.query<{ id: string; country_id: string }>(
      'SELECT id, country_id FROM public.find_similar_dive_sites($1, $2::uuid)',
      ['Coral Rainbwo Garden', belize]
    )
    expect(otherCountry.rows.every(row => row.country_id === belize)).toBe(true)
    expect(otherCountry.rows.some(row => row.id === site.rows[0].id)).toBe(false)
  })
})
