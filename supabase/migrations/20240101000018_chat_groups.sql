-- 1. Chat Groups Table
CREATE TABLE IF NOT EXISTS chat_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Chat Group Members (Phones in the group)
CREATE TABLE IF NOT EXISTS chat_group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    phone TEXT NOT NULL, -- WhatsApp phone number
    name TEXT, -- Optional custom name for this member within the group
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, phone)
);

-- 3. Chat Group Permissions (Employees who can see this group)
CREATE TABLE IF NOT EXISTS chat_group_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Employee ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 4. Add 'group_id' to messages table (Optional but good for performance later)
-- For now, we will link messages to groups dynamically via phone numbers
-- But adding a column might be useful if we want to hard-link messages.
-- Let's stick to dynamic linking for now (Message Phone -> Member Phone -> Group) to avoid complex migration of existing messages.

-- Enable RLS
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin can do everything
CREATE POLICY "Admin All Groups" ON chat_groups FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin All Members" ON chat_group_members FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin All Permissions" ON chat_group_permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Employees can VIEW groups they are assigned to
CREATE POLICY "Employee View Assigned Groups" ON chat_groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_group_permissions WHERE group_id = chat_groups.id AND user_id = auth.uid())
);

-- Employees can VIEW members of their groups
CREATE POLICY "Employee View Assigned Members" ON chat_group_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_group_permissions WHERE group_id = chat_group_members.group_id AND user_id = auth.uid())
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_group_permissions;
