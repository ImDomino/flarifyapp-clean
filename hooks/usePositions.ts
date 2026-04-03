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
  realizedPnl: number;
  percentPnl: number;
  title?: string;
  outcome?: string;
  question?: string;
  negRisk?: boolean;
  closed?: boolean;
}

export interface PnlTotals {
  totalPnl: number;
  openPnl: number;
  closedPnl: number;
  portfolioValue: number;
  totalPositions: number;
  openCount: number;
  closedCount: number;
  wins: number;
  losses: number;
}

/**
 * Hook: usePositions
 *
 * Fetches user positions from Polymarket's data API.
 * Combines open positions (/positions) and closed positions (/closed-positions)
 * for accurate all-time PnL.
 */
export const usePositions = () => {
  const { initClobClient } = useClobClient();
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [pnlTotals, setPnlTotals] = useState<PnlTotals>({
    totalPnl: 0, openPnl: 0, closedPnl: 0, portfolioValue: 0,
    totalPositions: 0, openCount: 0, closedCount: 0, wins: 0, losses: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { safeAddress } = await initClobClient();
      if (!safeAddress) throw new Error("Safe address is not defined");

      const account = safeAddress.toLowerCase();

      // Fetch open and closed positions in parallel
      const [openPositions, closedPositions] = await Promise.all([
        fetchOpenPositions(account),
        fetchClosedPositions(account),
      ]);

      // Enrich negRisk for open positions (needed for trading)
      await enrichNegRisk(openPositions);

      // Calculate PnL totals
      let openPnl = 0, closedPnl = 0, portfolioValue = 0;
      let wins = 0, losses = 0;

      for (const p of openPositions) {
        const posPnl = p.cashPnl + p.realizedPnl;
        openPnl += posPnl;
        portfolioValue += p.currentValue;
        if (posPnl > 0) wins++;
        else if (posPnl < 0) losses++;
      }

      for (const p of closedPositions) {
        closedPnl += p.realizedPnl;
        if (p.realizedPnl > 0) wins++;
        else if (p.realizedPnl < 0) losses++;
      }

      const totals: PnlTotals = {
        totalPnl: openPnl + closedPnl,
        openPnl,
        closedPnl,
        portfolioValue,
        totalPositions: openPositions.length + closedPositions.length,
        openCount: openPositions.length,
        closedCount: closedPositions.length,
        wins,
        losses,
      };

      setPnlTotals(totals);
      setPositions(openPositions);
      return openPositions;
    } catch (err: any) {
      console.error("Error fetching positions:", err);
      setError(err.message || "Failed to fetch positions");
      setPositions([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [initClobClient]);

  return { positions, pnlTotals, isLoading, error, fetchPositions };
};

/**
 * Fetch open positions from Polymarket data API.
 * Paginates to get all positions (max 500 per request).
 */
async function fetchOpenPositions(account: string): Promise<UserPosition[]> {
  const all: UserPosition[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const params = new URLSearchParams({
      user: account,
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`https://data-api.polymarket.com/positions?${params}`);
    if (!res.ok) throw new Error(`Positions API HTTP ${res.status}`);

    const data = await res.json();
    const raw = Array.isArray(data) ? data : data.data || data.positions || [];

    for (const p of raw) {
      all.push({
        asset_id: p.asset || p.asset_id || "",
        market: p.market ?? p.conditionId ?? "",
        size: Number(p.size ?? 0),
        avgPrice: Number(p.avgPrice ?? 0) / 100,
        initialValue: Number(p.initialValue ?? 0),
        currentValue: Number(p.currentValue ?? 0),
        cashPnl: Number(p.cashPnl ?? 0),
        realizedPnl: Number(p.realizedPnl ?? 0),
        percentPnl: Number(p.percentPnl ?? 0),
        title: p.title,
        outcome: p.outcome,
        question: p.title ?? p.question,
        negRisk: p.negRisk === true || p.neg_risk === true || p.negRisk === "true" || undefined,
      });
    }

    if (raw.length < limit) break;
    offset += limit;
    if (offset > 10000) break;
  }

  return all;
}

/**
 * Fetch closed/settled positions from Polymarket data API.
 * Paginates through all results (max 50 per request).
 */
async function fetchClosedPositions(account: string): Promise<UserPosition[]> {
  const all: UserPosition[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const params = new URLSearchParams({
      user: account,
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`https://data-api.polymarket.com/closed-positions?${params}`);
    if (!res.ok) throw new Error(`Closed positions API HTTP ${res.status}`);

    const data = await res.json();
    const raw = Array.isArray(data) ? data : data.data || [];

    for (const p of raw) {
      all.push({
        asset_id: p.asset || p.asset_id || "",
        market: p.market ?? p.conditionId ?? "",
        size: Number(p.totalBought ?? p.size ?? 0),
        avgPrice: Number(p.avgPrice ?? 0) / 100,
        initialValue: Number(p.totalBought ?? 0),
        currentValue: 0,
        cashPnl: 0,
        realizedPnl: Number(p.realizedPnl ?? 0),
        percentPnl: 0,
        title: p.title,
        outcome: p.outcome,
        question: p.title ?? p.question,
        closed: true,
      });
    }

    if (raw.length < limit) break;
    offset += limit;
    if (offset > 100000) break;
  }

  return all;
}

/**
 * Fetch negRisk status from Gamma API for positions that don't have it.
 */
async function enrichNegRisk(positions: UserPosition[]): Promise<void> {
  const needsEnrichment = positions.filter(
    (p) => p.negRisk === undefined && p.asset_id
  );

  if (needsEnrichment.length === 0) return;

  const tokenIds = needsEnrichment.map((p) => p.asset_id);
  const batchSize = 5;
  const negRiskMap = new Map<string, boolean>();

  for (let i = 0; i < tokenIds.length; i += batchSize) {
    const batch = tokenIds.slice(i, i + batchSize);

    const promises = batch.map(async (tokenId) => {
      try {
        const res = await fetch(
          `https://gamma-api.polymarket.com/markets?clob_token_ids=${tokenId}&limit=1`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) return;
        const markets = await res.json();
        if (Array.isArray(markets) && markets.length > 0) {
          negRiskMap.set(tokenId, markets[0].negRisk === true || markets[0].negRisk === "true");
        }
      } catch {
        // silent
      }
    });

    await Promise.all(promises);
  }

  for (const pos of positions) {
    if (pos.negRisk === undefined && negRiskMap.has(pos.asset_id)) {
      pos.negRisk = negRiskMap.get(pos.asset_id)!;
    }
  }
}
