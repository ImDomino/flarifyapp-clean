"use client";

import { useCallback } from "react";
import { Side, OrderType } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";
import { useUserApiCredentials } from "./useUserApiCredentials";

export interface PlaceOrderParams {
  tokenId: string;
  side: Side;
  price: number;
  size: number;
  negRisk?: boolean;
}

/**
 * usePlaceOrder
 *
 * Strategy 1: createAndPostOrder() — SDK handles everything (like official example)
 * Strategy 2: createOrder() + proxy — fallback when CORS/geo-blocked
 *
 * On 401/invalid creds: clears localStorage, user retries manually (no auto-retry = no extra popups)
 */
export const usePlaceOrder = () => {
  const { initClobClient } = useClobClient();
  const { invalidateCreds } = useUserApiCredentials();

  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size, negRisk = false } = params;

      const { clobClient, userCreds, eoaAddress } = await initClobClient();

      const orderPayload = {
        tokenID: tokenId,
        price,
        size,
        side,
        feeRateBps: 0,
        expiration: 0,
        taker: "0x0000000000000000000000000000000000000000",
      };

      // ── Strategy 1: Direct SDK call ──
      try {
        console.log("[PlaceOrder] createAndPostOrder...");

        const response = await clobClient.createAndPostOrder(
          orderPayload,
          { negRisk },
          OrderType.GTC
        );

        if (response?.error === "Network Error" || response?.status === 0) {
          throw new Error("CORS_BLOCKED");
        }

        if (response.success === false) {
          const errMsg = response.errorMsg || "Order failed";
          if (errMsg.includes("Invalid api key") || errMsg.includes("Unauthorized")) {
            invalidateCreds();
            throw new Error("Trading credentials expired. Please try again.");
          }
          throw new Error(errMsg);
        }

        console.log("[PlaceOrder] ✅ Direct success:", response.orderID);
        return response.orderID || "success";
      } catch (directError: any) {
        const isCorsOrNetwork =
          directError.message === "CORS_BLOCKED" ||
          directError.message?.includes("Network Error") ||
          directError.message?.includes("ERR_FAILED") ||
          directError.message?.includes("CORS") ||
          directError.response?.status === 0 ||
          directError.status === 0;

        if (!isCorsOrNetwork) {
          // Check for 401
          if (
            directError.response?.status === 401 ||
            directError.response?.data?.error?.includes("Invalid api key")
          ) {
            invalidateCreds();
            throw new Error("Trading credentials expired. Please try again.");
          }
          const msg =
            directError.response?.data?.error ||
            directError.message ||
            "Order failed";
          throw new Error(msg);
        }

        console.log("[PlaceOrder] CORS blocked, falling back to proxy...");
      }

      // ── Strategy 2: Sign locally, post via proxy ──
      const signedOrder = await clobClient.createOrder(orderPayload, {
        negRisk,
      });

      console.log("[PlaceOrder] Signed, posting via proxy...");

      const res = await fetch("/api/polymarket/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedOrder,
          userCreds: {
            key: userCreds.key,
            secret: userCreds.secret,
            passphrase: userCreds.passphrase,
          },
          eoaAddress,
        }),
      });

      let data: any;
      const rawText = await res.text();

      try {
        data = JSON.parse(rawText);
      } catch {
        const isCloudflare = rawText.includes("Cloudflare") || rawText.includes("blocked");
        data = {
          error: isCloudflare
            ? "Blocked by Cloudflare geo-restriction"
            : rawText.slice(0, 300) || `HTTP ${res.status}`,
        };
      }

      if (!res.ok) {
        const errorMsg = data.details || data.error || `Order failed: HTTP ${res.status}`;
        if (errorMsg.includes("Invalid api key") || errorMsg.includes("Unauthorized")) {
          invalidateCreds();
          throw new Error("Trading credentials expired. Please try again.");
        }
        throw new Error(errorMsg);
      }

      console.log("[PlaceOrder] ✅ Proxy success:", data);
      return data.orderID || data.id || "success";
    },
    [initClobClient, invalidateCreds]
  );

  const buyShares = useCallback(
    async (tokenId: string, price: number, size: number, negRisk?: boolean): Promise<string> => {
      return placeOrder({ tokenId, side: Side.BUY, price, size, negRisk });
    },
    [placeOrder]
  );

  const sellShares = useCallback(
    async (tokenId: string, price: number, size: number, negRisk?: boolean): Promise<string> => {
      return placeOrder({ tokenId, side: Side.SELL, price, size, negRisk });
    },
    [placeOrder]
  );

  return { placeOrder, buyShares, sellShares };
};