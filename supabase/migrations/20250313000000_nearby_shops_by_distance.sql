-- Nearby dive shops by distance. Prefers diveshops.latitude/longitude (geocoded); falls back to country center when null.
-- Geocode addresses (e.g. via OpenStreetMap Nominatim or Google Geocoding API) to populate shop-level coords for accurate distances.

-- Add shop-level coordinates (used by function below and by POST /api/geocode-shop)
ALTER TABLE diveshops
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

CREATE INDEX IF NOT EXISTS idx_diveshops_lat_lon ON diveshops(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE OR REPLACE FUNCTION get_nearby_shops_by_distance(
  center_shop_id UUID,
  radius_miles NUMERIC DEFAULT 100,
  max_shops INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
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
  -- Center: use shop-level coords if set, else country center
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

COMMENT ON FUNCTION get_nearby_shops_by_distance IS 'Returns dive shops within radius_miles. Uses diveshops.latitude/longitude when set (geocoded), else country center. Haversine distance in miles.';
