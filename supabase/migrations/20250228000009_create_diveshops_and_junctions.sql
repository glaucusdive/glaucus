-- New diveshops table with FKs to countries and regions; junction tables for courses, rental_equipment, gases, dive_sites
-- Assumes update_updated_at_column(), regions, countries, courses, gases, rental_equipment, dive_sites exist

-- 1. Diveshops (core table)
CREATE TABLE IF NOT EXISTS diveshops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_name TEXT NOT NULL,
    street_address TEXT,
    website_url TEXT,
    city TEXT,
    state TEXT,
    locale TEXT,
    phone TEXT,
    email TEXT,
    type TEXT,
    notes TEXT,
    country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
    region_id UUID REFERENCES regions(id) ON DELETE SET NULL,
    google_rating NUMERIC,
    operating_hours JSONB,
    timezone TEXT,
    languages TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_diveshops_updated_at ON diveshops;
CREATE TRIGGER update_diveshops_updated_at
    BEFORE UPDATE ON diveshops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE diveshops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON diveshops;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON diveshops;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON diveshops;
CREATE POLICY "Allow public read access" ON diveshops FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON diveshops FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON diveshops FOR UPDATE USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_diveshops_country_id ON diveshops(country_id);
CREATE INDEX IF NOT EXISTS idx_diveshops_region_id ON diveshops(region_id);
CREATE INDEX IF NOT EXISTS idx_diveshops_business_name ON diveshops(business_name);
CREATE INDEX IF NOT EXISTS idx_diveshops_google_rating ON diveshops(google_rating);

-- 2. Junction: diveshop_courses
CREATE TABLE IF NOT EXISTS diveshop_courses (
    diveshop_id UUID NOT NULL REFERENCES diveshops(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    PRIMARY KEY (diveshop_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_diveshop_courses_diveshop_id ON diveshop_courses(diveshop_id);
CREATE INDEX IF NOT EXISTS idx_diveshop_courses_course_id ON diveshop_courses(course_id);
ALTER TABLE diveshop_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON diveshop_courses FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON diveshop_courses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON diveshop_courses FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete" ON diveshop_courses FOR DELETE USING (auth.role() = 'authenticated');

-- 3. Junction: diveshop_rental_equipment
CREATE TABLE IF NOT EXISTS diveshop_rental_equipment (
    diveshop_id UUID NOT NULL REFERENCES diveshops(id) ON DELETE CASCADE,
    rental_equipment_id UUID NOT NULL REFERENCES rental_equipment(id) ON DELETE CASCADE,
    PRIMARY KEY (diveshop_id, rental_equipment_id)
);
CREATE INDEX IF NOT EXISTS idx_diveshop_rental_equipment_diveshop_id ON diveshop_rental_equipment(diveshop_id);
CREATE INDEX IF NOT EXISTS idx_diveshop_rental_equipment_rental_equipment_id ON diveshop_rental_equipment(rental_equipment_id);
ALTER TABLE diveshop_rental_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON diveshop_rental_equipment FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON diveshop_rental_equipment FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON diveshop_rental_equipment FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete" ON diveshop_rental_equipment FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Junction: diveshop_gases
CREATE TABLE IF NOT EXISTS diveshop_gases (
    diveshop_id UUID NOT NULL REFERENCES diveshops(id) ON DELETE CASCADE,
    gas_id UUID NOT NULL REFERENCES gases(id) ON DELETE CASCADE,
    PRIMARY KEY (diveshop_id, gas_id)
);
CREATE INDEX IF NOT EXISTS idx_diveshop_gases_diveshop_id ON diveshop_gases(diveshop_id);
CREATE INDEX IF NOT EXISTS idx_diveshop_gases_gas_id ON diveshop_gases(gas_id);
ALTER TABLE diveshop_gases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON diveshop_gases FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON diveshop_gases FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON diveshop_gases FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete" ON diveshop_gases FOR DELETE USING (auth.role() = 'authenticated');

-- 5. Junction: diveshop_dive_sites
CREATE TABLE IF NOT EXISTS diveshop_dive_sites (
    diveshop_id UUID NOT NULL REFERENCES diveshops(id) ON DELETE CASCADE,
    dive_site_id UUID NOT NULL REFERENCES dive_sites(id) ON DELETE CASCADE,
    PRIMARY KEY (diveshop_id, dive_site_id)
);
CREATE INDEX IF NOT EXISTS idx_diveshop_dive_sites_diveshop_id ON diveshop_dive_sites(diveshop_id);
CREATE INDEX IF NOT EXISTS idx_diveshop_dive_sites_dive_site_id ON diveshop_dive_sites(dive_site_id);
ALTER TABLE diveshop_dive_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON diveshop_dive_sites FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON diveshop_dive_sites FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON diveshop_dive_sites FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to delete" ON diveshop_dive_sites FOR DELETE USING (auth.role() = 'authenticated');

COMMENT ON TABLE diveshops IS 'Dive shops with FKs to countries and regions; many-to-many via junction tables for courses, rental_equipment, gases, dive_sites';
