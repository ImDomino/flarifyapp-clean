"use client";

import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";

export const useClobClient = () => {
  const { ethersSigner, eoaAddress } = useWallet();
  const { getOrCreateCreds } = useUserApiCredentials();

  const initClobClient = useCallback(async () => {
    if (!ethersSigner || !eoaAddress) {
      throw new Error("No signer or address");
    }

    console.log('🔧 Initializing CLOB client...');

    // Builder configuration с remote signing
   const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: "http://prototype1231.vercel.app/api/polymarket/sign", // dev
      },
    });


    // Получаем User API credentials
    const creds = await getOrCreateCreds();

    // Создаём CLOB client
    const clobClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any,
      creds,
      0,            // signatureType = 0 (EOA)
      eoaAddress,   // funder = user's wallet
      undefined,
      false,
      builderConfig
    );

    console.log('✅ CLOB client initialized');

    return { clobClient, eoaAddress };
  }, [ethersSigner, eoaAddress, getOrCreateCreds]);

  return { initClobClient };
};


