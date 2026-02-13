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
        return <Heart className="w-3.5 h-3.5 fill-current" />;
      case "comment":
        return <MessageCircle className="w-3.5 h-3.5" />;
      case "follow":
        return <UserPlus className="w-3.5 h-3.5" />;
      default:
        return <Bell className="w-3.5 h-3.5" />;
    }
  };

  const getMessage = (n: Notification) => {
    const name = n.actor?.display_name || n.actor?.username || "Someone";
    const postPreview = n.post?.content
      ? n.post.content.length > 25
        ? n.post.content.slice(0, 25) + "…"
        : n.post.content
      : "";

    switch (n.type) {
      case "like":
        return (
          <>
            <span className="text-white font-bold">{name}</span>
            <span className="text-zinc-500"> liked your post</span>
            {postPreview && (
              <span className="text-zinc-600 block truncate text-[10px] mt-0.5">
                "{postPreview}"
              </span>
            )}
          </>
        );
      case "comment":
        return (
          <>
            <span className="text-white font-bold">{name}</span>
            <span className="text-zinc-500"> commented</span>
            {postPreview && (
              <span className="text-zinc-600 block truncate text-[10px] mt-0.5">
                "{postPreview}"
              </span>
            )}
          </>
        );
      case "follow":
        return (
          <>
            <span className="text-white font-bold">{name}</span>
            <span className="text-zinc-500"> followed you</span>
          </>
        );
      default:
        return <span className="text-white font-bold">{name}</span>;
    }
  };

  if (!authenticated) return null;

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-white text-black text-[10px] font-black px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={isLoading}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-white font-bold uppercase tracking-wider transition-colors"
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

      {/* List */}
      <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Bell className="w-5 h-5 mx-auto mb-2 text-zinc-700" />
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
              No notifications
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-zinc-900 last:border-b-0 hover:bg-[#111] transition-colors ${
                !n.read ? "bg-[#0d0d0d]" : ""
              }`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 w-7 h-7 border border-zinc-700 bg-zinc-900 flex items-center justify-center overflow-hidden mt-0.5">
                {n.actor?.avatar_url ? (
                  <img
                    src={n.actor.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] font-black text-white uppercase">
                    {(
                      n.actor?.display_name ||
                      n.actor?.username ||
                      "?"
                    )[0].toUpperCase()}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5">
                  <div
                    className={`mt-0.5 flex-shrink-0 ${
                      !n.read ? "text-white" : "text-zinc-600"
                    }`}
                  >
                    {getIcon(n.type)}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                    {getMessage(n)}
                  </p>
                </div>
                <p className="text-[9px] text-zinc-700 font-mono mt-1 ml-5 uppercase">
                  {formatDistanceToNow(new Date(n.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              {/* Unread indicator */}
              {!n.read && (
                <div className="flex-shrink-0 mt-2">
                  <div className="w-1.5 h-1.5 bg-white" />
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}