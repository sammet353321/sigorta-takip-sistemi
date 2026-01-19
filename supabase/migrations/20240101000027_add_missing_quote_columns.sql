
-- Add missing columns to teklifler table
ALTER TABLE teklifler ADD COLUMN IF NOT EXISTS onceki_sirket VARCHAR(100);
ALTER TABLE teklifler ADD COLUMN IF NOT EXISTS bitis_tarihi DATE;
