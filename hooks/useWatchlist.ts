"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { usePrivy } from "@privy-io/react-auth";
import type { WatchlistItem } from "@/lib/types";

interface ToggleWatchParams {
  condition_id: string;
  token_id: string;
  market_question?: string;
  image_url?: string;
}

export function useWatchlist() {
  const { authenticated } = usePrivy();
  const authFetch = useAuthFetch();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const priceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await authFetch("/api/watchlist");
      const data = await res.json();
      setWatchlist(data.watchlist || []);
    } catch (err) {
      console.error("Fetch watchlist error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  const toggleWatch = useCallback(
    async (params: ToggleWatchParams): Promise<boolean> => {
      try {
        const res = await authFetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (data.success) {
          if (data.watching) {
            if (data.item) setWatchlist((prev) => [data.item, ...prev]);
          } else {
            setWatchlist((prev) => prev.filter((w) => w.condition_id !== params.condition_id));
          }
          return data.watching;
        }
        return false;
      } catch {
        return false;
      }
    },
    [authFetch]
  );

  const isWatching = useCallback(
    (conditionId: string) => watchlist.some((w) => w.condition_id === conditionId),
    [watchlist]
  );

  // Fetch live prices for watchlist items
  const fetchPrices = useCallback(async () => {
    if (watchlist.length === 0) return;

    const newPrices = new Map(prices);
    await Promise.allSettled(
      watchlist.map(async (item) => {
        try {
          const res = await fetch(`/api/polymarket/price?token_id=${item.token_id}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.midPrice != null) {
            newPrices.set(item.token_id, data.midPrice);
          }
        } catch {}
      })
    );
    setPrices(newPrices);
  }, [watchlist, prices]);

  useEffect(() => {
    if (authenticated) fetchWatchlist();
  }, [authenticated, fetchWatchlist]);

  // Poll prices every 30s
  useEffect(() => {
    if (watchlist.length === 0) return;

    fetchPrices();
    priceIntervalRef.current = setInterval(fetchPrices, 30000);

    return () => {
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length]);

  return {
    watchlist,
    isLoading,
    prices,
    fetchWatchlist,
    toggleWatch,
    isWatching,
  };
}
