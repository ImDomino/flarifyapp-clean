"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, TrendingUp, X } from "lucide-react";

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
  tokens?: Array<{ token_id: string; outcome: string }>;
}

interface MarketSearchInputProps {
  onSelectMarket: (market: Market) => void;
}

export function MarketSearchInput({ onSelectMarket }: MarketSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Market[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchMarkets = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) { setResults([]); return; }
    setIsSearching(true);
    try {
      const response = await fetch(`/api/polymarket/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.markets || []);
      setShowResults(true);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchMarkets(value), 300);
  };

  const handleSelect = (market: Market) => {
    onSelectMarket(market);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-white transition-colors" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="SEARCH OR PASTE POLYMARKET LINK..."
          className="w-full bg-[#0a0a0a] border border-zinc-800 py-3 pl-12 pr-10 text-sm font-bold uppercase tracking-wider text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-all"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setShowResults(false); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] border border-zinc-800 max-h-80 overflow-y-auto z-50">
          {isSearching && (
            <div className="p-4 text-center">
              <div className="w-4 h-4 border-2 border-zinc-700 border-t-white animate-spin mx-auto" />
            </div>
          )}
          {!isSearching && results.length === 0 && query.trim() && (
            <div className="p-4 text-center text-xs text-zinc-600 uppercase tracking-wider font-bold">
              No markets found
            </div>
          )}
          {results.map((market) => {
            const yesPrice = market.outcomePrices?.[0];
            const yesPercent = yesPrice != null ? Math.round(yesPrice * 100) : null;
            return (
              <button
                key={market.id}
                onClick={() => handleSelect(market)}
                className="w-full text-left p-4 border-b border-zinc-900 last:border-b-0 hover:bg-[#111] transition-colors group"
              >
                <p className="text-sm font-bold text-white mb-2 group-hover:text-zinc-200">
                  {market.question}
                </p>
                <div className="flex items-center gap-4">
                  {yesPercent != null && (
                    <span className="text-xs font-mono font-bold text-zinc-400">
                      YES {yesPercent}¢
                    </span>
                  )}
                  <span className="text-xs font-mono text-zinc-600 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {market.volume ? `$${(parseFloat(market.volume) / 1000).toFixed(0)}K` : "$0"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
