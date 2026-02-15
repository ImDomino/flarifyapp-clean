import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const preferredRegion = "iad1";

/**
 * GET /api/polymarket/price?token_id=XXX&market_id=YYY
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("token_id");
    const marketId = searchParams.get("market_id");

    if (!tokenId && !marketId) {
      return NextResponse.json({ error: "Missing token_id or market_id" }, { status: 400 });
    }

    let midPrice: number | null = null;
    let bestBid: number | null = null;
    let bestAsk: number | null = null;
    let resolved = false;
    let winner: string | null = null;

    // Track orderbook state from CLOB
    let clobBidsCount = 0;
    let clobAsksCount = 0;

    // Strategy 1: CLOB orderbook (live prices)
    if (tokenId) {
      try {
        const clobRes = await fetch(
          `https://clob.polymarket.com/book?token_id=${tokenId}`,
          { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
        );

        if (clobRes.ok) {
          const data = await clobRes.json();
          const bids: Array<{ price: string; size: string }> = data.bids || [];
          const asks: Array<{ price: string; size: string }> = data.asks || [];

          clobBidsCount = bids.length;
          clobAsksCount = asks.length;

          if (bids.length > 0) {
            bestBid = Math.max(...bids.map((b) => parseFloat(b.price)));
          }
          if (asks.length > 0) {
            bestAsk = Math.min(...asks.map((a) => parseFloat(a.price)));
          }

          if (bestBid !== null && bestAsk !== null) {
            midPrice = (bestBid + bestAsk) / 2;
          } else if (bestBid !== null) {
            midPrice = bestBid;
          } else if (bestAsk !== null) {
            midPrice = bestAsk;
          }
        }
      } catch { /* silent */ }
    }

    // Strategy 2: Gamma API — price fallback + resolved status
    if (tokenId) {
      try {
        const gammaRes = await fetch(
          `https://gamma-api.polymarket.com/markets?clob_token_ids=${tokenId}&limit=1`,
          { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
        );
        if (gammaRes.ok) {
          const markets = await gammaRes.json();
          if (Array.isArray(markets) && markets.length > 0) {
            const m = markets[0];
            const status = extractResolvedStatus(m, clobBidsCount, clobAsksCount);
            resolved = status.resolved;
            winner = status.winner;

            if (midPrice === null) {
              const price = extractPriceFromGammaMarket(m, tokenId);
              if (price !== null) midPrice = price;
            }
          }
        }
      } catch { /* ignore */ }
    }

    // Strategy 3: Gamma by condition_id
    if (marketId && (midPrice === null || !resolved)) {
      try {
        const gammaRes = await fetch(
          `https://gamma-api.polymarket.com/markets?condition_id=${marketId}&limit=1`,
          { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
        );
        if (gammaRes.ok) {
          const markets = await gammaRes.json();
          if (Array.isArray(markets) && markets.length > 0) {
            const m = markets[0];
            if (!resolved) {
              const status = extractResolvedStatus(m, clobBidsCount, clobAsksCount);
              if (status.resolved) {
                resolved = status.resolved;
                winner = status.winner;
              }
            }

            if (midPrice === null) {
              const price = extractPriceFromGammaMarket(m, null);
              if (price !== null) midPrice = price;
            }
          }
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json(
      { tokenId, marketId, bestBid, bestAsk, midPrice, resolved, winner },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
    );
  } catch (error: any) {
    console.error("Price proxy error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

/**
 * Determine if a market is resolved.
 *
 * | winner | closed | active | orderbook | → resolved? |
 * |--------|--------|--------|-----------|-------------|
 * | Yes    | *      | *      | *         | YES         |
 * | No     | true   | false  | *         | YES         |
 * | No     | true   | true   | empty     | YES         |
 * | No     | true   | true   | has orders| NO (paused) |
 * | No     | false  | *      | *         | NO          |
 *
 * Key: closed=true + active=true is ambiguous.
 * The CLOB orderbook is the tiebreaker — live orders mean
 * the market is still trading. Empty orderbook means resolved.
 */
function extractResolvedStatus(
  market: any,
  clobBidsCount: number,
  clobAsksCount: number
): { resolved: boolean; winner: string | null } {
  // 1. Explicit winner → always resolved
  if (Array.isArray(market.tokens)) {
    const winnerToken = market.tokens.find(
      (t: any) => t.winner === true || t.winner === "true"
    );
    if (winnerToken) {
      return { resolved: true, winner: winnerToken.outcome || null };
    }
  }

  const isClosed = market.closed === true || market.closed === "true";
  const isActive = market.active === true || market.active === "true";

  // Not closed → not resolved
  if (!isClosed) {
    return { resolved: false, winner: null };
  }

  // closed + not active → resolved
  if (!isActive) {
    return { resolved: true, winner: null };
  }

  // closed + active → check orderbook
  const orderbookEmpty = clobBidsCount === 0 && clobAsksCount === 0;
  if (orderbookEmpty) {
    return { resolved: true, winner: null };
  }

  // Has live orders → still trading
  return { resolved: false, winner: null };
}

function extractPriceFromGammaMarket(market: any, tokenId: string | null): number | null {
  let prices: number[] = [];

  if (market.outcomePrices) {
    if (typeof market.outcomePrices === "string") {
      try { prices = JSON.parse(market.outcomePrices).map(Number); }
      catch { prices = market.outcomePrices.split(",").map(Number); }
    } else if (Array.isArray(market.outcomePrices)) {
      prices = market.outcomePrices.map(Number);
    }
  }

  if (prices.length === 0) return null;

  if (tokenId) {
    let clobTokenIds: string[] = [];
    if (Array.isArray(market.clobTokenIds)) {
      clobTokenIds = market.clobTokenIds;
    } else if (typeof market.clobTokenIds === "string") {
      try { clobTokenIds = JSON.parse(market.clobTokenIds); } catch { /* ignore */ }
    }
    const tokenIndex = clobTokenIds.indexOf(tokenId);
    if (tokenIndex >= 0 && prices[tokenIndex] != null) {
      return prices[tokenIndex];
    }
  }

  if (!isNaN(prices[0]) && prices[0] >= 0 && prices[0] <= 1) {
    return prices[0];
  }
  return null;
}