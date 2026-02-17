import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

/**
 * GET /api/posts/recommended?page=1&limit=20&user_id=xxx
 * 
 * Scoring algorithm:
 * 1. ENGAGEMENT:  likes * 2 + comments * 3        (popular content surfaces)
 * 2. RECENCY:     decay factor based on age        (fresh content wins ties)
 * 3. AFFINITY:    +10 if author is followed        (people you follow rank higher)
 *                 +5 if author was liked before     (authors you engage with)
 * 4. HAS_MEDIA:   +3 if post has image/market      (richer posts surface)
 * 5. DIVERSITY:   penalty for >2 posts by same user (avoid feed domination)
 * 
 * If no user_id provided, falls back to pure engagement + recency (logged-out feed).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const userId = searchParams.get("user_id") || null;

  try {
    // ── Step 1: Fetch candidate posts (last 7 days, up to 200) ──
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles:user_id (
          id, username, display_name, avatar_url, email
        )
      `)
      .gte("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return NextResponse.json({
        posts: [],
        pagination: { page, limit, hasMore: false },
      });
    }

    // ── Step 2: Get user-specific signals (if authenticated) ──
    let followedUserIds = new Set<string>();
    let likedAuthorIds = new Set<string>();
    let likedPostIds = new Set<string>();

    if (userId) {
      // Get who this user follows
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      if (follows) {
        followedUserIds = new Set(follows.map((f: any) => f.following_id));
      }

      // Get posts this user has liked (to find preferred authors + already-seen)
      const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (likes) {
        likedPostIds = new Set(likes.map((l: any) => l.post_id));

        // Find authors of liked posts
        const likedPosts = posts.filter((p: any) => likedPostIds.has(p.id));
        likedAuthorIds = new Set(likedPosts.map((p: any) => p.user_id));
      }
    }

    // ── Step 3: Score each post ──
    const now = Date.now();
    const ONE_HOUR = 3600000;

    const scored = posts.map((post: any) => {
      let score = 0;

      // Engagement score
      const likesCount = post.likes_count || 0;
      const commentsCount = post.comments_count || 0;
      score += likesCount * 2 + commentsCount * 3;

      // Recency decay: posts lose points as they age
      // Full score in first 2 hours, then gradual decay
      const ageHours = (now - new Date(post.created_at).getTime()) / ONE_HOUR;
      const recencyMultiplier = Math.max(0.1, 1 - (ageHours / 168)); // 168h = 7 days
      score *= recencyMultiplier;

      // Recency bonus: very recent posts get a flat boost
      if (ageHours < 1) score += 15;
      else if (ageHours < 4) score += 8;
      else if (ageHours < 12) score += 3;

      // Affinity signals (only for logged-in users)
      if (userId) {
        // Following boost
        if (followedUserIds.has(post.user_id)) {
          score += 10;
        }

        // Previously liked this author
        if (likedAuthorIds.has(post.user_id)) {
          score += 5;
        }

        // Slight penalty for own posts (they already see them in profile)
        if (post.user_id === userId) {
          score -= 3;
        }

        // Already liked → slight depriority (already engaged)
        if (likedPostIds.has(post.id)) {
          score -= 2;
        }
      }

      // Media bonus: posts with images or markets are richer
      if (post.image_url) score += 3;
      if (post.polymarket_market_id) score += 4;

      // Content length bonus: medium-length posts are ideal
      const contentLen = (post.content || "").length;
      if (contentLen > 50 && contentLen < 500) score += 2;

      return { ...post, _score: score };
    });

    // ── Step 4: Diversity filter ──
    // Sort by score first
    scored.sort((a: any, b: any) => b._score - a._score);

    // Apply diversity: max 2 posts from same author in top positions
    const authorCount: Record<string, number> = {};
    const diversified: any[] = [];
    const deferred: any[] = [];

    for (const post of scored) {
      const count = authorCount[post.user_id] || 0;
      if (count < 2) {
        diversified.push(post);
        authorCount[post.user_id] = count + 1;
      } else {
        // Demote — will be added at the end
        deferred.push(post);
      }
    }

    const finalFeed = [...diversified, ...deferred];

    // ── Step 5: Paginate ──
    const offset = (page - 1) * limit;
    const paginatedPosts = finalFeed.slice(offset, offset + limit);

    // Enrich with user_has_liked if authenticated
    if (userId && paginatedPosts.length > 0) {
      const postIds = paginatedPosts.map((p: any) => p.id);
      const { data: userLikes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);

      const likedSet = new Set((userLikes || []).map((l: any) => l.post_id));
      for (const post of paginatedPosts) {
        post.user_has_liked = likedSet.has(post.id);
      }
    }

    // Also try to fetch market_data if posts have polymarket_market_id
    // (This mirrors what your existing /api/posts does)
    for (const post of paginatedPosts) {
      if (post.polymarket_market_id && !post.market_data) {
        try {
          const marketRes = await fetch(
            `https://gamma-api.polymarket.com/markets/${post.polymarket_market_id}`,
            { next: { revalidate: 300 } }
          );
          if (marketRes.ok) {
            post.market_data = await marketRes.json();
          }
        } catch {}
      }
    }

    // Remove internal score from response
    const cleanPosts = paginatedPosts.map(({ _score, ...rest }: any) => rest);

    return NextResponse.json({
      posts: cleanPosts,
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