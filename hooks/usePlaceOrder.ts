"use client";

import { useCallback } from "react";
import { OrderType } from "@polymarket/clob-client";
import { useClobClient } from "./useClobClient";

export const usePlaceOrder = () => {
  const { initClobClient } = useClobClient();

  const placeOrder = useCallback(
    async (params: {
      tokenId: string;
      side: 'BUY' | 'SELL';
      price: number;
      size: number;
    }) => {
      const { tokenId, side, price, size } = params;

      console.log('📝 Placing order:', params);

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

      const res = await clobClient.createAndPostOrder(
        order,
        { negRisk: false },
        OrderType.GTC
      );

      console.log('✅ Order placed:', res.orderID);

      return res.orderID;
    },
    [initClobClient]
  );

  return { placeOrder };
};
