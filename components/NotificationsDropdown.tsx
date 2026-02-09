"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Heart, MessageCircle, UserPlus, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow";
  message: string;
  is_read: boolean;
  created_at: string;
  actor_id?: string;
  post_id?: string;
}

export function NotificationsDropdown() {
  const { user } = usePrivy();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/notifications?user_id=${encodeURIComponent(user.id)}&limit=20`, { cache: "no-store" });
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch { /* silent */ }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <Heart className="w-4 h-4" />;
      case "comment": return <MessageCircle className="w-4 h-4" />;
      case "follow": return <UserPlus className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const handleNotifClick = (notif: Notification) => {
    if (notif.post_id) router.push(`/post/${notif.post_id}`);
    else if (notif.actor_id) router.push(`/user/${notif.actor_id}`);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-white border border-black" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0a0a0a] border-2 border-white z-50 max-h-96 overflow-hidden">
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white" />

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h3 className="font-black text-sm uppercase tracking-wider">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white">
                  Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-72 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold">No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full text-left p-4 border-b border-zinc-900 hover:bg-[#111] transition-colors flex items-start gap-3 ${
                    !notif.is_read ? "bg-[#0d0d0d]" : ""
                  }`}
                >
                  <div className={`mt-0.5 ${!notif.is_read ? "text-white" : "text-zinc-600"}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-zinc-600 font-mono mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }).toUpperCase()}
                    </p>
                  </div>
                  {!notif.is_read && <div className="w-2 h-2 bg-white flex-shrink-0 mt-1" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
