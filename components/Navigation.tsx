"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, PenSquare, User, Settings, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { NotificationsPanel } from "./NotificationsPanel";

export function NavigationSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, user, logout, login } = usePrivy();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/create", icon: PenSquare, label: "Post" },
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await logout();
      router.push("/");
    }
  };

  const username = user?.google?.name || user?.email?.address?.split("@")[0] || "User";

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col gap-4">
        <div className="rounded-xl bg-base-900/70 backdrop-blur border border-white/5 shadow-soft overflow-hidden">
          {/* Logo */}
          <div className="px-5 pt-5 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-teal-500/20 border border-white/10 flex items-center justify-center shadow-soft">
                <span className="font-display font-bold tracking-tight text-lg text-blue-200">F</span>
              </div>
              <div>
                <div className="font-display font-semibold tracking-tight text-lg">Flarify</div>
                <div className="text-xs text-slate-400">Prediction Market Social</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? "text-slate-200 bg-white/5 border border-white/5"
                      : "text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className={`text-lg ${isActive ? "text-blue-300" : "text-slate-400 group-hover:text-blue-300"} transition`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          {authenticated && (
            <div className="p-4 border-t border-white/5">
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-sm text-rose-300 hover:text-rose-200 transition"
              >
                <LogOut className="text-lg" />
                Logout
              </button>
            </div>
          )}

          {!authenticated && (
            <div className="p-4 border-t border-white/5">
              <button
                onClick={login}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
              >
                Sign in with Google
              </button>
            </div>
          )}
        </div>

        {authenticated && <NotificationsPanel />}
      </aside>

    </>
  );
}
