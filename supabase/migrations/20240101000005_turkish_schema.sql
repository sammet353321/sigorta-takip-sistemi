-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP EXISTING TABLES to ensure clean slate with new Turkish column names
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS policies;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS quote_items;
DROP TABLE IF EXISTS vehicles;
-- Keep users table but we might need to adjust it if needed, but it seems standard.

-- 2. CREATE TEKLIFLER (Quotes) Table with Turkish Columns
CREATE TABLE teklifler (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User requested columns
  ad_soyad VARCHAR(255),
  dogum_tarihi DATE,
  sirket VARCHAR(100),
  tarih TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Maps to created_at logic
  sasi VARCHAR(50),
  plaka VARCHAR(20),
  tc_vkn VARCHAR(20),
  belge_no VARCHAR(50),
  arac_cinsi VARCHAR(50),
  brut_prim DECIMAL(10,2),
  tur VARCHAR(50), -- Policy Type (Trafik/Kasko etc)
  kesen_id UUID REFERENCES users(id), -- Maps to 'KESEN'
  ilgili_kisi_id UUID REFERENCES users(id), -- Maps to 'İLGİLİ KİŞİ' (Sub Agent)
  police_no VARCHAR(50),
  acente VARCHAR(100),
  kart_bilgisi TEXT, -- 'KART'
  ek_bilgiler TEXT, -- 'EK BİLGİLER / İLETİŞİM'
  net_prim DECIMAL(10,2),
  komisyon DECIMAL(10,2),
  
  -- System columns needed for workflow
  durum VARCHAR(20) DEFAULT 'bekliyor', -- status: bekliyor, islemde, hesaplandi, onaylandi, reddedildi, policelesti
  notlar TEXT,
  guncellenme_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE POLICELER (Policies) Table with Turkish Columns
-- Same structure as Teklifler but specific for issued policies
CREATE TABLE policeler (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User requested columns (copied from offer or entered)
  ad_soyad VARCHAR(255),
  dogum_tarihi DATE,
  sirket VARCHAR(100),
  tarih TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sasi VARCHAR(50),
  plaka VARCHAR(20),
  tc_vkn VARCHAR(20),
  belge_no VARCHAR(50),
  arac_cinsi VARCHAR(50),
  brut_prim DECIMAL(10,2),
  tur VARCHAR(50),
  kesen_id UUID REFERENCES users(id),
  ilgili_kisi_id UUID REFERENCES users(id),
  police_no VARCHAR(50),
  acente VARCHAR(100),
  kart_bilgisi TEXT,
  ek_bilgiler TEXT,
  net_prim DECIMAL(10,2),
  komisyon DECIMAL(10,2),
  
  -- Link back to original offer
  teklif_id UUID REFERENCES teklifler(id),
  
  -- System columns
  pdf_url TEXT,
  durum VARCHAR(20) DEFAULT 'aktif', -- status: aktif, iptal
  guncellenme_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREATE MESSAGES Table (Optional but good for notifications)
CREATE TABLE mesajlar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gonderen_id UUID REFERENCES users(id),
  alici_id UUID REFERENCES users(id),
  teklif_id UUID REFERENCES teklifler(id),
  icerik TEXT,
  okundu_mu BOOLEAN DEFAULT FALSE,
  tarih TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RLS POLICIES
ALTER TABLE teklifler ENABLE ROW LEVEL SECURITY;
ALTER TABLE policeler ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesajlar ENABLE ROW LEVEL SECURITY;

-- Teklifler Policies
CREATE POLICY "Herkes kendi teklifini gorebilir veya yonetici hepsini" ON teklifler
FOR ALL USING (
  ilgili_kisi_id = auth.uid() OR 
  kesen_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Policeler Policies
CREATE POLICY "Herkes kendi policesini gorebilir veya yonetici hepsini" ON policeler
FOR ALL USING (
  ilgili_kisi_id = auth.uid() OR 
  kesen_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Mesajlar Policies
CREATE POLICY "Mesaj erisimi" ON mesajlar
FOR ALL USING (
  gonderen_id = auth.uid() OR 
  alici_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Indexes for performance
CREATE INDEX idx_teklifler_plaka ON teklifler(plaka);
CREATE INDEX idx_teklifler_ilgili_kisi ON teklifler(ilgili_kisi_id);
CREATE INDEX idx_teklifler_durum ON teklifler(durum);
CREATE INDEX idx_policeler_plaka ON policeler(plaka);
CREATE INDEX idx_policeler_police_no ON policeler(police_no);
