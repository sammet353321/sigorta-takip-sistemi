-- 1. Create Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on Companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Companies
-- Everyone (authenticated) can read companies (needed for dropdowns etc.)
CREATE POLICY "companies_read_policy" ON companies
FOR SELECT USING (auth.role() = 'authenticated');

-- Only Admin can insert/update/delete companies
CREATE POLICY "companies_admin_write_policy" ON companies
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Fix Teklifler (Quotes) and Policeler (Policies) RLS
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Herkes kendi teklifini gorebilir veya yonetici hepsini" ON teklifler;
DROP POLICY IF EXISTS "Herkes kendi policesini gorebilir veya yonetici hepsini" ON policeler;

-- Create Safe Policies for Teklifler
-- Read: Own (as sub-agent or employee/issuer) OR Admin
CREATE POLICY "teklifler_read_policy" ON teklifler
FOR SELECT USING (
  ilgili_kisi_id = auth.uid() OR 
  kesen_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'employee'))
);

-- Write: Sub-agent can insert (create request)
CREATE POLICY "teklifler_insert_policy" ON teklifler
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' -- Any auth user, but usually sub-agent or admin creates
);

-- Update: Related parties or Admin
CREATE POLICY "teklifler_update_policy" ON teklifler
FOR UPDATE USING (
  ilgili_kisi_id = auth.uid() OR 
  kesen_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'employee'))
);

-- Create Safe Policies for Policeler
CREATE POLICY "policeler_read_policy" ON policeler
FOR SELECT USING (
  ilgili_kisi_id = auth.uid() OR 
  kesen_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'employee'))
);

CREATE POLICY "policeler_insert_policy" ON policeler
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'employee'))
);

CREATE POLICY "policeler_update_policy" ON policeler
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'employee'))
);
