import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { validateCommentContent, isValidUUID } from "@/lib/validate";
import { RL, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const post_id = searchParams.get("post_id");
    if (!post_id || !isValidUUID(post_id))
      return NextResponse.json({ error: "Invalid post_id" }, { status: 400 });

    const supabase = createServiceClient();
    const { data: comments, error } = await supabase
      .from("comments")
      .select(`*, profiles (id, email, username, avatar_url, display_name)`)
      .eq("post_id", post_id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;

    return NextResponse.json({ comments: comments || [] });
  } catch (error: any) {
    console.error("Comments GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();
    if (!RL.createComment(userId)) return rateLimitResponse();

    const body = await request.json();
    if (!body.post_id || !isValidUUID(body.post_id))
      return NextResponse.json({ error: "Invalid post_id" }, { status: 400 });

    const v = validateCommentContent(body.content);
    if (!v.valid) return v.error!;

    const supabase = createServiceClient();
    const { data: comment, error } = await supabase
      .from("comments")
      .insert({ post_id: body.post_id, user_id: userId, content: v.content })
      .select().single();
    if (error) throw error;

    // Notification (non-critical)
    try {
      const { data: post } = await supabase.from("posts").select("user_id").eq("id", body.post_id).single();
      if (post && post.user_id !== userId) {
        await supabase.from("notifications").insert({ user_id: post.user_id, actor_id: userId, type: "comment", post_id: body.post_id });
      }
    } catch {}

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error: any) {
    console.error("Comment POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
