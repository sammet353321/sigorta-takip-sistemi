
-- Migration: 20240118000300_fix_schema_and_notifications.sql

-- 1. app_settings tablosunu oluştur (zaten varsa atla)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- app_settings Politikaları (Mevcut değilse oluştur)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'All users can view settings') THEN
        CREATE POLICY "All users can view settings" ON public.app_settings FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Admins can manage settings') THEN
        CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
    END IF;
END $$;

-- 2. notifications tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- 'info', 'warning', 'success', 'error'
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications RLS Politikaları
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin ve Personel herkese bildirim gönderebilir
DROP POLICY IF EXISTS "Admins and Employees can insert notifications" ON public.notifications;
CREATE POLICY "Admins and Employees can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'employee'))
    );

-- 3. messages RLS Güncellemesi (Personelin her yere mesaj atabilmesi için)
-- Eski/Kısıtlayıcı politikaları temizle
DROP POLICY IF EXISTS "messages_read_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "Messages Access" ON public.messages;

-- Okuma Politikası: Personel her şeyi görür, kullanıcılar kendilerininkini
CREATE POLICY "messages_read_policy" ON public.messages
    FOR SELECT USING (
        auth.uid() = user_id OR 
        -- Personel tüm mesajları okuyabilir
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'employee'))
    );

-- Yazma Politikası: Personel her yere yazabilir
CREATE POLICY "messages_insert_policy" ON public.messages
    FOR INSERT WITH CHECK (
        -- Personel her türlü mesajı ekleyebilir (Grup farketmeksizin)
        (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'employee')))
        OR
        -- Normal kullanıcı sadece kendi adına (kendi user_id'si ile) mesaj atabilir
        (auth.uid() = user_id)
    );

-- 4. Varsayılan Marka İsmini Ekle
INSERT INTO public.app_settings (key, value)
VALUES ('brand_name', 'SİGORTAM')
ON CONFLICT (key) DO NOTHING;
