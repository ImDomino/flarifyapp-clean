import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();
    const { data: followData } = await supabase
      .from("follows").select("following_id").eq("follower_id", userId);
    const followingIds = (followData || []).map((f) => f.following_id);

    if (followingIds.length === 0) {
      return NextResponse.json({ posts: [], pagination: { page, limit, total: 0, totalPages: 0, hasMore: false } });
    }

    const { data: posts, error, count } = await supabase
      .from("posts")
      .select(`*, profiles (id, email, username, avatar_url, display_name)`, { count: "exact" })
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    const postIds = (posts || []).map((p) => p.id);
    const likeCounts: Record<string, number> = {};
    const commentCounts: Record<string, number> = {};
    const userLikedSet = new Set<string>();
    const userRepostedSet = new Set<string>();
    const userBookmarkedSet = new Set<string>();

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

      // Current user's likes
      const { data: userLikes } = await supabase
        .from("likes").select("post_id").eq("user_id", userId).in("post_id", postIds);
      for (const like of userLikes || []) {
        userLikedSet.add(like.post_id);
      }

      // Current user's reposts
      const { data: userReposts } = await supabase
        .from("reposts").select("post_id").eq("user_id", userId).in("post_id", postIds);
      for (const r of userReposts || []) {
        userRepostedSet.add(r.post_id);
      }

      // Current user's bookmarks
      const { data: userBookmarks } = await supabase
        .from("bookmarks").select("post_id").eq("user_id", userId).in("post_id", postIds);
      for (const b of userBookmarks || []) {
        userBookmarkedSet.add(b.post_id);
      }
    }

    const postsWithCounts = (posts || []).map((post) => ({
      ...post,
      likes_count: likeCounts[post.id] || 0,
      comments_count: commentCounts[post.id] || 0,
      user_has_liked: userLikedSet.has(post.id),
      user_has_reposted: userRepostedSet.has(post.id),
      user_has_bookmarked: userBookmarkedSet.has(post.id),
    }));

    return NextResponse.json({
      posts: postsWithCounts,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit), hasMore: offset + limit < (count || 0) },
    });
  } catch (error: any) {
    console.error("Following feed error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
