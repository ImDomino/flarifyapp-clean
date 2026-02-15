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

    const postsWithCounts = await Promise.all(
      (posts || []).map(async (post) => {
        const { count: lc } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", post.id);
        const { count: cc } = await supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", post.id);
        return { ...post, likes_count: lc || 0, comments_count: cc || 0, user_has_liked: false };
      })
    );

    return NextResponse.json({
      posts: postsWithCounts,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit), hasMore: offset + limit < (count || 0) },
    });
  } catch (error: any) {
    console.error("Following feed error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
