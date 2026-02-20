import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { isValidUserId } from "@/lib/validate";

/**
 * GET /api/reposts?user_id=xxx
 * Returns posts that the user has reposted, with repost metadata.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId || !isValidUserId(userId))
      return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });

    const currentUserId = await getAuthenticatedUser(request);
    const supabase = createServiceClient();

    // Get user's reposts
    const { data: reposts, error: repostsErr } = await supabase
      .from("reposts")
      .select("post_id, quote_content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (repostsErr) throw repostsErr;
    if (!reposts || reposts.length === 0) {
      return NextResponse.json({ posts: [] });
    }

    const postIds = reposts.map((r: any) => r.post_id);

    // Fetch full posts
    const { data: posts, error: postsErr } = await supabase
      .from("posts")
      .select(`*, profiles (id, email, username, avatar_url, display_name)`)
      .in("id", postIds);
    if (postsErr) throw postsErr;

    // Get reposter display name
    const { data: reposterProfile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", userId)
      .single();

    const reposterName = reposterProfile?.display_name || reposterProfile?.username || "Someone";

    // Build repost map for ordering and metadata
    const repostMap = new Map(reposts.map((r: any) => [r.post_id, r]));
    const postMap = new Map((posts || []).map((p: any) => [p.id, p]));

    // Enrich with counts
    const likeCounts: Record<string, number> = {};
    const commentCounts: Record<string, number> = {};
    const repostCounts: Record<string, number> = {};
    const userLikedSet = new Set<string>();
    const userRepostedSet = new Set<string>();
    const userBookmarkedSet = new Set<string>();

    if (postIds.length > 0) {
      const { data: likesData } = await supabase.from("likes").select("post_id").in("post_id", postIds);
      for (const l of likesData || []) likeCounts[l.post_id] = (likeCounts[l.post_id] || 0) + 1;

      const { data: commentsData } = await supabase.from("comments").select("post_id").in("post_id", postIds);
      for (const c of commentsData || []) commentCounts[c.post_id] = (commentCounts[c.post_id] || 0) + 1;

      const { data: repostsData } = await supabase.from("reposts").select("post_id").in("post_id", postIds);
      for (const r of repostsData || []) repostCounts[r.post_id] = (repostCounts[r.post_id] || 0) + 1;

      if (currentUserId) {
        const { data: ul } = await supabase.from("likes").select("post_id").eq("user_id", currentUserId).in("post_id", postIds);
        for (const l of ul || []) userLikedSet.add(l.post_id);

        const { data: ur } = await supabase.from("reposts").select("post_id").eq("user_id", currentUserId).in("post_id", postIds);
        for (const r of ur || []) userRepostedSet.add(r.post_id);

        const { data: ub } = await supabase.from("bookmarks").select("post_id").eq("user_id", currentUserId).in("post_id", postIds);
        for (const b of ub || []) userBookmarkedSet.add(b.post_id);
      }
    }

    // Order by repost time, enrich
    const result = postIds
      .map((pid: string) => {
        const post = postMap.get(pid);
        const repost = repostMap.get(pid);
        if (!post || !repost) return null;
        return {
          ...post,
          likes_count: likeCounts[pid] || 0,
          comments_count: commentCounts[pid] || 0,
          reposts_count: repostCounts[pid] || 0,
          user_has_liked: userLikedSet.has(pid),
          user_has_reposted: userRepostedSet.has(pid),
          user_has_bookmarked: userBookmarkedSet.has(pid),
          reposted_by: reposterName,
          repost_created_at: repost.created_at,
          quote_content: repost.quote_content,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ posts: result });
  } catch (error: any) {
    console.error("Reposts GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}