"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Heart, MessageCircle, UserPlus, Check, Loader2, TrendingUp } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useAuthFetch } from "@/hooks/useAuthFetch";

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: "like" | "comment" | "follow" | "price_alert" | "message";
  post_id: string | null;
  content: string | null;
  read: boolean;
  created_at: string;
  actor?: { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
  post?: { id: string; content: string };
}

export function NotificationsPanel() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      // SECURITY: auth token sent, server filters by JWT userId (no user_id in URL)
      const res = await authFetch(`/api/notifications?limit=10`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) { console.error("Error fetching notifications:", err); }
  }, [user?.id, authFetch]);

  useEffect(() => {
    if (!authenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [authenticated, fetchNotifications]);

  const markAllRead = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // SECURITY: user_id removed — server extracts from JWT
      await authFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) { console.error("Error marking notifications read:", err); }
    finally { setIsLoading(false); }
  };

  const handleNotificationClick = (n: Notification) => {
    if (n.type === "price_alert" && n.content) {
      try {
        const data = JSON.parse(n.content);
        if (data.condition_id) {
          router.push(`/market/${data.condition_id}`);
          return;
        }
      } catch {}
    }
    if (n.type === "follow") router.push(`/user/${n.actor_id}`);
    else if (n.post_id) router.push(`/post/${n.post_id}`);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <Heart className="w-3 h-3 fill-current" />;
      case "comment": return <MessageCircle className="w-3 h-3" />;
      case "follow": return <UserPlus className="w-3 h-3" />;
      case "price_alert": return <TrendingUp className="w-3 h-3" />;
      default: return <Bell className="w-3 h-3" />;
    }
  };

  const getMessage = (n: Notification) => {
    if (n.type === "price_alert" && n.content) {
      try {
        const data = JSON.parse(n.content);
        return <span className="text-zinc-400">{data.message || "Price alert triggered"}</span>;
      } catch {}
      return <span className="text-zinc-400">Price alert triggered</span>;
    }
    const name = n.actor?.display_name || n.actor?.username || "Someone";
    switch (n.type) {
      case "like": return <><span className="text-white font-bold">{name}</span><span className="text-zinc-500"> liked your post</span></>;
      case "comment": return <><span className="text-white font-bold">{name}</span><span className="text-zinc-500"> commented</span></>;
      case "follow": return <><span className="text-white font-bold">{name}</span><span className="text-zinc-500"> followed you</span></>;
      default: return <span className="text-white font-bold">{name}</span>;
    }
  };

  if (!authenticated) return null;

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Notifications</span>
            {unreadCount > 0 && (
              <span className="min-w-[16px] h-4 flex items-center justify-center bg-white text-black text-[9px] font-black px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} disabled={isLoading} className="p-1 text-zinc-600 hover:text-white transition-colors" title="Mark all read">
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="text-center py-6 px-3">
            <Bell className="w-4 h-4 mx-auto mb-1.5 text-zinc-700" />
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-bold">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button key={n.id} onClick={() => handleNotificationClick(n)}
              className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-b border-zinc-900 last:border-b-0 hover:bg-[#111] transition-colors ${!n.read ? "bg-[#0d0d0d]" : ""}`}>
              <div className={`mt-0.5 flex-shrink-0 ${!n.read ? "text-white" : "text-zinc-600"}`}>{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] leading-relaxed line-clamp-2">{getMessage(n)}</p>
                <p className="text-[9px] text-zinc-700 font-mono mt-0.5 uppercase">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: false })}
                </p>
              </div>
              {!n.read && <div className="flex-shrink-0 mt-1.5"><div className="w-1.5 h-1.5 bg-white" /></div>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
