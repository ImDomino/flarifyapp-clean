-- Миграция: Добавить token IDs для Polymarket trading

-- Добавляем поля для YES/NO token IDs
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS yes_token_id TEXT,
ADD COLUMN IF NOT EXISTS no_token_id TEXT;

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_posts_yes_token_id ON posts(yes_token_id) WHERE yes_token_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_no_token_id ON posts(no_token_id) WHERE no_token_id IS NOT NULL;

COMMENT ON COLUMN posts.yes_token_id IS 'Polymarket token ID for YES outcome';
COMMENT ON COLUMN posts.no_token_id IS 'Polymarket token ID for NO outcome';
