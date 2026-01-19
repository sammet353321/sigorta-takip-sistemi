
ALTER TABLE chat_groups ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);
