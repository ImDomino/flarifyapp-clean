"use client";

import { useState, useCallback } from "react";
import { parseUnits, maxUint256 } from "viem";
import { useRelayClient } from "./useRelayClient";
import { useSafeDeployment } from "./useSafeDeployment";
import {
  buildApproveTx,
  buildWrapTx,
  buildUnwrapTx,
  readUsdceBalance,
  readPusdBalance,
  readUsdceOnrampAllowance,
  readPusdOfframpAllowance,
} from "@/lib/polymarket/pusd";
import { CONTRACTS } from "@/lib/polymarket/contracts";

/**
 * Hook: useWrapCollateral
 *
 * Wraps USDC.e into pUSD (tradable on V2 exchange), or unwraps pUSD back.
 * Approvals to the Onramp/Offramp are checked on-chain and bundled with
 * the wrap/unwrap call in a single RelayClient batch.
 */
export const useWrapCollateral = () => {
  const relayClient = useRelayClient();
  const { ensureSafe } = useSafeDeployment();
  const [isWrapping, setIsWrapping] = useState(false);
  const [isUnwrapping, setIsUnwrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Wrap USDC.e → pUSD.
   * @param amount Human-readable amount (e.g. "10.5"); if omitted, wraps the entire USDC.e balance.
   */
  const wrap = useCallback(
    async (amount?: string): Promise<boolean> => {
      if (!relayClient) {
        setError("Wallet not initialized");
        return false;
      }

      setIsWrapping(true);
      setError(null);

      try {
        // Deploy the Safe on first use (counterfactual → onchain).
        const safe = (await ensureSafe()) as `0x${string}`;

        const usdceBalance = await readUsdceBalance(safe);
        const amountRaw = amount ? parseUnits(amount, 6) : usdceBalance;

        if (amountRaw === BigInt(0)) {
          throw new Error("Nothing to wrap");
        }
        if (amountRaw > usdceBalance) {
          throw new Error("Insufficient USDC.e balance");
        }

        const txs: Array<{ to: string; value: string; data: string }> = [];

        const onrampAllowance = await readUsdceOnrampAllowance(safe);
        if (onrampAllowance < amountRaw) {
          const approveTx = buildApproveTx(
            CONTRACTS.USDC_E,
            CONTRACTS.COLLATERAL_ONRAMP,
            maxUint256
          );
          txs.push({ to: approveTx.to, value: approveTx.value, data: approveTx.data });
        }

        const wrapTx = buildWrapTx(safe, amountRaw);
        txs.push({ to: wrapTx.to, value: wrapTx.value, data: wrapTx.data });

        console.log("📡 Wrapping USDC.e → pUSD", {
          amount: Number(amountRaw) / 1e6,
          txCount: txs.length,
        });

        const response = await relayClient.execute(txs as any);
        await response.wait();
        return true;
      } catch (err: any) {
        const msg = err?.message || "Failed to wrap";
        console.error("[Wrap] Error:", msg);
        setError(msg);
        return false;
      } finally {
        setIsWrapping(false);
      }
    },
    [relayClient, ensureSafe]
  );

  /**
   * Unwrap pUSD → USDC.e.
   * @param amount Human-readable amount; if omitted, unwraps the entire pUSD balance.
   */
  const unwrap = useCallback(
    async (amount?: string): Promise<boolean> => {
      if (!relayClient) {
        setError("Wallet not initialized");
        return false;
      }

      setIsUnwrapping(true);
      setError(null);

      try {
        const safe = (await ensureSafe()) as `0x${string}`;

        const pusdBalance = await readPusdBalance(safe);
        const amountRaw = amount ? parseUnits(amount, 6) : pusdBalance;

        if (amountRaw === BigInt(0)) {
          throw new Error("Nothing to unwrap");
        }
        if (amountRaw > pusdBalance) {
          throw new Error("Insufficient pUSD balance");
        }

        const txs: Array<{ to: string; value: string; data: string }> = [];

        const offrampAllowance = await readPusdOfframpAllowance(safe);
        if (offrampAllowance < amountRaw) {
          const approveTx = buildApproveTx(
            CONTRACTS.PUSD,
            CONTRACTS.COLLATERAL_OFFRAMP,
            maxUint256
          );
          txs.push({ to: approveTx.to, value: approveTx.value, data: approveTx.data });
        }

        const unwrapTx = buildUnwrapTx(safe, amountRaw);
        txs.push({ to: unwrapTx.to, value: unwrapTx.value, data: unwrapTx.data });

        console.log("📡 Unwrapping pUSD → USDC.e", {
          amount: Number(amountRaw) / 1e6,
          txCount: txs.length,
        });

        const response = await relayClient.execute(txs as any);
        await response.wait();
        return true;
      } catch (err: any) {
        const msg = err?.message || "Failed to unwrap";
        console.error("[Unwrap] Error:", msg);
        setError(msg);
        return false;
      } finally {
        setIsUnwrapping(false);
      }
    },
    [relayClient, ensureSafe]
  );

  return { wrap, unwrap, isWrapping, isUnwrapping, error };
};
