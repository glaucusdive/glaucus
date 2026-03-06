-- Gases and rental equipment reference tables
-- Assumes update_updated_at_column() exists (from 20250228000000)

-- Gases (breathing mixes: Nitrox, Trimix, etc.)
CREATE TABLE IF NOT EXISTS gases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_gases_updated_at ON gases;
CREATE TRIGGER update_gases_updated_at
    BEFORE UPDATE ON gases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE gases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON gases;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON gases;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON gases;
CREATE POLICY "Allow public read access" ON gases FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON gases FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON gases FOR UPDATE USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_gases_name ON gases(name);

-- Rental equipment (Wetsuit, Regulator, Fins, etc.)
CREATE TABLE IF NOT EXISTS rental_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_rental_equipment_updated_at ON rental_equipment;
CREATE TRIGGER update_rental_equipment_updated_at
    BEFORE UPDATE ON rental_equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE rental_equipment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON rental_equipment;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON rental_equipment;
DROP POLICY IF EXISTS "Allow authenticated users to update" ON rental_equipment;
CREATE POLICY "Allow public read access" ON rental_equipment FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON rental_equipment FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON rental_equipment FOR UPDATE USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_rental_equipment_name ON rental_equipment(name);

COMMENT ON TABLE gases IS 'Reference table for breathing gas types';
COMMENT ON TABLE rental_equipment IS 'Reference table for rental equipment types';
