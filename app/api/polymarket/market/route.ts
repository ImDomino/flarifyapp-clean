import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/polymarket/market?condition_id=xxx&token_id=yyy
 *
 * Fetches market info from Gamma API.
 * Uses clob_token_ids lookup (condition_id filter is broken in Gamma).
 * Proxy needed because Gamma API blocks CORS from browser.
 */
export async function GET(request: NextRequest) {
  try {
    const conditionId = request.nextUrl.searchParams.get("condition_id");
    const tokenId = request.nextUrl.searchParams.get("token_id");

    if (!conditionId && !tokenId) {
      return NextResponse.json({ error: "condition_id or token_id required" }, { status: 400 });
    }

    // Use token_id lookup (reliable) over condition_id (broken in Gamma)
    const query = tokenId
      ? `clob_token_ids=${tokenId}`
      : `condition_id=${conditionId}`;

    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?${query}&limit=1`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Gamma API error: ${res.status}` }, { status: 502 });
    }

    const markets = await res.json();
    if (!Array.isArray(markets) || markets.length === 0) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const m = markets[0];

    // Verify result matches query to avoid Gamma's fallback behavior
    if (tokenId) {
      let clobTokenIds: string[] = [];
      if (Array.isArray(m.clobTokenIds)) clobTokenIds = m.clobTokenIds;
      else if (typeof m.clobTokenIds === "string") {
        try { clobTokenIds = JSON.parse(m.clobTokenIds); } catch {}
      }
      if (!clobTokenIds.includes(tokenId)) {
        return NextResponse.json({ error: "Market not found" }, { status: 404 });
      }
    }

    // Parse outcomes
    let outcomes = ["Yes", "No"];
    if (Array.isArray(m.outcomes)) outcomes = m.outcomes;
    else if (typeof m.outcomes === "string") {
      try { outcomes = JSON.parse(m.outcomes); } catch {}
    }

    // Parse prices
    let prices: number[] | null = null;
    if (m.outcomePrices) {
      if (Array.isArray(m.outcomePrices)) prices = m.outcomePrices.map(Number);
      else if (typeof m.outcomePrices === "string") {
        try { prices = JSON.parse(m.outcomePrices).map(Number); } catch {}
      }
    }

    // Parse token IDs
    let yesTokenId: string | undefined;
    let noTokenId: string | undefined;
    if (Array.isArray(m.clobTokenIds) && m.clobTokenIds.length >= 2) {
      [yesTokenId, noTokenId] = m.clobTokenIds;
    } else if (typeof m.clobTokenIds === "string") {
      try {
        const parsed = JSON.parse(m.clobTokenIds);
        if (Array.isArray(parsed) && parsed.length >= 2) [yesTokenId, noTokenId] = parsed;
      } catch {}
    }

    const slug = m.slug || m.marketSlug || m.id;

    return NextResponse.json({
      market: {
        question: m.question || "",
        url: `https://polymarket.com/event/${slug}`,
        outcomes,
        prices,
        volume: m.volume?.toString() || m.volumeNum?.toString() || "0",
        yesTokenId,
        noTokenId,
        negRisk: m.neg_risk === "true" || m.neg_risk === true || m.negRisk === true,
      },
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error: any) {
    console.error("[market] Error:", error?.message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
