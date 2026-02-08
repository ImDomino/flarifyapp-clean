"use client";

import { useCallback } from "react";
import { Side, OrderType } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";

/**
 * Hook: usePlaceOrder
 *
 * Uses createAndPostOrder() — the official Polymarket pattern
 * from privy-safe-builder-example.
 *
 * createAndPostOrder() handles everything internally:
 * 1. Creates the order struct
 * 2. Signs it with the user's EOA (Privy handles signature)
 * 3. Generates proper HMAC headers (user + builder via builderConfig)
 * 4. POSTs to clob.polymarket.com/order
 *
 * No need for a server-side proxy for order posting!
 * The builder signing is handled by the remote sign endpoint.
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

      const { clobClient, eoaAddress } = await initClobClient();

      console.log("ORDER DEBUG:", {
        tokenId: tokenId.slice(0, 20) + "...",
        side,
        price,
        size,
        negRisk,
        eoaAddress: eoaAddress.slice(0, 10) + "...",
      });

      // Use createAndPostOrder — handles signing, HMAC, and posting
      // This is the pattern from Polymarket's official privy-safe-builder-example
      const orderPayload = {
        tokenID: tokenId,
        price,
        size,
        side,
        feeRateBps: 0,
        expiration: 0,
        taker: "0x0000000000000000000000000000000000000000",
      };

      console.log("📦 Calling createAndPostOrder...");

      const response = await clobClient.createAndPostOrder(
        orderPayload,
        { negRisk },
        OrderType.GTC
      );

      console.log("✅ Order response:", response);

      if (!response.success) {
        throw new Error(response.errorMsg || "Order failed");
      }

      return response.orderID || "success";
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