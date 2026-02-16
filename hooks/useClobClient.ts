"use client";

import { useCallback, useRef } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials, UserApiCreds } from "./useUserApiCredentials";

/**
 * useClobClient
 *
 * Creates authenticated ClobClient exactly like Polymarket's official example:
 *
 * const clobClient = new ClobClient(
 *   "https://clob.polymarket.com",
 *   137,
 *   ethersSigner,
 *   userApiCredentials,    // { key, secret, passphrase }
 *   2,                     // signatureType = 2 for Safe
 *   safeAddress,           // funder = Safe address
 *   undefined,
 *   false,
 *   builderConfig          // remote HMAC signing
 * );
 */
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
        throw new Error("Wallet not connected");
      }

      const creds = await getOrCreateCreds(forceRefresh);

      // Return cached client if same EOA + same creds
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

      // BuilderConfig for remote HMAC signing (builder creds stay server-side)
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: { url: `${baseUrl}/api/polymarket/sign` },
      });

      // Exactly matches official example constructor
      const client = new ClobClient(
        "https://clob.polymarket.com",
        137,
        ethersSigner as any,
        creds,
        2,              // signatureType = POLY_GNOSIS_SAFE
        safeAddress,    // funder
        undefined,
        false,
        builderConfig
      );

      clientRef.current = { client, eoa: eoaAddress, credsKey: creds.key, creds };

      console.log("[ClobClient] Initialized:", {
        eoa: eoaAddress.slice(0, 10) + "...",
        safe: safeAddress.slice(0, 10) + "...",
        key: creds.key.slice(0, 8) + "...",
      });

      return { clobClient: client, userCreds: creds, eoaAddress, safeAddress };
    },
    [ethersSigner, eoaAddress, safeAddress, getOrCreateCreds]
  );

  return { initClobClient };
};