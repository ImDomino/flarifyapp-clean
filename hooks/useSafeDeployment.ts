"use client";

import { useCallback } from "react";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";
import { useWallet } from "@/providers/WalletProvider";
import { useRelayClient } from "./useRelayClient";

export const useSafeDeployment = () => {
  const { eoaAddress } = useWallet();
  const relayClient = useRelayClient();

  const ensureSafe = useCallback(async (): Promise<string> => {
    if (!eoaAddress || !relayClient) {
      throw new Error("No wallet or relay client");
    }

    const config = getContractConfig(137); // Polygon
    const safeAddress = deriveSafe(
      eoaAddress as `0x${string}`,
      config.SafeContracts.SafeFactory
    );

    console.log('🔍 Checking Safe deployment:', safeAddress);

    const deployed = await relayClient.getDeployed(safeAddress);

    if (!deployed) {
  console.log('📡 Deploying Safe...');
  
  const response = await relayClient.deploy();
  const result = await response.wait();

  if (!result) {
    throw new Error("Failed to deploy Safe: empty result");
  }

    console.log("✅ Safe deployed:", result.proxyAddress);
  } else {
    console.log("✅ Safe already deployed:", safeAddress);
  }


    return safeAddress;
  }, [eoaAddress, relayClient]);

  return { ensureSafe };
};
