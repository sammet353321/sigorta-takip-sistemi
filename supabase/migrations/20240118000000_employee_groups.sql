
-- Create employee_groups table
CREATE TABLE IF NOT EXISTS public.employee_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create employee_group_members table
CREATE TABLE IF NOT EXISTS public.employee_group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.employee_groups(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Add assigned_employee_group_id to chat_groups
ALTER TABLE public.chat_groups 
ADD COLUMN IF NOT EXISTS assigned_employee_group_id UUID REFERENCES public.employee_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.employee_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_group_members ENABLE ROW LEVEL SECURITY;

-- Policies for employee_groups
CREATE POLICY "Admins can manage employee groups" ON public.employee_groups
    FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY "Employees can view employee groups" ON public.employee_groups
    FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'employee')));

-- Policies for employee_group_members
CREATE POLICY "Admins can manage employee group members" ON public.employee_group_members
    FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

CREATE POLICY "Employees can view employee group members" ON public.employee_group_members
    FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'employee')));

-- Update chat_groups policy to allow employees to view groups assigned to their employee group
-- (We might need to adjust existing policies, but for now let's ensure they can read)
