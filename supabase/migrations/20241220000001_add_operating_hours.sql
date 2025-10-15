-- Add operating hours to diveshops table
-- Hours format: {"monday": "08:00-17:00", "tuesday": "closed", ...}
-- Times in 24-hour HH:MM format, local to shop location

ALTER TABLE public.diveshops 
ADD COLUMN operating_hours JSONB;

-- Add timezone column for future use
ALTER TABLE public.diveshops 
ADD COLUMN timezone text;

-- Add comment for documentation
COMMENT ON COLUMN public.diveshops.operating_hours IS 
'Store hours in format: {"monday": "08:00-17:00", "tuesday": "closed", ...}. Times in 24-hour HH:MM format, local to shop location.';

COMMENT ON COLUMN public.diveshops.timezone IS 
'IANA timezone identifier (e.g., "Asia/Makassar" for Bali). Optional field for future timezone conversions.';

