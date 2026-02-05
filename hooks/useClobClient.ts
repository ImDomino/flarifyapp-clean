"use client";

import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";
import { useSafeDeployment } from "./useSafeDeployment";
import { useTokenApprovals } from "./useTokenApprovals";

const BUILDER_SIGN_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api/polymarket/sign`
  : process.env.NEXT_PUBLIC_BUILDER_SIGN_URL as string;

export const useClobClient = () => {
  const { ethersSigner, eoaAddress } = useWallet();
  const { getOrCreateCreds } = useUserApiCredentials();
  const { ensureSafe } = useSafeDeployment();
  const { ensureApprovals } = useTokenApprovals();

  /**
   * Инициализирует полностью настроенный CLOB клиент
   * 
   * Согласно документации, порядок:
   * 1. Получить/создать User API Credentials
   * 2. Убедиться что Safe развёрнут
   * 3. Убедиться что approvals установлены
   * 4. Создать ClobClient с правильными параметрами
   */
  const initClobClient = useCallback(async () => {
    if (!ethersSigner || !eoaAddress) {
      throw new Error("Wallet not connected");
    }

    console.log("🔧 Initializing CLOB client...");
    console.log("  EOA (signer):", eoaAddress);

    // Шаг 1: Получить User API Credentials
    console.log("📡 Step 1: Getting User API Credentials...");
    const creds = await getOrCreateCreds();
    console.log("  ✅ Got credentials, API key:", creds.key.slice(0, 10) + '...');

    // Шаг 2: Убедиться что Safe развёрнут
    console.log("📡 Step 2: Ensuring Safe is deployed...");
    const safeAddress = await ensureSafe();
    console.log("  ✅ Safe address:", safeAddress);

    // Шаг 3: Проверить и установить approvals
    console.log("📡 Step 3: Checking token approvals...");
    const approvalsOk = await ensureApprovals(safeAddress);
    if (!approvalsOk) {
      console.warn("  ⚠️ Some approvals may be missing, trading might fail");
    } else {
      console.log("  ✅ All approvals in place");
    }

    // Шаг 4: Создать Builder Config
    if (!BUILDER_SIGN_URL) {
      throw new Error("BUILDER_SIGN_URL is not configured");
    }

    console.log("📡 Step 4: Creating CLOB client with builder config...");
    
    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: BUILDER_SIGN_URL,
      },
    });

    // Шаг 5: Создать authenticated CLOB client
    // Согласно документации:
    // - signer: EOA от Privy
    // - userApiCredentials: полученные на шаге 1
    // - signatureType = 2: для EOA связанного с Gnosis Safe
    // - funder = safeAddress: Safe который держит USDC и токены
    // - builderConfig: для order attribution
    const clobClient = new ClobClient(
      "https://clob.polymarket.com",
      137, // Polygon chain ID
      ethersSigner as any,
      creds,
      2, // signatureType = 2 for EOA associated to a Gnosis Safe proxy wallet
      safeAddress, // funder address (Safe holds the funds)
      undefined, // mandatory placeholder
      false, // enableL2 mode (false for Polygon)
      builderConfig
    );

    console.log("✅ CLOB client initialized successfully!");
    console.log("  - Signer (EOA):", eoaAddress);
    console.log("  - Funder (Safe):", safeAddress);
    console.log("  - Signature Type: 2 (Safe proxy)");
    console.log("  - Builder Config: enabled");

    return { 
      clobClient, 
      eoaAddress, 
      safeAddress,
      userCreds: creds,
    };
  }, [ethersSigner, eoaAddress, getOrCreateCreds, ensureSafe, ensureApprovals]);

  return { initClobClient };
};
