-- Test visibility flag for dive shops and DivePros.
-- Public lists/search/sitemaps exclude is_test=true unless the caller is an admin (app layer).
-- Direct profile URLs remain reachable; SEO uses noindex for test rows.

ALTER TABLE public.diveshops
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.diveshops.is_test IS
  'When true, hide from public directories, chat search, and sitemaps for non-admins. Direct slug URLs still work.';

ALTER TABLE public.divemaster_profiles
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.divemaster_profiles.is_test IS
  'When true, hide from DivePros directory and sitemaps for non-admins. Direct profile URLs still work.';

-- Seeded test shops (shared/testShops.ts / migration 20250308000000).
UPDATE public.diveshops
SET is_test = true
WHERE id IN (
  'a0000001-0000-4000-8000-000000000001', -- Dive Porter
  'a0000002-0000-4000-8000-000000000002'  -- Dive Shash
);

-- Known test DivePros (looked up 2026-11-18): Chris Porter, Shashwat, demo/test usernames.
UPDATE public.divemaster_profiles AS professional
SET is_test = true
FROM public.profiles AS profile
WHERE professional.user_id = profile.id
  AND lower(btrim(profile.username)) IN (
    'madebyporter',
    'shashwat',
    'sashdivemastertest',
    'shashtest2'
  );

-- Directory RPC: filter on is_test; optional include for admin-aware public directory.
DROP FUNCTION IF EXISTS public.list_public_divemasters(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.list_public_divemasters(
  p_search TEXT DEFAULT '',
  p_page INTEGER DEFAULT 1,
  p_include_test BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH parameters AS (
    SELECT
      lower(left(regexp_replace(btrim(coalesce(p_search, '')), '\s+', ' ', 'g'), 100)) AS search,
      least(greatest(coalesce(p_page, 1), 1), 100000) AS page,
      coalesce(p_include_test, false) AS include_test
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
      AND (parameters.include_test OR professional.is_test = false)
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

REVOKE ALL ON FUNCTION public.list_public_divemasters(TEXT, INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_divemasters(TEXT, INTEGER, BOOLEAN) TO service_role;
