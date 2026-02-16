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
 * Uses createAndPostOrder() directly — exactly like the official example:
 *
 *   const response = await clobClient.createAndPostOrder(
 *     order,
 *     { negRisk: false },
 *     OrderType.GTC
 *   );
 *
 * The SDK handles everything:
 * - Signs the order with ethers signer (1 Privy popup)
 * - Computes L2 HMAC auth headers from userApiCredentials
 * - Adds builder HMAC via BuilderConfig (remote signing)
 * - POSTs to CLOB
 *
 * On CORS/geo-block: falls back to createOrder() + server proxy.
 * On 401 invalid creds: clears localStorage, user retries.
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

      // ── Direct SDK call (official approach) ──
      try {
        console.log("[PlaceOrder] createAndPostOrder...", {
          tokenId: tokenId.slice(0, 20) + "...",
          side,
          price,
          size,
          negRisk,
        });

        const response = await clobClient.createAndPostOrder(
          orderPayload,
          { negRisk },
          OrderType.GTC
        );

        // Check for disguised network errors
        if (response?.error === "Network Error" || response?.status === 0) {
          throw new Error("CORS_BLOCKED");
        }

        if (response.success === false) {
          const errMsg = response.errorMsg || "Order failed";

          // Invalid API key → clear creds, user retries
          if (errMsg.includes("Invalid api key") || errMsg.includes("Unauthorized")) {
            invalidateCreds();
            throw new Error("Trading credentials expired. Please try again.");
          }

          throw new Error(errMsg);
        }

        console.log("[PlaceOrder] ✅ Success:", response.orderID);
        return response.orderID || "success";
      } catch (directError: any) {
        // Check if it's CORS/geo-block
        const isCorsOrNetwork =
          directError.message === "CORS_BLOCKED" ||
          directError.message?.includes("Network Error") ||
          directError.message?.includes("ERR_FAILED") ||
          directError.message?.includes("CORS") ||
          directError.response?.status === 0 ||
          directError.status === 0;

        if (!isCorsOrNetwork) {
          // Real API error — check for invalid creds
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

        console.log("[PlaceOrder] CORS/geo blocked, falling back to proxy...");
      }

      // ── Fallback: sign locally, post via server proxy ──
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