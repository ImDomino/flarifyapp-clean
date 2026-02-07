"use client";

import { useState, useEffect } from "react";
import { Search, X, TrendingUp, Loader2 } from "lucide-react";

interface Market {
  id: string;
  question: string;
  description?: string;
  url: string;
  outcomes: string[];
  outcomePrices: number[] | null;
  volume: string;
  liquidity?: string;
  endDate?: string;
  yesTokenId?: string;
  noTokenId?: string;
  negRisk?: boolean;
}

interface MarketSearchInputProps {
  onSelectMarket: (market: Market | null) => void;
  selectedMarket: Market | null;
}

export function MarketSearchInput({ onSelectMarket, selectedMarket }: MarketSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Market[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/polymarket/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.markets || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching markets:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectMarket = (market: Market) => {
    onSelectMarket(market);
    setQuery("");
    setShowResults(false);
    setResults([]);
  };

  const handleClearSelection = () => {
    onSelectMarket(null);
  };

  // Если рынок уже выбран - показываем preview
  if (selectedMarket) {
    return (
      <div className="rounded-xl bg-base-850/50 border border-white/10 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-400 mb-1">Selected Market:</p>
            <p className="font-semibold text-sm text-slate-200">{selectedMarket.question}</p>
          </div>
          <button
            onClick={handleClearSelection}
            className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>

        {/* Preview prices */}
        {selectedMarket.outcomePrices && (
          <div className="flex gap-2 mt-3">
            {selectedMarket.outcomes.map((outcome, i) => (
              <div
                key={i}
                className={`flex-1 p-2.5 rounded-lg text-center ${
                  i === 0 
                    ? 'bg-teal-500/10 border border-teal-500/20' 
                    : 'bg-rose-500/10 border border-rose-500/20'
                }`}
              >
                <p className="text-xs text-slate-400 mb-1">{outcome}</p>
                <p className={`font-bold text-lg ${i === 0 ? 'text-teal-300' : 'text-rose-300'}`}>
                  {Math.round((selectedMarket.outcomePrices?.[i] ?? 0) * 100)}%
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-slate-500 mt-3">
          Volume: ${parseFloat(selectedMarket.volume) >= 1000000 
            ? (parseFloat(selectedMarket.volume) / 1000000).toFixed(1) + 'M' 
            : (parseFloat(selectedMarket.volume) / 1000).toFixed(0) + 'K'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Polymarket markets..."
          className="w-full pl-12 pr-4 py-3.5 bg-base-850/50 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-slate-200 placeholder:text-slate-500"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-blue-400" />
        )}
      </div>

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-base-900 border border-white/10 rounded-xl shadow-lg max-h-[400px] overflow-y-auto z-50">
          {results.map((market) => (
            <button
              key={market.id}
              onClick={() => handleSelectMarket(market)}
              className="w-full p-4 text-left hover:bg-base-850/70 transition-colors border-b border-white/5 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1.5 text-slate-200 line-clamp-2">
                    {market.question}
                  </p>
                  
                  {/* Prices */}
                  {market.outcomePrices && (
                    <div className="flex gap-2 mb-1.5">
                      {market.outcomes.map((outcome, i) => (
                        <span
                          key={i}
                          className={`text-xs font-semibold ${
                            i === 0 ? 'text-teal-300' : 'text-rose-300'
                          }`}
                        >
                          {outcome} {Math.round((market.outcomePrices?.[i] ?? 0.5) * 100)}¢
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Volume */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>
                      ${parseFloat(market.volume) >= 1000000 
                        ? (parseFloat(market.volume) / 1000000).toFixed(1) + 'M' 
                        : (parseFloat(market.volume) / 1000).toFixed(0) + 'K'} Vol
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {showResults && results.length === 0 && !isSearching && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-base-900 border border-white/10 rounded-xl shadow-lg p-4 text-center">
          <p className="text-slate-400 text-sm">No markets found for "{query}"</p>
        </div>
      )}
    </div>
  );
}