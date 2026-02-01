import { ClobClient, Side } from '@polymarket/clob-client';
import { BuilderConfig } from '@polymarket/builder-signing-sdk';
import { ethers } from 'ethers';

/**
 * Polymarket Builder-Attributed CLOB Client
 * 
 * Этот модуль использует remote signing для безопасной атрибуции ордеров.
 * 
 * Как работает:
 * 1. Пользователь создаёт ордер через ClobClient
 * 2. SDK автоматически вызывает наш /api/polymarket/sign endpoint
 * 3. Сервер генерирует builder authentication headers
 * 4. SDK прикрепляет headers к запросу в CLOB
 * 5. Polymarket видит builder headers и атрибутирует трейд на наш account
 * 6. Мы получаем комиссии + статистика в Builder Leaderboard
 */

/**
 * Создаёт конфигурацию для builder attribution с remote signing
 */
export function createBuilderConfig(): BuilderConfig {
  // Remote signing endpoint на нашем сервере
  // Credentials хранятся ТОЛЬКО на сервере, не в клиенте!
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: `${window.location.origin}/api/polymarket/sign`,
      // Можно добавить authorization token если нужна доп защита:
      // token: "your-auth-token"
    }
  });

  return builderConfig;
}

/**
 * Инициализирует Polymarket CLOB Client с builder attribution
 * 
 * @param signer - ethers v5.x EOA signer (от Privy embedded wallet)
 * @param userApiCreds - User API credentials для CLOB (опционально)
 * @param funderAddress - Safe proxy wallet address (опционально, для Safe wallets)
 */
export function createPolymarketClient(
  signer: ethers.Signer,
  userApiCreds?: any, // ApiKeyCreds from @polymarket/clob-client
  funderAddress?: string
): ClobClient {
  
  const builderConfig = createBuilderConfig();

  // Создаём CLOB Client с builder attribution
  const client = new ClobClient(
    'https://clob.polymarket.com', // CLOB API URL
    137, // Chain ID (Polygon Mainnet)
    signer as any, // Ethers v5.x signer от Privy wallet
    userApiCreds, // User API credentials (если есть)
    2, // signatureType: 2 для Safe proxy wallets, 0 для EOA
    funderAddress, // Safe proxy wallet address (если используется Safe)
    undefined, // Дополнительные параметры
    false, // enableL2 mode (false для Polygon)
    builderConfig // ✨ Builder config для attribution!
  );

  return client;
}

/**
 * Размещает BUY ордер на Polymarket
 * 
 * @param client - Инициализированный ClobClient
 * @param tokenId - Token ID рынка (например YES или NO token)
 * @param price - Цена за шар (0.0 - 1.0, например 0.65 = 65¢)
 * @param size - Количество шаров для покупки
 * 
 * @example
 * const order = await placeBuyOrder(client, "TOKEN_ID", 0.65, 10);
 */
export async function placeBuyOrder(
  client: ClobClient,
  tokenId: string,
  price: number,
  size: number
) {
  try {
    console.log('📝 Creating BUY order:', { tokenId, price, size });

    // Создаём ордер
    // SDK автоматически:
    // 1. Вызовет /api/polymarket/sign для получения builder headers
    // 2. Прикрепит headers к запросу
    // 3. Отправит в CLOB с builder attribution
    const order = await client.createOrder({
      price,
      side: Side.BUY,
      size,
      tokenID: tokenId,
    });

    console.log('✅ Order created:', order);

    // Размещаем ордер в CLOB
    const response = await client.postOrder(order);

    console.log('🎉 Order posted successfully:', response);

    return response;
  } catch (error) {
    console.error('❌ Error placing order:', error);
    throw error;
  }
}

/**
 * Размещает SELL ордер на Polymarket
 */
export async function placeSellOrder(
  client: ClobClient,
  tokenId: string,
  price: number,
  size: number
) {
  try {
    console.log('📝 Creating SELL order:', { tokenId, price, size });

    const order = await client.createOrder({
      price,
      side: Side.SELL,
      size,
      tokenID: tokenId,
    });

    const response = await client.postOrder(order);

    console.log('🎉 Order posted successfully:', response);

    return response;
  } catch (error) {
    console.error('❌ Error placing order:', error);
    throw error;
  }
}

/**
 * Получает открытые ордера пользователя
 */
export async function getUserOrders(client: ClobClient) {
  try {
    console.warn("getUserOrders is not implemented for current ClobClient version");
    return [];
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    return [];
  }
}


/**
 * Отменяет ордер
 */
import type { ClobClient } from '@polymarket/clob-client';

export async function cancelOrder(client: ClobClient, orderId: string) {
  try {
    console.warn(
      'cancelOrder helper is not wired to ClobClient.cancelOrder for this SDK version yet. orderId:',
      orderId
    );
    // TODO: if needed later, use client.cancelOrder({ orderID: orderId, market: ..., outcome: ... })
  } catch (error) {
    console.error('❌ Error cancelling order:', error);
    throw error;
  }
}

