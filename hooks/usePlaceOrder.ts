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
 * Signature flow (optimal path — 1 Privy popup):
 *   1. initClobClient() → creds from memory/cookie → NO signature
 *   2. clobClient.createOrder() → signs order with ethers → 1 Privy popup
 *   3. POST /api/polymarket/order → server proxies to CLOB → no popup
 *
 * If creds are missing (first time or expired):
 *   1. initClobClient() → getOrCreateCreds() → createOrDeriveApiKey → 1 Privy popup
 *   2. clobClient.createOrder() → 1 Privy popup
 *   Total: 2 popups (unavoidable on first trade)
 *
 * On 401 "Invalid api key":
 *   - Creds are invalidated (memory + cookie cleared)
 *   - User gets a clear error message to retry
 *   - Next attempt will create fresh creds (2 popups)
 *   - We do NOT auto-retry because that would cause 2 MORE popups silently
 */
export const usePlaceOrder = () => {
  const { initClobClient } = useClobClient();
  const authFetch = useAuthFetch();
  const { invalidateCreds } = useUserApiCredentials();

  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size, negRisk = false } = params;

      // ── 1. Initialize client (uses cached creds if available) ──
      const { clobClient, eoaAddress } = await initClobClient(false);

      // ── 2. Create & sign order (1 Privy popup) ──
      const signedOrder = await clobClient.createOrder(
        {
          tokenID: tokenId,
          price,
          size,
          side,
        },
        {
          negRisk,
          tickSize: (negRisk ? "0.001" : "0.01") as any,
        }
      );

      // ── 3. Send to server proxy ──
      const res = await authFetch("/api/polymarket/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedOrder, eoaAddress }),
      });

      // ── 4. Parse response ──
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

      // ── 5. Handle errors ──
      if (!res.ok) {
        const errorMsg = data.details || data.error || `Order failed: HTTP ${res.status}`;
        const isCredsInvalid =
          data.code === "INVALID_CREDS" ||
          errorMsg.includes("Invalid api key") ||
          errorMsg.includes("Invalid API credentials");

        if (isCredsInvalid) {
          // Clear stale creds so next attempt creates fresh ones
          console.log("[PlaceOrder] Creds invalid, clearing for next attempt");
          await invalidateCreds();
          throw new Error(
            "Trading credentials expired. Please try again — " +
            "you'll need to approve one signature to refresh them."
          );
        }

        throw new Error(errorMsg);
      }

      // ── 6. Success ──
      return data.orderID || data.id || "success";
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