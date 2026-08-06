-- Allow guest booking submissions (user_id nullable) and admin read for dashboard KPIs.

ALTER TABLE booking_submissions
  ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Admins read all submissions" ON booking_submissions;
CREATE POLICY "Admins read all submissions" ON booking_submissions
  FOR SELECT TO authenticated
  USING (public.is_app_admin());

COMMENT ON COLUMN booking_submissions.user_id IS
  'Auth user when signed in; NULL for guest bookings logged after successful email send.';
