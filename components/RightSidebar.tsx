"use client";

import { useState, useEffect } from "react";
import { Wallet, Plus, RefreshCw, X, Loader2, Bell } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";
import { InviteCodesCard } from "./InviteCodesCard";
import { WatchlistSearchModal } from "./WatchlistSearchModal";
import { useWallet } from "@/providers/WalletProvider";
import { useBalances } from "@/hooks/useBalances";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAlerts } from "@/hooks/useAlerts";
import { CreateAlertModal } from "./CreateAlertModal";

export function RightSidebar() {
  const { authenticated } = usePrivy();
  const router = useRouter();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isWatchlistSearchOpen, setIsWatchlistSearchOpen] = useState(false);
  const [alertModalItem, setAlertModalItem] = useState<{
    conditionId: string;
    tokenId: string;
    question: string;
    price: number | null;
  } | null>(null);

  const { eoaAddress, safeAddress } = useWallet();
  const { safeBalance, isLoading, refresh } = useBalances(eoaAddress, safeAddress);
  const { watchlist, prices, toggleWatch, isWatching, isLoading: watchlistLoading } = useWatchlist();
  const { createAlert, hasActiveAlert } = useAlerts();
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
              <button
                onClick={() => setIsWatchlistSearchOpen(true)}
                className="text-zinc-600 hover:text-white transition-colors p-1 hover:rotate-90 duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {watchlist.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                  No markets tracked
                </p>
                <button
                  onClick={() => setIsWatchlistSearchOpen(true)}
                  className="text-[10px] text-zinc-500 hover:text-white mt-1.5 uppercase tracking-wider font-bold transition-colors"
                >
                  + Add markets
                </button>
              </div>
            ) : (
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                {watchlist.slice(0, 10).map((item) => {
                  const price = prices.get(item.token_id);
                  const priceCents = price != null ? Math.round(price * 100) : null;
                  const itemHasAlert = hasActiveAlert(item.condition_id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 px-3 py-2 border-b border-zinc-900 last:border-b-0 hover:bg-[#111] transition-colors group"
                    >
                      <button
                        onClick={() => router.push(`/market/${item.condition_id}?token_id=${item.token_id}`)}
                        className="flex-1 min-w-0 text-left flex items-center justify-between gap-2"
                      >
                        <p className="text-[11px] font-bold text-zinc-300 group-hover:text-white leading-tight truncate flex-1 transition-colors">
                          {item.market_question || "Market"}
                        </p>
                        {priceCents != null ? (
                          <span className="text-[11px] font-mono font-bold text-white flex-shrink-0">
                            {priceCents}¢
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-700 flex-shrink-0">—</span>
                        )}
                      </button>
                      <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setAlertModalItem({
                            conditionId: item.condition_id,
                            tokenId: item.token_id,
                            question: item.market_question || "Market",
                            price: price ?? null,
                          })}
                          className={`p-1 transition-colors ${
                            itemHasAlert
                              ? "text-white !opacity-100"
                              : "text-zinc-700 hover:text-white"
                          }`}
                          title={itemHasAlert ? "Alert active" : "Set alert"}
                        >
                          <Bell className={`w-3 h-3 ${itemHasAlert ? "fill-current" : ""}`} />
                        </button>
                        <button
                          onClick={() => toggleWatch({
                            condition_id: item.condition_id,
                            token_id: item.token_id,
                            market_question: item.market_question || "",
                          })}
                          className="p-1 text-zinc-700 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
      <WatchlistSearchModal
        isOpen={isWatchlistSearchOpen}
        onClose={() => setIsWatchlistSearchOpen(false)}
        onToggleWatch={toggleWatch}
        isWatching={isWatching}
      />
      {alertModalItem && (
        <CreateAlertModal
          isOpen={true}
          onClose={() => setAlertModalItem(null)}
          onCreateAlert={createAlert}
          marketData={{
            conditionId: alertModalItem.conditionId,
            question: alertModalItem.question,
            yesTokenId: alertModalItem.tokenId,
            yesPrice: alertModalItem.price,
            noPrice: alertModalItem.price != null ? 1 - alertModalItem.price : null,
          }}
        />
      )}
    </>
  );
}