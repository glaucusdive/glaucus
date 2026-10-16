-- Admin approve/unpublish uses the service-role client (no auth.uid()).
-- Owner status guard must allow service_role, matching profiles_role_change_guard.

CREATE OR REPLACE FUNCTION public.divemaster_profiles_owner_status_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server/admin paths (service role) and in-app admins may change any status.
  IF auth.role() = 'service_role' OR public.is_app_admin() THEN
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

COMMENT ON FUNCTION public.divemaster_profiles_owner_status_guard() IS
  'Owners may only move draft → pending_review. Admins (JWT) and service_role may change any status.';
