"use client";

import { useState } from "react";
import { TrendingUp, Volume2 } from "lucide-react";
import { TradingModal } from "./TradingModal";

interface MarketData {
  question: string;
  outcomes: string[];
  prices: number[];
  volume: string;
  url: string;
}

interface MarketCardProps {
  marketId: string;
  marketData: MarketData;
  builderId?: string;
}

export function MarketCard({ marketId, marketData, builderId = 'FLARIFYAPP' }: MarketCardProps) {
  const [showTradingModal, setShowTradingModal] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<{ index: number; name: string } | null>(null);

  const handleOutcomeClick = (index: number, name: string) => {
    setSelectedOutcome({ index, name });
    setShowTradingModal(true);
  };

  const formatVolume = (volume: string) => {
    const vol = parseFloat(volume);
    if (vol >= 1000000) {
      return `$${(vol / 1000000).toFixed(1)}M`;
    }
    return `$${(vol / 1000).toFixed(0)}K`;
  };

  const isBinaryMarket = marketData.outcomes.length === 2;

  return (
    <>
      <div className="mt-3 bg-card rounded-[20px] overflow-hidden border border-border card-shadow">
        <div className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight mb-1" style={{ color: '#140106', letterSpacing: '-1px' }}>
              {marketData.question}
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#989898' }}>
              <Volume2 className="w-3 h-3" />
              <span>{formatVolume(marketData.volume)} Vol</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {Math.round(marketData.prices[0] * 100)}%
            </div>
            <div className="text-xs" style={{ color: '#989898' }}>chance</div>
          </div>
        </div>

        {isBinaryMarket ? (
          <div className="p-4 pt-0 flex gap-3">
            <button
              onClick={() => handleOutcomeClick(0, marketData.outcomes[0])}
              className="flex-1 py-4 bg-green-500 hover:bg-green-600 rounded-xl font-bold text-white transition-all text-lg"
              style={{ letterSpacing: '-1px' }}
            >
              {marketData.outcomes[0]}
            </button>
            <button
              onClick={() => handleOutcomeClick(1, marketData.outcomes[1])}
              className="flex-1 py-4 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white transition-all text-lg"
              style={{ letterSpacing: '-1px' }}
            >
              {marketData.outcomes[1]}
            </button>
          </div>
        ) : (
          <div className="p-4 pt-0 space-y-2">
            {marketData.outcomes.map((outcome, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-accent rounded-lg hover:bg-accent/70 transition-colors cursor-pointer"
                onClick={() => handleOutcomeClick(index, outcome)}
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: '#140106', letterSpacing: '-1px' }}>
                    {outcome}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold" style={{ color: '#140106' }}>
                    {Math.round(marketData.prices[index] * 100)}%
                  </span>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-white text-xs font-bold transition-colors">
                      Yes
                    </button>
                    <button className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-white text-xs font-bold transition-colors">
                      No
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTradingModal && selectedOutcome && (
        <TradingModal
          marketId={marketId}
          marketData={marketData}
          outcome={selectedOutcome.name}
          outcomeIndex={selectedOutcome.index}
          onClose={() => {
            setShowTradingModal(false);
            setSelectedOutcome(null);
          }}
        />
      )}
    </>
  );
}
