"use client";

import { useState, useCallback } from "react";

interface OrderbookPrice {
  bestBid: number | null;
  bestAsk: number | null;
  midPrice: number | null;
}

/**
 * Хук для получения текущих цен из orderbook Polymarket
 */
export const useOrderbook = () => {
  const [prices, setPrices] = useState<Map<string, OrderbookPrice>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Получить цены для конкретного токена
   */
  const fetchPrice = useCallback(async (tokenId: string): Promise<OrderbookPrice | null> => {
    try {
      const response = await fetch(
        `https://clob.polymarket.com/book?token_id=${tokenId}`
      );

      if (!response.ok) {
        console.warn('Failed to fetch orderbook for', tokenId);
        return null;
      }

      const data = await response.json();

      // Получаем лучший bid (цена покупки) и ask (цена продажи)
      const bids = data.bids || [];
      const asks = data.asks || [];

      const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : null;
      const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : null;

      const midPrice =
        bestBid !== null && bestAsk !== null
          ? (bestBid + bestAsk) / 2
          : bestBid || bestAsk;

      const priceData: OrderbookPrice = {
        bestBid,
        bestAsk,
        midPrice,
      };

      setPrices((prev) => new Map(prev).set(tokenId, priceData));

      return priceData;
    } catch (error) {
      console.error('Error fetching orderbook:', error);
      return null;
    }
  }, []);

  /**
   * Получить цены для нескольких токенов
   */
  const fetchPrices = useCallback(
    async (tokenIds: string[]) => {
      setIsLoading(true);
      try {
        await Promise.all(tokenIds.map((id) => fetchPrice(id)));
      } finally {
        setIsLoading(false);
      }
    },
    [fetchPrice]
  );

  /**
   * Получить кэшированную цену
   */
  const getPrice = useCallback(
    (tokenId: string): OrderbookPrice | undefined => {
      return prices.get(tokenId);
    },
    [prices]
  );

  return {
    prices,
    isLoading,
    fetchPrice,
    fetchPrices,
    getPrice,
  };
};
