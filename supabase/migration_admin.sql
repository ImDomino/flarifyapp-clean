-- Add is_admin flag to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add approved_at to waitlist for tracking admin approvals
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Make yourself an admin (replace with your actual user ID):
-- UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_ID';
