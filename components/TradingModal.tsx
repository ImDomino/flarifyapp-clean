"use client";

import { useState, useMemo } from "react";
import { X, TrendingUp, TrendingDown, Info, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { Side } from "@polymarket/clob-client";
import { usePlaceOrder } from "@/hooks/usePlaceOrder";

interface TradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;
  question: string;
  initialSide: "yes" | "no";
  yesPrice: number;
  noPrice: number;
  yesTokenId?: string;
  noTokenId?: string;
  negRisk?: boolean;
}

type TradeType = "buy" | "sell";

const MIN_SHARES = 5;
const MIN_BUY_AMOUNT_USD = 1.01;

export function TradingModal({
  isOpen, onClose, marketId, question, initialSide,
  yesPrice, noPrice, yesTokenId, noTokenId, negRisk,
}: TradingModalProps) {
  const { authenticated, login } = usePrivy();
  const { placeOrder } = usePlaceOrder();

  const [side, setSide] = useState<"yes" | "no">(initialSide);
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [amount, setAmount] = useState<string>("10");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const price = side === "yes" ? yesPrice : noPrice;
  const amountNum = useMemo(() => parseFloat(amount || "0"), [amount]);
  const shares = useMemo(() => (price > 0 && amountNum > 0 ? amountNum / price : 0), [amountNum, price]);
  const minAmountByShares = useMemo(() => MIN_SHARES * price, [price]);
  const minBuyAmount = useMemo(() => Math.max(minAmountByShares, MIN_BUY_AMOUNT_USD), [minAmountByShares]);
  const potentialWin = useMemo(() => (shares > 0 ? shares * 1 : 0), [shares]);
  const profit = useMemo(() => potentialWin - amountNum, [potentialWin, amountNum]);
  const sellProceeds = useMemo(() => amountNum * price, [amountNum, price]);
  const displayPriceCents = price * 100;

  const isBuyBelowMinShares = tradeType === "buy" && shares > 0 && shares < MIN_SHARES;
  const isBuyBelowMinUsd = tradeType === "buy" && amountNum > 0 && amountNum < MIN_BUY_AMOUNT_USD;
  const isBuyBelowMin = isBuyBelowMinShares || isBuyBelowMinUsd;
  const isSellBelowMin = tradeType === "sell" && amountNum > 0 && amountNum < MIN_SHARES;

  const resolveTokenId = (): string | undefined => side === "yes" ? yesTokenId : noTokenId;

  const handleTrade = async () => {
    setError(null);
    setSuccessMsg(null);
    if (!authenticated) { login(); return; }

    const tokenId = resolveTokenId();
    if (!tokenId) {
      setError(`Token ID not found for ${side.toUpperCase()}. This market may not support trading yet.`);
      return;
    }

    if (tradeType === "buy") {
      if (!amountNum || amountNum <= 0) { setError("Please enter a valid amount"); return; }
      if (amountNum < MIN_BUY_AMOUNT_USD) { setError(`Minimum $${MIN_BUY_AMOUNT_USD.toFixed(2)} for BUY orders`); return; }
      if (isBuyBelowMinShares) { setError(`Minimum: ${MIN_SHARES} shares ($${minAmountByShares.toFixed(2)})`); return; }
    } else {
      if (!amountNum || amountNum <= 0) { setError("Enter number of shares to sell"); return; }
      if (amountNum < MIN_SHARES) { setError(`Minimum sell: ${MIN_SHARES} shares`); return; }
    }

    setIsProcessing(true);
    try {
      let orderSize = tradeType === "buy" ? shares : amountNum;
      if (tradeType === "buy") {
        const dollarAmount = orderSize * price;
        if (dollarAmount < 1.0 && dollarAmount > 0.95) {
          orderSize = Math.ceil((1.0 / price) * 100) / 100;
        }
      }

      await placeOrder({
        tokenId,
        side: tradeType === "buy" ? Side.BUY : Side.SELL,
        price,
        size: orderSize,
        negRisk: negRisk ?? false,
      });

      const actionLabel = tradeType === "buy" ? "Bought" : "Sold";
      const shareCount = tradeType === "buy" ? shares : amountNum;
      setSuccessMsg(`${actionLabel} ${shareCount.toFixed(2)} ${side.toUpperCase()} shares at ${displayPriceCents.toFixed(1)}¢`);

      // Auto-close after 2.5s
      setTimeout(() => {
        onClose();
        setAmount("10");
        setError(null);
        setSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      let msg = err.message || "Unknown error";
      if (msg.includes("min size")) msg = `Minimum $${MIN_BUY_AMOUNT_USD.toFixed(2)} for BUY orders`;
      else if (msg.includes("not enough balance")) msg = tradeType === "buy" ? "Insufficient USDC. Please deposit." : "Insufficient shares.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[9999]" onClick={onClose} />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4">
        <div className="w-full max-w-md bg-[#0a0a0a] border-2 border-white pointer-events-auto max-h-[90vh] overflow-y-auto relative">
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white" />

          {/* Header */}
          <div className="relative p-5 border-b border-zinc-800">
            <button onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              {tradeType === "buy" ? <TrendingUp className="w-5 h-5 text-white" /> : <TrendingDown className="w-5 h-5 text-zinc-400" />}
              <h2 className="font-black text-lg uppercase tracking-wider text-white">
                {tradeType === "buy" ? "Buy" : "Sell"} {side.toUpperCase()}
              </h2>
            </div>
            <p className="text-xs text-zinc-500 font-bold line-clamp-2 pr-8">{question}</p>
          </div>

          <div className="p-5 space-y-4">
            {/* Success banner */}
            {successMsg && (
              <div className="border-2 border-white bg-white/5 p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-white flex-shrink-0" />
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-white">Order Placed</p>
                  <p className="text-xs text-zinc-400 font-bold mt-1">{successMsg}</p>
                </div>
              </div>
            )}

            {!successMsg && (
              <>
                {/* Side Toggle */}
                <div className="grid grid-cols-2 gap-px bg-zinc-800">
                  <button onClick={() => { setSide("yes"); setError(null); }}
                    className={`py-3 text-center text-sm font-black uppercase tracking-wider transition-colors ${side === "yes" ? "bg-white text-black" : "bg-[#111] text-zinc-500 hover:text-white"}`}>
                    Yes {Math.round(yesPrice * 100)}¢
                  </button>
                  <button onClick={() => { setSide("no"); setError(null); }}
                    className={`py-3 text-center text-sm font-black uppercase tracking-wider transition-colors ${side === "no" ? "bg-white text-black" : "bg-[#111] text-zinc-500 hover:text-white"}`}>
                    No {Math.round(noPrice * 100)}¢
                  </button>
                </div>

                {/* Buy/Sell Toggle */}
                <div className="grid grid-cols-2 gap-px bg-zinc-800">
                  <button onClick={() => { setTradeType("buy"); setAmount("10"); setError(null); }}
                    className={`py-3 text-center text-sm font-black uppercase tracking-wider transition-colors ${tradeType === "buy" ? "bg-white text-black" : "bg-[#111] text-zinc-500 hover:text-white"}`}>
                    Buy
                  </button>
                  <button onClick={() => { setTradeType("sell"); setAmount(""); setError(null); }}
                    className={`py-3 text-center text-sm font-black uppercase tracking-wider transition-colors ${tradeType === "sell" ? "bg-white text-black" : "bg-[#111] text-zinc-500 hover:text-white"}`}>
                    Sell
                  </button>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">
                    {tradeType === "buy" ? "Amount (USDC)" : "Shares to Sell"}
                  </label>
                  <div className="relative">
                    {tradeType === "buy" && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>}
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                      placeholder={tradeType === "buy" ? "0.00" : "0"}
                      className={`w-full bg-[#111] border border-zinc-800 ${tradeType === "buy" ? "pl-8" : "pl-4"} pr-4 py-4 text-lg font-bold focus:outline-none focus:border-white transition-all text-white placeholder-zinc-700`}
                      min="0" step={tradeType === "buy" ? "0.01" : "1"} />
                  </div>
                  {tradeType === "buy" && (
                    <p className="mt-2 text-[10px] text-zinc-600 uppercase tracking-wider font-bold">
                      Min: ${minBuyAmount.toFixed(2)} ({MIN_SHARES} shares or $1)
                    </p>
                  )}
                </div>

                {/* Calculations */}
                {amountNum > 0 && price > 0 && (
                  <div className="border border-zinc-800 bg-[#111] divide-y divide-zinc-800">
                    {tradeType === "buy" ? (
                      <>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-xs text-zinc-500 uppercase font-bold">Shares</span>
                          <span className="text-sm font-mono font-bold text-white">{shares.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-xs text-zinc-500 uppercase font-bold">Potential Win</span>
                          <span className="text-sm font-mono font-bold text-white">${potentialWin.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-xs text-zinc-500 uppercase font-bold">Profit if Correct</span>
                          <span className={`text-sm font-mono font-bold ${profit > 0 ? "text-white" : "text-zinc-500"}`}>${profit.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-xs text-zinc-500 uppercase font-bold">Shares</span>
                          <span className="text-sm font-mono font-bold text-white">{amountNum.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-xs text-zinc-500 uppercase font-bold">Price</span>
                          <span className="text-sm font-mono font-bold text-white">{displayPriceCents.toFixed(1)}¢</span>
                        </div>
                        <div className="flex justify-between items-center p-3">
                          <span className="text-xs text-zinc-500 uppercase font-bold">You&apos;ll Receive</span>
                          <span className="text-sm font-mono font-bold text-white">${sellProceeds.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Warnings */}
                {tradeType === "buy" && isBuyBelowMin && (
                  <div className="border border-zinc-600 bg-[#111] p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-zinc-400 font-bold">
                      {isBuyBelowMinUsd ? `Minimum $${MIN_BUY_AMOUNT_USD.toFixed(2)} for BUY orders` : `Minimum: ${MIN_SHARES} shares ($${minAmountByShares.toFixed(2)})`}
                    </p>
                  </div>
                )}

                {isSellBelowMin && (
                  <div className="border border-zinc-600 bg-[#111] p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-zinc-400 font-bold">Minimum sell: {MIN_SHARES} shares</p>
                  </div>
                )}

                {error && (
                  <div className="border border-red-800 bg-red-950/30 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-400 font-bold">{error}</p>
                  </div>
                )}

                {/* Action */}
                <button onClick={handleTrade}
                  disabled={!amountNum || amountNum <= 0 || isProcessing || price <= 0 || isBuyBelowMin || isSellBelowMin}
                  className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-sm border-2 border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Placing Order...</span>
                  ) : tradeType === "buy" ? (
                    isBuyBelowMin ? `Min $${minBuyAmount.toFixed(2)}` : `Buy ${side.toUpperCase()} — $${amountNum.toFixed(2)}`
                  ) : isSellBelowMin ? (
                    `Min ${MIN_SHARES} shares`
                  ) : (
                    `Sell ${amountNum.toFixed(2)} shares — $${sellProceeds.toFixed(2)}`
                  )}
                </button>

                {!authenticated && (
                  <p className="text-center text-xs text-zinc-600 uppercase font-bold tracking-wider">Sign in to place orders</p>
                )}

                <div className="border border-zinc-800 bg-[#111] p-3">
                  <p className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-wider">
                    <Info className="w-3 h-3 inline mr-1" />
                    {tradeType === "buy"
                      ? `Buying ${side.toUpperCase()} at ${displayPriceCents.toFixed(1)}¢. Each share pays $1 if correct. Min: $${MIN_BUY_AMOUNT_USD.toFixed(2)}.`
                      : `Sell order placed at ${displayPriceCents.toFixed(1)}¢. Executes when matched.`}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
