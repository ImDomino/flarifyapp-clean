"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, PenSquare, User, Settings, Wallet, LogOut, ArrowRight } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { DepositModal } from "./DepositModal";
import { useWallet } from "@/providers/WalletProvider";
import { useSafeDeployment } from "@/hooks/useSafeDeployment";
import { useBalances } from "@/hooks/useBalances";

export function NavigationSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, user, logout, login } = usePrivy();
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  const { eoaAddress } = useWallet();
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const { ensureSafe } = useSafeDeployment();

  useEffect(() => {
    if (eoaAddress) {
      ensureSafe().then(setSafeAddress).catch(console.error);
    }
  }, [eoaAddress, ensureSafe]);

  const { safeBalance, isLoading, refresh } = useBalances(eoaAddress, safeAddress);
  const safeNum = parseFloat(safeBalance || "0");

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
      <aside className="hidden lg:flex lg:flex-col">
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

          {/* Balance Card */}
          {authenticated && (
            <div className="p-4 border-t border-white/5">
              <div className="rounded-xl bg-base-850/70 border border-white/5 p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-400">Trading Balance</div>
                    <div className="mt-1 text-2xl font-display font-semibold tracking-tight">
                      ${isLoading ? "0.00" : safeNum.toFixed(2)}
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">
                      Bridge deposits go directly to this balance.
                    </p>
                  </div>
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500/15 to-teal-500/15 border border-white/10 flex items-center justify-center">
                    <Wallet className="text-lg text-teal-200" />
                  </div>
                </div>
                <button
                  onClick={() => setIsDepositOpen(true)}
                  className="relative mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow overflow-hidden"
                >
                  <span className="relative z-10">Deposit</span>
                  <ArrowRight className="relative z-10 w-4 h-4" />
                  <span className="absolute inset-0 opacity-30 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.65),transparent)] -translate-x-[120%] animate-sheen"></span>
                </button>
              </div>

              {/* User Card */}
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-base-850/60 border border-white/5 px-3 py-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-soft">
                  <span className="font-display font-bold text-white">
                    {username[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-5 truncate">{username}</div>
                  <div className="text-xs text-slate-400 truncate">
                    @{username.toLowerCase().replace(/\s+/g, "")}
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="mt-3 inline-flex items-center gap-2 text-sm text-rose-300 hover:text-rose-200 transition"
              >
                <LogOut className="text-lg" />
                Logout
              </button>
            </div>
          )}

          {/* Login prompt for non-authenticated users */}
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
      </aside>

      {/* Deposit Modal */}
      {authenticated && eoaAddress && safeAddress && (
        <DepositModal
          isOpen={isDepositOpen}
          eoaAddress={safeAddress}
          onClose={() => setIsDepositOpen(false)}
          onRefreshBalance={refresh}
        />
      )}
    </>
  );
}