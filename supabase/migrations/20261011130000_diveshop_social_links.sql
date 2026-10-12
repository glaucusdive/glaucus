ALTER TABLE public.diveshops
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.diveshops.social_links IS
  'Public social media and review URLs as a JSON array of {label, url} objects.';