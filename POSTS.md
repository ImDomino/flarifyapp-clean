# Posts System Complete

## ✅ Что сделано:

### 1. Polymarket Search API
**Route:** `/api/polymarket/search`
- Поиск рынков по ключевым словам
- Автоматическая подгрузка цен YES/NO
- Limit 10 результатов

### 2. Страница создания постов `/create`
**Функции:**
- Auth check (только залогиненные)
- Поиск рынков Polymarket в реальном времени
- Выбор рынка из списка
- Автоподстановка URL и цен
- Сохранение в Supabase
- Редирект на главную после создания

### 3. Пагинация постов
**API:** `/api/posts?page=1&limit=20`
- 20 постов на страницу
- Load More кнопка
- Подсчёт total/hasMore
- Лайки и комментарии для каждого поста

### 4. Главная страница (client-side)
- Загрузка постов через API
- Infinite scroll (Load More)
- Loading states
- Empty state

---

## 🚀 Как использовать:

### Создание поста:

1. Перейти на `/create`
2. Написать title и content
3. В поле "Search Market" ввести: "bitcoin"
4. Выбрать нужный рынок из списка
5. Нажать "Create Post"
6. Редирект на главную

### User Flow:
```
/create → Search "bitcoin" → Select market → 
→ Title + Content → Create → Redirect to /
```

---

## 📝 API Endpoints:

### GET /api/polymarket/search?query=bitcoin
**Response:**
```json
{
  "markets": [
    {
      "id": "0x123...",
      "question": "Bitcoin reaches $100k?",
      "url": "https://polymarket.com/event/...",
      "outcomePrices": [0.655, 0.345],
      "volume": "1234567",
      "endDate": "2025-12-31"
    }
  ]
}
```

### GET /api/posts?page=1&limit=20
**Response:**
```json
{
  "posts": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasMore": true
  }
}
```

### POST /api/posts/create
**Request:**
```json
{
  "title": "Bitcoin to 100k?",
  "content": "Analysis...",
  "polymarket_url": "https://...",
  "yes_price": 65.5,
  "no_price": 34.5
}
```

---

## 🔧 Что работает:

✅ Поиск рынков Polymarket
✅ Создание постов с auto-fetch цен
✅ Пагинация (20 постов на страницу)
✅ Load More button
✅ Лайки (toggle)
✅ Комментарии (counts)
✅ Клики (tracking)
✅ Auth check (только залогиненные создают)

---

## 📊 Database:

### Таблица posts:
```
- id (UUID)
- user_id (UUID → profiles)
- title (TEXT)
- content (TEXT)
- polymarket_url (TEXT)
- yes_price (DECIMAL)
- no_price (DECIMAL)
- ref_code (TEXT, default: FLARIFYAPP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Индексы:
- `idx_posts_created_at` (для сортировки)
- `idx_posts_user_id` (для фильтра по юзеру)

---

## 🎯 Следующие шаги:

### Сейчас работает:
1. ✅ Создание постов
2. ✅ Просмотр постов (пагинация)
3. ✅ Лайки
4. ✅ Трекинг кликов

### Что добавить дальше:
1. ⏳ Страница поста `/post/[id]` (детали + комментарии)
2. ⏳ Страница профиля `/profile` (свои посты)
3. ⏳ Admin панель (аналитика)
4. ⏳ Real Polymarket Orders (трейдинг)

---

## 🐛 Known Issues:

### Polymarket API:
- Иногда API не возвращает `outcomePrices`
- В этом случае цены будут `null`
- Пользователь всё равно может создать пост

### Решение:
Можно добавить ручной ввод цен если API не отдаёт.

---

## 💡 Tips:

**Популярные поисковые запросы:**
- bitcoin
- trump
- AI
- ethereum
- election

**Тестирование:**
1. Залогиниться через Privy
2. Создать пост с поиском "bitcoin"
3. Проверить что пост появился на главной
4. Попробовать лайкнуть
5. Кликнуть на Polymarket ссылку

---

**Система постов готова! 🎉**
