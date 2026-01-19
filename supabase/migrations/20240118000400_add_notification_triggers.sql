
-- Function to create notification on new inbound message
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    emp_user record;
BEGIN
    -- Only for inbound messages (from customer to system)
    IF NEW.direction = 'inbound' THEN
        -- Notify all employees (or specific ones if we had logic)
        -- For now, notifying all employees is expensive if we iterate.
        -- Alternative: The app logic seems to notify "all employees" for inbound messages.
        -- We need to find users with role 'employee'.
        FOR emp_user IN SELECT id FROM public.users WHERE role = 'employee'
        LOOP
            INSERT INTO public.notifications (user_id, type, content, metadata, created_at, is_read)
            VALUES (
                emp_user.id, 
                'info', 
                'Yeni Mesaj: ' || COALESCE(NEW.sender_phone, 'Bilinmeyen'), 
                jsonb_build_object('source', 'whatsapp', 'id', NEW.id),
                NOW(),
                FALSE
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Messages
DROP TRIGGER IF EXISTS on_new_message_notification ON public.messages;
CREATE TRIGGER on_new_message_notification
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_notification();


-- Function to create notification on new quote request
CREATE OR REPLACE FUNCTION public.handle_new_quote_notification()
RETURNS TRIGGER AS $$
DECLARE
    emp_user record;
BEGIN
    -- 1. New Quote Request (INSERT) -> Notify Employees
    IF TG_OP = 'INSERT' THEN
        FOR emp_user IN SELECT id FROM public.users WHERE role = 'employee'
        LOOP
            INSERT INTO public.notifications (user_id, type, content, metadata, created_at, is_read)
            VALUES (
                emp_user.id, 
                'warning', 
                'Yeni Teklif Talebi: ' || COALESCE(NEW.plaka, 'Plakasız'), 
                jsonb_build_object('source', 'quote', 'id', NEW.id),
                NOW(),
                FALSE
            );
        END LOOP;
    
    -- 2. Quote Status Update (UPDATE) -> Notify Sub-agent (if they are the owner)
    ELSIF TG_OP = 'UPDATE' AND NEW.durum <> OLD.durum THEN
        -- Notify the 'ilgili_kisi' if they are a sub_agent
        -- We check if 'ilgili_kisi_id' exists and matches a user (simplification: just notify relevant ID)
        IF NEW.ilgili_kisi_id IS NOT NULL THEN
             INSERT INTO public.notifications (user_id, type, content, metadata, created_at, is_read)
             VALUES (
                NEW.ilgili_kisi_id,
                'success', 
                'Teklif Durumu Güncellendi: ' || COALESCE(NEW.plaka, '') || ' - ' || NEW.durum,
                jsonb_build_object('source', 'quote', 'id', NEW.id),
                NOW(),
                FALSE
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Quotes
DROP TRIGGER IF EXISTS on_new_quote_notification ON public.teklifler;
CREATE TRIGGER on_new_quote_notification
AFTER INSERT OR UPDATE ON public.teklifler
FOR EACH ROW EXECUTE FUNCTION public.handle_new_quote_notification();
