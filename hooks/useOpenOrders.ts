"use client";

import { useState, useCallback } from "react";
import { useClobClient } from "./useClobClient";

export interface OpenOrder {
  id: string;
  market: string;
  asset_id: string;
  price: string;
  size: string;
  side: "BUY" | "SELL";
  status: string;
  created_at: number;
  outcome?: string;
  question?: string;
}

export const useOpenOrders = () => {
  const { initClobClient } = useClobClient();
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Получить открытые ордера пользователя
   * через официальный метод SDK: clobClient.getOpenOrders(...)
   */
  const fetchOrders = useCallback(async (marketId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { clobClient, safeAddress } = await initClobClient();
      if (!safeAddress) {
        throw new Error("Safe address is not defined");
      }

      const funder = safeAddress.toLowerCase();

      // SDK сам дергает правильный endpoint с L2‑headers
      const res: any = await clobClient.getOpenOrders(
        marketId
          ? { market: marketId }
          : {} // без фильтра по рынку
      );

      const rawOrders: any[] = Array.isArray(res)
        ? res
        : res.data || res.orders || [];

      // Оставляем только ордера нашего Safe (funder)
      const yourOrders = rawOrders.filter((o: any) =>
        o.maker_address?.toLowerCase() === funder
      );

      const mapped: OpenOrder[] = yourOrders.map((o: any) => ({
        id: o.order_hash || o.id,
        market: o.market,
        asset_id: o.asset_id,
        price: o.price,
        size: o.size,
        side: o.side,
        status: o.status || "open",
        created_at: parseInt(o.created_at || "0", 10),
        outcome: o.outcome,
        question: o.question,
      }));

      console.log("📊 Your open orders:", mapped.length);
      setOrders(mapped);
      return mapped;
    } catch (err: any) {
      console.error("❌ Error fetching orders:", err);
      setError(err.message || "Failed to fetch orders");
      setOrders([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [initClobClient]);

  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      const { clobClient } = await initClobClient();
      console.log("🗑️ Cancelling order:", orderId);
      await clobClient.cancelOrder({ orderID: orderId });
      console.log("✅ Order cancelled");
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error("❌ Cancel error:", err);
      setError(err.message || "Failed to cancel order");
      return false;
    }
  }, [initClobClient, fetchOrders]);

  const cancelOrders = useCallback(async (orderIds: string[]) => {
    try {
      const { clobClient } = await initClobClient();
      console.log("🗑️ Cancelling orders:", orderIds.length);
      await clobClient.cancelOrders(orderIds);
      console.log("✅ Orders cancelled");
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error("❌ Cancel error:", err);
      setError(err.message || "Failed to cancel orders");
      return false;
    }
  }, [initClobClient, fetchOrders]);

  const cancelAllOrders = useCallback(async () => {
    try {
      const { clobClient } = await initClobClient();
      console.log("🗑️ Cancelling all orders...");
      await clobClient.cancelAll();
      console.log("✅ All orders cancelled");
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error("❌ Cancel error:", err);
      setError(err.message || "Failed to cancel all orders");
      return false;
    }
  }, [initClobClient, fetchOrders]);

  const cancelMarketOrders = useCallback(async (marketId: string, assetId?: string) => {
    try {
      const { clobClient } = await initClobClient();
      console.log("🗑️ Cancelling market orders:", marketId);
      await clobClient.cancelMarketOrders({ market: marketId, asset_id: assetId });
      console.log("✅ Market orders cancelled");
      await fetchOrders();
      return true;
    } catch (err: any) {
      console.error("❌ Cancel error:", err);
      setError(err.message || "Failed to cancel market orders");
      return false;
    }
  }, [initClobClient, fetchOrders]);

  return {
    orders,
    isLoading,
    error,
    fetchOrders,
    cancelOrder,
    cancelOrders,
    cancelAllOrders,
    cancelMarketOrders,
  };
};
