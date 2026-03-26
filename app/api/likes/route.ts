import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { isValidUUID } from "@/lib/validate";
import { RL, rateLimitResponse } from "@/lib/rate-limit";
import { notifyUser } from "@/lib/realtime";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.toggleLike(userId)) return rateLimitResponse();

    const { post_id } = await request.json();
    if (!post_id || !isValidUUID(post_id))
      return NextResponse.json({ error: "Invalid post_id" }, { status: 400 });

    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("likes").select().eq("post_id", post_id).eq("user_id", userId).single();

    if (existing) {
      const { error } = await supabase.from("likes").delete().eq("post_id", post_id).eq("user_id", userId);
      if (error) throw error;
      return NextResponse.json({ success: true, action: "unliked" });
    } else {
      const { error } = await supabase.from("likes").insert({ post_id, user_id: userId });
      if (error) throw error;

      // Notification
      try {
        const { data: post } = await supabase.from("posts").select("user_id").eq("id", post_id).single();
        if (post && post.user_id !== userId) {
          await supabase.from("notifications").insert({ user_id: post.user_id, actor_id: userId, type: "like", post_id });
          notifyUser(post.user_id, { type: "like", actorId: userId });
        }
      } catch {}

      return NextResponse.json({ success: true, action: "liked" });
    }
  } catch (error: any) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
