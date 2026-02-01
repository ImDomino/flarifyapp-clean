"use client";

import { useCallback } from "react";
import { parseUnits } from "viem";
import { useRelayClient } from "./useRelayClient";
import { useSafeDeployment } from "./useSafeDeployment";

const USDC_E_DECIMALS = 6;

export const useDepositToSafe = () => {
  const relayClient = useRelayClient();
  const { ensureSafe } = useSafeDeployment();

  const depositToSafe = useCallback(
    async (amount: string) => {
      if (!relayClient) {
        throw new Error("Relay client not initialized");
      }

      console.log("💸 Depositing to Safe:", { amount });

      const safeAddress = await ensureSafe();
      const amountWei = parseUnits(amount, USDC_E_DECIMALS);

      // ts-expect-error transferUsdce exists on runtime client but is missing in TS typings
      const response = await (relayClient as any).transferUsdce(
        safeAddress,
        amountWei.toString()
      );


      console.log("⏳ Waiting for transaction...");

      const receipt = await response.wait();

      console.log("✅ Deposit successful:", {
        txHash: receipt.transactionHash,
        safeAddress,
        amount,
      });

      return {
        success: true,
        txHash: receipt.transactionHash,
        safeAddress,
      };
    },
    [relayClient, ensureSafe]
  );

  return { depositToSafe };
};
