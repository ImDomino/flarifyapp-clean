"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Heart, MessageCircle, UserPlus, Check } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { stopTitleFlash } from "@/lib/notification-effects";

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: "like" | "comment" | "follow";
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor?: { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
  post?: { id: string; content: string };
}

export function NotificationsDropdown() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      // SECURITY: auth token sent, server filters by JWT userId
      const res = await authFetch(`/api/notifications?limit=20`);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) { console.error("Error:", err); }
  }, [user?.id, authFetch]);

  useEffect(() => {
    if (!authenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [authenticated, fetchNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      await authFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      stopTitleFlash();
    } catch {}
  };

  const handleClick = (n: Notification) => {
    setIsOpen(false);
    if (n.type === "follow") router.push(`/user/${n.actor_id}`);
    else if (n.post_id) router.push(`/post/${n.post_id}`);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <Heart className="w-3 h-3 fill-current" />;
      case "comment": return <MessageCircle className="w-3 h-3" />;
      case "follow": return <UserPlus className="w-3 h-3" />;
      default: return <Bell className="w-3 h-3" />;
    }
  };

  const getMessage = (n: Notification) => {
    const name = n.actor?.display_name || n.actor?.username || "Someone";
    switch (n.type) {
      case "like": return `${name} liked your post`;
      case "comment": return `${name} commented on your post`;
      case "follow": return `${name} followed you`;
      default: return name;
    }
  };

  if (!authenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 text-zinc-400 hover:text-white transition-colors">
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-white text-black text-[10px] font-black px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0a0a0a] border border-zinc-800 z-50 shadow-xl">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-zinc-500 hover:text-white font-bold uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-5 h-5 mx-auto mb-2 text-zinc-700" />
                <p className="text-xs text-zinc-700 uppercase tracking-widest font-bold">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-zinc-900 last:border-b-0 hover:bg-[#111] transition-colors ${!n.read ? "bg-[#0d0d0d]" : ""}`}>
                  <div className={`mt-0.5 flex-shrink-0 ${!n.read ? "text-white" : "text-zinc-600"}`}>{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed text-zinc-300 line-clamp-2">{getMessage(n)}</p>
                    <p className="text-[10px] text-zinc-700 font-mono mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && <div className="flex-shrink-0 mt-1.5"><div className="w-1.5 h-1.5 bg-white" /></div>}
                </button>
              ))
            )}
          </div>
          {notifications.length > 0 && (
            <div className="border-t border-zinc-800 px-4 py-2.5 text-center">
              <button onClick={() => { setIsOpen(false); router.push("/notifications"); }}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
                View All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
