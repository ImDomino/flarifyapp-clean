// components/Navigation.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Briefcase,
  Settings,
  MessageCircle,
  LogOut,
  Wallet,
} from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { DepositModal } from "./DepositModal";
import { useWallet } from "@/providers/WalletProvider";
import { useSafeDeployment } from "@/hooks/useSafeDeployment";
import { useBalances } from "@/hooks/useBalances";
import { MoveToSafeButton } from "./MoveToSafeButton";


export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, user, logout } = usePrivy();
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  const { eoaAddress } = useWallet();
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const { ensureSafe } = useSafeDeployment();
  

  useEffect(() => {
    if (eoaAddress) {
      ensureSafe().then(setSafeAddress).catch(console.error);
    }
  }, [eoaAddress, ensureSafe]);

  const { safeBalance, isLoading, refresh, eoaBalance } = useBalances(eoaAddress, safeAddress);
  const safeNum = parseFloat(safeBalance || "0");
  const eoaNum = parseFloat(eoaBalance || "0");

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/create", icon: MessageCircle, label: "Post" },
    { href: "/profile", icon: Briefcase, label: "Profile" },
    { href: "/admin", icon: Settings, label: "Settings" },
  ];

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await logout();
      router.push("/");
    }
  };

  const username =
    user?.google?.name ||
    user?.email?.address?.split("@")[0] ||
    "Unknown";

  return (
    <>
      {/* Sidebar Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed left-0 top-0 h-full w-20 lg:w-72 bg-sidebar border-r border-sidebar-border p-4 flex flex-col z-50"
      >
        {/* Logo / Title */}
        <div className="hidden lg:block mb-8 px-2">
          <h1 className="text-2xl font-bold text-gradient-blue-aqua">
            Flarify
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Prediction Market Social
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <motion.div
                key={item.href}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={item.href}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all relative group ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-[#2A56F2]/20 to-[#9DFECB]/20 rounded-2xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className="w-6 h-6 relative z-10 transition-transform group-hover:scale-110" />
                  <span className="hidden lg:block relative z-10 font-medium">
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* Balance & Deposit (Figma-style) */}
        {authenticated && (
          <div className="mb-4 px-2">
            <div className="hidden lg:block space-y-3">
             <div className="bg-secondary/30 border border-white/10 rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Trading Balance
              </p>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? "$0.00" : `$${safeNum.toFixed(2)}`}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mb-2">
                Wallet: ${eoaNum.toFixed(2)} · Funds available for trading:{" "}
                <span className="font-semibold text-foreground">
                  ${safeNum.toFixed(2)}
                </span>
              </p>

              <MoveToSafeButton
                eoaBalance={eoaBalance}
                onMoved={refresh}
              />
            </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsDepositOpen(true)}
                className="w-full bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white font-medium py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#2A56F2]/30"
              >
                <Wallet className="w-5 h-5" />
                Deposit
              </motion.button>
            </div>

            {/* Mobile version - just icon */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDepositOpen(true)}
              className="lg:hidden w-12 h-12 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] text-white rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Wallet className="w-6 h-6" />
            </motion.button>
          </div>
        )}

        {/* User Profile Card */}
        {authenticated && (
          <div className="border-t border-sidebar-border pt-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => router.push("/profile")}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-sidebar-accent/50 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2A56F2] to-[#9DFECB] flex items-center justify-center text-sm font-semibold text-white">
                {username[0].toUpperCase()}
              </div>
              <div className="hidden lg:block flex-1 text-left">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {username}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{username.toLowerCase().replace(/\s+/g, "")}
                </p>
              </div>
            </motion.button>

            {/* Logout Button */}
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255,69,58,0.1)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="w-full flex items-center justify-center lg:justify-start gap-3 mt-2 px-4 py-3 rounded-2xl text-destructive hover:bg-destructive/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden lg:block font-medium">Logout</span>
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Main content padding */}
      <div className="pl-20 lg:pl-72" />

      {/* Deposit modal */}
      {authenticated && eoaAddress && (
        <DepositModal
          isOpen={isDepositOpen}
          eoaAddress={eoaAddress}
          onClose={() => setIsDepositOpen(false)}
          onRefreshBalance={refresh}
        />
      )}
    </>
  );
}
