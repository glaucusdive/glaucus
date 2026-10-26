import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const owner = '00000000-0000-0000-0000-000000000001'
const admin = '00000000-0000-0000-0000-000000000002'
let db: PGlite

async function asUser (id: string, role = 'authenticated') {
  await db.exec('RESET ROLE')
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id])
  await db.query("SELECT set_config('request.jwt.claim.role', $1, false)", [role])
  await db.exec(`SET ROLE ${role}`)
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.role', true), '') $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY, role text NOT NULL, username text);
    CREATE FUNCTION public.is_app_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS
      $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') $$;
    INSERT INTO profiles VALUES ('${owner}', 'standard', 'owner'), ('${admin}', 'admin', 'admin');
    CREATE TABLE public.divemaster_profiles(user_id uuid PRIMARY KEY REFERENCES public.profiles(id), status text NOT NULL);
    INSERT INTO divemaster_profiles VALUES ('${owner}', 'published');
    GRANT SELECT ON public.divemaster_profiles TO anon, authenticated;
    CREATE TABLE public.divemaster_certifications(
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.divemaster_profiles(user_id),
      name text NOT NULL,
      agency text,
      cert_number text,
      issued_at date,
      expires_at date,
      image_url text,
      students_certified integer NOT NULL DEFAULT 0,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.divemaster_certifications ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Owners manage own certifications"
      ON public.divemaster_certifications FOR ALL
      USING (auth.uid() = user_id OR public.is_app_admin())
      WITH CHECK (auth.uid() = user_id OR public.is_app_admin());
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.divemaster_certifications TO anon, authenticated;
    INSERT INTO divemaster_certifications(user_id, name) VALUES ('${owner}', 'Existing certificate');
  `)
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261025150000_divemaster_certification_review.sql', import.meta.url), 'utf8'))
})

afterAll(async () => {
  await db.close()
})

describe('divemaster certification review', () => {
  it('keeps existing certifications approved and marks new owner inserts pending', async () => {
    await asUser(owner)
    const result = await db.query<{ name: string; approval_status: string }>(
      'SELECT name, approval_status FROM divemaster_certifications ORDER BY name'
    )
    expect(result.rows).toEqual([{ name: 'Existing certificate', approval_status: 'approved' }])

    await db.query(
      "INSERT INTO divemaster_certifications(user_id, name, approval_status) VALUES ($1, 'New certificate', 'approved')",
      [owner]
    )
    const inserted = await db.query<{ approval_status: string }>(
      "SELECT approval_status FROM divemaster_certifications WHERE name = 'New certificate'"
    )
    expect(inserted.rows[0].approval_status).toBe('pending')

    await asUser('00000000-0000-0000-0000-000000000099', 'anon')
    const publicRows = await db.query<{ name: string }>(
      'SELECT name FROM divemaster_certifications ORDER BY name'
    )
    expect(publicRows.rows.map(row => row.name)).toEqual(['Existing certificate'])
  })

  it('does not allow owners to approve their own submissions', async () => {
    await asUser(owner)
    await expect(db.query(
      "UPDATE divemaster_certifications SET approval_status = 'approved' WHERE name = 'New certificate'"
    )).rejects.toThrow('Only an admin can change certification review status or audit fields')
    await expect(db.query(
      "UPDATE divemaster_certifications SET reviewed_by = $1 WHERE name = 'New certificate'",
      [admin]
    )).rejects.toThrow('Only an admin can change certification review status or audit fields')
  })

  it('allows admins to approve pending certificates while public users see approved ones only', async () => {
    await asUser(admin)
    await db.query("UPDATE divemaster_certifications SET approval_status = 'approved' WHERE name = 'New certificate'")

    await asUser('00000000-0000-0000-0000-000000000099', 'anon')
    const publicRows = await db.query<{ name: string }>(
      'SELECT name FROM divemaster_certifications ORDER BY name'
    )
    expect(publicRows.rows.map(row => row.name)).toEqual(['Existing certificate', 'New certificate'])
  })
})
