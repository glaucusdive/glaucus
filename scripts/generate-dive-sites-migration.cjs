const fs = require('fs');
const path = require('path');

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

// Extract country names from countries migration (first quoted string in each VALUES line)
const countriesPath = path.join(__dirname, '../supabase/migrations/20250228000001_insert_countries_data.sql');
const countriesSql = fs.readFileSync(countriesPath, 'utf8');
const countryNames = new Set();
const countryLineRe = /\s+\('([^']*(?:''[^']*)*)'\s*,\s*'[A-Z]{2}'/g;
let m;
while ((m = countryLineRe.exec(countriesSql)) !== null) {
  countryNames.add(m[1].replace(/''/g, "'"));
}

// CSV country string -> canonical country name (for countries table)
const countryAliasMap = {
  'USA': 'United States',
  'UK': 'United Kingdom',
  'Bahama': 'Bahamas',
  'Cayman Island': 'Cayman Islands',
  'Columbia': 'Colombia',
  'Turks & Caicos': 'Turks and Caicos Islands',
  'Turks and Caicos': 'Turks and Caicos Islands',
  'St. Lucia': 'Saint Lucia',
  'St. Vincent': 'Saint Vincent and the Grenadines',
  'Marshall Islands*': 'Marshall Islands',
  'Reunion': 'Réunion',
  'U.S. Virgin Islands': 'U.S. Virgin Islands',
  'US Virgin Islands': 'U.S. Virgin Islands',
  'Caribbean Netherlands': 'Bonaire',
  'Rangiroa': 'French Polynesia',
  'Aitutaki': 'Cook Islands',
  'Chagos': 'British Indian Ocean Territory',
  'Chuuk': 'Micronesia',
  'Fakarava': 'French Polynesia',
  'Gau': 'Fiji',
  "Ha'apai": 'Tonga',
  'Kadavu': 'Fiji',
  'Kiritimati': 'Kiribati',
  'Klein Bonaire': 'Bonaire',
  'Kwajalein Atoll': 'Marshall Islands',
  'New Ireland': 'Papua New Guinea',
  'Tikehau': 'French Polynesia',
};

// Canonical dive_site_types (order for INSERT)
const canonicalTypes = [
  'Beach',
  'Cavern/Cave',
  'Cenote',
  'Geographic Site',
  'Lake',
  'Other',
  'Pier',
  'Reef',
  'Wreck',
  'Wall',
  'Reef/Wall',
  'Wreck/Reef',
  'Drop-off',
  'Pinnacle',
  'Marine Park',
  'Marine Reserve',
  'Jetty',
  'Grotto',
  'Unspecified',
];

// CSV type string (normalized) -> canonical type name
function normalizeType(s) {
  return (s || '').trim().toLowerCase();
}
const typeMapping = {};
[
  ['beach', 'Beach'],
  ['cavern/cave', 'Cavern/Cave'],
  ['cavern / cave', 'Cavern/Cave'],
  ['cave/cavern', 'Cavern/Cave'],
  ['cavern', 'Cavern/Cave'],
  ['cave', 'Cavern/Cave'],
  ['cenote', 'Cenote'],
  ['geographic site', 'Geographic Site'],
  ['geographical site', 'Geographic Site'],
  ['geographical', 'Geographic Site'],
  ['geographic site', 'Geographic Site'],
  ['lake', 'Lake'],
  ['other', 'Other'],
  ['pier', 'Pier'],
  ['reef', 'Reef'],
  ['wreck', 'Wreck'],
  ['wall', 'Wall'],
  ['reef/wall', 'Reef/Wall'],
  ['reef / wall', 'Reef/Wall'],
  ['wall/reef', 'Reef/Wall'],
  ['wreck/reef', 'Wreck/Reef'],
  ['wreck / reef', 'Wreck/Reef'],
  ['drop-off', 'Drop-off'],
  ['drop off', 'Drop-off'],
  ['pinnacle', 'Pinnacle'],
  ['marine park', 'Marine Park'],
  ['marine reserve', 'Marine Reserve'],
  ['jetty', 'Jetty'],
  ['grotto', 'Grotto'],
  ['arch', 'Other'],
  ['blue hole', 'Other'],
  ['drift', 'Other'],
  ['seamount', 'Other'],
  ['sandbar', 'Other'],
  ['underwater sculpture park', 'Other'],
  ['muck', 'Other'],
  ['spring', 'Other'],
  ['springs', 'Other'],
  ['river', 'Other'],
  ['channel', 'Other'],
  ['pass', 'Other'],
  ['passage', 'Other'],
].forEach(([key, val]) => { typeMapping[key] = val; });

function resolveType(csvType) {
  const n = normalizeType(csvType);
  return typeMapping[n] || 'Unspecified';
}

function resolveCountry(csvCountry) {
  const s = (csvCountry || '').trim();
  if (!s) return null;
  if (countryNames.has(s)) return s;
  return countryAliasMap[s] || null;
}

// Parse Dive Sites CSV
const csvPath = path.join(__dirname, '../csvfiles/Scuba Master Database v.12 - Dive Sites.csv');
const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/);
const header = lines[0];
const ncols = parseCSVLine(header).length;
const seen = new Set();
const rows = [];
for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  for (let c = 0; c + 2 < Math.min(row.length, ncols); c += 6) {
    const name = (row[c] || '').trim();
    const typeStr = (row[c + 1] || '').trim();
    const countryStr = (row[c + 2] || '').trim();
    if (!name || !countryStr) continue;
    const key = name + '\t' + countryStr;
    if (seen.has(key)) continue;
    seen.add(key);
    const country = resolveCountry(countryStr);
    if (!country) continue;
    const typeName = resolveType(typeStr);
    rows.push({ name, country, typeName });
  }
}

// Aliases to insert: CSV strings that we mapped and are not exact country names
const aliasesToInsert = [];
const usedAliasTargets = new Set();
for (const row of rows) {
  usedAliasTargets.add(row.country);
}
Object.entries(countryAliasMap).forEach(([alias, canonical]) => {
  if (countryNames.has(alias)) return;
  if (!countryNames.has(canonical)) return;
  aliasesToInsert.push({ alias, countryName: canonical });
});

// 1. INSERT dive_site_types
const typeInserts = canonicalTypes.map((t) => "('" + escapeSql(t) + "')").join(',\n  ');

// 2. INSERT country_aliases (alias, country_id) via SELECT from countries
const aliasInserts = aliasesToInsert
  .map(({ alias, countryName }) => "  ('" + escapeSql(alias) + "', '" + escapeSql(countryName) + "')")
  .join(',\n');

// 3. INSERT dive_sites: VALUES (name, country_lookup, type_name) then JOIN
const batchSize = 500;
const valueBatches = [];
for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize);
  const values = batch
    .map(
      (r) =>
        "  ('" +
        escapeSql(r.name) +
        "', '" +
        escapeSql(r.country) +
        "', '" +
        escapeSql(r.typeName) +
        "')"
    )
    .join(',\n');
  valueBatches.push(values);
}

const sql = [
  '-- Insert dive_site_types, country_aliases, and dive_sites from Scuba Master Database v.12 - Dive Sites.csv',
  '',
  '-- 1. Dive site types (canonical list)',
  'INSERT INTO dive_site_types (name) VALUES',
  '  ' + typeInserts,
  'ON CONFLICT (name) DO NOTHING;',
  '',
  '-- 2. Country aliases (CSV-style names -> countries)',
  'INSERT INTO country_aliases (alias, country_id)',
  'SELECT v.alias, c.id FROM (VALUES',
  aliasInserts,
  ') AS v(alias, country_name)',
  'JOIN countries c ON c.name = v.country_name',
  'ON CONFLICT (alias) DO NOTHING;',
  '',
  '-- 3. Dive sites (resolve country via countries then country_aliases; dedupe by name+country)',
];

for (let b = 0; b < valueBatches.length; b++) {
  sql.push(
    'INSERT INTO dive_sites (name, country_id, dive_site_type_id)',
    'SELECT v.name, COALESCE(c.id, a.country_id), t.id',
    'FROM (VALUES',
    valueBatches[b],
    ') AS v(name, country_lookup, type_name)',
    'LEFT JOIN countries c ON c.name = v.country_lookup',
    'LEFT JOIN country_aliases a ON a.alias = v.country_lookup',
    'LEFT JOIN dive_site_types t ON t.name = v.type_name',
    'WHERE COALESCE(c.id, a.country_id) IS NOT NULL AND t.id IS NOT NULL',
    'ON CONFLICT (name, country_id) DO NOTHING;',
    ''
  );
}

const outPath = path.join(__dirname, '../supabase/migrations/20250228000007_insert_dive_site_types_and_dive_sites_data.sql');
fs.writeFileSync(outPath, sql.join('\n'));
console.log('dive_site_types:', canonicalTypes.length);
console.log('country_aliases:', aliasesToInsert.length);
console.log('dive_sites rows (resolved, deduped):', rows.length);
console.log('Written:', outPath);
