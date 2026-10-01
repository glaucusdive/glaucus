-- Move students-certified counts onto each certification row.
-- Unmatched students_by_cert keys are dropped (orphan counts discarded).

ALTER TABLE public.divemaster_certifications
  ADD COLUMN IF NOT EXISTS students_certified INT NOT NULL DEFAULT 0;

ALTER TABLE public.divemaster_certifications
  DROP CONSTRAINT IF EXISTS divemaster_certifications_students_certified_check;

ALTER TABLE public.divemaster_certifications
  ADD CONSTRAINT divemaster_certifications_students_certified_check
  CHECK (students_certified >= 0);

COMMENT ON COLUMN public.divemaster_certifications.students_certified IS
  'Number of students this divemaster certified under this certification.';

-- Match JSON keys to certification.name (case-insensitive trim); first match wins.
DO $$
DECLARE
  prof RECORD;
  cert_key TEXT;
  cert_val JSONB;
  cert_count NUMERIC;
  matched_id UUID;
BEGIN
  FOR prof IN
    SELECT user_id, students_by_cert
    FROM public.divemaster_profiles
    WHERE students_by_cert IS NOT NULL
      AND students_by_cert <> '{}'::jsonb
  LOOP
    FOR cert_key, cert_val IN
      SELECT key, value
      FROM jsonb_each(prof.students_by_cert)
    LOOP
      IF btrim(cert_key) = '' THEN
        CONTINUE;
      END IF;

      BEGIN
        cert_count := (cert_val #>> '{}')::numeric;
      EXCEPTION WHEN others THEN
        CONTINUE;
      END;

      IF cert_count IS NULL OR cert_count < 0 THEN
        CONTINUE;
      END IF;

      SELECT c.id INTO matched_id
      FROM public.divemaster_certifications c
      WHERE c.user_id = prof.user_id
        AND lower(btrim(c.name)) = lower(btrim(cert_key))
      ORDER BY c.sort_order ASC, c.created_at ASC
      LIMIT 1;

      IF matched_id IS NOT NULL THEN
        UPDATE public.divemaster_certifications
        SET students_certified = floor(cert_count)::int
        WHERE id = matched_id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Clear legacy JSON so APIs no longer serve stale maps.
UPDATE public.divemaster_profiles
SET students_by_cert = '{}'::jsonb
WHERE students_by_cert IS DISTINCT FROM '{}'::jsonb;
