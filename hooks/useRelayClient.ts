"use client";

import { useMemo } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";

/**
 * Hook: useRelayClient
 *
 * Reference: Section 3 — RelayClient Initialization
 *
 * RelayClient is used for:
 * - Safe deployment
 * - Token approvals (batch transactions)
 * - CTF operations
 *
 * Requires:
 * - User's EOA signer (from Privy via WalletProvider)
 * - Builder config for authentication (remote signing)
 */
export const useRelayClient = () => {
  const { ethersSigner } = useWallet();

  const relayClient = useMemo(() => {
    if (!ethersSigner) return null;

    const builderSignUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/polymarket/sign`
        : undefined;

    if (!builderSignUrl) {
      console.error("❌ Builder sign URL not available");
      return null;
    }

    // Builder Config with remote signing
    // Credentials stay on server, client only gets HMAC signatures
    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: builderSignUrl,
      },
    });

    const client = new RelayClient(
      "https://relayer-v2.polymarket.com/",
      137, // Polygon chain ID
      ethersSigner as any,
      builderConfig
    );

    return client;
  }, [ethersSigner]);

  return relayClient;
};
