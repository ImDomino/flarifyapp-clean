"use client";

import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { useWallet } from "@/providers/WalletProvider";

/**
 * Hook: useUserApiCredentials
 *
 * Reference: Section 5 — User API Credentials
 *
 * User API Credentials are obtained by creating a temporary ClobClient
 * (no credentials yet) and calling deriveApiKey() or createApiKey().
 *
 * Flow:
 * - Returning users: deriveApiKey() retrieves existing credentials
 * - First-time users: createApiKey() creates new credentials
 * - Both require user signature (EIP-712), Privy handles this
 *
 * Credentials are cached in localStorage keyed by EOA address.
 *
 * IMPORTANT (from reference):
 *   Credentials alone can view/cancel orders but NOT place new ones.
 *   Storing in localStorage is NOT recommended for production (XSS risk).
 *   Use httpOnly cookies or server-side session management instead.
 */

export type UserApiCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

const LS_CREDS_KEY = "polymarket_user_api_creds";
const LS_EOA_KEY = "polymarket_user_api_creds_eoa";

export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress } = useWallet();

  const getOrCreateCreds = useCallback(async (): Promise<UserApiCreds> => {
    if (!ethersSigner || !eoaAddress) {
      throw new Error("No signer or EOA address");
    }

    // 👇 ВРЕМЕННО: всегда очищаем кеш
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_CREDS_KEY);
      localStorage.removeItem(LS_EOA_KEY);
    }

    const tempClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any
    );

    // 👇 ВРЕМЕННО: всегда создаём новый ключ (без derive)
    const creds = (await tempClient.createApiKey()) as UserApiCreds;

    console.log("NEW USER CREDS:", creds);

    if (!creds?.key || !creds?.secret || !creds?.passphrase) {
      throw new Error("Failed to obtain valid API credentials");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(LS_CREDS_KEY, JSON.stringify(creds));
      localStorage.setItem(LS_EOA_KEY, eoaAddress);
    }

    return creds;
  }, [ethersSigner, eoaAddress]);

  const clearCreds = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_CREDS_KEY);
      localStorage.removeItem(LS_EOA_KEY);
    }
  }, []);

  return { getOrCreateCreds, clearCreds };
};
