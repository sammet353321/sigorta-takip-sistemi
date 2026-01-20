-- Drop likely policies
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
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_group_id_fkey;
ALTER TABLE chat_group_permissions DROP CONSTRAINT IF EXISTS chat_group_permissions_group_id_fkey;
ALTER TABLE chat_group_workgroups DROP CONSTRAINT IF EXISTS chat_group_workgroups_chat_group_id_fkey; -- Added this

-- Change types
ALTER TABLE chat_groups ALTER COLUMN id TYPE text;
ALTER TABLE chat_group_members ALTER COLUMN group_id TYPE text;
ALTER TABLE messages ALTER COLUMN group_id TYPE text;
ALTER TABLE chat_group_permissions ALTER COLUMN group_id TYPE text;
ALTER TABLE chat_group_workgroups ALTER COLUMN chat_group_id TYPE text; -- Added this

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

ALTER TABLE chat_group_permissions
    ADD CONSTRAINT chat_group_permissions_group_id_fkey
    FOREIGN KEY (group_id)
    REFERENCES chat_groups(id)
    ON DELETE CASCADE;

ALTER TABLE chat_group_workgroups
    ADD CONSTRAINT chat_group_workgroups_chat_group_id_fkey
    FOREIGN KEY (chat_group_id)
    REFERENCES chat_groups(id)
    ON DELETE CASCADE;

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
