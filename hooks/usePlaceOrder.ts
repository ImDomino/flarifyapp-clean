"use client";

import { useCallback, useRef } from "react";
import { Side, OrderType } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";
import { useAuthFetch } from "./useAuthFetch";
import { useUserApiCredentials } from "./useUserApiCredentials";

/**
 * Hook: usePlaceOrder — SECURE version with 401 retry
 *
 * Hybrid approach:
 * 1. Try createAndPostOrder() directly (works when no CORS/geo block)
 * 2. On network error, fallback to createOrder() + proxy POST
 *
 * 401 RECOVERY:
 * If CLOB returns 401 "Unauthorized/Invalid api key", we invalidate
 * cached credentials (memory + cookie) and retry ONCE with fresh creds.
 * This handles cases where stored creds expired or were revoked.
 *
 * SECURITY: User credentials are NEVER sent in the request body.
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
  const { invalidateCreds } = useUserApiCredentials();
  const retryCountRef = useRef(0);

  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size, negRisk = false } = params;

      const attemptOrder = async (isRetry: boolean): Promise<string> => {
        // If retry, force fresh creds by re-initializing
        const { clobClient, eoaAddress } = await initClobClient(isRetry);

        // Simple order payload — let SDK handle feeRateBps, expiration, taker
        const orderPayload = {
          tokenID: tokenId,
          price,
          size,
          side,
        };

        // Options must include negRisk and tickSize
        // Most markets use "0.01", neg risk markets may use "0.001"
        const orderOptions = {
          negRisk,
          tickSize: negRisk ? "0.001" : "0.01",
        };

        // Strategy 1: Try direct createAndPostOrder
        try {
          const response = await clobClient.createAndPostOrder(
            orderPayload,
            orderOptions,
            OrderType.GTC
          );

          if (response?.error === "Network Error" || response?.status === 0) {
            throw new Error("CORS_BLOCKED");
          }

          if (response.success === false) {
            const errMsg = response.errorMsg || "";
            // Check for 401/auth errors
            if (
              errMsg.includes("Unauthorized") ||
              errMsg.includes("Invalid api key") ||
              errMsg.includes("401")
            ) {
              throw new Error("AUTH_FAILED");
            }
            throw new Error(errMsg || "Order failed");
          }

          return response.orderID || "success";
        } catch (directError: any) {
          // Check if it's a 401 auth error from CLOB
          const isAuthError =
            directError.message === "AUTH_FAILED" ||
            directError.response?.status === 401 ||
            directError.response?.data?.error?.includes("Unauthorized") ||
            directError.response?.data?.error?.includes("Invalid api key") ||
            directError.message?.includes("Unauthorized") ||
            directError.message?.includes("Invalid api key");

          if (isAuthError && !isRetry) {
            // Invalidate and retry once
            console.log("[usePlaceOrder] 401 detected, invalidating creds and retrying...");
            await invalidateCreds();
            return attemptOrder(true);
          }

          if (isAuthError && isRetry) {
            throw new Error(
              "Authentication failed. Please try logging out and back in, then trade again."
            );
          }

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
        const signedOrder = await clobClient.createOrder(orderPayload, orderOptions);

        const res = await authFetch("/api/polymarket/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signedOrder,
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
          // Check if proxy also got 401
          if (res.status === 401 && !isRetry) {
            console.log("[usePlaceOrder] Proxy 401, invalidating creds and retrying...");
            await invalidateCreds();
            return attemptOrder(true);
          }

          const errorMsg =
            data.details || data.error || `Order failed: HTTP ${res.status}`;
          throw new Error(errorMsg);
        }

        return data.orderID || data.id || "success";
      };

      return attemptOrder(false);
    },
    [initClobClient, authFetch, invalidateCreds]
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