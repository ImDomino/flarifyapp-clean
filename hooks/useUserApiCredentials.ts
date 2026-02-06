"use client";

import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { useWallet } from "@/providers/WalletProvider";

export type UserApiCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

const LS_KEY = "polymarket_user_api_creds";
const LS_EOA_KEY = "polymarket_user_api_creds_eoa"; // Привязываем к EOA

export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress } = useWallet();

  /**
   * Получить или создать User API Credentials
   * 
   * Согласно документации:
   * - Сначала пробуем deriveApiKey() для возвращающихся пользователей
   * - Если не получилось - createApiKey() для новых
   * - Credentials привязаны к EOA, не к Safe
   */
  const getOrCreateCreds = useCallback(async (): Promise<UserApiCreds> => {
    if (!ethersSigner || !eoaAddress) {
      throw new Error("No signer or EOA address");
    }

    // Проверяем кэш (привязан к конкретному EOA)
    if (typeof window !== "undefined") {
      const cachedEoa = window.localStorage.getItem(LS_EOA_KEY);
      const cachedCreds = window.localStorage.getItem(LS_KEY);
      
      // Используем кэш только если это тот же EOA
      if (cachedEoa === eoaAddress && cachedCreds) {
        try {
          const creds = JSON.parse(cachedCreds);
          if (creds.key && creds.secret && creds.passphrase) {
            console.log('✅ Using cached L2 credentials for EOA:', eoaAddress.slice(0, 10) + '...');
            return creds;
          }
        } catch (e) {
          console.warn('⚠️ Invalid cached credentials, will re-derive');
        }
      }
    }

    console.log('📡 Getting L2 credentials for EOA:', eoaAddress.slice(0, 10) + '...');

    // Создаём временный CLOB клиент (без credentials)
    // Важно: используем EOA signer, не Safe
    const tempClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any
      // Без credentials, signatureType, funder - только для derive/create
    );

    let creds: UserApiCreds | null = null;

    // Шаг 1: Пробуем derive (для возвращающихся пользователей)
    try {
      console.log('🔑 Trying to derive existing credentials...');
      const derived = await tempClient.deriveApiKey();
      
      if (derived?.key && derived?.secret && derived?.passphrase) {
        creds = derived as UserApiCreds;
        console.log('✅ Derived existing L2 credentials');
      }
    } catch (deriveError) {
      console.log('ℹ️ Could not derive credentials (new user or credentials not created yet)');
    }

    // Шаг 2: Если derive не сработал - создаём новые
    if (!creds) {
      try {
        console.log('🔑 Creating new L2 credentials...');
        creds = (await tempClient.createApiKey()) as UserApiCreds;
        console.log('✅ Created new L2 credentials');
      } catch (createError: any) {
        // Если createApiKey тоже не сработал - пробуем createOrDeriveApiKey
        console.log('🔑 Trying createOrDeriveApiKey...');
        creds = (await tempClient.createOrDeriveApiKey()) as UserApiCreds;
        console.log('✅ Got L2 credentials via createOrDeriveApiKey');
      }
    }

    if (!creds || !creds.key || !creds.secret || !creds.passphrase) {
      throw new Error('Failed to obtain valid L2 credentials');
    }

    // Сохраняем в localStorage (привязываем к EOA)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, JSON.stringify(creds));
      window.localStorage.setItem(LS_EOA_KEY, eoaAddress);
      console.log('💾 Credentials cached for EOA:', eoaAddress.slice(0, 10) + '...');
    }

    return creds;
  }, [ethersSigner, eoaAddress]);

  /**
   * Очистить кэшированные credentials
   */
  const clearCreds = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_KEY);
      window.localStorage.removeItem(LS_EOA_KEY);
      console.log('🗑️ Cleared cached credentials');
    }
  }, []);

  return { getOrCreateCreds, clearCreds };
};
