-- 1. Fix Users RLS to allow role checks
-- Drop existing policy if it's too restrictive
DROP POLICY IF EXISTS "Users read own" ON users;
DROP POLICY IF EXISTS "Admins manage all" ON users;

-- Allow ANY authenticated user to read ALL users (needed for role checks and admin lists)
-- In a stricter system, we might only allow reading self, but for this app structure,
-- we need to read roles to redirect, and admins need to list everyone.
CREATE POLICY "Allow read all users" ON users 
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admins to insert/update/delete
CREATE POLICY "Admins full access" ON users 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow users to update their own profile (optional, but good practice)
CREATE POLICY "Users update self" ON users 
FOR UPDATE USING (auth.uid() = id);


-- 2. Fix Policies RLS
DROP POLICY IF EXISTS "Policies Access" ON policies;

CREATE POLICY "Policies Access Fix" ON policies 
FOR ALL USING (
  -- User owns the policy (as sub-agent or issuer)
  sub_agent_id = auth.uid() OR 
  issued_by = auth.uid() OR 
  -- OR user is admin/employee
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('admin', 'employee')
  )
);


-- 3. Fix Quotes RLS (ensure similar logic)
DROP POLICY IF EXISTS "Quotes Access" ON quotes;

CREATE POLICY "Quotes Access Fix" ON quotes 
FOR ALL USING (
  sub_agent_id = auth.uid() OR 
  issued_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('admin', 'employee')
  )
);

-- 4. Ensure public access to necessary functions if any
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON policies TO authenticated;
GRANT SELECT ON quotes TO authenticated;
