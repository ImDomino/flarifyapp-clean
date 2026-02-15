"use client";

import { useCallback, useRef } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";

const CLOB_URL = "https://clob.polymarket.com";
const CHAIN_ID = 137;

/**
 * useClobClient — Creates authenticated ClobClient instances
 *
 * Supports force-refresh: when `forceRefresh=true`, invalidates cached
 * creds first, causing getOrCreateCreds to derive fresh ones.
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
      const creds = await getOrCreateCreds();

      // signatureType 2 = POLY_GNOSIS_SAFE (EOA associated with a Safe proxy wallet)
      // funder = safeAddress (the Safe that holds funds on Polymarket)
      const client = new ClobClient(
        CLOB_URL,
        CHAIN_ID,
        ethersSigner as any,
        creds,
        2,           // signatureType: POLY_GNOSIS_SAFE
        safeAddress  // funder: Safe address that holds USDC
      );

      clientRef.current = { client, eoa: eoaAddress };
      return { clobClient: client, eoaAddress, safeAddress };
    },
    [ethersSigner, eoaAddress, safeAddress, getOrCreateCreds, invalidateCreds]
  );

  return { initClobClient };
};