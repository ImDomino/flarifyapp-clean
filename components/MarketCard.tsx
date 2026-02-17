"use client";

import { useState, useEffect, useRef } from "react";
import { ExternalLink, TrendingUp, Lock, CheckCircle, XCircle } from "lucide-react";
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

  const cachedYes = marketData.prices?.[0] ?? null;
  const cachedNo = marketData.prices?.[1] ?? null;

  const [liveYesPrice, setLiveYesPrice] = useState<number | null>(null);
  const [liveNoPrice, setLiveNoPrice] = useState<number | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);

  // Build query params once
  const yesTokenId = marketData.yesTokenId;
  const params = new URLSearchParams();
  if (yesTokenId) params.set("token_id", yesTokenId);
  if (marketId) params.set("market_id", marketId);
  const hasParams = !!(yesTokenId || marketId);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !hasParams) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchPrice = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/polymarket/price?${params.toString()}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;

        if (data.resolved) {
          setIsResolved(true);
          if (data.winner) setWinner(data.winner);
        }
        if (data.midPrice != null && data.midPrice >= 0 && data.midPrice <= 1) {
          setLiveYesPrice(data.midPrice);
          setLiveNoPrice(1 - data.midPrice);
        }
      } catch {}
    };

    const startPolling = (resolved: boolean) => {
      stopPolling();
      intervalId = setInterval(fetchPrice, resolved ? 600_000 : 120_000);
    };

    const stopPolling = () => {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          fetchPrice();
          startPolling(isResolved);
        } else {
          stopPolling();
        }
      },
      { threshold: 0.1, rootMargin: "600px" }
    );

    observer.observe(el);

    return () => {
      cancelled = true;
      stopPolling();
      observer.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasParams, marketId, yesTokenId, isResolved]);

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

  const winnerNormalized = winner?.toLowerCase() === "yes" ? "Yes"
    : winner?.toLowerCase() === "no" ? "No"
    : winner;

  return (
    <>
      <div
        ref={cardRef}
        className={`border transition-colors relative overflow-hidden ${
          isResolved
            ? "bg-[#0d0d0d] border-zinc-800/60"
            : "bg-[#111] border-zinc-800 hover:border-zinc-600"
        }`}
      >
        {isResolved && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-600" />
        )}

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                  Prediction Market
                </span>
                {isResolved && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-widest font-black border border-zinc-700 text-zinc-500 bg-zinc-900/80">
                    <Lock className="w-2.5 h-2.5" />
                    Resolved
                  </span>
                )}
              </div>
              <h3 className={`text-sm font-bold leading-relaxed ${isResolved ? "text-zinc-500" : "text-white"}`}>
                {marketData.question}
              </h3>
            </div>
            {marketData.url && (
              <a href={marketData.url} target="_blank" rel="noopener noreferrer"
                className="p-2 text-zinc-600 hover:text-white border border-transparent hover:border-zinc-700 transition-all flex-shrink-0">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Price bar */}
        {yesPercent != null && (
          <div className="px-4 sm:px-5 py-3 border-b border-zinc-800">
            <div className="h-1.5 w-full bg-zinc-800 relative overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ${isResolved ? "bg-zinc-600" : "bg-white"}`}
                style={{ width: `${yesPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Resolved outcome banner */}
        {isResolved && winnerNormalized && (
          <div className="px-4 sm:px-5 py-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex items-center justify-center gap-2.5 py-2">
              {winnerNormalized === "Yes" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500/70" />
              )}
              <span className="text-xs font-black uppercase tracking-wider text-zinc-500">
                Outcome:{" "}
                <span className={winnerNormalized === "Yes" ? "text-emerald-500" : "text-red-400"}>
                  {winnerNormalized}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-4 sm:p-5">
          {isResolved ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="py-3 text-center border border-zinc-800 bg-zinc-900/40 text-zinc-600 font-black uppercase tracking-wider text-xs cursor-not-allowed select-none">
                  Yes {yesPercent != null ? `${yesPercent}¢` : ""}
                </div>
                <div className="py-3 text-center border border-zinc-800 bg-zinc-900/40 text-zinc-600 font-black uppercase tracking-wider text-xs cursor-not-allowed select-none">
                  No {noPercent != null ? `${noPercent}¢` : ""}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-700">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-xs font-mono font-bold">{formatVolume(marketData.volume)} VOL</span>
                </div>
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Market closed</span>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => setTradingModal({ isOpen: true, side: "yes" })}
                  className="py-3 text-center border-2 border-white bg-white text-black font-black uppercase tracking-wider text-xs hover:bg-black hover:text-white transition-colors">
                  Yes {yesPercent != null ? `${yesPercent}¢` : ""}
                </button>
                <button onClick={() => setTradingModal({ isOpen: true, side: "no" })}
                  className="py-3 text-center border-2 border-zinc-700 text-zinc-300 font-black uppercase tracking-wider text-xs hover:border-white hover:text-white hover:bg-[#1a1a1a] transition-colors">
                  No {noPercent != null ? `${noPercent}¢` : ""}
                </button>
              </div>
              <div className="flex items-center gap-2 text-zinc-600">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-mono font-bold">{formatVolume(marketData.volume)} VOL</span>
              </div>
            </>
          )}
        </div>
      </div>

      {!isResolved && (
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