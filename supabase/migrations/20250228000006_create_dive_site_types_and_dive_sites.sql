-- Dive site types and dive sites; country_aliases for CSV-style country lookups
-- Assumes update_updated_at_column() and countries table exist (from 20250228000000)

-- 1. Dive site types (reference table)
CREATE TABLE IF NOT EXISTS dive_site_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_dive_site_types_updated_at ON dive_site_types;
CREATE TRIGGER update_dive_site_types_updated_at
    BEFORE UPDATE ON dive_site_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE dive_site_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON dive_site_types;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON dive_site_types;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON dive_site_types;
CREATE POLICY "Allow public read access" ON dive_site_types FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON dive_site_types FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON dive_site_types FOR UPDATE USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_dive_site_types_name ON dive_site_types(name);

-- 2. Country aliases: map CSV-style names to countries.id (single source of truth remains countries)
CREATE TABLE IF NOT EXISTS country_aliases (
    alias TEXT PRIMARY KEY,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE country_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON country_aliases;
CREATE POLICY "Allow public read access" ON country_aliases FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON country_aliases FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON country_aliases FOR UPDATE USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_country_aliases_country_id ON country_aliases(country_id);

-- 3. Dive sites (name + country unique; type optional)
CREATE TABLE IF NOT EXISTS dive_sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    dive_site_type_id UUID REFERENCES dive_site_types(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, country_id)
);

DROP TRIGGER IF EXISTS update_dive_sites_updated_at ON dive_sites;
CREATE TRIGGER update_dive_sites_updated_at
    BEFORE UPDATE ON dive_sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE dive_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON dive_sites;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON dive_sites;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON dive_sites;
CREATE POLICY "Allow public read access" ON dive_sites FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON dive_sites FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON dive_sites FOR UPDATE USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_dive_sites_country_id ON dive_sites(country_id);
CREATE INDEX IF NOT EXISTS idx_dive_sites_dive_site_type_id ON dive_sites(dive_site_type_id);
CREATE INDEX IF NOT EXISTS idx_dive_sites_name ON dive_sites(name);

COMMENT ON TABLE dive_site_types IS 'Reference table for dive site type (Beach, Wreck, Reef, etc.)';
COMMENT ON TABLE country_aliases IS 'Maps alternate country names (e.g. USA) to countries.id for imports and lookups';
COMMENT ON TABLE dive_sites IS 'Dive sites with unique (name, country_id); type optional';
