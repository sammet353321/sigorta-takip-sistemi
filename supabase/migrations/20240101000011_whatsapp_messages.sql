-- Messages Table for WhatsApp Integration
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- The Tali (Sub Agent)
    direction VARCHAR(10) NOT NULL, -- 'inbound' (from Tali) or 'outbound' (from Employee)
    type VARCHAR(20) DEFAULT 'text', -- text, image, document
    content TEXT, -- Text message or Caption
    media_url TEXT, -- URL for images/docs
    wa_message_id VARCHAR(255), -- WhatsApp Message ID
    status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, read
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Employee can see all, SubAgent can see own
CREATE POLICY "messages_read_policy" ON messages
FOR SELECT USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'employee'))
);

CREATE POLICY "messages_insert_policy" ON messages
FOR INSERT WITH CHECK (
  -- Usually inserted by server (service role), but if employee sends:
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'employee'))
);
