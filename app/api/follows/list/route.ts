import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isValidUserId } from "@/lib/validate";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!RL.readPublic(ip)) return rateLimitResponse();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const type = searchParams.get("type"); // "followers" | "following"
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20") || 20, 1), 50);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0") || 0, 0);

    if (!userId || !isValidUserId(userId))
      return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
    if (type !== "followers" && type !== "following")
      return NextResponse.json({ error: "type must be followers or following" }, { status: 400 });

    const supabase = createServiceClient();

    // Determine which column to filter and which to extract
    const filterCol = type === "followers" ? "following_id" : "follower_id";
    const selectCol = type === "followers" ? "follower_id" : "following_id";

    // Get follow records
    const { data: follows, error: followsError } = await supabase
      .from("follows")
      .select(selectCol)
      .eq(filterCol, userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (followsError) throw followsError;

    // Get total count
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq(filterCol, userId);

    if (!follows || follows.length === 0) {
      return NextResponse.json({ users: [], total: count || 0 });
    }

    // Extract user IDs and fetch profiles
    const userIds = follows.map((f: any) => f[selectCol]).filter(Boolean);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .in("id", userIds);

    if (profilesError) throw profilesError;

    // Maintain order from follows query
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const users = userIds.map((id: string) => profileMap.get(id)).filter(Boolean);

    return NextResponse.json({ users, total: count || 0 });
  } catch (error: any) {
    console.error("Follows list error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
