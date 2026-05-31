-- Japan v.13 dive shop reimport — preflight audit
-- Run in Supabase SQL editor before applying reimport migration.
-- Source: csvfiles/Scuba Master Database v.13 - Japan Export.csv (9 shops)

-- ---------------------------------------------------------------------------
-- 1) Target shops: core field completeness (expect many NULLs before reimport)
-- ---------------------------------------------------------------------------
WITH target_shops (id, expected_name) AS (
  VALUES
    ('e832b005-4050-4345-9dea-736125dbeb68'::uuid, 'Alpha Dive'),
    ('1d862843-0a79-49dd-be9b-860e29c1b167'::uuid, 'Blue Magic'),
    ('fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c'::uuid, 'Dive Centre Okinawa 39ers'),
    ('cf1b2154-8f41-472f-8f5f-7adcb2521cba'::uuid, 'Divers 7'),
    ('70de74c3-cab5-4d32-8adc-b858b8488dd9'::uuid, 'English Empire Divers Okinawa'),
    ('6e7279fe-6681-4f2c-8487-b146c487b7c1'::uuid, 'Isles'),
    ('ab56b705-85d3-4d36-9fd4-983868c02f65'::uuid, 'Lagoon Dive Shop'),
    ('2800435d-1d7e-4935-9315-3398c75415cd'::uuid, 'Okidives'),
    ('7e255a99-2864-4a55-b676-7771e3783b53'::uuid, 'Okinawa Diving Center'),
    ('ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e'::uuid, 'Okinawa Diving Shop Sensuiya'),
    ('b955fdb5-5fb3-411d-a34f-b668a577c165'::uuid, 'Reef Encounters')
)
SELECT
  t.expected_name,
  d.id,
  d.business_name,
  d.slug,
  d.street_address IS NOT NULL AS has_address,
  d.city IS NOT NULL AS has_city,
  d.country_id IS NOT NULL AS has_country,
  d.region_id IS NOT NULL AS has_region,
  d.email IS NOT NULL AS has_email,
  d.type,
  c.name AS country_name,
  r.name AS region_name
FROM target_shops t
LEFT JOIN diveshops d ON d.id = t.id
LEFT JOIN countries c ON c.id = d.country_id
LEFT JOIN regions r ON r.id = d.region_id
ORDER BY t.expected_name;

-- ---------------------------------------------------------------------------
-- 2) Junction row counts per target shop (expect 0 before reimport)
-- ---------------------------------------------------------------------------
WITH target_shops (id) AS (
  VALUES
    ('e832b005-4050-4345-9dea-736125dbeb68'::uuid),
    ('1d862843-0a79-49dd-be9b-860e29c1b167'::uuid),
    ('fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c'::uuid),
    ('cf1b2154-8f41-472f-8f5f-7adcb2521cba'::uuid),
    ('70de74c3-cab5-4d32-8adc-b858b8488dd9'::uuid),
    ('6e7279fe-6681-4f2c-8487-b146c487b7c1'::uuid),
    ('ab56b705-85d3-4d36-9fd4-983868c02f65'::uuid),
    ('2800435d-1d7e-4935-9315-3398c75415cd'::uuid),
    ('7e255a99-2864-4a55-b676-7771e3783b53'::uuid),
    ('ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e'::uuid),
    ('b955fdb5-5fb3-411d-a34f-b668a577c165'::uuid)
)
SELECT
  d.business_name,
  d.id,
  (SELECT count(*) FROM diveshop_courses dc WHERE dc.diveshop_id = d.id) AS courses,
  (SELECT count(*) FROM diveshop_rental_equipment dre WHERE dre.diveshop_id = d.id) AS rental,
  (SELECT count(*) FROM diveshop_gases dg WHERE dg.diveshop_id = d.id) AS gases,
  (SELECT count(*) FROM diveshop_dive_sites dds WHERE dds.diveshop_id = d.id) AS dive_sites
FROM target_shops t
JOIN diveshops d ON d.id = t.id
ORDER BY d.business_name;

-- ---------------------------------------------------------------------------
-- 3) Reference FK resolution (Japan / East Asia must exist)
-- ---------------------------------------------------------------------------
SELECT
  (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1) AS japan_country_id,
  (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1) AS east_asia_region_id;

-- ---------------------------------------------------------------------------
-- 4) Duplicate detection by website (should match existing UUIDs only)
-- ---------------------------------------------------------------------------
WITH csv_websites (url, expected_id) AS (
  VALUES
    ('https://www.a-diveokinawa.com/', 'e832b005-4050-4345-9dea-736125dbeb68'::uuid),
    ('http://bluemagicsds.com/', '1d862843-0a79-49dd-be9b-860e29c1b167'::uuid),
    ('http://www.okinawa39ers.com/', 'fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c'::uuid),
    ('http://www.divers7okinawa.com/', 'cf1b2154-8f41-472f-8f5f-7adcb2521cba'::uuid),
    ('http://englishempiredivers.com/', '70de74c3-cab5-4d32-8adc-b858b8488dd9'::uuid),
    ('https://www.isles-dc.com/', '6e7279fe-6681-4f2c-8487-b146c487b7c1'::uuid),
    ('https://lagoon-diving.com/', 'ab56b705-85d3-4d36-9fd4-983868c02f65'::uuid),
    ('https://www.okidives.com/', '2800435d-1d7e-4935-9315-3398c75415cd'::uuid),
    ('https://okinawadc.com/', '7e255a99-2864-4a55-b676-7771e3783b53'::uuid),
    ('http://www.okinawa-d-s.com', 'ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e'::uuid),
    ('http://www.reefencounters.org/', 'b955fdb5-5fb3-411d-a34f-b668a577c165'::uuid)
)
SELECT
  cw.url,
  cw.expected_id,
  d.id AS matched_id,
  d.business_name,
  CASE WHEN d.id = cw.expected_id THEN 'ok' WHEN d.id IS NULL THEN 'missing' ELSE 'conflict' END AS status
FROM csv_websites cw
LEFT JOIN diveshops d ON lower(trim(trailing '/' from d.website_url)) = lower(trim(trailing '/' from cw.url));
