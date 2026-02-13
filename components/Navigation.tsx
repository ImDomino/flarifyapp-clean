"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Hash, Bookmark, List, User, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { NotificationsPanel } from "./NotificationsPanel";

export function NavigationSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, user, logout, login } = usePrivy();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/create", icon: Hash, label: "Create", disabled: false },
    { href: "#", icon: Bookmark, label: "Saved", disabled: true },
    { href: "#", icon: List, label: "Lists", disabled: true },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await logout();
      router.push("/");
    }
  };

  return (
    <aside className="col-span-3 lg:col-span-2 hidden md:block pt-6 lg:pt-8">
      <div className="sticky top-28">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.disabled ? "#" : item.href}
                className={`flex items-center gap-4 px-4 py-4 font-bold uppercase tracking-wider text-sm transition-all border ${
                  isActive
                    ? "bg-white text-black border-white"
                    : "text-zinc-500 hover:text-white border-transparent hover:border-zinc-800 hover:bg-[#111]"
                } ${item.disabled ? "opacity-30 cursor-not-allowed" : ""}`}
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Create Post Button */}
        <div className="mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-zinc-900">
          {authenticated ? (
            <Link
              href="/create"
              className="flex w-full items-center justify-center py-4 bg-transparent border-2 border-zinc-700 text-white font-black uppercase tracking-widest text-sm hover:bg-white hover:text-black hover:border-white transition-all duration-300"
            >
              Create Post
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
          <div className="mt-6">
            <NotificationsPanel />
          </div>
        )}

        {/* Logout */}
        {authenticated && (
          <button
            onClick={handleLogout}
            className="mt-6 flex items-center gap-3 px-4 py-3 text-zinc-600 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">Logout</span>
          </button>
        )}
      </div>
    </aside>
  );
}