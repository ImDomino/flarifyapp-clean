"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Loader2, CheckCircle } from "lucide-react";
import type { PostWithUser } from "@/lib/types";

interface OrderFormProps {
  post: PostWithUser;
}

export function OrderForm({ post }: OrderFormProps) {
  const [amount, setAmount] = useState<string>("10");
  const [selectedOutcome, setSelectedOutcome] = useState<"YES" | "NO">("YES");
  const [isPlacing, setIsPlacing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    
    // Simulate order placement
    setTimeout(() => {
      setIsPlacing(false);
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
        setAmount("10");
      }, 2000);
    }, 1500);
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `${price.toFixed(1)}¢`;
  };

  return (
    <div className="bg-secondary/30 rounded-lg p-4 border border-border space-y-4">
      <h3 className="font-semibold text-foreground flex items-center space-x-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <span>Place Your Bet (Demo)</span>
      </h3>

      {/* Outcome Selection */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setSelectedOutcome("YES")}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedOutcome === "YES"
              ? "border-green-500 bg-green-500/10"
              : "border-border bg-card hover:border-green-500/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-xs text-muted-foreground">YES</span>
          </div>
          <p className="text-2xl font-bold text-green-500">
            {formatPrice(post.yes_price)}
          </p>
        </button>

        <button
          onClick={() => setSelectedOutcome("NO")}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedOutcome === "NO"
              ? "border-red-500 bg-red-500/10"
              : "border-border bg-card hover:border-red-500/50"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            <span className="text-xs text-muted-foreground">NO</span>
          </div>
          <p className="text-2xl font-bold text-red-500">
            {formatPrice(post.no_price)}
          </p>
        </button>
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium mb-2 text-foreground">
          Bet Amount (USDC)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="1"
            disabled={isPlacing}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground text-lg font-semibold disabled:opacity-50"
            placeholder="10"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            USDC
          </span>
        </div>
        <div className="flex space-x-2 mt-2">
          {[10, 25, 50, 100].map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset.toString())}
              disabled={isPlacing}
              className="px-3 py-1 text-xs bg-secondary rounded border border-border hover:bg-accent transition-colors disabled:opacity-50"
            >
              ${preset}
            </button>
          ))}
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-start space-x-2">
          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-primary">
            <p className="font-semibold">Demo order placed! 🎉</p>
            <p className="text-xs mt-1 opacity-75">
              In production, this would execute on Polymarket
            </p>
          </div>
        </div>
      )}

      {/* Place Order Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={isPlacing}
        className={`w-full py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
          selectedOutcome === "YES"
            ? "bg-green-500 text-white hover:bg-green-600"
            : "bg-red-500 text-white hover:bg-red-600"
        }`}
      >
        {isPlacing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Placing Order...</span>
          </>
        ) : (
          <span>Place ${amount} {selectedOutcome} Bet</span>
        )}
      </button>

      {/* Demo Notice */}
      <div className="text-xs text-center text-muted-foreground border-t border-border pt-3">
        Demo Mode • Connect wallet + add API keys for production
      </div>
    </div>
  );
}
