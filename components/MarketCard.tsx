"use client";

import { useState, useEffect } from "react";
import { ExternalLink, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { TradingModal } from "./TradingModal";

interface MarketCardProps {
  marketData: {
    question: string;
    outcomes?: string[];
    prices?: number[] | null;
    volume?: string;
    url?: string;
    yesTokenId?: string;
    noTokenId?: string;
    negRisk?: boolean;
  };
  marketId: string;
}

export function MarketCard({ marketData, marketId }: MarketCardProps) {
  const [tradingModal, setTradingModal] = useState<{
    isOpen: boolean;
    side: "yes" | "no";
  }>({ isOpen: false, side: "yes" });

  // Cached prices from post creation (fallback)
  const cachedYes = marketData.prices?.[0] ?? null;
  const cachedNo = marketData.prices?.[1] ?? null;

  // Live state
  const [liveYesPrice, setLiveYesPrice] = useState<number | null>(null);
  const [liveNoPrice, setLiveNoPrice] = useState<number | null>(null);
  const [resolved, setResolved] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null); // "YES" or "NO"

  useEffect(() => {
    const yesTokenId = marketData.yesTokenId;
    if (!yesTokenId) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchLivePrice = async () => {
      try {
        const res = await fetch(
          `/api/polymarket/price?token_id=${encodeURIComponent(yesTokenId)}`
        );
        if (!res.ok || cancelled) return;

        const data = await res.json();
        if (cancelled) return;

        // Market resolved
        if (data.resolved) {
          setResolved(true);
          // Determine outcome: if this YES token won (price=1), outcome is YES
          if (data.winningPrice != null) {
            setOutcome(data.winningPrice > 0.5 ? "YES" : "NO");
          } else if (data.outcome) {
            setOutcome(data.outcome);
          }
          setLiveYesPrice(data.winningPrice ?? 1);
          setLiveNoPrice(data.winningPrice != null ? 1 - data.winningPrice : 0);

          // Stop polling — market is done
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
          return;
        }

        // Live market
        if (data.midPrice != null && data.midPrice > 0 && data.midPrice < 1) {
          setLiveYesPrice(data.midPrice);
          setLiveNoPrice(1 - data.midPrice);
        }
      } catch {
        // Silent — keep whatever prices we have
      }
    };

    fetchLivePrice();
    interval = setInterval(fetchLivePrice, 120_000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [marketData.yesTokenId]);

  // Display prices
  const yesPrice = liveYesPrice ?? cachedYes;
  const noPrice = liveNoPrice ?? cachedNo;
  const yesPercent = yesPrice != null ? Math.round(yesPrice * 100) : null;
  const noPercent = noPrice != null ? Math.round(noPrice * 100) : null;

  const formatVolume = (vol?: string) => {
    if (!vol) return "$0";
    const n = parseFloat(vol);
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  const yesWon = outcome === "YES";
  const noWon = outcome === "NO";

  return (
    <>
      <div className="bg-[#111] border border-zinc-800 hover:border-zinc-600 transition-colors">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Prediction Market
                </span>
                {resolved && (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5">
                    Resolved
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white leading-relaxed">
                {marketData.question}
              </h3>
            </div>
            {marketData.url && (
              <a
                href={marketData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-zinc-600 hover:text-white border border-transparent hover:border-zinc-700 transition-all flex-shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Resolved state */}
        {resolved && outcome ? (
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-center gap-3 py-4">
              {yesWon ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <XCircle className="w-6 h-6 text-zinc-500" />
              )}
              <span className="text-lg font-black uppercase tracking-wider text-white">
                Resolved {outcome}
              </span>
            </div>

            {/* Volume */}
            <div className="flex items-center justify-center gap-2 text-zinc-600">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs font-mono font-bold">
                {formatVolume(marketData.volume)} VOL
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Price bar */}
            {yesPercent != null && (
              <div className="px-4 sm:px-5 py-3 border-b border-zinc-800">
                <div className="h-2 w-full bg-zinc-800 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-white transition-all duration-500"
                    style={{ width: `${yesPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => setTradingModal({ isOpen: true, side: "yes" })}
                  className="py-3 text-center border-2 border-white bg-white text-black font-black uppercase tracking-wider text-xs hover:bg-black hover:text-white transition-colors"
                >
                  Yes {yesPercent != null ? `${yesPercent}¢` : ""}
                </button>
                <button
                  onClick={() => setTradingModal({ isOpen: true, side: "no" })}
                  className="py-3 text-center border-2 border-zinc-700 text-zinc-300 font-black uppercase tracking-wider text-xs hover:border-white hover:text-white hover:bg-[#1a1a1a] transition-colors"
                >
                  No {noPercent != null ? `${noPercent}¢` : ""}
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 text-zinc-600">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-mono font-bold">
                  {formatVolume(marketData.volume)} VOL
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Trading Modal — only for live markets */}
      {!resolved && (
        <TradingModal
          isOpen={tradingModal.isOpen}
          onClose={() => setTradingModal({ isOpen: false, side: "yes" })}
          marketId={marketId}
          question={marketData.question}
          initialSide={tradingModal.side}
          yesPrice={yesPrice || 0.5}
          noPrice={noPrice || 0.5}
          yesTokenId={marketData.yesTokenId}
          noTokenId={marketData.noTokenId}
          negRisk={marketData.negRisk}
        />
      )}
    </>
  );
}