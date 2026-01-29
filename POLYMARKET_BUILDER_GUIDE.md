# Polymarket Builder Attribution - Руководство

## Обзор

Наше приложение использует Polymarket Builder Attribution для:
- Получения комиссий от трейдов пользователей
- Отслеживания объёма через Builder Leaderboard
- Участия в Builder Grant программе

## Архитектура

### Remote Signing (безопасный подход)

```
User → ClobClient.createOrder()
  ↓
SDK вызывает /api/polymarket/sign
  ↓
Сервер генерирует builder auth headers
  ↓
SDK прикрепляет headers к запросу
  ↓
CLOB получает ордер с builder attribution
  ↓
Polymarket кредитует трейд на наш builder account
```

## Установка

### 1. Установить зависимости

```bash
npm install @polymarket/clob-client @polymarket/builder-signing-sdk ethers@5
```

### 2. Получить Builder API Credentials

1. Зайди на https://polymarket.com/settings?tab=builder
2. Создай или открой свой Builder Profile
3. Скопируй:
   - API Key
   - Secret
   - Passphrase

### 3. Настроить Environment Variables

Добавь в `.env.local`:

```env
POLY_BUILDER_API_KEY=your_api_key_here
POLY_BUILDER_SECRET=your_secret_here
POLY_BUILDER_PASSPHRASE=your_passphrase_here
```

⚠️ **ВАЖНО:** НЕ КОМИТИТЬ эти ключи в Git! Они должны быть ТОЛЬКО на сервере.

## Использование

### Базовый пример

```typescript
import { createPolymarketClient, placeBuyOrder } from '@/lib/polymarket/builder-client';
import { ethers } from 'ethers';

// 1. Получаем signer от Privy wallet
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// 2. Создаём CLOB client с builder attribution
const client = createPolymarketClient(signer);

// 3. Размещаем ордер (автоматически атрибутируется на builder account)
const response = await placeBuyOrder(
  client,
  'TOKEN_ID_HERE', // ID токена рынка
  0.65,            // Цена (65¢)
  10               // Количество шаров
);

console.log('Order placed:', response);
```

### С Privy Embedded Wallet

```typescript
import { usePrivy } from '@privy-io/react-auth';
import { createPolymarketClient } from '@/lib/polymarket/builder-client';

function TradingComponent() {
  const { user } = usePrivy();

  const handleTrade = async () => {
    // Получаем embedded wallet provider от Privy
    const provider = await user.wallet.getEthersProvider();
    const signer = provider.getSigner();

    // Создаём client
    const client = createPolymarketClient(signer);

    // Размещаем ордер
    await placeBuyOrder(client, tokenId, price, size);
  };

  return <button onClick={handleTrade}>Place Order</button>;
}
```

## API Reference

### Server Endpoint

**POST /api/polymarket/sign**

Генерирует builder authentication headers для CLOB запросов.

Request:
```json
{
  "method": "POST",
  "path": "/orders",
  "body": "{...order payload...}"
}
```

Response:
```json
{
  "POLY_BUILDER_SIGNATURE": "hmac_signature_here",
  "POLY_BUILDER_TIMESTAMP": "1234567890",
  "POLY_BUILDER_API_KEY": "your_api_key",
  "POLY_BUILDER_PASSPHRASE": "your_passphrase"
}
```

### Client Functions

#### `createPolymarketClient(signer, userApiCreds?, funderAddress?)`

Создаёт ClobClient с builder attribution.

**Parameters:**
- `signer` - ethers v5.x Signer (от Privy wallet)
- `userApiCreds` - (опционально) User API credentials
- `funderAddress` - (опционально) Safe proxy wallet address

**Returns:** `ClobClient`

---

#### `placeBuyOrder(client, tokenId, price, size)`

Размещает BUY ордер с builder attribution.

**Parameters:**
- `client` - Инициализированный ClobClient
- `tokenId` - Token ID рынка
- `price` - Цена (0.0 - 1.0)
- `size` - Количество шаров

**Returns:** `Promise<OrderResponse>`

---

#### `placeSellOrder(client, tokenId, price, size)`

Размещает SELL ордер с builder attribution.

---

#### `getUserOrders(client)`

Получает открытые ордера пользователя.

**Returns:** `Promise<Order[]>`

---

#### `cancelOrder(client, orderId)`

Отменяет ордер.

**Parameters:**
- `orderId` - ID ордера для отмены

## Мониторинг

### Builder Dashboard

Статистика доступна на: https://polymarket.com/settings?tab=builder

Показывает:
- Total Volume (объём трейдов)
- Earnings (твои комиссии)
- Active Users
- Top Markets

### Data API

Программный доступ к статистике через Polymarket Data API:

```typescript
// GET /builder/{builder_id}/volume
const response = await fetch(
  'https://data-api.polymarket.com/builder/FLARIFYAPP/volume?interval=daily'
);
const data = await response.json();
```

## Troubleshooting

### "Invalid signature" errors

Проверь:
1. Credentials правильные в `.env.local`
2. Timestamp синхронизирован (часы сервера)
3. Body не модифицируется между signing и отправкой

### Orders не атрибутируются

Проверь:
1. `/api/polymarket/sign` доступен и работает
2. Builder headers присутствуют в запросе (проверь Network tab)
3. Builder credentials валидные

### Missing credentials

Убедись что все 3 переменные настроены:
- `POLY_BUILDER_API_KEY`
- `POLY_BUILDER_SECRET`
- `POLY_BUILDER_PASSPHRASE`

## Security Best Practices

1. ✅ Используй remote signing (как в нашем setup)
2. ✅ Храни credentials ТОЛЬКО на сервере
3. ✅ НЕ коммить credentials в Git
4. ✅ Используй environment variables
5. ✅ Добавь rate limiting на `/sign` endpoint
6. ✅ Логируй все signing requests для аудита

## Next Steps

1. Получи Builder API credentials
2. Добавь в `.env.local`
3. Протестируй на testnet (если доступно)
4. Deploy на production
5. Мониторь статистику в Builder Dashboard

---

Документация основана на:
- https://docs.polymarket.com/api-reference/order-attribution
- https://docs.polymarket.com/api-reference/clob-intro
