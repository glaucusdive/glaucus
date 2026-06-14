-- Intent signals for browse vs booking routing calibration (Phase 2 learning loop).

CREATE TABLE IF NOT EXISTS chat_intent_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    message TEXT NOT NULL,
    predicted_readiness SMALLINT NOT NULL CHECK (predicted_readiness >= 1 AND predicted_readiness <= 10),
    primary_verb TEXT,
    nlu_goal TEXT,
    routed_intent TEXT,
    outcome TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_intent_signals_created_at_idx ON chat_intent_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS chat_intent_signals_user_id_idx ON chat_intent_signals (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE chat_intent_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own intent signals" ON chat_intent_signals;
DROP POLICY IF EXISTS "Service role manages intent signals" ON chat_intent_signals;

CREATE POLICY "Users can read own intent signals" ON chat_intent_signals
    FOR SELECT USING (auth.uid() = user_id);

-- Inserts are server-side via service role only (no user INSERT policy).

COMMENT ON TABLE chat_intent_signals IS 'Orchestrator intent predictions vs outcomes for browse/book routing calibration';
