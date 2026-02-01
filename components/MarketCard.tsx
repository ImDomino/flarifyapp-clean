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
  yesTokenId?: string;
  noTokenId?: string;
  tokens?: Array<{ token_id: string; outcome: string; price: string }>;
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
  const yesPercentage = Math.round(marketData.prices[0] * 100);
  const noPercentage = isBinaryMarket ? Math.round(marketData.prices[1] * 100) : 0;

  return (
    <>
      <div className="mt-3 bg-secondary/30 rounded-2xl overflow-hidden border border-white/10 backdrop-blur-xl card-shadow">
        {/* Header */}
        <div className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#2A56F2] to-[#9DFECB] rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight mb-1 text-foreground">
              {marketData.question}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Volume2 className="w-3 h-3" />
              <span>{formatVolume(marketData.volume)} Vol</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold bg-gradient-to-r from-[#9DFECB] to-[#2A56F2] bg-clip-text text-transparent">
              {yesPercentage}%
            </div>
            <div className="text-xs text-muted-foreground">chance</div>
          </div>
        </div>

        {/* Betting Buttons */}
        {isBinaryMarket ? (
          <div className="p-4 pt-0 flex gap-3">
            <button
              onClick={() => handleOutcomeClick(0, marketData.outcomes[0])}
              className="flex-1 py-4 bg-gradient-to-r from-[#9DFECB]/20 to-[#9DFECB]/10 hover:from-[#9DFECB]/30 hover:to-[#9DFECB]/20 border border-[#9DFECB]/20 rounded-xl font-bold text-[#9DFECB] transition-all text-lg backdrop-blur-sm"
            >
              <div className="flex flex-col items-center">
                <span>{marketData.outcomes[0]}</span>
                <span className="text-xs opacity-70">{yesPercentage}¢</span>
              </div>
            </button>
            <button
              onClick={() => handleOutcomeClick(1, marketData.outcomes[1])}
              className="flex-1 py-4 bg-gradient-to-r from-destructive/20 to-destructive/10 hover:from-destructive/30 hover:to-destructive/20 border border-destructive/20 rounded-xl font-bold text-destructive transition-all text-lg backdrop-blur-sm"
            >
              <div className="flex flex-col items-center">
                <span>{marketData.outcomes[1]}</span>
                <span className="text-xs opacity-70">{noPercentage}¢</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="p-4 pt-0 space-y-2">
            {marketData.outcomes.map((outcome, index) => (
              <button
                key={index}
                onClick={() => handleOutcomeClick(index, outcome)}
                className="w-full flex items-center justify-between p-3 bg-secondary/50 rounded-xl hover:bg-secondary/70 transition-all border border-white/5"
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">
                    {outcome}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-foreground">
                    {Math.round(marketData.prices[index] * 100)}%
                  </span>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-[#9DFECB]/20 text-[#9DFECB] rounded text-xs font-bold">
                      Yes
                    </span>
                    <span className="px-3 py-1 bg-destructive/20 text-destructive rounded text-xs font-bold">
                      No
                    </span>
                  </div>
                </div>
              </button>
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
