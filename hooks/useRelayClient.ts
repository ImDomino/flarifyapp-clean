"use client";

import { useMemo } from "react";
import { RelayClient } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";

/**
 * Хук для инициализации RelayClient
 * 
 * RelayClient используется для:
 * - Деплоя Safe
 * - Установки token approvals (batch transactions)
 * - CTF операций
 * 
 * Требует builder credentials для аутентификации
 */
export const useRelayClient = () => {
  const { ethersSigner } = useWallet();

  const relayClient = useMemo(() => {
    if (!ethersSigner) {
      return null;
    }

    // Builder sign URL (server-side endpoint)
    const builderSignUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/api/polymarket/sign`
      : process.env.NEXT_PUBLIC_BUILDER_SIGN_URL;

    if (!builderSignUrl) {
      console.error("❌ Builder sign URL is not configured");
      return null;
    }

    console.log("🔧 Initializing RelayClient with builder config...");
    console.log("  Sign URL:", builderSignUrl);

    // Builder Config с remote signing
    // Credentials хранятся на сервере, клиент только получает подписи
    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: {
        url: builderSignUrl,
      },
    });

    // Создаём RelayClient
    const client = new RelayClient(
      "https://relayer-v2.polymarket.com/", // Polymarket Relayer URL
      137, // Polygon chain ID
      ethersSigner as any,
      builderConfig
    );

    console.log("✅ RelayClient initialized");

    return client;
  }, [ethersSigner]);

  return relayClient;
};
