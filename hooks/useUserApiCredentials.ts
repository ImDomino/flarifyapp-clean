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
 * useUserApiCredentials — SECURE version with session caching + auto-recovery
 *
 * Credential lifecycle:
 * 1. Check in-memory cache (fastest, no network/signature needed)
 * 2. Check server HttpOnly cookie via /api/polymarket/credentials/retrieve
 * 3. If neither exists, derive/create via Polymarket API (requires Privy sign)
 * 4. Store result in both memory cache AND server cookie
 *
 * Auto-recovery: if CLOB returns 401, callers can use invalidateCreds()
 * to force re-derive on next getOrCreateCreds() call.
 */
export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const authFetch = useAuthFetch();
  const pendingRef = useRef<Promise<UserApiCreds> | null>(null);

  /**
   * Invalidate cached credentials (memory + cookie).
   * Call this when CLOB returns 401 — next getOrCreateCreds() will re-derive.
   */
  const invalidateCreds = useCallback(async () => {
    memoryCache = null;
    try {
      await authFetch("/api/polymarket/credentials", { method: "DELETE" });
    } catch {
      // Silent — cookie may already be gone
    }
  }, [authFetch]);

  /**
   * Derive fresh credentials from Polymarket (requires Privy signature).
   * Stores in both memory cache and server cookie.
   */
  const deriveFreshCreds = useCallback(
    async (): Promise<UserApiCreds> => {
      if (!ethersSigner || !eoaAddress) {
        throw new Error("No signer or EOA address");
      }

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
        }
      } catch {
        // New user or derive failed
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

      // Store in both memory cache AND server cookie
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
        // Non-critical: trading works this session via memory cache
      }

      return creds;
    },
    [ethersSigner, eoaAddress, authFetch]
  );

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

            // Validate credentials are still accepted by CLOB
            // Quick HEAD-style check against a lightweight endpoint
            const isValid = await validateCredsWithClob(creds);
            if (isValid) {
              memoryCache = { eoa: eoaAddress, creds };
              return creds;
            }

            // Credentials expired on Polymarket side — clear and re-derive
            console.warn("[creds] Cookie credentials rejected by CLOB, re-deriving...");
            memoryCache = null;
            // Don't await cookie delete — continue to derive
            authFetch("/api/polymarket/credentials", { method: "DELETE" }).catch(() => {});
          }
        }
      } catch {
        // Cookie doesn't exist or is invalid — fall through to derive
      }

      // ── 3. Derive fresh credentials (requires Privy signature) ──
      return deriveFreshCreds();
    };

    pendingRef.current = doGetCreds().finally(() => {
      pendingRef.current = null;
    });

    return pendingRef.current;
  }, [ethersSigner, eoaAddress, safeAddress, authFetch, deriveFreshCreds]);

  /**
   * Clear stored credentials everywhere (logout)
   */
  const clearCreds = useCallback(async () => {
    memoryCache = null;
    try {
      await authFetch("/api/polymarket/credentials", { method: "DELETE" });
    } catch {
      // Silent
    }
  }, [authFetch]);

  return { getOrCreateCreds, clearCreds, invalidateCreds, deriveFreshCreds };
};

/**
 * Lightweight validation: hit CLOB /data/orders with limit=0
 * to check if credentials are still accepted.
 * Returns true if valid, false if 401/expired.
 */
async function validateCredsWithClob(creds: UserApiCreds): Promise<boolean> {
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // We need to build the L2 auth headers the same way ClobClient does.
    // Simplified check: just try the API key header.
    const res = await fetch(
      "https://clob.polymarket.com/data/orders?next_cursor=MA==&limit=1",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          POLY_API_KEY: creds.key,
          POLY_PASSPHRASE: creds.passphrase,
          POLY_TIMESTAMP: timestamp,
          // Note: full HMAC signature would require the secret + request details.
          // ClobClient handles this internally. For a quick validity check,
          // we rely on the API key existence check — CLOB returns 401 for
          // unknown keys before even checking the HMAC.
          POLY_SIGNATURE: "validation-check",
        },
        signal: AbortSignal.timeout(3000),
      }
    );

    // 401 = invalid key, anything else (including 400 bad sig) = key exists
    return res.status !== 401;
  } catch {
    // Network error — assume valid, let the real call handle errors
    return true;
  }
}