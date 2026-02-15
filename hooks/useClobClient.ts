"use client";

import { useCallback, useRef } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import { useWallet } from "@/providers/WalletProvider";
import { useUserApiCredentials } from "./useUserApiCredentials";
import { useSafeDeployment } from "./useSafeDeployment";
import { useTokenApprovals } from "./useTokenApprovals";

export const useClobClient = () => {
  const { ethersSigner, eoaAddress } = useWallet();
  const { getOrCreateCreds } = useUserApiCredentials();
  const { ensureSafe } = useSafeDeployment();
  const { ensureApprovals } = useTokenApprovals();

  const cached = useRef<{
    clobClient: ClobClient;
    safeAddress: string;
    userCreds: any;
  } | null>(null);

  const initClobClient = useCallback(async () => {
    if (cached.current) {
      return {
        clobClient: cached.current.clobClient,
        eoaAddress,
        safeAddress: cached.current.safeAddress,
        userCreds: cached.current.userCreds,
      };
    }

    if (!ethersSigner || !eoaAddress) {
      throw new Error("Wallet not connected");
    }

    const creds = await getOrCreateCreds();
    const safeAddress = await ensureSafe();
    const approvalsOk = await ensureApprovals(safeAddress);
    if (!approvalsOk) {
      console.warn("⚠️ Some approvals may be missing, trading might fail");
    }

    const builderSignUrl = `${window.location.origin}/api/polymarket/sign`;
    const builderConfig = new BuilderConfig({
      remoteBuilderConfig: { url: builderSignUrl },
    });

    const clobClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any,
      creds,
      2,
      safeAddress,
      undefined,
      undefined,
      builderConfig
    );

    cached.current = { clobClient, safeAddress, userCreds: creds };

    return { clobClient, eoaAddress, safeAddress, userCreds: creds };
  }, [ethersSigner, eoaAddress, getOrCreateCreds, ensureSafe, ensureApprovals]);

  return { initClobClient };
};
