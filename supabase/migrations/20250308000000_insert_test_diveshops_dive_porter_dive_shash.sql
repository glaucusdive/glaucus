-- Test dive shops for email/booking flow: Dive Porter and Dive Shash (team emails)
INSERT INTO diveshops (id, business_name, street_address, website_url, city, state, locale, phone, email, type, country_id, region_id)
VALUES
  (
    'a0000001-0000-4000-8000-000000000001'::uuid,
    'Dive Porter',
    '123 Test Wharf, Pier 39',
    'https://madebyporter.com',
    'San Francisco',
    'California',
    'San Francisco, California',
    '+1 555-0100',
    'general@madebyporter.com',
    'Dive Shop',
    (SELECT id FROM countries WHERE name = 'United States' LIMIT 1),
    (SELECT id FROM regions WHERE name = 'North America' LIMIT 1)
  ),
  (
    'a0000002-0000-4000-8000-000000000002'::uuid,
    'Dive Shash',
    '456 Ocean Ave, Suite 2',
    NULL,
    'San Diego',
    'California',
    'San Diego, California',
    '+1 555-0101',
    'rshashwat@gmail.com',
    'Dive Shop',
    (SELECT id FROM countries WHERE name = 'United States' LIMIT 1),
    (SELECT id FROM regions WHERE name = 'North America' LIMIT 1)
  );

-- Dive Porter: courses, rental equipment, gases
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT 'a0000001-0000-4000-8000-000000000001'::uuid, id FROM courses WHERE certification_name IN ('Open Water Diver', 'Advanced Open Water Diver', 'Enriched Air Nitrox', 'Rescue Diver', 'Discover Scuba Diving');
INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT 'a0000001-0000-4000-8000-000000000001'::uuid, id FROM rental_equipment WHERE name IN ('BCD', 'Regulator', 'Fins', 'Mask', 'Snorkel', 'Wetsuit');
INSERT INTO diveshop_gases (diveshop_id, gas_id)
SELECT 'a0000001-0000-4000-8000-000000000001'::uuid, id FROM gases WHERE name IN ('Nitrox');

-- Dive Shash: different courses and gear
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT 'a0000002-0000-4000-8000-000000000002'::uuid, id FROM courses WHERE certification_name IN ('Discover Scuba Diving', 'Try Scuba / Intro Scuba', 'Open Water Diver', 'Deep Diver', 'Wreck Diver', 'Divemaster');
INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT 'a0000002-0000-4000-8000-000000000002'::uuid, id FROM rental_equipment WHERE name IN ('Wetsuit', 'BCD', 'Regulator', 'Dive Computer', 'Mask', 'Fins');
INSERT INTO diveshop_gases (diveshop_id, gas_id)
SELECT 'a0000002-0000-4000-8000-000000000002'::uuid, id FROM gases WHERE name IN ('Nitrox');

-- Dive sites (US sites for both test shops)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT 'a0000001-0000-4000-8000-000000000001'::uuid, ds.id FROM dive_sites ds
WHERE ds.name IN ('Catalina Island', 'Shaw''s Cove', 'Catalina Island - Casino Point Dive Park', 'Emerald Bay', 'Diver''s Cove')
AND (
  ds.country_id = (SELECT country_id FROM diveshops WHERE id = 'a0000001-0000-4000-8000-000000000001'::uuid)
  OR NOT EXISTS (
    SELECT 1 FROM dive_sites ds2
    WHERE ds2.name = ds.name AND ds2.country_id = (SELECT country_id FROM diveshops WHERE id = 'a0000001-0000-4000-8000-000000000001'::uuid)
  )
);

INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT 'a0000002-0000-4000-8000-000000000002'::uuid, ds.id FROM dive_sites ds
WHERE ds.name IN ('Catalina Island', 'Shaw''s Cove', 'Bird Rock', 'Cabrillo Beach', 'Crescent Bay')
AND (
  ds.country_id = (SELECT country_id FROM diveshops WHERE id = 'a0000002-0000-4000-8000-000000000002'::uuid)
  OR NOT EXISTS (
    SELECT 1 FROM dive_sites ds2
    WHERE ds2.name = ds.name AND ds2.country_id = (SELECT country_id FROM diveshops WHERE id = 'a0000002-0000-4000-8000-000000000002'::uuid)
  )
);
