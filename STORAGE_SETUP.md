# Настройка Supabase Storage для загрузки изображений

## 1. Создать Storage Bucket

1. Зайди в Supabase Dashboard
2. Storage → Create Bucket
3. Name: `post-images`
4. Public bucket: ✅ **Включи** (чтобы картинки были доступны публично)
5. Create Bucket

## 2. Настроить RLS Policies для Storage

Зайди в SQL Editor и выполни:

```sql
-- Разрешить всем читать изображения
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'post-images' );

-- Разрешить всем загружать изображения
CREATE POLICY "Anyone can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'post-images' );

-- Разрешить удалять только свои файлы
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING ( bucket_id = 'post-images' );
```

## 3. Получить Service Role Key

1. Supabase Dashboard → Settings → API
2. Скопируй `service_role` key (НЕ anon key!)
3. Добавь в `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=твой_service_role_key
```

⚠️ **ВАЖНО:** Service role key НЕ должен быть в `NEXT_PUBLIC_*` - это секретный ключ только для бэкенда!

## 4. Проверка

После настройки:
1. Зайди на `/create`
2. Попробуй загрузить картинку
3. Создай пост
4. Картинка должна появиться в посте

## Структура файлов

Файлы сохраняются как:
```
post-images/
  └── {user_id}/
      └── {timestamp}.{ext}
```

Пример: `post-images/did:privy:abc123/1704123456789.jpg`

## Troubleshooting

**Ошибка "No such bucket":**
- Проверь что bucket `post-images` создан
- Проверь что он публичный

**Ошибка "Unauthorized":**
- Проверь что Service Role Key правильный
- Проверь что RLS policies созданы

**Картинки не показываются:**
- Проверь что bucket публичный
- Открой URL картинки в браузере - должна открыться
