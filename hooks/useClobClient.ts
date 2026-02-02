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
    // Это адрес, где лежат USDC и который проверяет CLOB
    let safeAddress: string | null = null;
    try {
      safeAddress = await ensureSafe();
      console.log("✅ Safe address for funder:", safeAddress);
    } catch (error) {
      console.error("⚠️ Failed to get Safe address, using EOA as funder:", error);
      safeAddress = eoaAddress; // Fallback к EOA если Safe не получилось
    }

    // ✅ ВАЖНО: Правильная конфигурация для Polymarket
    // 
    // signatureType:
    // - 0 = EOA (если торгуем напрямую с EOA)
    // - 1 = Polymarket Proxy (если используем email/proxy wallet)  
    // - 2 = Safe Wallet (если используем Safe - НАШ СЛУЧАЙ)
    //
    // funder:
    // - Адрес, где лежат USDC и который CLOB будет проверять
    // - Для Safe это должен быть Safe proxy address
    // - CLOB проверит: balance(funder) >= makerAmount && allowance(funder) >= makerAmount
    const clobClient = new ClobClient(
      "https://clob.polymarket.com",
      137, // Polygon
      ethersSigner as any,
      creds, // L2 User API credentials
      2, // signatureType: 2 для Safe wallet
      safeAddress, // funder: Safe proxy address (где лежат USDC!)
      undefined,
      false,
      builderConfig
    );

    console.log("✅ CLOB client initialized with:");
    console.log("  - Signer (EOA):", eoaAddress);
    console.log("  - Funder (Safe):", safeAddress);
    console.log("  - Signature Type: 2 (Safe)");

    return { clobClient, eoaAddress, safeAddress };
  }, [ethersSigner, eoaAddress, getOrCreateCreds, ensureSafe]);

  return { initClobClient };
};
