import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/search?q=term&type=all|posts|users|markets&limit=20&offset=0
 *
 * Searches across posts (content), profiles (username, display_name),
 * and markets (market_data->question) using ILIKE.
 *
 * No auth required — search is public.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "all";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const pattern = `%${query}%`;
  const results: any = {};

  try {
    // ── Search posts ──
    if (type === "all" || type === "posts") {
      const { data: posts, error: postsErr } = await supabase
        .from("posts")
        .select(`
          id, content, image_url, polymarket_market_id, market_data, created_at,
          profiles:user_id ( id, username, display_name, avatar_url )
        `)
        .ilike("content", pattern)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (postsErr) throw postsErr;

      // Get likes and comments counts for matched posts
      if (posts && posts.length > 0) {
        const postIds = posts.map((p: any) => p.id);

        const { data: likesData } = await supabase
          .from("likes")
          .select("post_id")
          .in("post_id", postIds);

        const { data: commentsData } = await supabase
          .from("comments")
          .select("post_id")
          .in("post_id", postIds);

        const likesMap = new Map<string, number>();
        const commentsMap = new Map<string, number>();

        likesData?.forEach((l: any) => likesMap.set(l.post_id, (likesMap.get(l.post_id) || 0) + 1));
        commentsData?.forEach((c: any) => commentsMap.set(c.post_id, (commentsMap.get(c.post_id) || 0) + 1));

        results.posts = posts.map((p: any) => ({
          ...p,
          likes_count: likesMap.get(p.id) || 0,
          comments_count: commentsMap.get(p.id) || 0,
        }));
      } else {
        results.posts = [];
      }
    }

    // ── Search users ──
    if (type === "all" || type === "users") {
      const { data: users, error: usersErr } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
        .range(offset, offset + limit - 1);

      if (usersErr) throw usersErr;
      results.users = users || [];
    }

    // ── Search markets (posts that have market_data matching the query) ──
    if (type === "all" || type === "markets") {
      // Search by market question inside jsonb
      const { data: marketPosts, error: marketsErr } = await supabase
        .from("posts")
        .select(`
          polymarket_market_id, market_data
        `)
        .not("polymarket_market_id", "is", null)
        .ilike("market_data->>question", pattern)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (marketsErr) throw marketsErr;

      // Deduplicate by market_id
      const seen = new Set<string>();
      const uniqueMarkets: any[] = [];
      (marketPosts || []).forEach((p: any) => {
        const mid = p.polymarket_market_id;
        if (mid && !seen.has(mid)) {
          seen.add(mid);
          uniqueMarkets.push({
            market_id: mid,
            question: p.market_data?.question || "",
            url: p.market_data?.url || "",
            outcomes: p.market_data?.outcomes || [],
          });
        }
      });

      // Count how many posts reference each market
      if (uniqueMarkets.length > 0) {
        const marketIds = uniqueMarkets.map((m) => m.market_id);
        const { data: countData } = await supabase
          .from("posts")
          .select("polymarket_market_id")
          .in("polymarket_market_id", marketIds);

        const countMap = new Map<string, number>();
        countData?.forEach((p: any) => countMap.set(p.polymarket_market_id, (countMap.get(p.polymarket_market_id) || 0) + 1));

        uniqueMarkets.forEach((m) => {
          m.post_count = countMap.get(m.market_id) || 0;
        });
      }

      results.markets = uniqueMarkets;
    }

    return NextResponse.json(results);
  } catch (err: any) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}