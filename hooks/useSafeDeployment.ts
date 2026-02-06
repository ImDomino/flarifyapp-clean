"use client";

import { useCallback } from "react";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";
import { useWallet } from "@/providers/WalletProvider";
import { useRelayClient } from "./useRelayClient";

/**
 * Hook: useSafeDeployment
 *
 * Reference: Section 4 — Safe Deployment
 *
 * Safe address is deterministically derived from the user's Privy EOA.
 * Same EOA always gets the same Safe address.
 * One-time deployment per EOA on user's first login.
 * Privy handles the signature request.
 */
export const useSafeDeployment = () => {
  const { eoaAddress } = useWallet();
  const relayClient = useRelayClient();

  /**
   * Derive the Safe address (no deployment, no network call)
   */
  const getSafeAddress = useCallback((): string | null => {
    if (!eoaAddress) return null;
    const config = getContractConfig(137);
    return deriveSafe(
      eoaAddress as `0x${string}`,
      config.SafeContracts.SafeFactory
    );
  }, [eoaAddress]);

  /**
   * Ensure Safe is deployed. Returns the Safe address.
   *
   * Steps (from reference):
   * 1. Derive Safe address (deterministic from EOA)
   * 2. Check if Safe is deployed via relayClient.getDeployed()
   * 3. Deploy via relayClient.deploy() if needed (Privy handles signature)
   */
  const ensureSafe = useCallback(async (): Promise<string> => {
    if (!eoaAddress) throw new Error("No EOA address available");
    if (!relayClient) throw new Error("RelayClient not initialized");

    // Step 1: Derive Safe address
    const config = getContractConfig(137);
    const safeAddress = deriveSafe(
      eoaAddress as `0x${string}`,
      config.SafeContracts.SafeFactory
    );

    // Step 2: Check if already deployed
    const deployed = await relayClient.getDeployed(safeAddress);
    if (deployed) {
      return safeAddress;
    }

    // Step 3: Deploy
    console.log("📡 Deploying Safe for EOA:", eoaAddress);
    try {
      const response = await relayClient.deploy();
      const result = await response.wait();

      if (!result) {
        // Fallback: check transaction status directly
        const statusArray = await relayClient.getTransaction(response.transactionID);
        const status = statusArray[0];

        if (status?.state === "CONFIRMED" || status?.state === "COMPLETED") {
          console.log("✅ Safe deployed at:", safeAddress);
          return safeAddress;
        }

        // Parse error from metadata if available
        let errorMsg = "Failed to deploy Safe";
        if (status?.metadata) {
          try {
            const metadata =
              typeof status.metadata === "string"
                ? JSON.parse(status.metadata)
                : status.metadata;
            errorMsg = metadata.error || metadata.message || errorMsg;
          } catch {
            // ignore parse error
          }
        }
        throw new Error(`${errorMsg} (State: ${status?.state || "UNKNOWN"})`);
      }

      console.log("✅ Safe deployed at:", result.proxyAddress);
      return safeAddress;
    } catch (error: any) {
      // Handle known error cases
      if (error.message?.includes("already deployed")) {
        return safeAddress;
      }
      if (error.message?.includes("user rejected")) {
        throw new Error("Safe deployment was rejected by user");
      }
      throw new Error(`Failed to deploy Safe: ${error.message}`);
    }
  }, [eoaAddress, relayClient]);

  return { ensureSafe, getSafeAddress };
};
