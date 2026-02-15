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
        // 1. Пробуем достать из cookie
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

        // 2. L1 client для derive/create API key (без signatureType и funder)
        const l1Client = new ClobClient(
          "https://clob.polymarket.com",
          137,
          ethersSigner as any
        );

        let creds: UserApiCreds | null = null;

        if (forceCreate) {
          // Пытаемся удалить старый key, если он есть
          try {
            const oldCreds = await l1Client.deriveApiKey();
            if (oldCreds?.key) {
              console.log(
                "[Creds] Derived old key:",
                oldCreds.key.slice(0, 8) + "..., deleting..."
              );
              const delClient = new ClobClient(
                "https://clob.polymarket.com",
                137,
                ethersSigner as any,
                oldCreds
              );
              await delClient.deleteApiKey();
              console.log("[Creds] Old key deleted");
            }
          } catch (e: any) {
            console.warn("[Creds] Could not delete old key:", e?.message);
          }

          try {
            creds = (await l1Client.createApiKey()) as UserApiCreds;
            console.log(
              "[Creds] Created NEW key:",
              creds?.key?.slice(0, 8) + "..."
            );
          } catch (e: any) {
            console.warn("[Creds] createApiKey failed:", e?.message);
            creds = (await l1Client.createOrDeriveApiKey()) as UserApiCreds;
          }
        } else {
          try {
            creds = (await l1Client.createOrDeriveApiKey()) as UserApiCreds;
            console.log(
              "[Creds] createOrDeriveApiKey:",
              creds?.key?.slice(0, 8) + "..."
            );
          } catch (e: any) {
            console.warn("[Creds] createOrDeriveApiKey failed:", e?.message);
            creds = (await l1Client.createApiKey()) as UserApiCreds;
          }
        }

        if (!creds?.key || !creds?.secret || !creds?.passphrase) {
          throw new Error("Failed to obtain CLOB API credentials");
        }

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
        } catch {}

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
