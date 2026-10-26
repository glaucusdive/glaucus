CREATE OR REPLACE FUNCTION public.list_public_divemasters(p_search TEXT DEFAULT '', p_page INTEGER DEFAULT 1)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH parameters AS (
    SELECT
      lower(left(regexp_replace(btrim(coalesce(p_search, '')), '\s+', ' ', 'g'), 100)) AS search,
      least(greatest(coalesce(p_page, 1), 1), 100000) AS page
  ), filtered AS MATERIALIZED (
    SELECT
      profile.username,
      nullif(btrim(profile.display_name), '') AS display_name,
      professional.headline,
      professional.location,
      professional.avatar_url
    FROM public.divemaster_profiles AS professional
    JOIN public.profiles AS profile ON profile.id = professional.user_id
    CROSS JOIN parameters
    WHERE professional.status = 'published'
      AND nullif(btrim(profile.username), '') IS NOT NULL
      -- Keep aligned with shared/testDivemasters.ts; this designation follows the username.
      AND lower(btrim(profile.username)) NOT IN ('sashdivemastertest')
      AND (
        parameters.search = ''
        OR strpos(lower(coalesce(profile.display_name, '')), parameters.search) > 0
        OR strpos(lower(profile.username), parameters.search) > 0
        OR strpos(lower(coalesce(professional.location, '')), parameters.search) > 0
      )
  ), paged AS (
    SELECT * FROM filtered
    ORDER BY lower(coalesce(display_name, username)), username
    OFFSET (SELECT (page - 1) * 24 FROM parameters)
    LIMIT 24
  )
  SELECT jsonb_build_object(
    'profiles', coalesce((
      SELECT jsonb_agg(to_jsonb(paged) ORDER BY lower(coalesce(display_name, username)), username)
      FROM paged
    ), '[]'::jsonb),
    'total', (SELECT count(*) FROM filtered),
    'page', (SELECT page FROM parameters),
    'pageSize', 24
  );
$$;

REVOKE ALL ON FUNCTION public.list_public_divemasters(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_divemasters(TEXT, INTEGER) TO service_role;
