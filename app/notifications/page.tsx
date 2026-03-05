"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import {
  Heart, MessageCircle, UserPlus, Bell,
  CheckCheck, Shield, Loader2,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { formatDistanceToNow } from "date-fns";

interface NotificationItem {
  id: string;
  type: string; // "like" | "comment" | "follow"
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor_id: string;
  actor: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  } | null;
  post?: {
    id: string;
    content: string;
  } | null;
}

const typeConfig: Record<string, { icon: typeof Heart; label: string; color: string }> = {
  like: { icon: Heart, label: "liked your post", color: "text-pink-400" },
  comment: { icon: MessageCircle, label: "commented on your post", color: "text-blue-400" },
  follow: { icon: UserPlus, label: "started following you", color: "text-emerald-400" },
};

export default function NotificationsPage() {
  const { authenticated, login } = usePrivy();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await authFetch("/api/notifications?limit=50");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (authenticated) loadNotifications();
  }, [authenticated, loadNotifications]);

  const markAllRead = async () => {
    try {
      await authFetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  const handleClick = async (notif: NotificationItem) => {
    // Mark individual as read
    if (!notif.read) {
      try {
        await authFetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notification_ids: [notif.id] }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }

    // Navigate based on type
    if (notif.type === "follow") {
      router.push(`/user/${notif.actor_id}`);
    } else if (notif.post_id) {
      router.push(`/post/${notif.post_id}`);
    }
  };

  // ── Not authenticated ──
  if (!authenticated) {
    return (
      <div className="text-center py-12 animate-scale-in">
        <div className="bg-[#0a0a0a] border border-zinc-800/60 p-12 corner-accent relative overflow-hidden">
          <div className="absolute inset-0 grid-bg-animated opacity-10" />
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 border-2 border-zinc-700/50 flex items-center justify-center animate-float">
              <Shield className="w-8 h-8 text-zinc-500" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-wider mb-4">Sign In Required</h1>
            <p className="text-sm text-zinc-500 uppercase tracking-wide mb-6">
              Sign in to view your notifications
            </p>
            <button
              onClick={login}
              className="px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Group notifications by date ──
  const groupByDate = (notifs: NotificationItem[]) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { label: string; items: NotificationItem[] }[] = [];
    const todayItems: NotificationItem[] = [];
    const yesterdayItems: NotificationItem[] = [];
    const olderItems: NotificationItem[] = [];

    for (const n of notifs) {
      const d = new Date(n.created_at);
      if (d.toDateString() === today.toDateString()) {
        todayItems.push(n);
      } else if (d.toDateString() === yesterday.toDateString()) {
        yesterdayItems.push(n);
      } else {
        olderItems.push(n);
      }
    }

    if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: "Yesterday", items: yesterdayItems });
    if (olderItems.length > 0) groups.push({ label: "Earlier", items: olderItems });

    return groups;
  };

  const groups = groupByDate(notifications);

  return (
    <PageTransition>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-zinc-700/60 text-zinc-400 hover:border-white/60 hover:text-white hover:bg-white/[0.03] transition-all duration-300"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-[#0a0a0a] border border-zinc-800/50 p-4 animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 shimmer-bg rounded-sm" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-48 shimmer-bg" />
                  <div className="h-2.5 w-24 shimmer-bg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && notifications.length === 0 && (
        <div className="bg-[#0a0a0a] border border-zinc-800/60 p-10 sm:p-16 text-center animate-scale-in corner-accent relative overflow-hidden">
          <div className="absolute inset-0 grid-bg-animated opacity-10" />
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700/50 flex items-center justify-center animate-float">
              <Bell className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-wider mb-2">No Notifications Yet</h3>
            <p className="text-sm text-zinc-500 uppercase tracking-wide">
              When someone likes, comments, or follows you — it will show up here
            </p>
          </div>
        </div>
      )}

      {/* Notification Groups */}
      {!isLoading && groups.map((group, gi) => (
        <div key={group.label} className="animate-fade-up" style={{ animationDelay: `${gi * 0.1}s` }}>
          {/* Group Label */}
          <div className="flex items-center gap-3 mb-2 px-1">
            <div className="w-1 h-3.5 bg-white/15" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {group.label}
            </span>
          </div>

          {/* Notification Items */}
          <div className="space-y-1">
            {group.items.map((notif, i) => {
              const config = typeConfig[notif.type] || typeConfig.like;
              const Icon = config.icon;
              const actorName =
                notif.actor?.display_name || notif.actor?.username || "Someone";
              const timeAgo = formatDistanceToNow(new Date(notif.created_at), {
                addSuffix: false,
              });

              // Truncate post content for preview
              const postPreview = notif.post?.content
                ? notif.post.content.length > 60
                  ? notif.post.content.slice(0, 60) + "…"
                  : notif.post.content
                : null;

              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`
                    w-full text-left flex items-start gap-3 p-3.5 sm:p-4
                    border transition-all duration-200 group relative
                    ${
                      notif.read
                        ? "bg-[#0a0a0a] border-zinc-800/40 hover:border-zinc-700/50"
                        : "bg-[#0c0c0c] border-zinc-800/60 hover:border-zinc-600/50"
                    }
                  `}
                >
                  {/* Unread indicator */}
                  {!notif.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white/40 accent-pulse" />
                  )}

                  {/* Actor Avatar */}
                  <div className="w-9 h-9 flex-shrink-0 border border-zinc-700/60 overflow-hidden group-hover:border-zinc-600 transition-colors">
                    {notif.actor?.avatar_url ? (
                      <img
                        src={notif.actor.avatar_url}
                        alt={actorName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <span className="text-[10px] font-black text-white uppercase">
                          {actorName[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className={`font-black uppercase text-[12px] tracking-wide ${notif.read ? "text-zinc-400" : "text-white"}`}>
                            {actorName}
                          </span>{" "}
                          <span className={`${notif.read ? "text-zinc-600" : "text-zinc-400"} text-[12px]`}>
                            {config.label}
                          </span>
                        </p>

                        {/* Post preview */}
                        {postPreview && (
                          <p className="text-[11px] text-zinc-600 mt-1 truncate leading-relaxed">
                            "{postPreview}"
                          </p>
                        )}

                        <span className="text-[10px] text-zinc-700 font-mono mt-1 inline-block">
                          {timeAgo.toUpperCase()}
                        </span>
                      </div>

                      {/* Type Icon */}
                      <div className={`p-1.5 flex-shrink-0 ${config.color} opacity-60`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
    </PageTransition>
  );
}