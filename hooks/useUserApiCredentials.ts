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
 *
 * SECURITY: Lives only in JS heap — cleared on tab close / page reload.
 * Keyed by eoaAddress so switching accounts invalidates the cache.
 */
let memoryCache: { eoa: string; creds: UserApiCreds } | null = null;

/**
 * useUserApiCredentials — SECURE version with session caching
 *
 * Credential lifecycle:
 * 1. Check in-memory cache (fastest, no network/signature needed)
 * 2. Check server HttpOnly cookie via /api/polymarket/credentials/retrieve
 * 3. If neither exists, derive/create via Polymarket API (requires Privy sign)
 * 4. Store result in both memory cache AND server cookie
 *
 * This means Privy only prompts for signature ONCE per browser session.
 */
export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const authFetch = useAuthFetch();
  const pendingRef = useRef<Promise<UserApiCreds> | null>(null);

  /**
   * Invalidate cached credentials (memory + cookie).
   * Call this when CLOB returns 401 to force re-derive on next attempt.
   */
  const invalidateCreds = useCallback(async () => {
    memoryCache = null;
    try {
      await authFetch("/api/polymarket/credentials", { method: "DELETE" });
    } catch {
      // Silent
    }
  }, [authFetch]);

  const getOrCreateCreds = useCallback(async (): Promise<UserApiCreds> => {
    if (!ethersSigner || !eoaAddress || !safeAddress) {
      throw new Error("No signer, EOA, or Safe address");
    }

    // ── 1. In-memory cache (same tab, no network) ──
    if (memoryCache && memoryCache.eoa === eoaAddress) {
      return memoryCache.creds;
    }

    // ── Dedup: if another call is already in-flight, wait for it ──
    if (pendingRef.current) {
      return pendingRef.current;
    }

    const doGetCreds = async (): Promise<UserApiCreds> => {
      // ── 2. Try to retrieve from server HttpOnly cookie ──
      //    (covers page reload — cookie persists, memory doesn't)
      try {
        const retrieveRes = await authFetch("/api/polymarket/credentials/retrieve");
        if (retrieveRes.ok) {
          const data = await retrieveRes.json();
          if (data.key && data.secret && data.passphrase) {
            const creds: UserApiCreds = {
              key: data.key,
              secret: data.secret,
              passphrase: data.passphrase,
            };
            // Trust cookie creds — they were valid when stored.
            // If CLOB rejects them later (401), caller should use invalidateCreds().
            memoryCache = { eoa: eoaAddress, creds };
            return creds;
          }
        }
      } catch {
        // Cookie doesn't exist or is invalid — fall through to derive
      }

      // ── 3. Derive or create via Polymarket API (requires Privy signature) ──
      // L1 auth: signatureType and funder needed so the API key is bound
      // to the correct Safe wallet address
      const tempClient = new ClobClient(
        "https://clob.polymarket.com",
        137,
        ethersSigner as any,
        undefined, // no creds yet — this is L1 client
        2,         // signatureType: POLY_GNOSIS_SAFE
        safeAddress // funder: Safe address
      );

      let creds: UserApiCreds | null = null;

      // Try derive first (returning users — may still need 1 signature)
      try {
        const derived = await tempClient.deriveApiKey();
        if (derived?.key && derived?.secret && derived?.passphrase) {
          creds = derived as UserApiCreds;
        }
      } catch {
        // New user or creds not created yet
      }

      // If derive failed, create new
      if (!creds) {
        try {
          creds = (await tempClient.createApiKey()) as UserApiCreds;
        } catch {
          creds = (await tempClient.createOrDeriveApiKey()) as UserApiCreds;
        }
      }

      if (!creds || !creds.key || !creds.secret || !creds.passphrase) {
        throw new Error("Failed to obtain valid L2 credentials");
      }

      // ── 4. Store in both memory cache AND server cookie ──
      memoryCache = { eoa: eoaAddress, creds };

      try {
        await authFetch("/api/polymarket/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: creds.key,
            secret: creds.secret,
            passphrase: creds.passphrase,
          }),
        });
      } catch {
        // Non-critical: trading still works this session via memory cache
      }

      return creds;
    };

    // Set the pending promise so concurrent callers share the same work
    pendingRef.current = doGetCreds().finally(() => {
      pendingRef.current = null;
    });

    return pendingRef.current;
  }, [ethersSigner, eoaAddress, safeAddress, authFetch]);

  /**
   * Clear stored credentials everywhere (logout or error recovery)
   */
  const clearCreds = useCallback(async () => {
    memoryCache = null;
    try {
      await authFetch("/api/polymarket/credentials", { method: "DELETE" });
    } catch {
      // Silent
    }
  }, [authFetch]);

  return { getOrCreateCreds, clearCreds, invalidateCreds };
};