"use client";

import { useCallback } from "react";
import { OrderType, Side } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";

export interface PlaceOrderParams {
  tokenId: string;
  side: Side;
  price: number;
  size: number;
}

export const usePlaceOrder = () => {
  const { initClobClient } = useClobClient();

  /**
   * Универсальная функция для размещения ордера (BUY или SELL)
   * 
   * @param tokenId - ID токена (outcome token)
   * @param side - Side.BUY или Side.SELL
   * @param price - Цена за share (0.0 - 1.0)
   * @param size - Количество shares
   */
  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size } = params;

      const sideLabel = side === Side.BUY ? 'BUY' : 'SELL';
      
      console.log(`📝 Placing ${sideLabel} order:`, {
        tokenId: tokenId.slice(0, 20) + '...',
        side: sideLabel,
        price: price.toFixed(4),
        size: size.toFixed(4),
      });

      // Инициализируем CLOB клиент (включает проверку approvals)
      const { clobClient, safeAddress } = await initClobClient();

      console.log('💰 Trading from Safe:', safeAddress);

      // Создаём ордер
      const order = {
        tokenID: tokenId,
        price,
        size,
        side,
        feeRateBps: 0,
        expiration: 0, // 0 = Good-til-Cancel
        taker: "0x0000000000000000000000000000000000000000",
      };

      // Размещаем ордер
      // createAndPostOrder создаёт, подписывает и отправляет ордер
      const res = await clobClient.createAndPostOrder(
        order,
        { negRisk: false }, // Для обычных рынков
        OrderType.GTC // Good-til-Cancel
      );

      console.log(`✅ ${sideLabel} order placed successfully!`);
      console.log('  Order ID:', res.orderID);

      return res.orderID;
    },
    [initClobClient]
  );

  /**
   * Покупка шардов (BUY)
   * 
   * @param tokenId - Token ID outcome'а
   * @param price - Цена за share (0.0 - 1.0)
   * @param size - Количество shares для покупки
   */
  const buyShares = useCallback(
    async (tokenId: string, price: number, size: number): Promise<string> => {
      return placeOrder({
        tokenId,
        side: Side.BUY,
        price,
        size,
      });
    },
    [placeOrder]
  );

  /**
   * Продажа шардов (SELL)
   * 
   * @param tokenId - Token ID outcome'а (тот же что у купленных shares)
   * @param price - Цена продажи за share (0.0 - 1.0)
   * @param size - Количество shares для продажи
   */
  const sellShares = useCallback(
    async (tokenId: string, price: number, size: number): Promise<string> => {
      console.log('📤 Selling shares:', {
        tokenId: tokenId.slice(0, 20) + '...',
        price: price.toFixed(4),
        size: size.toFixed(4),
      });
      
      return placeOrder({
        tokenId,
        side: Side.SELL,
        price,
        size,
      });
    },
    [placeOrder]
  );

  return { 
    placeOrder, 
    buyShares, 
    sellShares,
  };
};
