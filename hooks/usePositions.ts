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
  negRisk?: boolean;
}

/**
 * Hook: usePositions
 *
 * Fetches user positions from Polymarket's data API.
 * Uses the Safe address (funder) as the account identifier.
 *
 * CRITICAL: negRisk must be correctly set — it determines which
 * exchange contract the SDK uses for EIP-712 signing.
 * Wrong negRisk = "invalid signature" error.
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
        // negRisk from data API if available
        negRisk: p.negRisk === true || p.neg_risk === true || p.negRisk === "true" || undefined,
      }));

      // Enrich negRisk from Gamma API for positions that don't have it
      await enrichNegRisk(mapped);

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

/**
 * Fetch negRisk status from Gamma API for positions that don't have it.
 * Groups token IDs to minimize API calls.
 */
async function enrichNegRisk(positions: UserPosition[]): Promise<void> {
  const needsEnrichment = positions.filter(
    (p) => p.negRisk === undefined && p.asset_id
  );

  if (needsEnrichment.length === 0) return;

  // Batch lookup: fetch all token IDs at once (Gamma supports comma-separated)
  const tokenIds = needsEnrichment.map((p) => p.asset_id);
  
  // Gamma API has a URL length limit, so batch in groups
  const batchSize = 5;
  const negRiskMap = new Map<string, boolean>();

  for (let i = 0; i < tokenIds.length; i += batchSize) {
    const batch = tokenIds.slice(i, i + batchSize);
    
    try {
      // Query each token individually (Gamma API returns one market per clob_token_id query)
      const promises = batch.map(async (tokenId) => {
        try {
          const res = await fetch(
            `https://gamma-api.polymarket.com/markets?clob_token_ids=${tokenId}&limit=1`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (!res.ok) return;
          const markets = await res.json();
          if (Array.isArray(markets) && markets.length > 0) {
            const m = markets[0];
            const isNegRisk = m.negRisk === true || m.negRisk === "true";
            negRiskMap.set(tokenId, isNegRisk);
          }
        } catch {
          // silent — will default to false
        }
      });
      
      await Promise.all(promises);
    } catch {
      // silent
    }
  }

  // Apply results
  for (const pos of positions) {
    if (pos.negRisk === undefined && negRiskMap.has(pos.asset_id)) {
      pos.negRisk = negRiskMap.get(pos.asset_id)!;
    }
  }

  console.log(
    `[Positions] negRisk enriched: ${negRiskMap.size}/${needsEnrichment.length} resolved`,
    Object.fromEntries(
      [...negRiskMap.entries()].map(([k, v]) => [k.slice(0, 12) + "...", v])
    )
  );
}