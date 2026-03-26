import { useState, useCallback, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { toast } from "sonner";

interface TelegramLinkState {
  isConnected: boolean;
  username: string | null;
  isLoading: boolean;
  isLinking: boolean;
  linkUrl: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useTelegramLink(): TelegramLinkState {
  const { authenticated } = usePrivy();
  const authFetch = useAuthFetch();

  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch current Telegram link status
  useEffect(() => {
    if (!authenticated) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await authFetch("/api/telegram/link");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          setIsConnected(data.connected);
          setUsername(data.username || null);
        }
      } catch {
        // Not connected
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchStatus();
    return () => { cancelled = true; };
  }, [authenticated, authFetch]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const connect = useCallback(async () => {
    setIsLinking(true);
    try {
      const res = await authFetch("/api/telegram/link", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();

      setLinkUrl(data.url);

      // Poll for connection status every 3s
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await authFetch("/api/telegram/link");
          if (!statusRes.ok) return;
          const statusData = await statusRes.json();
          if (statusData.connected) {
            setIsConnected(true);
            setUsername(statusData.username || null);
            setIsLinking(false);
            setLinkUrl(null);
            if (pollRef.current) clearInterval(pollRef.current);
            toast.success("Telegram connected!");
          }
        } catch {
          // ignore polling errors
        }
      }, 3000);

      // Stop polling after 10 minutes (token expires)
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setIsLinking(false);
        setLinkUrl(null);
      }, 10 * 60 * 1000);
    } catch {
      toast.error("Failed to generate Telegram link");
      setIsLinking(false);
    }
  }, [authFetch]);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authFetch("/api/telegram/link", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setIsConnected(false);
      setUsername(null);
      toast.success("Telegram disconnected");
    } catch {
      toast.error("Failed to disconnect Telegram");
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  return {
    isConnected,
    username,
    isLoading,
    isLinking,
    linkUrl,
    connect,
    disconnect,
  };
}
