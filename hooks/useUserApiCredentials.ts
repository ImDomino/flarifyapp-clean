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
 * In-memory cache, привязан к eoaAddress
 */
let memoryCache: { eoa: string; creds: UserApiCreds } | null = null;

/**
 * useUserApiCredentials — менеджит CLOB API ключи:
 * 1. Memory
 * 2. HttpOnly cookie
 * 3. createOrDeriveApiKey() через L1 (одна подпись Privy)
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

  const getOrCreateCreds = useCallback(
    async (forceCreate = false): Promise<UserApiCreds> => {
      if (!ethersSigner || !eoaAddress || !safeAddress) {
        throw new Error("No signer, EOA, or Safe address");
      }

      if (!forceCreate && memoryCache && memoryCache.eoa === eoaAddress) {
        return memoryCache.creds;
      }

      if (pendingRef.current) return pendingRef.current;

      const doGetCreds = async (): Promise<UserApiCreds> => {

        if (!forceCreate) {
          try {
            const res = await authFetch(
              "/api/polymarket/credentials/retrieve"
            );
            if (res.ok) {
              const data = await res.json();
              if (data.key && data.secret && data.passphrase) {
                const creds: UserApiCreds = {
                  key: data.key,
                  secret: data.secret,
                  passphrase: data.passphrase,
                };
                memoryCache = { eoa: eoaAddress, creds };
                console.log(
                  "[Creds] Restored from cookie:",
                  creds.key.slice(0, 8) + "..."
                );
                return creds;
              }
            }
          } catch {}
        }

        const l1Client = new ClobClient(
          "https://clob.polymarket.com",
          137,
          ethersSigner as any
        );

        let creds: UserApiCreds | null = null;

        try {
          creds = (await l1Client.createOrDeriveApiKey()) as UserApiCreds;
          console.log(
            "[Creds] createOrDeriveApiKey:",
            creds?.key?.slice(0, 8) + "..."
          );
        } catch (e: any) {
          console.warn("[Creds] createOrDeriveApiKey failed:", e?.message);
          throw new Error("Failed to obtain CLOB API credentials");
        }

        if (!creds?.key || !creds?.secret || !creds?.passphrase) {
          throw new Error("Failed to obtain CLOB API credentials");
        }

        memoryCache = { eoa: eoaAddress, creds };

        try {
          const res = await authFetch("/api/polymarket/credentials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: creds.key,
              secret: creds.secret,
              passphrase: creds.passphrase,
            }),
          });
          if (!res.ok) {
            console.error("[Creds] Failed to save to cookie:", await res.text());
          }
        } catch (e) {
          console.error("[Creds] Cookie save error:", e);
        }

        return creds;
      };

      pendingRef.current = doGetCreds().finally(() => {
        pendingRef.current = null;
      });
      return pendingRef.current;
    },
    [ethersSigner, eoaAddress, safeAddress, authFetch]
  );

  const clearCreds = useCallback(async () => {
    memoryCache = null;
    try {
      await authFetch("/api/polymarket/credentials", {
        method: "DELETE",
      });
    } catch {}
  }, [authFetch]);

  return { getOrCreateCreds, clearCreds, invalidateCreds };
};
