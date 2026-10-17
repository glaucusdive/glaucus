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
  GROUP BY reviews.diveshop_id;
$$;

REVOKE ALL ON FUNCTION public.get_shop_review_summaries(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shop_review_summaries(UUID[]) TO anon, authenticated;