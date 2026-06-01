#!/usr/bin/env node
/**
 * Generate idempotent Japan v.13 dive shop reimport migration from CSV.
 * Usage: node scripts/generate-japan-reimport-migration.cjs
 */
const fs = require('fs');
const path = require('path');

function parseCSVLine(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1;
      let field = '';
      while (i < line.length && line[i] !== '"') field += line[i++];
      if (line[i] === '"') i += 1;
      out.push(field.trim());
      if (i < line.length && line[i] === ',') i += 1;
    } else {
      let field = '';
      while (i < line.length && line[i] !== ',') field += line[i++];
      out.push(field.trim());
      if (line[i] === ',') i += 1;
    }
  }
  return out;
}

function escapeSql(s) {
  return (s || '').replace(/'/g, "''");
}

function sqlVal(s) {
  if (s == null || String(s).trim() === '') return 'NULL';
  return "'" + escapeSql(String(s).trim()) + "'";
}

/** Normalize website for matching existing stub rows. */
function normUrl(u) {
  return (u || '').trim().replace(/\/+$/, '').toLowerCase();
}

const SHOP_IDS = {
  [normUrl('https://www.a-diveokinawa.com/')]: 'e832b005-4050-4345-9dea-736125dbeb68',
  [normUrl('http://bluemagicsds.com/')]: '1d862843-0a79-49dd-be9b-860e29c1b167',
  [normUrl('http://www.okinawa39ers.com/')]: 'fd94c44c-2b3f-42b7-a4ba-6ff50a4e1b4c',
  [normUrl('http://www.divers7okinawa.com/')]: 'cf1b2154-8f41-472f-8f5f-7adcb2521cba',
  [normUrl('http://englishempiredivers.com/')]: '70de74c3-cab5-4d32-8adc-b858b8488dd9',
  [normUrl('https://www.isles-dc.com/')]: '6e7279fe-6681-4f2c-8487-b146c487b7c1',
  [normUrl('https://lagoon-diving.com/')]: 'ab56b705-85d3-4d36-9fd4-983868c02f65',
  [normUrl('https://www.okidives.com/')]: '2800435d-1d7e-4935-9315-3398c75415cd',
  [normUrl('https://okinawadc.com/')]: '7e255a99-2864-4a55-b676-7771e3783b53',
  [normUrl('http://www.okinawa-d-s.com')]: 'ae38334b-b32a-4b05-b7b0-1eb5fec9fe5e',
  [normUrl('http://www.reefencounters.org/')]: 'b955fdb5-5fb3-411d-a34f-b668a577c165',
};

const csvPath = path.join(__dirname, '../csvfiles/Scuba Master Database v.13 - Japan Export.csv');
const outPath = path.join(__dirname, '../supabase/migrations/20260531100001_reimport_japan_diveshops_v13.sql');

const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/);
const rows = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const p = parseCSVLine(trimmed);
  const businessName = (p[0] || '').trim();
  if (!businessName) continue;
  const website = (p[2] || '').trim();
  const id = SHOP_IDS[normUrl(website)];
  if (!id) throw new Error(`No UUID mapping for ${businessName} (${website})`);

  const city = (p[3] || '').trim();
  const state = (p[4] || '').trim();

  rows.push({
    id,
    business_name: businessName,
    street_address: (p[1] || '').trim() || null,
    website_url: website || null,
    city: city || null,
    state: state || null,
    phone: (p[7] || '').trim() || null,
    email: (p[8] || '').trim() || null,
    courseNames: (p[9] || '')
      ? [...new Set(p[9].split(',').map((s) => s.trim()).filter(Boolean))]
      : [],
    rentalNames: (p[10] || '')
      ? [...new Set(p[10].split(',').map((s) => s.trim()).filter(Boolean))]
      : [],
    gasNames: (p[11] || '')
      ? [...new Set(p[11].split(',').map((s) => s.trim()).filter(Boolean))]
      : [],
    siteNames: (p[13] || '')
      ? [...new Set(p[13].split(',').map((s) => s.trim()).filter(Boolean))]
      : [],
  });
}

function courseInsert(shopId, names) {
  if (names.length === 0) return '';
  const arr = names.map((n) => sqlVal(n)).join(', ');
  return `-- Courses (PADI preferred when duplicate certification_name)
INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT '${shopId}'::uuid, pick.id
FROM (
  SELECT DISTINCT ON (c.certification_name) c.id
  FROM courses c
  JOIN agencies a ON a.id = c.agency_id
  WHERE c.certification_name IN (${arr})
  ORDER BY c.certification_name,
    CASE a.name WHEN 'PADI' THEN 0 WHEN 'NAUI' THEN 1 WHEN 'SSI' THEN 2 ELSE 3 END,
    c.id
) pick
ON CONFLICT (diveshop_id, course_id) DO NOTHING;`;
}

function rentalInsert(shopId, names) {
  if (names.length === 0) return '';
  const arr = names.map((n) => sqlVal(n)).join(', ');
  return `INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT '${shopId}'::uuid, id FROM rental_equipment WHERE name IN (${arr})
ON CONFLICT (diveshop_id, rental_equipment_id) DO NOTHING;`;
}

function gasInsert(shopId, names) {
  if (names.length === 0) return '';
  const arr = names.map((n) => sqlVal(n)).join(', ');
  return `INSERT INTO diveshop_gases (diveshop_id, gas_id)
SELECT '${shopId}'::uuid, id FROM gases WHERE name IN (${arr})
ON CONFLICT (diveshop_id, gas_id) DO NOTHING;`;
}

function siteInsert(shopId, names) {
  if (names.length === 0) return '';
  const values = names.map((n) => `    (${sqlVal(n)})`).join(',\n');
  return `-- Dive sites (CSV names → alias map → Japan country scope)
INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT '${shopId}'::uuid, ds.id
FROM dive_sites ds
WHERE ds.country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1)
  AND ds.name IN (
    SELECT DISTINCT COALESCE(sa.db_name, v.csv_name)
    FROM (
      VALUES
${values}
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
ON CONFLICT (diveshop_id, dive_site_id) DO NOTHING;`;
}

const blocks = [];

blocks.push(`-- Reimport Japan dive shops from Scuba Master Database v.13 - Japan Export.csv
-- Idempotent: UPDATE existing UUIDs; junction inserts use ON CONFLICT DO NOTHING.
-- Run scripts/sql/imports/japan/00-preflight-audit.sql and 01-reference-data-gaps.sql first.
-- Prerequisite: 20260531100000_rental_equipment_camera.sql (Camera rental row).
`);

for (const r of rows) {
  blocks.push(`
-- ${r.business_name} (${r.id})
UPDATE diveshops SET
  business_name = ${sqlVal(r.business_name)},
  street_address = ${sqlVal(r.street_address)},
  website_url = ${sqlVal(r.website_url)},
  city = ${sqlVal(r.city)},
  state = ${sqlVal(r.state)},
  phone = ${sqlVal(r.phone)},
  email = ${sqlVal(r.email)},
  type = 'Dive Shop',
  country_id = (SELECT id FROM countries WHERE name = 'Japan' LIMIT 1),
  region_id = (SELECT id FROM regions WHERE name = 'East Asia' LIMIT 1),
  updated_at = NOW()
WHERE id = '${r.id}'::uuid;
`);

  const junctions = [
    courseInsert(r.id, r.courseNames),
    rentalInsert(r.id, r.rentalNames),
    gasInsert(r.id, r.gasNames),
    siteInsert(r.id, r.siteNames),
  ].filter(Boolean);

  if (junctions.length) blocks.push(junctions.join('\n\n'));
}

fs.writeFileSync(outPath, blocks.join('\n') + '\n');
console.log('Shops:', rows.length);
console.log('Written:', outPath);
