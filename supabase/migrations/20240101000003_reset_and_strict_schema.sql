-- 1. RESET: Drop all existing tables to start fresh
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;
-- Drop leftovers
DROP TABLE IF EXISTS lobbies CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS game_rounds CASCADE;
DROP TABLE IF EXISTS player_guesses CASCADE;
DROP TABLE IF EXISTS lobby_players CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS Table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'sub_agent' CHECK (role IN ('admin', 'employee', 'sub_agent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HELPER FUNCTION for RLS (Prevents Recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. QUOTES Table (Teklifler)
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Required Columns
  customer_name TEXT,          -- AD SOYAD
  customer_dob DATE,           -- DOĞUM TARİHİ
  insurance_company TEXT,      -- ŞİRKET
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- TARİH
  chassis_number TEXT,         -- ŞASİ
  license_plate TEXT,          -- PLAKA
  identity_number TEXT,        -- TC/VKN
  document_number TEXT,        -- BELGE NO
  vehicle_type TEXT,           -- ARAÇ CİNSİ
  gross_premium DECIMAL(10,2), -- BRÜT PRİM
  policy_type TEXT,            -- TÜR (Trafik, Kasko, DASK vb.)
  
  -- Relations / Actors
  issued_by UUID REFERENCES users(id),    -- KESEN (Employee)
  sub_agent_id UUID REFERENCES users(id), -- İLGİLİ KİŞİ (Sub-agent)
  
  policy_number TEXT,          -- POLİÇE NO
  agency_name TEXT,            -- ACENTE
  
  payment_info TEXT,           -- KART
  extra_info TEXT,             -- EK BİLGİLER / İLETİŞİM
  
  net_premium DECIMAL(10,2),   -- NET PRİM
  commission DECIMAL(10,2),    -- KOMİSYON
  
  -- System Columns
  status VARCHAR(20) DEFAULT 'pending', -- pending, calculated, accepted, issued
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. POLICIES Table (Poliçeler)
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Required Columns (Same as quotes)
  customer_name TEXT,
  customer_dob DATE,
  insurance_company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chassis_number TEXT,
  license_plate TEXT,
  identity_number TEXT,
  document_number TEXT,
  vehicle_type TEXT,
  gross_premium DECIMAL(10,2),
  policy_type TEXT,
  
  issued_by UUID REFERENCES users(id),
  sub_agent_id UUID REFERENCES users(id),
  
  policy_number TEXT,
  agency_name TEXT,
  
  payment_info TEXT,
  extra_info TEXT,
  
  net_premium DECIMAL(10,2),
  commission DECIMAL(10,2),
  
  -- System Columns
  quote_id UUID REFERENCES quotes(id),
  pdf_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. MESSAGES Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  quote_id UUID REFERENCES quotes(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. RLS & Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users Policy
-- Allow users to read their own data
CREATE POLICY "Users read own" ON users 
FOR SELECT USING (auth.uid() = id);

-- Allow admins to do everything
CREATE POLICY "Admins manage all" ON users 
FOR ALL USING (get_my_role() = 'admin');

-- Quotes Policy
CREATE POLICY "Quotes Access" ON quotes 
FOR ALL USING (
  sub_agent_id = auth.uid() OR 
  issued_by = auth.uid() OR 
  get_my_role() IN ('admin', 'employee')
);

-- Policies Policy
CREATE POLICY "Policies Access" ON policies 
FOR ALL USING (
  sub_agent_id = auth.uid() OR 
  issued_by = auth.uid() OR 
  get_my_role() IN ('admin', 'employee')
);

-- Messages Policy
CREATE POLICY "Messages Access" ON messages 
FOR ALL USING (
  sender_id = auth.uid() OR 
  receiver_id = auth.uid() OR 
  get_my_role() = 'admin'
);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON policies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role TO anon;
