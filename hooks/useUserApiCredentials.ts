"use client";

import { useCallback, useRef } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { useWallet } from "@/providers/WalletProvider";

export type UserApiCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

const LS_KEY = "pm_api_creds";
const LS_EOA_KEY = "pm_api_creds_eoa";

let memCache: { eoa: string; creds: UserApiCreds } | null = null;

export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress } = useWallet();
  const pendingRef = useRef<Promise<UserApiCreds> | null>(null);

  const getOrCreateCreds = useCallback(
    async (forceNew = false): Promise<UserApiCreds> => {
      if (!ethersSigner || !eoaAddress) {
        throw new Error("Wallet not ready");
      }

      // 1. Memory cache
      if (!forceNew && memCache && memCache.eoa === eoaAddress) {
        return memCache.creds;
      }

      // 2. localStorage
      if (!forceNew && typeof window !== "undefined") {
        const savedEoa = localStorage.getItem(LS_EOA_KEY);
        const savedCreds = localStorage.getItem(LS_KEY);
        if (savedEoa === eoaAddress && savedCreds) {
          try {
            const parsed = JSON.parse(savedCreds);
            if (parsed.key && parsed.secret && parsed.passphrase) {
              memCache = { eoa: eoaAddress, creds: parsed };
              console.log("[Creds] From localStorage:", parsed.key.slice(0, 8) + "...");
              return parsed;
            }
          } catch {}
        }
      }

      // Dedup
      if (pendingRef.current) return pendingRef.current;

      const doDerive = async (): Promise<UserApiCreds> => {
        console.log("[Creds] Deriving via bare ClobClient...");

        // Bare client — exactly like official privy-safe-builder-example
        const tempClient = new ClobClient(
          "https://clob.polymarket.com",
          137,
          ethersSigner as any
        );

        let creds: UserApiCreds | null = null;

        // Try derive first (returning users)
        try {
          const derived = await tempClient.deriveApiKey();
          if (derived?.key && derived?.secret && derived?.passphrase) {
            creds = derived as UserApiCreds;
            console.log("[Creds] Derived:", creds.key.slice(0, 8) + "...");
          }
        } catch {
          console.log("[Creds] Derive failed, trying create...");
        }

        // Create new if derive didn't work
        if (!creds) {
          try {
            creds = (await tempClient.createApiKey()) as UserApiCreds;
            console.log("[Creds] Created:", creds?.key?.slice(0, 8) + "...");
          } catch {
            creds = (await tempClient.createOrDeriveApiKey()) as UserApiCreds;
            console.log("[Creds] createOrDeriveApiKey:", creds?.key?.slice(0, 8) + "...");
          }
        }

        if (!creds?.key || !creds?.secret || !creds?.passphrase) {
          throw new Error("Failed to obtain trading credentials");
        }

        // Save
        memCache = { eoa: eoaAddress, creds };
        if (typeof window !== "undefined") {
          localStorage.setItem(LS_KEY, JSON.stringify(creds));
          localStorage.setItem(LS_EOA_KEY, eoaAddress);
        }

        return creds;
      };

      pendingRef.current = doDerive().finally(() => {
        pendingRef.current = null;
      });
      return pendingRef.current;
    },
    [ethersSigner, eoaAddress]
  );

  const clearCreds = useCallback(() => {
    memCache = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_EOA_KEY);
    }
    console.log("[Creds] Cleared");
  }, []);

  const invalidateCreds = clearCreds;

  return { getOrCreateCreds, clearCreds, invalidateCreds };
};