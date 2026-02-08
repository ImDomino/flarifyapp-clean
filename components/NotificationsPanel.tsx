"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Heart, MessageCircle, UserPlus, Check, Loader2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: "like" | "comment" | "follow";
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  post?: {
    id: string;
    content: string;
  };
}

export function NotificationsPanel() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(
        `/api/notifications?user_id=${encodeURIComponent(user.id)}&limit=10`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  }, [user?.id]);

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
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, mark_all: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking notifications read:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (n.type === "follow") {
      router.push(`/user/${n.actor_id}`);
    } else if (n.post_id) {
      router.push(`/post/${n.post_id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />;
      case "comment":
        return <MessageCircle className="w-3.5 h-3.5 text-blue-400" />;
      case "follow":
        return <UserPlus className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getMessage = (n: Notification) => {
    const name = n.actor?.display_name || n.actor?.username || "Someone";
    const postPreview = n.post?.content
      ? n.post.content.length > 30
        ? n.post.content.slice(0, 30) + "…"
        : n.post.content
      : "";

    switch (n.type) {
      case "like":
        return (
          <>
            <strong className="text-slate-200">{name}</strong>
            <span className="text-slate-400"> liked your post</span>
            {postPreview && (
              <span className="text-slate-500 block truncate text-[10px] mt-0.5">"{postPreview}"</span>
            )}
          </>
        );
      case "comment":
        return (
          <>
            <strong className="text-slate-200">{name}</strong>
            <span className="text-slate-400"> commented</span>
            {postPreview && (
              <span className="text-slate-500 block truncate text-[10px] mt-0.5">"{postPreview}"</span>
            )}
          </>
        );
      case "follow":
        return (
          <>
            <strong className="text-slate-200">{name}</strong>
            <span className="text-slate-400"> followed you</span>
          </>
        );
      default:
        return <strong className="text-slate-200">{name}</strong>;
    }
  };

  if (!authenticated) return null;

  return (
    <div className="rounded-xl bg-base-900/70 backdrop-blur border border-white/5 shadow-soft overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-300" />
          <h3 className="font-display text-sm font-semibold text-slate-200">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={isLoading}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Read all
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Bell className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <p className="text-xs text-slate-500">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-white/5 transition border-b border-white/[0.03] last:border-b-0 ${
                !n.read ? "bg-blue-500/[0.04]" : ""
              }`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/30 to-teal-400/25 flex items-center justify-center overflow-hidden mt-0.5">
                {n.actor?.avatar_url ? (
                  <img
                    src={n.actor.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] font-bold text-blue-200">
                    {(n.actor?.display_name || n.actor?.username || "?")[0].toUpperCase()}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5">
                  <div className="mt-0.5 flex-shrink-0">{getIcon(n.type)}</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                    {getMessage(n)}
                  </p>
                </div>
                <p className="text-[9px] text-slate-600 mt-0.5 ml-5">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Unread dot */}
              {!n.read && (
                <div className="flex-shrink-0 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
