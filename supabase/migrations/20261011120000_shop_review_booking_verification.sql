ALTER TABLE public.shop_reviews
  ADD COLUMN IF NOT EXISTS booking_submission_id UUID
  REFERENCES public.booking_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shop_reviews_booking_submission_id
  ON public.shop_reviews (booking_submission_id)
  WHERE booking_submission_id IS NOT NULL;

UPDATE public.shop_reviews AS review
SET booking_submission_id = (
  SELECT submission.id
  FROM public.booking_submissions AS submission
  JOIN auth.users AS account ON account.id = review.user_id
  WHERE submission.shop_id = review.diveshop_id
    AND (account.email_confirmed_at IS NOT NULL OR account.confirmed_at IS NOT NULL)
    AND (
      submission.user_id = review.user_id
      OR (
        submission.user_id IS NULL
        AND lower(btrim(COALESCE(submission.payload ->> 'email', ''))) = lower(btrim(COALESCE(account.email, '')))
      )
    )
  ORDER BY submission.sent_at DESC NULLS LAST, submission.created_at DESC, submission.id DESC
  LIMIT 1
)
WHERE review.booking_submission_id IS NULL;

COMMENT ON COLUMN public.shop_reviews.booking_submission_id IS
  'Latest matching successfully sent Glaucus booking request; does not imply trip completion.';

DROP POLICY IF EXISTS "Users insert own shop reviews" ON public.shop_reviews;
DROP POLICY IF EXISTS "Users update own shop reviews" ON public.shop_reviews;
DROP POLICY IF EXISTS "Admins delete any shop reviews" ON public.shop_reviews;