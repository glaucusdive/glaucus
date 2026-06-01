-- Remove synthetic diveshops.locale (was city || ', ' || state; never in source CSV).
-- Update nearby-shops RPC to return city + state. Fix Prana by Atzaro country_id.

ALTER TABLE diveshops DROP COLUMN IF EXISTS locale;

-- Fix mis-assigned country (address in Spain; CSV Country was Indonesia)
UPDATE diveshops
SET country_id = (SELECT id FROM countries WHERE name = 'Spain' LIMIT 1),
    region_id = (SELECT id FROM regions WHERE name = 'Europe' LIMIT 1)
WHERE id = 'fc297f02-5954-4b31-8876-37e14e8446a8'::uuid;

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
  city TEXT,
  state TEXT,
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
      ds.city,
      ds.state,
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
    other.city,
    other.state,
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

COMMENT ON FUNCTION public.get_nearby_shops_by_distance IS
  'Returns dive shops within radius_miles. Uses diveshops.latitude/longitude when set, else country center. Returns city/state instead of removed locale column.';
