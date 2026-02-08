"use client";

import { useState, useCallback } from "react";
import { useRelayClient } from "./useRelayClient";
import { useWallet } from "@/providers/WalletProvider";
import { useSafeDeployment } from "./useSafeDeployment";
// USDC.e on Polygon
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

// ERC-20 transfer(address,uint256) selector: 0xa9059cbb
const TRANSFER_SELECTOR = "0xa9059cbb";

/** Validate an Ethereum address */
function validateAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

/** Encode ERC-20 transfer(address, uint256) calldata without ethers */
function encodeTransfer(to: string, amountRaw: bigint): string {
  // Pad address to 32 bytes (remove 0x, left-pad to 64 hex chars)
  const paddedTo = to.slice(2).toLowerCase().padStart(64, "0");
  // Pad uint256 amount to 32 bytes
  const paddedAmount = amountRaw.toString(16).padStart(64, "0");
  return TRANSFER_SELECTOR + paddedTo + paddedAmount;
}

/** Parse human-readable amount to USDC raw (6 decimals) */
function parseUSDC(amount: string): bigint {
  const parts = amount.split(".");
  const whole = parts[0] || "0";
  let frac = (parts[1] || "").slice(0, 6).padEnd(6, "0");
  return BigInt(whole) * 1000000n + BigInt(frac);
}

export interface WithdrawParams {
  toAddress: string;
  amount: string; // Human-readable (e.g. "10.50")
}

export interface WithdrawResult {
  success: boolean;
  transactionId?: string;
  txHash?: string;
  error?: string;
}

export const useWithdraw = () => {
  const relayClient = useRelayClient();
  const { eoaAddress } = useWallet();
  const { ensureSafe } = useSafeDeployment();
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Withdraw USDC from Safe to any external address on Polygon.
   *
   * Flow:
   * 1. Ensure Safe is deployed
   * 2. Encode ERC-20 transfer(to, amount)
   * 3. Execute via relayClient.execute() — gasless, Privy signs
   */
  const withdrawUSDC = useCallback(
    async (params: WithdrawParams): Promise<WithdrawResult> => {
      const { toAddress, amount } = params;

      setIsWithdrawing(true);
      setError(null);

      try {
        // Validate inputs
        if (!validateAddress(toAddress)) {
          throw new Error("Invalid destination address");
        }

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          throw new Error("Invalid amount");
        }

        if (!relayClient) {
          throw new Error("Wallet not initialized. Please try again.");
        }

        if (!eoaAddress) {
          throw new Error("No wallet connected");
        }

        // Step 1: Ensure Safe is deployed
        const safeAddress = await ensureSafe();
        console.log("📤 Withdrawing from Safe:", safeAddress);

        // Step 2: Encode transfer calldata (USDC = 6 decimals)
        const amountRaw = parseUSDC(amount);
        const calldata = encodeTransfer(toAddress, amountRaw);

        // Step 3: Execute via relay (gasless Safe transaction)
        const tx = {
          to: USDC_ADDRESS,
          value: "0",
          data: calldata,
        };

        console.log("📡 Sending withdrawal tx via relay...", {
          to: toAddress,
          amount: amount,
          usdc: USDC_ADDRESS,
        });

        const response = await relayClient.execute([tx] as any);
        const result = await response.wait();

        if (!result) {
          // Check transaction status
          const statusArray = await relayClient.getTransaction(
            response.transactionID
          );
          const status = statusArray[0];

          if (
            status?.state === "CONFIRMED" ||
            status?.state === "COMPLETED"
          ) {
            console.log("✅ Withdrawal confirmed:", response.transactionID);
            return {
              success: true,
              transactionId: response.transactionID,
              txHash: status?.transactionHash,
            };
          }

          let errorMsg = "Withdrawal transaction failed";
          if (status?.metadata) {
            try {
              const metadata =
                typeof status.metadata === "string"
                  ? JSON.parse(status.metadata)
                  : status.metadata;
              errorMsg = metadata.error || metadata.message || errorMsg;
            } catch {
              // ignore
            }
          }
          throw new Error(
            `${errorMsg} (State: ${status?.state || "UNKNOWN"})`
          );
        }

        console.log("✅ Withdrawal successful:", result);
        return {
          success: true,
          transactionId: response.transactionID,
          txHash: result.transactionHash,
        };
      } catch (err: any) {
        console.error("❌ Withdrawal error:", err);
        const msg =
          err.message?.includes("user rejected")
            ? "Transaction was rejected"
            : err.message || "Withdrawal failed";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsWithdrawing(false);
      }
    },
    [relayClient, eoaAddress, ensureSafe]
  );

  return { withdrawUSDC, isWithdrawing, error };
};
