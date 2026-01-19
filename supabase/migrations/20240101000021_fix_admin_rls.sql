-- Fix RLS policies for chat_groups to allow Admin INSERT/UPDATE/DELETE

-- Drop existing SELECT policies to be cleaner (we will recreate them properly)
DROP POLICY IF EXISTS "Admin View All Groups" ON chat_groups;
DROP POLICY IF EXISTS "Employee View Assigned Groups" ON chat_groups;

-- 1. Admin Policy: FULL ACCESS (Select, Insert, Update, Delete)
CREATE POLICY "Admin Full Access Groups" ON chat_groups FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- 2. Employee Policy: SELECT ONLY (Assigned Groups)
CREATE POLICY "Employee View Assigned Groups" ON chat_groups FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chat_group_permissions 
        WHERE group_id = chat_groups.id 
        AND user_id = auth.uid()
    )
);

-- Also fix chat_group_members permissions just in case
DROP POLICY IF EXISTS "Admin View All Members" ON chat_group_members;

CREATE POLICY "Admin Full Access Members" ON chat_group_members FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Also fix chat_group_permissions permissions
DROP POLICY IF EXISTS "Admin View All Permissions" ON chat_group_permissions;

CREATE POLICY "Admin Full Access Permissions" ON chat_group_permissions FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);
