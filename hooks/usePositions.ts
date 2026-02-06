"use client";

import { useState, useCallback } from "react";
import { useClobClient } from "./useClobClient";

export interface UserPosition {
  asset_id: string;
  market: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  title?: string;
  outcome?: string;
  question?: string;
}

/**
 * Hook: usePositions
 *
 * Fetches user positions from Polymarket's data API.
 * Uses the Safe address (funder) as the account identifier,
 * since the Safe holds all tokens and USDC.
 */
export const usePositions = () => {
  const { initClobClient } = useClobClient();
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { safeAddress } = await initClobClient();
      if (!safeAddress) throw new Error("Safe address is not defined");

      const account = safeAddress.toLowerCase();
      const params = new URLSearchParams({ user: account });
      const url = `https://data-api.polymarket.com/positions?${params.toString()}`;
      const res = await fetch(url);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.data || data.positions || [];

      const mapped: UserPosition[] = raw.map((p: any) => ({
        asset_id: p.asset || p.asset_id || "",
        market: p.market ?? p.conditionId ?? "",
        size: Number(p.size ?? p.currentSize ?? 0),
        avgPrice: Number(p.avgPrice ?? p.avg_price ?? 0) / 100,
        initialValue: Number(p.initialValue ?? 0),
        currentValue: Number(p.currentValue ?? 0),
        cashPnl: Number(p.cashPnl ?? 0),
        percentPnl: Number(p.percentPnl ?? 0),
        title: p.title,
        outcome: p.outcome,
        question: p.title ?? p.question,
      }));

      setPositions(mapped);
      return mapped;
    } catch (err: any) {
      console.error("❌ Error fetching positions:", err);
      setError(err.message || "Failed to fetch positions");
      setPositions([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [initClobClient]);

  return { positions, isLoading, error, fetchPositions };
};
