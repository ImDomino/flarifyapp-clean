// hooks/useDepositToSafe.ts
"use client";

import { useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { encodeFunctionData, parseUnits, createPublicClient, http } from "viem";
import { polygon } from "viem/chains";
import { useSafeDeployment } from "./useSafeDeployment";

const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDC_E_DECIMALS = 6;

const ERC20_ABI = [
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
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const useDepositToSafe = () => {
  const { ensureSafe } = useSafeDeployment();
  const { wallets } = useWallets();

  const depositToSafe = useCallback(
    async (amount: string) => {
      console.log("💸 Depositing to Safe:", { amount });

      try {
        // 1) Получаем кошелёк пользователя
        const wallet = wallets[0];
        if (!wallet) {
          throw new Error("No wallet connected");
        }

        const provider = await wallet.getEthereumProvider();
        const userAddress = wallet.address;

        console.log("👤 User address:", userAddress);

        // 2) Проверяем баланс USDC.e пользователя
        const publicClient = createPublicClient({
          chain: polygon,
          transport: http(),
        });

        const balance = await publicClient.readContract({
          address: USDC_E_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [userAddress as `0x${string}`],
        });

        const amountWei = parseUnits(amount, USDC_E_DECIMALS);

        console.log("💰 User USDC.e balance:", {
          balance: balance.toString(),
          required: amountWei.toString(),
          hasEnough: balance >= amountWei,
        });

        if (balance < amountWei) {
          throw new Error(
            `Insufficient USDC.e balance. You have ${(Number(balance) / 10 ** USDC_E_DECIMALS).toFixed(2)} USDC.e, need ${amount} USDC.e`
          );
        }

        // 3) Гарантируем, что Safe задеплоен
        const safeAddress = await ensureSafe();
        console.log("✅ Safe address:", safeAddress);

        // 4) Формируем транзакцию transfer от пользователя
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [safeAddress as `0x${string}`, amountWei],
        });

        const txParams = {
          from: userAddress,
          to: USDC_E_ADDRESS,
          data,
          value: "0x0",
        };

        console.log("📤 Sending transaction from user wallet...");
        console.log("Transaction params:", txParams);

        // 5) Отправляем транзакцию напрямую от пользователя
        const txHash = await provider.request({
          method: "eth_sendTransaction",
          params: [txParams],
        });

        console.log("⏳ Transaction sent, hash:", txHash);

        // 6) Ждём подтверждения
        let receipt = null;
        let attempts = 0;
        const maxAttempts = 60; // 60 секунд

        while (!receipt && attempts < maxAttempts) {
          try {
            receipt = await publicClient.getTransactionReceipt({
              hash: txHash as `0x${string}`,
            });
          } catch (e) {
            // Транзакция ещё не подтверждена
          }

          if (!receipt) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempts++;
          }
        }

        if (!receipt) {
          console.warn("⚠️ Transaction not confirmed yet, hash:", txHash);
          return {
            success: true,
            txHash,
            safeAddress,
            pending: true,
          };
        }

        if (receipt.status === "reverted") {
          throw new Error("Transaction was reverted by blockchain");
        }

        console.log("✅ Deposit successful:", {
          txHash,
          safeAddress,
          amount,
          blockNumber: receipt.blockNumber,
        });

        return {
          success: true,
          txHash,
          safeAddress,
        };
      } catch (error: any) {
        console.error("❌ Deposit error:", {
          message: error.message,
          code: error.code,
          error,
        });

        throw new Error(`Deposit failed: ${error.message || "Unknown error"}`);
      }
    },
    [wallets, ensureSafe]
  );

  return { depositToSafe };
};