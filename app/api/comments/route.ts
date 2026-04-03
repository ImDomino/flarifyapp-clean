import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { validateCommentContent, isValidUUID } from "@/lib/validate";
import { RL, rateLimitResponse } from "@/lib/rate-limit";
import { notifyUser } from "@/lib/realtime";

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
      .limit(200);
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

    // Validate optional parent_id
    if (body.parent_id && !isValidUUID(body.parent_id))
      return NextResponse.json({ error: "Invalid parent_id" }, { status: 400 });

    const hasImage = body.image_url && typeof body.image_url === "string" && body.image_url.length > 0;
    const v = validateCommentContent(body.content);
    if (!v.valid && !hasImage) return v.error!;

    const supabase = createServiceClient();

    // If parent_id provided, verify it exists and belongs to same post
    if (body.parent_id) {
      const { data: parent } = await supabase
        .from("comments")
        .select("id, post_id")
        .eq("id", body.parent_id)
        .single();

      if (!parent || parent.post_id !== body.post_id) {
        return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
      }
    }

    // Validate optional image_url
    let imageUrl: string | null = null;
    if (body.image_url && typeof body.image_url === "string" && body.image_url.length <= 2048) {
      try {
        const parsed = new URL(body.image_url);
        if (parsed.protocol === "https:") imageUrl = body.image_url;
      } catch {}
    }

    const insertData: any = {
      post_id: body.post_id,
      user_id: userId,
      content: v.valid ? v.content : "",
    };
    if (body.parent_id) insertData.parent_id = body.parent_id;
    if (imageUrl) insertData.image_url = imageUrl;

    const { data: comment, error } = await supabase
      .from("comments")
      .insert(insertData)
      .select().single();
    if (error) throw error;

    // Notification (non-critical)
    try {
      if (body.parent_id) {
        // Reply to comment — notify the parent comment author
        const { data: parentComment } = await supabase
          .from("comments").select("user_id").eq("id", body.parent_id).single();
        if (parentComment && parentComment.user_id !== userId) {
          await supabase.from("notifications").insert({
            user_id: parentComment.user_id,
            actor_id: userId,
            type: "comment",
            post_id: body.post_id,
          });
          notifyUser(parentComment.user_id, { type: "comment", actorId: userId, postId: body.post_id });
        }
      } else {
        // Top-level comment — notify the post author
        const { data: post } = await supabase
          .from("posts").select("user_id").eq("id", body.post_id).single();
        if (post && post.user_id !== userId) {
          await supabase.from("notifications").insert({
            user_id: post.user_id,
            actor_id: userId,
            type: "comment",
            post_id: body.post_id,
          });
          notifyUser(post.user_id, { type: "comment", actorId: userId, postId: body.post_id });
        }
      }
    } catch {}

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error: any) {
    console.error("Comment POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}