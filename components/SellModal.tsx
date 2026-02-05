"use client";

import { useState, useMemo } from "react";
import { X, TrendingDown, Info, AlertCircle, Loader2 } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { usePlaceOrder } from "@/hooks/usePlaceOrder";

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    asset_id: string;
    size: number;
    avgPrice: number;      // 0.0–1.0 (доллары)
    currentValue: number;
    outcome?: string;
    question?: string;
  };
  currentPrice?: number;   // 0.0–1.0 (доллары)
  onSuccess?: () => void;
}

export function SellModal({
  isOpen,
  onClose,
  position,
  currentPrice,
  onSuccess,
}: SellModalProps) {
  const { authenticated, login } = usePrivy();
  const { sellShares } = usePlaceOrder();

  // price в ДОЛЛАРАХ (0.20 = 20¢)
  const [sellAmount, setSellAmount] = useState<string>("");
  const [sellPrice, setSellPrice] = useState<string>(
    (currentPrice ?? position.avgPrice).toFixed(2)
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sellAmountNum = useMemo(
    () => parseFloat(sellAmount || "0"),
    [sellAmount]
  );
  const sellPriceNum = useMemo(
    () => parseFloat(sellPrice || "0"),
    [sellPrice]
  );

  const maxShares = position.size;
  const estimatedProceeds = useMemo(
    () => sellAmountNum * sellPriceNum,
    [sellAmountNum, sellPriceNum]
  );

  const costBasis = sellAmountNum * position.avgPrice;
  const pnl = estimatedProceeds - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  const MIN_SHARES = 5;
  const isBelowMinimum = sellAmountNum > 0 && sellAmountNum < MIN_SHARES;
  const exceedsPosition = sellAmountNum > maxShares;

  const MIN_PRICE = 0.01; // 1¢
  const MAX_PRICE = 0.99; // 99¢

  const handleSell = async () => {
    if (!authenticated) {
      login();
      return;
    }

    if (!sellAmountNum || sellAmountNum <= 0 || !sellPriceNum || sellPriceNum <= 0) {
      setError("Please enter valid amount and price");
      return;
    }

    if (sellPriceNum < MIN_PRICE || sellPriceNum > MAX_PRICE) {
      setError("Price must be between 0.01 and 0.99 (1¢–99¢)");
      return;
    }

    if (exceedsPosition) {
      setError(`Cannot sell more than ${maxShares.toFixed(2)} shares`);
      return;
    }

    if (isBelowMinimum) {
      setError(`Minimum order size is ${MIN_SHARES} shares`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const orderId = await sellShares(
        position.asset_id,
        sellPriceNum,   // уже 0.0–1.0
        sellAmountNum
      );

      console.log("✅ Sell order placed:", orderId);

      alert(
        `✅ Sell order placed!\n\nOrder ID: ${orderId}\n\nSelling ${sellAmountNum.toFixed(
          2
        )} shares at ${(sellPriceNum * 100).toFixed(1)}¢`
      );

      onClose();
      setSellAmount("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error("❌ Sell error:", err);

      let errorMessage = err.message || "Failed to place sell order";

      if (err.message?.includes("Size") || err.message?.includes("minimum")) {
        errorMessage = `Minimum order size: ${MIN_SHARES} shares`;
      } else if (
        err.message?.includes("not enough balance") ||
        err.message?.includes("insufficient") ||
        err.message?.includes("allowance")
      ) {
        errorMessage =
          "Insufficient shares or approvals missing. Make sure your position is settled and approvals are set.";
      } else if (err.message?.includes("invalid signature")) {
        errorMessage = "Signature error. Please try logging out and back in.";
      } else if (err.message?.includes("invalid price")) {
        errorMessage = "Invalid price. Use between 0.01 and 0.99 (1¢–99¢).";
      }

      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetMaxAmount = () => {
    setSellAmount(maxShares.toFixed(2));
  };

  const handleSetPercentage = (percent: number) => {
    setSellAmount(((maxShares * percent) / 100).toFixed(2));
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4">
        <div className="w-full max-w-md bg-base-900 border border-white/10 rounded-2xl shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto">
          <div className="relative p-5 border-b border-white/5">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-5 h-5 text-rose-400" />
              <h2 className="font-display text-lg font-semibold tracking-tight text-slate-100">
                Sell Position
              </h2>
            </div>
            {position.question && (
              <p className="text-xs text-slate-400 line-clamp-2 pr-8 mt-1">
                {position.question}
              </p>
            )}
          </div>

          <div className="p-5 space-y-4">
            <div className="bg-base-850/50 border border-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Your Position</span>
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full font-medium">
                  {position.outcome || "Shares"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Shares Owned</p>
                  <p className="text-lg font-semibold text-slate-200">
                    {maxShares.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Avg Price</p>
                  <p className="text-lg font-semibold text-slate-200">
                    {(position.avgPrice * 100).toFixed(1)}¢
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-200">
                  Shares to Sell
                </label>
                <button
                  onClick={handleSetMaxAmount}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  Max: {maxShares.toFixed(2)}
                </button>
              </div>
              <input
                type="number"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-base-850/50 border border-white/10 rounded-xl px-4 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all placeholder:text-slate-500 text-slate-100"
                min="0"
                max={maxShares}
                step="0.01"
              />
              <div className="flex gap-2 mt-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleSetPercentage(pct)}
                    className="flex-1 py-1.5 text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">
                Sell Price (¢)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="0.20" // 20¢
                  className="w-full bg-base-850/50 border border-white/10 rounded-xl px-4 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all placeholder:text-slate-500 text-slate-100"
                  min={MIN_PRICE.toString()}
                  max={MAX_PRICE.toString()}
                  step="0.01"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  $
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                This is in dollars: 0.20 = 20¢.
              </p>
            </div>

            {sellAmountNum > 0 && sellPriceNum > 0 && (
              <div className="bg-base-850/30 border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Est. Proceeds</span>
                  <span className="text-sm font-medium text-slate-200">
                    ${estimatedProceeds.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Cost Basis</span>
                  <span className="text-sm font-medium text-slate-200">
                    ${costBasis.toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-200">P&L</span>
                  <span
                    className={`text-base font-bold ${
                      pnl >= 0 ? "text-teal-300" : "text-rose-300"
                    }`}
                  >
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                    <span className="text-xs text-slate-500 ml-1">
                      ({pnlPercent >= 0 ? "+" : ""}
                      {pnlPercent.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            )}

            {isBelowMinimum && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-300">
                  Minimum order: {MIN_SHARES} shares
                </p>
              </div>
            )}

            {exceedsPosition && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-300">
                  Cannot sell more than {maxShares.toFixed(2)} shares
                </p>
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-rose-300">{error}</p>
              </div>
            )}

            <button
              onClick={handleSell}
              disabled={
                !sellAmountNum ||
                sellAmountNum <= 0 ||
                !sellPriceNum ||
                sellPriceNum <= 0 ||
                sellPriceNum < MIN_PRICE ||
                sellPriceNum > MAX_PRICE ||
                isProcessing ||
                isBelowMinimum ||
                exceedsPosition
              }
              className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-rose-500 text-white hover:bg-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Placing sell order...
                </span>
              ) : (
                `Sell ${
                  sellAmountNum > 0 ? sellAmountNum.toFixed(2) : "0"
                } shares for $${estimatedProceeds.toFixed(2)}`
              )}
            </button>

            {!authenticated && (
              <p className="text-center text-xs text-slate-500">
                Please sign in to sell positions
              </p>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs text-blue-300 leading-relaxed">
                <Info className="w-3.5 h-3.5 inline mr-1" />
                Your sell order will be placed on the orderbook at{" "}
                {(sellPriceNum * 100).toFixed(1)}¢. It will execute when a buyer
                matches your price.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
