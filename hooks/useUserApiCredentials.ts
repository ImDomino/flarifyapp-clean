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
 * Module-level in-memory cache.
 * Keyed by eoaAddress so switching accounts invalidates the cache.
 */
let memoryCache: { eoa: string; creds: UserApiCreds } | null = null;

/**
 * useUserApiCredentials — Manages CLOB API credentials
 *
 * Based on Polymarket's privy-safe-builder-example:
 * 1. Check in-memory cache
 * 2. Check server HttpOnly cookie
 * 3. createOrDeriveApiKey() via L1 auth (requires 1 Privy signature)
 * 4. Store in memory + cookie
 */
export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const authFetch = useAuthFetch();
  const pendingRef = useRef<Promise<UserApiCreds> | null>(null);

  const invalidateCreds = useCallback(async () => {
    memoryCache = null;
    try {
      await authFetch("/api/polymarket/credentials", { method: "DELETE" });
    } catch {}
  }, [authFetch]);

  const getOrCreateCreds = useCallback(async (forceCreate = false): Promise<UserApiCreds> => {
    if (!ethersSigner || !eoaAddress || !safeAddress) {
      throw new Error("No signer, EOA, or Safe address");
    }

    // 1. In-memory cache
    if (!forceCreate && memoryCache && memoryCache.eoa === eoaAddress) {
      return memoryCache.creds;
    }

    // Dedup concurrent calls
    if (pendingRef.current) return pendingRef.current;

    const doGetCreds = async (): Promise<UserApiCreds> => {
      // 2. Try cookie (skip if forceCreate)
      if (!forceCreate) {
        try {
          const res = await authFetch("/api/polymarket/credentials/retrieve");
          if (res.ok) {
            const data = await res.json();
            if (data.key && data.secret && data.passphrase) {
              // One-time migration: block known broken keys created with
              // incorrect L1 auth parameters (signatureType in tempClient)
              const BROKEN_KEYS = [
                "0763d980-fad7-f82f-58fc-07ce89a03a53",
                "0cfa7884-5fde-092f-ddea-63a6770c358e",
              ];
              if (BROKEN_KEYS.includes(data.key)) {
                console.warn("[Creds] Found known broken key, forcing re-creation...");
                try {
                  await authFetch("/api/polymarket/credentials", { method: "DELETE" });
                } catch {}
                // Fall through to create fresh
              } else {
                const creds: UserApiCreds = { key: data.key, secret: data.secret, passphrase: data.passphrase };
                memoryCache = { eoa: eoaAddress, creds };
                console.log("[Creds] Restored from cookie:", creds.key.slice(0, 8) + "...");
                return creds;
              }
            }
          }
        } catch {}
      }

      // 3. L1 client — createOrDeriveApiKey
      // IMPORTANT: For deriving/creating API keys, use L1 client WITHOUT
      // signatureType and funder. This matches Polymarket's privy-safe-builder-example.
      // signatureType and funder are only used in L2 client (for order signing).
      const l1Client = new ClobClient(
        "https://clob.polymarket.com",
        137,
        ethersSigner as any
        // NO creds, NO signatureType, NO funder for L1 auth
      );

      let creds: UserApiCreds | null = null;

      if (forceCreate) {
        // Force: try to delete old key first, then create new
        try {
          const oldCreds = await l1Client.deriveApiKey();
          if (oldCreds?.key) {
            console.log("[Creds] Derived old key:", oldCreds.key.slice(0, 8) + "..., deleting...");
            const delClient = new ClobClient(
              "https://clob.polymarket.com", 137, ethersSigner as any, oldCreds
            );
            await delClient.deleteApiKey();
            console.log("[Creds] Old key deleted");
          }
        } catch (e: any) {
          console.warn("[Creds] Could not delete old key:", e?.message);
        }

        // Create fresh
        try {
          creds = (await l1Client.createApiKey()) as UserApiCreds;
          console.log("[Creds] Created NEW key:", creds?.key?.slice(0, 8) + "...");
        } catch (e: any) {
          console.warn("[Creds] createApiKey failed:", e?.message);
          // Last resort
          creds = (await l1Client.createOrDeriveApiKey()) as UserApiCreds;
        }
      } else {
        // Normal: createOrDeriveApiKey handles both cases
        try {
          creds = (await l1Client.createOrDeriveApiKey()) as UserApiCreds;
          console.log("[Creds] createOrDeriveApiKey:", creds?.key?.slice(0, 8) + "...");
        } catch (e: any) {
          console.warn("[Creds] createOrDeriveApiKey failed:", e?.message);
          // Fallback: try create only
          creds = (await l1Client.createApiKey()) as UserApiCreds;
        }
      }

      if (!creds?.key || !creds?.secret || !creds?.passphrase) {
        throw new Error("Failed to obtain CLOB API credentials");
      }

      // 4. Store in memory + cookie
      memoryCache = { eoa: eoaAddress, creds };
      try {
        await authFetch("/api/polymarket/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: creds.key, secret: creds.secret, passphrase: creds.passphrase }),
        });
      } catch {}

      return creds;
    };

    pendingRef.current = doGetCreds().finally(() => { pendingRef.current = null; });
    return pendingRef.current;
  }, [ethersSigner, eoaAddress, safeAddress, authFetch]);

  const clearCreds = useCallback(async () => {
    memoryCache = null;
    try { await authFetch("/api/polymarket/credentials", { method: "DELETE" }); } catch {}
  }, [authFetch]);

  return { getOrCreateCreds, clearCreds, invalidateCreds };
};