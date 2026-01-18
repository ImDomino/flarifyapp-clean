"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User, BarChart3, Wallet } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "Feed" },
    { href: "/create", icon: PlusCircle, label: "Create" },
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/admin", icon: BarChart3, label: "Admin" },
  ];

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">F</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
              Flarifyapp
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Mock Wallet Button */}
            <button className="flex items-center space-x-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground hidden sm:inline">
                Demo Mode
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
