-- Hawaiian island regions for US dive shops (Oahu, Maui, Kauai, Hawaii Big Island).
-- Inserts unique region names, then sets diveshops.region_id for the 18 Hawaii shops.

INSERT INTO regions (name) VALUES
  ('Oahu'),
  ('Hawaii (Big Island)'),
  ('Kauai'),
  ('Maui')
ON CONFLICT (name) DO NOTHING;

WITH shop_regions (business_name, region_name) AS (
  VALUES
    ('Aaron''s Dive Shop', 'Oahu'),
    ('Big Island Divers', 'Hawaii (Big Island)'),
    ('Bubbles Below Scuba Charters', 'Kauai'),
    ('Dive Oahu, Inc.', 'Oahu'),
    ('Extended Horizons', 'Maui'),
    ('Hawaiian Diving Adventures', 'Oahu'),
    ('Honolulu Scuba Company', 'Oahu'),
    ('Island Divers Hawaii', 'Oahu'),
    ('Jack''s Diving Locker', 'Hawaii (Big Island)'),
    ('Kohala Divers', 'Hawaii (Big Island)'),
    ('Kona Diving Company', 'Hawaii (Big Island)'),
    ('Kona Honu Divers', 'Hawaii (Big Island)'),
    ('Living Ocean Scuba', 'Oahu'),
    ('Maui Dive Shop', 'Maui'),
    ('Maui Dreams Dive Co.', 'Maui'),
    ('Pacific Rim Divers', 'Hawaii (Big Island)'),
    ('Seasport Divers', 'Kauai'),
    ('Waikiki Dive Center', 'Oahu')
)
UPDATE diveshops ds
SET
  region_id = r.id,
  updated_at = NOW()
FROM shop_regions sr
JOIN regions r ON r.name = sr.region_name
WHERE ds.business_name = sr.business_name;
