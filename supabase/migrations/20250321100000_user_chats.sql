-- Persisted chat sessions (ChatsRoot JSON) per signed-in user for cross-device/browser continuity.

CREATE TABLE IF NOT EXISTS user_chats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    root JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_user_chats_updated_at ON user_chats;
CREATE TRIGGER update_user_chats_updated_at
    BEFORE UPDATE ON user_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own chats" ON user_chats;
DROP POLICY IF EXISTS "Users can insert own chats" ON user_chats;
DROP POLICY IF EXISTS "Users can update own chats" ON user_chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON user_chats;

CREATE POLICY "Users can read own chats" ON user_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chats" ON user_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chats" ON user_chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chats" ON user_chats FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE user_chats IS 'Single row per user: root mirrors client ChatsRoot { version, activeSessionId, sessions[] } in sessionStorage';
