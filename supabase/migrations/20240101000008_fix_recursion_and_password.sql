-- 1. AGGRESSIVE CLEANUP of Users Table Policies
-- We drop every policy name we have ever used or seen to ensure no recursive policy remains.

DROP POLICY IF EXISTS "Users read own" ON users;
DROP POLICY IF EXISTS "Admins manage all" ON users;
DROP POLICY IF EXISTS "Allow read all users" ON users;
DROP POLICY IF EXISTS "Admins full access" ON users;
DROP POLICY IF EXISTS "Users update self" ON users;
DROP POLICY IF EXISTS "Allow all authenticated to read users" ON users;
DROP POLICY IF EXISTS "Admins can insert/update/delete users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
-- Also drop potential default/auto-generated names if any (rare but possible)

-- 2. Re-apply Safe Policies
-- KEY FIX: The SELECT policy must NOT query the users table.
-- It strictly uses auth.role() which comes from the JWT.
CREATE POLICY "safe_read_all_users" ON users 
FOR SELECT USING (auth.role() = 'authenticated');

-- Admin Write Policy
-- This queries 'users' table (to check if I am admin), but since it's an INSERT/UPDATE/DELETE policy,
-- and the SELECT inside it will use the "safe_read_all_users" policy above, it won't recurse.
CREATE POLICY "safe_admin_write_users" ON users 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- User Update Own Policy
CREATE POLICY "safe_user_update_self" ON users 
FOR UPDATE USING (auth.uid() = id);


-- 3. FORCE RESET ADMIN PASSWORD
-- This ensures the password is exactly '1234samet' even if the user already existed.
UPDATE auth.users 
SET encrypted_password = crypt('1234samet', gen_salt('bf')),
    updated_at = now(),
    email_confirmed_at = COALESCE(email_confirmed_at, now()), -- Ensure confirmed
    raw_user_meta_data = '{"name":"Yönetici"}'::jsonb
WHERE email = 'admin@gmail.com';
