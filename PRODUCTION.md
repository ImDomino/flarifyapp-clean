# Production Setup Guide

## Текущее состояние

✅ **Что работает:**
- URL Attribution (builder_id в ссылках)
- UI для размещения ордеров
- API структура готова
- CLOB Client библиотека установлена

⏳ **Что нужно добавить:**
- Wallet integration
- Реальная настройка CLOB Client
- API ключи Polymarket

---

## Шаг 1: Получить API ключи Polymarket

1. Перейти на https://polymarket.com/settings?tab=builder
2. Скопировать:
   - API Key
   - API Secret
   - API Passphrase

3. Добавить в `.env.local`:
```env
POLYMARKET_API_KEY=ваш_ключ
POLYMARKET_API_SECRET=ваш_секрет
POLYMARKET_API_PASSPHRASE=ваш_пароль
```

---

## Шаг 2: Выбрать Wallet Provider

### Вариант A: Privy (рекомендую для MVP)

**Установка:**
```bash
npm install @privy-io/react-auth
```

**Настройка:**
```typescript
// app/providers.tsx
import { PrivyProvider } from '@privy-io/react-auth';

export function Providers({ children }) {
  return (
    <PrivyProvider
      appId="ваш_privy_app_id"
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: { theme: 'dark' },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

**Плюсы:**
- ✅ Быстрая настройка (30 минут)
- ✅ Embedded wallets
- ✅ Google OAuth из коробки
- ✅ React 19 compatible

**Минусы:**
- ⚠️ $99/месяц после 1000 пользователей

### Вариант B: RainbowKit (бесплатный)

**Установка:**
```bash
npm install @rainbow-me/rainbowkit wagmi viem@2.x
```

**Настройка:**
```typescript
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';

const config = getDefaultConfig({
  appName: 'Flarifyapp',
  projectId: 'YOUR_WALLETCONNECT_ID',
  chains: [polygon],
});
```

**Плюсы:**
- ✅ Бесплатно
- ✅ Поддержка многих кошельков

**Минусы:**
- ⚠️ Нужен отдельный OAuth для Google

---

## Шаг 3: Обновить API Route

Обновить `app/api/polymarket/order/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const { tokenId, side, amount, price, userAddress } = await request.json();

    // 1. Создать CLOB Client с Builder credentials
    const builderCreds = {
      key: process.env.POLYMARKET_API_KEY!,
      secret: process.env.POLYMARKET_API_SECRET!,
      passphrase: process.env.POLYMARKET_API_PASSPHRASE!,
    };

    // 2. Получить signer от wallet provider (это нужно передать с фронта)
    // В production здесь будет реальный signer от Privy/RainbowKit
    
    // 3. Инициализировать клиент
    const client = new ClobClient(
      'https://clob.polymarket.com',
      137, // Polygon mainnet
      signer, // от wallet provider
      builderCreds
    );

    // 4. Создать ордер
    const order = await client.createOrder({
      tokenID: tokenId,
      price: price,
      size: amount,
      side: side === 'YES' ? 'BUY' : 'SELL',
    });

    return NextResponse.json({ 
      success: true, 
      order: order,
      builderId: process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_ID 
    });
    
  } catch (error) {
    console.error('Order error:', error);
    return NextResponse.json(
      { error: 'Failed to place order' },
      { status: 500 }
    );
  }
}
```

---

## Шаг 4: Обновить OrderForm

```typescript
// components/OrderForm.tsx
import { useWallet } from '@privy-io/react-auth'; // или useAccount from wagmi

export function OrderForm({ post }: OrderFormProps) {
  const { user } = useWallet(); // Privy
  // const { address } = useAccount(); // RainbowKit
  
  const handlePlaceOrder = async () => {
    if (!user) {
      alert('Please connect wallet');
      return;
    }

    const response = await fetch('/api/polymarket/order', {
      method: 'POST',
      body: JSON.stringify({
        tokenId: post.polymarket_url,
        side: selectedOutcome,
        amount: parseFloat(amount),
        price: selectedOutcome === 'YES' ? post.yes_price : post.no_price,
        userAddress: user.wallet.address,
      }),
    });

    // ...
  };
}
```

---

## Шаг 5: Тестирование

1. **Запустить на localhost:**
```bash
npm run dev
```

2. **Подключить wallet**
3. **Попробовать разместить ордер**
4. **Проверить в Polymarket dashboard**

---

## Отслеживание комиссий

После запуска в production:
1. Перейти на https://polymarket.com/settings?tab=builder
2. Смотреть статистику:
   - Количество кликов
   - Размещённые ордера
   - Заработанные комиссии

---

## Следующие шаги

1. ✅ URL Attribution - **работает**
2. ⏳ Добавить Privy/RainbowKit
3. ⏳ Обновить API route
4. ⏳ Тестировать на mainnet
5. ⏳ Деплой на Vercel

---

Нужна помощь с каким-то шагом? Пиши!
