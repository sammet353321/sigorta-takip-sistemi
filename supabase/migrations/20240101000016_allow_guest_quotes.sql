-- Make ilgili_kisi_id nullable to support guest users
ALTER TABLE teklifler ALTER COLUMN ilgili_kisi_id DROP NOT NULL;

-- Add column for guest contact info
ALTER TABLE teklifler ADD COLUMN IF NOT EXISTS misafir_bilgi JSONB DEFAULT '{}'::jsonb;
