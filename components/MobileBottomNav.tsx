"use client";

import { useState, useEffect, useCallback } from "react";
import { Home, Search, Plus, Bell, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, authenticated } = usePrivy();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(
        `/api/notifications?user_id=${encodeURIComponent(user.id)}&unread_only=true&limit=1`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setUnreadCount(data.unread_count || 0);
    } catch {
      // silently fail
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authenticated) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [authenticated, fetchUnread]);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 h-20 bg-base-950/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 z-50">
      <Link
        href="/"
        className={`flex flex-col items-center gap-1 ${
          isActive("/") ? "text-blue-400" : "text-slate-500"
        }`}
      >
        <Home className="w-6 h-6" />
      </Link>

      <Link
        href="#"
        className="flex flex-col items-center gap-1 text-slate-500 opacity-50"
      >
        <Search className="w-6 h-6" />
      </Link>

      {/* Floating post button */}
      <div className="-mt-10">
        <Link
          href="/create"
          className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/40"
        >
          <Plus className="w-7 h-7" />
        </Link>
      </div>

      <Link
        href="/profile"
        className="relative flex flex-col items-center gap-1 text-slate-500"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white px-0.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>

      <Link
        href="/profile"
        className={`flex flex-col items-center gap-1 ${
          isActive("/profile") ? "text-blue-400" : "text-slate-500"
        }`}
      >
        <User className="w-6 h-6" />
      </Link>
    </nav>
  );
}
