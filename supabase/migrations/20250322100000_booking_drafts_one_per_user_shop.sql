-- One saved draft per user per dive shop (same booking can only have one row).
-- Removes historical duplicates (keeps the most recently updated row per pair).

DELETE FROM public.booking_drafts bd
WHERE bd.id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, shop_id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      ) AS rn
    FROM public.booking_drafts
  ) t
  WHERE t.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS booking_drafts_user_id_shop_id_key
  ON public.booking_drafts (user_id, shop_id);
