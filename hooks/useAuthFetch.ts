"use client";
import { useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Returns a fetch() that automatically attaches Privy Bearer token.
 * Replace all fetch('/api/...') calls with authFetch('/api/...').
 */
export function useAuthFetch() {
  const { getAccessToken } = usePrivy();
  return useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      let token: string | null = null;
      try { token = await getAccessToken(); } catch {}
      const headers = new Headers(options.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("Content-Type") && options.body && typeof options.body === "string")
        headers.set("Content-Type", "application/json");
      return fetch(url, { ...options, headers });
    },
    [getAccessToken]
  );
}
