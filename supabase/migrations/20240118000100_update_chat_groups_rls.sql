
-- Ensure employees can view all chat groups
DROP POLICY IF EXISTS "Employees can view assigned chat groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Employees can view all chat groups" ON public.chat_groups;

CREATE POLICY "Employees can view all chat groups" ON public.chat_groups
    FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'employee')));
