-- Allow app admins (JWT app_metadata) to delete any shop review, in addition to authors deleting their own.

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  )
  OR COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
$$;

COMMENT ON FUNCTION public.is_app_admin() IS
  'True when JWT app_metadata.role = admin or app_metadata.is_admin is true. Set via Supabase Dashboard (User → App metadata) or Auth Admin API; user must refresh session to pick up JWT changes.';

DROP POLICY IF EXISTS "Admins delete any shop reviews" ON shop_reviews;
CREATE POLICY "Admins delete any shop reviews" ON shop_reviews
    FOR DELETE TO authenticated
    USING (public.is_app_admin());
