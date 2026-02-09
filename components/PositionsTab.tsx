"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Loader2, AlertCircle, RefreshCw,
  X, Clock, ShoppingCart, Package,
} from "lucide-react";
import { usePositions, UserPosition } from "@/hooks/usePositions";
import { useOpenOrders, OpenOrder } from "@/hooks/useOpenOrders";
import { SellModal } from "./SellModal";

type SubTab = "positions" | "orders";

export function PositionsTab() {
  const { positions, isLoading: posLoading, error: posError, fetchPositions } = usePositions();
  const { orders, isLoading: ordLoading, error: ordError, fetchOrders, cancelOrder, cancelAllOrders } = useOpenOrders();

  const [subTab, setSubTab] = useState<SubTab>("positions");
  const [refreshing, setRefreshing] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<UserPosition | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellingAll, setCancellingAll] = useState(false);

  useEffect(() => { fetchPositions(); fetchOrders(); }, [fetchPositions, fetchOrders]);

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

  const handleSellSuccess = () => { fetchPositions(); fetchOrders(); };

  const handleCancelOrder = async (orderId: string) => {
    if (cancellingId) return;
    setCancellingId(orderId);
    try {
      const ok = await cancelOrder(orderId);
      if (ok) await fetchOrders();
    } finally { setCancellingId(null); }
  };

  const handleCancelAll = async () => {
    if (cancellingAll || orders.length === 0) return;
    if (!confirm(`Cancel all ${orders.length} open orders?`)) return;
    setCancellingAll(true);
    try { await cancelAllOrders(); await fetchOrders(); }
    finally { setCancellingAll(false); }
  };

  const isLoading = subTab === "positions" ? posLoading : ordLoading;
  const error = subTab === "positions" ? posError : ordError;

  return (
    <>
      <div className="space-y-4">
        {/* Sub-tab header */}
        <div className="flex items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-px bg-zinc-800 flex-1">
            <button
              onClick={() => setSubTab("positions")}
              className={`flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-wider transition-colors ${
                subTab === "positions"
                  ? "bg-white text-black"
                  : "bg-[#111] text-zinc-500 hover:text-white"
              }`}
            >
              <Package className="w-4 h-4" />
              Positions
              {positions.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 ${
                  subTab === "positions" ? "bg-black text-white" : "bg-zinc-800 text-zinc-400"
                }`}>
                  {positions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSubTab("orders")}
              className={`flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-wider transition-colors ${
                subTab === "orders"
                  ? "bg-white text-black"
                  : "bg-[#111] text-zinc-500 hover:text-white"
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Orders
              {orders.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 ${
                  subTab === "orders" ? "bg-black text-white" : "bg-zinc-800 text-zinc-400"
                }`}>
                  {orders.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 border border-zinc-800 text-zinc-400 hover:text-white hover:border-white transition-colors disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-800 bg-red-950/30 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400 font-bold mb-1">Failed to load {subTab}</p>
              <p className="text-xs text-zinc-500">{error}</p>
              <button onClick={handleRefresh} className="mt-2 text-xs text-red-400 hover:text-white font-bold uppercase tracking-wider">
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && !error && (subTab === "positions" ? positions.length === 0 : orders.length === 0) && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-white animate-spin" />
          </div>
        )}

        {/* POSITIONS TAB */}
        {subTab === "positions" && !isLoading && !error && (
          <>
            {positions.length === 0 ? (
              <EmptyState icon={<TrendingUp className="w-8 h-8 text-zinc-500" />} title="No Positions Yet" subtitle="Place orders on markets to see them here" />
            ) : (
              positions.map((pos) => <PositionCard key={pos.asset_id} position={pos} onSell={handleSellClick} />)
            )}
          </>
        )}

        {/* ORDERS TAB */}
        {subTab === "orders" && !isLoading && !error && (
          <>
            {orders.length === 0 ? (
              <EmptyState icon={<ShoppingCart className="w-8 h-8 text-zinc-500" />} title="No Open Orders" subtitle="Your pending buy/sell orders will appear here" />
            ) : (
              <>
                <div className="flex justify-end">
                  <button
                    onClick={handleCancelAll}
                    disabled={cancellingAll}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-400 border border-red-800 hover:bg-red-950/30 transition disabled:opacity-50"
                  >
                    {cancellingAll ? <><Loader2 className="w-3 h-3 animate-spin" />Cancelling...</> : <><X className="w-3 h-3" />Cancel All ({orders.length})</>}
                  </button>
                </div>
                {orders.map((order) => <OrderCard key={order.id} order={order} onCancel={handleCancelOrder} isCancelling={cancellingId === order.id} />)}
              </>
            )}
          </>
        )}
      </div>

      {selectedPosition && (
        <SellModal
          isOpen={sellModalOpen}
          onClose={() => { setSellModalOpen(false); setSelectedPosition(null); }}
          position={selectedPosition}
          currentPrice={selectedPosition.avgPrice}
          onSuccess={handleSellSuccess}
        />
      )}
    </>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700 flex items-center justify-center">{icon}</div>
      <p className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-2">{title}</p>
      <p className="text-xs text-zinc-600 uppercase tracking-wider">{subtitle}</p>
    </div>
  );
}

function PositionCard({ position: pos, onSell }: { position: UserPosition; onSell: (p: UserPosition) => void }) {
  const isUp = pos.currentValue >= pos.size * pos.avgPrice;
  const avgPriceCents = pos.avgPrice * 100;
  const totalCost = pos.size * pos.avgPrice;
  const currentValue = pos.currentValue || totalCost;
  const pnlColor = pos.cashPnl > 0 ? "text-white" : pos.cashPnl < 0 ? "text-red-400" : "text-zinc-500";

  return (
    <article className="border border-zinc-800 bg-[#111] p-5 interact-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {pos.question && <p className="text-sm font-bold text-white mb-2">{pos.question}</p>}
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1 border ${
              isUp ? "border-white text-white bg-white/5" : "border-zinc-700 text-zinc-400"
            }`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {pos.outcome || "Position"}
            </span>
            <span className="text-xs text-zinc-600 font-mono">{avgPriceCents.toFixed(1)}¢ avg</span>
          </div>

          <div className="grid grid-cols-3 gap-px bg-zinc-800">
            <div className="bg-[#0a0a0a] p-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Size</p>
              <p className="text-sm font-mono font-bold text-white">{pos.size.toFixed(2)}</p>
            </div>
            <div className="bg-[#0a0a0a] p-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Value</p>
              <p className="text-sm font-mono font-bold text-white">${currentValue.toFixed(2)}</p>
            </div>
            <div className="bg-[#0a0a0a] p-3">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">PnL</p>
              <p className={`text-sm font-mono font-bold ${pnlColor}`}>
                {pos.cashPnl >= 0 ? "+" : ""}${pos.cashPnl.toFixed(2)}{" "}
                <span className="text-zinc-600">({pos.percentPnl >= 0 ? "+" : ""}{pos.percentPnl.toFixed(1)}%)</span>
              </p>
            </div>
          </div>

          <p className="text-[10px] text-zinc-700 mt-3 font-mono">
            Asset: {(pos.asset_id || "").slice(0, 15)}...
          </p>
        </div>

        <button
          onClick={() => onSell(pos)}
          disabled={pos.size <= 0}
          className="ml-4 px-4 py-2 text-xs font-black uppercase tracking-wider border border-zinc-700 text-zinc-400 hover:border-white hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-30"
        >
          Sell
        </button>
      </div>

      <div className="relative h-1 bg-zinc-800 overflow-hidden">
        <div className={`h-full ${isUp ? "bg-white" : "bg-zinc-600"}`} style={{ width: "100%" }} />
      </div>
    </article>
  );
}

function OrderCard({ order, onCancel, isCancelling }: { order: OpenOrder; onCancel: (id: string) => void; isCancelling: boolean }) {
  const isBuy = order.side === "BUY";
  const priceCents = (parseFloat(order.price) * 100).toFixed(1);
  const sizeNum = parseFloat((order as any).size);
  const total = parseFloat(order.price) * sizeNum;
  const createdDate = order.created_at ? new Date(order.created_at * 1000).toLocaleString() : "—";

  return (
    <article className="border border-zinc-800 bg-[#111] p-4 interact-border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {order.question && <p className="text-sm font-bold text-white mb-2 line-clamp-2">{order.question}</p>}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider border ${
              isBuy ? "border-white text-white" : "border-zinc-700 text-zinc-400"
            }`}>
              {order.side}
            </span>
            {order.outcome && (
              <span className="px-2.5 py-1 text-xs font-bold border border-zinc-800 text-zinc-400">
                {order.outcome}
              </span>
            )}
            <span className="text-[10px] text-zinc-600 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />{createdDate}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-px bg-zinc-800">
            <div className="bg-[#0a0a0a] p-2.5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">Price</p>
              <p className="text-sm font-mono font-bold text-white">{priceCents}¢</p>
            </div>
            <div className="bg-[#0a0a0a] p-2.5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">Size</p>
              <p className="text-sm font-mono font-bold text-white">{sizeNum.toFixed(2)}</p>
            </div>
            <div className="bg-[#0a0a0a] p-2.5">
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">Total</p>
              <p className="text-sm font-mono font-bold text-white">${total.toFixed(2)}</p>
            </div>
          </div>

          <p className="text-[10px] text-zinc-700 mt-2 font-mono">Order: {order.id.slice(0, 12)}...</p>
        </div>

        <button
          onClick={() => onCancel(order.id)}
          disabled={isCancelling}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-wider border border-red-800 text-red-400 hover:bg-red-950/30 transition disabled:opacity-50"
        >
          {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          Cancel
        </button>
      </div>
    </article>
  );
}
