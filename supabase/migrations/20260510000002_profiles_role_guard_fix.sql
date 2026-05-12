-- Fix profiles_role_change_guard to allow the Supabase Dashboard Table Editor.
--
-- The Dashboard's Table Editor connects to the database directly via pg-meta as the
-- `postgres` role -- it does NOT send a JWT. That means inside the trigger:
--   auth.uid()  -> NULL
--   auth.role() -> NULL
-- The previous guard rejected this path and the dropdown change was silently rolled back.
--
-- New logic (allow the write when ANY of these is true):
--   1. There is no authenticated end-user (auth.uid() IS NULL). Only superuser / supabase_admin
--      / pg-meta sessions can reach this path, so it's safe to trust.
--   2. The session is using the service_role JWT (server-side scripts with the service key).
--   3. The current end-user is already an admin (admins can promote/demote others).

CREATE OR REPLACE FUNCTION public.profiles_role_change_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only admins can change profiles.role';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_role_change_guard() IS
  'Blocks profiles.role changes from end-user sessions unless the caller is already an admin. Allows Supabase Dashboard / pg-meta (no JWT) and service_role connections.';
