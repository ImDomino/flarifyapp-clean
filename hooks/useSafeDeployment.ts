"use client";

import { useCallback } from "react";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";
import { getContractConfig } from "@polymarket/builder-relayer-client/dist/config";
import { useWallet } from "@/providers/WalletProvider";
import { useRelayClient } from "./useRelayClient";

export const useSafeDeployment = () => {
  const { eoaAddress } = useWallet();
  const relayClient = useRelayClient();

  /**
   * Получить или развернуть Safe для текущего EOA
   * 
   * Согласно документации:
   * 1. Safe address детерминистически вычисляется из EOA
   * 2. Один и тот же EOA всегда получает один и тот же Safe address
   * 3. Safe разворачивается один раз при первом использовании
   */
  const ensureSafe = useCallback(async (): Promise<string> => {
    if (!eoaAddress) {
      throw new Error("No EOA address available");
    }

    if (!relayClient) {
      throw new Error("RelayClient not initialized");
    }

    // Шаг 1: Вычисляем Safe address (детерминистически из EOA)
    const config = getContractConfig(137); // Polygon
    const safeAddress = deriveSafe(
      eoaAddress as `0x${string}`,
      config.SafeContracts.SafeFactory
    );

    console.log('🔍 Safe address derived:', safeAddress);
    console.log('  From EOA:', eoaAddress);

    // Шаг 2: Проверяем развёрнут ли Safe
    console.log('🔍 Checking if Safe is deployed...');
    const deployed = await relayClient.getDeployed(safeAddress);

    if (deployed) {
      console.log('✅ Safe already deployed at:', safeAddress);
      return safeAddress;
    }

    // Шаг 3: Разворачиваем Safe
    console.log('📡 Deploying Safe...');
    
    try {
      const response = await relayClient.deploy();
      
      console.log('⏳ Waiting for deployment transaction...');
      const result = await response.wait();

      if (!result) {
        // Если wait() вернул null, проверяем статус через getTransaction
        console.warn("⚠️ deploy.wait() returned null, checking status...");
        
        const statusArray = await relayClient.getTransaction(response.transactionID);
        const status = statusArray[0];
        
        console.log("📋 Deployment status:", status);
        
        if (status?.state === 'CONFIRMED' || status?.state === 'COMPLETED') {
          console.log('✅ Safe deployed successfully at:', safeAddress);
          return safeAddress;
        }
        
        // Парсим ошибку из metadata
        let errorMsg = "Failed to deploy Safe";
        if (status?.metadata) {
          try {
            const metadata = typeof status.metadata === 'string' 
              ? JSON.parse(status.metadata) 
              : status.metadata;
            errorMsg = metadata.error || metadata.message || errorMsg;
          } catch (e) {
            // Ignore parse error
          }
        }
        
        throw new Error(`${errorMsg} (State: ${status?.state || 'UNKNOWN'})`);
      }

      console.log('✅ Safe deployed at:', result.proxyAddress);
      
      // Проверяем что адреса совпадают
      if (result.proxyAddress.toLowerCase() !== safeAddress.toLowerCase()) {
        console.warn('⚠️ Warning: Deployed address differs from derived!', {
          expected: safeAddress,
          got: result.proxyAddress,
        });
      }
      
      return safeAddress;
    } catch (error: any) {
      console.error('❌ Safe deployment error:', error);
      
      // Более понятные сообщения об ошибках
      if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient MATIC for Safe deployment. The relayer should cover gas, but something went wrong.');
      }
      if (error.message?.includes('user rejected')) {
        throw new Error('Safe deployment was rejected by user');
      }
      if (error.message?.includes('already deployed')) {
        console.log('ℹ️ Safe was already deployed');
        return safeAddress;
      }
      
      throw new Error(`Failed to deploy Safe: ${error.message}`);
    }
  }, [eoaAddress, relayClient]);

  /**
   * Получить Safe address без деплоя
   */
  const getSafeAddress = useCallback((): string | null => {
    if (!eoaAddress) return null;
    
    const config = getContractConfig(137);
    return deriveSafe(
      eoaAddress as `0x${string}`,
      config.SafeContracts.SafeFactory
    );
  }, [eoaAddress]);

  return { ensureSafe, getSafeAddress };
};
