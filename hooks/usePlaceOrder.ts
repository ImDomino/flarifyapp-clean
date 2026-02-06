"use client";

import { useCallback } from "react";
import { OrderType, Side } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";

/**
 * Hook: usePlaceOrder
 *
 * Reference: Section 8 — Placing Orders
 *
 * With the authenticated ClobClient, place orders with builder attribution.
 *
 * Key points (from reference):
 * - Orders are signed by the user's Privy EOA
 * - Executed from the Safe address (funder)
 * - Builder attribution is automatic via builderConfig
 * - Gasless execution (no gas fees for users)
 */

export interface PlaceOrderParams {
  tokenId: string;
  side: Side;
  price: number;
  size: number;
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
   * @returns Order ID
   */
  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<string> => {
      const { tokenId, side, price, size } = params;

      // Initialize CLOB client (includes Safe deploy + approvals check)
      const { clobClient } = await initClobClient();

      // Create order (reference Section 8)
      const order = {
        tokenID: tokenId,
        price,
        size,
        side,
        feeRateBps: 0,
        expiration: 0, // 0 = Good-til-Cancel
        taker: "0x0000000000000000000000000000000000000000",
      };

      // Submit order (Privy handles signature)
      // createAndPostOrder creates, signs, and posts in one call
      const res = await clobClient.createAndPostOrder(
        order,
        { negRisk: false },
        OrderType.GTC
      );

      return res.orderID;
    },
    [initClobClient]
  );

  /**
   * Buy shares of an outcome token
   */
  const buyShares = useCallback(
    async (tokenId: string, price: number, size: number): Promise<string> => {
      return placeOrder({ tokenId, side: Side.BUY, price, size });
    },
    [placeOrder]
  );

  /**
   * Sell shares of an outcome token
   */
  const sellShares = useCallback(
    async (tokenId: string, price: number, size: number): Promise<string> => {
      return placeOrder({ tokenId, side: Side.SELL, price, size });
    },
    [placeOrder]
  );

  return { placeOrder, buyShares, sellShares };
};
