"use client";

import { useCallback, useRef } from "react";
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

// Cache negRisk lookups so we don't hit the API every time
const negRiskCache = new Map<string, boolean>();

/**
 * Determine negRisk for a token by querying CLOB API.
 * This is the authoritative source — never trust caller's negRisk blindly.
 */
async function resolveNegRisk(tokenId: string): Promise<boolean> {
  if (negRiskCache.has(tokenId)) {
    return negRiskCache.get(tokenId)!;
  }

  try {
    // CLOB has a dedicated neg-risk endpoint
    const res = await fetch(
      `https://clob.polymarket.com/neg-risk?token_id=${tokenId}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      const isNegRisk = data.neg_risk === true || data.negRisk === true;
      negRiskCache.set(tokenId, isNegRisk);
      console.log(`[negRisk] ${tokenId.slice(0, 16)}... = ${isNegRisk}`);
      return isNegRisk;
    }
  } catch {
    // Fallback: try Gamma API
  }

  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?clob_token_ids=${tokenId}&limit=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const markets = await res.json();
      if (Array.isArray(markets) && markets.length > 0) {
        const isNegRisk =
          markets[0].negRisk === true || markets[0].negRisk === "true";
        negRiskCache.set(tokenId, isNegRisk);
        console.log(
          `[negRisk] ${tokenId.slice(0, 16)}... = ${isNegRisk} (from Gamma)`
        );
        return isNegRisk;
      }
    }
  } catch {
    // silent
  }

  // Default false if we can't determine
  console.warn(`[negRisk] Could not determine for ${tokenId.slice(0, 16)}..., defaulting to false`);
  negRiskCache.set(tokenId, false);
  return false;
}

export const usePlaceOrder = () => {
  const { initClobClient } = useClobClient();
  const { invalidateCreds } = useUserApiCredentials();

  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size } = params;

      // ALWAYS resolve negRisk from API — don't trust caller
      const negRisk = await resolveNegRisk(tokenId);

      if (params.negRisk !== undefined && params.negRisk !== negRisk) {
        console.warn(
          `[PlaceOrder] negRisk mismatch! Caller said ${params.negRisk}, API says ${negRisk}. Using API value.`
        );
      }

      const { clobClient, userCreds, eoaAddress } = await initClobClient();

      const orderPayload = {
        tokenID: tokenId,
        price,
        size,
        side,
        feeRateBps: 1000,
        expiration: 0,
        taker: "0x0000000000000000000000000000000000000000",
      };

      // ── Strategy 1: Direct SDK call ──
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

        // Log full response
        console.log(
          "[PlaceOrder] SDK response:",
          JSON.stringify(response, null, 2)
        );

        // Check for errors in response
        if (response?.error === "Network Error" || response?.status === 0) {
          throw new Error("CORS_BLOCKED");
        }

        const errorInResponse =
          response?.data?.error || response?.error || response?.errorMsg;

        if (errorInResponse) {
          console.error("[PlaceOrder] Error in response:", errorInResponse);

          if (
            typeof errorInResponse === "string" &&
            errorInResponse.includes("invalid signature")
          ) {
            throw new Error(
              "Order signature rejected. This may be a contract mismatch — please try again or contact support."
            );
          }

          if (
            typeof errorInResponse === "string" &&
            (errorInResponse.includes("Invalid api key") ||
              errorInResponse.includes("Unauthorized"))
          ) {
            invalidateCreds();
            throw new Error("Trading credentials expired. Please try again.");
          }

          throw new Error(
            typeof errorInResponse === "string"
              ? errorInResponse
              : JSON.stringify(errorInResponse)
          );
        }

        if (response?.success === false) {
          throw new Error(response.errorMsg || "Order failed");
        }

        if (response?.status && response.status >= 400) {
          throw new Error(
            response.data?.error || response.statusText || `HTTP ${response.status}`
          );
        }

        console.log("[PlaceOrder] ✅ Success:", response?.orderID);
        return response?.orderID || "success";
      } catch (directError: any) {
        // Re-throw clean errors
        if (
          directError.message?.includes("Order signature rejected") ||
          directError.message?.includes("Trading credentials expired")
        ) {
          throw directError;
        }

        const isCorsOrNetwork =
          directError.message === "CORS_BLOCKED" ||
          directError.message?.includes("Network Error") ||
          directError.message?.includes("ERR_FAILED") ||
          directError.message?.includes("CORS") ||
          directError.response?.status === 0 ||
          directError.status === 0;

        if (!isCorsOrNetwork) {
          const errorData = directError.response?.data;
          const errorMsg =
            errorData?.error || directError.message || "Order failed";

          console.error("[PlaceOrder] Direct error:", {
            status: directError.response?.status,
            error: errorMsg,
          });

          if (
            directError.response?.status === 401 ||
            (typeof errorMsg === "string" &&
              errorMsg.includes("Invalid api key"))
          ) {
            invalidateCreds();
            throw new Error("Trading credentials expired. Please try again.");
          }

          if (
            typeof errorMsg === "string" &&
            errorMsg.includes("invalid signature")
          ) {
            throw new Error(
              "Order signature rejected. Please try again or contact support."
            );
          }

          throw new Error(
            typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg)
          );
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
        const isCloudflare =
          rawText.includes("Cloudflare") || rawText.includes("blocked");
        data = {
          error: isCloudflare
            ? "Blocked by Cloudflare geo-restriction"
            : rawText.slice(0, 300) || `HTTP ${res.status}`,
        };
      }

      if (!res.ok) {
        const errorMsg =
          data.details || data.error || `Order failed: HTTP ${res.status}`;
        if (
          errorMsg.includes("Invalid api key") ||
          errorMsg.includes("Unauthorized")
        ) {
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