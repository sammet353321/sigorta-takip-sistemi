-- 1. Drop dependent constraints
ALTER TABLE chat_group_members DROP CONSTRAINT IF EXISTS chat_group_members_group_id_fkey;

-- 2. Change column type (using USING to cast if needed, though UUID to TEXT is implicit)
ALTER TABLE chat_groups ALTER COLUMN id TYPE text;
ALTER TABLE chat_group_members ALTER COLUMN group_id TYPE text;

-- 3. Re-add constraints
ALTER TABLE chat_group_members 
    ADD CONSTRAINT chat_group_members_group_id_fkey 
    FOREIGN KEY (group_id) 
    REFERENCES chat_groups(id) 
    ON DELETE CASCADE;
