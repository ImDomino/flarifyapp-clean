"use client";

import { useCallback, useRef } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";

const CLOB_URL = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon

/**
 * useClobClient
 *
 * Creates authenticated ClobClient instances for trading.
 *
 * The ClobClient is initialized with:
 *   - host: CLOB API URL
 *   - chainId: 137 (Polygon)
 *   - signer: Privy embedded wallet (EOA)
 *   - creds: User API credentials (key, secret, passphrase)
 *   - signatureType: 2 (POLY_GNOSIS_SAFE)
 *   - funder: Safe proxy address (holds USDC and positions)
 *   - builderConfig: Remote HMAC signing via /api/polymarket/sign
 *
 * Caching: The client is cached by EOA address + creds key.
 * When creds are invalidated, forceRefresh=true rebuilds the client.
 */
export const useClobClient = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const { getOrCreateCreds } = useUserApiCredentials();

  // Cache: { client, eoa, credsKey } — invalidated when EOA or creds change
  const clientRef = useRef<{
    client: ClobClient;
    eoa: string;
    credsKey: string;
  } | null>(null);

  const initClobClient = useCallback(
    async (
      forceRefresh = false
    ): Promise<{
      clobClient: ClobClient;
      eoaAddress: string;
      safeAddress: string;
    }> => {
      if (!ethersSigner || !eoaAddress || !safeAddress) {
        throw new Error(
          "Wallet not connected. Please sign in and try again."
        );
      }

      // Get credentials (from memory → cookie → derive)
      // forceRefresh=true skips cache, calls createOrDeriveApiKey (1 signature)
      const creds = await getOrCreateCreds(forceRefresh);

      // Return cached client if EOA and creds haven't changed
      if (
        !forceRefresh &&
        clientRef.current &&
        clientRef.current.eoa === eoaAddress &&
        clientRef.current.credsKey === creds.key
      ) {
        return {
          clobClient: clientRef.current.client,
          eoaAddress,
          safeAddress,
        };
      }

      // Build remote signing config (server holds builder secret)
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: `${baseUrl}/api/polymarket/sign`,
        },
      });

      // Create authenticated client
      //
      // Signature:
      //   new ClobClient(host, chainId, signer, creds, signatureType, funder, undefined, false, builderConfig)
      //
      // signatureType 2 = POLY_GNOSIS_SAFE
      // funder = Safe address (where USDC lives)
      const client = new ClobClient(
        CLOB_URL,
        CHAIN_ID,
        ethersSigner as any,
        creds,                // User API creds (key, secret, passphrase)
        2,                    // POLY_GNOSIS_SAFE
        safeAddress,          // Safe proxy address
        undefined,            // no override for exchange address
        false,                // not a CLOB taker
        builderConfig         // Remote builder HMAC signing
      );

      // Cache the client
      clientRef.current = {
        client,
        eoa: eoaAddress,
        credsKey: creds.key,
      };

      console.log("[ClobClient] Initialized", {
        eoa: eoaAddress.slice(0, 8) + "...",
        safe: safeAddress.slice(0, 8) + "...",
        credsKey: creds.key.slice(0, 8) + "...",
      });

      return { clobClient: client, eoaAddress, safeAddress };
    },
    [ethersSigner, eoaAddress, safeAddress, getOrCreateCreds]
  );

  return { initClobClient };
};