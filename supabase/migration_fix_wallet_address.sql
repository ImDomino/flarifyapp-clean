-- Миграция: Исправление wallet_address (EOA → Safe)
-- 
-- ВАЖНО: После деплоя кода, который сохраняет Safe address,
-- старые пользователи могут иметь неправильный (EOA) адрес.
-- 
-- Эта миграция НЕ автоматически исправляет адреса,
-- потому что Safe address вычисляется клиентом.
-- 
-- Адреса будут обновлены автоматически при следующем логине пользователя.

-- Добавляем комментарий для ясности
COMMENT ON COLUMN profiles.wallet_address IS 'Polymarket Safe proxy wallet address (вычисляется из EOA через deriveSafe)';

-- Опционально: добавить поле для EOA если нужно хранить оба адреса
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS eoa_address TEXT;
-- COMMENT ON COLUMN profiles.eoa_address IS 'Privy embedded wallet EOA address';

-- Индекс для wallet_address если его нет
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address) WHERE wallet_address IS NOT NULL;
