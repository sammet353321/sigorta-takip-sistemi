-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS Table Modifications (since table likely exists)
DO $$ 
BEGIN 
    -- Add 'role' column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'sub_agent' CHECK (role IN ('admin', 'employee', 'sub_agent'));
        CREATE INDEX idx_users_role ON users(role);
    END IF;

    -- Add 'name' column if it doesn't exist (map to username if needed, but let's keep separate for now)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN
        ALTER TABLE users ADD COLUMN name VARCHAR(100);
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

CREATE INDEX IF NOT EXISTS idx_vehicles_license ON vehicles(license_plate);

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

CREATE INDEX IF NOT EXISTS idx_quotes_sub_agent ON quotes(sub_agent_id);
CREATE INDEX IF NOT EXISTS idx_quotes_employee ON quotes(employee_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

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

CREATE INDEX IF NOT EXISTS idx_policies_quote ON policies(quote_id);
CREATE INDEX IF NOT EXISTS idx_policies_processor ON policies(processed_by);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_created ON policies(created_at DESC);

-- 6. MESSAGES Table (For notifications and chat)
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

CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_quote ON messages(quote_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- RLS POLICIES (Enable if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them safely (or use IF NOT EXISTS logic which is harder in SQL)
-- For simplicity in this dev environment, we'll try to create and ignore "already exists" errors 
-- or use DO blocks.

DO $$ 
BEGIN 
    -- Users Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can read their own data or admin read all') THEN
        CREATE POLICY "Users can read their own data or admin read all" ON users 
        FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
    END IF;

    -- Quotes Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quotes' AND policyname = 'Users can access their related quotes') THEN
        CREATE POLICY "Users can access their related quotes" ON quotes 
        FOR ALL USING (
          sub_agent_id = auth.uid() OR 
          employee_id = auth.uid() OR 
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- Vehicles Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Authenticated users can read vehicles') THEN
        CREATE POLICY "Authenticated users can read vehicles" ON vehicles FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Authenticated users can insert vehicles') THEN
        CREATE POLICY "Authenticated users can insert vehicles" ON vehicles FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    -- Messages Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can read their messages') THEN
        CREATE POLICY "Users can read their messages" ON messages 
        FOR ALL USING (
          sender_id = auth.uid() OR 
          receiver_id = auth.uid() OR 
          EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;
