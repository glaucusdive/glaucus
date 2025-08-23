-- Update diveshops table schema for international data
-- Rename columns to be more international-friendly

-- Rename city to locale
ALTER TABLE diveshops RENAME COLUMN city TO locale;

-- Rename state to country  
ALTER TABLE diveshops RENAME COLUMN state TO country;

-- Add region column for broader geographic areas
ALTER TABLE diveshops ADD COLUMN region TEXT;

-- Drop zip column since it's not needed for international data
-- Full address information will be in street_address
ALTER TABLE diveshops DROP COLUMN zip;

-- Update existing California data to proper format
UPDATE diveshops 
SET 
    locale = locale || ', California',  -- "Diamond Bar, California"
    country = 'United States',
    region = 'North America'
WHERE country = 'CA';

-- Create indexes for the new column structure
CREATE INDEX IF NOT EXISTS idx_diveshops_locale ON diveshops(locale);
CREATE INDEX IF NOT EXISTS idx_diveshops_country ON diveshops(country);
CREATE INDEX IF NOT EXISTS idx_diveshops_region ON diveshops(region);

-- Drop old indexes that are no longer relevant
DROP INDEX IF EXISTS idx_diveshops_city;
DROP INDEX IF EXISTS idx_diveshops_state;
