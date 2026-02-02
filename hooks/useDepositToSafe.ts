"use client";

import { useCallback } from "react";
import { encodeFunctionData, parseUnits } from "viem";
import { useRelayClient } from "./useRelayClient";
import { useSafeDeployment } from "./useSafeDeployment";

const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDC_E_DECIMALS = 6;

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const useDepositToSafe = () => {
  const relayClient = useRelayClient();
  const { ensureSafe } = useSafeDeployment();

  const depositToSafe = useCallback(
    async (amount: string) => {
      if (!relayClient) {
        throw new Error("Relay client not initialized");
      }

      console.log("💸 Depositing to Safe via relayer:", { amount });

      const safeAddress = await ensureSafe();
      const amountWei = parseUnits(amount, USDC_E_DECIMALS);

      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [safeAddress as `0x${string}`, amountWei],
      });

      const tx = {
        to: USDC_E_ADDRESS as `0x${string}`,
        data,
        value: "0",
      };

      const response = await relayClient.execute([tx], "Deposit USDC.e to Safe");
      console.log("⏳ Waiting for transaction...");
      const result = await response.wait();

      if (!result) {
        throw new Error("Relayer returned empty result");
      }

      console.log("✅ Deposit successful:", {
        txHash: result.transactionHash,
        safeAddress,
        amount,
      });

      return {
        success: true,
        txHash: result.transactionHash,
        safeAddress,
      };
    },
    [relayClient, ensureSafe]
  );

  return { depositToSafe };
};
