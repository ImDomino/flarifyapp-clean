"use client";

import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";
import { useSafeDeployment } from "./useSafeDeployment";
import { useTokenApprovals } from "./useTokenApprovals";

/**
 * Hook: useClobClient
 *
 * Reference: Section 7 — Authenticated ClobClient
 *
 * Creates the fully authenticated ClobClient with:
 * - User API Credentials (from deriveApiKey/createApiKey)
 * - Builder Config (remote signing for order attribution)
 * - Safe address as funder
 * - signatureType = 2 (EOA associated to a Gnosis Safe proxy wallet)
 *
 * This is the persistent client used for ALL trading operations.
 *
 * Parameters explained (from reference):
 * - signer: EOA signer from Privy
 * - userApiCredentials: obtained from useUserApiCredentials
 * - signatureType = 2: type indicating EOA associated to a Gnosis Safe
 * - safeAddress: the Safe proxy wallet that holds funds
 * - builderConfig: enables order attribution
 */
export const useClobClient = () => {
  const { ethersSigner, eoaAddress } = useWallet();
  const { getOrCreateCreds } = useUserApiCredentials();
  const { ensureSafe } = useSafeDeployment();
  const { ensureApprovals } = useTokenApprovals();

  /**
   * Initialize the fully configured CLOB client.
   *
   * Order (matching reference flow):
   * 1. Get/create User API Credentials
   * 2. Ensure Safe is deployed
   * 3. Ensure token approvals are set
   * 4. Create BuilderConfig with remote signing
   * 5. Create authenticated ClobClient
   */
  const initClobClient = useCallback(async () => {
    if (!ethersSigner || !eoaAddress) {
      throw new Error("Wallet not connected");
    }

    // Step 1: User API Credentials
    const creds = await getOrCreateCreds();

    // Step 2: Ensure Safe deployed
    const safeAddress = await ensureSafe();

    // Step 3: Check/set token approvals
    const approvalsOk = await ensureApprovals(safeAddress);
    if (!approvalsOk) {
      console.warn("⚠️ Some approvals may be missing, trading might fail");
    }

    // Step 4: Builder Config (remote signing)
    const builderSignUrl = `${window.location.origin}/api/polymarket/sign`;

    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: builderSignUrl,
      },
    });

    // Step 5: Authenticated ClobClient (reference Section 7)
    // Match the pattern from Polymarket's privy-safe-builder-example
    const clobClient = new ClobClient(
      "https://clob.polymarket.com",
      137, // Polygon chain ID
      ethersSigner as any, // signer: EOA from Privy
      creds, // userApiCredentials: { key, secret, passphrase }
      2, // signatureType = 2 for EOA associated to a Gnosis Safe
      safeAddress, // funder address (Safe holds the funds)
      undefined, // mandatory placeholder
      undefined, // enableL2 — let SDK use its default
      builderConfig // builder order attribution
    );

    return {
      clobClient,
      eoaAddress,
      safeAddress,
      userCreds: creds,
    };
  }, [ethersSigner, eoaAddress, getOrCreateCreds, ensureSafe, ensureApprovals]);

  return { initClobClient };
};