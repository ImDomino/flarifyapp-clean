import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/polymarket/condition?token_id=xxx
 * 
 * Proxies Gamma API to get conditionId for a token.
 * Needed because Gamma API blocks CORS from browser.
 */
export async function GET(request: NextRequest) {
  try {
    const tokenId = request.nextUrl.searchParams.get("token_id");
    if (!tokenId) {
      return NextResponse.json({ error: "token_id required" }, { status: 400 });
    }

    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?clob_token_ids=${tokenId}&limit=1`,
      {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Gamma API error: ${res.status}` }, { status: 502 });
    }

    const markets = await res.json();
    if (!Array.isArray(markets) || markets.length === 0) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const market = markets[0];
    const conditionId = market.conditionId || market.condition_id;
    const negRisk = market.negRisk === true || market.negRisk === "true";

    if (!conditionId) {
      return NextResponse.json({ error: "No conditionId in market data" }, { status: 404 });
    }

    return NextResponse.json({ conditionId, negRisk });
  } catch (error: any) {
    console.error("[condition] Error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch condition" }, { status: 500 });
  }
}