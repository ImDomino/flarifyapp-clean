"use client";

import { useState, useCallback } from "react";
import { useRelayClient } from "./useRelayClient";
import { createRedeemTx, getConditionId } from "@/utils/redeem";

/**
 * Hook: useRedeemPosition
 * 
 * Redeems resolved positions via Polymarket RelayClient.
 * Flow:
 * 1. Fetch conditionId from Gamma API using asset_id (token ID)
 * 2. Build redeemPositions transaction
 * 3. Execute via RelayClient (gasless, through Safe)
 */
export function useRedeemPosition() {
  const relayClient = useRelayClient();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeemPosition = useCallback(
    async (assetId: string, knownNegRisk?: boolean): Promise<boolean> => {
      if (!relayClient) {
        setError("Relay client not initialized. Please connect your wallet.");
        return false;
      }

      setIsRedeeming(true);
      setError(null);

      try {
        // Step 1: Get conditionId from Gamma API
        console.log("[Redeem] Fetching conditionId for asset:", assetId.slice(0, 16) + "...");
        const marketInfo = await getConditionId(assetId);

        if (!marketInfo || !marketInfo.conditionId) {
          throw new Error("Could not find market data for this position. The market may not be available.");
        }

        console.log("[Redeem] conditionId:", marketInfo.conditionId.slice(0, 16) + "...", "negRisk:", marketInfo.negRisk);

        // Step 2: Build the redeem transaction
        const negRisk = knownNegRisk !== undefined ? knownNegRisk : marketInfo.negRisk;
        const redeemTx = createRedeemTx({
          conditionId: marketInfo.conditionId,
          negRisk,
        });

        // Step 3: Execute via RelayClient
        console.log("[Redeem] Executing redeem via relay...");
        const response = await relayClient.execute(
          [redeemTx],
          `Redeem position for condition ${marketInfo.conditionId.slice(0, 12)}...`
        );

        console.log("[Redeem] Waiting for confirmation...");
        await response.wait();
        
        console.log("[Redeem] Success!");
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