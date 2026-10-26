CREATE TABLE public.dive_site_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 120),
  normalized_name TEXT GENERATED ALWAYS AS (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) STORED,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'merged', 'rejected')),
  dive_site_id UUID REFERENCES public.dive_sites(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id),
  CHECK (status <> 'rejected' OR rejection_reason IS NOT NULL)
);

CREATE INDEX dive_site_submissions_queue_idx ON public.dive_site_submissions(status, created_at DESC);
CREATE UNIQUE INDEX dive_site_submissions_pending_name_country_idx
  ON public.dive_site_submissions(country_id, normalized_name)
  WHERE status = 'pending';

ALTER TABLE public.dive_site_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can review dive site submissions"
  ON public.dive_site_submissions FOR SELECT TO authenticated
  USING (public.is_app_admin());
REVOKE ALL ON public.dive_site_submissions FROM anon, authenticated;
GRANT SELECT ON public.dive_site_submissions TO authenticated;

CREATE FUNCTION public.submit_dive_site_suggestion(p_name TEXT, p_country_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor UUID := auth.uid();
  clean_name TEXT := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  normalized TEXT;
  existing_site public.dive_sites%ROWTYPE;
  pending_request public.dive_site_submissions%ROWTYPE;
  created_request public.dive_site_submissions%ROWTYPE;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF char_length(clean_name) NOT BETWEEN 3 AND 120 OR p_country_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.countries WHERE id = p_country_id) THEN
    RAISE EXCEPTION 'Invalid dive site suggestion' USING ERRCODE = '22023';
  END IF;

  normalized := lower(clean_name);
  PERFORM pg_advisory_xact_lock(hashtextextended('dive-site-suggestion:' || p_country_id::text || ':' || normalized, 0));

  SELECT * INTO existing_site
    FROM public.dive_sites
    WHERE country_id = p_country_id
      AND lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = normalized
    LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'existing', 'name', existing_site.name);
  END IF;

  SELECT * INTO pending_request
    FROM public.dive_site_submissions
    WHERE country_id = p_country_id AND normalized_name = normalized AND status = 'pending'
    LIMIT 1;
  IF FOUND THEN
    IF pending_request.created_by = actor THEN
      RETURN jsonb_build_object('status', 'already_pending', 'name', pending_request.name);
    END IF;
    RETURN jsonb_build_object('status', 'already_pending');
  END IF;

  IF (SELECT count(*) FROM public.dive_site_submissions WHERE created_by = actor AND status = 'pending') >= 10
    OR (SELECT count(*) FROM public.dive_site_submissions WHERE created_by = actor AND created_at > NOW() - INTERVAL '1 minute') >= 10 THEN
    RAISE EXCEPTION 'Suggestion limit reached' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.dive_site_submissions(created_by, name, country_id)
    VALUES (actor, clean_name, p_country_id)
    RETURNING * INTO created_request;
  RETURN jsonb_build_object('status', 'pending', 'name', created_request.name);
END;
$$;

CREATE FUNCTION public.review_dive_site_suggestion(p_id UUID, p_action TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  request public.dive_site_submissions%ROWTYPE;
  existing_site public.dive_sites%ROWTYPE;
  new_site public.dive_sites%ROWTYPE;
  clean_reason TEXT := btrim(coalesce(p_reason, ''));
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid review action' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO request FROM public.dive_site_submissions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Suggestion not found' USING ERRCODE = 'P0002'; END IF;
  IF request.status <> 'pending' THEN RAISE EXCEPTION 'Suggestion already reviewed' USING ERRCODE = '40001'; END IF;

  IF p_action = 'reject' THEN
    IF char_length(clean_reason) NOT BETWEEN 3 AND 500 THEN
      RAISE EXCEPTION 'Rejection reason required' USING ERRCODE = '22023';
    END IF;
    UPDATE public.dive_site_submissions
      SET status = 'rejected', rejection_reason = clean_reason, reviewed_at = NOW(), reviewed_by = auth.uid()
      WHERE id = p_id;
    RETURN jsonb_build_object('id', p_id, 'status', 'rejected');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'dive-site-suggestion:' || request.country_id::text || ':' || request.normalized_name, 0
  ));
  SELECT * INTO existing_site
    FROM public.dive_sites
    WHERE country_id = request.country_id
      AND lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = request.normalized_name
    LIMIT 1;
  IF FOUND THEN
    UPDATE public.dive_site_submissions
      SET status = 'merged', dive_site_id = existing_site.id, reviewed_at = NOW(), reviewed_by = auth.uid()
      WHERE id = p_id;
    RETURN jsonb_build_object('id', p_id, 'status', 'merged', 'diveSiteId', existing_site.id);
  END IF;

  INSERT INTO public.dive_sites(name, country_id)
    VALUES (request.name, request.country_id)
    RETURNING * INTO new_site;
  UPDATE public.dive_site_submissions
    SET status = 'approved', dive_site_id = new_site.id, reviewed_at = NOW(), reviewed_by = auth.uid()
    WHERE id = p_id;
  RETURN jsonb_build_object('id', p_id, 'status', 'approved', 'diveSiteId', new_site.id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_dive_site_suggestion(TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_dive_site_suggestion(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_dive_site_suggestion(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_dive_site_suggestion(UUID, TEXT, TEXT) TO authenticated;
