-- Drop zip column since it's not needed for international data
-- Full address information will be in street_address
ALTER TABLE diveshops DROP COLUMN zip;
