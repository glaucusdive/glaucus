-- Partner portal tokens + shop owner update submissions (admin review workflow).

CREATE TABLE IF NOT EXISTS diveshop_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diveshop_id UUID NOT NULL REFERENCES diveshops(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS diveshop_portal_tokens_active_shop_idx
  ON diveshop_portal_tokens (diveshop_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS diveshop_portal_tokens_token_idx
  ON diveshop_portal_tokens (token)
  WHERE revoked_at IS NULL;

ALTER TABLE diveshop_portal_tokens ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE diveshop_portal_tokens IS
  'Secret-link tokens for /partner/{token} shop owner portal. Accessed only via server service role.';

DROP POLICY IF EXISTS "Admins manage portal tokens" ON diveshop_portal_tokens;
CREATE POLICY "Admins manage portal tokens" ON diveshop_portal_tokens
  FOR ALL TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE TABLE IF NOT EXISTS shop_update_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diveshop_id UUID NOT NULL REFERENCES diveshops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_notes TEXT,
  baseline_snapshot JSONB NOT NULL,
  proposed_payload JSONB NOT NULL,
  admin_payload JSONB,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_update_submissions_status_created_idx
  ON shop_update_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS shop_update_submissions_diveshop_idx
  ON shop_update_submissions (diveshop_id);

ALTER TABLE shop_update_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage shop update submissions" ON shop_update_submissions;
CREATE POLICY "Admins manage shop update submissions" ON shop_update_submissions
  FOR ALL TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

COMMENT ON TABLE shop_update_submissions IS
  'Proposed dive shop edits from partner portal; admins approve/deny before applying to diveshops.';
