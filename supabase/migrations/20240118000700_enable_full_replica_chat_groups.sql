-- Set Replica Identity to FULL for chat_groups table
-- This ensures that DELETE events payload includes all columns, not just the Primary Key.
-- Required for the backend to know the 'group_jid' of the deleted group.

ALTER TABLE public.chat_groups REPLICA IDENTITY FULL;
