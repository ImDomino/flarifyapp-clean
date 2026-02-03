"use client";

import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";
import { useSafeDeployment } from "./useSafeDeployment";

const BUILDER_SIGN_URL = process.env.NEXT_PUBLIC_BUILDER_SIGN_URL as string;

export const useClobClient = () => {
  const { ethersSigner, eoaAddress } = useWallet();
  const { getOrCreateCreds } = useUserApiCredentials();
  const { ensureSafe } = useSafeDeployment();

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

    // ✅ КРИТИЧНО: Получаем Safe proxy address как funder
    let safeAddress: string | null = null;
    try {
      safeAddress = await ensureSafe();
      console.log("✅ Safe address for funder:", safeAddress);
    } catch (error) {
      console.error("⚠️ Failed to get Safe address, using EOA as funder:", error);
      safeAddress = eoaAddress;
    }

    const clobClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any,
      creds,
      2, // Safe signatureType
      safeAddress,
      undefined,
      false,
      builderConfig
    );

    console.log("✅ CLOB client initialized with:");
    console.log("  - Signer (EOA):", eoaAddress);
    console.log("  - Funder (Safe):", safeAddress);
    console.log("  - Signature Type: 2 (Safe)");

    // ✅ ДОБАВЛЕНО: signerAddress для фильтрации ордеров
    const signerAddress = eoaAddress; // EOA адрес (может отличаться от safeAddress)

    return { 
      clobClient, 
      eoaAddress, 
      safeAddress,
      signerAddress // Для фильтра maker=0x01fc88...
    };
  }, [ethersSigner, eoaAddress, getOrCreateCreds, ensureSafe]);

  return { initClobClient };
};
