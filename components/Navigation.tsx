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
  const handle = '@' + username.toLowerCase().replace(/\s+/g, '');

  return (
    <>
      {/* Sidebar Navigation */}
      <div className="fixed left-[17.5px] top-1/2 -translate-y-1/2 z-50">
        <div className="w-20 h-[350px] bg-card border border-border rounded-[29px] card-shadow flex flex-col items-center justify-center gap-8 py-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-center transition-all hover:scale-105 ${
                  isActive
                    ? "text-[#140106]"
                    : "text-[#C2C2C2] hover:text-[#140106]"
                }`}
                title={item.label}
              >
                <item.icon className="w-10 h-10" strokeWidth={isActive ? 2 : 2} />
              </Link>
            );
          })}
        </div>
      </div>
          {authenticated && (
            <div className="fixed right-8 top-8 z-50">
              <BalanceDisplay />
            </div>
          )}
      {/* User Profile Card (bottom left) */}
      {authenticated && (
        <div className="fixed left-[17.5px] bottom-8 z-50">
          <div className="bg-card border border-border rounded-[20px] card-shadow w-[200px]">
            <button
              onClick={() => router.push('/profile')}
              className="p-4 flex items-center gap-3 hover:bg-accent/30 transition-all w-full"
            >
              <div className="w-[50px] h-[50px] rounded-full bg-[#C2C2C2] flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-white">
                  {username[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-sm truncate" style={{ color: '#140106', letterSpacing: '-1px' }}>
                  {username}
                </p>
                <p className="text-xs truncate" style={{ color: '#989898', letterSpacing: '0px' }}>
                  {handle}
                </p>
              </div>
            </button>
            
            {/* Logout Button */}
            <div className="border-t border-border">
              <button
                onClick={handleLogout}
                className="p-3 flex items-center gap-2 hover:bg-red-500/10 transition-all w-full text-left"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-500" style={{ letterSpacing: '-1px' }}>
                  Logout
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
