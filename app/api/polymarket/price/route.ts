import { NextRequest, NextResponse } from "next/server";

// Force US region — Polymarket APIs may geo-block
export const runtime = "nodejs";
export const preferredRegion = "iad1";

/**
 * GET /api/polymarket/price?token_id=XXX&market_id=YYY
 *
 * Returns: { midPrice, bestBid, bestAsk }
 * bestBid = highest bid (best price for sellers)
 * bestAsk = lowest ask (best price for buyers)
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

    // Strategy 1: CLOB orderbook
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

          // CLOB may return bids/asks in any order — find actual best
          // Best bid = HIGHEST price someone is willing to buy at
          // Best ask = LOWEST price someone is willing to sell at
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

          console.log(`📊 CLOB [${tokenId.slice(0,8)}...]: bids=${bids.length} asks=${asks.length} bestBid=${bestBid} bestAsk=${bestAsk} mid=${midPrice}`);
        } else {
          console.warn(`⚠️ CLOB ${clobRes.status} for ${tokenId.slice(0,8)}...`);
        }
      } catch (e: any) {
        console.warn(`⚠️ CLOB error: ${e.message?.slice(0, 80)}`);
      }
    }

    // Strategy 2: Gamma API by clob_token_ids
    if (midPrice === null && tokenId) {
      try {
        const gammaRes = await fetch(
          `https://gamma-api.polymarket.com/markets?clob_token_ids=${tokenId}&limit=1`,
          { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
        );
        if (gammaRes.ok) {
          const markets = await gammaRes.json();
          if (Array.isArray(markets) && markets.length > 0) {
            const price = extractPriceFromGammaMarket(markets[0], tokenId);
            if (price !== null) {
              midPrice = price;
              console.log(`📊 Gamma [${tokenId.slice(0,8)}...]: price=${price}`);
            }
          }
        }
      } catch { /* ignore */ }
    }

    // Strategy 3: Gamma API by condition_id
    if (midPrice === null && marketId) {
      try {
        const gammaRes = await fetch(
          `https://gamma-api.polymarket.com/markets?condition_id=${marketId}&limit=1`,
          { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
        );
        if (gammaRes.ok) {
          const markets = await gammaRes.json();
          if (Array.isArray(markets) && markets.length > 0) {
            const price = extractPriceFromGammaMarket(markets[0], null);
            if (price !== null) {
              midPrice = price;
              console.log(`📊 Gamma cond [${marketId.slice(0,8)}...]: price=${price}`);
            }
          }
        }
      } catch { /* ignore */ }
    }

    if (midPrice === null) {
      console.warn(`❌ No price: token=${tokenId?.slice(0,8)} market=${marketId?.slice(0,8)}`);
    }

    return NextResponse.json(
      { tokenId, marketId, bestBid, bestAsk, midPrice },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
    );
  } catch (error: any) {
    console.error("Price proxy error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
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