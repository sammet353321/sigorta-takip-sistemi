-- Add sasi_no column to teklifler table
ALTER TABLE teklifler ADD COLUMN IF NOT EXISTS sasi_no TEXT;
