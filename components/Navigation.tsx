"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, User, Search, Bookmark, LogOut, MessageCircle, Bell, Settings, Loader2 } from "lucide-react";
import { useMessages } from "@/providers/MessagesProvider";
import { usePrivy } from "@privy-io/react-auth";
import { NotificationsPanel } from "./NotificationsPanel";

export function NavigationSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, user, logout, login } = usePrivy();
  const { unreadCount: unreadMessages } = useMessages();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/messages", icon: MessageCircle, label: "Messages", badge: unreadMessages },
    { href: "/alerts", icon: Bell, label: "Alerts" },
    { href: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/");
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <>
      <aside className="col-span-3 lg:col-span-2 hidden md:block pt-6 lg:pt-8">
        <div className="sticky top-28">
          <nav className="flex flex-col gap-1">
            {navItems.map((item, i) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`
                    flex items-center gap-4 px-4 py-3.5 font-bold uppercase tracking-wider text-sm
                    transition-all duration-200 border relative group
                    animate-fade-up
                    ${isActive
                      ? "bg-white text-black border-white"
                      : "text-zinc-500 hover:text-white border-transparent hover:border-zinc-800/60 hover:bg-white/[0.02]"
                    }
                  `}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${!isActive ? "group-hover:scale-110" : ""}`} />
                    {(item as any).badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center bg-white text-black text-[9px] font-black px-1 animate-scale-in">
                        {(item as any).badge > 99 ? "99+" : (item as any).badge}
                      </span>
                    )}
                  </div>
                  <span className="hidden lg:inline">{item.label}</span>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-black lg:hidden" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Create Post Button */}
          <div className="mt-8 lg:mt-10 pt-6 lg:pt-8 border-t border-zinc-800/40 animate-fade-up stagger-6">
            {authenticated ? (
              <Link
                href="/create"
                className="flex w-full items-center justify-center py-4 bg-transparent border-2 border-zinc-700/60 text-white font-black uppercase tracking-widest text-sm hover:bg-white hover:text-black hover:border-white transition-all duration-300 relative overflow-hidden group"
              >
                <span className="relative z-10">Create Post</span>
                <div className="absolute inset-0 bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <span className="absolute inset-0 flex items-center justify-center font-black uppercase tracking-widest text-sm text-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                  Create Post
                </span>
              </Link>
            ) : (
              <button
                onClick={login}
                className="flex w-full items-center justify-center py-4 bg-white text-black border-2 border-white font-black uppercase tracking-widest text-sm hover:bg-black hover:text-white transition-all duration-300"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Notifications Panel */}
          {authenticated && (
            <div className="mt-6 animate-fade-up stagger-7">
              <NotificationsPanel />
            </div>
          )}

          {/* Logout */}
          {authenticated && (
            <button
              onClick={() => setShowLogoutModal(true)}
              className="mt-6 flex items-center gap-3 px-4 py-3 text-zinc-700 hover:text-red-400 text-xs font-bold uppercase tracking-wider transition-all duration-200 group animate-fade-in stagger-8"
            >
              <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
              <span className="hidden lg:inline">Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-zinc-800/60 w-full max-w-sm relative overflow-hidden animate-scale-in">
            <div className="absolute inset-0 grid-bg-animated opacity-5 pointer-events-none" />
            <div className="relative z-10 p-6">
              <div className="w-12 h-12 mx-auto mb-4 border-2 border-zinc-700/50 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-center mb-2">
                Log Out
              </h3>
              <p className="text-sm text-zinc-500 text-center mb-6">
                Are you sure you want to log out of your account?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 py-3 bg-white text-black font-black uppercase tracking-wider text-xs border-2 border-white hover:bg-black hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isLoggingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
