const fs = require('fs');
const path = require('path');

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

const tablePath = path.join(__dirname, '../csvfiles/Scuba Master Database v.12 - Courses Table.csv');
const coursesPath = path.join(__dirname, '../csvfiles/Scuba Master Database v.12 - Courses.csv');
const outPath = path.join(__dirname, '../supabase/migrations/20250228000003_insert_courses_data.sql');

// ---- Courses Table.csv: Agency, Level, Ranking
const tableLines = fs.readFileSync(tablePath, 'utf8').split(/\r?\n/);
const tableRows = [];
for (let i = 1; i < tableLines.length; i++) {
  const line = tableLines[i].trim();
  if (!line) continue;
  const parts = parseCSVLine(line);
  const agency = (parts[0] || '').trim();
  const level = (parts[1] || '').trim();
  const ranking = (parts[2] || '').trim();
  if (!agency || level === undefined) continue;
  tableRows.push({ agency, level: level.replace(/'/g, "''"), ranking: parseInt(ranking, 10) });
}

const agencies = [...new Set(tableRows.map((r) => r.agency))].sort();
const agencyInserts = agencies.map((a) => "('" + escapeSql(a) + "')").join(',\n  ');

const levelInserts = tableRows.map((r) => {
  const agencyEsc = "'" + escapeSql(r.agency) + "'";
  const nameEsc = "'" + r.level + "'";
  return "(" + agencyEsc + ", " + nameEsc + ", " + r.ranking + ")";
});

// ---- Courses.csv: Agency, Certification Name, Level, Depth Limit, Description
const coursesLines = fs.readFileSync(coursesPath, 'utf8').split(/\r?\n/);
const courseRows = [];
for (let i = 1; i < coursesLines.length; i++) {
  const line = coursesLines[i].trim();
  if (!line) continue;
  const parts = parseCSVLine(line);
  const agency = (parts[0] || '').trim();
  const certName = (parts[1] || '').trim().replace(/'/g, "''");
  const level = (parts[2] || '').trim().replace(/'/g, "''");
  const depthLimit = (parts[3] || '').trim().replace(/'/g, "''");
  const description = (parts[4] || '').trim().replace(/'/g, "''");
  if (!agency || !certName) continue;
  const depthVal = depthLimit === '' ? 'NULL' : "'" + depthLimit + "'";
  const descVal = description === '' ? 'NULL' : "'" + description + "'";
  courseRows.push({
    agency: "'" + escapeSql(agency) + "'",
    certName: "'" + certName + "'",
    level: "'" + level + "'",
    depthVal,
    descVal,
  });
}

const courseValues = courseRows.map(
  (r) => "(" + r.agency + ", " + r.certName + ", " + r.level + ", " + r.depthVal + ", " + r.descVal + ")"
);

const sql = [
  '-- Insert agencies, course_levels (from Courses Table.csv), then courses (from Courses.csv)',
  '',
  '-- 1. Insert agencies',
  'INSERT INTO agencies (name) VALUES',
  '  ' + agencyInserts,
  'ON CONFLICT (name) DO NOTHING;',
  '',
  '-- 2. Insert course_levels (agency_id, name, ranking)',
  'INSERT INTO course_levels (agency_id, name, ranking)',
  'SELECT a.id, v.name, v.ranking::integer',
  'FROM (VALUES',
  '  ' + levelInserts.join(',\n  '),
  ') AS v(agency_name, name, ranking)',
  'JOIN agencies a ON a.name = v.agency_name',
  'ON CONFLICT (agency_id, name) DO NOTHING;',
  '',
  '-- 3. Insert courses (agency_id, certification_name, course_level_id, depth_limit, description)',
  'INSERT INTO courses (agency_id, certification_name, course_level_id, depth_limit, description)',
  'SELECT a.id, v.certification_name, cl.id, v.depth_limit, v.description',
  'FROM (VALUES',
  '  ' + courseValues.join(',\n  '),
  ') AS v(agency_name, certification_name, level_name, depth_limit, description)',
  'JOIN agencies a ON a.name = v.agency_name',
  'JOIN course_levels cl ON cl.agency_id = a.id AND cl.name = v.level_name',
  'ON CONFLICT (agency_id, certification_name) DO NOTHING;',
].join('\n');

fs.writeFileSync(outPath, sql);
console.log('Agencies:', agencies.length, 'Course levels:', tableRows.length, 'Courses:', courseRows.length);
