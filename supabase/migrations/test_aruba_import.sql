-- Test import of cleaned Aruba data
-- This will import the Aruba_Scuba_Shops_CLEANED.csv file

COPY diveshops (business_name, street_address, locale, country, region, website_url, phone, email, google_rating)
FROM '/tmp/Aruba_Scuba_Shops_CLEANED.csv' 
WITH (FORMAT csv, HEADER true);

-- Verify the import worked
SELECT 
    business_name, 
    locale, 
    country, 
    region, 
    google_rating,
    created_at
FROM diveshops 
WHERE country = 'Aruba'
ORDER BY business_name;
