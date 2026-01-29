-- Миграция: Добавить поддержку Polymarket markets и wallet addresses

-- 1. Обновить profiles - сохранять wallet address
ALTER TABLE profiles 
ALTER COLUMN wallet_address TYPE TEXT;

COMMENT ON COLUMN profiles.wallet_address IS 'Privy embedded wallet address (Polygon)';

-- 2. Добавить polymarket_market_id в posts
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS polymarket_market_id TEXT;

COMMENT ON COLUMN posts.polymarket_market_id IS 'Polymarket condition_id или slug для отображения рынка';

-- 3. Добавить индекс для быстрого поиска постов с рынками
CREATE INDEX IF NOT EXISTS idx_posts_polymarket_market_id 
ON posts(polymarket_market_id) 
WHERE polymarket_market_id IS NOT NULL;

-- 4. Добавить market_data для кэширования данных рынка (опционально)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS market_data JSONB;

COMMENT ON COLUMN posts.market_data IS 'Кэшированные данные рынка (цены, volume, outcomes) для быстрого отображения';

-- Пример структуры market_data:
-- {
--   "question": "Will Trump win 2024?",
--   "outcomes": ["Yes", "No"],
--   "prices": [0.65, 0.35],
--   "volume": "2500000",
--   "url": "https://polymarket.com/event/..."
-- }
