"use client";

import { useState } from "react";
import { X, Loader2, TrendingUp } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
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
}

export function TradingModal({ marketId, marketData, outcome, outcomeIndex, onClose }: TradingModalProps) {
  const { authenticated, login } = usePrivy();
  const { placeOrder } = usePlaceOrder();
  const [amount, setAmount] = useState(10);
  const [isTrading, setIsTrading] = useState(false);

  const price = marketData.prices[outcomeIndex];
  const shares = price > 0 ? amount / price : 0;
  const potentialWin = shares * 1;
  const profit = potentialWin - amount;

  const handleTrade = async () => {
    if (!authenticated) {
      login();
      return;
    }

    // Получаем tokenId
    let tokenId: string | undefined;
    
    if (outcomeIndex === 0) {
      tokenId = marketData.yesTokenId;
    } else if (outcomeIndex === 1) {
      tokenId = marketData.noTokenId;
    }

    if (!tokenId && marketData.tokens) {
      const token = marketData.tokens[outcomeIndex];
      tokenId = token?.token_id;
    }

    if (!tokenId) {
      console.error('Missing tokenId:', { outcomeIndex, marketData });
      alert(`Token ID not found for ${outcome}. This market may not support trading yet.`);
      return;
    }

    setIsTrading(true);

    try {
      console.log('🚀 Placing order (client-side):', {
        tokenId,
        outcome,
        amount,
        price,
        shares,
      });

      // Размещаем ордер через client-side hooks
      const orderId = await placeOrder({
        tokenId,
        side: outcomeIndex === 0 ? 'BUY' : 'SELL',
        price,
        size: shares,
      });

      alert(`Order placed successfully! Order ID: ${orderId}`);
      onClose();
    } catch (error: any) {
      console.error('Trading error:', error);
      alert(`Failed to place order: ${error.message || 'Unknown error'}`);
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        {/* Market info */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2" style={{ letterSpacing: '-1px' }}>
            {marketData.question}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <TrendingUp size={16} />
            <span>Volume: ${parseFloat(marketData.volume).toLocaleString()}</span>
          </div>
        </div>

        {/* Outcome selection */}
        <div className="mb-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">You're buying</div>
            <div className="text-2xl font-bold" style={{ letterSpacing: '-1px' }}>
              {outcome}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              at {(price * 100).toFixed(1)}¢
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USDC)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="10"
          />
        </div>

        {/* Trade summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Shares</span>
            <span className="font-medium">{shares.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Potential win</span>
            <span className="font-medium">${potentialWin.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2">
            <span className="text-gray-600">Profit if correct</span>
            <span className={`font-medium ${profit > 0 ? 'text-green-600' : ''}`}>
              ${profit.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Buy Button */}
        <button
          onClick={handleTrade}
          disabled={isTrading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ letterSpacing: '-0.5px' }}
        >
          {isTrading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Placing order...
            </>
          ) : (
            `Buy ${outcome} for $${amount}`
          )}
        </button>

        {!authenticated && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Please log in to place orders
          </p>
        )}
      </div>
    </div>
  );
}
