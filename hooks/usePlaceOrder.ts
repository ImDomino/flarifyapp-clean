"use client";

import { useCallback } from "react";
import { Side } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";

/**
 * Hook: usePlaceOrder
 *
 * IMPORTANT: Polymarket CLOB API blocks direct browser requests (CORS).
 * So we split the flow:
 * 1. createOrder() — signs the order client-side (Privy handles signature)
 * 2. POST to /api/polymarket/order — our server proxies to clob.polymarket.com
 *
 * FIX: createOrder() returns a complex object structure, we need to extract
 * the actual signed order from it before sending to server.
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

      const { clobClient, userCreds, eoaAddress } = await initClobClient();

      console.log("ORDER DEBUG:", {
        tokenId: tokenId.slice(0, 20) + "...",
        side,
        price,
        size,
        negRisk,
        eoaAddress: eoaAddress.slice(0, 10) + "...",
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

      const rawOrderResponse = await clobClient.createOrder(
        orderPayload,
        { negRisk }
      );

      console.log("📦 Raw order response structure:", {
        hasOrder: !!rawOrderResponse.order,
        hasDeferExec: "deferExec" in rawOrderResponse,
        hasOwner: !!rawOrderResponse.owner,
        orderType: rawOrderResponse.orderType,
        keys: Object.keys(rawOrderResponse),
      });

      // ✅ FIX: createOrder() returns: { deferExec, order: {...signedOrder}, owner, orderType }
      // We need to extract the actual order object
      let signedOrder: any;

      if (rawOrderResponse.order) {
        // Структура с вложенным order
        signedOrder = {
          deferExec: rawOrderResponse.deferExec ?? false,
          order: rawOrderResponse.order,
          owner: rawOrderResponse.owner ?? "apiKey",
          orderType: rawOrderResponse.orderType ?? "GTC",
        };
      } else {
        // Fallback: если order уже на верхнем уровне
        signedOrder = rawOrderResponse;
      }

      console.log("Order signed, posting via proxy...");

      // Step 2: Post via server proxy (bypasses CORS + geo-block)
      // Server generates proper HMAC headers for both user and builder
      const res = await fetch("/api/polymarket/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: signedOrder,
          userCreds: {
            key: userCreds.key,
            secret: userCreds.secret,
            passphrase: userCreds.passphrase,
          },
          eoaAddress,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Более детальная ошибка
        const errorMsg = data.details || data.error || `HTTP ${res.status}`;
        console.error("❌ Order failed:", {
          status: res.status,
          error: errorMsg,
          response: data,
        });
        throw new Error(errorMsg);
      }

      console.log("✅ Order placed:", data);
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
