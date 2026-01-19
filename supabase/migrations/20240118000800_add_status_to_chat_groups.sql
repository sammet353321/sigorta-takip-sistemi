ALTER TABLE public.chat_groups ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
