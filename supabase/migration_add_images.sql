-- Добавить поле image_url в таблицу posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Добавить индекс для оптимизации
CREATE INDEX IF NOT EXISTS idx_posts_image_url ON posts(image_url) WHERE image_url IS NOT NULL;
