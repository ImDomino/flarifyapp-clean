// hooks/useRelayClient.ts
"use client";

import { useMemo } from "react";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";

const BUILDER_SIGN_URL = process.env.NEXT_PUBLIC_BUILDER_SIGN_URL as string;
const RELAYER_URL = "https://relayer-v2.polymarket.com/";
const CHAIN_ID = 137;

export const useRelayClient = () => {
  const { ethersSigner } = useWallet();

  const relayClient = useMemo(() => {
    if (!ethersSigner) return null;
    if (!BUILDER_SIGN_URL) {
      console.error("NEXT_PUBLIC_BUILDER_SIGN_URL is not set");
      return null;
    }

    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: { url: BUILDER_SIGN_URL },
    });

    return new RelayClient(
      RELAYER_URL,
      CHAIN_ID,
      ethersSigner as any,
      builderConfig,
      RelayerTxType.SAFE // явно SAFE
    );
  }, [ethersSigner]);

  return relayClient;
};
