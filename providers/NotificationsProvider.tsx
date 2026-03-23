"use client";

import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import {
  playNotificationSound,
  startTitleFlash,
  stopTitleFlash,
  initAudioOnInteraction,
} from "@/lib/notification-effects";

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
  const prevUnreadRef = useRef(0);
  const initialFetchDoneRef = useRef(false);

  const refreshUnread = useCallback(async () => {
    if (!user?.id || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await authFetch("/api/notifications?unread_only=true&limit=1");
      const data = await res.json();
      const newCount = data.unread_count || 0;

      // Detect NEW notifications (count went up, not first fetch)
      if (
        initialFetchDoneRef.current &&
        newCount > prevUnreadRef.current
      ) {
        playNotificationSound();
        if (document.hidden) {
          startTitleFlash(newCount);
        }
      }

      prevUnreadRef.current = newCount;
      initialFetchDoneRef.current = true;
      setUnreadCount(newCount);
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
      prevUnreadRef.current = 0;
      stopTitleFlash();
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
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - ids.length);
        prevUnreadRef.current = next;
        if (next === 0) stopTitleFlash();
        return next;
      });
    } catch {}
  }, [authFetch]);

  // Init audio on first user interaction & stop flashing on focus
  useEffect(() => {
    initAudioOnInteraction();

    const handleFocus = () => {
      stopTitleFlash();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Background alert price checking — runs every 2 min regardless of page
  const alertCheckRef = useRef<NodeJS.Timeout | null>(null);
  const alertCheckingRef = useRef(false);

  const checkAlerts = useCallback(async () => {
    if (!user?.id || alertCheckingRef.current) return;
    alertCheckingRef.current = true;
    try {
      await authFetch("/api/alerts/check", { method: "POST" });
    } catch {}
    finally { alertCheckingRef.current = false; }
  }, [user?.id, authFetch]);

  // Polling: 60s when active, 3min when background
  useEffect(() => {
    if (!authenticated) return;

    const ACTIVE_INTERVAL = 60_000;    // 60s
    const BACKGROUND_INTERVAL = 180_000; // 3min
    const ALERT_CHECK_INTERVAL = 120_000; // 2min

    refreshUnread();
    checkAlerts(); // check alerts on load

    const startPolling = (interval: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(refreshUnread, interval);
    };

    // Alert check runs independently at a fixed 2min interval
    alertCheckRef.current = setInterval(checkAlerts, ALERT_CHECK_INTERVAL);

    const handleVisibility = () => {
      if (document.hidden) {
        startPolling(BACKGROUND_INTERVAL);
      } else {
        refreshUnread();
        checkAlerts(); // also check alerts when tab becomes visible
        startPolling(ACTIVE_INTERVAL);
      }
    };

    startPolling(ACTIVE_INTERVAL);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (alertCheckRef.current) clearInterval(alertCheckRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [authenticated, refreshUnread, checkAlerts]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnread, markAllRead, markRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}
