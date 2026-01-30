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
      <div className="p-4 bg-card border border-border rounded-xl">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <p className="font-bold text-sm mb-1" style={{ color: '#140106', letterSpacing: '-1px' }}>
              Selected Market:
            </p>
            <p className="font-semibold" style={{ fontSize: '16px', color: '#140106', letterSpacing: '-1px' }}>
              {selectedMarket.question}
            </p>
          </div>
          <button
            onClick={handleClearSelection}
            className="p-1 hover:bg-red-500/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>

        {/* Preview prices */}
        {selectedMarket.outcomePrices && (
          <div className="flex gap-2 mt-3">
            {selectedMarket.outcomes.map((outcome, i) => (
              <div
                key={i}
                className={`flex-1 p-2 rounded-lg text-center ${
                  i === 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                <p className="text-xs mb-1" style={{ color: '#989898' }}>{outcome}</p>
                <p className={`font-bold text-lg ${i === 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.round(selectedMarket.outcomePrices[i] * 100)}%
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2" style={{ letterSpacing: '-1px' }}>
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Polymarket markets..."
          className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
          style={{ fontSize: '16px', letterSpacing: '-1px', color: '#140106' }}
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
        )}
      </div>

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg max-h-[400px] overflow-y-auto z-50">
          {results.map((market) => (
            <button
              key={market.id}
              onClick={() => handleSelectMarket(market)}
              className="w-full p-4 text-left hover:bg-accent/30 transition-colors border-b border-border last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold mb-1 truncate" style={{ fontSize: '14px', color: '#140106', letterSpacing: '-1px' }}>
                    {market.question}
                  </p>
                  
                  {/* Prices */}
                  {market.outcomePrices && (
                    <div className="flex gap-2 mb-1">
                      {market.outcomes.map((outcome, i) => (
                        <span
                          key={i}
                          className={`text-xs font-semibold ${
                            i === 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {outcome} {Math.round(market.outcomePrices![i] * 100)}¢
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Volume */}
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#989898' }}>
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg p-4 text-center">
          <p className="text-muted-foreground text-sm">No markets found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
