-- Admin-only ranking flag: organically matched partner shops can pin above chat search results.
ALTER TABLE public.diveshops
  ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.diveshops.is_partner IS
  'When true, shop may appear in a Partner section above organic chat search results if it already matches the query. Admin-only; not writable via shop partner portal.';
