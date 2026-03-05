-- Direct Messages Migration
-- Run this in Supabase SQL Editor

-- Conversations table (1-on-1 chats)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id TEXT NOT NULL,
  user2_id TEXT NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conv_user1 ON conversations(user1_id);
CREATE INDEX idx_conv_user2 ON conversations(user2_id);
CREATE INDEX idx_conv_last_msg ON conversations(last_message_at DESC);
CREATE INDEX idx_msg_conv ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_msg_sender ON messages(sender_id);
CREATE INDEX idx_msg_unread ON messages(conversation_id, read) WHERE read = false;

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (user1_id = current_setting('request.jwt.claims', true)::json->>'sub'
      OR user2_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (user1_id = current_setting('request.jwt.claims', true)::json->>'sub'
           OR user2_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (user1_id = current_setting('request.jwt.claims', true)::json->>'sub'
      OR user2_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for messages
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE user1_id = current_setting('request.jwt.claims', true)::json->>'sub'
       OR user2_id = current_setting('request.jwt.claims', true)::json->>'sub'
  ));

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can mark messages as read"
  ON messages FOR UPDATE
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE user1_id = current_setting('request.jwt.claims', true)::json->>'sub'
       OR user2_id = current_setting('request.jwt.claims', true)::json->>'sub'
  ));
