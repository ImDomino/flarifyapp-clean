"use client";

import { useMemo } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";

const BUILDER_SIGN_URL = process.env.NEXT_PUBLIC_BUILDER_SIGN_URL as string;

export const useRelayClient = () => {
  const { ethersSigner } = useWallet();

  const relayClient = useMemo(() => {
    if (!ethersSigner) return null;
    if (!BUILDER_SIGN_URL) {
      console.error("NEXT_PUBLIC_BUILDER_SIGN_URL is not set");
      return null;
    }

    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: BUILDER_SIGN_URL,
      },
    });

    console.log("🔧 Initializing Relay client with", BUILDER_SIGN_URL);

    return new RelayClient(
      "https://relayer-v2.polymarket.com/",
      137,
      ethersSigner as any,
      builderConfig
    );
  }, [ethersSigner]);

  return relayClient;
};
