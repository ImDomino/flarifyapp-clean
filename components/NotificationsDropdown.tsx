"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

export function NotificationsDropdown() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(
        `/api/notifications?user_id=${encodeURIComponent(user.id)}&limit=20`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  }, [user?.id]);

  // Poll every 30s
  useEffect(() => {
    if (!authenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [authenticated, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-teal-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const getMessage = (n: Notification) => {
    const name =
      n.actor?.display_name || n.actor?.username || "Someone";
    const postPreview = n.post?.content
      ? n.post.content.length > 40
        ? n.post.content.slice(0, 40) + "..."
        : n.post.content
      : "";

    switch (n.type) {
      case "like":
        return (
          <>
            <strong>{name}</strong> liked your post
            {postPreview && (
              <span className="text-slate-500"> "{postPreview}"</span>
            )}
          </>
        );
      case "comment":
        return (
          <>
            <strong>{name}</strong> commented on your post
            {postPreview && (
              <span className="text-slate-500"> "{postPreview}"</span>
            )}
          </>
        );
      case "follow":
        return (
          <>
            <strong>{name}</strong> started following you
          </>
        );
      default:
        return <strong>{name}</strong>;
    }
  };

  if (!authenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-lg hover:bg-white/5 transition"
      >
        <Bell className="w-5 h-5 text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-base-900 border border-white/10 rounded-xl shadow-2xl z-50 max-h-[70vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="font-display text-sm font-semibold text-slate-200">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={isLoading}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition"
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Bell className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                <p className="text-sm text-slate-500">No notifications yet</p>
                <p className="text-xs text-slate-600 mt-1">
                  When someone likes, comments, or follows you, it'll show up here
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition border-b border-white/5 last:border-b-0 ${
                    !n.read ? "bg-blue-500/5" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-teal-400/25 flex items-center justify-center overflow-hidden">
                    {n.actor?.avatar_url ? (
                      <img
                        src={n.actor.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-blue-200">
                        {(n.actor?.display_name || n.actor?.username || "?")[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{getIcon(n.type)}</div>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                        {getMessage(n)}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="flex-shrink-0 mt-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
