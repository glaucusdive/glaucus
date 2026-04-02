-- booking_submissions: log of successfully sent booking requests per user.

CREATE TABLE IF NOT EXISTS booking_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES diveshops(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_submissions_user_id ON booking_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_submissions_shop_id ON booking_submissions(shop_id);
CREATE INDEX IF NOT EXISTS idx_booking_submissions_sent_at ON booking_submissions(sent_at DESC);

ALTER TABLE booking_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own submissions" ON booking_submissions;
DROP POLICY IF EXISTS "Users can insert own submissions" ON booking_submissions;
CREATE POLICY "Users can read own submissions" ON booking_submissions
    FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own submissions" ON booking_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE booking_submissions IS 'Sent booking requests per user; payload mirrors booking request body.';
