## 1. Mimarisi Tasarımı

```mermaid
graph TD
  A[Kullanıcı Tarayıcısı] --> B[React Frontend Uygulaması]
  B --> C[Supabase SDK]
  C --> D[Supabase Kimlik Doğrulama]
  C --> E[Supabase Veritabanı]
  C --> F[Supabase Depolama]

  subgraph "Ön Yüz Katmanı"
    B
  end

  subgraph "Servis Katmanı (Supabase)"
    D
    E
    F
  end
```

## 2. Teknoloji Açıklaması
- **Ön Yüz**: React@18 + tailwindcss@3 + vite
- **Başlatma Aracı**: vite-init
- **Backend**: Supabase (Kimlik doğrulama, veritabanı, dosya depolama)
- **Veritabanı**: PostgreSQL (Supabase üzerinde)
- **Kimlik Doğrulama**: Supabase Auth
- **Dosya Depolama**: Supabase Storage (poliçe PDF'leri için)

## 3. Rota Tanımları
| Rota | Amaç |
|-------|---------|
| /login | Giriş sayfası, kullanıcı kimlik doğrulaması |
| /admin/dashboard | Yönetici paneli, genel istatistikler ve raporlar |
| /admin/employees | Çalışan yönetimi sayfası |
| /employee/dashboard | Çalışan paneli, teklif istekleri ve üretim bilgileri |
| /employee/quotes | Teklif hesaplama ve yönetim sayfası |
| /employee/policies | Poliçeleştirme talepleri sayfası |
| /sub-agent/dashboard | Tali acente paneli, teklif durum takibi |
| /sub-agent/quotes/new | Yeni teklif isteği oluşturma |
| /sub-agent/quotes | Mevcut teklif istekleri listesi |
| /sub-agent/policies | Poliçe indirme ve yönetim sayfası |
| /quote/:id | Teklif detay ve karşılaştırma sayfası |
| /policy/:id | Poliçe görüntüleme ve indirme sayfası |

## 4. Veri Modeli

### 4.1 Veri Modeli Tanımı
```mermaid
erDiagram
  USERS ||--o{ QUOTES : creates
  USERS ||--o{ POLICIES : processes
  USERS ||--o{ MESSAGES : sends
  QUOTES ||--o{ QUOTE_ITEMS : contains
  QUOTES ||--o{ POLICIES : converts_to
  VEHICLES ||--o{ QUOTES : related_to

  USERS {
    uuid id PK
    string email UK
    string role
    string name
    timestamp created_at
    timestamp updated_at
  }
  
  QUOTES {
    uuid id PK
    uuid sub_agent_id FK
    uuid employee_id FK
    uuid vehicle_id FK
    string status
    decimal total_premium
    timestamp created_at
    timestamp updated_at
  }
  
  QUOTE_ITEMS {
    uuid id PK
    uuid quote_id FK
    string company_name
    decimal premium_amount
    decimal commission
    boolean is_selected
  }
  
  POLICIES {
    uuid id PK
    uuid quote_id FK
    uuid processed_by FK
    string policy_number
    decimal net_premium
    decimal commission
    string pdf_url
    string status
    timestamp created_at
  }
  
  VEHICLES {
    uuid id PK
    string license_plate
    string brand
    string model
    integer year
    string chassis_number
    string engine_number
  }
  
  MESSAGES {
    uuid id PK
    uuid sender_id FK
    uuid receiver_id FK
    uuid quote_id FK
    string content
    string type
    timestamp created_at
  }
```

### 4.2 Veri Tanım Dili (DDL)

**Kullanıcılar Tablosu (users)**
```sql
-- tablo oluşturma
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee', 'sub_agent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- indeksler
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Araçlar Tablosu (vehicles)**
```sql
-- tablo oluşturma
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate VARCHAR(20) NOT NULL,
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  chassis_number VARCHAR(50),
  engine_number VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- indeksler
CREATE INDEX idx_vehicles_license ON vehicles(license_plate);
```

**Teklifler Tablosu (quotes)**
```sql
-- tablo oluşturma
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_agent_id UUID REFERENCES users(id),
  employee_id UUID REFERENCES users(id),
  vehicle_id UUID REFERENCES vehicles(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'calculated', 'accepted', 'rejected')),
  total_premium DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- indeksler
CREATE INDEX idx_quotes_sub_agent ON quotes(sub_agent_id);
CREATE INDEX idx_quotes_employee ON quotes(employee_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);
```

**Teklif Kalemleri Tablosu (quote_items)**
```sql
-- tablo oluşturma
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id),
  company_name VARCHAR(100) NOT NULL,
  premium_amount DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2) NOT NULL,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- indeksler
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
```

**Poliçeler Tablosu (policies)**
```sql
-- tablo oluşturma
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- indeksler
CREATE INDEX idx_policies_quote ON policies(quote_id);
CREATE INDEX idx_policies_processor ON policies(processed_by);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_created ON policies(created_at DESC);
```

**Mesajlar Tablosu (messages)**
```sql
-- tablo oluşturma
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  quote_id UUID REFERENCES quotes(id),
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'request', 'response')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- indeksler
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_quote ON messages(quote_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
```

## 5. Supabase Politikaları

**Temel erişim izinleri:**
```sql
-- anon rolüne temel okuma izinleri
GRANT SELECT ON users TO anon;
GRANT SELECT ON quotes TO anon;
GRANT SELECT ON vehicles TO anon;

-- authenticated rolüne tam erişim
GRANT ALL PRIVILEGES ON users TO authenticated;
GRANT ALL PRIVILEGES ON quotes TO authenticated;
GRANT ALL PRIVILEGES ON quote_items TO authenticated;
GRANT ALL PRIVILEGES ON policies TO authenticated;
GRANT ALL PRIVILEGES ON vehicles TO authenticated;
GRANT ALL PRIVILEGES ON messages TO authenticated;
```

**Rol bazlı satır seviyesi güvenlik (RLS):**
```sql
-- Kullanıcılar sadece kendi bilgilerini görebilir
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_read_policy ON users FOR SELECT 
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Çalışanlar ve taliler sadece kendi tekliflerini görebilir
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_access_policy ON quotes FOR ALL 
  USING (
    sub_agent_id = auth.uid() OR 
    employee_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Mesajlar sadece alıcı ve gönderici tarafından görülebilir
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_access_policy ON messages FOR ALL 
  USING (
    sender_id = auth.uid() OR 
    receiver_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );