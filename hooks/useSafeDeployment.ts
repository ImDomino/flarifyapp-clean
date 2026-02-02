// hooks/useSafeDeployment.ts
"use client";

import { useCallback, useState } from "react";
import { useRelayClient } from "./useRelayClient";

export const useSafeDeployment = () => {
  const relayClient = useRelayClient();
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [isDeploying] = useState(false); // пока реально не деплоим
  const [initialized, setInitialized] = useState(false);

  const ensureSafe = useCallback(async () => {
    if (!relayClient) throw new Error("Relay client not ready");

    if (safeAddress) return safeAddress;

    // временно: используем уже существующий Safe
    const existingSafe = "0x973B4bC08E6CFB28ca42c782bCF338DBE79823cd";
    setSafeAddress(existingSafe);
    setInitialized(true);
    return existingSafe;
  }, [relayClient, safeAddress]);

  return {
    safeAddress,
    ensureSafe,
    isDeploying,
    relayClient,
    initialized,
  };
};
