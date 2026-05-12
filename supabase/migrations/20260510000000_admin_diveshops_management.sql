-- Admin dive shop management policies.
-- Adds DELETE for app admins on diveshops + cleans up missing junction DELETE policies.
-- Admin status is sourced from profiles.role (see 20260510000001_profiles_role_column.sql);
-- server endpoints (server/api/admin/shops/*) re-verify admin before issuing writes.
-- INSERT/UPDATE remain "authenticated" because they are already used by /api/geocode-shop and migration tooling;
-- the new server endpoints are the only UI path and gate by admin role.

-- Diveshops: admins can delete a shop. Cascades to diveshop_* junctions, booking_drafts, shop_reviews, booking_submissions.
DROP POLICY IF EXISTS "Admins delete any diveshop" ON diveshops;
CREATE POLICY "Admins delete any diveshop" ON diveshops
    FOR DELETE TO authenticated
    USING (public.is_app_admin());

-- Diveshop junction tables already allow authenticated DELETE (see 20250228000009) but make sure admins can
-- always manage them without being blocked by future policy tightening. These are idempotent.
DROP POLICY IF EXISTS "Admins manage diveshop_courses" ON diveshop_courses;
CREATE POLICY "Admins manage diveshop_courses" ON diveshop_courses
    FOR ALL TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "Admins manage diveshop_rental_equipment" ON diveshop_rental_equipment;
CREATE POLICY "Admins manage diveshop_rental_equipment" ON diveshop_rental_equipment
    FOR ALL TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "Admins manage diveshop_gases" ON diveshop_gases;
CREATE POLICY "Admins manage diveshop_gases" ON diveshop_gases
    FOR ALL TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "Admins manage diveshop_dive_sites" ON diveshop_dive_sites;
CREATE POLICY "Admins manage diveshop_dive_sites" ON diveshop_dive_sites
    FOR ALL TO authenticated
    USING (public.is_app_admin())
    WITH CHECK (public.is_app_admin());

COMMENT ON POLICY "Admins delete any diveshop" ON diveshops IS
  'Lets app admins delete dive shops via /admin/shops UI. Cascades to junctions, booking_drafts, shop_reviews, booking_submissions.';
