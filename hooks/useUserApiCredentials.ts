"use client";

import { useCallback, useRef } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { useWallet } from "@/providers/WalletProvider";

export type UserApiCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

/**
 * useUserApiCredentials
 *
 * Exactly follows Polymarket's official privy-safe-builder-example:
 * - Credentials stored in localStorage (same as their example)
 * - Derive first, then create if needed
 * - Bare ClobClient (no signatureType, no funder) for deriving
 *
 * From their README:
 *   "The example stores credentials in localStorage for convenience"
 *   "production apps should use secure httpOnly cookies or server-side session management"
 *
 * We'll use localStorage for now to get it working, can secure later.
 */

const LS_KEY = "pm_api_creds";
const LS_EOA_KEY = "pm_api_creds_eoa";

// In-memory cache for current session
let memCache: { eoa: string; creds: UserApiCreds } | null = null;

export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress } = useWallet();
  const pendingRef = useRef<Promise<UserApiCreds> | null>(null);

  const getOrCreateCreds = useCallback(
    async (forceNew = false): Promise<UserApiCreds> => {
      if (!ethersSigner || !eoaAddress) {
        throw new Error("Wallet not ready");
      }

      // 1. Memory cache (no signature, instant)
      if (!forceNew && memCache && memCache.eoa === eoaAddress) {
        console.log("[Creds] From memory");
        return memCache.creds;
      }

      // 2. localStorage cache
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

      // Dedup concurrent calls
      if (pendingRef.current) return pendingRef.current;

      const doDerive = async (): Promise<UserApiCreds> => {
        console.log("[Creds] Creating via bare ClobClient...");

        // Bare client — exactly like official example
        // No signatureType, no funder, no builderConfig
        const tempClient = new ClobClient(
          "https://clob.polymarket.com",
          137,
          ethersSigner as any
        );

        let creds: UserApiCreds | null = null;

        // Step 1: Try derive (returning users) — 1 Privy signature
        try {
          const derived = await tempClient.deriveApiKey();
          if (derived?.key && derived?.secret && derived?.passphrase) {
            creds = derived as UserApiCreds;
            console.log("[Creds] Derived existing:", creds.key.slice(0, 8) + "...");
          }
        } catch (e) {
          console.log("[Creds] Derive failed, trying create...");
        }

        // Step 2: Create new if derive didn't work — 1 Privy signature
        if (!creds) {
          try {
            creds = (await tempClient.createApiKey()) as UserApiCreds;
            console.log("[Creds] Created new:", creds?.key?.slice(0, 8) + "...");
          } catch {
            // Step 3: Last resort
            creds = (await tempClient.createOrDeriveApiKey()) as UserApiCreds;
            console.log("[Creds] createOrDeriveApiKey:", creds?.key?.slice(0, 8) + "...");
          }
        }

        if (!creds?.key || !creds?.secret || !creds?.passphrase) {
          throw new Error("Failed to obtain trading credentials");
        }

        // Save to localStorage + memory
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