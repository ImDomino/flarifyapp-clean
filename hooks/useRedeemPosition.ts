"use client";

import { useState, useCallback } from "react";
import { useRelayClient } from "./useRelayClient";
import { createRedeemTx, getConditionId } from "@/utils/redeem";
import { UserPosition } from "./usePositions";

/**
 * Hook: useRedeemPosition
 *
 * Redeems resolved positions via Polymarket RelayClient.
 * Flow:
 * 1. Fetch conditionId from Gamma API using asset_id
 * 2. Build redeemPositions transaction
 * 3. Execute via RelayClient (gasless, through Safe)
 *
 * PnL is tracked via Polymarket's /closed-positions API —
 * no need to save locally.
 */
export function useRedeemPosition() {
  const relayClient = useRelayClient();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeemPosition = useCallback(
    async (position: UserPosition): Promise<boolean> => {
      if (!relayClient) {
        setError("Relay client not initialized. Please connect your wallet.");
        return false;
      }

      setIsRedeeming(true);
      setError(null);

      try {
        // Step 1: Get conditionId from Gamma API
        const marketInfo = await getConditionId(position.asset_id);

        if (!marketInfo || !marketInfo.conditionId) {
          throw new Error("Could not find market data for this position.");
        }

        // Step 2: Build the redeem transaction
        const negRisk = position.negRisk !== undefined ? position.negRisk : marketInfo.negRisk;
        const redeemTx = createRedeemTx({
          conditionId: marketInfo.conditionId,
          negRisk,
        });

        // Step 3: Execute via RelayClient
        const response = await relayClient.execute(
          [redeemTx],
          `Redeem position for condition ${marketInfo.conditionId.slice(0, 12)}...`
        );

        await response.wait();
        return true;
      } catch (err: any) {
        const message = err?.message || "Failed to redeem position";
        console.error("[Redeem] Error:", message);
        setError(message);
        return false;
      } finally {
        setIsRedeeming(false);
      }
    },
    [relayClient]
  );

  return { isRedeeming, error, redeemPosition };
}