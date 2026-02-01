"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Loader2, CheckCircle } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type { PostWithUser } from "@/lib/types";

interface OrderFormProps {
  post: PostWithUser;
}

export function OrderForm({ post }: OrderFormProps) {
  const [amount, setAmount] = useState<string>("10");
  const [selectedOutcome, setSelectedOutcome] = useState<"YES" | "NO">("YES");
  const [isPlacing, setIsPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const handlePlaceOrder = async () => {
    if (!authenticated) {
      login();
      return;
    }

    setIsPlacing(true);
    
    try {
      const wallet = wallets[0];
      
      // Вызов API для размещения ордера
      const response = await fetch('/api/polymarket/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId: post.polymarket_market_id || post.market_data?.yesTokenId,
          side: selectedOutcome,
          amount: parseFloat(amount),
          price: selectedOutcome === 'YES' ? post.market_data?.prices?.[0] ?? 0.5 : post.market_data?.prices?.[1] ?? 0.5,
          userAddress: wallet?.address,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setAmount("10");
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order error:', error);
      alert('Failed to place order. This is demo mode.');
    } finally {
      setIsPlacing(false);
    }
  };

  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return "N/A";  
    return `${Math.round(price * 100)}¢`;
  };


  return (
    <div className="bg-secondary/30 rounded-lg p-4 border border-border space-y-4">
      <h3 className="font-semibold text-foreground flex items-center space-x-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <span>Place Your Bet {!authenticated && '(Login Required)'}</span>
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
            {formatPrice(post.market_data?.prices?.[0] ?? 0.5)}
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
            {formatPrice(post.market_data?.prices?.[1] ?? 0.5)}
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
              Wallet: {wallets[0]?.address?.slice(0, 6)}...{wallets[0]?.address?.slice(-4)}
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
        ) : authenticated ? (
          <span>Place ${amount} {selectedOutcome} Bet</span>
        ) : (
          <span>Sign in to Place Bet</span>
        )}
      </button>

      {/* Demo Notice */}
      <div className="text-xs text-center text-muted-foreground border-t border-border pt-3">
        {authenticated ? (
          <>Embedded Wallet Active • Demo Mode</>
        ) : (
          <>Sign in with Google to get embedded wallet</>
        )}
      </div>
    </div>
  );
}
