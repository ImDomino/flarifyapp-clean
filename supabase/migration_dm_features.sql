-- DM Features: Delete, Edit, Reply
-- Run this in Supabase SQL Editor after the initial DM migration

-- Soft delete: NULL = active, timestamp = deleted
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Edit tracking: NULL = never edited, timestamp = last edit time
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NULL;

-- Reply-to: FK to messages, SET NULL if original is deleted
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID DEFAULT NULL REFERENCES messages(id) ON DELETE SET NULL;

-- Index for reply lookups
CREATE INDEX IF NOT EXISTS idx_msg_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
