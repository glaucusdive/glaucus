const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

/** Parse a CSV line respecting double-quoted fields (can contain commas). */
function parseCSVLine(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1;
      let field = '';
      while (i < line.length && line[i] !== '"') {
        if (line[i] === '\\') {
          i += 1;
          if (i < line.length) field += line[i++];
        } else {
          field += line[i++];
        }
      }
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
  if (s == null || s === '') return 'NULL';
  return "'" + escapeSql(String(s).trim()) + "'";
}

const csvPath = path.join(__dirname, '../csvfiles/Scuba Master Database v.12 - DiveShops.csv');
const outPath = path.join(__dirname, '../supabase/migrations/20250228000010_insert_diveshops_data.sql');

const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/);
const header = lines[0];
const rows = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const p = parseCSVLine(line);
  const businessName = (p[0] || '').trim();
  if (!businessName) continue;
  const address = (p[1] || '').trim();
  const website = (p[2] || '').trim();
  const city = (p[3] || '').trim();
  const state = (p[4] || '').trim();
  const countryName = (p[5] || '').trim();
  const regionName = (p[6] || '').trim();
  const phone = (p[7] || '').trim();
  const email = (p[8] || '').trim();
  const diveCoursesRaw = (p[9] || '').trim();
  const rentalGearRaw = (p[10] || '').trim();
  const gasesRaw = (p[11] || '').trim();
  const type = (p[12] || '').trim();
  const diveSitesRaw = (p[13] || '').trim();
  const notes = (p[14] || '').trim() || (p[15] || '').trim();

  const locale = [city, state].filter(Boolean).join(', ') || null;

  const courseNames = diveCoursesRaw
    ? [...new Set(diveCoursesRaw.split(',').map((s) => s.trim()).filter(Boolean))]
    : [];
  const rentalNames = rentalGearRaw
    ? [...new Set(rentalGearRaw.split(',').map((s) => s.trim()).filter(Boolean))]
    : [];
  const gasNames = gasesRaw
    ? [...new Set(gasesRaw.split(',').map((s) => s.trim()).filter(Boolean))]
    : [];
  const siteNames = diveSitesRaw
    ? [...new Set(diveSitesRaw.split(',').map((s) => s.trim()).filter(Boolean))]
    : [];

  const id = randomUUID();
  rows.push({
    id,
    business_name: businessName,
    street_address: address || null,
    website_url: website || null,
    city: city || null,
    state: state || null,
    locale: locale || null,
    phone: phone || null,
    email: email || null,
    type: type || null,
    notes: notes || null,
    country_name: countryName || null,
    region_name: regionName || null,
    courseNames,
    rentalNames,
    gasNames,
    siteNames,
  });
}

// Build VALUES for diveshops: id, business_name, street_address, website_url, city, state, locale, phone, email, type, notes, country_name, region_name
const valuesLines = rows.map(
  (r) =>
    `  ('${r.id}'::uuid, ${sqlVal(r.business_name)}, ${sqlVal(r.street_address)}, ${sqlVal(r.website_url)}, ${sqlVal(r.city)}, ${sqlVal(r.state)}, ${sqlVal(r.locale)}, ${sqlVal(r.phone)}, ${sqlVal(r.email)}, ${sqlVal(r.type)}, ${sqlVal(r.notes)}, ${sqlVal(r.country_name)}, ${sqlVal(r.region_name)})`
);

const insertDiveshops = `-- Insert diveshops from Scuba Master Database v.12 - DiveShops.csv (country_id/region_id via countries and country_aliases)
INSERT INTO diveshops (id, business_name, street_address, website_url, city, state, locale, phone, email, type, notes, country_id, region_id)
SELECT v.id, v.business_name, v.street_address, v.website_url, v.city, v.state, v.locale, v.phone, v.email, v.type, v.notes,
  COALESCE(c.id, ca.country_id),
  r.id
FROM (VALUES
${valuesLines.join(',\n')}
) AS v(id, business_name, street_address, website_url, city, state, locale, phone, email, type, notes, country_name, region_name)
LEFT JOIN countries c ON c.name = v.country_name
LEFT JOIN country_aliases ca ON ca.alias = v.country_name
LEFT JOIN regions r ON r.name = v.region_name;`;

// Junction inserts: one block per shop (could be batched for courses/rental/gases/sites with same IN list to reduce statements, but clarity first)
const junctionBlocks = [];

for (const r of rows) {
  const shopId = r.id;
  if (r.courseNames.length > 0) {
    const names = r.courseNames.map((n) => sqlVal(n)).join(', ');
    junctionBlocks.push(`INSERT INTO diveshop_courses (diveshop_id, course_id)
SELECT '${shopId}'::uuid, id FROM courses WHERE certification_name IN (${names});`);
  }
  if (r.rentalNames.length > 0) {
    const names = r.rentalNames.map((n) => sqlVal(n)).join(', ');
    junctionBlocks.push(`INSERT INTO diveshop_rental_equipment (diveshop_id, rental_equipment_id)
SELECT '${shopId}'::uuid, id FROM rental_equipment WHERE name IN (${names});`);
  }
  if (r.gasNames.length > 0) {
    const names = r.gasNames.map((n) => sqlVal(n)).join(', ');
    junctionBlocks.push(`INSERT INTO diveshop_gases (diveshop_id, gas_id)
SELECT '${shopId}'::uuid, id FROM gases WHERE name IN (${names});`);
  }
  if (r.siteNames.length > 0) {
    const names = r.siteNames.map((n) => sqlVal(n)).join(', ');
    junctionBlocks.push(`INSERT INTO diveshop_dive_sites (diveshop_id, dive_site_id)
SELECT '${shopId}'::uuid, ds.id FROM dive_sites ds
WHERE ds.name IN (${names})
AND (
  ds.country_id = (SELECT country_id FROM diveshops WHERE id = '${shopId}'::uuid)
  OR NOT EXISTS (
    SELECT 1 FROM dive_sites ds2
    WHERE ds2.name = ds.name AND ds2.country_id = (SELECT country_id FROM diveshops WHERE id = '${shopId}'::uuid)
  )
);`);
  }
}

const sql = [insertDiveshops, '', '-- Junction table data (courses, rental_equipment, gases, dive_sites)', '', ...junctionBlocks].join('\n');

fs.writeFileSync(outPath, sql);
console.log('Diveshops rows:', rows.length);
console.log('Junction statements:', junctionBlocks.length);
console.log('Written:', outPath);
