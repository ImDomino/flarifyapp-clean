import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { isValidUUID, isValidUserId } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("post_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = (page - 1) * limit;
    const userId = searchParams.get("user_id");
    const marketId = searchParams.get("market_id");

    if (postId && !isValidUUID(postId))
      return NextResponse.json({ error: "Invalid post_id" }, { status: 400 });
    if (userId && !isValidUserId(userId))
      return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });

    // Optional auth — if present we can check user_has_liked
    const currentUserId = await getAuthenticatedUser(request);

    const supabase = createServiceClient();
    let query = supabase
      .from("posts")
      .select(`*, profiles (id, email, username, avatar_url, display_name)`, { count: "exact" })
      .order("created_at", { ascending: false });

    if (postId) query = query.eq("id", postId);
    if (userId) query = query.eq("user_id", userId);
    if (marketId) query = query.eq("polymarket_market_id", marketId);

    const { data: posts, error, count } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    const postIds = (posts || []).map((p) => p.id);

    // Batch fetch counts + user likes
    const likeCounts: Record<string, number> = {};
    const commentCounts: Record<string, number> = {};
    const userLikedSet = new Set<string>();

    if (postIds.length > 0) {
      const { data: likesData } = await supabase
        .from("likes").select("post_id").in("post_id", postIds);
      for (const like of likesData || []) {
        likeCounts[like.post_id] = (likeCounts[like.post_id] || 0) + 1;
      }

      const { data: commentsData } = await supabase
        .from("comments").select("post_id").in("post_id", postIds);
      for (const comment of commentsData || []) {
        commentCounts[comment.post_id] = (commentCounts[comment.post_id] || 0) + 1;
      }

      // Check which posts the current user has liked
      if (currentUserId) {
        const { data: userLikes } = await supabase
          .from("likes").select("post_id").eq("user_id", currentUserId).in("post_id", postIds);
        for (const like of userLikes || []) {
          userLikedSet.add(like.post_id);
        }
      }
    }

    const postsWithCounts = (posts || []).map((post) => ({
      ...post,
      likes_count: likeCounts[post.id] || 0,
      comments_count: commentCounts[post.id] || 0,
      user_has_liked: userLikedSet.has(post.id),
    }));

    return NextResponse.json({
      posts: postsWithCounts,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit), hasMore: offset + limit < (count || 0) },
    });
  } catch (error: any) {
    console.error("Posts GET error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}