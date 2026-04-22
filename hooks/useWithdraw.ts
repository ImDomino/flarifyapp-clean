"use client";

import { useState, useCallback } from "react";
import { useRelayClient } from "./useRelayClient";
import { useWallet } from "@/providers/WalletProvider";
import { useSafeDeployment } from "./useSafeDeployment";
import { CONTRACTS } from "@/lib/polymarket/contracts";
import { buildUnwrapTx, readPusdBalance, readUsdceBalance } from "@/lib/polymarket/pusd";

// ERC-20 transfer(address,uint256) selector: 0xa9059cbb
const TRANSFER_SELECTOR = "0xa9059cbb";

function validateAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function encodeTransfer(to: string, amountRaw: bigint): string {
  const paddedTo = to.slice(2).toLowerCase().padStart(64, "0");
  const paddedAmount = amountRaw.toString(16).padStart(64, "0");
  return TRANSFER_SELECTOR + paddedTo + paddedAmount;
}

function parseUSDC(amount: string): bigint {
  const parts = amount.split(".");
  const whole = parts[0] || "0";
  let frac = (parts[1] || "").slice(0, 6).padEnd(6, "0");
  return BigInt(whole) * BigInt(1000000) + BigInt(frac);
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
   * Withdraw USDC.e from Safe to any external address on Polygon.
   *
   * The Safe's balance is split between pUSD (tradable) and USDC.e (ramp input).
   * We always deliver USDC.e to the user, unwrapping pUSD on the fly if needed.
   *
   * Flow:
   *   1. Read Safe balances
   *   2. If USDC.e >= amount: single transfer tx
   *   3. Otherwise: [unwrap (amount - usdce)] + [transfer amount]
   *   4. Execute via RelayClient (gasless, Privy signs)
   */
  const withdrawUSDC = useCallback(
    async (params: WithdrawParams): Promise<WithdrawResult> => {
      const { toAddress, amount } = params;

      setIsWithdrawing(true);
      setError(null);

      try {
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

        const safeAddress = await ensureSafe();
        console.log("📤 Withdrawing from Safe:", safeAddress);

        const amountRaw = parseUSDC(amount);

        // Determine whether we need to unwrap pUSD to cover the withdrawal.
        const [pusdRaw, usdceRaw] = await Promise.all([
          readPusdBalance(safeAddress as `0x${string}`),
          readUsdceBalance(safeAddress as `0x${string}`),
        ]);

        if (usdceRaw + pusdRaw < amountRaw) {
          throw new Error(
            `Insufficient balance. Available: ${Number(usdceRaw + pusdRaw) / 1e6} USDC`
          );
        }

        const txs: Array<{ to: string; value: string; data: string }> = [];

        if (usdceRaw < amountRaw) {
          const shortfall = amountRaw - usdceRaw;
          console.log(
            `📡 Unwrapping ${Number(shortfall) / 1e6} pUSD to cover withdrawal...`
          );
          const unwrap = buildUnwrapTx(safeAddress as `0x${string}`, shortfall);
          txs.push({ to: unwrap.to, value: unwrap.value, data: unwrap.data });
        }

        txs.push({
          to: CONTRACTS.USDC_E,
          value: "0",
          data: encodeTransfer(toAddress, amountRaw),
        });

        console.log("📡 Sending withdrawal via relay...", {
          to: toAddress,
          amount,
          txCount: txs.length,
        });

        const response = await relayClient.execute(txs as any);
        const result = await response.wait();

        if (!result) {
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

        // Relayer's POST /submit no longer returns transactionHash directly
        // (changelog 2026-04-21). Poll GET /transaction for the onchain hash.
        let txHash: string | undefined = result.transactionHash;
        if (!txHash) {
          try {
            const statusArray = await relayClient.getTransaction(
              response.transactionID
            );
            txHash = statusArray[0]?.transactionHash;
          } catch {
            // non-fatal — the tx succeeded, we just couldn't fetch the hash
          }
        }

        return {
          success: true,
          transactionId: response.transactionID,
          txHash,
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
