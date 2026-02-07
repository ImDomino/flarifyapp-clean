"use client";

import { useState, useCallback } from "react";
import { useClobClient } from "./useClobClient";

export interface OpenOrder {
  id: string;
  market: string;
  asset_id: string;
  price: string;
  original_size: string;
  size_matched: string;
  size_remaining: string;
  side: "BUY" | "SELL";
  status: string;
  created_at: number;
  outcome?: string;
  question?: string;
}

/**
 * Hook: useOpenOrders
 *
 * Fetches and manages open orders via ClobClient SDK methods.
 * Uses the Safe address (funder) to filter orders.
 */
export const useOpenOrders = () => {
  const { initClobClient } = useClobClient();
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(
    async (marketId?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const { clobClient, safeAddress } = await initClobClient();
        if (!safeAddress) throw new Error("Safe address is not defined");

        const funder = safeAddress.toLowerCase();

        const res: any = await clobClient.getOpenOrders(
          marketId ? { market: marketId } : {}
        );

        const rawOrders: any[] = Array.isArray(res)
          ? res
          : res.data || res.orders || [];

        // Log first order to debug field names
        if (rawOrders.length > 0) {
          console.log("📋 Raw order sample:", JSON.stringify(rawOrders[0], null, 2));
        }

        // Filter to only our Safe's orders
        const yourOrders = rawOrders.filter(
          (o: any) => o.maker_address?.toLowerCase() === funder
        );

        const mapped: OpenOrder[] = yourOrders.map((o: any) => {
          // CLOB API returns: original_size, size_matched, price
          // "size" field may not exist or may mean remaining
          const originalSize = o.original_size || o.size || o.origSize || "0";
          const sizeMatched = o.size_matched || o.matched || "0";
          
          const origNum = parseFloat(originalSize) || 0;
          const matchedNum = parseFloat(sizeMatched) || 0;
          const remaining = origNum - matchedNum;

          return {
            id: o.order_hash || o.id || o.orderID,
            market: o.market,
            asset_id: o.asset_id,
            price: o.price || "0",
            original_size: originalSize,
            size_matched: sizeMatched,
            size_remaining: remaining > 0 ? remaining.toString() : originalSize,
            side: o.side,
            status: o.status || "open",
            created_at: parseInt(o.created_at || "0", 10),
            outcome: o.outcome,
            question: o.question,
          };
        });

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
    },
    [initClobClient]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      try {
        const { clobClient } = await initClobClient();
        await clobClient.cancelOrder({ orderID: orderId });
        await fetchOrders();
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to cancel order");
        return false;
      }
    },
    [initClobClient, fetchOrders]
  );

  const cancelOrders = useCallback(
    async (orderIds: string[]) => {
      try {
        const { clobClient } = await initClobClient();
        await clobClient.cancelOrders(orderIds);
        await fetchOrders();
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to cancel orders");
        return false;
      }
    },
    [initClobClient, fetchOrders]
  );

  const cancelAllOrders = useCallback(async () => {
    try {
      const { clobClient } = await initClobClient();
      await clobClient.cancelAll();
      await fetchOrders();
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to cancel all orders");
      return false;
    }
  }, [initClobClient, fetchOrders]);

  const cancelMarketOrders = useCallback(
    async (marketId: string, assetId?: string) => {
      try {
        const { clobClient } = await initClobClient();
        await clobClient.cancelMarketOrders({ market: marketId, asset_id: assetId });
        await fetchOrders();
        return true;
      } catch (err: any) {
        setError(err.message || "Failed to cancel market orders");
        return false;
      }
    },
    [initClobClient, fetchOrders]
  );

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
