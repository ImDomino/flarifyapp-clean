"use client";

import { useEffect, useState, useCallback } from "react";
import { Home, Search, PlusSquare, Bell, User } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated, user, login } = usePrivy();
  const authFetch = useAuthFetch();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user?.id) return;
    try {
      // SECURITY: auth token sent, server returns only this user's count
      const res = await authFetch(`/api/notifications?unread_only=true&limit=1`);
      const data = await res.json();
      setUnreadCount(data.unread_count || 0);
    } catch {}
  }, [user?.id, authFetch]);

  useEffect(() => {
    if (!authenticated) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [authenticated, fetchUnread]);

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { icon: Home, path: "/", label: "Home" },
    { icon: Search, path: "/explore", label: "Explore" },
    { icon: PlusSquare, path: "/create", label: "Create", requiresAuth: true },
    { icon: Bell, path: "/notifications", label: "Alerts", badge: unreadCount > 0 ? unreadCount : undefined, requiresAuth: true },
    { icon: User, path: "/profile", label: "Profile", requiresAuth: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-sm border-t border-zinc-800 z-50 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button key={item.path}
              onClick={() => {
                if (item.requiresAuth && !authenticated) { login(); return; }
                router.push(item.path);
              }}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-full relative transition-colors ${
                active ? "text-white" : "text-zinc-600 hover:text-zinc-400"
              }`}>
              <div className="relative">
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[14px] h-3.5 flex items-center justify-center bg-white text-black text-[8px] font-black px-0.5">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] uppercase tracking-widest ${active ? "font-black" : "font-medium"}`}>
                {item.label}
              </span>
              {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-white" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
