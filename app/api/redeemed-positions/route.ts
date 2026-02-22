import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/redeemed-positions - Save PnL data before redeem
 * GET  /api/redeemed-positions - Get all redeemed positions for current user
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { asset_id, condition_id, question, outcome, size, avg_price, cash_pnl, percent_pnl, current_value } = body;

    if (!asset_id) {
      return NextResponse.json({ error: "asset_id required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("redeemed_positions")
      .upsert({
        user_id: userId,
        asset_id,
        condition_id: condition_id || null,
        question: question || null,
        outcome: outcome || null,
        size: size || 0,
        avg_price: avg_price || 0,
        cash_pnl: cash_pnl || 0,
        percent_pnl: percent_pnl || 0,
        current_value: current_value || 0,
        redeemed_at: new Date().toISOString(),
      }, { onConflict: "user_id,asset_id" });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save redeemed position error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("redeemed_positions")
      .select("*")
      .eq("user_id", userId)
      .order("redeemed_at", { ascending: false });

    if (error) throw error;

    // Calculate totals
    let totalRedeemedPnl = 0;
    let totalRedeemedValue = 0;
    let redeemedWins = 0;
    let redeemedLosses = 0;

    for (const pos of data || []) {
      totalRedeemedPnl += Number(pos.cash_pnl || 0);
      totalRedeemedValue += Number(pos.current_value || 0);
      if (Number(pos.cash_pnl) > 0) redeemedWins++;
      else if (Number(pos.cash_pnl) < 0) redeemedLosses++;
    }

    return NextResponse.json({
      positions: data || [],
      totals: {
        pnl: totalRedeemedPnl,
        value: totalRedeemedValue,
        wins: redeemedWins,
        losses: redeemedLosses,
        count: (data || []).length,
      },
    });
  } catch (error: any) {
    console.error("Get redeemed positions error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}