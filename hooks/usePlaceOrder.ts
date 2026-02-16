"use client";

import { useCallback } from "react";
import { Side, OrderType } from "@polymarket/clob-client";
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
 * usePlaceOrder — hybrid approach (same as original working version):
 *
 * 1. Try createAndPostOrder() directly (works when no CORS/geo block)
 * 2. On CORS/network error → fallback to createOrder() + server proxy
 *
 * Signature count:
 *   - If creds cached: 1 popup (createOrder signs via ethers)
 *   - If creds missing: 2 popups (derive + createOrder)
 *   - NO auto-retry on 401 (would cause extra popups)
 */
export const usePlaceOrder = () => {
  const { initClobClient } = useClobClient();
  const authFetch = useAuthFetch();
  const { invalidateCreds } = useUserApiCredentials();

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

      const orderOptions = {
        negRisk,
        tickSize: (negRisk ? "0.001" : "0.01") as any,
      };

      // ── Strategy 1: Direct SDK call (no proxy needed if no geo-block) ──
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
          // Real API error — rethrow
          const msg =
            directError.response?.data?.error ||
            directError.message ||
            "Order failed";
          throw new Error(msg);
        }

        console.log("[PlaceOrder] CORS/geo blocked, falling back to proxy...");
      }

      // ── Strategy 2: Sign on client, post via server proxy ──
      const signedOrder = await clobClient.createOrder(orderPayload, orderOptions);

      const res = await authFetch("/api/polymarket/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedOrder, eoaAddress }),
      });

      const rawText = await res.text();
      let data: any;

      try {
        data = JSON.parse(rawText);
      } catch {
        const isCloudflare = rawText.includes("Cloudflare") || rawText.includes("blocked");
        data = {
          error: isCloudflare
            ? "Blocked by Cloudflare geo-restriction. Try using a VPN."
            : rawText.slice(0, 300) || `HTTP ${res.status}`,
        };
      }

      if (!res.ok) {
        const errorMsg = data.details || data.error || `Order failed: HTTP ${res.status}`;

        // If creds are invalid, clear them (next attempt will re-derive)
        if (
          data.code === "INVALID_CREDS" ||
          data.code === "CREDS_MISSING" ||
          errorMsg.includes("Invalid api key")
        ) {
          await invalidateCreds();
          throw new Error(
            "Trading credentials expired. Please try again."
          );
        }

        throw new Error(errorMsg);
      }

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