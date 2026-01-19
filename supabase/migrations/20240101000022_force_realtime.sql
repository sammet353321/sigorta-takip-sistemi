-- Force Realtime on tables
ALTER TABLE chat_groups REPLICA IDENTITY FULL;
ALTER TABLE chat_group_members REPLICA IDENTITY FULL;

-- Re-add to publication just in case
ALTER PUBLICATION supabase_realtime DROP TABLE chat_groups;
ALTER PUBLICATION supabase_realtime DROP TABLE chat_group_members;

ALTER PUBLICATION supabase_realtime ADD TABLE chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_group_members;
