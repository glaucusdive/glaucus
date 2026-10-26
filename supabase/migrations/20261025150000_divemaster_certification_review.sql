ALTER TABLE public.divemaster_certifications
  ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.divemaster_certifications
  ADD COLUMN reviewed_at TIMESTAMPTZ,
  ADD COLUMN reviewed_by UUID REFERENCES public.profiles(id);

CREATE INDEX divemaster_certifications_pending_review_idx
  ON public.divemaster_certifications(created_at)
  WHERE approval_status = 'pending';

DROP POLICY IF EXISTS "Public read published certifications" ON public.divemaster_certifications;
CREATE POLICY "Public read approved published certifications"
  ON public.divemaster_certifications FOR SELECT
  USING (
    approval_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.divemaster_profiles dm
      WHERE dm.user_id = divemaster_certifications.user_id
        AND dm.status = 'published'
    )
  );

CREATE OR REPLACE FUNCTION public.guard_divemaster_certification_review_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_app_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.approval_status := 'pending';
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
  ELSIF OLD.approval_status IS DISTINCT FROM NEW.approval_status
    OR OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at
    OR OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by THEN
    RAISE EXCEPTION 'Only an admin can change certification review status or audit fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_divemaster_certification_review_status
  ON public.divemaster_certifications;
CREATE TRIGGER guard_divemaster_certification_review_status
  BEFORE INSERT OR UPDATE ON public.divemaster_certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_divemaster_certification_review_status();

COMMENT ON COLUMN public.divemaster_certifications.approval_status IS
  'New owner-submitted certifications require admin review; existing certifications remain approved.';
