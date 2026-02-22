import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/polymarket/activity?user=0x...&type=REDEEM
 * 
 * Proxies Polymarket Data API activity endpoint.
 * Supports all query params: user, type, market, start, end, side, sortBy, sortDirection
 */
export async function GET(request: NextRequest) {
  try {
    const user = request.nextUrl.searchParams.get("user");
    if (!user) {
      return NextResponse.json({ error: "user required" }, { status: 400 });
    }

    // Forward all query params
    const params = new URLSearchParams();
    request.nextUrl.searchParams.forEach((value, key) => {
      params.set(key, value);
    });

    const res = await fetch(
      `https://data-api.polymarket.com/activity?${params.toString()}`,
      {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Data API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[activity] Error:", error?.message);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}