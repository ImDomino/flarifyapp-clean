"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  Clock,
  ShoppingCart,
  Package,
} from "lucide-react";
import { usePositions, UserPosition } from "@/hooks/usePositions";
import { useOpenOrders, OpenOrder } from "@/hooks/useOpenOrders";
import { SellModal } from "./SellModal";

type SubTab = "positions" | "orders";

export function PositionsTab() {
  const { positions, isLoading: posLoading, error: posError, fetchPositions } = usePositions();
  const {
    orders,
    isLoading: ordLoading,
    error: ordError,
    fetchOrders,
    cancelOrder,
    cancelAllOrders,
  } = useOpenOrders();

  const [subTab, setSubTab] = useState<SubTab>("positions");
  const [refreshing, setRefreshing] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<UserPosition | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellingAll, setCancellingAll] = useState(false);

  useEffect(() => {
    fetchPositions();
    fetchOrders();
  }, [fetchPositions, fetchOrders]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await Promise.all([fetchPositions(), fetchOrders()]);
    setRefreshing(false);
  };

  const handleSellClick = (position: UserPosition) => {
    setSelectedPosition(position);
    setSellModalOpen(true);
  };

  const handleSellSuccess = () => {
    fetchPositions();
    fetchOrders();
  };

  const handleCancelOrder = async (orderId: string) => {
    if (cancellingId) return;
    setCancellingId(orderId);
    try {
      const ok = await cancelOrder(orderId);
      if (ok) {
        await fetchOrders();
      }
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelAll = async () => {
    if (cancellingAll || orders.length === 0) return;
    if (!confirm(`Cancel all ${orders.length} open orders?`)) return;
    setCancellingAll(true);
    try {
      await cancelAllOrders();
      await fetchOrders();
    } finally {
      setCancellingAll(false);
    }
  };

  const isLoading = subTab === "positions" ? posLoading : ordLoading;
  const error = subTab === "positions" ? posError : ordError;

  return (
    <>
      <div className="space-y-4">
        {/* Sub-tab header */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-base-850/70 border border-white/5 p-1">
            <button
              onClick={() => setSubTab("positions")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold transition ${
                subTab === "positions"
                  ? "text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
                  : "text-slate-300 hover:text-slate-100 hover:bg-white/5"
              }`}
            >
              <Package className="w-4 h-4" />
              Positions
              {positions.length > 0 && (
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  subTab === "positions"
                    ? "bg-white/20 text-slate-950"
                    : "bg-white/10 text-slate-400"
                }`}>
                  {positions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSubTab("orders")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-semibold transition ${
                subTab === "orders"
                  ? "text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
                  : "text-slate-300 hover:text-slate-100 hover:bg-white/5"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Open Orders
              {orders.length > 0 && (
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  subTab === "orders"
                    ? "bg-white/20 text-slate-950"
                    : "bg-amber-500/20 text-amber-300"
                }`}>
                  {orders.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-rose-300 font-medium mb-1">
                Failed to load {subTab}
              </p>
              <p className="text-xs text-slate-400">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-2 text-xs text-rose-300 hover:text-rose-200 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && !error && (subTab === "positions" ? positions.length === 0 : orders.length === 0) && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* ============ POSITIONS TAB ============ */}
        {subTab === "positions" && !isLoading && !error && (
          <>
            {positions.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="w-8 h-8 text-blue-300" />}
                title="No positions yet"
                subtitle="Place orders on markets to see them here"
              />
            ) : (
              positions.map((pos) => (
                <PositionCard
                  key={pos.asset_id}
                  position={pos}
                  onSell={handleSellClick}
                />
              ))
            )}
          </>
        )}

        {/* ============ ORDERS TAB ============ */}
        {subTab === "orders" && !isLoading && !error && (
          <>
            {orders.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="w-8 h-8 text-blue-300" />}
                title="No open orders"
                subtitle="Your pending buy/sell orders will appear here"
              />
            ) : (
              <>
                {/* Cancel all button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleCancelAll}
                    disabled={cancellingAll}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition disabled:opacity-50"
                  >
                    {cancellingAll ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3" />
                        Cancel All ({orders.length})
                      </>
                    )}
                  </button>
                </div>

                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onCancel={handleCancelOrder}
                    isCancelling={cancellingId === order.id}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Sell Modal */}
      {selectedPosition && (
        <SellModal
          isOpen={sellModalOpen}
          onClose={() => {
            setSellModalOpen(false);
            setSelectedPosition(null);
          }}
          position={selectedPosition}
          currentPrice={selectedPosition.avgPrice}
          onSuccess={handleSellSuccess}
        />
      )}
    </>
  );
}

/* ——— Sub-components ——— */

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-slate-400 mb-2">{title}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function PositionCard({
  position: pos,
  onSell,
}: {
  position: UserPosition;
  onSell: (p: UserPosition) => void;
}) {
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
    <article className="rounded-xl border border-white/10 bg-base-850/45 p-5 shadow-soft">
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
                {pos.cashPnl >= 0 ? "+" : ""}${pos.cashPnl.toFixed(2)}{" "}
                <span className="text-xs text-slate-500">
                  ({pos.percentPnl >= 0 ? "+" : ""}
                  {pos.percentPnl.toFixed(1)}%)
                </span>
              </p>
            </div>
          </div>

          <p className="text-[10px] text-slate-500/70 mt-3 font-mono">
            Asset: {(pos.asset_id || "").slice(0, 15)}...
          </p>
        </div>

        <button
          onClick={() => onSell(pos)}
          disabled={pos.size <= 0}
          className="ml-4 px-4 py-2 rounded-lg text-sm font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Sell
        </button>
      </div>

      <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <div
          className={`h-full ${
            isUp
              ? "bg-gradient-to-r from-blue-500 to-teal-400"
              : "bg-gradient-to-r from-rose-500 to-rose-400"
          }`}
          style={{ width: "100%" }}
        />
      </div>
    </article>
  );
}

function OrderCard({
  order,
  onCancel,
  isCancelling,
}: {
  order: OpenOrder;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const isBuy = order.side === "BUY";

  const priceNum = parseFloat(order.price) || 0;
  const priceCents = (priceNum * 100).toFixed(1);

  const originalSize = parseFloat(order.original_size) || 0;
  const sizeMatched = parseFloat(order.size_matched) || 0;
  const sizeRemaining = parseFloat(order.size_remaining) || originalSize;

  const total = priceNum * originalSize;
  const fillPercent = originalSize > 0 ? (sizeMatched / originalSize) * 100 : 0;

  const createdDate = order.created_at
    ? new Date(order.created_at * 1000).toLocaleString()
    : "—";

  return (
    <article className="rounded-xl border border-white/10 bg-base-850/45 p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Question / market */}
          {order.question && (
            <p className="text-sm font-medium text-slate-200 mb-2 line-clamp-2">
              {order.question}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Side badge */}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                isBuy
                  ? "bg-teal-500/15 text-teal-200 border border-teal-500/20"
                  : "bg-rose-500/15 text-rose-300 border border-rose-500/20"
              }`}
            >
              {order.side}
            </span>

            {order.outcome && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-200 border border-blue-500/20">
                {order.outcome}
              </span>
            )}

            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {createdDate}
            </span>
          </div>

          {/* Order details */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-white/10 bg-base-900/35 p-2.5">
              <p className="text-[10px] text-slate-500 mb-0.5">Price</p>
              <p className="text-sm font-semibold text-slate-200">
                {priceCents}¢
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-base-900/35 p-2.5">
              <p className="text-[10px] text-slate-500 mb-0.5">Size</p>
              <p className="text-sm font-semibold text-slate-200">
                {originalSize.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-base-900/35 p-2.5">
              <p className="text-[10px] text-slate-500 mb-0.5">Total</p>
              <p className="text-sm font-semibold text-slate-200">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Fill progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500">
                Filled: {sizeMatched.toFixed(2)} / {originalSize.toFixed(2)}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                {fillPercent.toFixed(0)}%
              </span>
            </div>
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all ${
                  isBuy
                    ? "bg-gradient-to-r from-blue-500 to-teal-400"
                    : "bg-gradient-to-r from-rose-500 to-rose-400"
                }`}
                style={{ width: `${Math.min(fillPercent, 100)}%` }}
              />
            </div>
            {sizeRemaining > 0 && sizeRemaining < originalSize && (
              <p className="text-[10px] text-slate-500 mt-1">
                Remaining: {sizeRemaining.toFixed(2)} shares
              </p>
            )}
          </div>

          {/* Order ID */}
          <p className="text-[10px] text-slate-500/70 mt-2 font-mono">
            Order: {order.id.slice(0, 12)}...
          </p>
        </div>

        {/* Cancel button */}
        <button
          onClick={() => onCancel(order.id)}
          disabled={isCancelling}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCancelling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
          Cancel
        </button>
      </div>
    </article>
  );
}
