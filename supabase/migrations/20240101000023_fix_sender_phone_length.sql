-- Increase sender_phone length to support WhatsApp Group JIDs (e.g. 120363385752317769@g.us)
ALTER TABLE messages ALTER COLUMN sender_phone TYPE TEXT;
