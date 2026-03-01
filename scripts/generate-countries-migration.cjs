const fs = require('fs');
const path = require('path');
const csvPath = path.join(__dirname, '../csvfiles/Scuba Master Database v.12 - Countries.csv');
const outPath = path.join(__dirname, '../supabase/migrations/20250228000001_insert_countries_data.sql');

const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/);
const regionSet = new Set();
const rows = [];

for (let i = 1; i < lines.length; i++) {
  const raw = lines[i].split(',');
  const name = (raw[0] || '').trim().replace(/'/g, "''");
  const code = (raw[1] || '').trim();
  if (!code) continue;
  const lat = (raw[2] || '').trim();
  const lng = (raw[3] || '').trim();
  const region = (raw[4] || '').trim().replace(/'/g, "''");
  if (region) regionSet.add(region);
  const latVal = lat === '' ? 'NULL' : lat;
  const lngVal = lng === '' ? 'NULL' : lng;
  rows.push({ name, code, latVal, lngVal, region });
}

const regions = [...regionSet].sort();
const regionInserts = regions.map((r) => "('" + r + "')").join(',\n  ');

const valueRows = rows.map((r) => {
  const regionVal = r.region ? "'" + r.region + "'" : 'NULL';
  return "('" + r.name + "', '" + r.code + "', " + r.latVal + ", " + r.lngVal + ", " + regionVal + ")";
});

const sql = [
  '-- Insert regions and countries from Scuba Master Database v.12 - Countries.csv',
  '',
  '-- 1. Insert regions (distinct names from CSV)',
  'INSERT INTO regions (name) VALUES',
  '  ' + regionInserts,
  'ON CONFLICT (name) DO NOTHING;',
  '',
  '-- 2. Insert countries with region_id (lookup by region name)',
  'INSERT INTO countries (name, iso2, latitude, longitude, region_id)',
  'SELECT v.name, v.iso2, v.latitude, v.longitude, r.id',
  'FROM (VALUES',
  '  ' + valueRows.join(',\n  '),
  ') AS v(name, iso2, latitude, longitude, region_name)',
  'LEFT JOIN regions r ON r.name = v.region_name',
  'ON CONFLICT (iso2) DO NOTHING;',
].join('\n');

fs.writeFileSync(outPath, sql);
console.log('Regions:', regions.length, 'Countries:', rows.length);
