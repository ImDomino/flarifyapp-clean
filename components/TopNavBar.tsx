"use client";

import { Search, MessageSquare, ChevronDown } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

export function TopNavBar() {
  const { authenticated, user, login } = usePrivy();
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);

  // Detect scroll for subtle border enhancement
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    loadProfile();
  }, [authenticated, loadProfile]);

  const fallbackDisplayName =
    user?.google?.name || user?.email?.address?.split("@")[0] || "User";
  const displayName =
    profileData?.display_name || profileData?.username || fallbackDisplayName;
  const avatarUrl = profileData?.avatar_url || null;

  return (
    <nav className={`
      fixed top-0 left-0 right-0 h-20 z-50
      bg-[#050505]/95 backdrop-blur-md
      border-b transition-all duration-300
      ${scrolled ? "border-zinc-700/50 shadow-[0_4px_20px_rgba(0,0,0,0.4)]" : "border-zinc-800/50"}
    `}>
      <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div
          className="flex items-center gap-4 cursor-pointer group"
          onClick={() => router.push("/")}
        >
          <div className="w-10 h-10 border-2 border-white flex items-center justify-center bg-black overflow-hidden transition-all duration-200 group-hover:border-zinc-300">
            <img
              src="/logo/twitter.jpg"
              alt="Flarify logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <span className="text-2xl font-black text-white uppercase tracking-tight hidden sm:block group-hover:text-zinc-200 transition-colors">
            Flarify
          </span>
        </div>

        {/* Global Search */}
        <div className="hidden md:flex items-center flex-1 max-w-lg mx-8 lg:mx-12">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-white transition-colors duration-200" />
            <input
              type="text"
              placeholder="SEARCH NETWORK..."
              disabled
              className="w-full bg-[#0a0a0a] border border-zinc-800/60 py-3 pl-12 pr-4 text-sm font-bold uppercase tracking-wider text-white placeholder-zinc-700 focus:outline-none focus:border-white focus:bg-black transition-all duration-200 cursor-not-allowed hover:border-zinc-700/60"
            />
          </div>
        </div>

        {/* User Controls */}
        <div className="flex items-center gap-4 lg:gap-6">
          {authenticated ? (
            <>
              <button className="p-2 text-zinc-500 hover:text-white transition-all duration-200 hidden lg:block relative group">
                <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
              </button>

              <div className="h-7 w-px bg-zinc-800/60 hidden lg:block" />

              <button
                onClick={() => router.push("/profile")}
                className="flex items-center gap-3 group"
              >
                <div className="w-9 h-9 border border-zinc-700/60 group-hover:border-zinc-500 transition-all duration-200 overflow-hidden bg-white flex items-center justify-center">
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
                  <div className="text-xs font-bold text-white uppercase leading-none mb-0.5 group-hover:text-zinc-200 transition-colors">
                    {displayName}
                  </div>
                  <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider leading-none">
                    Trader
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-all duration-200 hidden lg:block" />
              </button>
            </>
          ) : (
            <button
              onClick={login}
              className="px-6 py-2.5 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}