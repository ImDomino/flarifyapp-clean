-- =============================================
-- Beta Invite System Migration
-- Run in Supabase SQL Editor
-- =============================================

-- 1. Add beta fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_beta_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invited_by TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_beta_approved ON profiles(is_beta_approved);

-- 2. Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL,
  used_by TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_owner ON invite_codes(owner_id);

-- 3. Waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- 4. RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invite codes are viewable by everyone"
  ON invite_codes FOR SELECT USING (true);

CREATE POLICY "Anyone can join waitlist"
  ON waitlist FOR INSERT WITH CHECK (true);

CREATE POLICY "Waitlist viewable by everyone"
  ON waitlist FOR SELECT USING (true);
