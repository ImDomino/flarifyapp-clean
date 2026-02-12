"use client";

import { useState, useMemo, useEffect } from "react";
import { X, TrendingDown, Info, AlertCircle, Loader2, Zap } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { usePlaceOrder } from "@/hooks/usePlaceOrder";

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    asset_id: string;
    size: number;
    avgPrice: number;
    currentValue: number;
    outcome?: string;
    question?: string;
    negRisk?: boolean;
  };
  currentPrice?: number;
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

  const [sellAmount, setSellAmount] = useState<string>("");
  const [sellPrice, setSellPrice] = useState<string>(
    (currentPrice ?? position.avgPrice).toFixed(2)
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bestBid, setBestBid] = useState<number | null>(null);
  const [loadingBest, setLoadingBest] = useState(false);

  // Fetch best bid from orderbook when modal opens
  useEffect(() => {
    if (!isOpen || !position.asset_id) return;

    let cancelled = false;
    setLoadingBest(true);

    const fetchBestBid = async () => {
      try {
        const res = await fetch(
          `/api/polymarket/price?token_id=${encodeURIComponent(position.asset_id)}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data.bestBid != null && data.bestBid > 0) {
          setBestBid(data.bestBid);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoadingBest(false);
      }
    };

    fetchBestBid();
    return () => { cancelled = true; };
  }, [isOpen, position.asset_id]);

  const sellAmountNum = useMemo(() => parseFloat(sellAmount || "0"), [sellAmount]);
  const sellPriceNum = useMemo(() => parseFloat(sellPrice || "0"), [sellPrice]);

  const maxShares = position.size;
  const estimatedProceeds = useMemo(() => sellAmountNum * sellPriceNum, [sellAmountNum, sellPriceNum]);
  const costBasis = sellAmountNum * position.avgPrice;
  const pnl = estimatedProceeds - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

  const MIN_SHARES = 5;
  const isBelowMinimum = sellAmountNum > 0 && sellAmountNum < MIN_SHARES;
  const exceedsPosition = sellAmountNum > maxShares;
  const MIN_PRICE = 0.01;
  const MAX_PRICE = 0.99;

  const handleBestPrice = () => {
    if (bestBid != null) {
      setSellPrice(bestBid.toFixed(4));
      setSellAmount(maxShares.toFixed(2));
    }
  };

  const handleSell = async () => {
    if (!authenticated) { login(); return; }

    if (!sellAmountNum || sellAmountNum <= 0 || !sellPriceNum || sellPriceNum <= 0) {
      setError("Please enter valid amount and price"); return;
    }
    if (sellPriceNum < MIN_PRICE || sellPriceNum > MAX_PRICE) {
      setError("Price must be between 0.01 and 0.99 (1¢–99¢)"); return;
    }
    if (exceedsPosition) {
      setError(`Cannot sell more than ${maxShares.toFixed(2)} shares`); return;
    }
    if (isBelowMinimum) {
      setError(`Minimum order size is ${MIN_SHARES} shares`); return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const orderId = await sellShares(
        position.asset_id,
        sellPriceNum,
        sellAmountNum,
        position.negRisk ?? false
      );

      alert(
        `✅ Sell order placed!\n\nOrder ID: ${orderId}\n\nSelling ${sellAmountNum.toFixed(2)} shares at ${(sellPriceNum * 100).toFixed(1)}¢`
      );

      onClose();
      setSellAmount("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      let errorMessage = err.message || "Failed to place sell order";
      if (err.message?.includes("Size") || err.message?.includes("minimum")) {
        errorMessage = `Minimum order size: ${MIN_SHARES} shares`;
      } else if (err.message?.includes("not enough balance") || err.message?.includes("insufficient") || err.message?.includes("allowance")) {
        errorMessage = "Insufficient shares or approvals missing.";
      } else if (err.message?.includes("invalid signature")) {
        errorMessage = "Signature error. Try logging out and back in.";
      } else if (err.message?.includes("invalid price")) {
        errorMessage = "Invalid price. Use between 0.01 and 0.99 (1¢–99¢).";
      }
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetMaxAmount = () => setSellAmount(maxShares.toFixed(2));

  const handleSetPercentage = (percent: number) => {
    setSellAmount(((maxShares * percent) / 100).toFixed(2));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[9999]" onClick={onClose} />

      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4">
        <div className="w-full max-w-md bg-[#0a0a0a] border-2 border-white pointer-events-auto max-h-[90vh] overflow-y-auto relative">
          {/* Corner accents */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white" />

          {/* Header */}
          <div className="relative p-5 border-b border-zinc-800">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-5 h-5 text-zinc-400" />
              <h2 className="font-black text-lg uppercase tracking-wider text-white">
                Sell Position
              </h2>
            </div>
            {position.question && (
              <p className="text-xs text-zinc-500 font-bold line-clamp-2 pr-8 mt-1">
                {position.question}
              </p>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Position info */}
            <div className="border border-zinc-800 bg-[#111] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Your Position</span>
                <span className="text-xs px-2 py-1 border border-zinc-700 text-zinc-300 font-black uppercase tracking-wider">
                  {position.outcome || "Shares"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-zinc-800">
                <div className="bg-[#0a0a0a] p-3">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Shares</p>
                  <p className="text-lg font-mono font-bold text-white">{maxShares.toFixed(2)}</p>
                </div>
                <div className="bg-[#0a0a0a] p-3">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Avg Price</p>
                  <p className="text-lg font-mono font-bold text-white">{(position.avgPrice * 100).toFixed(1)}¢</p>
                </div>
              </div>
            </div>

            {/* Shares to sell */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Shares to Sell
                </label>
                <button
                  onClick={handleSetMaxAmount}
                  className="text-xs text-zinc-400 hover:text-white font-bold uppercase tracking-wider"
                >
                  Max: {maxShares.toFixed(2)}
                </button>
              </div>
              <input
                type="number"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#111] border border-zinc-800 px-4 py-4 text-lg font-bold focus:outline-none focus:border-white transition-all text-white placeholder-zinc-700"
                min="0"
                max={maxShares}
                step="0.01"
              />
              <div className="grid grid-cols-4 gap-px bg-zinc-800 mt-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleSetPercentage(pct)}
                    className="py-2 text-xs font-black uppercase tracking-wider text-zinc-400 bg-[#111] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Sell price */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                Sell Price ($)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input
                  type="number"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="0.20"
                  className="w-full bg-[#111] border border-zinc-800 pl-8 pr-4 py-4 text-lg font-bold focus:outline-none focus:border-white transition-all text-white placeholder-zinc-700"
                  min={MIN_PRICE.toString()}
                  max={MAX_PRICE.toString()}
                  step="0.01"
                />
              </div>
              <p className="mt-1 text-[10px] text-zinc-600 uppercase tracking-wider font-bold">
                0.20 = 20¢ · Range: 1¢–99¢
              </p>
            </div>

            {/* Best Price button */}
            {bestBid != null && bestBid > 0 && (
              <button
                onClick={handleBestPrice}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-white bg-white text-black font-black uppercase tracking-wider text-xs hover:bg-black hover:text-white transition-colors"
              >
                <Zap className="w-4 h-4" />
                Instant Sell: {(bestBid * 100).toFixed(1)}¢
              </button>
            )}
            {loadingBest && (
              <div className="flex items-center justify-center gap-2 py-2 text-zinc-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-[10px] uppercase tracking-wider font-bold">Loading orderbook...</span>
              </div>
            )}

            {/* Calculations */}
            {sellAmountNum > 0 && sellPriceNum > 0 && (
              <div className="border border-zinc-800 bg-[#111] divide-y divide-zinc-800">
                <div className="flex justify-between items-center p-3">
                  <span className="text-xs text-zinc-500 uppercase font-bold">Est. Proceeds</span>
                  <span className="text-sm font-mono font-bold text-white">${estimatedProceeds.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3">
                  <span className="text-xs text-zinc-500 uppercase font-bold">Cost Basis</span>
                  <span className="text-sm font-mono font-bold text-white">${costBasis.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3">
                  <span className="text-xs text-zinc-500 uppercase font-bold">P&L</span>
                  <span className={`text-sm font-mono font-bold ${pnl >= 0 ? "text-white" : "text-red-400"}`}>
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                    <span className="text-zinc-600 ml-1">
                      ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Warnings */}
            {isBelowMinimum && (
              <div className="border border-zinc-600 bg-[#111] p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-zinc-400 font-bold">Minimum order: {MIN_SHARES} shares</p>
              </div>
            )}

            {exceedsPosition && (
              <div className="border border-red-800 bg-red-950/30 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400 font-bold">Cannot sell more than {maxShares.toFixed(2)} shares</p>
              </div>
            )}

            {error && (
              <div className="border border-red-800 bg-red-950/30 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400 font-bold">{error}</p>
              </div>
            )}

            {/* Action */}
            <button
              onClick={handleSell}
              disabled={
                !sellAmountNum || sellAmountNum <= 0 ||
                !sellPriceNum || sellPriceNum <= 0 ||
                sellPriceNum < MIN_PRICE || sellPriceNum > MAX_PRICE ||
                isProcessing || isBelowMinimum || exceedsPosition
              }
              className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Placing sell order...
                </span>
              ) : (
                `Sell ${sellAmountNum > 0 ? sellAmountNum.toFixed(2) : "0"} shares — $${estimatedProceeds.toFixed(2)}`
              )}
            </button>

            {!authenticated && (
              <p className="text-center text-xs text-zinc-600 uppercase font-bold tracking-wider">
                Sign in to sell positions
              </p>
            )}

            {/* Info */}
            <div className="border border-zinc-800 bg-[#111] p-3">
              <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-wider">
                <Info className="w-3 h-3 inline mr-1" />
                Sell order at {(sellPriceNum * 100).toFixed(1)}¢. Executes when a buyer matches your price.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}