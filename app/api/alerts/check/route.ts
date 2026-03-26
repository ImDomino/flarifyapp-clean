import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";
import { timingSafeEqual } from "crypto";
import { notifyUser } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/alerts/check
 *
 * Two modes:
 * 1. Cron: Bearer CRON_SECRET → checks ALL active alerts (batch)
 * 2. User: JWT auth → checks only that user's active alerts (triggered on page load)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    let filterUserId: string | null = null;

    // Try cron secret first
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader) {
      const expected = `Bearer ${cronSecret}`;
      if (authHeader.length === expected.length &&
          timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))) {
        // Cron mode — check all alerts
        filterUserId = null;
      } else {
        // Not cron secret — try JWT
        const userId = await getAuthenticatedUser(request);
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!RL.toggleAlert(userId)) return rateLimitResponse();
        filterUserId = userId;
      }
    } else {
      // No cron secret configured or no auth header with Bearer — try JWT
      const userId = await getAuthenticatedUser(request);
      if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (!RL.toggleAlert(userId)) return rateLimitResponse();
      filterUserId = userId;
    }

    // Fetch active, un-triggered alerts
    let query = supabase
      .from("price_alerts")
      .select("*")
      .eq("is_active", true)
      .is("triggered_at", null)
      .limit(50);

    if (filterUserId) {
      query = query.eq("user_id", filterUserId);
    }

    const { data: alerts, error: fetchError } = await query;

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
      await Promise.allSettled(
        batch.map(async (tokenId) => {
          const res = await fetch(
            `https://clob.polymarket.com/book?token_id=${tokenId}`,
            { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) }
          );
          if (!res.ok) return;
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
    const triggeredAlerts: Array<{ alert: any; price: number }> = [];

    for (const alert of alerts) {
      const price = prices.get(alert.token_id);
      if (price === undefined) continue;

      const shouldTrigger =
        (alert.direction === "above" && price >= alert.threshold) ||
        (alert.direction === "below" && price <= alert.threshold);

      if (shouldTrigger) {
        triggeredIds.push(alert.id);
        triggeredAlerts.push({ alert, price });
      }
    }

    // Insert notifications FIRST, then mark alerts as triggered
    // This way if notification insert fails, alert stays active and will retry
    if (triggeredIds.length > 0) {
      const successfullyNotified: string[] = [];

      for (const { alert, price } of triggeredAlerts) {
        const pricePercent = Math.round(price * 100);
        const thresholdPercent = Math.round(alert.threshold * 100);

        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: alert.user_id,
            actor_id: alert.user_id,
            type: "price_alert",
            post_id: null,
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

        if (notifError) {
          console.error("Failed to insert alert notification:", notifError, {
            user_id: alert.user_id,
            alert_id: alert.id,
            market: alert.market_question,
          });
          // Don't mark this alert as triggered — it will retry next check
        } else {
          successfullyNotified.push(alert.id);
          const alertMsg = `${alert.outcome} ${alert.direction === "above" ? "went above" : "dropped below"} ${thresholdPercent}¢ (now ${pricePercent}¢) — ${alert.market_question}`;
          notifyUser(alert.user_id, { type: "price_alert", extra: alertMsg });
        }
      }

      // Only mark alerts as triggered if notification was successfully created
      if (successfullyNotified.length > 0) {
        const { error: updateError } = await supabase
          .from("price_alerts")
          .update({ triggered_at: new Date().toISOString() })
          .in("id", successfullyNotified);

        if (updateError) {
          console.error("Failed to update triggered alerts:", updateError);
        }
      }
    }

    // Debug: log what was checked
    const priceEntries = Array.from(prices.entries()).map(([tid, p]) => ({
      token: tid.slice(0, 12) + "...",
      price: Math.round(p * 100),
    }));
    console.log("Alert check results:", {
      checked: alerts.length,
      triggered: triggeredIds.length,
      pricesFound: prices.size,
      prices: priceEntries,
    });

    return NextResponse.json({
      checked: alerts.length,
      triggered: triggeredIds.length,
    });
  } catch (error: any) {
    console.error("Alert check error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
