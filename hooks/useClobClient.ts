"use client";

import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";

const BUILDER_SIGN_URL =
  process.env.NEXT_PUBLIC_BUILDER_SIGN_URL ??
  "https://prototype1231.vercel.app/api/polymarket/sign";

export const useClobClient = () => {
  const { ethersSigner, eoaAddress } = useWallet();
  const { getOrCreateCreds } = useUserApiCredentials();

  const initClobClient = useCallback(async () => {
    if (!ethersSigner || !eoaAddress) {
      throw new Error("No signer or address");
    }

    console.log("🔧 Initializing CLOB client...");

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
      0,          // signatureType = 0 (EOA)
      eoaAddress, // funder = user's wallet
      undefined,
      false,
      builderConfig
    );

    console.log("✅ CLOB client initialized");

    return { clobClient, eoaAddress };
  }, [ethersSigner, eoaAddress, getOrCreateCreds]);

  return { initClobClient };
};
