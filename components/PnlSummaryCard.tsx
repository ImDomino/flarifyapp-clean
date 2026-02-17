"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Eye, EyeOff, RefreshCw, Loader2, AlertCircle,
} from "lucide-react";
import { usePositions, UserPosition } from "@/hooks/usePositions";

interface PnlSummaryCardProps {
  isPublic: boolean;
  onTogglePublic: () => void;
  /** If provided, shows another user's PnL (read-only, no toggle) */
  viewOnly?: boolean;
  positions?: UserPosition[];
}

interface AggregatedPnl {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  percentPnl: number;
  positionCount: number;
  winCount: number;
  lossCount: number;
}

function aggregatePositions(positions: UserPosition[]): AggregatedPnl {
  let totalValue = 0;
  let totalCost = 0;
  let totalPnl = 0;
  let winCount = 0;
  let lossCount = 0;

  for (const pos of positions) {
    const cost = pos.size * pos.avgPrice;
    const value = pos.currentValue || cost;
    totalCost += cost;
    totalValue += value;
    totalPnl += pos.cashPnl;
    if (pos.cashPnl > 0) winCount++;
    else if (pos.cashPnl < 0) lossCount++;
  }

  const percentPnl = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return {
    totalValue,
    totalCost,
    totalPnl,
    percentPnl,
    positionCount: positions.length,
    winCount,
    lossCount,
  };
}

export function PnlSummaryCard({ isPublic, onTogglePublic, viewOnly, positions: externalPositions }: PnlSummaryCardProps) {
  const { positions: ownPositions, isLoading, error, fetchPositions } = usePositions();
  const [refreshing, setRefreshing] = useState(false);

  const positions = externalPositions ?? ownPositions;

  useEffect(() => {
    if (!externalPositions) {
      fetchPositions();
    }
  }, [fetchPositions, externalPositions]);

  const handleRefresh = async () => {
    if (refreshing || externalPositions) return;
    setRefreshing(true);
    await fetchPositions();
    setRefreshing(false);
  };

  const agg = aggregatePositions(positions);
  const isUp = agg.totalPnl >= 0;
  const hasPositions = positions.length > 0;

  // Loading state
  if (isLoading && positions.length === 0) {
    return (
      <div className="bg-[#0a0a0a] border border-zinc-800 p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        <span className="ml-2 text-xs text-zinc-500 uppercase tracking-wider font-bold">Loading PnL...</span>
      </div>
    );
  }

  // Error state
  if (error && positions.length === 0) {
    return (
      <div className="bg-[#0a0a0a] border border-zinc-800 p-5">
        <div className="flex items-center gap-2 text-zinc-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wider font-bold">Couldn't load PnL</span>
          <button onClick={handleRefresh} className="ml-auto text-xs text-zinc-500 hover:text-white font-bold uppercase">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 relative overflow-hidden">
      {/* Subtle accent line based on PnL direction */}
      {hasPositions && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${isUp ? "bg-emerald-500/60" : "bg-red-500/40"}`} />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Trading Performance
            </span>
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-600" />}
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            {!viewOnly && (
              <button onClick={handleRefresh} disabled={refreshing}
                className="p-1.5 text-zinc-600 hover:text-white transition-colors disabled:opacity-50"
                title="Refresh">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            )}

            {/* Privacy toggle */}
            {!viewOnly && (
              <button onClick={onTogglePublic}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors"
                title={isPublic ? "Visible to others" : "Hidden from others"}>
                {isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {isPublic ? "Public" : "Private"}
                </span>
              </button>
            )}
          </div>
        </div>

        {!hasPositions ? (
          /* Empty state */
          <div className="text-center py-4">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold">No open positions</p>
            <p className="text-[10px] text-zinc-700 mt-1">Trade on markets to see your PnL here</p>
          </div>
        ) : (
          <>
            {/* Main PnL number */}
            <div className="mb-5">
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  isUp ? "text-emerald-400" : "text-red-400"
                }`}>
                  {isUp ? "+" : ""}${agg.totalPnl.toFixed(2)}
                </span>
                <span className={`text-sm font-mono font-bold ${
                  isUp ? "text-emerald-500/60" : "text-red-500/50"
                }`}>
                  {isUp ? "+" : ""}{agg.percentPnl.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {isUp ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500/50" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-500/40" />
                )}
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                  All-time P&L
                </span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-px bg-zinc-800">
              <StatCell label="Positions" value={agg.positionCount.toString()} />
              <StatCell label="Portfolio" value={`$${agg.totalValue.toFixed(2)}`} />
              <StatCell label="Winning" value={agg.winCount.toString()} accent="emerald" />
              <StatCell label="Losing" value={agg.lossCount.toString()} accent="red" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent?: "emerald" | "red" }) {
  const textColor = accent === "emerald"
    ? "text-emerald-400"
    : accent === "red"
    ? "text-red-400"
    : "text-white";

  return (
    <div className="bg-[#0a0a0a] p-3 text-center">
      <div className={`text-sm sm:text-base font-mono font-bold ${textColor} leading-none mb-1`}>{value}</div>
      <div className="text-[8px] text-zinc-600 uppercase tracking-[0.15em] font-bold">{label}</div>
    </div>
  );
}
