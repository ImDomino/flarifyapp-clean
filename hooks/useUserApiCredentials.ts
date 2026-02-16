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
 * In-memory cache — tied to eoaAddress.
 * Survives across re-renders but not page reloads.
 * On reload the HttpOnly cookie is the source of truth.
 */
let memoryCache: { eoa: string; creds: UserApiCreds } | null = null;

/**
 * useUserApiCredentials
 *
 * Manages Polymarket CLOB API credentials (L2 keys).
 *
 * Priority:
 *   1. In-memory cache (fastest, no network)
 *   2. HttpOnly cookie via /api/polymarket/credentials/retrieve
 *   3. createOrDeriveApiKey() — requires ONE Privy signature
 *
 * IMPORTANT: createOrDeriveApiKey is called on a "bare" L1 ClobClient
 * (no creds, no signatureType). This derives an API key tied to the EOA.
 * The resulting key is then used in the "full" ClobClient (with Safe config).
 */
export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const authFetch = useAuthFetch();
  const pendingRef = useRef<Promise<UserApiCreds> | null>(null);

  /**
   * Wipe creds from memory + server cookie.
   * Call this when CLOB returns 401 "Invalid api key".
   */
  const invalidateCreds = useCallback(async () => {
    console.log("[Creds] Invalidating all creds");
    memoryCache = null;
    try {
      await authFetch("/api/polymarket/credentials", { method: "DELETE" });
    } catch {
      // non-critical
    }
  }, [authFetch]);

  /**
   * Get existing or create new CLOB API credentials.
   *
   * @param forceCreate - skip cache/cookie, go straight to createOrDeriveApiKey
   *                      (triggers 1 Privy signature)
   */
  const getOrCreateCreds = useCallback(
    async (forceCreate = false): Promise<UserApiCreds> => {
      if (!ethersSigner || !eoaAddress || !safeAddress) {
        throw new Error("Wallet not ready — no signer, EOA, or Safe address");
      }

      // ── 1. Memory cache (instant, no signature) ──
      if (!forceCreate && memoryCache && memoryCache.eoa === eoaAddress) {
        console.log("[Creds] From memory:", memoryCache.creds.key.slice(0, 8) + "...");
        return memoryCache.creds;
      }

      // ── Dedup: if another call is already in-flight, wait for it ──
      if (pendingRef.current) {
        console.log("[Creds] Waiting for pending request...");
        return pendingRef.current;
      }

      const doGetCreds = async (): Promise<UserApiCreds> => {
        // ── 2. HttpOnly cookie (no signature, 1 network call) ──
        if (!forceCreate) {
          try {
            const res = await authFetch("/api/polymarket/credentials/retrieve");
            if (res.ok) {
              const data = await res.json();
              if (data.key && data.secret && data.passphrase) {
                const creds: UserApiCreds = {
                  key: data.key,
                  secret: data.secret,
                  passphrase: data.passphrase,
                };
                memoryCache = { eoa: eoaAddress, creds };
                console.log("[Creds] Restored from cookie:", creds.key.slice(0, 8) + "...");
                return creds;
              }
            }
          } catch (e) {
            console.warn("[Creds] Cookie retrieve failed, will create new:", e);
          }
        }

        // ── 3. Create/derive via L1 — ONE Privy signature ──
        console.log("[Creds] Creating new credentials via createOrDeriveApiKey...");

        // L1 "bare" client — no creds, no signatureType, no Safe.
        // This is how Polymarket SDK expects key derivation to work.
        const l1Client = new ClobClient(
          "https://clob.polymarket.com",
          137,
          ethersSigner as any
        );

        let creds: UserApiCreds | null = null;
        try {
          creds = (await l1Client.createOrDeriveApiKey()) as UserApiCreds;
        } catch (e: any) {
          console.error("[Creds] createOrDeriveApiKey failed:", e?.message);
          throw new Error(
            "Failed to obtain trading credentials. " +
            "Please check your connection and try again."
          );
        }

        if (!creds?.key || !creds?.secret || !creds?.passphrase) {
          throw new Error("Received incomplete credentials from Polymarket");
        }

        console.log("[Creds] New credentials created:", creds.key.slice(0, 8) + "...");

        // Cache in memory
        memoryCache = { eoa: eoaAddress, creds };

        // Persist to HttpOnly cookie (non-blocking, non-critical)
        try {
          const saveRes = await authFetch("/api/polymarket/credentials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: creds.key,
              secret: creds.secret,
              passphrase: creds.passphrase,
            }),
          });
          if (!saveRes.ok) {
            console.warn("[Creds] Cookie save failed:", saveRes.status);
          }
        } catch (e) {
          console.warn("[Creds] Cookie save error (non-critical):", e);
        }

        return creds;
      };

      // Dedup guard
      pendingRef.current = doGetCreds().finally(() => {
        pendingRef.current = null;
      });

      return pendingRef.current;
    },
    [ethersSigner, eoaAddress, safeAddress, authFetch]
  );

  /**
   * Alias for invalidateCreds
   */
  const clearCreds = invalidateCreds;

  return { getOrCreateCreds, clearCreds, invalidateCreds };
};