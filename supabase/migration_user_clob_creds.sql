-- Миграция: Таблица для User API credentials (L2)
-- Каждый пользователь получает свои L2 credentials для торговли

CREATE TABLE IF NOT EXISTS user_clob_creds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,              -- Privy user ID
  wallet_address TEXT NOT NULL,       -- Polygon wallet address
  api_key TEXT NOT NULL,              -- Polymarket L2 API key
  api_secret TEXT NOT NULL,           -- Polymarket L2 secret
  api_passphrase TEXT NOT NULL,       -- Polymarket L2 passphrase
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id),
  UNIQUE(wallet_address)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_clob_creds_user_id ON user_clob_creds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clob_creds_wallet ON user_clob_creds(wallet_address);

-- Комментарии
COMMENT ON TABLE user_clob_creds IS 'Polymarket L2 API credentials для каждого пользователя';
COMMENT ON COLUMN user_clob_creds.user_id IS 'Privy user ID';
COMMENT ON COLUMN user_clob_creds.wallet_address IS 'Polygon wallet address от Privy';
COMMENT ON COLUMN user_clob_creds.api_key IS 'Polymarket L2 API key (создаётся автоматически)';
