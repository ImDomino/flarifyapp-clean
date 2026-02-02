"use client";

import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";

const BUILDER_SIGN_URL = process.env.NEXT_PUBLIC_BUILDER_SIGN_URL as string;

export const useClobClient = () => {
  const { ethersSigner, eoaAddress } = useWallet();
  const { getOrCreateCreds } = useUserApiCredentials();

  const initClobClient = useCallback(async () => {
    if (!ethersSigner || !eoaAddress) {
      throw new Error("No signer or address");
    }

    if (!BUILDER_SIGN_URL) {
      throw new Error("NEXT_PUBLIC_BUILDER_SIGN_URL is not set");
    }

    console.log("🔧 Initializing CLOB client with", BUILDER_SIGN_URL);

    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: BUILDER_SIGN_URL,
      },
    });

    const creds = await getOrCreateCreds();

    const clobClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any,
      creds,
      0,
      eoaAddress,
      undefined,
      false,
      builderConfig
    );

    console.log("✅ CLOB client initialized");

    return { clobClient, eoaAddress };
  }, [ethersSigner, eoaAddress, getOrCreateCreds]);

  return { initClobClient };
};
