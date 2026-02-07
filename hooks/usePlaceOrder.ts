"use client";

import { useCallback } from "react";
import { OrderType, Side } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";

/**
 * Hook: usePlaceOrder
 *
 * Reference: Section 8 — Placing Orders
 *
 * Key fix: negRisk is now a required parameter, not hardcoded to false.
 * Each market has a neg_risk field from the Gamma API that must be passed through.
 */

export interface PlaceOrderParams {
  tokenId: string;
  side: Side;
  price: number;
  size: number;
  negRisk: boolean; // REQUIRED — from market data (gamma API neg_risk field)
}

export const usePlaceOrder = () => {
  const { initClobClient } = useClobClient();

  /**
   * Place a BUY or SELL order.
   *
   * @param tokenId - Outcome token ID
   * @param side - Side.BUY or Side.SELL
   * @param price - Price per share (0.0–1.0)
   * @param size - Number of shares
   * @param negRisk - Whether market uses NegRisk exchange (from Gamma API)
   * @returns Order ID
   */
  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size, negRisk } = params;

      const { clobClient } = await initClobClient();

      const order = {
        tokenID: tokenId,
        price,
        size,
        side,
        feeRateBps: 0,
        expiration: 0,
        taker: "0x0000000000000000000000000000000000000000",
      };
      console.log("🔍 ORDER DEBUG:", {
        tokenId: tokenId.slice(0, 20) + "...",
        side,
        price,
        size,
        negRisk,
        negRiskType: typeof negRisk,
      });
      // CRITICAL: negRisk determines which exchange contract signs the order
      //   false → CTF Exchange (0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e)
      //   true  → NegRisk CTF Exchange (0xC5d563A36AE78145C45a50134d48A1215220f80a)
      // Wrong value = "invalid signature" error
      const res = await clobClient.createAndPostOrder(
        order,
        { negRisk },
        OrderType.GTC
      );

      return res.orderID;
    },
    [initClobClient]
  );

  const buyShares = useCallback(
    async (
      tokenId: string,
      price: number,
      size: number,
      negRisk: boolean
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
      negRisk: boolean
    ): Promise<string> => {
      return placeOrder({ tokenId, side: Side.SELL, price, size, negRisk });
    },
    [placeOrder]
  );

  return { placeOrder, buyShares, sellShares };
};
