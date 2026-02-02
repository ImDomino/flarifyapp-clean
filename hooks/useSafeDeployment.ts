// hooks/useSafeDeployment.ts
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

    // Проверяем развернут ли Safe
    const deployed = await relayClient.getDeployed(safeAddress);

    if (!deployed) {
      console.log('📡 Deploying Safe...');
      
      try {
        const response = await relayClient.deploy();
        
        // ✅ ИСПРАВЛЕНИЕ: Правильная обработка ответа от relayer
        const result = await response.wait();

        if (!result) {
          // Если wait() вернул null, получаем статус
          console.warn("⚠️ deploy.wait() returned null, checking status...");
          
          const statusArray = await relayClient.getTransaction(response.transactionID);
          const status = statusArray[0];
          
          console.error("❌ Deploy status:", status);
          
          let errorMsg = "Failed to deploy Safe";
          if (status?.metadata) {
            try {
              const metadata = typeof status.metadata === 'string' 
                ? JSON.parse(status.metadata) 
                : status.metadata;
              errorMsg = metadata.error || metadata.message || errorMsg;
            } catch (e) {
              // Ignore
            }
          }
          
          throw new Error(`${errorMsg} (State: ${status?.state || 'UNKNOWN'})`);
        }

        console.log("✅ Safe deployed:", result.proxyAddress);
        
        // Дополнительная проверка что адреса совпадают
        if (result.proxyAddress.toLowerCase() !== safeAddress.toLowerCase()) {
          console.warn("⚠️ Warning: Deployed Safe address mismatch", {
            expected: safeAddress,
            got: result.proxyAddress
          });
        }
        
        return safeAddress;
      } catch (error: any) {
        console.error("❌ Safe deployment error:", error);
        
        // Улучшенные сообщения об ошибках
        if (error.message.includes("insufficient funds")) {
          throw new Error("Insufficient MATIC for Safe deployment. Please add some MATIC to your wallet.");
        }
        if (error.message.includes("user rejected")) {
          throw new Error("Safe deployment was rejected");
        }
        
        throw new Error(`Failed to deploy Safe: ${error.message}`);
      }
    } else {
      console.log("✅ Safe already deployed:", safeAddress);
    }

    return safeAddress;
  }, [eoaAddress, relayClient]);

  return { ensureSafe };
};
