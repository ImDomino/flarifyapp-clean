"use client";

import { useState, useEffect } from "react";
import { Wallet, Plus, RefreshCw } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";
import { InviteCodesCard } from "./InviteCodesCard";
import { useWallet } from "@/providers/WalletProvider";
import { useBalances } from "@/hooks/useBalances";

export function RightSidebar() {
  const { authenticated } = usePrivy();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { eoaAddress, safeAddress } = useWallet();
  const { safeBalance, isLoading, refresh } = useBalances(eoaAddress, safeAddress);
  const safeNum = parseFloat(safeBalance || "0");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  if (!authenticated) {
    return (
      <aside className="col-span-3 hidden lg:block pt-6 lg:pt-8">
        <div className="sticky top-28 space-y-6">
          <div className="bg-[#0a0a0a] border border-zinc-800/60 p-6 text-center animate-fade-up relative overflow-hidden">
            <div className="absolute inset-0 grid-bg-animated opacity-10" />
            <div className="relative z-10">
              <Wallet className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
              <p className="text-sm text-zinc-500 font-bold uppercase tracking-wider">
                Sign in to trade
              </p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="col-span-3 hidden lg:block pt-6 lg:pt-8 space-y-6">
        <div className="sticky top-28 space-y-4">
          {/* ═══ Balance Card ═══ */}
          <div className="bg-[#0a0a0a] border-2 border-white/90 p-6 relative overflow-hidden animate-fade-up group">
            {/* Corner accents */}
            <div className="absolute -top-px -left-px w-3 h-3 bg-white transition-all duration-300 group-hover:w-4 group-hover:h-4" />
            <div className="absolute -bottom-px -right-px w-3 h-3 bg-white transition-all duration-300 group-hover:w-4 group-hover:h-4" />
            {/* Subtle grid background */}
            <div className="absolute inset-0 grid-bg-animated opacity-5" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Trading Balance
                </span>
                <button
                  onClick={handleRefresh}
                  className="text-zinc-600 hover:text-white transition-colors p-1"
                  title="Refresh balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="mb-6">
                {isLoading ? (
                  <div className="h-10 w-32 shimmer-bg" />
                ) : (
                  <span className="text-4xl font-black text-white tracking-tight transition-all">
                    ${safeNum.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsDepositOpen(true)}
                  className="py-3 text-[10px] font-black uppercase tracking-widest bg-white text-black border-2 border-white hover:bg-emerald-50 transition-all duration-200 active:scale-[0.98]"
                >
                  Deposit
                </button>
                <button
                  onClick={() => setIsWithdrawOpen(true)}
                  className="py-3 text-[10px] font-black uppercase tracking-widest bg-black text-white border-2 border-white hover:bg-zinc-900 transition-all duration-200 active:scale-[0.98]"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          {/* ═══ Invite Codes ═══ */}
          <InviteCodesCard />

          {/* ═══ Watchlist ═══ */}
          <div className="bg-[#0a0a0a] border border-zinc-800/60 animate-fade-up stagger-2 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/40">
              <h3 className="font-black text-white uppercase tracking-wider text-xs">
                Watchlist
              </h3>
              <button className="text-zinc-600 hover:text-white transition-colors p-1 hover:rotate-90 duration-200">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-5 text-center">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                Coming Soon
              </p>
              <p className="text-[10px] text-zinc-700 mt-1.5">
                Track your favorite markets here
              </p>
            </div>
          </div>

          {/* ═══ Footer ═══ */}
          <div className="px-1 animate-fade-in stagger-4">
            <p className="text-[10px] text-zinc-800 uppercase tracking-widest font-bold">
              don't give up
            </p>
          </div>
        </div>
      </aside>

      {/* Modals */}
      {authenticated && eoaAddress && safeAddress && (
        <>
          <DepositModal
            isOpen={isDepositOpen}
            eoaAddress={safeAddress}
            onClose={() => setIsDepositOpen(false)}
            onRefreshBalance={refresh}
          />
          <WithdrawModal
            isOpen={isWithdrawOpen}
            safeAddress={safeAddress}
            balance={safeBalance}
            onClose={() => setIsWithdrawOpen(false)}
            onRefreshBalance={refresh}
          />
        </>
      )}
    </>
  );
}