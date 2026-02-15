"use client";

import { useCallback, useRef } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";

const CLOB_URL = "https://clob.polymarket.com";
const CHAIN_ID = 137;

/**
 * useClobClient — создаёт аутентифицированные ClobClient инстансы
 *
 * Safe wallet сигнатура:
 *   new ClobClient(host, chainId, signer, creds, 2, safeAddress, undefined, false, builderConfig)
 */
export const useClobClient = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const { getOrCreateCreds, invalidateCreds } = useUserApiCredentials();
  const clientRef = useRef<{ client: ClobClient; eoa: string } | null>(null);

  const initClobClient = useCallback(
    async (
      forceRefresh = false
    ): Promise<{
      clobClient: ClobClient;
      eoaAddress: string;
      safeAddress: string;
    }> => {
      if (!ethersSigner || !eoaAddress || !safeAddress) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      if (forceRefresh) {
        clientRef.current = null;
        await invalidateCreds();
      }

      if (clientRef.current && clientRef.current.eoa === eoaAddress) {
        return { clobClient: clientRef.current.client, eoaAddress, safeAddress };
      }

      const creds = await getOrCreateCreds(forceRefresh);

      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: `${baseUrl}/api/polymarket/sign`,
        },
      });

      const client = new ClobClient(
        CLOB_URL,
        CHAIN_ID,
        ethersSigner as any,
        creds,
        2, // POLY_GNOSIS_SAFE
        safeAddress,
        undefined,
        false,
        builderConfig
      );

      clientRef.current = { client, eoa: eoaAddress };
      return { clobClient: client, eoaAddress, safeAddress };
    },
    [ethersSigner, eoaAddress, safeAddress, getOrCreateCreds, invalidateCreds]
  );

  return { initClobClient };
};
