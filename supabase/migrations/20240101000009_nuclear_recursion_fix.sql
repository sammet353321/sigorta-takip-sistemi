-- 1. DROP ALL POLICIES on users table using dynamic SQL to be absolutely sure
DO $$ 
DECLARE 
    pol record; 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname); 
    END LOOP; 
END $$;

-- 2. Create SEPARATE policies to avoid recursion

-- READ POLICY (Non-recursive)
-- Allows reading if you are logged in. 
-- Since this depends ONLY on auth.role() (JWT) and not on the table data, it cannot recurse.
CREATE POLICY "users_read_policy" ON users 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- WRITE POLICIES (Admin Only)
-- We split these out. They query the 'users' table to check for admin role.
-- But since the query inside uses SELECT, it will use the "users_read_policy" above, 
-- which is non-recursive. This breaks the loop.

CREATE POLICY "users_insert_policy" ON users 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "users_update_policy" ON users 
FOR UPDATE 
USING (
  -- User can update self OR Admin can update anyone
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "users_delete_policy" ON users 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
