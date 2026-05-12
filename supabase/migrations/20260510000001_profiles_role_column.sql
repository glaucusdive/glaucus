-- Move admin role off JWT app_metadata onto a simple profiles.role column.
-- Founder workflow: edit profiles.role in the Supabase Table Editor (dropdown 'standard' | 'admin'),
-- which uses the service_role connection and bypasses RLS / the role-change guard.
-- Regular users cannot self-promote: a BEFORE UPDATE trigger blocks role changes from non-admin sessions.

-- 1. role column with check constraint (used as the dropdown values in the dashboard editor).
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('standard', 'admin'));

COMMENT ON COLUMN public.profiles.role IS
  'App role for this user. Allowed: standard | admin. Editable from Supabase Dashboard Table Editor (service_role bypasses RLS).';

-- 2. One-time migration: anyone previously flagged admin via app_metadata is promoted to profiles.role = admin.
-- Safe to re-run; no-op when nothing matches.
UPDATE public.profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id
  AND p.role <> 'admin'
  AND (
    (u.raw_app_meta_data ->> 'role') = 'admin'
    OR COALESCE((u.raw_app_meta_data ->> 'is_admin')::boolean, false)
  );

-- 3. Redefine is_app_admin(): authoritative source becomes profiles.role.
-- SECURITY DEFINER so it always sees the row, regardless of caller's RLS view.
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_app_admin() IS
  'True when the current user (auth.uid()) has profiles.role = admin. Toggle role in the Supabase Dashboard Table Editor; takes effect on next request, no re-login required.';

-- 4. Prevent non-admin sessions from changing their own (or anyone''s) role via the client API.
-- Service role connections (dashboard, server-side scripts using the service key) bypass this guard.
-- Existing admins can change roles (e.g., demoting a user back to standard).
CREATE OR REPLACE FUNCTION public.profiles_role_change_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
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

DROP TRIGGER IF EXISTS profiles_role_change_guard ON public.profiles;
CREATE TRIGGER profiles_role_change_guard
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.profiles_role_change_guard();

COMMENT ON FUNCTION public.profiles_role_change_guard() IS
  'Blocks profiles.role changes unless the session is service_role (dashboard / server script) or the current user is already an admin.';
