"use client";

import { useCallback, useRef } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";

const CLOB_URL = "https://clob.polymarket.com";
const CHAIN_ID = 137;

/**
 * useClobClient — Creates authenticated ClobClient instances
 *
 * Based on Polymarket's privy-safe-builder-example:
 * https://github.com/Polymarket/privy-safe-builder-example
 *
 * ClobClient constructor for Safe wallet:
 *   new ClobClient(host, chainId, signer, creds, 2, safeAddress, undefined, false, builderConfig)
 *
 * BuilderConfig uses remote signing via /api/polymarket/sign
 * so builder credentials stay server-side.
 */
export const useClobClient = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const { getOrCreateCreds, invalidateCreds } = useUserApiCredentials();
  const clientRef = useRef<{ client: ClobClient; eoa: string } | null>(null);

  const initClobClient = useCallback(
    async (
      forceRefresh = false
    ): Promise<{ clobClient: ClobClient; eoaAddress: string; safeAddress: string }> => {
      if (!ethersSigner || !eoaAddress || !safeAddress) {
        throw new Error("Wallet not connected. Please connect your wallet first.");
      }

      // If force refresh, clear cached client and creds
      if (forceRefresh) {
        clientRef.current = null;
        await invalidateCreds();
      }

      // Return cached client if same EOA and not force-refreshing
      if (clientRef.current && clientRef.current.eoa === eoaAddress) {
        return { clobClient: clientRef.current.client, eoaAddress, safeAddress };
      }

      // Get or create credentials (memory → cookie → derive)
      const creds = await getOrCreateCreds(forceRefresh);

      // BuilderConfig for remote signing — builder creds stay on server
      // Must be absolute URL — BuilderConfig rejects relative paths
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: `${baseUrl}/api/polymarket/sign`,
        },
      });

      // ClobClient for Gnosis Safe proxy wallet (Privy embedded EOA + Safe)
      // Matches Polymarket's official privy-safe-builder-example exactly
      const client = new ClobClient(
        CLOB_URL,
        CHAIN_ID,
        ethersSigner as any,
        creds,
        2,              // signatureType: POLY_GNOSIS_SAFE
        safeAddress,    // funder: Safe address that holds USDC
        undefined,      // mandatory placeholder
        false,          // mandatory placeholder
        builderConfig   // Builder order attribution
      );

      clientRef.current = { client, eoa: eoaAddress };
      return { clobClient: client, eoaAddress, safeAddress };
    },
    [ethersSigner, eoaAddress, safeAddress, getOrCreateCreds, invalidateCreds]
  );

  return { initClobClient };
};