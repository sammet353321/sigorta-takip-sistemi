-- 1. Drop existing problematic policies on users
DROP POLICY IF EXISTS "Allow read all users" ON users;
DROP POLICY IF EXISTS "Admins full access" ON users;
DROP POLICY IF EXISTS "Users update self" ON users;
DROP POLICY IF EXISTS "Users read own" ON users;
DROP POLICY IF EXISTS "Admins manage all" ON users;

-- 2. Create a clean, non-recursive SELECT policy
-- This allows any logged-in user to read the users table.
-- This breaks the recursion because checking "am I an admin?" (SELECT role FROM users)
-- will now use THIS policy, which simply checks auth.role() = 'authenticated' (no table query).
CREATE POLICY "Allow all authenticated to read users" ON users 
FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Create Admin Write Policy
-- Now this can safely query the users table because the SELECT inside it will use the policy above.
CREATE POLICY "Admins can insert/update/delete users" ON users 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Allow users to update their own basic info (optional)
CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE USING (auth.uid() = id);
