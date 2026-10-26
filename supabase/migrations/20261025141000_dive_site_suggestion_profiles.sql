ALTER TABLE public.dive_site_submissions
  ADD COLUMN IF NOT EXISTS normalized_name TEXT GENERATED ALWAYS AS (
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
  ) STORED;

DROP POLICY IF EXISTS "Admins can review dive site submissions" ON public.dive_site_submissions;
CREATE POLICY "Submitters and admins can read dive site submissions"
  ON public.dive_site_submissions FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_app_admin());

CREATE TABLE public.dive_site_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dive_site_id UUID NOT NULL REFERENCES public.dive_sites(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 120),
  normalized_name TEXT GENERATED ALWAYS AS (
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
  ) STORED,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_id, normalized_name)
);

ALTER TABLE public.dive_site_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read approved dive site aliases"
  ON public.dive_site_aliases FOR SELECT TO anon, authenticated
  USING (true);
GRANT SELECT ON public.dive_site_aliases TO anon, authenticated;

CREATE TABLE public.divemaster_pending_dive_sites (
  user_id UUID NOT NULL REFERENCES public.divemaster_profiles(user_id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.dive_site_submissions(id) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK (slot IN ('favorite_local', 'favorite_destination', 'visited')),
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, submission_id, slot)
);

CREATE UNIQUE INDEX divemaster_pending_dive_sites_favorite_slot_idx
  ON public.divemaster_pending_dive_sites(user_id, slot)
  WHERE slot IN ('favorite_local', 'favorite_destination');
CREATE INDEX divemaster_pending_dive_sites_submission_idx
  ON public.divemaster_pending_dive_sites(submission_id);

ALTER TABLE public.divemaster_pending_dive_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and admins can read pending profile sites"
  ON public.divemaster_pending_dive_sites FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_app_admin());
GRANT SELECT ON public.divemaster_pending_dive_sites TO authenticated;

DROP POLICY IF EXISTS "Allow authenticated users to insert" ON public.dive_sites;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON public.dive_sites;
CREATE POLICY "Admins can insert dive sites"
  ON public.dive_sites FOR INSERT TO authenticated
  WITH CHECK (public.is_app_admin());
CREATE POLICY "Admins can update dive sites"
  ON public.dive_sites FOR UPDATE TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());
GRANT SELECT, INSERT, UPDATE ON public.dive_sites TO authenticated;

CREATE OR REPLACE FUNCTION public.dive_site_name_similarity(p_left TEXT, p_right TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public, pg_temp
AS $$
DECLARE
  left_value TEXT := lower(regexp_replace(btrim(p_left), '[^[:alnum:]]+', ' ', 'g'));
  right_value TEXT := lower(regexp_replace(btrim(p_right), '[^[:alnum:]]+', ' ', 'g'));
  left_grams TEXT[];
  right_grams TEXT[];
  intersection_count INTEGER;
  union_count INTEGER;
BEGIN
  IF left_value = right_value THEN RETURN 1; END IF;
  IF char_length(left_value) < 2 OR char_length(right_value) < 2 THEN RETURN 0; END IF;

  SELECT array_agg(DISTINCT substring(left_value FROM i FOR 2))
    INTO left_grams FROM generate_series(1, char_length(left_value) - 1) AS i;
  SELECT array_agg(DISTINCT substring(right_value FROM i FOR 2))
    INTO right_grams FROM generate_series(1, char_length(right_value) - 1) AS i;
  SELECT count(*)::INTEGER INTO intersection_count
    FROM unnest(left_grams) AS gram WHERE gram = ANY(right_grams);
  union_count := cardinality(left_grams) + cardinality(right_grams) - intersection_count;
  RETURN intersection_count::NUMERIC / NULLIF(union_count, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.find_similar_dive_sites(p_name TEXT, p_country_id UUID)
RETURNS TABLE(id UUID, name TEXT, country_id UUID, country_name TEXT, similarity NUMERIC)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  WITH candidates AS (
    SELECT ds.id, ds.name, ds.country_id,
      public.dive_site_name_similarity(ds.name, p_name) AS score
    FROM public.dive_sites ds
    WHERE ds.country_id = p_country_id
    UNION ALL
    SELECT ds.id, ds.name, ds.country_id,
      public.dive_site_name_similarity(alias.name, p_name) AS score
    FROM public.dive_site_aliases alias
    JOIN public.dive_sites ds ON ds.id = alias.dive_site_id
    WHERE alias.country_id = p_country_id
  ), best AS (
    SELECT c.id, max(c.name) AS name, c.country_id, max(c.score) AS score
    FROM candidates c
    WHERE c.score >= 0.2
    GROUP BY c.id, c.country_id
  )
  SELECT b.id, b.name, b.country_id, countries.name, b.score
  FROM best b
  JOIN public.countries ON countries.id = b.country_id
  ORDER BY b.score DESC, b.name
  LIMIT 8;
$$;
GRANT EXECUTE ON FUNCTION public.find_similar_dive_sites(TEXT, UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_dive_site_suggestion(p_name TEXT, p_country_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor UUID := auth.uid();
  clean_name TEXT := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  normalized TEXT;
  existing_site RECORD;
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

  normalized := lower(regexp_replace(btrim(clean_name), '\s+', ' ', 'g'));
  PERFORM pg_advisory_xact_lock(hashtextextended('dive-site-suggestion:' || p_country_id::text || ':' || normalized, 0));

  SELECT ds.id, ds.name INTO existing_site
    FROM public.dive_sites ds
    WHERE ds.country_id = p_country_id
      AND lower(regexp_replace(btrim(ds.name), '\s+', ' ', 'g')) = normalized
    LIMIT 1;
  IF NOT FOUND THEN
    SELECT ds.id, ds.name INTO existing_site
      FROM public.dive_site_aliases alias
      JOIN public.dive_sites ds ON ds.id = alias.dive_site_id
      WHERE alias.country_id = p_country_id AND alias.normalized_name = normalized
      LIMIT 1;
  END IF;
  IF FOUND THEN
    RETURN jsonb_build_object('status', 'existing', 'name', existing_site.name, 'diveSiteId', existing_site.id);
  END IF;

  SELECT * INTO pending_request
    FROM public.dive_site_submissions
    WHERE country_id = p_country_id AND normalized_name = normalized AND status = 'pending'
    LIMIT 1;
  IF FOUND THEN
    IF pending_request.created_by = actor THEN
      RETURN jsonb_build_object(
        'status', 'already_pending',
        'name', pending_request.name,
        'id', pending_request.id
      );
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
  RETURN jsonb_build_object('status', 'pending', 'name', created_request.name, 'id', created_request.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_divemaster_pending_dive_sites(
  p_favorite_local UUID,
  p_favorite_destination UUID,
  p_visited JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor UUID := auth.uid();
BEGIN
  IF actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.divemaster_profiles WHERE user_id = actor
  ) THEN
    RAISE EXCEPTION 'Divemaster profile required' USING ERRCODE = '42501';
  END IF;
  IF p_visited IS NULL OR jsonb_typeof(p_visited) <> 'array' THEN
    RAISE EXCEPTION 'Invalid pending site selections' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(ARRAY[p_favorite_local, p_favorite_destination]) AS favorite_ids(submission_id)
    JOIN public.dive_site_submissions s ON s.id = favorite_ids.submission_id
    WHERE s.created_by <> actor OR s.status NOT IN ('pending', 'rejected')
  ) OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_visited) item
    JOIN public.dive_site_submissions s ON s.id = (item->>'submission_id')::UUID
    WHERE s.created_by <> actor OR s.status NOT IN ('pending', 'rejected')
  ) THEN
    RAISE EXCEPTION 'One or more pending sites are unavailable' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.divemaster_pending_dive_sites WHERE user_id = actor;
  INSERT INTO public.divemaster_pending_dive_sites(user_id, submission_id, slot)
    SELECT actor, p_favorite_local, 'favorite_local' WHERE p_favorite_local IS NOT NULL
    UNION ALL
    SELECT actor, p_favorite_destination, 'favorite_destination' WHERE p_favorite_destination IS NOT NULL;
  INSERT INTO public.divemaster_pending_dive_sites(user_id, submission_id, slot, note, sort_order)
    SELECT DISTINCT ON ((item->>'submission_id')::UUID)
      actor,
      (item->>'submission_id')::UUID,
      'visited',
      NULLIF(item->>'note', ''),
      coalesce((item->>'sort_order')::INTEGER, 0)
    FROM jsonb_array_elements(p_visited) item
    ORDER BY (item->>'submission_id')::UUID, coalesce((item->>'sort_order')::INTEGER, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.save_divemaster_pending_dive_sites(UUID, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_divemaster_pending_dive_sites(UUID, UUID, JSONB) TO authenticated;

DROP FUNCTION public.review_dive_site_suggestion(UUID, TEXT, TEXT);
CREATE FUNCTION public.review_dive_site_suggestion(
  p_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL,
  p_existing_dive_site_id UUID DEFAULT NULL,
  p_add_alias BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  request public.dive_site_submissions%ROWTYPE;
  existing_site public.dive_sites%ROWTYPE;
  new_site public.dive_sites%ROWTYPE;
  link RECORD;
  clean_reason TEXT := btrim(coalesce(p_reason, ''));
  resolved_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Admin required' USING ERRCODE = '42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('approve', 'merge', 'reject') THEN
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
  IF p_action = 'merge' THEN
    SELECT * INTO existing_site FROM public.dive_sites
      WHERE id = p_existing_dive_site_id AND country_id = request.country_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Choose an existing site in the same country' USING ERRCODE = '22023';
    END IF;
    resolved_id := existing_site.id;
  ELSE
    SELECT ds.* INTO existing_site
      FROM public.dive_sites ds
      WHERE ds.country_id = request.country_id
        AND lower(regexp_replace(btrim(ds.name), '\s+', ' ', 'g')) = request.normalized_name
      LIMIT 1;
    IF NOT FOUND THEN
      SELECT ds.* INTO existing_site
        FROM public.dive_site_aliases alias
        JOIN public.dive_sites ds ON ds.id = alias.dive_site_id
        WHERE alias.country_id = request.country_id AND alias.normalized_name = request.normalized_name
        LIMIT 1;
    END IF;
    IF FOUND THEN
      resolved_id := existing_site.id;
    ELSE
      INSERT INTO public.dive_sites(name, country_id)
        VALUES (request.name, request.country_id)
        RETURNING * INTO new_site;
      resolved_id := new_site.id;
    END IF;
  END IF;

  IF p_add_alias AND NOT EXISTS (
    SELECT 1 FROM public.dive_sites ds
    WHERE ds.id = resolved_id
      AND lower(regexp_replace(btrim(ds.name), '\s+', ' ', 'g')) = request.normalized_name
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.dive_sites ds
      WHERE ds.country_id = request.country_id
        AND lower(regexp_replace(btrim(ds.name), '\s+', ' ', 'g')) = request.normalized_name
        AND ds.id <> resolved_id
    ) THEN
      RAISE EXCEPTION 'This name is already a canonical site in this country' USING ERRCODE = '23505';
    END IF;
    INSERT INTO public.dive_site_aliases(dive_site_id, country_id, name, created_by, approved_by)
      VALUES (resolved_id, request.country_id, request.name, request.created_by, auth.uid())
      ON CONFLICT (country_id, normalized_name) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM public.dive_site_aliases
      WHERE country_id = request.country_id
        AND normalized_name = request.normalized_name
        AND dive_site_id = resolved_id
    ) THEN
      RAISE EXCEPTION 'This alternate name is already assigned to another site' USING ERRCODE = '23505';
    END IF;
  END IF;

  FOR link IN
    SELECT * FROM public.divemaster_pending_dive_sites
    WHERE submission_id = p_id
    FOR UPDATE
  LOOP
    IF link.slot = 'favorite_local' THEN
      UPDATE public.divemaster_profiles
        SET favorite_local_dive_site_id = coalesce(favorite_local_dive_site_id, resolved_id)
        WHERE user_id = link.user_id;
    ELSIF link.slot = 'favorite_destination' THEN
      UPDATE public.divemaster_profiles
        SET favorite_destination_dive_site_id = coalesce(favorite_destination_dive_site_id, resolved_id)
        WHERE user_id = link.user_id;
    ELSE
      INSERT INTO public.divemaster_dive_sites(user_id, dive_site_id, note, sort_order)
        VALUES (link.user_id, resolved_id, link.note, link.sort_order)
        ON CONFLICT (user_id, dive_site_id) DO UPDATE
          SET note = coalesce(public.divemaster_dive_sites.note, EXCLUDED.note),
              sort_order = least(public.divemaster_dive_sites.sort_order, EXCLUDED.sort_order);
    END IF;
  END LOOP;
  DELETE FROM public.divemaster_pending_dive_sites WHERE submission_id = p_id;

  UPDATE public.dive_site_submissions
    SET status = CASE WHEN p_action = 'merge' OR new_site.id IS NULL THEN 'merged' ELSE 'approved' END,
        dive_site_id = resolved_id,
        reviewed_at = NOW(),
        reviewed_by = auth.uid()
    WHERE id = p_id;
  RETURN jsonb_build_object(
    'id', p_id,
    'status', CASE WHEN p_action = 'merge' OR new_site.id IS NULL THEN 'merged' ELSE 'approved' END,
    'diveSiteId', resolved_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_dive_site_suggestion(UUID, TEXT, TEXT, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_dive_site_suggestion(UUID, TEXT, TEXT, UUID, BOOLEAN) TO authenticated;
