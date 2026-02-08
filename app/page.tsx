"use client";

import { useEffect, useState, useCallback } from "react";
import { PostCard } from "@/components/PostCard";
import { Search, Plus, RefreshCw, Flame, Users, BarChart3, Image as ImageIcon, Smile, Calendar, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { PostWithUser } from "@/lib/types";

type FeedTab = "foryou" | "following";

export default function Home() {
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [feedTab, setFeedTab] = useState<FeedTab>("foryou");
  const router = useRouter();
  const { user, authenticated } = usePrivy();

  const loadPosts = useCallback(
    async (pageNum: number, append = false, tab?: FeedTab) => {
      const activeTab = tab ?? feedTab;
      try {
        if (pageNum === 1) setIsLoading(true);
        else setIsLoadingMore(true);

        let url = `/api/posts?page=${pageNum}&limit=20`;

        if (activeTab === "following" && user?.id) {
          url = `/api/posts/following?user_id=${encodeURIComponent(user.id)}&page=${pageNum}&limit=20`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (append) {
          setPosts((prev) => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts || []);
        }

        setHasMore(data.pagination?.hasMore ?? false);
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [feedTab, user?.id]
  );

  useEffect(() => {
    setPage(1);
    loadPosts(1, false, feedTab);
  }, [feedTab]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, true);
  };

  const handleTabSwitch = (tab: FeedTab) => {
    if (tab === "following" && !authenticated) return;
    setFeedTab(tab);
  };

  const username = user?.google?.name || user?.email?.address?.split("@")[0] || "User";

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="sticky top-0 z-30 bg-base-950/80 backdrop-blur-md pb-4 pt-2 -mx-2 px-2">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-500" />
          <input
            type="text"
            placeholder="Search markets, users, or posts..."
            disabled
            className="w-full bg-base-850/70 border border-white/5 rounded-2xl py-3 pl-12 pr-28 text-sm focus:outline-none focus:border-blue-500/50 transition-all cursor-not-allowed text-slate-200 placeholder:text-slate-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">Coming Soon</span>
          </div>
        </div>

        {/* Feed Tabs */}
        <div className="flex items-center gap-2 bg-base-900/70 p-1 rounded-xl border border-white/5 w-fit">
          <button
            onClick={() => handleTabSwitch("foryou")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
              feedTab === "foryou"
                ? "bg-blue-500/10 text-blue-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Flame className="w-4 h-4" />
            For You
          </button>
          <button
            onClick={() => handleTabSwitch("following")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
              feedTab === "following"
                ? "bg-blue-500/10 text-blue-400"
                : "text-slate-400 hover:text-white"
            } ${!authenticated ? "opacity-40 cursor-not-allowed" : ""}`}
            disabled={!authenticated}
          >
            <Users className="w-4 h-4" />
            Following
          </button>
          <button
            className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 transition-all opacity-40 cursor-not-allowed"
            disabled
          >
            <BarChart3 className="w-4 h-4" />
            Live Markets
          </button>
        </div>
      </div>

      {/* Compose Section */}
      <div className="bg-base-900/60 border border-white/5 rounded-2xl p-5">
        <div className="flex gap-4">
          {/* User avatar */}
          <div
            className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 cursor-pointer"
            onClick={() => router.push(authenticated ? "/profile" : "#")}
          >
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
              <span className="font-display font-bold text-white">
                {authenticated ? username[0].toUpperCase() : "?"}
              </span>
            </div>
          </div>

          {/* Input area */}
          <div className="flex-1">
            <div
              onClick={() => router.push("/create")}
              className="cursor-pointer"
            >
              <p className="text-slate-500 pt-3 pb-2 text-sm">What's the latest?</p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/create")}
                  className="text-slate-500 hover:text-blue-400 transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button className="text-slate-500 hover:text-blue-400 transition-colors cursor-not-allowed opacity-50">
                  <Smile className="w-5 h-5" />
                </button>
                <button className="text-slate-500 hover:text-blue-400 transition-colors cursor-not-allowed opacity-50">
                  <Calendar className="w-5 h-5" />
                </button>
                <button className="text-slate-500 hover:text-blue-400 transition-colors cursor-not-allowed opacity-50">
                  <MapPin className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => router.push("/create")}
                className="relative px-6 py-2 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow overflow-hidden"
              >
                <span className="relative z-10">Post</span>
                <span className="absolute inset-0 opacity-30 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.65),transparent)] -translate-x-[120%] animate-sheen"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Posts List */}
      {!isLoading && posts.length === 0 ? (
        <div className="rounded-2xl bg-base-900/60 border border-white/5 shadow-card p-8 text-center">
          <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center">
            {feedTab === "following" ? (
              <Users className="w-10 h-10 text-blue-300" />
            ) : (
              <Plus className="w-10 h-10 text-blue-300" />
            )}
          </div>
          <h3 className="font-display text-xl font-semibold tracking-tight mb-2">
            {feedTab === "following"
              ? "Your feed is empty"
              : "No posts yet"}
          </h3>
          <p className="text-slate-400 mb-6">
            {feedTab === "following"
              ? "Follow users to see their posts here!"
              : "Be the first to create a post and share your market insights!"}
          </p>
          <button
            onClick={() =>
              feedTab === "following"
                ? setFeedTab("foryou")
                : router.push("/create")
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
          >
            {feedTab === "following"
              ? "Discover posts"
              : "Create First Post"}
          </button>
        </div>
      ) : (
        !isLoading && (
          <>
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Load More Posts
                    </>
                  )}
                </button>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500">That's all for now! 🎉</p>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
