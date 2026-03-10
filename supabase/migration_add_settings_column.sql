-- Add settings JSONB column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Create index for faster settings queries
CREATE INDEX IF NOT EXISTS idx_profiles_settings ON profiles USING gin (settings);
