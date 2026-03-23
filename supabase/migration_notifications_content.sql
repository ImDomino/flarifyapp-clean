-- Add content column to notifications table for price_alert messages
-- Run in Supabase SQL Editor

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS content TEXT;
