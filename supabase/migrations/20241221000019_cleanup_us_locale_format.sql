-- Clean up US locale format to remove redundant "United States"
-- For US records: Change "City, State, United States" to just "City, State"
-- For non-US records: Keep "City, Country" format

UPDATE diveshops 
SET 
    locale = CASE 
        -- For US records, extract just city and state
        WHEN country = 'United States' AND locale LIKE '%, %, United States' THEN
            SUBSTRING(locale FROM 1 FOR POSITION(', United States' IN locale) - 1)
        -- For US records that might have extra "United States"
        WHEN country = 'United States' AND locale LIKE '%, %, %, United States' THEN
            SUBSTRING(locale FROM 1 FOR POSITION(', United States' IN locale) - 1)
        -- Keep non-US records as they are
        ELSE locale
    END
WHERE country = 'United States';


