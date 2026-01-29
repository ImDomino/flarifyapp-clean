"use client";

import { useState } from "react";
import { X, Loader2, TrendingUp } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

interface MarketData {
  question: string;
  outcomes: string[];
  prices: number[];
  volume: string;
  url: string;
}

interface TradingModalProps {
  marketId: string;
  marketData: MarketData;
  outcome: string;
  outcomeIndex: number;
  onClose: () => void;
}

export function TradingModal({ marketId, marketData, outcome, outcomeIndex, onClose }: TradingModalProps) {
  const { user, authenticated, login } = usePrivy();
  const [amount, setAmount] = useState(10);
  const [isTrading, setIsTrading] = useState(false);

  const price = marketData.prices[outcomeIndex];
  const shares = amount / price;
  const potentialWin = shares * 1; // 1 dollar per share if win
  const profit = potentialWin - amount;

  const handleTrade = async () => {
    if (!authenticated) {
      login();
      return;
    }

    setIsTrading(true);

    try {
      // TODO: Подключить реальный CLOB client
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Trading functionality coming soon! This will place real orders via Polymarket CLOB with Builder Attribution.');
      onClose();
    } catch (error) {
      console.error('Trading error:', error);
      alert('Failed to place order');
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-card rounded-[30px] max-w-md w-full border border-border card-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight" style={{ color: '#140106', letterSpacing: '-1px' }}>
              {marketData.question}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Amount Input */}
        <div className="p-6">
          <div className="bg-background rounded-2xl p-4 mb-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="text-4xl font-bold" style={{ color: '#140106' }}>
                ${amount}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAmount(Math.min(amount + 1, 1000))}
                  className="px-4 py-2 bg-card border border-border hover:bg-accent rounded-xl font-semibold transition-colors"
                  style={{ color: '#140106', fontSize: '16px', letterSpacing: '-1px' }}
                >
                  +1
                </button>
                <button
                  onClick={() => setAmount(Math.min(amount + 10, 1000))}
                  className="px-4 py-2 bg-card border border-border hover:bg-accent rounded-xl font-semibold transition-colors"
                  style={{ color: '#140106', fontSize: '16px', letterSpacing: '-1px' }}
                >
                  +10
                </button>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="1"
              max="100"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value))}
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: '#22c55e' }}
            />
          </div>

          {/* Buy Button */}
          <button
            onClick={handleTrade}
            disabled={isTrading}
            className={`w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              outcomeIndex === 0 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
            style={{ fontSize: '18px', letterSpacing: '-1px' }}
          >
            {isTrading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Placing Order...
              </span>
            ) : (
              <div>
                <div className="text-xl">Buy {outcome}</div>
                <div className="text-sm font-normal opacity-90">
                  To win ${potentialWin.toFixed(2)}
                </div>
              </div>
            )}
          </button>

          {/* Info */}
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between" style={{ color: '#989898' }}>
              <span>Avg price</span>
              <span style={{ color: '#140106' }}>{(price * 100).toFixed(1)}¢</span>
            </div>
            <div className="flex justify-between" style={{ color: '#989898' }}>
              <span>Shares</span>
              <span style={{ color: '#140106' }}>{shares.toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ color: '#989898' }}>
              <span>Potential return</span>
              <span style={{ color: '#140106' }}>${potentialWin.toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ color: '#989898' }}>
              <span>Profit if win</span>
              <span className="text-green-500 font-semibold">+${profit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
