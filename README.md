# Flarifyapp - Polymarket Integration

## Polymarket Builder Order Attribution

Этот проект интегрирован с **Polymarket Builder Program** для получения комиссий с торгов пользователей.

### Как это работает

1. **URL Attribution** - Когда пользователи кликают на ссылки Polymarket, к URL добавляется ваш `builder_id`
2. **Order Attribution** - Все ордера привязываются к вашему builder ID
3. **Комиссии** - Вы получаете процент от торгов пользователей, которые пришли через ваши ссылки

### Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env.local
cp .env.example .env.local

# 3. Добавить ваш Builder ID в .env.local
NEXT_PUBLIC_POLYMARKET_BUILDER_ID=ваш_id

# 4. Запустить
npm run dev
```

### Настройка

**Builder ID** - это ваш уникальный идентификатор для URL tracking:
```bash
# В .env.local используйте любой ID (например, название проекта)
NEXT_PUBLIC_POLYMARKET_BUILDER_ID=FLARIFYAPP
```

**API Keys** (для реальных ордеров):
1. Перейти на https://polymarket.com/settings?tab=builder
2. Скопировать API Key, Secret, Passphrase
3. Добавить в `.env.local` (когда будете добавлять wallet)

### Что интегрировано

✅ **URL Attribution** - Ссылки автоматически содержат builder_id
✅ **Order API** - Endpoint для размещения ордеров
✅ **Order Form** - UI для трейдинга с attribution
✅ **Demo Mode** - Работает без wallet для тестирования

### Файлы

```
app/api/polymarket/order/route.ts  # API для ордеров
components/OrderForm.tsx           # UI формы
components/PostCard.tsx            # Ссылки с builder_id
lib/polymarket.ts                  # Утилиты
```

### Demo vs Production

**Demo режим (сейчас):**
- ✅ URL attribution работает (builder_id в ссылках)
- ✅ UI полностью рабочий
- ✅ CLOB Client библиотека установлена
- ⚠️ Ордера симулируются (нет wallet)

**Для Production нужно добавить:**
1. **Wallet Provider** (Privy/RainbowKit/Turnkey)
   - Подключение кошелька пользователя
   - Подпись транзакций
   
2. **CLOB Client настройка** в API route:
   ```typescript
   const client = new ClobClient(
     'https://clob.polymarket.com',
     137, // Polygon
     signer, // от wallet
     apiCreds // API keys со страницы settings
   );
   ```

3. **API Keys** в `.env.local`:
   ```env
   POLYMARKET_API_KEY=ваш_ключ
   POLYMARKET_API_SECRET=ваш_секрет
   POLYMARKET_API_PASSPHRASE=ваш_пароль
   ```

### Отслеживание комиссий

https://polymarket.com/settings?tab=builder

### Документация

[Polymarket Builder Docs](https://docs.polymarket.com/developers/builders/order-attribution)

---

**Готово к заработку комиссий! 💰**
