import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/posts/recommended?page=1&limit=20
 *
 * Scoring algorithm (applied after fetching from DB):
 * 1. ENGAGEMENT:  likes × 2 + comments × 3
 * 2. RECENCY:     decay over 7 days + bonus for fresh posts
 * 3. AFFINITY:    +10 followed author, +5 previously liked author
 * 4. MEDIA:       +3 image, +4 market
 * 5. DIVERSITY:   max 2 posts per author in top positions
 *
 * Enrichment matches /api/posts exactly: batch likes, comments, user_has_liked.
 * No external API calls — market_data comes from DB column, live prices fetched client-side by MarketCard.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const currentUserId = await getAuthenticatedUser(req);
    const supabase = createServiceClient();

    // ── Step 1: Fetch candidate posts (last 7 days, up to 200) ──
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    let { data: posts, error } = await supabase
      .from("posts")
      .select(`*, profiles (id, email, username, avatar_url, display_name)`)
      .gte("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    // Fallback: if no posts in 7 days, get latest 50
    // Fallback: if fewer than 10 posts in 7 days, backfill with older posts
    if (!posts || posts.length < 10) {
      const existingIds = (posts || []).map((p: any) => p.id);
      const { data: fallbackPosts, error: fbErr } = await supabase
        .from("posts")
        .select(`*, profiles (id, email, username, avatar_url, display_name)`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fbErr) throw fbErr;
      // Merge without duplicates
      const backfill = (fallbackPosts || []).filter((p: any) => !existingIds.includes(p.id));
      posts = [...(posts || []), ...backfill];
    }

    if (posts.length === 0) {
      return NextResponse.json({
        posts: [],
        pagination: { page, limit, hasMore: false },
      });
    }

    // ── Step 2: Batch fetch engagement counts for ALL candidates ──
    const allPostIds = posts.map((p) => p.id);

    const likeCounts: Record<string, number> = {};
    const commentCounts: Record<string, number> = {};

    const { data: likesData } = await supabase
      .from("likes").select("post_id").in("post_id", allPostIds);
    for (const like of likesData || []) {
      likeCounts[like.post_id] = (likeCounts[like.post_id] || 0) + 1;
    }

    const { data: commentsData } = await supabase
      .from("comments").select("post_id").in("post_id", allPostIds);
    for (const comment of commentsData || []) {
      commentCounts[comment.post_id] = (commentCounts[comment.post_id] || 0) + 1;
    }

    // ── Step 3: Get user-specific signals (if authenticated) ──
    let followedUserIds = new Set<string>();
    let likedAuthorIds = new Set<string>();
    let userLikedPostIds = new Set<string>();
    let userRepostedPostIds = new Set<string>();
    let userBookmarkedPostIds = new Set<string>();

    if (currentUserId) {
      // Who this user follows
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);
      if (follows) {
        followedUserIds = new Set(follows.map((f: any) => f.following_id));
      }

      // Which of these posts the user has liked
      const { data: userLikes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", allPostIds);
      if (userLikes) {
        userLikedPostIds = new Set(userLikes.map((l: any) => l.post_id));
      }

      // Which of these posts the user has reposted
      const { data: userReposts } = await supabase
        .from("reposts")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", allPostIds);
      if (userReposts) {
        userRepostedPostIds = new Set(userReposts.map((r: any) => r.post_id));
      }

      // Which of these posts the user has bookmarked
      const { data: userBookmarks } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", allPostIds);
      if (userBookmarks) {
        userBookmarkedPostIds = new Set(userBookmarks.map((b: any) => b.post_id));
      }

      // Find authors user has engaged with (liked their posts)
      const { data: recentLikes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (recentLikes) {
        const likedIds = new Set(recentLikes.map((l: any) => l.post_id));
        for (const post of posts) {
          if (likedIds.has(post.id)) {
            likedAuthorIds.add(post.user_id);
          }
        }
      }
    }

    // ── Step 4: Score each post ──
    const now = Date.now();
    const ONE_HOUR = 3600000;

    const scored = posts.map((post: any) => {
      let score = 0;
      const lc = likeCounts[post.id] || 0;
      const cc = commentCounts[post.id] || 0;

      // Engagement
      score += lc * 2 + cc * 3;

      // Recency decay (linear over 7 days)
      const ageHours = (now - new Date(post.created_at).getTime()) / ONE_HOUR;
      const recencyMultiplier = Math.max(0.1, 1 - ageHours / 168);
      score *= recencyMultiplier;

      // Recency bonus for very fresh posts
      if (ageHours < 1) score += 15;
      else if (ageHours < 4) score += 8;
      else if (ageHours < 12) score += 3;

      // Affinity (authenticated only)
      if (currentUserId) {
        if (followedUserIds.has(post.user_id)) score += 10;
        if (likedAuthorIds.has(post.user_id)) score += 5;
        if (post.user_id === currentUserId) score -= 3; // own posts lower
        if (userLikedPostIds.has(post.id)) score -= 2;  // already engaged
      }

      // Media bonus
      if (post.image_url) score += 3;
      if (post.polymarket_market_id) score += 4;

      // Content length sweet spot
      const len = (post.content || "").length;
      if (len > 50 && len < 500) score += 2;

      return { ...post, _score: score, _lc: lc, _cc: cc };
    });

    // ── Step 5: Sort + diversity filter ──
    scored.sort((a: any, b: any) => b._score - a._score);

    const authorCount: Record<string, number> = {};
    const diversified: any[] = [];
    const deferred: any[] = [];

    for (const post of scored) {
      const count = authorCount[post.user_id] || 0;
      if (count < 2) {
        diversified.push(post);
        authorCount[post.user_id] = count + 1;
      } else {
        deferred.push(post);
      }
    }

    const finalFeed = [...diversified, ...deferred];

    // ── Step 6: Paginate ──
    const offset = (page - 1) * limit;
    const pageSlice = finalFeed.slice(offset, offset + limit);

    // ── Step 7: Clean up internal fields, enrich like /api/posts ──
    const enrichedPosts = pageSlice.map(({ _score, _lc, _cc, ...post }: any) => ({
      ...post,
      likes_count: _lc,
      comments_count: _cc,
      user_has_liked: currentUserId ? userLikedPostIds.has(post.id) : false,
      user_has_reposted: currentUserId ? userRepostedPostIds.has(post.id) : false,
      user_has_bookmarked: currentUserId ? userBookmarkedPostIds.has(post.id) : false,
    }));

    return NextResponse.json({
      posts: enrichedPosts,
      pagination: {
        page,
        limit,
        hasMore: offset + limit < finalFeed.length,
      },
    });
  } catch (err) {
    console.error("Recommendation error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}