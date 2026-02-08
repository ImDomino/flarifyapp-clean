"use client";

import { useCallback } from "react";
import { OrderType, Side } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";

/**
 * Hook: usePlaceOrder
 *
 * IMPORTANT: Polymarket CLOB API blocks direct browser requests (CORS).
 * So we split the flow:
 * 1. createOrder() — signs the order client-side (Privy handles signature)
 * 2. POST to /api/polymarket/order — our server proxies to clob.polymarket.com
 */

export interface PlaceOrderParams {
  tokenId: string;
  side: Side;
  price: number;
  size: number;
  negRisk?: boolean;
}

export const usePlaceOrder = () => {
  const { initClobClient } = useClobClient();

  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size, negRisk = false } = params;

      const { clobClient, userCreds } = await initClobClient();

      console.log("ORDER DEBUG:", {
        tokenId: tokenId.slice(0, 20) + "...",
        side,
        price,
        size,
        negRisk,
      });

      // Step 1: Create & sign order client-side (no CLOB network call)
      const orderPayload = {
        tokenID: tokenId,
        price,
        size,
        side,
        feeRateBps: 0,
        expiration: 0,
        taker: "0x0000000000000000000000000000000000000000",
      };

      const signedOrder = await clobClient.createOrder(
        orderPayload,
        { negRisk, orderType: OrderType.GTC }
      );

      console.log("Order signed, posting via proxy...");

      // Step 2: Post via server proxy (bypasses CORS)
      const res = await fetch("/api/polymarket/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: signedOrder,
          headers: {
            "POLY-ADDRESS": userCreds.key,
            "POLY-SIGNATURE": userCreds.secret,
            "POLY-PASSPHRASE": userCreds.passphrase,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.details || data.error || "Order failed: " + res.status
        );
      }

      console.log("Order placed:", data);
      return data.orderID || data.id || "success";
    },
    [initClobClient]
  );

  const buyShares = useCallback(
    async (
      tokenId: string,
      price: number,
      size: number,
      negRisk?: boolean
    ): Promise<string> => {
      return placeOrder({ tokenId, side: Side.BUY, price, size, negRisk });
    },
    [placeOrder]
  );

  const sellShares = useCallback(
    async (
      tokenId: string,
      price: number,
      size: number,
      negRisk?: boolean
    ): Promise<string> => {
      return placeOrder({ tokenId, side: Side.SELL, price, size, negRisk });
    },
    [placeOrder]
  );

  return { placeOrder, buyShares, sellShares };
};