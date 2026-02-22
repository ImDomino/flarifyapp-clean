"use client";

import { useState, useCallback } from "react";
import { useRelayClient } from "./useRelayClient";
import { useAuthFetch } from "./useAuthFetch";
import { createRedeemTx, getConditionId } from "@/utils/redeem";
import { UserPosition } from "./usePositions";

/**
 * Hook: useRedeemPosition
 * 
 * Redeems resolved positions via Polymarket RelayClient.
 * Flow:
 * 1. Save position PnL to our DB (before it disappears from Polymarket API)
 * 2. Fetch conditionId from Gamma API using asset_id
 * 3. Build redeemPositions transaction
 * 4. Execute via RelayClient (gasless, through Safe)
 */
export function useRedeemPosition() {
  const relayClient = useRelayClient();
  const authFetch = useAuthFetch();
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
        console.log("[Redeem] Fetching conditionId for asset:", position.asset_id.slice(0, 16) + "...");
        const marketInfo = await getConditionId(position.asset_id);

        if (!marketInfo || !marketInfo.conditionId) {
          throw new Error("Could not find market data for this position.");
        }

        console.log("[Redeem] conditionId:", marketInfo.conditionId.slice(0, 16) + "...", "negRisk:", marketInfo.negRisk);

        // Step 2: Save PnL to our DB before redeem (position disappears from Polymarket API after)
        try {
          await authFetch("/api/redeemed-positions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              asset_id: position.asset_id,
              condition_id: marketInfo.conditionId,
              question: position.question,
              outcome: position.outcome,
              size: position.size,
              avg_price: position.avgPrice,
              cash_pnl: position.cashPnl,
              percent_pnl: position.percentPnl,
              current_value: position.currentValue,
            }),
          });
          console.log("[Redeem] PnL saved to DB");
        } catch (saveErr) {
          console.warn("[Redeem] Failed to save PnL (non-critical):", saveErr);
          // Continue with redeem even if save fails
        }

        // Step 3: Build the redeem transaction
        const negRisk = position.negRisk !== undefined ? position.negRisk : marketInfo.negRisk;
        const redeemTx = createRedeemTx({
          conditionId: marketInfo.conditionId,
          negRisk,
        });

        // Step 4: Execute via RelayClient
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
    [relayClient, authFetch]
  );

  return { isRedeeming, error, redeemPosition };
}