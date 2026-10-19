-- Lock down diveshops writes and public reads.
-- Shop pages and search read through the service role. Admin screens keep the user JWT,
-- so admins need their own SELECT policy before public SELECT is removed.
-- There is no shop-owner user column. Portal owners submit changes; they do not UPDATE diveshops.
-- Apply this only with the server-read deploy. Staging and production share this database.

-- Admins can read every shop column (required for UPDATE to see rows).
DROP POLICY IF EXISTS "Admins read diveshops" ON diveshops;
CREATE POLICY "Admins read diveshops" ON diveshops
  FOR SELECT TO authenticated
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Allow authenticated users to insert" ON diveshops;
CREATE POLICY "Admins insert diveshops" ON diveshops
  FOR INSERT TO authenticated
  WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "Allow authenticated users to update" ON diveshops;
CREATE POLICY "Admins update diveshops" ON diveshops
  FOR UPDATE TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- Junction writes: keep the existing "Admins manage diveshop_*" policies.
-- Drop the blanket authenticated insert/update/delete policies. Public SELECT stays
-- so booking course and site lookups keep working.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'diveshop_courses',
    'diveshop_rental_equipment',
    'diveshop_gases',
    'diveshop_dive_sites'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to insert" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to update" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users to delete" ON %I', tbl);
  END LOOP;
END $$;

-- Published divemaster profile rows were readable in full, including email and diver defaults.
-- The public divemaster page reads through the service role. Own-row profile access stays.
DROP POLICY IF EXISTS "Public can read published divemaster profiles" ON public.profiles;

-- Anon and authenticated visitors can no longer dump the shop table.
DROP POLICY IF EXISTS "Allow public read access" ON diveshops;
