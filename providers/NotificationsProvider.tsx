"use client";

import {
  createContext, useContext, useState, useCallback, useEffect, useRef,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { createClient } from "@/lib/supabase/client";
import {
  playNotificationSound,
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
  const prevUnreadRef = useRef(0);
  const initialFetchDoneRef = useRef(false);

  const refreshUnread = useCallback(async () => {
    if (!user?.id || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await authFetch("/api/notifications?unread_only=true&limit=1");
      const data = await res.json();
      const newCount = data.unread_count || 0;

      // Play sound when new notifications arrive (not on first fetch)
      if (initialFetchDoneRef.current && newCount > prevUnreadRef.current) {
        playNotificationSound();
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
        return next;
      });
    } catch {}
  }, [authFetch]);

  // Init audio on first user interaction
  useEffect(() => {
    initAudioOnInteraction();
  }, []);

  // ── Supabase Realtime subscription (instant in-app notifications) ──
  useEffect(() => {
    if (!authenticated || !user?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on("broadcast", { event: "new_notification" }, () => {
        refreshUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authenticated, user?.id, refreshUnread]);

  // ── Fetch on mount + refresh when tab becomes visible (no polling) ──
  useEffect(() => {
    if (!authenticated) return;

    refreshUnread();

    const handleVisibility = () => {
      if (!document.hidden) {
        refreshUnread();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [authenticated, refreshUnread]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnread, markAllRead, markRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}
