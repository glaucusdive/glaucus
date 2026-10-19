-- Admin hide for shop and divemaster reviews. Public reads omit hidden rows.
-- Apply in each Supabase environment before relying on Hide in /admin/reviews.
-- This file is not applied automatically to hosted databases.

ALTER TABLE public.shop_reviews
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.divemaster_reviews
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_shop_reviews_hidden_created_at
  ON public.shop_reviews (hidden, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_divemaster_reviews_hidden_created_at
  ON public.divemaster_reviews (hidden, created_at DESC);

COMMENT ON COLUMN public.shop_reviews.hidden IS
  'When true, the review is hidden from public profiles and search counts. Admins still see it.';
COMMENT ON COLUMN public.divemaster_reviews.hidden IS
  'When true, the review is hidden from public profiles. Admins still see it.';

DROP POLICY IF EXISTS "Anyone can read shop reviews" ON public.shop_reviews;
DROP POLICY IF EXISTS "Anyone can read visible shop reviews" ON public.shop_reviews;
CREATE POLICY "Anyone can read visible shop reviews" ON public.shop_reviews
  FOR SELECT USING (hidden = false);

CREATE OR REPLACE FUNCTION public.get_shop_review_summaries(p_shop_ids UUID[])
RETURNS TABLE (
  diveshop_id UUID,
  average_rating NUMERIC,
  review_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    reviews.diveshop_id,
    AVG(reviews.rating)::NUMERIC,
    COUNT(*)::BIGINT
  FROM public.shop_reviews AS reviews
  WHERE reviews.diveshop_id = ANY(COALESCE(p_shop_ids, ARRAY[]::UUID[]))
    AND reviews.hidden = false
  GROUP BY reviews.diveshop_id;
$$;

REVOKE ALL ON FUNCTION public.get_shop_review_summaries(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shop_review_summaries(UUID[]) TO anon, authenticated;
