"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { usePositions } from "@/hooks/usePositions";

export function PositionsTab() {
  const { positions, isLoading, error, fetchPositions } = usePositions();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchPositions();
    setRefreshing(false);
  };

  if (isLoading && positions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-rose-300 font-medium mb-1">Failed to load positions</p>
          <p className="text-xs text-slate-400">{error}</p>
          <button
            onClick={() => fetchPositions()}
            className="mt-3 text-xs text-rose-300 hover:text-rose-200 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-blue-300" />
        </div>
        <p className="text-slate-400 mb-4">
          You don't have any open positions
        </p>
        <p className="text-xs text-slate-500">
          Place orders on markets to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-slate-100">
            Open Positions
          </h3>
          <p className="text-sm text-slate-400">
            {positions.length} {positions.length === 1 ? "position" : "positions"}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
        >
          {refreshing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Positions List */}
      {positions.map((pos) => {
        const isUp = pos.currentValue >= pos.size * pos.avgPrice;
        const avgPriceCents = pos.avgPrice * 100;
        const totalCost = pos.size * pos.avgPrice;
        const currentValue = pos.currentValue || totalCost;

        const pnlColor =
          pos.cashPnl > 0
            ? "text-teal-300"
            : pos.cashPnl < 0
            ? "text-rose-300"
            : "text-slate-400";

        return (
          <article
            key={pos.asset_id}
            className="rounded-xl border border-white/10 bg-base-850/45 p-5 shadow-soft"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {pos.question && (
                  <p className="text-sm font-medium text-slate-200 mb-2">
                    {pos.question}
                  </p>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                      isUp
                        ? "bg-teal-500/15 text-teal-200 border border-teal-500/20"
                        : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {pos.outcome || "Position"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {avgPriceCents.toFixed(1)}¢ avg
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-white/10 bg-base-900/35 p-3">
                    <p className="text-xs text-slate-500 mb-1">Size</p>
                    <p className="text-sm font-semibold text-slate-200">
                      {pos.size.toFixed(2)} shares
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-base-900/35 p-3">
                    <p className="text-xs text-slate-500 mb-1">Current Value</p>
                    <p className="text-sm font-semibold text-slate-200">
                      ${currentValue.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-base-900/35 p-3">
                    <p className="text-xs text-slate-500 mb-1">PnL</p>
                    <p className={`text-sm font-semibold ${pnlColor}`}>
                      {pos.cashPnl >= 0 ? "+" : ""}
                      ${pos.cashPnl.toFixed(2)}{" "}
                      <span className="text-xs text-slate-500">
                        ({pos.percentPnl >= 0 ? "+" : ""}
                        {pos.percentPnl.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500/70 mt-3 font-mono">
                  Asset: {(pos.asset_id || "").slice(0, 10)}...
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full ${isUp ? "bg-gradient-to-r from-blue-500 to-teal-400" : "bg-gradient-to-r from-rose-500 to-rose-400"}`}
                style={{ width: "100%" }}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}