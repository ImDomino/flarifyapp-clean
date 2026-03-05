"use client";

import { useEffect, useState } from "react";
import {
  Home, Search, Bell, User, Plus, MessageCircle,
  ArrowDownToLine, ArrowUpFromLine, X,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@/providers/WalletProvider";
import { useNotifications } from "@/providers/NotificationsProvider";
import { useMessages } from "@/providers/MessagesProvider";

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated, user, login } = usePrivy();
  const { eoaAddress } = useWallet();
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessages } = useMessages();
  const [showActions, setShowActions] = useState(false);

  // Close action sheet on route change
  useEffect(() => {
    setShowActions(false);
  }, [pathname]);

  const isActive = (path: string) => pathname === path;

  const handleNavClick = (path: string, requiresAuth?: boolean) => {
    if (requiresAuth && !authenticated) {
      login();
      return;
    }
    router.push(path);
  };

  // Polymarket deposit/withdraw URLs
  const polymarketDeposit = eoaAddress
    ? `https://polymarket.com/deposit?ref=FLARIFYAPP`
    : "https://polymarket.com/deposit";
  const polymarketWithdraw = eoaAddress
    ? `https://polymarket.com/withdraw`
    : "https://polymarket.com/withdraw";

  return (
    <>
      {/* Action Sheet Overlay */}
      {showActions && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden animate-fade-in"
          onClick={() => setShowActions(false)}
        >
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#0a0a0a] border border-zinc-800/60 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Quick Actions
                </span>
                <button
                  onClick={() => setShowActions(false)}
                  className="p-1 text-zinc-600 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-3 gap-px bg-zinc-800/30">
                {/* Create Post */}
                <button
                  onClick={() => {
                    setShowActions(false);
                    handleNavClick("/create", true);
                  }}
                  className="bg-[#0a0a0a] flex flex-col items-center justify-center py-5 gap-2 hover:bg-white/[0.03] transition-colors active:bg-white/[0.06]"
                >
                  <div className="w-10 h-10 border border-white/20 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                    New Post
                  </span>
                </button>

                {/* Deposit */}
                <a
                  href={polymarketDeposit}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowActions(false)}
                  className="bg-[#0a0a0a] flex flex-col items-center justify-center py-5 gap-2 hover:bg-white/[0.03] transition-colors active:bg-white/[0.06]"
                >
                  <div className="w-10 h-10 border border-emerald-500/30 flex items-center justify-center">
                    <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80">
                    Deposit
                  </span>
                </a>

                {/* Withdraw */}
                <a
                  href={polymarketWithdraw}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowActions(false)}
                  className="bg-[#0a0a0a] flex flex-col items-center justify-center py-5 gap-2 hover:bg-white/[0.03] transition-colors active:bg-white/[0.06]"
                >
                  <div className="w-10 h-10 border border-red-500/30 flex items-center justify-center">
                    <ArrowUpFromLine className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-400/80">
                    Withdraw
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-md border-t border-zinc-800/60 z-50 md:hidden">
        {/* Safe area for iOS */}
        <div className="flex items-center justify-around h-16 px-1 pb-[env(safe-area-inset-bottom)]">
          {/* Home */}
          <button
            onClick={() => handleNavClick("/")}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all duration-200 ${
              isActive("/") ? "text-white" : "text-zinc-600 active:text-zinc-400"
            }`}
          >
            <Home className="w-[22px] h-[22px]" strokeWidth={isActive("/") ? 2.5 : 1.5} />
            <span className={`text-[8px] uppercase tracking-widest ${isActive("/") ? "font-black" : "font-medium"}`}>
              Home
            </span>
            {isActive("/") && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-white" />
            )}
          </button>

          {/* Search */}
          <button
            onClick={() => handleNavClick("/search")}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all duration-200 ${
              isActive("/search") ? "text-white" : "text-zinc-600 active:text-zinc-400"
            }`}
          >
            <Search className="w-[22px] h-[22px]" strokeWidth={isActive("/search") ? 2.5 : 1.5} />
            <span className={`text-[8px] uppercase tracking-widest ${isActive("/search") ? "font-black" : "font-medium"}`}>
              Search
            </span>
            {isActive("/search") && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-white" />
            )}
          </button>

          {/* Center Action Button */}
          <button
            onClick={() => {
              if (!authenticated) { login(); return; }
              setShowActions(!showActions);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all duration-200 ${
              showActions ? "text-white" : "text-zinc-600 active:text-zinc-400"
            }`}
          >
            <div className={`w-9 h-9 border-2 flex items-center justify-center transition-all duration-300 ${
              showActions
                ? "border-white bg-white rotate-45"
                : "border-zinc-600 hover:border-zinc-400"
            }`}>
              <Plus className={`w-5 h-5 transition-all duration-300 ${
                showActions ? "text-black -rotate-45" : ""
              }`} />
            </div>
          </button>

          {/* Messages */}
          <button
            onClick={() => handleNavClick("/messages", true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all duration-200 ${
              isActive("/messages") ? "text-white" : "text-zinc-600 active:text-zinc-400"
            }`}
          >
            <div className="relative">
              <MessageCircle className="w-[22px] h-[22px]" strokeWidth={isActive("/messages") ? 2.5 : 1.5} />
              {unreadMessages > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center bg-white text-black text-[9px] font-black px-1 animate-scale-in">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </div>
            <span className={`text-[8px] uppercase tracking-widest ${isActive("/messages") ? "font-black" : "font-medium"}`}>
              Messages
            </span>
            {isActive("/messages") && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-white" />
            )}
          </button>

          {/* Profile */}
          <button
            onClick={() => handleNavClick("/profile", true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative transition-all duration-200 ${
              isActive("/profile") ? "text-white" : "text-zinc-600 active:text-zinc-400"
            }`}
          >
            <User className="w-[22px] h-[22px]" strokeWidth={isActive("/profile") ? 2.5 : 1.5} />
            <span className={`text-[8px] uppercase tracking-widest ${isActive("/profile") ? "font-black" : "font-medium"}`}>
              Profile
            </span>
            {isActive("/profile") && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-white" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}