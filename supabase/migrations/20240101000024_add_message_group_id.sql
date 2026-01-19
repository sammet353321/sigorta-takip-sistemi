-- Add group_id to messages table to link messages to specific chat groups
ALTER TABLE messages ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES chat_groups(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
