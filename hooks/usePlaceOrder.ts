"use client";

import { useCallback, useRef } from "react";
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

export const usePlaceOrder = () => {
  const { initClobClient } = useClobClient();
  const authFetch = useAuthFetch();
  const { invalidateCreds } = useUserApiCredentials();
  const retryCountRef = useRef(0);

  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size, negRisk = false } = params;

      const attemptOrder = async (isRetry: boolean): Promise<string> => {
        const { clobClient, eoaAddress } = await initClobClient(isRetry);

        const orderPayload = {
          tokenID: tokenId,
          price,
          size,
          side,
        };

        const orderOptions = {
          negRisk,
          tickSize: (negRisk ? "0.001" : "0.01") as any,
        };

        const signedOrder = await clobClient.createOrder(
          orderPayload,
          orderOptions
        );

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
          if (res.status === 401 && !isRetry) {
            console.log(
              "[usePlaceOrder] Proxy 401, invalidating creds and retrying..."
            );
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
