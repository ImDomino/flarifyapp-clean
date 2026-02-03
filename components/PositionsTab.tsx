"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react";
import { usePositions } from "@/hooks/usePositions";

export function PositionsTab() {
  const { positions, isLoading, error, fetchPositions } = usePositions();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Загружаем позиции при монтировании
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[#2A56F2]/30 border-t-[#2A56F2] rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-500 font-medium mb-1">Failed to load positions</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => fetchPositions()}
            className="mt-3 text-xs text-red-500 hover:text-red-400 underline"
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
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#2A56F2]/20 to-[#9DFECB]/20 flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-[#2A56F2]" />
        </div>
        <p className="text-muted-foreground mb-4">
          You don't have any open positions
        </p>
        <p className="text-xs text-muted-foreground">
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
          <h3 className="text-lg font-semibold text-foreground">
            Open Positions
          </h3>
          <p className="text-sm text-muted-foreground">
            {positions.length} {positions.length === 1 ? "position" : "positions"}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-secondary/40 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            "Refresh positions"
          )}
        </button>
      </div>

      {/* Positions List */}
      <AnimatePresence mode="popLayout">
        {positions.map((pos) => {
          const isUp = pos.currentValue >= pos.size * pos.avgPrice;
          const avgPriceCents = pos.avgPrice * 100;
          const totalCost = pos.size * pos.avgPrice;
          const currentValue = pos.currentValue || totalCost;

          const pnlColor =
            pos.cashPnl > 0
              ? "text-emerald-400"
              : pos.cashPnl < 0
              ? "text-red-400"
              : "text-muted-foreground";

          return (
            <motion.div
              key={pos.asset_id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="rounded-3xl bg-secondary/30 border border-white/10 p-6 card-shadow backdrop-blur-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {pos.question && (
                    <p className="text-sm font-medium text-foreground mb-2">
                      {pos.question}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                        isUp
                          ? "bg-[#9DFECB]/20 text-[#9DFECB]"
                          : "bg-[#FF375F]/20 text-[#FF375F]"
                      }`}
                    >
                      {isUp ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {pos.outcome || "Position"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {avgPriceCents.toFixed(1)}¢ avg
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Size</p>
                      <p className="text-sm font-semibold text-foreground">
                        {pos.size.toFixed(2)} shares
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                      <p className="text-sm font-semibold text-foreground">
                        ${currentValue.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">PnL</p>
                      <p className={`text-sm font-semibold ${pnlColor}`}>
                        {pos.cashPnl >= 0 ? "+" : ""}
                        ${pos.cashPnl.toFixed(2)}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({pos.percentPnl >= 0 ? "+" : ""}
                          {pos.percentPnl.toFixed(1)}%)
                        </span>
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground/70 mt-3 font-mono">
                    Asset: {(pos.asset_id || "").slice(0, 10)}...
                  </p>
                </div>
              </div>

              <div className="relative h-1 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={isUp ? "bg-[#9DFECB]" : "bg-[#FF375F]"}
                  style={{ height: "100%" }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
