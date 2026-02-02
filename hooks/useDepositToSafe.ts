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


        console.log("🔓 Approving USDC.e for Safe...");
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "approve",
          args: [safeAddress as `0x${string}`, parseUnits('1000000', USDC_E_DECIMALS)],  // 1M max
        });
        const approveTx = {
          to: USDC_E_ADDRESS as `0x${string}`,
          data: approveData,
          value: "0",
        };
        const approveResp = await relayClient.execute([approveTx], "Approve USDC.e");
        await approveResp.wait();
        console.log("✅ USDC.e approved!");

        // Шаг 4: Кодируем transfer (бывший 3)
        const transferData = encodeFunctionData({
          abi: ERC20_ABI,  // Теперь полный ABI
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
        const depositResp = await relayClient.execute([transferTx], "Deposit USDC.e to Safe");
        const result = await depositResp.wait();
        console.log('🆔 TX ID:', depositResp.transactionID);

// Поллинг вместо wait()
const txId = depositResp.transactionID;
let status = await relayClient.getTransaction(txId);
console.log('FINAL STATUS:', status);
        if (!result?.transactionHash) {
          throw new Error("No tx hash");
        }

        console.log("✅ Deposit successful:", {
          txHash: result.transactionHash,
          safeAddress,
          explorerUrl: `https://polygonscan.com/tx/${result.transactionHash}`,
        });

        return { success: true, txHash: result.transactionHash, safeAddress };
      } catch (error: any) {
        console.error("❌ Deposit error:", error);
        throw error;
      }
      
    },
    
    [relayClient, ensureSafe]
  );

  


  return { depositToSafe };
};
