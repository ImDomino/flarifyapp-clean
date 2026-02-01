"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Briefcase, Settings, MessageCircle, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { BalanceDisplay } from "./BalanceDisplay";

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, user, logout } = usePrivy();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/create", icon: MessageCircle, label: "Post" },
    { href: "/profile", icon: Briefcase, label: "Profile" },
    { href: "/admin", icon: Settings, label: "Settings" },
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
      router.push('/');
    }
  };

  const username = user?.google?.name || user?.email?.address?.split('@')[0] || 'Unknown';

  return (
    <>
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-0 h-full w-20 lg:w-72 bg-sidebar border-r border-sidebar-border p-4 flex flex-col z-50">
        {/* Logo / Title */}
        <div className="hidden lg:block mb-8 px-2">
          <h1 className="text-2xl font-bold text-gradient-blue-aqua">
            Flarify
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Prediction Market Social</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all relative group ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#2A56F2]/20 to-[#9DFECB]/20 rounded-2xl" />
                )}
                <item.icon className="w-6 h-6 relative z-10 transition-transform group-hover:scale-110" />
                <span className="hidden lg:block relative z-10 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Balance (Desktop only) */}
        {authenticated && (
          <div className="hidden lg:block mb-4 px-2">
            <BalanceDisplay />
          </div>
        )}

        {/* User Profile Card */}
        {authenticated && (
          <div className="border-t border-sidebar-border pt-4">
            <button
              onClick={() => router.push('/profile')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-sidebar-accent/50 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2A56F2] to-[#9DFECB] flex items-center justify-center text-sm font-semibold text-white">
                {username[0].toUpperCase()}
              </div>
              <div className="hidden lg:block flex-1 text-left">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{username}</p>
                <p className="text-xs text-muted-foreground">@{username.toLowerCase().replace(/\s+/g, '')}</p>
              </div>
            </button>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center lg:justify-start gap-3 mt-2 px-4 py-3 rounded-2xl text-destructive hover:bg-destructive/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden lg:block font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* Main content padding */}
      <div className="pl-20 lg:pl-72" />

      {/* Mobile Balance (top right) */}
      {authenticated && (
        <div className="lg:hidden fixed right-4 top-4 z-50">
          <BalanceDisplay />
        </div>
      )}
    </>
  );
}
