"use client";

import { useEffect, useState, useCallback } from "react";
import { PostCard } from "@/components/PostCard";
import { Plus, RefreshCw, Image as ImageIcon, BarChart2, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { PostWithUser } from "@/lib/types";

type FeedTab = "foryou" | "following" | "trading";

export default function Home() {
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [feedTab, setFeedTab] = useState<FeedTab>("foryou");
  const [profileData, setProfileData] = useState<any>(null);

  const router = useRouter();
  const { user, authenticated } = usePrivy();
  const authFetch = useAuthFetch();

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(
        `/api/profile?user_id=${encodeURIComponent(user.id)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.profile) setProfileData(data.profile);
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }, [user?.id]);

  const loadPosts = useCallback(
    async (pageNum: number, append = false, tab?: FeedTab) => {
      const activeTab = tab ?? feedTab;
      try {
        if (pageNum === 1) setIsLoading(true);
        else setIsLoadingMore(true);

        let response: Response;

        if (activeTab === "following" && user?.id) {
          // Following feed requires auth — use authFetch
          response = await authFetch(
            `/api/posts/following?page=${pageNum}&limit=20`
          );
        } else {
          // Public feed — no auth needed
          response = await fetch(`/api/posts?page=${pageNum}&limit=20`);
        }

        const data = await response.json();

        if (append) setPosts((prev) => [...prev, ...data.posts]);
        else setPosts(data.posts || []);

        setHasMore(data.pagination?.hasMore ?? false);
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [feedTab, user?.id, authFetch]
  );

  useEffect(() => {
    setPage(1);
    loadPosts(1, false, feedTab);
    if (authenticated) {
      loadProfile();
    }
  }, [feedTab, authenticated, loadPosts, loadProfile]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, true);
  };

  const handleTabSwitch = (tab: FeedTab) => {
    if (tab === "following" && !authenticated) return;
    if (tab === "trading") return; // disabled
    setFeedTab(tab);
  };

  const fallbackUsername =
    user?.google?.name || user?.email?.address?.split("@")[0] || "User";

  const displayName =
    profileData?.display_name ||
    profileData?.username ||
    fallbackUsername;

  const avatarUrl = profileData?.avatar_url || null;

  return (
    <div className="space-y-6">
      {/* Hero / Welcome */}
      <div className="mb-8 lg:mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-zinc-800 opacity-50" />
        <div className="relative z-10">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-4">
            Connect
            <br />
            <span className="text-zinc-600">Through</span>
            <br />
            Flarify
          </h1>
          <p className="text-zinc-500 uppercase tracking-widest text-xs sm:text-sm font-bold border-l-2 border-white pl-4 py-1 max-w-md">
            The signal in the noise. Share ideas, discover perspectives, trade insights.
          </p>
        </div>
      </div>

      {/* Post Composer */}
      <div className="bg-[#0a0a0a] border border-zinc-800 p-5 sm:p-6 interact-border">
        <div className="flex gap-4 sm:gap-5">
          <div
            className="w-12 h-12 flex-shrink-0 border border-white p-0.5 cursor-pointer"
            onClick={() => router.push(authenticated ? "/profile" : "#")}
          >
            <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden">
              {authenticated ? (
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-black text-black uppercase">
                    {displayName[0]}
                  </span>
                )
              ) : (
                <span className="text-sm font-black text-black uppercase">?</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div onClick={() => router.push("/create")} className="cursor-pointer">
              <div className="text-zinc-700 text-base sm:text-lg font-bold uppercase tracking-wide pb-4 mb-4 border-b border-zinc-800">
                What is happening?
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-3 sm:gap-4">
                <button
                  onClick={() => router.push("/create")}
                  className="text-zinc-500 hover:text-white transition-colors p-2 border border-transparent hover:border-zinc-800"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button className="text-zinc-500 hover:text-white transition-colors p-2 border border-transparent hover:border-zinc-800 opacity-40 cursor-not-allowed">
                  <BarChart2 className="w-5 h-5" />
                </button>
                <button className="text-zinc-500 hover:text-white transition-colors p-2 border border-transparent hover:border-zinc-800 opacity-40 cursor-not-allowed">
                  <Calendar className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => router.push("/create")}
                className="px-6 sm:px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm hover:bg-zinc-200 transition-colors border-2 border-white"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Tabs */}
      <div className="flex border-b border-zinc-800 sticky top-20 bg-[#050505]/95 backdrop-blur z-40">
        {(["foryou", "following", "trading"] as const).map((tab) => {
          const labels: Record<FeedTab, string> = {
            foryou: "For You",
            following: "Following",
            trading: "Trading",
          };
          const isActive = feedTab === tab;
          const isDisabled = (tab === "following" && !authenticated);
          return (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              disabled={isDisabled}
              className={`flex-1 py-4 text-center font-bold uppercase tracking-wider text-sm transition-colors ${
                isActive
                  ? "border-b-2 border-white text-white"
                  : "text-zinc-500 hover:text-white hover:bg-[#111]"
              } ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-white animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <div className="bg-[#0a0a0a] border border-zinc-800 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700 flex items-center justify-center">
            <Plus className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-xl font-black uppercase tracking-wider mb-2">
            {feedTab === "following" ? "Your Feed is Empty" : "No Posts Yet"}
          </h3>
          <p className="text-sm text-zinc-500 uppercase tracking-wide mb-6">
            {feedTab === "following"
              ? "Follow users to see their posts here"
              : "Be the first to share your market insights"}
          </p>
          <button
            onClick={() => feedTab === "following" ? setFeedTab("foryou") : router.push("/create")}
            className="px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-colors"
          >
            {feedTab === "following" ? "Discover Posts" : "Create First Post"}
          </button>
        </div>
      )}

      {/* Posts List */}
      {!isLoading && posts.length > 0 && (
        <>
          <div className="space-y-4 sm:space-y-6">
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
                className="inline-flex items-center gap-3 px-8 py-3 text-sm font-black uppercase tracking-wider text-zinc-400 border border-zinc-800 hover:border-white hover:text-white hover:bg-[#111] transition-all disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-700 border-t-white animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Load More
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-6">
              <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">
                — End of Feed —
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
