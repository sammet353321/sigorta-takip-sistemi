-- Add phone column to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Update messages table to support non-registered users
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(100);

-- Allow user_id to be NULL for unknown senders
ALTER TABLE messages ALTER COLUMN user_id DROP NOT NULL;
