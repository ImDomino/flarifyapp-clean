"use client";

import { useCallback, useRef } from "react";
import {
  ClobClient,
  Chain,
  SignatureTypeV2,
  type BuilderConfig,
} from "@polymarket/clob-client-v2";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials, UserApiCreds } from "./useUserApiCredentials";

// Host switch: defaults to production; set NEXT_PUBLIC_CLOB_HOST=https://clob-v2.polymarket.com
// to test against the pre-cutover V2 preprod endpoint.
export const CLOB_HOST =
  process.env.NEXT_PUBLIC_CLOB_HOST || "https://clob.polymarket.com";

// V2 builder attribution is a bytes32 baked into the signed order struct.
// The SDK's BuilderConfig only requires `builderCode`; the client stamps it
// onto every order it signs.
const BUILDER_ID = process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_ID;

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
    async (forceRefresh = false) => {
      if (!ethersSigner || !eoaAddress || !safeAddress) {
        throw new Error("Wallet not connected");
      }

      const creds = await getOrCreateCreds(forceRefresh);

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

      const builderConfig: BuilderConfig | undefined = BUILDER_ID
        ? { builderCode: BUILDER_ID }
        : undefined;

      const client = new ClobClient({
        host: CLOB_HOST,
        chain: Chain.POLYGON,
        signer: ethersSigner as any,
        creds,
        signatureType: SignatureTypeV2.POLY_GNOSIS_SAFE,
        funderAddress: safeAddress,
        builderConfig,
      });

      clientRef.current = { client, eoa: eoaAddress, credsKey: creds.key, creds };

      console.log("[ClobClient] Init:", {
        host: CLOB_HOST,
        eoa: eoaAddress.slice(0, 10) + "...",
        safe: safeAddress.slice(0, 10) + "...",
        key: creds.key.slice(0, 8) + "...",
        builderAttribution: BUILDER_ID ? "on" : "off",
      });

      return { clobClient: client, userCreds: creds, eoaAddress, safeAddress };
    },
    [ethersSigner, eoaAddress, safeAddress, getOrCreateCreds]
  );

  return { initClobClient };
};
