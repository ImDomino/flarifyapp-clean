"use client";

import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { useWallet } from "@/providers/WalletProvider";

export type UserApiCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

const LS_KEY = "polymarket_user_api_creds";

export const useUserApiCredentials = () => {
  const { ethersSigner } = useWallet();

  const getOrCreateCreds = useCallback(async (): Promise<UserApiCreds> => {
    if (!ethersSigner) throw new Error("No signer");

    // Локальное кэширование
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(LS_KEY);
      if (raw) {
        try {
          const creds = JSON.parse(raw);
          console.log('✅ Using cached L2 credentials');
          return creds;
        } catch {}
      }
    }

    console.log('📡 Creating new L2 credentials...');

    const tempClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any
    );

    let creds: UserApiCreds | null = null;

    // Пробуем derive (если уже создавали)
    const derived = await tempClient
      .deriveApiKey()
      .catch(() => null);

    if (derived?.key && derived?.secret && derived?.passphrase) {
      creds = derived as UserApiCreds;
      console.log('✅ Derived existing L2 credentials');
    } else {
      // Создаём новые
      creds = (await tempClient.createApiKey()) as UserApiCreds;
      console.log('✅ Created new L2 credentials');
    }

    // Сохраняем в localStorage
    if (typeof window !== "undefined" && creds) {
      window.localStorage.setItem(LS_KEY, JSON.stringify(creds));
    }

    return creds!;
  }, [ethersSigner]);

  return { getOrCreateCreds };
};
