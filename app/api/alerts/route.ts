import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_ACTIVE_ALERTS = 20;

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// GET: list user's alerts
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active_only") === "true";

    const supabase = createServiceClient();

    let query = supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true).is("triggered_at", null);
    }

    const { data: alerts, error } = await query;
    if (error) throw error;

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error: any) {
    console.error("Alerts GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: create a price alert
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { condition_id, token_id, outcome, direction, threshold, market_question } = body;

    if (!RL.toggleAlert(userId)) return rateLimitResponse();

    if (!condition_id || typeof condition_id !== "string" || condition_id.length > 200) {
      return NextResponse.json({ error: "condition_id required" }, { status: 400 });
    }
    if (!token_id || typeof token_id !== "string" || token_id.length > 200) {
      return NextResponse.json({ error: "token_id required" }, { status: 400 });
    }
    if (!["above", "below"].includes(direction)) {
      return NextResponse.json({ error: "direction must be 'above' or 'below'" }, { status: 400 });
    }
    if (typeof threshold !== "number" || threshold < 0 || threshold > 1) {
      return NextResponse.json({ error: "threshold must be between 0 and 1" }, { status: 400 });
    }
    if (outcome && !["Yes", "No"].includes(outcome)) {
      return NextResponse.json({ error: "outcome must be 'Yes' or 'No'" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check active alerts limit
    const { count } = await supabase
      .from("price_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true)
      .is("triggered_at", null);

    if ((count || 0) >= MAX_ACTIVE_ALERTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ACTIVE_ALERTS} active alerts allowed` },
        { status: 400 }
      );
    }

    const { data: alert, error } = await supabase
      .from("price_alerts")
      .insert({
        user_id: userId,
        condition_id,
        token_id,
        outcome: outcome || "Yes",
        direction,
        threshold,
        market_question: typeof market_question === "string" ? market_question.slice(0, 500) : null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    console.error("Alerts POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH: toggle or delete an alert
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { alert_id, action } = body;

    if (!RL.toggleAlert(userId)) return rateLimitResponse();

    if (!alert_id || typeof alert_id !== "string" || !isValidUUID(alert_id)) {
      return NextResponse.json({ error: "Valid alert_id required" }, { status: 400 });
    }
    if (!["toggle", "delete"].includes(action)) {
      return NextResponse.json({ error: "action must be 'toggle' or 'delete'" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: alert } = await supabase
      .from("price_alerts")
      .select("id, user_id, is_active")
      .eq("id", alert_id)
      .single();

    if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (alert.user_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (action === "delete") {
      const { error } = await supabase.from("price_alerts").delete().eq("id", alert_id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Toggle
    const { data: updated, error } = await supabase
      .from("price_alerts")
      .update({ is_active: !alert.is_active })
      .eq("id", alert_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, alert: updated });
  } catch (error: any) {
    console.error("Alerts PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
