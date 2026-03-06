"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BarChart3, ExternalLink, MessageCircle, FileText } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { MarketCard } from "@/components/MarketCard";
import type { PostWithUser } from "@/lib/types";
import { PageTransition } from "@/components/PageTransition";

interface MarketInfo {
  market_id: string;
  question: string;
  url: string;
  outcomes: string[];
  prices: number[] | null;
  volume: string;
  yesTokenId?: string;
  noTokenId?: string;
  negRisk?: boolean;
}

export function MarketPageClient() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTokenId = searchParams.get("token_id");
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch market info via our proxy API (Gamma API blocks CORS)
  // Try token_id first (reliable), fallback to condition_id
  const loadMarketFromApi = useCallback(async (tokenId?: string) => {
    try {
      const params = tokenId
        ? `token_id=${tokenId}`
        : `condition_id=${id}`;
      const res = await fetch(`/api/polymarket/market?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.market) return;
      const m = data.market;
      setMarketInfo({
        market_id: id as string,
        question: m.question || "",
        url: m.url || "",
        outcomes: m.outcomes || ["Yes", "No"],
        prices: m.prices || null,
        volume: m.volume || "0",
        yesTokenId: m.yesTokenId,
        noTokenId: m.noTokenId,
        negRisk: m.negRisk,
      });
    } catch {}
  }, [id]);

  const loadMarketPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/posts?market_id=${id}&limit=50`);
      const data = await res.json();
      const fetched = data.posts || [];
      setPosts(fetched);

      // If we have a token_id from URL, always use API for reliable data
      if (urlTokenId) {
        await loadMarketFromApi(urlTokenId);
      } else {
        // Extract market info from the first post that has market_data
        const firstWithMarket = fetched.find((p: any) => p.market_data);
        if (firstWithMarket?.market_data) {
          const md = firstWithMarket.market_data;
          setMarketInfo({
            market_id: id as string,
            question: md.question || "",
            url: md.url || "",
            outcomes: md.outcomes || [],
            prices: md.prices || null,
            volume: md.volume || "0",
            yesTokenId: md.yesTokenId || firstWithMarket.yes_token_id,
            noTokenId: md.noTokenId || firstWithMarket.no_token_id,
            negRisk: md.negRisk,
          });
        } else {
          // No posts with market data — fetch from API
          const postWithToken = fetched.find((p: any) => p.yes_token_id);
          await loadMarketFromApi(postWithToken?.yes_token_id);
        }
      }
    } catch (err) {
      console.error("Error loading market posts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id, urlTokenId, loadMarketFromApi]);

  useEffect(() => {
    loadMarketPosts();
  }, [loadMarketPosts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-bold uppercase tracking-wider text-sm">Back</span>
      </button>

      {/* Market header */}
      {marketInfo ? (
        <MarketCard
          marketData={{
            question: marketInfo.question,
            outcomes: marketInfo.outcomes,
            prices: marketInfo.prices,
            volume: marketInfo.volume,
            url: marketInfo.url,
            yesTokenId: marketInfo.yesTokenId,
            noTokenId: marketInfo.noTokenId,
            negRisk: marketInfo.negRisk,
          }}
          marketId={id as string}
        />
      ) : (
        <div className="bg-[#0a0a0a] border border-zinc-800 p-8 text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
          <p className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-1">
            Market
          </p>
          <p className="text-xs text-zinc-600">
            No market data available
          </p>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2 text-zinc-500">
          <FileText className="w-3.5 h-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {posts.length} {posts.length === 1 ? "Post" : "Posts"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {posts.reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0)} Comments
          </span>
        </div>
        {marketInfo?.url && (
          <a
            href={marketInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-600 hover:text-white transition-colors ml-auto"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="text-xs font-bold uppercase tracking-wider">Polymarket</span>
          </a>
        )}
      </div>

      {/* Posts about this market */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 pb-3 border-b border-zinc-800">
          Discussion
        </h3>
        {posts.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-zinc-800 p-12 text-center">
            <BarChart3 className="w-6 h-6 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm font-black uppercase tracking-wider text-zinc-500 mb-1">
              No posts yet
            </p>
            <p className="text-xs text-zinc-700">
              Be the first to share your analysis on this market
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
}