"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, Search, Plus, Check, Loader2 } from "lucide-react";

interface MarketResult {
  id: string;
  conditionId?: string | null;
  question: string;
  yesTokenId?: string;
  outcomePrices?: number[] | null;
  volume?: string;
}

interface WatchlistSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleWatch: (params: {
    condition_id: string;
    token_id: string;
    market_question: string;
  }) => Promise<boolean>;
  isWatching: (conditionId: string) => boolean;
}

export function WatchlistSearchModal({
  isOpen,
  onClose,
  onToggleWatch,
  isWatching,
}: WatchlistSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MarketResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  const searchMarkets = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/polymarket/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.markets || []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchMarkets(val), 400);
  };

  const handleAdd = async (market: MarketResult) => {
    if (!market.yesTokenId) return;
    setAddingId(market.id);
    await onToggleWatch({
      condition_id: market.conditionId || market.id,
      token_id: market.yesTokenId,
      market_question: market.question,
    });
    setAddingId(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/80 z-[9999]" onClick={onClose} />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-4">
        <div className="w-full max-w-md bg-[#0a0a0a] border-2 border-white pointer-events-auto relative overflow-hidden max-h-[80vh] flex flex-col">
          {/* Corner accents */}
          <div className="absolute -top-px -left-px w-3 h-3 bg-white z-10" />
          <div className="absolute -bottom-px -right-px w-3 h-3 bg-white z-10" />

          {/* Header */}
          <div className="p-4 border-b border-zinc-800/60 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-wider">
                Add to Watchlist
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-[#0e0e0e] border border-zinc-800 px-3">
              <Search className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search markets..."
                className="flex-1 bg-transparent text-sm font-medium text-white placeholder-zinc-600 focus:outline-none py-2.5"
              />
              {isSearching && <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {results.length === 0 && query.length >= 3 && !isSearching && (
              <div className="p-6 text-center">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                  No markets found
                </p>
              </div>
            )}

            {results.length === 0 && query.length < 3 && (
              <div className="p-6 text-center">
                <Search className="w-5 h-5 mx-auto mb-2 text-zinc-700" />
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                  Search for a market to add
                </p>
              </div>
            )}

            {results.map((market) => {
              const watching = isWatching(market.conditionId || market.id);
              const yesPrice = market.outcomePrices?.[0];
              return (
                <div
                  key={market.id}
                  className="px-4 py-3 border-b border-zinc-900 last:border-b-0 hover:bg-[#111] transition-colors flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-white leading-relaxed line-clamp-2">
                      {market.question}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {yesPrice != null && (
                        <span className="text-[10px] font-mono font-bold text-zinc-400">
                          YES {Math.round(yesPrice * 100)}¢
                        </span>
                      )}
                      {market.volume && (
                        <span className="text-[10px] font-mono text-zinc-600">
                          VOL {formatVolume(market.volume)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAdd(market)}
                    disabled={!market.yesTokenId || addingId === market.id}
                    className={`flex-shrink-0 p-2 border transition-all ${
                      watching
                        ? "border-white bg-white text-black"
                        : "border-zinc-700 text-zinc-500 hover:border-white hover:text-white"
                    } disabled:opacity-30`}
                  >
                    {addingId === market.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : watching ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function formatVolume(vol: string) {
  const n = parseFloat(vol);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
