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

/**
 * useUserApiCredentials — SECURE version
 *
 * Credentials are stored server-side in encrypted HttpOnly cookies.
 * They NEVER touch localStorage or any JS-accessible storage.
 *
 * Flow:
 * 1. Check if server has stored creds (GET /api/polymarket/credentials)
 * 2. If yes, derive creds client-side to get them in memory for ClobClient
 * 3. If no, create new creds and store via POST /api/polymarket/credentials
 * 4. Creds exist in JS memory only for the duration of the trading operation
 */
export const useUserApiCredentials = () => {
  const { ethersSigner, eoaAddress, safeAddress } = useWallet();
  const authFetch = useAuthFetch();

  /**
   * Get or create User API Credentials.
   *
   * Returns creds in memory for ClobClient initialization.
   * Also ensures they're persisted server-side in HttpOnly cookies.
   */
  const getOrCreateCreds = useCallback(async (): Promise<UserApiCreds> => {
    if (!ethersSigner || !eoaAddress || !safeAddress) {
      throw new Error("No signer, EOA, or Safe address");
    }

    // Step 1: Check if server already has stored credentials
    let serverHasCreds = false;
    try {
      const checkRes = await authFetch("/api/polymarket/credentials");
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        serverHasCreds = checkData.hasCreds === true;
      }
    } catch {
      // Server check failed — proceed to derive/create
    }

    // Step 2: Create a temporary CLOB client (no credentials) to derive/create
    const tempClient = new ClobClient(
      "https://clob.polymarket.com",
      137,
      ethersSigner as any
    );

    let creds: UserApiCreds | null = null;

    // Step 3: Try to derive existing credentials (returning users)
    try {
      const derived = await tempClient.deriveApiKey();
      if (derived?.key && derived?.secret && derived?.passphrase) {
        creds = derived as UserApiCreds;
      }
    } catch {
      // Could not derive — new user or creds not created yet
    }

    // Step 4: If derive failed, create new credentials
    if (!creds) {
      try {
        creds = (await tempClient.createApiKey()) as UserApiCreds;
      } catch {
        // Fallback: createOrDeriveApiKey
        creds = (await tempClient.createOrDeriveApiKey()) as UserApiCreds;
      }
    }

    if (!creds || !creds.key || !creds.secret || !creds.passphrase) {
      throw new Error("Failed to obtain valid L2 credentials");
    }

    // Step 5: Store credentials server-side in HttpOnly cookie
    // (even if server already had them — refresh to ensure consistency)
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
        console.warn("Failed to store credentials server-side, trading may still work for this session");
      }
    } catch {
      console.warn("Could not persist credentials to server");
    }

    // Return creds in memory for ClobClient usage
    // These are NOT stored in localStorage — they exist only in JS memory
    return creds;
  }, [ethersSigner, eoaAddress, safeAddress, authFetch]);

  /**
   * Clear stored credentials (on logout or errors)
   */
  const clearCreds = useCallback(async () => {
    try {
      await authFetch("/api/polymarket/credentials", { method: "DELETE" });
    } catch {
      // Silent — best effort
    }
  }, [authFetch]);

  return { getOrCreateCreds, clearCreds };
};
