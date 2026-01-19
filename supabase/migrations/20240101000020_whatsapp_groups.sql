-- Add WhatsApp specific fields to chat_groups
ALTER TABLE chat_groups ADD COLUMN IF NOT EXISTS group_jid TEXT UNIQUE; -- WhatsApp ID (e.g. 123456@g.us)
ALTER TABLE chat_groups ADD COLUMN IF NOT EXISTS is_whatsapp_group BOOLEAN DEFAULT FALSE;

-- Add avatar url for groups
ALTER TABLE chat_groups ADD COLUMN IF NOT EXISTS avatar_url TEXT;
