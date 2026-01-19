-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS Table Modifications
-- Safe alter table to add columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'sub_agent' CHECK (role IN ('admin', 'employee', 'sub_agent'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Create index on role if it doesn't exist (idempotent way is tricky in SQL without DO block, but let's try simple creation which might fail if exists, so we wrap in DO)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_role') THEN
        CREATE INDEX idx_users_role ON users(role);
    END IF;
END $$;

-- 2. VEHICLES Table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate VARCHAR(20) NOT NULL,
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  chassis_number VARCHAR(50),
  engine_number VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. QUOTES Table
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_agent_id UUID REFERENCES users(id),
  employee_id UUID REFERENCES users(id),
  vehicle_id UUID REFERENCES vehicles(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'calculated', 'accepted', 'rejected')),
  total_premium DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. QUOTE ITEMS Table
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id),
  company_name VARCHAR(100) NOT NULL,
  premium_amount DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) NOT NULL,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. POLICIES Table
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id),
  processed_by UUID REFERENCES users(id),
  policy_number VARCHAR(50) UNIQUE NOT NULL,
  net_premium DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) NOT NULL,
  pdf_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'issued', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. MESSAGES Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  quote_id UUID REFERENCES quotes(id),
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'request', 'response')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes (using IF NOT EXISTS where supported or DO blocks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'vehicles' AND indexname = 'idx_vehicles_license') THEN
        CREATE INDEX idx_vehicles_license ON vehicles(license_plate);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'quotes' AND indexname = 'idx_quotes_sub_agent') THEN
        CREATE INDEX idx_quotes_sub_agent ON quotes(sub_agent_id);
    END IF;
    -- Add other indexes similarly...
END $$;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies (Drop and Recreate to be safe and update definitions)
DROP POLICY IF EXISTS "Users can read their own data or admin read all" ON users;
CREATE POLICY "Users can read their own data or admin read all" ON users 
FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can access their related quotes" ON quotes;
CREATE POLICY "Users can access their related quotes" ON quotes 
FOR ALL USING (
  sub_agent_id = auth.uid() OR 
  employee_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON vehicles;
CREATE POLICY "Authenticated users can read vehicles" ON vehicles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON vehicles;
CREATE POLICY "Authenticated users can insert vehicles" ON vehicles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read their messages" ON messages;
CREATE POLICY "Users can read their messages" ON messages 
FOR ALL USING (
  sender_id = auth.uid() OR 
  receiver_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Users can read quote items" ON quote_items;
CREATE POLICY "Users can read quote items" ON quote_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert quote items" ON quote_items;
CREATE POLICY "Users can insert quote items" ON quote_items FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update quote items" ON quote_items;
CREATE POLICY "Users can update quote items" ON quote_items FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can read policies" ON policies;
CREATE POLICY "Users can read policies" ON policies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert policies" ON policies;
CREATE POLICY "Users can insert policies" ON policies FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update policies" ON policies;
CREATE POLICY "Users can update policies" ON policies FOR UPDATE TO authenticated USING (true);
