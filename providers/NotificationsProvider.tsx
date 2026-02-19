"use client";

import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";

interface NotificationsContextType {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType>({
  unreadCount: 0,
  refreshUnread: async () => {},
  markAllRead: async () => {},
  markRead: async () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, user } = usePrivy();
  const authFetch = useAuthFetch();
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!user?.id || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await authFetch("/api/notifications?unread_only=true&limit=1");
      const data = await res.json();
      setUnreadCount(data.unread_count || 0);
    } catch {}
    finally { fetchingRef.current = false; }
  }, [user?.id, authFetch]);

  const markAllRead = useCallback(async () => {
    try {
      await authFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
      setUnreadCount(0);
    } catch {}
  }, [authFetch]);

  const markRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await authFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_ids: ids }),
      });
      setUnreadCount((prev) => Math.max(0, prev - ids.length));
    } catch {}
  }, [authFetch]);

  // Polling every 60s, pauses when tab is hidden
  useEffect(() => {
    if (!authenticated) return;

    refreshUnread();

    const startPolling = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(refreshUnread, 60000);
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
        refreshUnread(); // fetch immediately when tab becomes visible
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
    <NotificationsContext.Provider value={{ unreadCount, refreshUnread, markAllRead, markRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}