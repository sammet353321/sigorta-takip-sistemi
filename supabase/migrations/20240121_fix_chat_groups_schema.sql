-- Drop likely policies to free up the column
DROP POLICY IF EXISTS "Employee View Assigned Groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can view chat groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can insert chat groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can update chat groups" ON chat_groups;
DROP POLICY IF EXISTS "Authenticated users can delete chat groups" ON chat_groups;
DROP POLICY IF EXISTS "Enable read access for all users" ON chat_groups;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON chat_groups;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON chat_groups;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON chat_groups;

-- Drop constraints
ALTER TABLE chat_group_members DROP CONSTRAINT IF EXISTS chat_group_members_group_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_group_id_fkey; -- Also check messages table

-- Change types
ALTER TABLE chat_groups ALTER COLUMN id TYPE text;
ALTER TABLE chat_group_members ALTER COLUMN group_id TYPE text;
ALTER TABLE messages ALTER COLUMN group_id TYPE text;

-- Re-add constraints
ALTER TABLE chat_group_members 
    ADD CONSTRAINT chat_group_members_group_id_fkey 
    FOREIGN KEY (group_id) 
    REFERENCES chat_groups(id) 
    ON DELETE CASCADE;

ALTER TABLE messages
    ADD CONSTRAINT messages_group_id_fkey
    FOREIGN KEY (group_id)
    REFERENCES chat_groups(id)
    ON DELETE SET NULL;

-- Re-enable basic RLS
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chat groups" 
ON chat_groups FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert chat groups" 
ON chat_groups FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update chat groups" 
ON chat_groups FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete chat groups" 
ON chat_groups FOR DELETE 
USING (auth.role() = 'authenticated');
