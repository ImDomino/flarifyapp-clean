import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET: list user's watchlist
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const supabase = createServiceClient();

    const { data: watchlist, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ watchlist: watchlist || [] });
  } catch (error: any) {
    console.error("Watchlist GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: toggle watchlist item (add if not exists, remove if exists)
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    const { condition_id, token_id, market_question, image_url } = body;

    if (!RL.toggleWatch(userId)) return rateLimitResponse();

    if (!condition_id || typeof condition_id !== "string" || condition_id.length > 200) {
      return NextResponse.json({ error: "condition_id required" }, { status: 400 });
    }
    if (!token_id || typeof token_id !== "string" || token_id.length > 200) {
      return NextResponse.json({ error: "token_id required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check if already watching
    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", userId)
      .eq("condition_id", condition_id)
      .maybeSingle();

    if (existing) {
      // Remove
      const { error } = await supabase.from("watchlist").delete().eq("id", existing.id);
      if (error) throw error;
      return NextResponse.json({ success: true, watching: false });
    }

    // Add — limit to 20 items
    const { count } = await supabase
      .from("watchlist")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count || 0) >= 20) {
      return NextResponse.json({ error: "Maximum 20 watchlist items allowed" }, { status: 400 });
    }

    const { data: item, error } = await supabase
      .from("watchlist")
      .insert({
        user_id: userId,
        condition_id,
        token_id,
        market_question: typeof market_question === "string" ? market_question.slice(0, 500) : null,
        image_url: typeof image_url === "string" && image_url.length <= 2048 ? image_url : null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, watching: true, item });
  } catch (error: any) {
    console.error("Watchlist POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
