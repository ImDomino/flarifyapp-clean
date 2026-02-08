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
const LS_EOA_KEY = "polymarket_user_api_creds_eoa";
const LS_SAFE_KEY = "polymarket_user_api_creds_safe"; // NEW: привязка к Safe

/**
 * Проверяет валидность credentials через тестовый запрос к CLOB API
 */
async function validateCredentials(
  creds: UserApiCreds,
  eoaAddress: string,
  ethersSigner: any
): Promise<boolean> {
  try {
    console.log("🔍 Validating credentials...");
    
    // Создаём временный клиент с этими credentials
    const testClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner,
      creds,
      2, // signatureType для Safe
      eoaAddress // funder (Safe address)
    );

    // Пытаемся получить API key info (это не требует подписи, только auth)
    try {
      await testClient.getApiKeys();
      console.log("✅ Credentials are valid");
      return true;
    } catch (e: any) {
      if (e.message?.includes("401") || e.message?.includes("Unauthorized")) {
        console.warn("❌ Credentials are invalid (401)");
        return false;
      }
      // Другие ошибки (сеть и т.д.) считаем валидными credentials
      console.log("⚠️ Network error during validation, assuming valid");
      return true;
    }
  } catch (error) {
    console.error("❌ Validation error:", error);
    return false;
  }
}

export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();

  /**
   * Получить или создать User API Credentials
   * 
   * ВАЖНО: Credentials привязаны к Safe address, не к EOA!
   * При смене Safe нужно пересоздать credentials.
   */
  const getOrCreateCreds = useCallback(async (): Promise<UserApiCreds> => {
    if (!ethersSigner || !eoaAddress || !safeAddress) {
      throw new Error("No signer, EOA, or Safe address");
    }

    // Проверяем кэш (привязан к конкретному Safe)
    let cachedCreds: UserApiCreds | null = null;
    let needsValidation = false;

    if (typeof window !== "undefined") {
      const cachedEoa = window.localStorage.getItem(LS_EOA_KEY);
      const cachedSafe = window.localStorage.getItem(LS_SAFE_KEY);
      const cachedCredsStr = window.localStorage.getItem(LS_KEY);
      
      // Используем кэш только если это тот же EOA И Safe
      if (cachedEoa === eoaAddress && cachedSafe === safeAddress && cachedCredsStr) {
        try {
          cachedCreds = JSON.parse(cachedCredsStr);
          if (cachedCreds?.key && cachedCreds?.secret && cachedCreds?.passphrase) {
            console.log("📦 Found cached credentials for Safe:", safeAddress.slice(0, 10) + "...");
            needsValidation = true; // Проверим валидность
          }
        } catch (e) {
          console.warn("⚠️ Invalid cached credentials, will re-derive");
          cachedCreds = null;
        }
      } else if (cachedEoa !== eoaAddress || cachedSafe !== safeAddress) {
        console.log("🔄 EOA or Safe changed, clearing old credentials");
        window.localStorage.removeItem(LS_KEY);
        window.localStorage.removeItem(LS_EOA_KEY);
        window.localStorage.removeItem(LS_SAFE_KEY);
      }
    }

    // Если есть кэшированные credentials, проверим их валидность
    if (cachedCreds && needsValidation) {
      const isValid = await validateCredentials(cachedCreds, safeAddress, ethersSigner);
      if (isValid) {
        console.log("✅ Using cached credentials (validated)");
        return cachedCreds;
      } else {
        console.log("❌ Cached credentials invalid, recreating...");
        // Очищаем невалидные credentials
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(LS_KEY);
          window.localStorage.removeItem(LS_EOA_KEY);
          window.localStorage.removeItem(LS_SAFE_KEY);
        }
      }
    }

    console.log("🔑 Creating new L2 credentials for Safe:", safeAddress.slice(0, 10) + "...");

    // Создаём временный CLOB клиент (без credentials)
    const tempClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any
    );

    let creds: UserApiCreds | null = null;

    // Шаг 1: Пробуем derive (для возвращающихся пользователей)
    try {
      console.log("🔑 Trying to derive existing credentials...");
      const derived = await tempClient.deriveApiKey();
      
      if (derived?.key && derived?.secret && derived?.passphrase) {
        creds = derived as UserApiCreds;
        console.log("✅ Derived existing L2 credentials");
      }
    } catch (deriveError) {
      console.log("ℹ️ Could not derive credentials (new user or credentials not created yet)");
    }

    // Шаг 2: Если derive не сработал - создаём новые
    if (!creds) {
      try {
        console.log("🔑 Creating new L2 credentials...");
        creds = (await tempClient.createApiKey()) as UserApiCreds;
        console.log("✅ Created new L2 credentials");
      } catch (createError: any) {
        // Если createApiKey тоже не сработал - пробуем createOrDeriveApiKey
        console.log("🔑 Trying createOrDeriveApiKey...");
        creds = (await tempClient.createOrDeriveApiKey()) as UserApiCreds;
        console.log("✅ Got L2 credentials via createOrDeriveApiKey");
      }
    }

    if (!creds || !creds.key || !creds.secret || !creds.passphrase) {
      throw new Error("Failed to obtain valid L2 credentials");
    }

    // Валидируем новые credentials перед сохранением
    const isValid = await validateCredentials(creds, safeAddress, ethersSigner);
    if (!isValid) {
      throw new Error("Newly created credentials are invalid. Please try again.");
    }

    // Сохраняем в localStorage (привязываем к EOA И Safe)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, JSON.stringify(creds));
      window.localStorage.setItem(LS_EOA_KEY, eoaAddress);
      window.localStorage.setItem(LS_SAFE_KEY, safeAddress);
      console.log("💾 Credentials cached for Safe:", safeAddress.slice(0, 10) + "...");
    }

    return creds;
  }, [ethersSigner, eoaAddress, safeAddress]);

  /**
   * Очистить кэшированные credentials (при логауте или ошибках)
   */
  const clearCreds = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_KEY);
      window.localStorage.removeItem(LS_EOA_KEY);
      window.localStorage.removeItem(LS_SAFE_KEY);
      console.log("🗑️ Cleared cached credentials");
    }
  }, []);

  return { getOrCreateCreds, clearCreds };
};