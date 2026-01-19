
-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_teklifler_durum ON teklifler(durum);
CREATE INDEX IF NOT EXISTS idx_teklifler_kesen_id ON teklifler(kesen_id);
CREATE INDEX IF NOT EXISTS idx_teklifler_guncellenme_tarihi ON teklifler(guncellenme_tarihi DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status_direction ON messages(status, direction);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_phone ON messages(sender_phone);
CREATE INDEX IF NOT EXISTS idx_policeler_kesen_id ON policeler(kesen_id);
CREATE INDEX IF NOT EXISTS idx_policeler_tarih ON policeler(tarih DESC);
