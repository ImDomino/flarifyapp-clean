import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/alerts/check — called by Vercel Cron every 5 minutes
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    const expected = `Bearer ${cronSecret}`;
    if (!cronSecret || !authHeader || authHeader.length !== expected.length ||
        !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Fetch active, un-triggered alerts
    const { data: alerts, error: fetchError } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("is_active", true)
      .is("triggered_at", null)
      .limit(50);

    if (fetchError) throw fetchError;
    if (!alerts || alerts.length === 0) {
      return NextResponse.json({ checked: 0, triggered: 0 });
    }

    // Group by token_id to deduplicate price fetches
    const tokenAlerts = new Map<string, typeof alerts>();
    for (const alert of alerts) {
      const existing = tokenAlerts.get(alert.token_id) || [];
      existing.push(alert);
      tokenAlerts.set(alert.token_id, existing);
    }

    // Fetch prices in batches of 5
    const tokenIds = Array.from(tokenAlerts.keys());
    const prices = new Map<string, number>();

    for (let i = 0; i < tokenIds.length; i += 5) {
      const batch = tokenIds.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (tokenId) => {
          const res = await fetch(
            `https://clob.polymarket.com/book?token_id=${tokenId}`,
            { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
          );
          if (!res.ok) return null;
          const data = await res.json();

          const bids: Array<{ price: string }> = data.bids || [];
          const asks: Array<{ price: string }> = data.asks || [];

          let bestBid: number | null = null;
          let bestAsk: number | null = null;

          if (bids.length > 0) bestBid = Math.max(...bids.map((b) => parseFloat(b.price)));
          if (asks.length > 0) bestAsk = Math.min(...asks.map((a) => parseFloat(a.price)));

          let midPrice: number | null = null;
          if (bestBid !== null && bestAsk !== null) midPrice = (bestBid + bestAsk) / 2;
          else if (bestBid !== null) midPrice = bestBid;
          else if (bestAsk !== null) midPrice = bestAsk;

          if (midPrice !== null) prices.set(tokenId, midPrice);
        })
      );
    }

    // Check which alerts should trigger
    const triggeredIds: string[] = [];
    const notifications: Array<{
      user_id: string;
      type: string;
      content: string;
    }> = [];

    for (const alert of alerts) {
      const price = prices.get(alert.token_id);
      if (price === undefined) continue;

      const shouldTrigger =
        (alert.direction === "above" && price >= alert.threshold) ||
        (alert.direction === "below" && price <= alert.threshold);

      if (shouldTrigger) {
        triggeredIds.push(alert.id);
        const pricePercent = Math.round(price * 100);
        const thresholdPercent = Math.round(alert.threshold * 100);
        notifications.push({
          user_id: alert.user_id,
          type: "price_alert",
          content: JSON.stringify({
            market_question: alert.market_question,
            outcome: alert.outcome,
            direction: alert.direction,
            threshold: alert.threshold,
            current_price: price,
            condition_id: alert.condition_id,
            message: `${alert.outcome} ${alert.direction === "above" ? "went above" : "dropped below"} ${thresholdPercent}¢ (now ${pricePercent}¢)`,
          }),
        });
      }
    }

    // Update triggered alerts and insert notifications
    if (triggeredIds.length > 0) {
      await supabase
        .from("price_alerts")
        .update({ triggered_at: new Date().toISOString() })
        .in("id", triggeredIds);

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
    }

    return NextResponse.json({
      checked: alerts.length,
      triggered: triggeredIds.length,
    });
  } catch (error: any) {
    console.error("Alert check error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
