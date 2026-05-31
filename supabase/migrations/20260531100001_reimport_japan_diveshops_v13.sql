-- Reimport Japan dive shops from Scuba Master Database v.13 - Japan Export.csv
-- Idempotent: UPDATE existing UUIDs; junction inserts use ON CONFLICT DO NOTHING.
-- Run scripts/sql/imports/japan/00-preflight-audit.sql and 01-reference-data-gaps.sql first.
-- Prerequisite: 20260531100000_rental_equipment_camera.sql (Camera rental row).


-- Alpha Dive (e832b005-4050-4345-9dea-736125dbeb68)
UPDATE diveshops SET
  business_name = 'Alpha Dive',
  street_address = '2-95 Miyagi, Chatan, Nakagami District, Okinawa 904-0113, Japan',
  website_url = 'https://www.a-diveokinawa.com/',
  city = 'Chatan',
  state = 'Okinawa',
  locale = 'Chatan, Okinawa',
  phone = '+81 070-8468-4487',
  email = 'alphadive.booking@gmail.com',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = 'e832b005-4050-4345-9dea-736125dbeb68'::uuid;

INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT 'e832b005-4050-4345-9dea-736125dbeb68'::uuid, id FROM rental_equipment WHERE name IN ('BCD', 'Regulator', 'Mask', 'Snorkel', 'Fins', 'Dive Computer', 'Wetsuit')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT 'e832b005-4050-4345-9dea-736125dbeb68'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Kerama Islands'),
    ('Onna'),
    ('Manza'),
    ('Cape Maeda'),
    ('Aguni Island'),
    ('Tonaki Island'),
    ('Minna Island'),
    ('Sesoko Island'),
    ('Ie Island'),
    ('Cape Hedo'),
    ('USS Emmons'),
    ('Blue Cave')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;

-- Blue Magic (1d862843-0a79-49dd-be9b-860e29c1b167)
UPDATE diveshops SET
  business_name = 'Blue Magic',
  street_address = '201 2 Chome-23-22, Uchima, Urasoe, Okinawa 901-2121, Japan',
  website_url = 'http://bluemagicsds.com/',
  city = 'Uchima',
  state = 'Okinawa',
  locale = 'Uchima, Okinawa',
  phone = '+81 90-8012-8349',
  email = 'info@bluemagicsds.com',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = '1d862843-0a79-49dd-be9b-860e29c1b167'::uuid;

-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT '1d862843-0a79-49dd-be9b-860e29c1b167'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN ('Open Water Diver', 'Advanced Open Water Diver', 'Rescue Diver', 'Divemaster')
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;

INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT '1d862843-0a79-49dd-be9b-860e29c1b167'::uuid, id FROM rental_equipment WHERE name IN ('Regulator', 'BCD', 'Mask', 'Fins', 'Boots', 'Snorkel', 'Wetsuit', 'Dive Computer', 'Flashlight', 'Camera')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT '1d862843-0a79-49dd-be9b-860e29c1b167'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Kerama Islands'),
    ('Manza'),
    ('USS Emmons'),
    ('Aguni Island'),
    ('Whale Shark Dive'),
    ('Tonaki Island'),
    ('Cape Hedo'),
    ('The Triangle')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;

-- Dive Centre Okinawa 39ers (fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c)
UPDATE diveshops SET
  business_name = 'Dive Centre Okinawa 39ers',
  street_address = 'Hamagawa 185-1, Chatan-cho, Nakagamigun, Okinawa 904-0112',
  website_url = 'http://www.okinawa39ers.com/',
  city = 'Chatan-cho',
  state = 'Okinawa',
  locale = 'Chatan-cho, Okinawa',
  phone = '+81 80-2085-9138',
  email = 'info@okinawa39ers.com',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = 'fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c'::uuid;

-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT 'fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN ('Open Water Diver', 'Advanced Open Water Diver', 'Rescue Diver', 'Divemaster', 'Master Scuba Diver Trainer')
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;

INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT 'fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c'::uuid, id FROM rental_equipment WHERE name IN ('BCD', 'Regulator', 'Wetsuit', 'Dive Computer', 'Mask', 'Boots', 'Fins')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;

INSERT INTO diveshop_gases (diveshop_id, gas_id)
SELECT 'fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c'::uuid, id FROM gases WHERE name IN ('Nitrox')
ON CONFLICT (diveshop_id, gas_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT 'fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Iheya Island'),
    ('Cape Hedo'),
    ('USS Emmons'),
    ('Manza'),
    ('Cape Maeda'),
    ('Zanpa'),
    ('Tengan Pier'),
    ('Sunabe'),
    ('Itoman'),
    ('Kerama Islands'),
    ('Tonaki Island'),
    ('Aguni Island')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;

-- Divers 7 (cf1b2154-8f41-472f-8f5f-7adcb2521cba)
UPDATE diveshops SET
  business_name = 'Divers 7',
  street_address = '2288-247 Nakama, Onna, Kunigami District, Okinawa 904-0401, Japan',
  website_url = 'http://www.divers7okinawa.com/',
  city = 'Onna',
  state = 'Okinawa',
  locale = 'Onna, Okinawa',
  phone = '+81 98-967-7050',
  email = 'info@divers7okinawa.com',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = 'cf1b2154-8f41-472f-8f5f-7adcb2521cba'::uuid;

-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT 'cf1b2154-8f41-472f-8f5f-7adcb2521cba'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN ('Open Water Diver', 'Advanced Open Water Diver', 'Rescue Diver', 'Deep Diver', 'Enriched Air Nitrox', 'Divemaster', 'Open Water Scuba Instructor', 'Tec 40')
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;

INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT 'cf1b2154-8f41-472f-8f5f-7adcb2521cba'::uuid, id FROM rental_equipment WHERE name IN ('Mask', 'Snorkel', 'Fins', 'Boots', 'Wetsuit', 'BCD', 'Regulator', 'Dive Computer', 'Flashlight')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;

INSERT INTO diveshop_gases (diveshop_id, gas_id)
SELECT 'cf1b2154-8f41-472f-8f5f-7adcb2521cba'::uuid, id FROM gases WHERE name IN ('Nitrox')
ON CONFLICT (diveshop_id, gas_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT 'cf1b2154-8f41-472f-8f5f-7adcb2521cba'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Kerama Islands'),
    ('Cape Hedo'),
    ('USS Emmons'),
    ('Mermaid Grotto'),
    ('Ie Island'),
    ('Minna Island'),
    ('Sesoko Island'),
    ('Cape Manza'),
    ('Cape Maeda'),
    ('Sunabe'),
    ('Gorilla Chop'),
    ('Whale Shark Dive')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;

-- English Empire Divers Okinawa (70de74c3-cab5-4d32-8adc-b858b8488dd9)
UPDATE diveshops SET
  business_name = 'English Empire Divers Okinawa',
  street_address = '169 Tokeshi, Yomitan, Okinawa 904-0326, Japan',
  website_url = 'http://englishempiredivers.com/',
  city = 'Yomitan',
  state = 'Okinawa',
  locale = 'Yomitan, Okinawa',
  phone = '+81 90-8777-1983',
  email = 'englishempiredivers@outlook.com',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = '70de74c3-cab5-4d32-8adc-b858b8488dd9'::uuid;

-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT '70de74c3-cab5-4d32-8adc-b858b8488dd9'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN ('Open Water Diver', 'Advanced Open Water Diver', 'Rescue Diver', 'Divemaster')
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;

INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT '70de74c3-cab5-4d32-8adc-b858b8488dd9'::uuid, id FROM rental_equipment WHERE name IN ('BCD', 'Regulator', 'Wetsuit', 'Fins', 'Mask', 'Flashlight', 'Dive Computer')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT '70de74c3-cab5-4d32-8adc-b858b8488dd9'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Kerama Islands'),
    ('Manza'),
    ('Onna'),
    ('USS Emmons'),
    ('Cape Hedo'),
    ('Minna Island'),
    ('Sesoko Island'),
    ('Sunabe'),
    ('Tengan Pier'),
    ('Motobu'),
    ('Zampa'),
    ('Nakijin')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;

-- Isles (6e7279fe-6681-4f2c-8487-b146c487b7c1)
UPDATE diveshops SET
  business_name = 'Isles',
  street_address = '879 Fuchaku, Onna, Kunigami District, Okinawa 904-0413, Japan',
  website_url = 'https://www.isles-dc.com/',
  city = 'Onna',
  state = 'Okinawa',
  locale = 'Onna, Okinawa',
  phone = '+81 90-9095-7644',
  email = 'isles.dc@gmail.com',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = '6e7279fe-6681-4f2c-8487-b146c487b7c1'::uuid;

-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT '6e7279fe-6681-4f2c-8487-b146c487b7c1'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN ('Open Water Diver', 'Advanced Open Water Diver')
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;

INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT '6e7279fe-6681-4f2c-8487-b146c487b7c1'::uuid, id FROM rental_equipment WHERE name IN ('BCD', 'Regulator', 'Wetsuit', 'Fins', 'Mask', 'Snorkel', 'Boots')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT '6e7279fe-6681-4f2c-8487-b146c487b7c1'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Onna'),
    ('Cape Manza'),
    ('Zanpa'),
    ('Kerama Islands'),
    ('Itoman'),
    ('USS Emmons'),
    ('Blue Cave'),
    ('Whale Shark Dive')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;

-- Lagoon Dive Shop (ab56b705-85d3-4d36-9fd4-983868c02f65)
UPDATE diveshops SET
  business_name = 'Lagoon Dive Shop',
  street_address = '339 Onna, Kunigami District, Okinawa 904-0411, Japan',
  website_url = 'https://lagoon-diving.com/',
  city = 'Onna',
  state = 'Okinawa',
  locale = 'Onna, Okinawa',
  phone = '+81 98-966-2818',
  email = 'info@lagoon-diving.com',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = 'ab56b705-85d3-4d36-9fd4-983868c02f65'::uuid;

-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT 'ab56b705-85d3-4d36-9fd4-983868c02f65'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN ('Open Water Diver', 'Advanced Open Water Diver', 'Rescue Diver', 'Enriched Air Nitrox')
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;

INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT 'ab56b705-85d3-4d36-9fd4-983868c02f65'::uuid, id FROM rental_equipment WHERE name IN ('Wetsuit', 'Regulator', 'Fins', 'Gloves', 'Mask', 'BCD', 'Hood', 'Dive Computer')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT 'ab56b705-85d3-4d36-9fd4-983868c02f65'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Manza')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;

-- Okidives (2800435d-1d7e-4935-9315-3398c75415cd)
UPDATE diveshops SET
  business_name = 'Okidives',
  street_address = '1-217 Miyagi, Chatan, Nakagami District, Okinawa 904-0113, Japan',
  website_url = 'https://www.okidives.com/',
  city = 'Chatan',
  state = 'Okinawa',
  locale = 'Chatan, Okinawa',
  phone = '+81 70-2795-7539',
  email = 'okidive@gmail.com',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = '2800435d-1d7e-4935-9315-3398c75415cd'::uuid;

-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT '2800435d-1d7e-4935-9315-3398c75415cd'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN ('Open Water Diver', 'Advanced Open Water Diver', 'Enriched Air Nitrox', 'Rescue Diver')
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT '2800435d-1d7e-4935-9315-3398c75415cd'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Yonaguni Island')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;

-- Okinawa Diving Center (7e255a99-2864-4a55-b676-7771e3783b53)
UPDATE diveshops SET
  business_name = 'Okinawa Diving Center',
  street_address = '29-1 Maeganeku, Onna Village, Kunigami District, Okinawa Prefecture, 904-0414',
  website_url = 'https://okinawadc.com/',
  city = 'Onna Village',
  state = 'Okinawa',
  locale = 'Onna Village, Okinawa',
  phone = '+81 98-965-4700',
  email = 'info@okinawadc.com',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = '7e255a99-2864-4a55-b676-7771e3783b53'::uuid;

-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT '7e255a99-2864-4a55-b676-7771e3783b53'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN ('Open Water Diver', 'Advanced Open Water Diver', 'Rescue Diver', 'Enriched Air Nitrox')
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;

INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT '7e255a99-2864-4a55-b676-7771e3783b53'::uuid, id FROM rental_equipment WHERE name IN ('BCD', 'Regulator', 'Wetsuit', 'Mask', 'Snorkel', 'Fins')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT '7e255a99-2864-4a55-b676-7771e3783b53'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Cape Maeda'),
    ('Yamada'),
    ('Cape Manza'),
    ('USS Emmons')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;

-- Okinawa Diving Shop Sensuiya (ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e)
UPDATE diveshops SET
  business_name = 'Okinawa Diving Shop Sensuiya',
  street_address = '3 Chome-11-19 Akebono, Naha, Okinawa 900-0002, Japan',
  website_url = 'http://www.okinawa-d-s.com',
  city = 'Naha',
  state = 'Okinawa',
  locale = 'Naha, Okinawa',
  phone = '+81 98-988-9398',
  email = 'info@okinawa-ds.com',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = 'ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e'::uuid;

-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT 'ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN ('Open Water Diver', 'Advanced Open Water Diver', 'Rescue Diver', 'Enriched Air Nitrox')
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;

INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT 'ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e'::uuid, id FROM rental_equipment WHERE name IN ('Dive Computer', 'Regulator', 'BCD', 'Wetsuit', 'Camera', 'Gloves', 'Boots', 'Fins', 'Mask', 'Hood')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;

INSERT INTO diveshop_gases (diveshop_id, gas_id)
SELECT 'ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e'::uuid, id FROM gases WHERE name IN ('Nitrox')
ON CONFLICT (diveshop_id, gas_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT 'ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Kerama Islands')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;

-- Reef Encounters (b955fdb5-5fb3-411d-a34f-b668a577c165)
UPDATE diveshops SET
  business_name = 'Reef Encounters',
  street_address = '1-493 Miyagi, Okinawa City, Nakagami District, Okinawa 904-0113, Japan',
  website_url = 'http://www.reefencounters.org/',
  city = 'Okinawa City',
  state = 'Okinawa',
  locale = 'Okinawa City, Okinawa',
  phone = '+81 98-995-9414',
  email = 'info@reefencounters.org',
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = 'b955fdb5-5fb3-411d-a34f-b668a577c165'::uuid;

-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT 'b955fdb5-5fb3-411d-a34f-b668a577c165'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN ('Advanced Scuba Diver', 'Rescue Scuba Diver', 'Master Scuba Diver Trainer', 'Enriched Air Nitrox', 'Deep Diver', 'Wreck Diver', 'Night Diver', 'Divemaster / Assistant Instructor')
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;

INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT 'b955fdb5-5fb3-411d-a34f-b668a577c165'::uuid, id FROM rental_equipment WHERE name IN ('Regulator', 'BCD', 'Wetsuit', 'Fins', 'Boots', 'Mask', 'Snorkel', 'Dive Computer', 'Flashlight', 'Camera', 'Hood')
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;

INSERT INTO diveshop_gases (diveshop_id, gas_id)
SELECT 'b955fdb5-5fb3-411d-a34f-b668a577c165'::uuid, id FROM gases WHERE name IN ('Nitrox')
ON CONFLICT (diveshop_id, gas_id) DO NOTHING;

-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT 'b955fdb5-5fb3-411d-a34f-b668a577c165'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
    ('Labyrinth'),
    ('Paradiso'),
    ('Kamiyama North'),
    ('Nagannu Island'),
    ('MaeJima South'),
    ('Twin Rocks'),
    ('Manta Point'),
    ('Ugan'),
    ('Dragon Lady'),
    ('Tokashiki Island'),
    ('Sunabe Sea Wall'),
    ('Onna Village Area'),
    ('Motobu'),
    ('USS Emmons'),
    ('Cape Hedo'),
    ('Rukan Atoll')
    ) AS v(csv_name)
    LEFT JOIN (
      VALUES
        ('Blue Cave', 'Maeda Point (Blue Cave)'),
        ('Cape Maeda', 'Maeda Point (Blue Cave)'),
        ('Kerama Islands', 'Kerama Island Reef'),
        ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
        ('Yonaguni Island', 'Yonaguni Monument'),
        ('USS Emmons', 'USS Emmons'),
        ('Zanpa', 'Maeda Point (Blue Cave)'),
        ('Zampa', 'Maeda Point (Blue Cave)')
    ) AS sa(csv_name, db_name) ON lower(trim(sa.csv_name)) = lower(trim(v.csv_name))
  )
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;
