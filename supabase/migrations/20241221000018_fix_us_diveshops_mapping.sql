-- Fix US Dive Shops Data Mapping
-- This migration corrects the region and locale fields for US dive shops
-- Region should be 'North America' (continent), not individual states
-- Locale should be 'City, State, United States' format

-- Update all US dive shops to have correct region and locale mapping
UPDATE diveshops 
SET 
    region = 'North America',
    locale = CASE 
        WHEN locale IS NOT NULL AND region IS NOT NULL AND region != 'North America' 
        THEN CONCAT(locale, ', ', region, ', United States')
        WHEN locale IS NOT NULL 
        THEN CONCAT(locale, ', United States')
        ELSE 'United States'
    END
WHERE country = 'United States';

-- Verify the update worked by checking a few examples
-- SELECT business_name, locale, region, country FROM diveshops WHERE country = 'United States' LIMIT 5;
