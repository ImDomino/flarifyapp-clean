"use client";

import { useEffect, useState, useCallback } from "react";
import { PostCard } from "@/components/PostCard";
import { Search, Plus, RefreshCw, Flame, Users } from "lucide-react";
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

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="relative">
        <div className="rounded-xl bg-base-900/70 border border-white/5 shadow-soft overflow-hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search markets, users, or posts..."
              className="w-full pl-12 pr-4 py-4 bg-transparent border-none focus:outline-none focus:ring-0 text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Feed Tabs */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg bg-base-900/70 border border-white/5 p-1">
          <button
            onClick={() => handleTabSwitch("foryou")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition ${
              feedTab === "foryou"
                ? "text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
                : "text-slate-300 hover:text-slate-100 hover:bg-white/5"
            }`}
          >
            <Flame className="w-4 h-4" />
            For You
          </button>
          <button
            onClick={() => handleTabSwitch("following")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition ${
              feedTab === "following"
                ? "text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
                : "text-slate-300 hover:text-slate-100 hover:bg-white/5"
            } ${!authenticated ? "opacity-40 cursor-not-allowed" : ""}`}
            disabled={!authenticated}
          >
            <Users className="w-4 h-4" />
            Following
          </button>
        </div>
      </div>

      {/* Create Post Prompt */}
      <div
        onClick={() => router.push("/create")}
        className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-5 cursor-pointer hover:bg-base-900/80 hover:border-white/10 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              placeholder="What's the latest?"
              readOnly
              className="w-full bg-transparent border-none focus:outline-none text-slate-400 cursor-pointer"
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push("/create");
            }}
            className="relative inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow overflow-hidden"
          >
            <span className="relative z-10">Post</span>
            <span className="absolute inset-0 opacity-30 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.65),transparent)] -translate-x-[120%] animate-sheen"></span>
          </button>
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
        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-card p-8 text-center">
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
