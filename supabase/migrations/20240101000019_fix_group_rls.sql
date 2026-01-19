-- Drop existing policies to recreate them safely
DROP POLICY IF EXISTS "Admin All Groups" ON chat_groups;
DROP POLICY IF EXISTS "Employee View Assigned Groups" ON chat_groups;
DROP POLICY IF EXISTS "Admin All Permissions" ON chat_group_permissions;

-- 1. Chat Groups Policies
-- Admin can see all
CREATE POLICY "Admin View All Groups" ON chat_groups FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Employee can see assigned groups
CREATE POLICY "Employee View Assigned Groups" ON chat_groups FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chat_group_permissions 
        WHERE group_id = chat_groups.id 
        AND user_id = auth.uid()
    )
);

-- 2. Permissions Policies
-- Admin can see all permissions
CREATE POLICY "Admin View All Permissions" ON chat_group_permissions FOR SELECT USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Employee can see permissions related to themselves (to fetch their own groups)
CREATE POLICY "Employee View Own Permissions" ON chat_group_permissions FOR SELECT USING (
    user_id = auth.uid()
);
