
-- Create whatsapp_sessions table
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT,
    status TEXT DEFAULT 'disconnected', -- 'disconnected', 'scanning', 'connected'
    qr_code TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own session"
    ON public.whatsapp_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own session"
    ON public.whatsapp_sessions FOR ALL
    USING (auth.uid() = user_id);

-- Add real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions;
