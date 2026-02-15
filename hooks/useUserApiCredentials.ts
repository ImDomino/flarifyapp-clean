"use client";

import { useCallback } from "react";
import { ClobClient } from "@polymarket/clob-client";
import { useWallet } from "@/providers/WalletProvider";
import { useAuthFetch } from "./useAuthFetch";

export type UserApiCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

// Кэш на жизнь вкладки (в памяти, не в storage)
let cachedCreds: UserApiCreds | null = null;

/**
 * useUserApiCredentials — SECURE version
 *
 * Credentials are stored server-side in encrypted HttpOnly cookies.
 * They NEVER touch localStorage or any JS-accessible storage.
 *
 * Flow:
 * 1. Check if server has stored creds (GET /api/polymarket/credentials)
 * 2. Derive/create creds через ClobClient
 * 3. Сохранить creds на сервере (HttpOnly cookie)
 * 4. В React живём из кэша в памяти
 */
export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const authFetch = useAuthFetch();

  const getOrCreateCreds = useCallback(async (): Promise<UserApiCreds> => {
    if (cachedCreds) {
      console.log("[L2] Using cached creds");
      return cachedCreds;
    }

    if (!ethersSigner || !eoaAddress || !safeAddress) {
      throw new Error("No signer, EOA, or Safe address");
    }

    // Step 1: Проверить, знает ли сервер о кредах
    let serverHasCreds = false;
    try {
      const checkRes = await authFetch("/api/polymarket/credentials");
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        serverHasCreds = checkData.hasCreds === true;
        console.log("[L2] Server hasCreds =", serverHasCreds);
      } else {
        console.warn(
          "[L2] Creds check non-200",
          checkRes.status,
          await checkRes.text().catch(() => "")
        );
      }
    } catch (e) {
      console.error("[L2] Creds check error", e);
      // ок, просто идём дальше
    }

    // Step 2: временный ClobClient без L2 кредов
    const tempClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any
    );

    let creds: UserApiCreds | null = null;

    // Step 3: попробовать deriveApiKey (возвратный юзер)
    try {
      console.log("[L2] deriveApiKey start");
      const derived = await tempClient.deriveApiKey();
      console.log("[L2] deriveApiKey result", derived);
      if (derived?.key && derived?.secret && derived?.passphrase) {
        creds = derived as UserApiCreds;
      }
    } catch (e) {
      console.error("[L2] deriveApiKey error", e);
      // ок, пробуем create
    }

    // Step 4: если derive не дал результат — create / createOrDerive
    if (!creds) {
      try {
        console.log("[L2] createApiKey start");
        creds = (await tempClient.createApiKey()) as UserApiCreds;
        console.log("[L2] createApiKey result", creds);
      } catch (e1) {
        console.error("[L2] createApiKey error", e1);
        try {
          console.log("[L2] createOrDeriveApiKey start");
          creds = (await tempClient.createOrDeriveApiKey()) as UserApiCreds;
          console.log("[L2] createOrDeriveApiKey result", creds);
        } catch (e2) {
          console.error("[L2] createOrDeriveApiKey error", e2);
          throw e2; // тут уже реально всё плохо — пробрасываем наружу
        }
      }
    }

    if (!creds || !creds.key || !creds.secret || !creds.passphrase) {
      console.error("[L2] Final creds invalid", creds);
      throw new Error("Failed to obtain valid L2 credentials");
    }

    // Step 5: сохранить на сервере в HttpOnly cookie
    try {
      const storeRes = await authFetch("/api/polymarket/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: creds.key,
          secret: creds.secret,
          passphrase: creds.passphrase,
        }),
      });
      if (!storeRes.ok) {
        const text = await storeRes.text().catch(() => "");
        console.warn(
          "[L2] Failed to store credentials server-side",
          storeRes.status,
          text.slice(0, 300)
        );
      } else {
        console.log("[L2] Creds stored server-side OK");
      }
    } catch (e) {
      console.warn("[L2] Could not persist credentials to server", e);
    }

    cachedCreds = creds;
    return creds;
  }, [ethersSigner, eoaAddress, safeAddress, authFetch]);

  const clearCreds = useCallback(async () => {
    try {
      await authFetch("/api/polymarket/credentials", { method: "DELETE" });
      cachedCreds = null;
      console.log("[L2] Creds cleared");
    } catch (e) {
      console.warn("[L2] Failed to clear creds", e);
    }
  }, [authFetch]);

  return { getOrCreateCreds, clearCreds };
};
