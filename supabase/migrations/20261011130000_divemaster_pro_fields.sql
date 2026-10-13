-- Dive Pro highlight fields on divemaster profiles.
-- last formal training + favorite local/destination dive sites (FK to dive_sites).

ALTER TABLE public.divemaster_profiles
  ADD COLUMN IF NOT EXISTS last_formal_training_name text,
  ADD COLUMN IF NOT EXISTS last_formal_training_date date,
  ADD COLUMN IF NOT EXISTS favorite_local_dive_site_id uuid REFERENCES public.dive_sites (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS favorite_destination_dive_site_id uuid REFERENCES public.dive_sites (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_divemaster_profiles_favorite_local
  ON public.divemaster_profiles (favorite_local_dive_site_id)
  WHERE favorite_local_dive_site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_divemaster_profiles_favorite_destination
  ON public.divemaster_profiles (favorite_destination_dive_site_id)
  WHERE favorite_destination_dive_site_id IS NOT NULL;
