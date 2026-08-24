-- Store Resend message IDs (and shop recipient snapshot) for admin lookup.

ALTER TABLE booking_submissions
  ADD COLUMN IF NOT EXISTS resend_shop_email_id text,
  ADD COLUMN IF NOT EXISTS resend_user_email_id text,
  ADD COLUMN IF NOT EXISTS shop_email_to text;

COMMENT ON COLUMN booking_submissions.resend_shop_email_id IS
  'Resend email id for the message sent to the dive shop.';
COMMENT ON COLUMN booking_submissions.resend_user_email_id IS
  'Resend email id for the guest confirmation message, when sent.';
COMMENT ON COLUMN booking_submissions.shop_email_to IS
  'Dive shop recipient address used at send time.';
