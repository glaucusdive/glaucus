-- Courses: agencies, course_levels (agency-scoped with ranking), courses
-- Assumes update_updated_at_column() exists (from 20250228000000)

-- Agencies (reusable for shops that teach this agency)
CREATE TABLE IF NOT EXISTS agencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_agencies_updated_at
    BEFORE UPDATE ON agencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON agencies FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON agencies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON agencies FOR UPDATE USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_agencies_name ON agencies(name);

-- Course levels: per-agency, with difficulty ranking (0 = Intro → 8 = Leadership)
CREATE TABLE IF NOT EXISTS course_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES agencies(id),
    name TEXT NOT NULL,
    ranking INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agency_id, name)
);

CREATE TRIGGER update_course_levels_updated_at
    BEFORE UPDATE ON course_levels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE course_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON course_levels FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON course_levels FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON course_levels FOR UPDATE USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_course_levels_agency_id ON course_levels(agency_id);
CREATE INDEX IF NOT EXISTS idx_course_levels_ranking ON course_levels(ranking);

-- Courses: certification name, level (FK), depth limit and description as text
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES agencies(id),
    certification_name TEXT NOT NULL,
    course_level_id UUID NOT NULL REFERENCES course_levels(id),
    depth_limit TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agency_id, certification_name)
);

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON courses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to update" ON courses FOR UPDATE USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_courses_agency_id ON courses(agency_id);
CREATE INDEX IF NOT EXISTS idx_courses_course_level_id ON courses(course_level_id);

COMMENT ON TABLE agencies IS 'Training agencies (PADI, NAUI, etc.); reusable for shops that teach';
COMMENT ON TABLE course_levels IS 'Level per agency with difficulty ranking (0=Intro to 8=Leadership)';
COMMENT ON TABLE courses IS 'Certification courses: name, level, depth limit, description';
