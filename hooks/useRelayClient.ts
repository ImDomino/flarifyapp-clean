"use client";

import { useMemo } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";

/**
 * Hook: useRelayClient
 *
 * RelayClient handles gasless Safe transactions (deployment, approvals,
 * redeems, wraps, unwraps).
 *
 * NOTE: V2 removed builder-HMAC headers from the CLOB Exchange *order* API
 * (builder attribution moved into the signed order struct). But the Relayer
 * service at relayer-v2.polymarket.com is separate — it still authenticates
 * via HMAC signatures computed from POLY_BUILDER_* credentials. The signing
 * happens server-side at /api/polymarket/sign so builder secrets never
 * touch the browser.
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

    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: { url: builderSignUrl },
    });

    const client = new RelayClient(
      "https://relayer-v2.polymarket.com/",
      137,
      ethersSigner as any,
      builderConfig
    );

    return client;
  }, [ethersSigner]);

  return relayClient;
};
