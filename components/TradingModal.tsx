// components/TradingModal.tsx
"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, TrendingUp } from "lucide-react";
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

  // amount в USDC, как раньше, но через строку для красивого инпута
  const [amount, setAmount] = useState<string>("10");
  const [isProcessing, setIsProcessing] = useState(false);

  const price = marketData.prices[outcomeIndex] ?? 0; // цена в USDC
  const amountNum = useMemo(() => parseFloat(amount || "0"), [amount]);

  const shares = useMemo(
    () => (price > 0 && amountNum > 0 ? amountNum / price : 0),
    [amountNum, price]
  );

  // твоя логика: potentialWin = shares * 1; profit = potentialWin - amount
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
      console.error("Missing tokenId:", { outcomeIndex, marketData });
      alert(
        `Token ID not found for ${outcome}. This market may not support trading yet.`
      );
      return;
    }

    setIsProcessing(true);

    try {
      console.log("🚀 Placing order (client-side):", {
        tokenId,
        outcome,
        amount: amountNum,
        price,
        shares,
      });

      const orderId = await placeOrder({
        tokenId,
        side: outcomeIndex === 0 ? Side.BUY : Side.SELL,
        price,
        size: shares,
      });

      alert(`Order placed successfully! Order ID: ${orderId}`);
      onClose();
      setAmount("10");
    } catch (error: any) {
      console.error("Trading error:", error);
      alert(`Failed to place order: ${error.message || "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl z-[10000]"
          >
            {/* Header */}
            <div className="relative p-6 pb-4 border-b border-white/10">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-[#2A56F2]" />
                <h2 className="text-lg font-semibold text-foreground">
                  Place Order
                </h2>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                {marketData.question}
              </p>
              <p className="text-sm text-muted-foreground">
                Volume: ${parseFloat(marketData.volume).toLocaleString()}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Trade Info */}
              <div className="bg-secondary/30 border border-white/5 rounded-2xl p-4 space-y-2">
                <p className="text-sm text-muted-foreground">You're buying</p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-bold ${
                      side === "yes" ? "text-chart-1" : "text-destructive"
                    }`}
                  >
                    {outcome}
                  </span>
                  <span className="text-muted-foreground">
                    at {displayPriceCents.toFixed(1)}¢
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label
                  htmlFor="amount"
                  className="text-sm font-medium text-foreground"
                >
                  Amount (USDC)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-secondary/50 border border-white/10 rounded-2xl pl-8 pr-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-[#2A56F2]/50 transition-all placeholder:text-muted-foreground"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Calculations */}
              {amountNum > 0 && price > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3 overflow-hidden"
                >
                  <div className="bg-secondary/20 border border-white/5 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Shares
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {shares.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Potential win
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        ${potentialWin.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">
                        Profit if correct
                      </span>
                      <span
                        className={`text-base font-bold ${
                          profit > 0 ? "text-chart-1" : "text-muted-foreground"
                        }`}
                      >
                        ${profit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Buy Button */}
              <button
                onClick={handleTrade}
                disabled={
                  !amountNum || amountNum <= 0 || isProcessing || price <= 0
                }
                className={`w-full py-4 rounded-2xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                  side === "yes"
                    ? "bg-chart-1 hover:bg-chart-1/90 shadow-chart-1/30"
                    : "bg-destructive hover:bg-destructive/90 shadow-destructive/30"
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Placing order...
                  </span>
                ) : (
                  `Buy ${outcome} for $${amountNum.toFixed(2)}`
                )}
              </button>

              {!authenticated && (
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Please log in to place orders
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
