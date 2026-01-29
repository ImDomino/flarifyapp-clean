# 🔄 Migration Guide - От каркаса к production

## Текущее состояние

✅ **Работает:**
- Next.js 16.1.3
- React 19
- TypeScript
- Tailwind CSS
- Полный UI (mock данные)

❌ **Не установлено:**
- База данных
- Wallet integration
- Polymarket API
- Authentication

---

## Шаг 1: Добавить Supabase (База данных)

### Установка:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Создать файлы:

**`lib/supabase/client.ts`:**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`lib/supabase/server.ts`:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // ... остальное
      }
    }
  )
}
```

### Добавить в `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### Обновить компоненты:

**Например, `app/page.tsx`:**
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('posts')
    .select('*, users(*)')
    .order('created_at', { ascending: false })
  
  return <div>...</div>
}
```

**Статус:** 
- ✅ Совместимо с React 19
- ✅ Совместимо с Next.js 16
- ⚠️ Требует настройку проекта на supabase.com

---

## Шаг 2: Добавить Wallet Integration

### ⚠️ ПРОБЛЕМА: Dynamic SDK + React 19

Dynamic SDK пока не поддерживает React 19 официально.

### Решение A: RainbowKit (РЕКОМЕНДУЮ)

```bash
npm install @rainbow-me/rainbowkit wagmi viem@2.x
```

**Создать `components/providers/RainbowProvider.tsx`:**
```typescript
'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

const config = getDefaultConfig({
  appName: 'Flarifyapp',
  projectId: 'YOUR_PROJECT_ID', // из walletconnect.com
  chains: [polygon],
})

const queryClient = new QueryClient()

export function RainbowProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

**Обновить `app/layout.tsx`:**
```typescript
import { RainbowProvider } from '@/components/providers/RainbowProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <RainbowProvider>
          {/* ... */}
        </RainbowProvider>
      </body>
    </html>
  )
}
```

**Статус:**
- ✅ Поддерживает React 19
- ✅ Polygon network
- ✅ WalletConnect
- ✅ MetaMask, Coinbase, etc.

### Решение B: Dynamic SDK (Ждать обновления)

```bash
npm install @dynamic-labs/sdk-react-core@latest @dynamic-labs/ethereum@latest
```

Проверь на их сайте когда выйдет React 19 support.

**Статус:**
- ⚠️ Пока не поддерживает React 19 официально
- ⏳ Ожидаем обновление

### Решение C: Downgrade React (НЕ РЕКОМЕНДУЮ)

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1"
}
```

Тогда Dynamic SDK заработает, но:
- ❌ Потеряешь React 19 features
- ❌ Потеряешь Next.js 16 оптимизации

---

## Шаг 3: Добавить Polymarket Integration

### Установка (БЕЗ конфликтов):
```bash
npm install @polymarket/clob-client @polymarket/builder-signing-sdk ethers@6
```

### Создать API route:

**`app/api/polymarket/sign/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { buildHmacSignature } from '@polymarket/builder-signing-sdk'

export async function POST(request: NextRequest) {
  const { method, path, body } = await request.json()
  
  const credentials = {
    key: process.env.POLYMARKET_BUILDER_API_KEY!,
    secret: process.env.POLYMARKET_BUILDER_SECRET!,
    passphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE!,
  }
  
  const timestamp = Date.now().toString()
  const signature = buildHmacSignature(
    credentials.secret,
    parseInt(timestamp),
    method,
    path,
    body
  )
  
  return NextResponse.json({
    POLY_BUILDER_SIGNATURE: signature,
    POLY_BUILDER_TIMESTAMP: timestamp,
    POLY_BUILDER_API_KEY: credentials.key,
    POLY_BUILDER_PASSPHRASE: credentials.passphrase,
  })
}
```

### Создать CLOB client:

**`lib/polymarket/clob-client.ts`:**
```typescript
import { ClobClient } from '@polymarket/clob-client'
import { BuilderConfig } from '@polymarket/builder-signing-sdk'
import { ethers } from 'ethers'

export class PolymarketCLOB {
  private client: ClobClient | null = null
  
  async initialize(signer: ethers.Signer) {
    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: '/api/polymarket/sign',
      },
    })
    
    const userCreds = await tempClient.deriveApiKey()
    
    this.client = new ClobClient(
      'https://clob.polymarket.com',
      137, // Polygon
      signer,
      userCreds,
      1, // signatureType
      await signer.getAddress(),
      undefined,
      false,
      builderConfig
    )
  }
  
  async buyYes(tokenId: string, amount: number, price: number) {
    if (!this.client) throw new Error('Not initialized')
    
    return this.client.createOrder({
      tokenID: tokenId,
      price,
      size: amount / price,
      side: 'BUY',
    })
  }
}
```

### Добавить в `.env.local`:
```env
POLYMARKET_BUILDER_API_KEY=...
POLYMARKET_BUILDER_SECRET=...
POLYMARKET_BUILDER_PASSPHRASE=...
```

**Статус:**
- ✅ Совместимо с React 19
- ✅ Совместимо с Next.js 16
- ✅ Ethers.js v6 работает
- ⚠️ Требует Builder API keys

---

## Шаг 4: Соединить всё вместе

### Обновить OrderForm:

**`components/OrderForm.tsx`:**
```typescript
'use client'

import { useAccount, useWalletClient } from 'wagmi' // RainbowKit
import { polymarketCLOB } from '@/lib/polymarket/clob-client'
import { ethers } from 'ethers'

export function OrderForm({ post }) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  
  const handlePlaceOrder = async () => {
    if (!walletClient) return
    
    // Convert wagmi wallet to ethers signer
    const provider = new ethers.BrowserProvider(walletClient)
    const signer = await provider.getSigner()
    
    // Initialize Polymarket client
    await polymarketCLOB.initialize(signer)
    
    // Place order
    await polymarketCLOB.buyYes(tokenId, amount, price)
  }
  
  return (
    <div>
      {!isConnected ? (
        <ConnectButton /> // from RainbowKit
      ) : (
        <button onClick={handlePlaceOrder}>
          Place Order
        </button>
      )}
    </div>
  )
}
```

---

## Шаг 5: Authentication

### Google OAuth через Supabase:

**Setup:**
1. Supabase Dashboard → Authentication → Providers → Google
2. Добавь Google OAuth credentials
3. Настрой redirect URLs

**Компонент:**
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'

export function AuthButton() {
  const supabase = createClient()
  
  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`
      }
    })
  }
  
  return <button onClick={handleSignIn}>Sign in with Google</button>
}
```

**Callback route:**
```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  
  return NextResponse.redirect(new URL('/', request.url))
}
```

---

## Порядок внедрения (РЕКОМЕНДУЮ)

### 1. База данных ПЕРВОЙ
✅ Supabase - нет конфликтов, easy setup

### 2. Authentication ВТОРОЙ
✅ Google OAuth через Supabase

### 3. Wallet ТРЕТИЙ
⚠️ Проблема: Dynamic не поддерживает React 19
✅ Решение: RainbowKit

### 4. Polymarket ПОСЛЕДНИМ
✅ Всё готово, подключаем CLOB

---

## Альтернативный подход

### Если очень нужен Dynamic SDK:

```bash
# Downgrade React
npm install react@18.3.1 react-dom@18.3.1
npm install @types/react@18 @types/react-dom@18

# Downgrade Next.js
npm install next@15.1.0

# Теперь Dynamic работает
npm install @dynamic-labs/sdk-react-core @dynamic-labs/ethereum
```

**Минусы:**
- Потеряешь React 19
- Потеряешь Next.js 16 features
- Вернёшься к Webpack вместо Turbopack

**Плюсы:**
- Dynamic SDK из коробки
- Проверенное решение
- Много примеров

---

## Checklist перед каждым шагом

- [ ] Backup (git commit)
- [ ] Проверь совместимость с React 19
- [ ] Установи зависимости
- [ ] Протестируй dev mode
- [ ] Протестируй build
- [ ] Проверь на конфликты
- [ ] Commit если всё ОК

---

## Troubleshooting

### Peer dependency конфликты?
Проверь совместимость с React 19 на npm или GitHub

### Wallet не подключается?
Убедись что используешь RainbowKit или жди Dynamic update

### Polymarket ордера не проходят?
Проверь:
1. Builder API keys правильные
2. Wallet на Polygon network
3. Есть USDC balance
4. Есть MATIC для gas

---

**Удачи! 🚀**
