CREATE TABLE public.profile_credential_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('training', 'certification')),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 120),
  agency TEXT NOT NULL DEFAULT '' CHECK (char_length(agency) <= 80),
  normalized_name TEXT GENERATED ALWAYS AS (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) STORED,
  normalized_agency TEXT GENERATED ALWAYS AS (lower(regexp_replace(btrim(agency), '\s+', ' ', 'g'))) STORED,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((kind = 'training' AND agency = '') OR (kind = 'certification' AND btrim(agency) <> '')),
  UNIQUE (kind, normalized_name, normalized_agency)
);

INSERT INTO public.profile_credential_catalog(kind, name, agency)
SELECT 'certification', btrim(course.certification_name), btrim(agency.name)
FROM public.courses AS course
JOIN public.agencies AS agency ON agency.id = course.agency_id
WHERE char_length(btrim(course.certification_name)) BETWEEN 3 AND 120
  AND char_length(btrim(agency.name)) BETWEEN 1 AND 80
  AND lower(btrim(course.certification_name)) <> 'other'
ORDER BY course.certification_name, agency.name
ON CONFLICT (kind, normalized_name, normalized_agency) DO NOTHING;

CREATE TABLE public.profile_credential_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('training', 'certification')),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 120),
  agency TEXT NOT NULL DEFAULT '' CHECK (char_length(agency) <= 80),
  normalized_name TEXT GENERATED ALWAYS AS (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) STORED,
  normalized_agency TEXT GENERATED ALWAYS AS (lower(regexp_replace(btrim(agency), '\s+', ' ', 'g'))) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'merged', 'rejected')),
  catalog_id UUID REFERENCES public.profile_credential_catalog(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  CHECK ((kind = 'training' AND agency = '') OR (kind = 'certification' AND btrim(agency) <> '')),
  UNIQUE (created_by, kind, normalized_name, normalized_agency)
);
CREATE INDEX profile_credential_submissions_queue_idx ON public.profile_credential_submissions(status, created_at);
CREATE INDEX profile_credential_submissions_owner_idx ON public.profile_credential_submissions(created_by, created_at);

ALTER TABLE public.profile_credential_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_credential_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read approved credential names" ON public.profile_credential_catalog FOR SELECT USING (true);
CREATE POLICY "Read own credential submissions" ON public.profile_credential_submissions FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_app_admin());
REVOKE ALL ON public.profile_credential_catalog, public.profile_credential_submissions FROM anon, authenticated;
GRANT SELECT ON public.profile_credential_catalog TO anon, authenticated;
GRANT SELECT ON public.profile_credential_submissions TO authenticated;

CREATE FUNCTION public.submit_profile_credential(p_kind TEXT, p_name TEXT, p_agency TEXT DEFAULT '')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  actor UUID := auth.uid();
  clean_name TEXT := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  clean_agency TEXT := CASE WHEN p_kind = 'training' THEN '' ELSE regexp_replace(btrim(coalesce(p_agency, '')), '\s+', ' ', 'g') END;
  entry public.profile_credential_catalog%ROWTYPE;
  request public.profile_credential_submissions%ROWTYPE;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('training', 'certification') OR char_length(clean_name) NOT BETWEEN 3 AND 120
    OR lower(clean_name) = 'other' OR char_length(clean_agency) > 80 THEN
    RAISE EXCEPTION 'Invalid credential suggestion' USING ERRCODE = '22023';
  END IF;
  IF p_kind = 'certification' AND NOT EXISTS (SELECT 1 FROM public.agencies WHERE lower(btrim(name)) = lower(clean_agency)) THEN
    RAISE EXCEPTION 'Select an existing agency' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('profile-credential:' || actor::text, 0));
  SELECT * INTO entry FROM public.profile_credential_catalog
    WHERE kind = p_kind AND normalized_name = lower(clean_name) AND normalized_agency = lower(clean_agency);
  IF FOUND THEN RETURN jsonb_build_object('id', entry.id, 'status', 'existing', 'name', entry.name, 'agency', entry.agency); END IF;
  SELECT * INTO request FROM public.profile_credential_submissions
    WHERE created_by = actor AND kind = p_kind AND normalized_name = lower(clean_name) AND normalized_agency = lower(clean_agency);
  IF FOUND THEN RETURN jsonb_build_object('id', request.id, 'status', request.status, 'name', request.name, 'agency', request.agency); END IF;
  IF (SELECT count(*) FROM public.profile_credential_submissions WHERE created_by = actor AND status = 'pending') >= 10
    OR (SELECT count(*) FROM public.profile_credential_submissions WHERE created_by = actor AND created_at > NOW() - INTERVAL '1 minute') >= 10 THEN
    RAISE EXCEPTION 'Suggestion limit reached' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.profile_credential_submissions(created_by, kind, name, agency)
    VALUES (actor, p_kind, clean_name, clean_agency) RETURNING * INTO request;
  RETURN jsonb_build_object('id', request.id, 'status', request.status, 'name', request.name, 'agency', request.agency);
END;
$$;

CREATE FUNCTION public.review_profile_credential(p_id UUID, p_action TEXT, p_target_name TEXT DEFAULT NULL, p_add_alias BOOLEAN DEFAULT false, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  request public.profile_credential_submissions%ROWTYPE;
  entry public.profile_credential_catalog%ROWTYPE;
  canonical_name TEXT;
  final_status TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_app_admin() THEN RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501'; END IF;
  IF p_action IS NULL OR p_action NOT IN ('approve', 'merge', 'reject') THEN RAISE EXCEPTION 'Invalid action' USING ERRCODE = '22023'; END IF;
  SELECT * INTO request FROM public.profile_credential_submissions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Suggestion not found' USING ERRCODE = 'P0002'; END IF;
  IF request.status <> 'pending' THEN RAISE EXCEPTION 'Suggestion already reviewed' USING ERRCODE = '40001'; END IF;
  IF p_action = 'reject' THEN
    IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Rejection reason required' USING ERRCODE = '22023'; END IF;
    UPDATE public.profile_credential_submissions SET status = 'rejected', rejection_reason = btrim(p_reason), reviewed_at = NOW(), reviewed_by = auth.uid() WHERE id = p_id;
    RETURN jsonb_build_object('id', p_id, 'status', 'rejected');
  END IF;
  canonical_name := CASE WHEN p_action = 'merge' THEN regexp_replace(btrim(coalesce(p_target_name, '')), '\s+', ' ', 'g') ELSE request.name END;
  IF char_length(canonical_name) NOT BETWEEN 3 AND 120 OR lower(canonical_name) = 'other' THEN RAISE EXCEPTION 'Canonical name required' USING ERRCODE = '22023'; END IF;
  IF p_action = 'merge' AND NOT (
    request.kind = 'training'
    OR
    EXISTS (SELECT 1 FROM public.profile_credential_catalog WHERE kind = request.kind AND normalized_name = lower(canonical_name) AND normalized_agency = request.normalized_agency)
    OR (request.kind = 'certification' AND EXISTS (
      SELECT 1 FROM public.courses AS course JOIN public.agencies AS agency ON agency.id = course.agency_id
      WHERE lower(btrim(course.certification_name)) = lower(canonical_name) AND lower(btrim(agency.name)) = request.normalized_agency
    ))
  ) THEN RAISE EXCEPTION 'Choose an existing credential in the same agency' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.profile_credential_catalog(kind, name, agency) VALUES (request.kind, canonical_name, request.agency)
    ON CONFLICT (kind, normalized_name, normalized_agency) DO UPDATE SET name = public.profile_credential_catalog.name
    RETURNING * INTO entry;
  IF p_action = 'merge' AND p_add_alias AND lower(request.name) <> entry.normalized_name THEN
    UPDATE public.profile_credential_catalog SET aliases = ARRAY(SELECT DISTINCT value FROM unnest(aliases || ARRAY[request.name]) AS value)
      WHERE id = entry.id;
  END IF;
  final_status := CASE WHEN p_action = 'merge' THEN 'merged' ELSE 'approved' END;
  UPDATE public.profile_credential_submissions SET status = final_status, catalog_id = entry.id, reviewed_at = NOW(), reviewed_by = auth.uid() WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id, 'status', final_status, 'catalog_id', entry.id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_profile_credential(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_profile_credential(UUID, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_profile_credential(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_profile_credential(UUID, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;