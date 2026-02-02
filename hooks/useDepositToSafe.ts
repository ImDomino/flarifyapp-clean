"use client";

import { useCallback } from "react";
import { encodeFunctionData, parseUnits } from "viem";
import { useRelayClient } from "./useRelayClient";
import { useSafeDeployment } from "./useSafeDeployment";

const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDC_E_DECIMALS = 6;

// Полный ERC20 ABI для approve + transfer
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
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

      try {
        // Шаг 1: Убедимся что Safe развернут
        const safeAddress = await ensureSafe();
        console.log("✅ Safe address confirmed:", safeAddress);

        // Шаг 2: Конвертируем сумму в wei
        const amountWei = parseUnits(amount, USDC_E_DECIMALS);
        console.log("📋 Amount in wei:", amountWei.toString());

        // Шаг 3: APPROVE USDC.e для Safe
        console.log("🔓 Approving USDC.e for Safe...");
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [safeAddress as `0x${string}`, parseUnits("1000000", USDC_E_DECIMALS)], // 1M max
        });
        const approveTx = {
          to: USDC_E_ADDRESS as `0x${string}`,
          data: approveData,
          value: "0",
        };
        const approveResp = await relayClient.execute(
          [approveTx],
          "Approve USDC.e"
        );
        await approveResp.wait();
        console.log("✅ USDC.e approved!");

        // Шаг 4: Кодируем transfer
        const transferData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [safeAddress as `0x${string}`, amountWei],
        });

        // Шаг 5: Transfer tx
        const transferTx = {
          to: USDC_E_ADDRESS as `0x${string}`,
          data: transferData,
          value: "0",
        };

        // Шаг 6: Выполняем
        console.log("🚀 Executing deposit...");
        const depositResp = await relayClient.execute(
          [transferTx],
          "Deposit USDC.e to Safe"
        );
        console.log("🆔 TX ID:", depositResp.transactionID);

        // Можно использовать wait, но он вернёт undefined при STATE_FAILED,
        // поэтому дополнительно логируем через getTransaction.
        const resultArray = await relayClient.getTransaction(
          depositResp.transactionID
        );
        const status = resultArray[0];
        console.log("FINAL STATUS:", status);

        if (!status) {
          throw new Error("No relayer status");
        }

        if (
          status.state === "STATE_FAILED" ||
          status.state === "STATE_INVALID"
        ) {
          
          const anyStatus = status as any;
          const msg =
            anyStatus.errorMsg || `Relayer failed: ${status.state}`;
          throw new Error(msg);
        }

        if (!status.transactionHash) {
          throw new Error("No tx hash (still pending?)");
        }

        console.log("✅ Deposit successful:", {
          txHash: status.transactionHash,
          safeAddress,
          amount,
          explorerUrl: `https://polygonscan.com/tx/${status.transactionHash}`,
        });

        return {
          success: true,
          txHash: status.transactionHash,
          safeAddress,
        };
      } catch (error: any) {
        console.error("❌ Deposit error:", error);
        throw error;
      }
    },
    [relayClient, ensureSafe]
  );

  return { depositToSafe };
};
