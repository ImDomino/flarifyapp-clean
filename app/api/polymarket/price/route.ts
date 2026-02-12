import { NextRequest, NextResponse } from "next/server";

// Force US region — Polymarket CLOB blocks certain geos
export const runtime = "nodejs";
export const preferredRegion = "iad1"; // US East (Washington DC)

/**
 * GET /api/polymarket/price?token_id=XXX
 *
 * Server-side proxy to fetch live orderbook prices from Polymarket CLOB.
 * Runs in US region to avoid geo-blocking.
 * Falls back to Gamma API if CLOB is unavailable.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("token_id");

    if (!tokenId) {
      return NextResponse.json({ error: "Missing token_id" }, { status: 400 });
    }

    // Strategy 1: CLOB orderbook (most accurate, real-time)
    let midPrice: number | null = null;
    let bestBid: number | null = null;
    let bestAsk: number | null = null;

    try {
      const clobRes = await fetch(
        `https://clob.polymarket.com/book?token_id=${tokenId}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000), // 5s timeout
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
      } else {
        const text = await clobRes.text().catch(() => "");
        console.warn("CLOB book error:", clobRes.status, text.slice(0, 200));
      }
    } catch (clobErr: any) {
      console.warn("CLOB fetch failed:", clobErr.message?.slice(0, 100));
    }

    // Strategy 2: Gamma API price endpoint (fallback)
    if (midPrice === null) {
      try {
        const gammaRes = await fetch(
          `https://gamma-api.polymarket.com/markets?clob_token_ids=${tokenId}&closed=false&limit=1`,
          {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(5000),
          }
        );

        if (gammaRes.ok) {
          const markets = await gammaRes.json();
          if (Array.isArray(markets) && markets.length > 0) {
            const market = markets[0];

            // Parse outcomePrices
            let prices: number[] = [];
            if (market.outcomePrices) {
              if (typeof market.outcomePrices === "string") {
                try {
                  prices = JSON.parse(market.outcomePrices).map(Number);
                } catch {
                  prices = market.outcomePrices.split(",").map(Number);
                }
              } else if (Array.isArray(market.outcomePrices)) {
                prices = market.outcomePrices.map(Number);
              }
            }

            // Figure out which token this is (YES or NO)
            let clobTokenIds: string[] = [];
            if (Array.isArray(market.clobTokenIds)) {
              clobTokenIds = market.clobTokenIds;
            } else if (typeof market.clobTokenIds === "string") {
              try {
                clobTokenIds = JSON.parse(market.clobTokenIds);
              } catch { /* ignore */ }
            }

            const tokenIndex = clobTokenIds.indexOf(tokenId);
            if (tokenIndex >= 0 && prices[tokenIndex] != null) {
              midPrice = prices[tokenIndex];
            } else if (prices.length > 0) {
              // Assume first price is YES
              midPrice = prices[0];
            }
          }
        }
      } catch (gammaErr: any) {
        console.warn("Gamma fallback failed:", gammaErr.message?.slice(0, 100));
      }
    }

    // Set cache headers: cache for 30s, stale-while-revalidate for 120s
    const headers = {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    };

    return NextResponse.json(
      { tokenId, bestBid, bestAsk, midPrice },
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