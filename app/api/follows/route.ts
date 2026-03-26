import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { isValidUserId } from "@/lib/validate";
import { RL, rateLimitResponse } from "@/lib/rate-limit";
import { notifyUser } from "@/lib/realtime";

// GET: public — returns counts + isFollowing
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!RL.readPublic(ip)) return rateLimitResponse();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const viewerId = searchParams.get("viewer_id");

    if (!userId || !isValidUserId(userId))
      return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });

    const supabase = createServiceClient();
    const { count: followersCount } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId);
    const { count: followingCount } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId);

    let isFollowing = false;
    if (viewerId && isValidUserId(viewerId) && viewerId !== userId) {
      const { data } = await supabase.from("follows").select("id").eq("follower_id", viewerId).eq("following_id", userId).single();
      isFollowing = !!data;
    }

    return NextResponse.json({ followers: followersCount || 0, following: followingCount || 0, isFollowing });
  } catch (error: any) {
    console.error("Follows GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: auth required — toggle follow
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.toggleFollow(userId)) return rateLimitResponse();

    const { following_id } = await request.json();
    if (!following_id || !isValidUserId(following_id))
      return NextResponse.json({ error: "Invalid following_id" }, { status: 400 });
    if (userId === following_id)
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("follows").select("id").eq("follower_id", userId).eq("following_id", following_id).single();

    if (existing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", following_id);
      if (error) throw error;
      return NextResponse.json({ success: true, action: "unfollowed" });
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id });
      if (error) throw error;
      try { await supabase.from("notifications").insert({ user_id: following_id, actor_id: userId, type: "follow" }); notifyUser(following_id, { type: "follow", actorId: userId }); } catch {}
      return NextResponse.json({ success: true, action: "followed" });
    }
  } catch (error: any) {
    console.error("Follow error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
