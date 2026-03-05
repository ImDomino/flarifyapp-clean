"use client";

import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";

interface MessagesContextType {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType>({
  unreadCount: 0,
  refreshUnread: async () => {},
});

export function useMessages() {
  return useContext(MessagesContext);
}

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, user } = usePrivy();
  const authFetch = useAuthFetch();
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!user?.id || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await authFetch("/api/messages/unread");
      const data = await res.json();
      setUnreadCount(data.unread_count || 0);
    } catch {}
    finally { fetchingRef.current = false; }
  }, [user?.id, authFetch]);

  // Polling every 10s, pauses when tab is hidden
  useEffect(() => {
    if (!authenticated) return;

    refreshUnread();

    const startPolling = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(refreshUnread, 10000);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        refreshUnread();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [authenticated, refreshUnread]);

  return (
    <MessagesContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </MessagesContext.Provider>
  );
}
