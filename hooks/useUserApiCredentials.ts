"use client";

import { useCallback, useRef } from "react";
import { ClobClient, Chain } from "@polymarket/clob-client-v2";
import { useWallet } from "@/providers/WalletProvider";
import { CLOB_HOST } from "./useClobClient";

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

      if (!forceNew && memCache && memCache.eoa === eoaAddress) {
        return memCache.creds;
      }

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

      if (pendingRef.current) return pendingRef.current;

      const doDerive = async (): Promise<UserApiCreds> => {
        console.log("[Creds] Deriving via bare ClobClient...");

        // V2 SDK uses an options-object constructor. L1/L2 auth is unchanged
        // from V1, so existing API keys continue to work after the cutover.
        const tempClient = new ClobClient({
          host: CLOB_HOST,
          chain: Chain.POLYGON,
          signer: ethersSigner as any,
        });

        let creds: UserApiCreds | null = null;

        try {
          const derived = await tempClient.deriveApiKey();
          if (derived?.key && derived?.secret && derived?.passphrase) {
            creds = derived as UserApiCreds;
            console.log("[Creds] Derived:", creds.key.slice(0, 8) + "...");
          }
        } catch {
          console.log("[Creds] Derive failed, trying create...");
        }

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
