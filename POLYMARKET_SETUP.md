# 🎯 Polymarket Integration Guide

## Overview
Это версия Flarifyapp с полной интеграцией Polymarket CLOB для размещения ордеров прямо из постов.

## Features

✅ **Wallet Connection** - Dynamic SDK для подключения кошелька (Polygon)  
✅ **Market Data** - Загрузка данных рынков через Polymarket API  
✅ **Order Placement** - Размещение BUY YES/NO ордеров с кастомным размером  
✅ **Builder Attribution** - Все ордера через builder_id=FLARIFYAPP  
✅ **USDC Balance** - Отображение баланса USDC  
✅ **Order Form** - Встроенная форма ставок рядом с каждым постом  

---

## Setup Instructions

### 1. Prerequisites

Тебе понадобится:
- ✅ Supabase проект (см. основной README)
- ✅ Dynamic аккаунт (бесплатно)
- ✅ Polymarket Builder ID (опционально)

### 2. Dynamic Setup (Wallet Connection)

#### Создай аккаунт:
1. Иди на [dynamic.xyz](https://www.dynamic.xyz/)
2. Sign up → Create new project
3. Настрой Polygon network

#### Получи Environment ID:
1. В Dashboard → Settings → API Keys
2. Copy `Environment ID`
3. Добавь в `.env.local`:
```env
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=твой-environment-id
```

#### Настрой сети:
1. В Dashboard → Chains
2. Включи **Polygon (Mainnet)**
3. Отключи testnet'ы если не нужны

### 3. Polymarket Builder ID (Optional)

Если хочешь получать комиссию от ставок:

1. Свяжись с Polymarket для получения Builder ID
2. Обнови в `.env.local`:
```env
NEXT_PUBLIC_POLYMARKET_BUILDER_ID=твой-builder-id
```

Без Builder ID всё равно работает, просто используется `FLARIFYAPP`.

### 4. Install Dependencies

```bash
npm install
```

Новые зависимости:
- `@dynamic-labs/sdk-react-core` - Wallet connection
- `@dynamic-labs/ethereum` - Ethereum/Polygon support
- `ethers` - Blockchain interactions
- `@polymarket/clob-client` - Polymarket CLOB SDK
- `axios` - HTTP requests

### 5. Environment Variables

Создай `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# Dynamic Wallet
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=твой-dynamic-id

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_POLYMARKET_BUILDER_ID=FLARIFYAPP
```

### 6. Run Development Server

```bash
npm run dev
```

Открой http://localhost:3000

---

## How It Works

### Wallet Connection Flow

1. User clicks "Connect Wallet"
2. Dynamic modal opens → choose wallet (MetaMask, WalletConnect, etc.)
3. Connect to Polygon network
4. Polymarket CLOB client initializes with signer
5. USDC balance displayed in navbar

### Order Placement Flow

1. User opens post with market
2. Clicks "Trade on Polymarket" button
3. Order form appears:
   - Select outcome (YES/NO)
   - Enter amount in USDC
   - Click "Place $X YES/NO Bet"
4. Order is created with:
   - Current market price
   - User's amount
   - Builder ID (FLARIFYAPP)
5. Transaction sent to Polymarket CLOB
6. Success/error message shown

### Builder Attribution

Все ордера включают:
```typescript
{
  builderId: "FLARIFYAPP",
  builderFeeRateBps: 0  // 0% fee (настраивается)
}
```

Polymarket трекает эти ордера для твоей статистики.

---

## Components Structure

```
lib/polymarket/
├── types.ts          # TypeScript типы
├── api.ts            # Polymarket API клиент
└── clob-client.ts    # CLOB клиент для ордеров

components/
├── WalletConnect.tsx # Кнопка подключения кошелька
├── OrderForm.tsx     # Форма размещения ставок
├── PostCard.tsx      # Карточка поста (обновлена)
└── providers/
    └── DynamicProvider.tsx  # Dynamic context provider
```

---

## API Reference

### PolymarketAPI

```typescript
import { polymarketAPI } from '@/lib/polymarket/api';

// Get market data
const market = await polymarketAPI.getMarket(conditionId);

// Get prices
const prices = await polymarketAPI.getMarketPrices(conditionId);

// Search markets
const markets = await polymarketAPI.searchMarkets('bitcoin');
```

### PolymarketCLOBClient

```typescript
import { polymarketCLOB } from '@/lib/polymarket/clob-client';

// Initialize with signer
await polymarketCLOB.initialize(signer);

// Place BUY YES order
await polymarketCLOB.buyYes(tokenId, amount, price);

// Place BUY NO order
await polymarketCLOB.buyNo(tokenId, amount, price);

// Get USDC balance
const balance = await polymarketCLOB.getUSDCBalance();

// Get open orders
const orders = await polymarketCLOB.getOpenOrders();
```

---

## Testing

### Testnet Testing

Для тестирования без реальных денег:

1. Используй Polygon Mumbai (testnet)
2. Получи test MATIC и USDC
3. Обнови Chain ID в `clob-client.ts`:
```typescript
const CHAIN_ID = 80001; // Mumbai testnet
```

### Local Testing

Без подключения кошелька, форма всё равно отображается, но ордера не размещаются.

---

## Production Considerations

### Security

- ✅ Приватные ключи никогда не сохраняются
- ✅ Все транзакции подписываются в кошельке пользователя
- ✅ CLOB client работает через HTTPS

### Rate Limits

Polymarket API:
- 1000 requests/minute для публичных endpoints
- 100 requests/minute для торговли

### Gas Fees

- Ордера на Polygon стоят ~$0.01-0.10 в gas
- USDC approval может потребоваться один раз (~$0.05)

### Error Handling

Все ошибки логируются и показываются пользователю:
- "Wallet not connected"
- "Insufficient USDC balance"
- "Invalid amount"
- "Network error"

---

## Monetization

### Builder Fees

Настрой комиссию в `clob-client.ts`:

```typescript
const BUILDER_CONFIG = {
  builderId: 'FLARIFYAPP',
  builderFeeRateBps: 100,  // 1% = 100 basis points
};
```

Комиссия автоматически добавляется к ордерам.

### Volume Tracking

Polymarket трекает:
- Total volume через твой builder_id
- Number of orders
- Active users

Эти метрики можно запросить у Polymarket для аналитики.

---

## Troubleshooting

### "Dynamic provider not initialized"
- Проверь NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
- Перезапусти dev server

### "Wrong network"
- Убедись что wallet подключен к Polygon
- Dynamic должен автоматически предложить switch

### "Failed to create order"
- Проверь USDC balance
- Проверь allowance (может нужен approve)
- Смотри console для деталей

### Orders not appearing
- Подожди ~30 секунд для blockchain confirmation
- Проверь в Polymarket UI что ордер появился
- Проверь network (Mainnet vs Testnet)

---

## Next Steps

### Enhance Features

- [ ] Real-time price updates (WebSocket)
- [ ] Order history display
- [ ] Portfolio tracking
- [ ] P&L calculations
- [ ] Market discovery page
- [ ] Advanced order types (limit, stop-loss)

### Integration Ideas

- [ ] Twitter sharing с referral links
- [ ] Discord notifications для успешных ставок
- [ ] Telegram bot для price alerts
- [ ] Leaderboard по объёму торговли

---

## Support & Resources

**Polymarket:**
- Docs: https://docs.polymarket.com
- API: https://docs.polymarket.com/api
- Discord: https://discord.gg/polymarket

**Dynamic:**
- Docs: https://docs.dynamic.xyz
- Dashboard: https://app.dynamic.xyz

**Ethers.js:**
- Docs: https://docs.ethers.org

---

## License

MIT - используй как хочешь!

Если есть вопросы - пиши issue на GitHub или в Discord Polymarket.
