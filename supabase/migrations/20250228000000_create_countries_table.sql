-- Ensure updated_at trigger function exists (shared with regions, countries, etc.)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create regions table (referenced by countries)
CREATE TABLE IF NOT EXISTS regions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON regions FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON regions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON regions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);

-- Create countries table (schema matches Scuba Master Database Countries CSV)
CREATE TABLE IF NOT EXISTS countries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    iso2 CHAR(2) UNIQUE NOT NULL,
    iso3 CHAR(3) UNIQUE,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    region_id UUID REFERENCES regions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_countries_updated_at
    BEFORE UPDATE ON countries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON countries
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert" ON countries
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update" ON countries
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_countries_iso2 ON countries(iso2);
CREATE INDEX IF NOT EXISTS idx_countries_iso3 ON countries(iso3);
CREATE INDEX IF NOT EXISTS idx_countries_name ON countries(name);
CREATE INDEX IF NOT EXISTS idx_countries_region_id ON countries(region_id);

COMMENT ON TABLE regions IS 'Reference table for regions (used by countries)';
COMMENT ON TABLE countries IS 'Reference table for countries (ISO 3166-1)';
