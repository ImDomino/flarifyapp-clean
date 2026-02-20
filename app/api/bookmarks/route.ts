import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { isValidUUID } from "@/lib/validate";

// POST - toggle bookmark
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const body = await request.json();
    if (!body.post_id || !isValidUUID(body.post_id))
      return NextResponse.json({ error: "Invalid post_id" }, { status: 400 });

    const supabase = createServiceClient();

    // Check if already bookmarked
    const { data: existing } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", body.post_id)
      .single();

    if (existing) {
      // Remove bookmark
      await supabase.from("bookmarks").delete().eq("id", existing.id);
      return NextResponse.json({ success: true, bookmarked: false });
    }

    // Add bookmark
    const { error } = await supabase
      .from("bookmarks")
      .insert({ user_id: userId, post_id: body.post_id });
    if (error) throw error;

    return NextResponse.json({ success: true, bookmarked: true }, { status: 201 });
  } catch (error: any) {
    console.error("Bookmark error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// GET - list user's bookmarks
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    // Get bookmarked post IDs
    const { data: bookmarks, error: bmErr, count } = await supabase
      .from("bookmarks")
      .select("post_id", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (bmErr) throw bmErr;
    if (!bookmarks || bookmarks.length === 0) {
      return NextResponse.json({ posts: [], pagination: { page, limit, total: 0, hasMore: false } });
    }

    const postIds = bookmarks.map((b: any) => b.post_id);

    // Fetch full posts
    const { data: posts, error: postsErr } = await supabase
      .from("posts")
      .select(`*, profiles (id, email, username, avatar_url, display_name)`)
      .in("id", postIds);
    if (postsErr) throw postsErr;

    // Preserve bookmark order
    const postMap = new Map((posts || []).map((p: any) => [p.id, p]));
    const orderedPosts = postIds.map((id: string) => postMap.get(id)).filter(Boolean);

    // Enrich with counts
    const likeCounts: Record<string, number> = {};
    const commentCounts: Record<string, number> = {};
    const userLikedSet = new Set<string>();

    const { data: likesData } = await supabase.from("likes").select("post_id").in("post_id", postIds);
    for (const l of likesData || []) likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;

    const { data: commentsData } = await supabase.from("comments").select("post_id").in("post_id", postIds);
    for (const c of commentsData || []) commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;

    const { data: userLikes } = await supabase.from("likes").select("post_id").eq("user_id", userId).in("post_id", postIds);
    for (const l of userLikes || []) userLikedSet.add(l.post_id);

    const enriched = orderedPosts.map((post: any) => ({
      ...post,
      likes_count: likeCounts[post.id] || 0,
      comments_count: commentCounts[post.id] || 0,
      user_has_liked: userLikedSet.has(post.id),
      user_has_bookmarked: true,
    }));

    return NextResponse.json({
      posts: enriched,
      pagination: { page, limit, total: count || 0, hasMore: offset + limit < (count || 0) },
    });
  } catch (error: any) {
    console.error("Bookmarks GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}