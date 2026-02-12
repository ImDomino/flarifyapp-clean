import { NextRequest, NextResponse } from "next/server";

// Force US region — Polymarket CLOB blocks certain geos
export const runtime = "nodejs";
export const preferredRegion = "iad1";

/**
 * GET /api/polymarket/price?token_id=XXX
 *
 * Returns live prices or resolution status for a Polymarket token.
 * Tries CLOB orderbook first (live), then Gamma API (fallback + resolution info).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("token_id");

    if (!tokenId) {
      return NextResponse.json({ error: "Missing token_id" }, { status: 400 });
    }

    let midPrice: number | null = null;
    let bestBid: number | null = null;
    let bestAsk: number | null = null;
    let resolved = false;
    let outcome: string | null = null; // "YES" or "NO"
    let winningPrice: number | null = null;

    // Strategy 1: CLOB orderbook (live markets only)
    try {
      const clobRes = await fetch(
        `https://clob.polymarket.com/book?token_id=${tokenId}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (clobRes.ok) {
        const data = await clobRes.json();
        const bids = data.bids || [];
        const asks = data.asks || [];

        bestBid = bids.length > 0 ? parseFloat(bids[0].price) : null;
        bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : null;

        if (bestBid !== null && bestAsk !== null) {
          midPrice = (bestBid + bestAsk) / 2;
        } else if (bestBid !== null) {
          midPrice = bestBid;
        } else if (bestAsk !== null) {
          midPrice = bestAsk;
        }
      } else if (clobRes.status === 404) {
        // Orderbook doesn't exist — market likely resolved
        // Fall through to Gamma to confirm
      }
    } catch (e: any) {
      console.warn("CLOB fetch failed:", e.message?.slice(0, 100));
    }

    // Strategy 2: Gamma API — get price OR resolution status
    if (midPrice === null) {
      try {
        const gammaRes = await fetch(
          `https://gamma-api.polymarket.com/markets?clob_token_ids=${tokenId}&limit=1`,
          {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(5000),
          }
        );

        if (gammaRes.ok) {
          const markets = await gammaRes.json();
          if (Array.isArray(markets) && markets.length > 0) {
            const market = markets[0];

            // Check if market is resolved/closed
            if (market.closed || market.resolved) {
              resolved = true;

              // Determine winning outcome
              // resolutionSource or winner field varies
              if (market.winner != null) {
                // winner is the outcome name e.g. "Yes" or "No"
                outcome = String(market.winner).toUpperCase();
              } else if (market.resolution != null) {
                outcome = String(market.resolution).toUpperCase();
              }

              // For resolved markets, prices are 1.0 for winner and 0.0 for loser
              // Parse to find which token won
              let clobTokenIds: string[] = [];
              if (Array.isArray(market.clobTokenIds)) {
                clobTokenIds = market.clobTokenIds;
              } else if (typeof market.clobTokenIds === "string") {
                try { clobTokenIds = JSON.parse(market.clobTokenIds); } catch {}
              }

              const tokenIndex = clobTokenIds.indexOf(tokenId);

              // outcomePrices after resolution are [1, 0] or [0, 1]
              let prices: number[] = [];
              if (market.outcomePrices) {
                try {
                  const raw = typeof market.outcomePrices === "string"
                    ? JSON.parse(market.outcomePrices)
                    : market.outcomePrices;
                  prices = raw.map(Number);
                } catch {}
              }

              if (tokenIndex >= 0 && prices[tokenIndex] != null) {
                winningPrice = prices[tokenIndex];
              }
            } else {
              // Market still open — use Gamma prices as fallback
              let prices: number[] = [];
              if (market.outcomePrices) {
                try {
                  const raw = typeof market.outcomePrices === "string"
                    ? JSON.parse(market.outcomePrices)
                    : market.outcomePrices;
                  prices = raw.map(Number);
                } catch {}
              }

              let clobTokenIds: string[] = [];
              if (Array.isArray(market.clobTokenIds)) {
                clobTokenIds = market.clobTokenIds;
              } else if (typeof market.clobTokenIds === "string") {
                try { clobTokenIds = JSON.parse(market.clobTokenIds); } catch {}
              }

              const tokenIndex = clobTokenIds.indexOf(tokenId);
              if (tokenIndex >= 0 && prices[tokenIndex] != null) {
                midPrice = prices[tokenIndex];
              } else if (prices.length > 0) {
                midPrice = prices[0];
              }
            }
          }
        }
      } catch (e: any) {
        console.warn("Gamma fallback failed:", e.message?.slice(0, 100));
      }
    }

    const headers = {
      "Cache-Control": resolved
        ? "public, s-maxage=3600, stale-while-revalidate=86400" // resolved: cache 1hr
        : "public, s-maxage=30, stale-while-revalidate=120",     // live: cache 30s
    };

    return NextResponse.json(
      { tokenId, bestBid, bestAsk, midPrice, resolved, outcome, winningPrice },
      { headers }
    );
  } catch (error: any) {
    console.error("Price proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch price" },
      { status: 500 }
    );
  }
}