"use client";

import { useMemo } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";

export const useRelayClient = () => {
  const { ethersSigner } = useWallet();

  const relayClient = useMemo(() => {
    if (!ethersSigner) return null;

    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: "http://prototype1231.vercel.app/api/polymarket/sign",
      },
    });

    console.log('🔧 Initializing Relay client...');

    return new RelayClient(
      "https://relayer-v2.polymarket.com/",
      137, // Polygon chain ID
      ethersSigner as any,
      builderConfig
    );
  }, [ethersSigner]);

  return relayClient;
};


