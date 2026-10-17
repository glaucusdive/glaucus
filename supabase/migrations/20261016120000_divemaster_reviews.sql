CREATE TABLE IF NOT EXISTS public.divemaster_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  divemaster_user_id UUID NOT NULL REFERENCES public.divemaster_profiles(user_id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  author_display_name TEXT NOT NULL DEFAULT 'Diver',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, divemaster_user_id),
  CHECK (user_id <> divemaster_user_id)
);

CREATE INDEX IF NOT EXISTS idx_divemaster_reviews_profile_created_at
  ON public.divemaster_reviews (divemaster_user_id, created_at DESC);

DROP TRIGGER IF EXISTS update_divemaster_reviews_updated_at ON public.divemaster_reviews;
CREATE TRIGGER update_divemaster_reviews_updated_at
  BEFORE UPDATE ON public.divemaster_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.set_divemaster_review_author_display_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT COALESCE(NULLIF(BTRIM(display_name), ''), 'Diver')
    INTO NEW.author_display_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF NEW.author_display_name IS NULL THEN
    NEW.author_display_name := 'Diver';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_divemaster_reviews_set_author ON public.divemaster_reviews;
CREATE TRIGGER trg_divemaster_reviews_set_author
  BEFORE INSERT OR UPDATE OF user_id ON public.divemaster_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_divemaster_review_author_display_name();

ALTER TABLE public.divemaster_reviews ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.divemaster_reviews IS
  'User-authored reviews of published divemaster profiles. Reads and writes use server APIs to avoid exposing reviewer account IDs.';