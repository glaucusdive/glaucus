-- Allow divemaster owners to update published profile content.
-- Status changes remain restricted: owners may only move draft → pending_review;
-- admins may change any status.

DROP POLICY IF EXISTS "Owners update own draft divemaster profile" ON public.divemaster_profiles;
DROP POLICY IF EXISTS "Owners update own divemaster profile" ON public.divemaster_profiles;

CREATE POLICY "Owners update own divemaster profile"
  ON public.divemaster_profiles FOR UPDATE
  USING (
    public.is_app_admin()
    OR (auth.uid() = user_id AND status IN ('draft', 'pending_review', 'published'))
  )
  WITH CHECK (
    public.is_app_admin()
    OR (auth.uid() = user_id AND status IN ('draft', 'pending_review', 'published'))
  );

CREATE OR REPLACE FUNCTION public.divemaster_profiles_owner_status_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_app_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (OLD.status = 'draft' AND NEW.status = 'pending_review') THEN
      RAISE EXCEPTION 'Owners cannot change divemaster status from % to %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS divemaster_profiles_owner_status_guard ON public.divemaster_profiles;
CREATE TRIGGER divemaster_profiles_owner_status_guard
  BEFORE UPDATE ON public.divemaster_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.divemaster_profiles_owner_status_guard();
