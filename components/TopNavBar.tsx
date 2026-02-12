"use client";

import { Search, Bell, MessageSquare, ChevronDown } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

export function TopNavBar() {
  const { authenticated, user, login } = usePrivy();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileData, setProfileData] = useState<any>(null);

  const fetchUnread = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(
        `/api/notifications?user_id=${encodeURIComponent(
          user.id
        )}&unread_only=true&limit=1`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setUnreadCount(data.unread_count || 0);
    } catch {
      /* silent */
    }
  }, [user?.id]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(
        `/api/profile?user_id=${encodeURIComponent(user.id)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.profile) setProfileData(data.profile);
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authenticated) return;
    fetchUnread();
    loadProfile();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [authenticated, fetchUnread, loadProfile]);

  const fallbackDisplayName =
    user?.google?.name || user?.email?.address?.split("@")[0] || "User";

  const displayName =
    profileData?.display_name ||
    profileData?.username ||
    fallbackDisplayName;

  const avatarUrl = profileData?.avatar_url || null;

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-[#050505]/95 backdrop-blur-sm border-b border-zinc-800 z-50">
      <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => router.push("/")}
        >
          <div className="w-10 h-10 border-2 border-white flex items-center justify-center bg-black">
            <img
              src="/logo/twitter.jpg"   
              alt="Flarify logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <span className="text-2xl font-black text-white uppercase tracking-tight hidden sm:block">
            Flarify
          </span>
        </div>

        {/* Global Search */}
        <div className="hidden md:flex items-center flex-1 max-w-lg mx-8 lg:mx-12">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="SEARCH NETWORK..."
              disabled
              className="w-full bg-[#0a0a0a] border border-zinc-800 py-3 pl-12 pr-4 text-sm font-bold uppercase tracking-wider text-white placeholder-zinc-700 focus:outline-none focus:border-white focus:bg-black transition-all cursor-not-allowed"
            />
          </div>
        </div>

        {/* User Controls */}
        <div className="flex items-center gap-4 lg:gap-6">
          {authenticated ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/profile")}
                  className="relative p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <Bell className="w-5 h-5 lg:w-6 lg:h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-white border border-black" />
                  )}
                </button>
                <button className="p-2 text-zinc-400 hover:text-white transition-colors hidden lg:block">
                  <MessageSquare className="w-6 h-6" />
                </button>
              </div>

              <div className="h-8 w-px bg-zinc-800 hidden lg:block" />

              <button
                onClick={() => router.push("/profile")}
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 border border-zinc-700 group-hover:border-white transition-colors overflow-hidden bg-white flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-black text-black uppercase">
                      {displayName[0]}
                    </span>
                  )}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-sm font-bold text-white uppercase leading-none mb-1">
                    {displayName}
                  </div>
                  <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider leading-none">
                    Trader
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors hidden lg:block" />
              </button>
            </>
          ) : (
            <button
              onClick={login}
              className="px-6 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
