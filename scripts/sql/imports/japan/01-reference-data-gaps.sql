-- Japan v.13 dive shop reimport — reference data gap report
-- Run after 00-preflight-audit.sql. Fix gaps (or extend alias map) before migration.

-- Shared CSV → DB dive site alias map (extend for bulk importer)
WITH site_alias (csv_name, db_name) AS (
  VALUES
    ('Blue Cave', 'Maeda Point (Blue Cave)'),
    ('Cape Maeda', 'Maeda Point (Blue Cave)'),
    ('Kerama Islands', 'Kerama Island Reef'),
    ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
    ('Yonaguni Island', 'Yonaguni Monument'),
    ('USS Emmons', 'USS Emmons'),
    ('Zanpa', 'Maeda Point (Blue Cave)'),
    ('Zampa', 'Maeda Point (Blue Cave)')
),
japan AS (
  SELECT id FROM countries WHERE name = 'Japan' LIMIT 1
),
-- All unique dive site names from v.13 Japan Export CSV
csv_sites (name) AS (
  VALUES
    ('Aguni Island'),
    ('Blue Cave'),
    ('Cape Hedo'),
    ('Cape Maeda'),
    ('Cape Manza'),
    ('Dragon Lady'),
    ('Gorilla Chop'),
    ('Iheya Island'),
    ('Ie Island'),
    ('Itoman'),
    ('Kamiyama North'),
    ('Kerama Islands'),
    ('Labyrinth'),
    ('MaeJima South'),
    ('Manza'),
    ('Manta Point'),
    ('Mermaid Grotto'),
    ('Minna Island'),
    ('Motobu'),
    ('Nagannu Island'),
    ('Nakijin'),
    ('Onna'),
    ('Onna Village Area'),
    ('Paradiso'),
    ('Rukan Atoll'),
    ('Sesoko Island'),
    ('Sunabe'),
    ('Sunabe Sea Wall'),
    ('Tengan Pier'),
    ('The Triangle'),
    ('Tokashiki Island'),
    ('Tonaki Island'),
    ('Twin Rocks'),
    ('Ugan'),
    ('USS Emmons'),
    ('Whale Shark Dive'),
    ('Yamada'),
    ('Yonaguni Island'),
    ('Zanpa'),
    ('Zampa')
),
resolved_sites AS (
  SELECT
    cs.name AS csv_name,
    COALESCE(sa.db_name, cs.name) AS lookup_name
  FROM csv_sites cs
  LEFT JOIN site_alias sa ON lower(trim(sa.csv_name)) = lower(trim(cs.name))
),
-- ---------------------------------------------------------------------------
-- Courses referenced in CSV
-- ---------------------------------------------------------------------------
csv_courses (name) AS (
  VALUES
    ('Advanced Open Water Diver'),
    ('Advanced Scuba Diver'),
    ('Deep Diver'),
    ('Divemaster'),
    ('Divemaster / Assistant Instructor'),
    ('Enriched Air Nitrox'),
    ('Master Scuba Diver Trainer'),
    ('Night Diver'),
    ('Open Water Diver'),
    ('Open Water Scuba Instructor'),
    ('Rescue Diver'),
    ('Rescue Scuba Diver'),
    ('Tec 40'),
    ('Wreck Diver')
)
SELECT
  'course' AS kind,
  cc.name AS csv_value,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM courses c WHERE c.certification_name = cc.name) THEN 'missing'
    WHEN (SELECT count(*) FROM courses c WHERE c.certification_name = cc.name) > 1 THEN 'duplicate_agencies'
    ELSE 'ok'
  END AS status,
  (SELECT string_agg(a.name, ', ' ORDER BY a.name)
   FROM courses c JOIN agencies a ON a.id = c.agency_id
   WHERE c.certification_name = cc.name) AS detail
FROM csv_courses cc
ORDER BY status DESC, cc.name;

-- ---------------------------------------------------------------------------
-- Rental equipment referenced in CSV
-- ---------------------------------------------------------------------------
WITH csv_rental (name) AS (
  VALUES
    ('BCD'), ('Boots'), ('Camera'), ('Dive Computer'), ('Fins'),
    ('Flashlight'), ('Gloves'), ('Hood'), ('Mask'), ('Regulator'),
    ('Snorkel'), ('Wetsuit')
)
SELECT
  'rental' AS kind,
  cr.name AS csv_value,
  CASE WHEN re.id IS NULL THEN 'missing' ELSE 'ok' END AS status,
  NULL::text AS detail
FROM csv_rental cr
LEFT JOIN rental_equipment re ON re.name = cr.name
ORDER BY status DESC, cr.name;

-- ---------------------------------------------------------------------------
-- Gases referenced in CSV
-- ---------------------------------------------------------------------------
WITH csv_gases (name) AS (
  VALUES ('Nitrox')
)
SELECT
  'gas' AS kind,
  cg.name AS csv_value,
  CASE WHEN g.id IS NULL THEN 'missing' ELSE 'ok' END AS status,
  NULL::text AS detail
FROM csv_gases cg
LEFT JOIN gases g ON g.name = cg.name;

-- ---------------------------------------------------------------------------
-- Dive sites: Japan match via alias map
-- ---------------------------------------------------------------------------
WITH site_alias (csv_name, db_name) AS (
  VALUES
    ('Blue Cave', 'Maeda Point (Blue Cave)'),
    ('Cape Maeda', 'Maeda Point (Blue Cave)'),
    ('Kerama Islands', 'Kerama Island Reef'),
    ('Tokashiki Island', 'Kerama Island - Tokashiki Reef'),
    ('Yonaguni Island', 'Yonaguni Monument'),
    ('USS Emmons', 'USS Emmons'),
    ('Zanpa', 'Maeda Point (Blue Cave)'),
    ('Zampa', 'Maeda Point (Blue Cave)')
),
japan AS (
  SELECT id FROM countries WHERE name = 'Japan' LIMIT 1
),
csv_sites (name) AS (
  VALUES
    ('Aguni Island'), ('Blue Cave'), ('Cape Hedo'), ('Cape Maeda'), ('Cape Manza'),
    ('Dragon Lady'), ('Gorilla Chop'), ('Iheya Island'), ('Ie Island'), ('Itoman'),
    ('Kamiyama North'), ('Kerama Islands'), ('Labyrinth'), ('MaeJima South'), ('Manza'),
    ('Manta Point'), ('Mermaid Grotto'), ('Minna Island'), ('Motobu'), ('Nagannu Island'),
    ('Nakijin'), ('Onna'), ('Onna Village Area'), ('Paradiso'), ('Rukan Atoll'),
    ('Sesoko Island'), ('Sunabe'), ('Sunabe Sea Wall'), ('Tengan Pier'), ('The Triangle'),
    ('Tokashiki Island'), ('Tonaki Island'), ('Twin Rocks'), ('Ugan'), ('USS Emmons'),
    ('Whale Shark Dive'), ('Yamada'), ('Yonaguni Island'), ('Zanpa'), ('Zampa')
),
resolved AS (
  SELECT
    cs.name AS csv_name,
    COALESCE(sa.db_name, cs.name) AS lookup_name,
    sa.db_name IS NOT NULL AS mapped_via_alias
  FROM csv_sites cs
  LEFT JOIN site_alias sa ON lower(trim(sa.csv_name)) = lower(trim(cs.name))
)
SELECT
  'dive_site' AS kind,
  r.csv_name AS csv_value,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM dive_sites ds
      JOIN japan j ON ds.country_id = j.id
      WHERE ds.name = r.lookup_name
    ) THEN CASE WHEN r.mapped_via_alias THEN 'mapped_via_alias' ELSE 'ok' END
    WHEN EXISTS (SELECT 1 FROM dive_sites ds WHERE ds.name = r.lookup_name) THEN 'wrong_country_only'
    ELSE 'missing'
  END AS status,
  r.lookup_name AS detail
FROM resolved r
ORDER BY status, r.csv_name;
