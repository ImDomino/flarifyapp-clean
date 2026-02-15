"use client";

import { useCallback } from "react";
import { Side, OrderType } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";
import { useAuthFetch } from "./useAuthFetch";

/**
 * Hook: usePlaceOrder — SECURE version
 *
 * Hybrid approach:
 * 1. Try createAndPostOrder() directly (works when no CORS/geo block)
 * 2. On network error, fallback to createOrder() + proxy POST
 *
 * SECURITY: User credentials are NEVER sent in the request body.
 * The server reads them from encrypted HttpOnly cookies set by
 * /api/polymarket/credentials.
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
  const authFetch = useAuthFetch();

  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size, negRisk = false } = params;

      const { clobClient, eoaAddress } = await initClobClient();

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
        const response = await clobClient.createAndPostOrder(
          orderPayload,
          { negRisk },
          OrderType.GTC
        );

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
          const msg =
            directError.response?.data?.error ||
            directError.message ||
            "Order failed";
          throw new Error(msg);
        }
      }

      // Strategy 2: Fallback — createOrder on client, POST via server proxy
      const signedOrder = await clobClient.createOrder(orderPayload, {
        negRisk,
      });

      // SECURITY: Only send signedOrder and eoaAddress.
      // User credentials are read from HttpOnly cookie on the server.
      const res = await authFetch("/api/polymarket/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedOrder,
          eoaAddress,
          // NOTE: userCreds intentionally omitted — server reads from cookie
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
        throw new Error(errorMsg);
      }

      return data.orderID || data.id || "success";
    },
    [initClobClient, authFetch]
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
