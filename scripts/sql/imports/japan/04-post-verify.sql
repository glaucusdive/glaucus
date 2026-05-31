-- Japan v.13 dive shop reimport — post-import verification
-- Run after supabase/migrations/*_reimport_japan_diveshops_v13.sql

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
  d.slug,
  d.street_address IS NOT NULL AS has_address,
  d.country_id IS NOT NULL AS has_country,
  d.type = 'Dive Shop' AS type_ok,
  c.name AS country,
  (SELECT count(*) FROM diveshop_courses dc WHERE dc.diveshop_id = d.id) AS courses,
  (SELECT count(*) FROM diveshop_rental_equipment dre WHERE dre.diveshop_id = d.id) AS rental,
  (SELECT count(*) FROM diveshop_gases dg WHERE dg.diveshop_id = d.id) AS gases,
  (SELECT count(*) FROM diveshop_dive_sites dds WHERE dds.diveshop_id = d.id) AS dive_sites,
  CASE
    WHEN d.street_address IS NULL OR d.country_id IS NULL OR d.type IS DISTINCT FROM 'Dive Shop'
    THEN 'FAIL'
    ELSE 'PASS'
  END AS core_check
FROM target_shops t
JOIN diveshops d ON d.id = t.id
LEFT JOIN countries c ON c.id = d.country_id
ORDER BY t.expected_name;

-- Linked dive sites per shop (expect only Japan canonical names)
SELECT
  d.business_name,
  ds.name AS dive_site
FROM diveshops d
JOIN diveshop_dive_sites dds ON dds.diveshop_id = d.id
JOIN dive_sites ds ON ds.id = dds.dive_site_id
WHERE d.id IN (
  'e832b005-4050-4345-9dea-736125dbeb68',
  '1d862843-0a79-49dd-be9b-860e29c1b167',
  'fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c',
  'cf1b2154-8f41-472f-8f5f-7adcb2521cba',
  '70de74c3-cab5-4d32-8adc-b858b8488dd9',
  '6e7279fe-6681-4f2c-8487-b146c487b7c1',
  'ab56b705-85d3-4d36-9fd4-983868c02f65',
  '2800435d-1d7e-4935-9315-3398c75415cd',
  '7e255a99-2864-4a55-b676-7771e3783b53',
  'ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e',
  'b955fdb5-5fb3-411d-a34f-b668a577c165'
)
ORDER BY d.business_name, ds.name;

-- Smoke test: Alpha Dive with relations
SELECT
  d.business_name,
  d.slug,
  d.locale,
  array_agg(DISTINCT c.certification_name) FILTER (WHERE c.id IS NOT NULL) AS courses,
  array_agg(DISTINCT re.name) FILTER (WHERE re.id IS NOT NULL) AS rental,
  array_agg(DISTINCT ds.name) FILTER (WHERE ds.id IS NOT NULL) AS dive_sites
FROM diveshops d
LEFT JOIN diveshop_courses dc ON dc.diveshop_id = d.id
LEFT JOIN courses c ON c.id = dc.course_id
LEFT JOIN diveshop_rental_equipment dre ON dre.diveshop_id = d.id
LEFT JOIN rental_equipment re ON re.id = dre.rental_equipment_id
LEFT JOIN diveshop_dive_sites dds ON dds.diveshop_id = d.id
LEFT JOIN dive_sites ds ON ds.id = dds.dive_site_id
WHERE d.id = 'e832b005-4050-4345-9dea-736125dbeb68'::uuid
GROUP BY d.id, d.business_name, d.slug, d.locale;
