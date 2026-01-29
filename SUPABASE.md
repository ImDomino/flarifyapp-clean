# Supabase Database Setup

## Что сделано:

✅ SQL schema для всех таблиц (profiles, posts, comments, likes, clicks)
✅ Row Level Security (RLS) политики
✅ API routes для всех операций
✅ Supabase client (browser + server)
✅ Обновлён frontend для работы с real data

---

## Установка (пошагово):

### Шаг 1: Установить зависимости

```bash
npm install @supabase/supabase-js @supabase/ssr --legacy-peer-deps
```

### Шаг 2: Создать Supabase проект

1. Зайти на https://supabase.com
2. Sign up (через GitHub)
3. Create new organization
4. Create new project:
   - Name: `flarifyapp`
   - Database Password: **запишите!**
   - Region: ближайший
   - Plan: Free

Ждать 2-3 минуты пока создастся.

### Шаг 3: Получить API keys

1. Перейти в **Settings** → **API**
2. Скопировать:
   - Project URL
   - anon public key

### Шаг 4: Добавить в .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_PRIVY_APP_ID=ваш_privy_id
NEXT_PUBLIC_POLYMARKET_BUILDER_ID=FLARIFYAPP
```

### Шаг 5: Запустить SQL миграцию

1. В Supabase Dashboard → **SQL Editor**
2. Создать New Query
3. Скопировать весь код из `supabase/schema.sql`
4. Нажать **Run**

Должно создаться 5 таблиц:
- profiles
- posts
- comments
- likes
- clicks

### Шаг 6: Проверить что работает

```bash
npm run dev
```

Открыть http://localhost:3000

**Ожидаемое поведение:**
- Главная страница показывает "No posts yet"
- Можно залогиниться через Google (Privy)
- После логина создаётся профиль в Supabase автоматически

---

## Структура базы данных:

### profiles
```sql
id UUID (auth.users.id)
email TEXT
username TEXT
wallet_address TEXT
avatar_url TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### posts
```sql
id UUID
user_id UUID → profiles.id
title TEXT
content TEXT
polymarket_url TEXT
yes_price DECIMAL
no_price DECIMAL
ref_code TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### comments
```sql
id UUID
post_id UUID → posts.id
user_id UUID → profiles.id
content TEXT
created_at TIMESTAMP
```

### likes
```sql
id UUID
post_id UUID → posts.id
user_id UUID → profiles.id
created_at TIMESTAMP
UNIQUE(post_id, user_id)
```

### clicks
```sql
id UUID
post_id UUID → posts.id
user_id UUID → profiles.id (nullable)
created_at TIMESTAMP
```

---

## API Endpoints:

### GET /api/posts
Получить все посты с лайками и комментариями

### POST /api/posts/create
Создать новый пост
```json
{
  "title": "Bitcoin $100k?",
  "content": "...",
  "polymarket_url": "https://...",
  "yes_price": 65.5,
  "no_price": 34.5
}
```

### POST /api/likes
Toggle like на посте
```json
{
  "post_id": "uuid"
}
```

### GET /api/comments?post_id=uuid
Получить комментарии поста

### POST /api/comments
Создать комментарий
```json
{
  "post_id": "uuid",
  "content": "Great analysis!"
}
```

### POST /api/clicks
Трекнуть клик на Polymarket ссылку
```json
{
  "post_id": "uuid"
}
```

---

## Row Level Security (RLS):

**Profiles:**
- Все могут читать
- Пользователь может обновлять только свой профиль

**Posts:**
- Все могут читать
- Пользователь может создавать посты
- Пользователь может редактировать/удалять только свои посты

**Comments:**
- Все могут читать
- Пользователь может создавать комментарии
- Пользователь может удалять только свои комментарии

**Likes:**
- Все могут читать
- Пользователь может ставить/убирать лайки

**Clicks:**
- Все могут читать
- Любой может трекать клики (даже без авторизации)

---

## Troubleshooting:

**Ошибка: "Invalid API key"**
→ Проверь .env.local, перезапусти dev server

**Ошибка: "relation does not exist"**
→ Запусти SQL миграцию (schema.sql)

**Ошибка: "row-level security policy"**
→ Проверь что RLS политики применились

**Пост не создаётся**
→ Проверь что залогинен через Privy
→ Проверь console в браузере

---

## Следующие шаги:

1. ✅ База данных готова
2. → Создать страницу /create для постов
3. → Создать страницу /post/[id] для деталей
4. → Добавить real Polymarket orders
5. → Добавить admin analytics

---

**База данных полностью готова! 🎉**
