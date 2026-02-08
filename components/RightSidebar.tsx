"use client";

import { useState, useEffect } from "react";
import { Wallet, ArrowDownToLine, ArrowUpRight, Sparkles } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";
import { useWallet } from "@/providers/WalletProvider";
import { useSafeDeployment } from "@/hooks/useSafeDeployment";
import { useBalances } from "@/hooks/useBalances";

export function RightSidebar() {
  const { authenticated } = usePrivy();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

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

  if (!authenticated) {
    return (
      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          <section className="rounded-xl bg-base-900/65 border border-white/5 shadow-card p-5">
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 mx-auto mb-4 text-slate-500" />
              <p className="text-sm text-slate-400 mb-4">Sign in to view your balance</p>
            </div>
          </section>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          {/* Trading Balance Card */}
          <section className="rounded-xl bg-base-900/65 border border-white/5 shadow-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-slate-400">Trading Balance</div>
                <div className="mt-1 font-display text-3xl font-semibold tracking-tight">
                  ${isLoading ? "0.00" : safeNum.toFixed(2)}
                </div>
                <div className="mt-1 text-xs text-slate-500">Available to trade instantly.</div>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/15 to-teal-500/15 border border-white/10 flex items-center justify-center">
                <Wallet className="text-lg text-teal-200" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsDepositOpen(true)}
                className="relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow overflow-hidden min-h-[44px]"
              >
                <span className="relative z-10">Deposit</span>
                <ArrowDownToLine className="relative z-10 w-4 h-4" />
                <span className="absolute inset-0 opacity-25 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.7),transparent)] -translate-x-[120%] animate-sheen"></span>
              </button>
              <button
                onClick={() => setIsWithdrawOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 bg-white/5 border border-white/10 hover:bg-white/10 transition min-h-[44px]"
              >
                Withdraw
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-base-850/45 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Bridge status</span>
                <span className="text-teal-200">Ready</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-teal-400"></span>
                Deposits settle to balance automatically.
              </div>
            </div>
          </section>

          {/* Watchlist - Coming Soon */}
          <section className="rounded-xl bg-base-900/55 border border-white/5 shadow-soft p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold tracking-tight">Watchlist</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-medium text-blue-300">Soon</span>
              </span>
            </div>
            <div className="mt-4 text-center py-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500/10 to-teal-500/10 border border-white/5 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-xs text-slate-500">
                Save your favorite markets to track them here
              </p>
              <div className="mt-2 flex items-center gap-1.5 justify-center">
                <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[10px] text-slate-500">Coming soon</span>
              </div>
            </div>
          </section>
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
