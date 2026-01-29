# Privy Integration Complete

## ✅ Что добавлено:

1. **Providers** (`app/providers.tsx`)
   - PrivyProvider с embedded wallets
   - Автоматическое создание кошелька при входе
   - Google OAuth

2. **Navigation** (`components/Navigation.tsx`)
   - Кнопка "Sign in with Google"
   - Показ email пользователя
   - Кнопка Logout

3. **OrderForm** (`components/OrderForm.tsx`)
   - Проверка авторизации
   - Доступ к embedded wallet
   - Показ адреса кошелька при успехе

---

## 🚀 Как запустить:

### 1. Получить Privy App ID

1. Зайти на https://dashboard.privy.io/
2. Sign up / Login
3. Create new app
4. Скопировать App ID

### 2. Добавить в .env.local

```env
NEXT_PUBLIC_PRIVY_APP_ID=ваш_app_id_здесь
NEXT_PUBLIC_POLYMARKET_BUILDER_ID=FLARIFYAPP
```

### 3. Установить зависимости

```bash
npm install
```

### 4. Запустить

```bash
npm run dev
```

---

## 🎯 Как работает:

### User Flow:

1. **Пользователь заходит** → Видит "Sign in with Google"
2. **Кликает кнопку** → Открывается Privy popup
3. **Входит через Google** → Privy автоматически создаёт embedded wallet
4. **Может сразу трейдить** → Wallet готов, приватный ключ зашифрован

### Embedded Wallet:

- Создаётся автоматически при первом входе
- Приватный ключ хранится у Privy (зашифрован)
- Пользователь не видит seed phrase
- Может экспортировать позже

---

## 📝 Что видит пользователь:

**До входа:**
- Navigation: кнопка "Sign in with Google"
- OrderForm: "Sign in to Place Bet"

**После входа:**
- Navigation: email + кнопка Logout
- OrderForm: "Place $10 YES Bet"
- При успехе: адрес кошелька (0x1234...5678)

---

## 🔧 Технические детали:

### Где используется Privy:

```typescript
// app/providers.tsx
<PrivyProvider
  config={{
    embeddedWallets: {
      createOnLogin: 'users-without-wallets'  // ← Авто-создание
    }
  }}
>
```

```typescript
// components/Navigation.tsx
const { login, logout, authenticated, user } = usePrivy();
```

```typescript
// components/OrderForm.tsx
const { wallets } = useWallets();
const wallet = wallets[0];  // Embedded wallet
```

---

## 💰 Стоимость Privy:

- **0 - 1,000 MAU**: FREE
- **1,000 - 10,000 MAU**: $99/месяц
- **10,000+ MAU**: Custom pricing

MAU = Monthly Active Users

---

## 🎨 Что настроено:

- ✅ Dark theme
- ✅ Green accent color (#22c55e)
- ✅ Только Google login
- ✅ No prompt on signature (без popup'ов)
- ✅ Embedded wallets

---

## 🐛 Troubleshooting:

**Ошибка: "Invalid app ID"**
→ Проверь `.env.local`, перезапусти dev server

**Кнопка не работает**
→ Откройте консоль браузера, посмотрите ошибки

**Wallet не создаётся**
→ Проверь настройки в Privy Dashboard

---

## 📚 Документация:

- [Privy Docs](https://docs.privy.io)
- [Embedded Wallets](https://docs.privy.io/guide/react/wallets/embedded)
- [React Hooks](https://docs.privy.io/guide/react/users/user-object)

---

**Готово к тестированию! 🎉**
