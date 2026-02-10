"use client";

import { useState, useEffect } from "react";
import { Wallet, TrendingUp, Plus } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";
import { useWallet } from "@/providers/WalletProvider";
import { useBalances } from "@/hooks/useBalances";

export function RightSidebar() {
  const { authenticated } = usePrivy();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const { eoaAddress, safeAddress } = useWallet();
  const { safeBalance, isLoading, refresh } = useBalances(eoaAddress, safeAddress);
  const safeNum = parseFloat(safeBalance || "0");

  if (!authenticated) {
    return (
      <aside className="col-span-3 hidden lg:block pt-6 lg:pt-8">
        <div className="sticky top-28 space-y-6">
          <div className="bg-[#0a0a0a] border border-zinc-800 p-6 text-center">
            <Wallet className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-500 font-bold uppercase tracking-wider">
              Sign in to trade
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside className="col-span-3 hidden lg:block pt-6 lg:pt-8 space-y-6">
        <div className="sticky top-28 space-y-6">
          {/* Balance Card */}
          <div className="bg-[#0a0a0a] border-2 border-white p-6 relative">
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white" />

            <div className="flex justify-between items-start mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Trading Balance
              </span>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="mb-6">
              {isLoading ? (
                <span className="text-4xl font-black text-zinc-500 animate-pulse">$—.——</span>
              ) : (
                <span className="text-4xl font-black text-white tracking-tight">
                  ${safeNum.toFixed(2)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsDepositOpen(true)}
                className="py-3 text-xs font-black uppercase tracking-wider bg-white text-black border-2 border-white hover:bg-black hover:text-white transition-colors"
              >
                Deposit
              </button>
              <button
                onClick={() => setIsWithdrawOpen(true)}
                className="py-3 text-xs font-black uppercase tracking-wider bg-black text-white border-2 border-white hover:bg-white hover:text-black transition-colors"
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Watchlist */}
          <div className="bg-[#0a0a0a] border border-zinc-800">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="font-black text-white uppercase tracking-wider text-sm">
                Watchlist
              </h3>
              <button className="text-zinc-500 hover:text-white">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 text-center">
              <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold">
                Coming Soon
              </p>
              <p className="text-[10px] text-zinc-700 mt-2">
                Track your favorite markets here
              </p>
            </div>
          </div>

          {/* Trending */}
          <div className="bg-[#0a0a0a] border border-zinc-800 p-5">
            <h3 className="font-black text-white uppercase tracking-wider text-sm mb-4">
              Trending Now
            </h3>
            <div className="space-y-4">
              {[
                { tag: "#Polymarket", posts: "Live" },
                { tag: "#Predictions", posts: "Active" },
                { tag: "#Markets", posts: "Trending" },
              ].map((t) => (
                <div key={t.tag} className="block group cursor-pointer">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-white group-hover:text-zinc-300">
                      {t.tag}
                    </span>
                    <TrendingUp className="w-3 h-3 text-zinc-600" />
                  </div>
                  <span className="text-xs text-zinc-600">{t.posts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-700 uppercase">
            don't give up
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
