-- Add languages as text array (simple, queryable, no extra table needed)
ALTER TABLE public.diveshops 
ADD COLUMN languages text[];

-- Add index for searching shops by language (for future AI features)
CREATE INDEX idx_diveshops_languages ON public.diveshops USING GIN (languages);

-- Add comment for documentation
COMMENT ON COLUMN public.diveshops.languages IS 
'Array of languages spoken at the dive shop (e.g., ["English", "Spanish", "French"])';

