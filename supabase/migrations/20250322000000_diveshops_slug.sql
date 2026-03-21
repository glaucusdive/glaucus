-- URL-friendly unique slug per dive shop (e.g. dive-porter).

CREATE OR REPLACE FUNCTION public.slugify(text_val text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    trim(both '-' from lower(regexp_replace(coalesce(text_val, ''), '[^a-zA-Z0-9]+', '-', 'g'))),
    ''
  );
$$;

ALTER TABLE diveshops ADD COLUMN IF NOT EXISTS slug text;

-- Backfill unique slugs from business_name
DO $$
DECLARE
  r record;
  base text;
  candidate text;
  n int;
BEGIN
  FOR r IN SELECT id, business_name FROM diveshops WHERE slug IS NULL OR trim(slug) = '' ORDER BY id
  LOOP
    base := coalesce(public.slugify(r.business_name), 'shop');
    candidate := base;
    n := 0;
    WHILE EXISTS (SELECT 1 FROM diveshops d WHERE d.slug = candidate AND d.id <> r.id) LOOP
      n := n + 1;
      candidate := base || '-' || n::text;
    END LOOP;
    UPDATE diveshops SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE diveshops ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_diveshops_slug ON diveshops (slug);

COMMENT ON COLUMN diveshops.slug IS 'Stable URL segment; unique. Set on insert from business_name if omitted.';

CREATE OR REPLACE FUNCTION public.diveshops_set_slug_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND trim(NEW.slug) <> '' THEN
    NEW.slug := trim(both '-' from lower(regexp_replace(trim(NEW.slug), '[^a-zA-Z0-9-]+', '-', 'g')));
    IF NEW.slug = '' THEN
      NEW.slug := NULL;
    END IF;
  END IF;

  IF NEW.slug IS NOT NULL AND trim(NEW.slug) <> '' THEN
    RETURN NEW;
  END IF;

  base := coalesce(public.slugify(NEW.business_name), 'shop');
  candidate := base;
  WHILE EXISTS (
    SELECT 1 FROM diveshops d WHERE d.slug = candidate AND d.id IS DISTINCT FROM NEW.id
  ) LOOP
    n := n + 1;
    candidate := base || '-' || n::text;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_diveshops_set_slug ON diveshops;
CREATE TRIGGER trg_diveshops_set_slug
    BEFORE INSERT ON diveshops
    FOR EACH ROW
    EXECUTE FUNCTION public.diveshops_set_slug_on_insert();

-- Include slug in nearby-shops RPC for pretty /shops/:slug links
-- Must DROP first: Postgres does not allow changing RETURNS TABLE columns via CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.get_nearby_shops_by_distance(uuid, numeric, integer);

CREATE OR REPLACE FUNCTION public.get_nearby_shops_by_distance(
  center_shop_id UUID,
  radius_miles NUMERIC DEFAULT 100,
  max_shops INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  business_name TEXT,
  locale TEXT,
  country_name TEXT,
  distance_miles NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  center_lat NUMERIC;
  center_lon NUMERIC;
BEGIN
  SELECT COALESCE(ds.latitude, c.latitude), COALESCE(ds.longitude, c.longitude)
  INTO center_lat, center_lon
  FROM diveshops ds
  LEFT JOIN countries c ON c.id = ds.country_id
  WHERE ds.id = center_shop_id;

  IF center_lat IS NULL OR center_lon IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH other AS (
    SELECT
      ds.id,
      ds.slug,
      ds.business_name,
      ds.locale,
      c.name AS country_name,
      COALESCE(ds.latitude, c.latitude) AS lat,
      COALESCE(ds.longitude, c.longitude) AS lon
    FROM diveshops ds
    LEFT JOIN countries c ON c.id = ds.country_id
    WHERE ds.id != center_shop_id
      AND (ds.latitude IS NOT NULL AND ds.longitude IS NOT NULL OR (c.latitude IS NOT NULL AND c.longitude IS NOT NULL))
  )
  SELECT
    other.id,
    other.slug,
    other.business_name,
    other.locale,
    other.country_name,
    ROUND(
      (3959 * 2 * asin(sqrt(
        sin(radians(other.lat - center_lat) / 2) ^ 2
        + cos(radians(center_lat)) * cos(radians(other.lat))
        * sin(radians(other.lon - center_lon) / 2) ^ 2
      )))::numeric,
      1
    ) AS distance_miles
  FROM other
  WHERE (3959 * 2 * asin(sqrt(
    sin(radians(other.lat - center_lat) / 2) ^ 2
    + cos(radians(center_lat)) * cos(radians(other.lat))
    * sin(radians(other.lon - center_lon) / 2) ^ 2
  ))) <= radius_miles
  ORDER BY distance_miles
  LIMIT max_shops;
END;
$$;
