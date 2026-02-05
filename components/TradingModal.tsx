"use client";

import { useState, useMemo } from "react";
import { X, TrendingUp, Info } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { Side } from "@polymarket/clob-client";
import { usePlaceOrder } from "@/hooks/usePlaceOrder";

interface MarketData {
  question: string;
  outcomes: string[];
  prices: number[];
  volume: string;
  url: string;
  yesTokenId?: string;
  noTokenId?: string;
  tokens?: Array<{ token_id: string; outcome: string; price: string }>;
}

interface TradingModalProps {
  marketId: string;
  marketData: MarketData;
  outcome: string;
  outcomeIndex: number;
  onClose: () => void;
  isOpen: boolean;
}

export function TradingModal({
  marketId,
  marketData,
  outcome,
  outcomeIndex,
  onClose,
  isOpen,
}: TradingModalProps) {
  const { authenticated, login } = usePrivy();
  const { placeOrder } = usePlaceOrder();

  const [amount, setAmount] = useState<string>("10");
  const [isProcessing, setIsProcessing] = useState(false);

  const price = marketData.prices[outcomeIndex] ?? 0;
  const amountNum = useMemo(() => parseFloat(amount || "0"), [amount]);

  const shares = useMemo(
    () => (price > 0 && amountNum > 0 ? amountNum / price : 0),
    [amountNum, price]
  );

  const MIN_SHARES = 5;
  const minAmount = useMemo(() => MIN_SHARES * price, [price]);

  const potentialWin = useMemo(
    () => (shares > 0 ? shares * 1 : 0),
    [shares]
  );
  const profit = useMemo(
    () => potentialWin - amountNum,
    [potentialWin, amountNum]
  );

  const side: "yes" | "no" = outcomeIndex === 0 ? "yes" : "no";
  const displayPriceCents = price * 100;
  const isBelowMinimum = shares > 0 && shares < MIN_SHARES;

  const resolveTokenId = (): string | undefined => {
    if (outcomeIndex === 0 && marketData.yesTokenId) return marketData.yesTokenId;
    if (outcomeIndex === 1 && marketData.noTokenId) return marketData.noTokenId;
    if (marketData.tokens && marketData.tokens[outcomeIndex]) {
      return marketData.tokens[outcomeIndex].token_id;
    }
    return undefined;
  };

  const handleTrade = async () => {
    if (!amountNum || amountNum <= 0) return;

    if (!authenticated) {
      login();
      return;
    }

    const tokenId = resolveTokenId();

    if (!tokenId) {
      alert(`Token ID not found for ${outcome}. This market may not support trading yet.`);
      return;
    }

    setIsProcessing(true);

    try {
      const orderId = await placeOrder({
        tokenId,
        side: Side.BUY,
        price,
        size: shares,
      });

      alert(`✅ Order placed successfully!\n\nOrder ID: ${orderId}\n\nYou bought ${shares.toFixed(2)} ${outcome} shares`);
      onClose();
      setAmount("10");
    } catch (error: any) {
      let errorMessage = error.message || "Unknown error";
      
      if (error.message?.includes("Size") && error.message?.includes("minimum")) {
        errorMessage = `❌ Order too small.\n\nMinimum order size: ${MIN_SHARES} shares ($${minAmount.toFixed(2)} at current price).`;
      } else if (error.message?.includes("not enough balance")) {
        errorMessage = "❌ Insufficient USDC balance.\n\nPlease deposit funds using the 'Deposit' button.";
      }
      
      alert(`Failed to place order:\n\n${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4">
        <div className="w-full max-w-md bg-base-900 border border-white/10 rounded-2xl shadow-2xl pointer-events-auto">
          {/* Header */}
          <div className="relative p-5 border-b border-white/5">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-blue-300" />
              <h2 className="font-display text-lg font-semibold tracking-tight text-slate-100">
                Place Order
              </h2>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2 pr-8">
              {marketData.question}
            </p>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Trade Info */}
            <div className="bg-base-850/50 border border-white/5 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-1">You're buying</p>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-display font-semibold ${
                    side === "yes"
                      ? "text-teal-300"
                      : "text-rose-300"
                  }`}
                >
                  {outcome}
                </span>
                <span className="text-slate-400 text-sm">
                  at {displayPriceCents.toFixed(1)}¢
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-sm font-medium text-slate-200 mb-2 block">
                Amount (USDC)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-base-850/50 border border-white/10 rounded-xl pl-8 pr-4 py-3.5 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500 text-slate-100"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Calculations */}
            {amountNum > 0 && price > 0 && (
              <div className="bg-base-850/30 border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Shares</span>
                  <span className="text-sm font-medium text-slate-200">
                    {shares.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Potential win</span>
                  <span className="text-sm font-medium text-slate-200">
                    ${potentialWin.toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-200">Profit if correct</span>
                  <span
                    className={`text-base font-bold ${
                      profit > 0 ? "text-teal-300" : "text-slate-400"
                    }`}
                  >
                    ${profit.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Minimum warning */}
            {isBelowMinimum && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-300">
                  ⚠️ Minimum order: {MIN_SHARES} shares (${minAmount.toFixed(2)} at current price)
                </p>
              </div>
            )}

            {/* Buy Button */}
            <button
              onClick={handleTrade}
              disabled={!amountNum || amountNum <= 0 || isProcessing || price <= 0 || isBelowMinimum}
              className={`w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                side === "yes"
                  ? "bg-teal-500 text-white hover:bg-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
                  : "bg-rose-500 text-white hover:bg-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Placing order...
                </span>
              ) : isBelowMinimum ? (
                `Minimum ${MIN_SHARES} shares ($${minAmount.toFixed(2)})`
              ) : (
                `Buy ${outcome} for $${amountNum.toFixed(2)}`
              )}
            </button>

            {!authenticated && (
              <p className="text-center text-xs text-slate-500">
                Please sign in to place orders
              </p>
            )}

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs text-blue-300 leading-relaxed">
                <Info className="w-3.5 h-3.5 inline mr-1" />
                You're buying {outcome} shares at {displayPriceCents.toFixed(1)}¢ each. 
                If correct, each share pays $1. Profit: ${profit.toFixed(2)}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}