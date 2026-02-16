"use client";

import { useCallback, useRef } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials, UserApiCreds } from "./useUserApiCredentials";

const CLOB_URL = "https://clob.polymarket.com";
const CHAIN_ID = 137;

export const useClobClient = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const { getOrCreateCreds } = useUserApiCredentials();

  const clientRef = useRef<{
    client: ClobClient;
    eoa: string;
    credsKey: string;
    creds: UserApiCreds;
  } | null>(null);

  const initClobClient = useCallback(
    async (
      forceRefresh = false
    ): Promise<{
      clobClient: ClobClient;
      userCreds: UserApiCreds;
      eoaAddress: string;
      safeAddress: string;
    }> => {
      if (!ethersSigner || !eoaAddress || !safeAddress) {
        throw new Error("Wallet not connected. Please sign in first.");
      }

      const creds = await getOrCreateCreds(forceRefresh);

      // Return cached client if nothing changed
      if (
        !forceRefresh &&
        clientRef.current &&
        clientRef.current.eoa === eoaAddress &&
        clientRef.current.credsKey === creds.key
      ) {
        return {
          clobClient: clientRef.current.client,
          userCreds: clientRef.current.creds,
          eoaAddress,
          safeAddress,
        };
      }

      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: { url: `${baseUrl}/api/polymarket/sign` },
      });

      const client = new ClobClient(
        CLOB_URL,
        CHAIN_ID,
        ethersSigner as any,
        creds,
        2,              // POLY_GNOSIS_SAFE
        safeAddress,
        undefined,
        false,
        builderConfig
      );

      clientRef.current = { client, eoa: eoaAddress, credsKey: creds.key, creds };

      console.log("[ClobClient] Init", {
        eoa: eoaAddress.slice(0, 8) + "...",
        safe: safeAddress.slice(0, 8) + "...",
        key: creds.key.slice(0, 8) + "...",
      });

      return { clobClient: client, userCreds: creds, eoaAddress, safeAddress };
    },
    [ethersSigner, eoaAddress, safeAddress, getOrCreateCreds]
  );

  return { initClobClient };
};