import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { isValidUUID } from "@/lib/validate";
import { notifyUser } from "@/lib/realtime";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    if (!body.post_id || !isValidUUID(body.post_id))
      return NextResponse.json({ error: "Invalid post_id" }, { status: 400 });

    // Optional quote content (max 500 chars)
    const quoteContent = body.quote_content?.trim()?.slice(0, 500) || null;

    const supabase = createServiceClient();

    // Check if already reposted
    const { data: existing } = await supabase
      .from("reposts")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", body.post_id)
      .single();

    if (existing) {
      // Undo repost
      await supabase.from("reposts").delete().eq("id", existing.id);
      return NextResponse.json({ success: true, reposted: false });
    }

    // Can't repost own post
    const { data: post } = await supabase
      .from("posts").select("user_id").eq("id", body.post_id).single();
    if (post?.user_id === userId)
      return NextResponse.json({ error: "Cannot repost your own post" }, { status: 400 });

    // Create repost
    const { error } = await supabase
      .from("reposts")
      .insert({ user_id: userId, post_id: body.post_id, quote_content: quoteContent });
    if (error) throw error;

    // Notification (non-critical)
    try {
      if (post && post.user_id !== userId) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          actor_id: userId,
          type: "repost",
          post_id: body.post_id,
        });
        notifyUser(post.user_id, { type: "repost", actorId: userId, postId: body.post_id });
      }
    } catch {}

    return NextResponse.json({ success: true, reposted: true }, { status: 201 });
  } catch (error: any) {
    console.error("Repost error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}