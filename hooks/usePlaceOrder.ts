"use client";

import { useCallback } from "react";
import { Side } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";
import { useAuthFetch } from "./useAuthFetch";
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
 * ALWAYS uses server proxy for order submission:
 *   1. clobClient.createOrder() — signs order locally (1 Privy popup)
 *   2. POST /api/polymarket/order — server adds L2 HMAC + builder HMAC, sends to CLOB
 *
 * Why not createAndPostOrder() (direct)?
 *   - SDK computes its own L2 HMAC which may use different timestamp format
 *   - Results in "invalid signature" errors
 *   - Geo-blocking issues from client IP
 *   - Our proxy in Dublin (dub1) bypasses geo-blocks and controls signature format
 *
 * Signature count:
 *   - Creds cached: 1 popup (createOrder)
 *   - Creds missing: 2 popups (derive + createOrder)
 */
export const usePlaceOrder = () => {
  const { initClobClient } = useClobClient();
  const authFetch = useAuthFetch();
  const { invalidateCreds } = useUserApiCredentials();

  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size, negRisk = false } = params;

      // 1. Init client (creds from memory/cookie, or derive with 1 signature)
      const { clobClient, eoaAddress } = await initClobClient();

      // 2. Sign order locally (1 Privy popup)
      const signedOrder = await clobClient.createOrder(
        {
          tokenID: tokenId,
          price,
          size,
          side,
          feeRateBps: 0,
          expiration: 0,
          taker: "0x0000000000000000000000000000000000000000",
        },
        {
          negRisk,
          tickSize: (negRisk ? "0.001" : "0.01") as any,
        }
      );

      console.log("[PlaceOrder] Order signed, posting via proxy...");

      // 3. Send via server proxy (server computes L2 HMAC + builder HMAC)
      const res = await authFetch("/api/polymarket/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedOrder, eoaAddress }),
      });

      // 4. Parse response
      const rawText = await res.text();
      let data: any;

      try {
        data = JSON.parse(rawText);
      } catch {
        const isCloudflare = rawText.includes("Cloudflare") || rawText.includes("blocked");
        data = {
          error: isCloudflare
            ? "Blocked by Cloudflare geo-restriction."
            : rawText.slice(0, 300) || `HTTP ${res.status}`,
        };
      }

      // 5. Handle errors
      if (!res.ok) {
        const errorMsg = data.details || data.error || `Order failed: HTTP ${res.status}`;

        if (
          data.code === "INVALID_CREDS" ||
          data.code === "CREDS_MISSING" ||
          errorMsg.includes("Invalid api key")
        ) {
          await invalidateCreds();
          throw new Error("Trading credentials expired. Please try again.");
        }

        throw new Error(errorMsg);
      }

      console.log("[PlaceOrder] Success:", data);
      return data.orderID || data.id || "success";
    },
    [initClobClient, authFetch, invalidateCreds]
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