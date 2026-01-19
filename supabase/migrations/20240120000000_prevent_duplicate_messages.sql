
-- Delete duplicate messages, keeping the first one
DELETE FROM messages
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
        ROW_NUMBER() OVER (partition BY wa_message_id ORDER BY created_at ASC) as r
        FROM messages
        WHERE wa_message_id IS NOT NULL
    ) t
    WHERE t.r > 1
);

-- Add unique constraint to messages table to prevent duplicate WhatsApp messages
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_wa_message_id_key" UNIQUE ("wa_message_id");
