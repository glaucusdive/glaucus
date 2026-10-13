-- Username change cooldown (90 days) + permanent redirects from old slugs.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.username_changed_at IS
  'When username was last set or changed. Changes are limited to once every 90 days (admins exempt).';

-- Existing usernames: start the 90-day clock from migration time.
UPDATE public.profiles
SET username_changed_at = NOW()
WHERE username IS NOT NULL
  AND username_changed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.profile_username_redirects (
  old_username TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_username_redirects_format CHECK (
    char_length(old_username) BETWEEN 3 AND 32
    AND old_username ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

CREATE INDEX IF NOT EXISTS idx_profile_username_redirects_user_id
  ON public.profile_username_redirects (user_id);

COMMENT ON TABLE public.profile_username_redirects IS
  'Maps retired usernames to the owning profile for /divemaster/[username] 301 redirects. Live profiles.username always wins over a redirect.';

ALTER TABLE public.profile_username_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read username redirects" ON public.profile_username_redirects;
CREATE POLICY "Public read username redirects"
  ON public.profile_username_redirects FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage username redirects" ON public.profile_username_redirects;
CREATE POLICY "Admins manage username redirects"
  ON public.profile_username_redirects FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- Enforce cooldown + bookkeeping when username changes.
CREATE OR REPLACE FUNCTION public.profiles_username_change_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cooldown interval := interval '90 days';
  is_privileged boolean;
BEGIN
  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  -- Normalize to lowercase (client should already; belt-and-suspenders).
  IF NEW.username IS NOT NULL THEN
    NEW.username := lower(NEW.username);
  END IF;

  is_privileged :=
    auth.uid() IS NULL
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');

  -- Changing an existing username: enforce 90-day cooldown (unless admin/service).
  IF OLD.username IS NOT NULL AND NEW.username IS DISTINCT FROM OLD.username THEN
    IF NOT is_privileged
       AND OLD.username_changed_at IS NOT NULL
       AND OLD.username_changed_at > (NOW() - cooldown) THEN
      RAISE EXCEPTION 'USERNAME_COOLDOWN: You can change your username again after %',
        (OLD.username_changed_at + cooldown)
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Any set/change stamps the cooldown clock (including first claim).
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    NEW.username_changed_at := NOW();
  END IF;

  -- Claiming a slug that was a redirect for someone else: clear that redirect so live profile wins cleanly later.
  IF NEW.username IS NOT NULL THEN
    DELETE FROM public.profile_username_redirects
    WHERE old_username = NEW.username;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_username_change_guard ON public.profiles;
CREATE TRIGGER profiles_username_change_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_username_change_guard();

-- After a username change from an old value, record redirect.
CREATE OR REPLACE FUNCTION public.profiles_username_redirect_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.username IS NOT NULL
     AND NEW.username IS DISTINCT FROM OLD.username THEN
    INSERT INTO public.profile_username_redirects (old_username, user_id)
    VALUES (lower(OLD.username), NEW.id)
    ON CONFLICT (old_username) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          created_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_username_redirect_after ON public.profiles;
CREATE TRIGGER profiles_username_redirect_after
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_username_redirect_after();
