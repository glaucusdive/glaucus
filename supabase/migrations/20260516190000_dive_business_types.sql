-- Canonical dive business types (liveaboard, dive shop, resort) for admin multi-select.
CREATE TABLE IF NOT EXISTS dive_business_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dive_business_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON dive_business_types;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON dive_business_types;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON dive_business_types;
CREATE POLICY "Allow public read access" ON dive_business_types FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON dive_business_types FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON dive_business_types FOR UPDATE USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_dive_business_types_name ON dive_business_types(name);

INSERT INTO dive_business_types (name) VALUES
  ('Dive Shop'),
  ('Dive Resort'),
  ('Liveaboard')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE dive_business_types IS 'Lookup for diveshops.type values; admin multi-select serializes selected names to diveshops.type.';
