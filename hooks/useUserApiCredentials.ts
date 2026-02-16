"use client";

import { useCallback, useRef } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { useWallet } from "@/providers/WalletProvider";
import { useAuthFetch } from "./useAuthFetch";

export type UserApiCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

/**
 * In-memory cache — survives re-renders, cleared on page reload.
 * On reload, HttpOnly cookie is the source of truth.
 */
let memoryCache: { eoa: string; creds: UserApiCreds } | null = null;

export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const authFetch = useAuthFetch();
  const pendingRef = useRef<Promise<UserApiCreds> | null>(null);

  const invalidateCreds = useCallback(async () => {
    console.log("[Creds] Invalidating");
    memoryCache = null;
    try {
      await authFetch("/api/polymarket/credentials", { method: "DELETE" });
    } catch {}
  }, [authFetch]);

  const getOrCreateCreds = useCallback(
    async (forceCreate = false): Promise<UserApiCreds> => {
      if (!ethersSigner || !eoaAddress || !safeAddress) {
        throw new Error("Wallet not ready");
      }

      // 1. Memory cache (instant, no network, no signature)
      if (!forceCreate && memoryCache && memoryCache.eoa === eoaAddress) {
        return memoryCache.creds;
      }

      // Dedup concurrent calls
      if (pendingRef.current) return pendingRef.current;

      const doGet = async (): Promise<UserApiCreds> => {
        // 2. HttpOnly cookie (no signature, 1 network call)
        if (!forceCreate) {
          try {
            const res = await authFetch("/api/polymarket/credentials/retrieve");
            if (res.ok) {
              const data = await res.json();
              if (data.key && data.secret && data.passphrase) {
                const creds: UserApiCreds = { key: data.key, secret: data.secret, passphrase: data.passphrase };
                memoryCache = { eoa: eoaAddress, creds };
                console.log("[Creds] From cookie:", creds.key.slice(0, 8) + "...");
                return creds;
              }
            }
          } catch {}
        }

        // 3. Derive or create — ONE Privy signature
        console.log("[Creds] Creating via L1 client...");

        const tempClient = new ClobClient(
          "https://clob.polymarket.com",
          137,
          ethersSigner as any
        );

        let creds: UserApiCreds | null = null;

        // Step A: Try derive first (returning users — no new key created)
        try {
          const derived = await tempClient.deriveApiKey();
          if (derived?.key && derived?.secret && derived?.passphrase) {
            creds = derived as UserApiCreds;
            console.log("[Creds] Derived existing:", creds.key.slice(0, 8) + "...");
          }
        } catch {
          console.log("[Creds] Derive failed (new user or no key yet)");
        }

        // Step B: Create new if derive didn't work
        if (!creds) {
          try {
            creds = (await tempClient.createApiKey()) as UserApiCreds;
            console.log("[Creds] Created new:", creds?.key?.slice(0, 8) + "...");
          } catch {
            // Step C: Last resort
            creds = (await tempClient.createOrDeriveApiKey()) as UserApiCreds;
            console.log("[Creds] createOrDeriveApiKey:", creds?.key?.slice(0, 8) + "...");
          }
        }

        if (!creds?.key || !creds?.secret || !creds?.passphrase) {
          throw new Error("Failed to obtain trading credentials");
        }

        // Cache in memory
        memoryCache = { eoa: eoaAddress, creds };

        // Persist to HttpOnly cookie
        try {
          await authFetch("/api/polymarket/credentials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: creds.key, secret: creds.secret, passphrase: creds.passphrase }),
          });
        } catch (e) {
          console.warn("[Creds] Cookie save failed (non-critical):", e);
        }

        return creds;
      };

      pendingRef.current = doGet().finally(() => { pendingRef.current = null; });
      return pendingRef.current;
    },
    [ethersSigner, eoaAddress, safeAddress, authFetch]
  );

  const clearCreds = invalidateCreds;

  return { getOrCreateCreds, clearCreds, invalidateCreds };
};