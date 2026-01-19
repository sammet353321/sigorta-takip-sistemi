
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read for all authenticated users
CREATE POLICY "All users can view settings" ON public.app_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow write only for admins
CREATE POLICY "Admins can manage settings" ON public.app_settings
    FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
