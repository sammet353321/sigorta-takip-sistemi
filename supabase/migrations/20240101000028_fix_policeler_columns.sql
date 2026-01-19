
-- Add missing columns to policeler table to match code expectations
ALTER TABLE policeler ADD COLUMN IF NOT EXISTS bitis_tarihi DATE;
ALTER TABLE policeler ADD COLUMN IF NOT EXISTS sasi_no TEXT;
