"use client";

import { useCallback } from "react";
import { Side, OrderType } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";

/**
 * Hook: usePlaceOrder
 *
 * Hybrid approach:
 * 1. Try createAndPostOrder() directly (works when no CORS/geo block)
 * 2. On network error, fallback to createOrder() + proxy POST
 *
 * The proxy reproduces the exact payload format the SDK uses:
 * { deferExec: false, order: {...signedOrder}, owner: apiKey, orderType: "GTC" }
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

      const orderPayload = {
        tokenID: tokenId,
        price,
        size,
        side,
        feeRateBps: 0,
        expiration: 0,
        taker: "0x0000000000000000000000000000000000000000",
      };

      // Strategy 1: Try direct createAndPostOrder (no CORS issues in some regions)
      try {
        console.log("📦 Trying createAndPostOrder (direct)...");

        const response = await clobClient.createAndPostOrder(
          orderPayload,
          { negRisk },
          OrderType.GTC
        );

        console.log("✅ Direct order response:", response);

        // Check for network/CORS errors disguised as response
        if (response?.error === "Network Error" || response?.status === 0) {
          throw new Error("CORS_BLOCKED");
        }

        if (response.success === false) {
          throw new Error(response.errorMsg || "Order failed");
        }

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
          // Real API error (like "min size: $1") — rethrow
          const msg =
            directError.response?.data?.error ||
            directError.message ||
            "Order failed";
          throw new Error(msg);
        }

        console.log("🔄 CORS/geo blocked, falling back to proxy...");
      }

      // Strategy 2: Fallback — createOrder on client, POST via server proxy
      const signedOrder = await clobClient.createOrder(orderPayload, {
        negRisk,
      });

      console.log("📦 Order signed, posting via proxy...");

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
      const contentType = res.headers.get("content-type") || "";
      const rawText = await res.text();

      if (contentType.includes("application/json") && rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = { error: rawText.slice(0, 300) };
        }
      } else {
        const isCloudflareBlock =
          rawText.includes("Cloudflare") || rawText.includes("blocked");
        data = {
          error: isCloudflareBlock
            ? "Request blocked by Cloudflare geo-restriction"
            : rawText.slice(0, 300) || `HTTP ${res.status}`,
        };
      }

      if (!res.ok) {
        const errorMsg =
          data.details || data.error || `Order failed: HTTP ${res.status}`;
        console.error("❌ Proxy order failed:", {
          status: res.status,
          error: errorMsg,
        });
        throw new Error(errorMsg);
      }

      console.log("✅ Proxy order response:", data);
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