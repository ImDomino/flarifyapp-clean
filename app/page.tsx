"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PostCard } from "@/components/PostCard";
import { Plus, Image as ImageIcon, BarChart2, Calendar } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { PostWithUser } from "@/lib/types";

type FeedTab = "foryou" | "following";

/* ── Shimmer skeleton for loading states ── */
function PostSkeleton() {
  return (
    <div className="bg-[#0a0a0a] border border-zinc-800/50 p-5 sm:p-6 animate-fade-in">
      <div className="flex gap-4">
        <div className="w-11 h-11 flex-shrink-0 shimmer-bg" />
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-3.5 w-24 shimmer-bg" />
            <div className="h-3 w-16 shimmer-bg" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full shimmer-bg" />
            <div className="h-3 w-4/5 shimmer-bg" />
            <div className="h-3 w-2/3 shimmer-bg" />
          </div>
          <div className="flex gap-6 pt-2">
            <div className="h-4 w-10 shimmer-bg" />
            <div className="h-4 w-10 shimmer-bg" />
            <div className="h-4 w-10 shimmer-bg" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/profile?user_id=${encodeURIComponent(user.id)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.profile) setProfileData(data.profile);
    } catch (err) { console.error("Error loading profile:", err); }
  }, [user?.id]);

  const loadPosts = useCallback(
    async (pageNum: number, append = false, tab?: FeedTab) => {
      const activeTab = tab ?? feedTab;
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        if (pageNum === 1) setIsLoading(true);
        else setIsLoadingMore(true);

        let response: Response;
        if (activeTab === "following" && user?.id) {
          response = await authFetch(`/api/posts/following?page=${pageNum}&limit=20`);
        } else if (activeTab === "foryou") {
          // Recommendation algorithm — auth token provides user identity
          response = await authFetch(`/api/posts/recommended?page=${pageNum}&limit=20`);
        } else {
          // Fallback for logged-out users
          response = await authFetch(`/api/posts/recommended?page=${pageNum}&limit=20`);
        }

        const data = await response.json();
        if (append) setPosts((prev) => [...prev, ...data.posts]);
        else setPosts(data.posts || []);
        setHasMore(data.pagination?.hasMore ?? false);
      } catch (error) { console.error("Error loading posts:", error); }
      finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    },
    [feedTab, user?.id, authFetch]
  );

  useEffect(() => {
    setPage(1);
    loadPosts(1, false, feedTab);
    if (authenticated) loadProfile();
  }, [feedTab, authenticated, loadPosts, loadProfile]);

  // ── Infinite Scroll via IntersectionObserver ──
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingRef.current && !isLoading) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadPosts(nextPage, true);
        }
      },
      { rootMargin: "400px" } // trigger 400px before reaching end
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, page, isLoading, loadPosts]);

  const handlePostDeleted = useCallback(() => {
    loadPosts(1, false, feedTab);
  }, [loadPosts, feedTab]);

  const handleTabSwitch = (tab: FeedTab) => {
    if (tab === "following" && !authenticated) return;
    setFeedTab(tab);
    setPage(1);
  };

  const fallbackUsername = user?.google?.name || user?.email?.address?.split("@")[0] || "User";
  const displayName = profileData?.display_name || profileData?.username || fallbackUsername;
  const avatarUrl = profileData?.avatar_url || null;

  return (
    <PageTransition>
    <div className="space-y-6">
      {/* ═══ ANIMATED HERO ═══ */}
      <div className="mb-8 lg:mb-12 relative overflow-hidden">
        {/* Geometric background elements */}
        <div className="absolute top-0 right-0 w-40 h-40 border-r border-t border-zinc-800/50 opacity-60 animate-fade-in stagger-2" />
        <div className="absolute bottom-0 left-1/2 w-20 h-20 border border-zinc-800/30 opacity-40 animate-fade-in stagger-4" style={{ transform: "rotate(45deg) translate(-50%, 50%)" }} />
        {/* Animated grid in background */}
        <div className="absolute inset-0 grid-bg-animated opacity-20" />

        <div className="relative z-10">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-4">
            <span className="inline-block animate-fade-up stagger-1">Connect</span>
            <br />
            <span className="inline-block text-zinc-600 animate-fade-up stagger-2">Through</span>
            <br />
            <span className="inline-block animate-fade-up stagger-3">Flarify</span>
          </h1>
          <p className="text-zinc-500 uppercase tracking-widest text-xs sm:text-sm font-bold border-l-2 border-white pl-4 py-1 max-w-md animate-fade-up stagger-4">
            The signal in the noise. Share ideas, discover perspectives, trade insights.
          </p>
        </div>
      </div>

      {/* ═══ COMPOSE CARD ═══ */}
      <div className="bg-[#0a0a0a] border border-zinc-800/70 p-5 sm:p-6 card-hover corner-accent animate-fade-up stagger-5 relative overflow-hidden">
        <div className="flex gap-4 sm:gap-5">
          <div
            className="w-11 h-11 flex-shrink-0 border border-white/80 p-0.5 cursor-pointer hover:border-white transition-colors"
            onClick={() => router.push(authenticated ? "/profile" : "#")}
          >
            <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden">
              {authenticated ? (
                avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-black uppercase">{displayName[0]}</span>
                )
              ) : (
                <span className="text-sm font-black text-black uppercase">?</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div onClick={() => router.push("/create")} className="cursor-pointer">
              <div className="text-zinc-700 text-base sm:text-lg font-bold uppercase tracking-wide pb-4 mb-4 border-b border-zinc-800/50 hover:text-zinc-500 transition-colors">
                What is happening?
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-3 sm:gap-4">
                <button onClick={() => router.push("/create")}
                  className="text-zinc-600 hover:text-white transition-all duration-200 p-2 border border-transparent hover:border-zinc-700 action-glow">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button className="text-zinc-600 p-2 border border-transparent opacity-30 cursor-not-allowed">
                  <BarChart2 className="w-5 h-5" />
                </button>
                <button className="text-zinc-600 p-2 border border-transparent opacity-30 cursor-not-allowed">
                  <Calendar className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => router.push("/create")}
                className="px-6 sm:px-8 py-2.5 bg-white text-black font-black uppercase tracking-wider text-sm hover:bg-zinc-100 transition-all duration-200 border-2 border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FEED TABS — with animated indicator ═══ */}
      <div className="flex border-b border-zinc-800/60 sticky top-20 bg-[#050505]/95 backdrop-blur-md z-40 animate-fade-down stagger-3">
        {(["foryou", "following"] as const).map((tab) => {
          const labels: Record<FeedTab, string> = { foryou: "For You", following: "Following" };
          const isActive = feedTab === tab;
          const isDisabled = tab === "following" && !authenticated;
          return (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              disabled={isDisabled}
              className={`
                flex-1 py-4 text-center font-bold uppercase tracking-wider text-sm
                transition-all duration-300 relative
                tab-indicator ${isActive ? "active" : ""}
                ${isActive
                  ? "text-white"
                  : "text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.02]"
                }
                ${isDisabled ? "opacity-20 cursor-not-allowed" : ""}
              `}
            >
              {labels[tab]}

            </button>
          );
        })}
      </div>

      {/* ═══ LOADING STATE — shimmer skeletons ═══ */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!isLoading && posts.length === 0 && (
        <div className="bg-[#0a0a0a] border border-zinc-800/60 p-8 sm:p-12 text-center animate-scale-in corner-accent relative overflow-hidden">
          <div className="absolute inset-0 grid-bg-animated opacity-10" />
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700/50 flex items-center justify-center animate-float">
              <Plus className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-wider mb-2">
              {feedTab === "following" ? "Your Feed is Empty" : "No Posts Yet"}
            </h3>
            <p className="text-sm text-zinc-500 uppercase tracking-wide mb-6">
              {feedTab === "following"
                ? "Follow users to see their posts here"
                : "Be the first to share your market insights"
              }
            </p>
            <button
              onClick={() => feedTab === "following" ? setFeedTab("foryou") : router.push("/create")}
              className="px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]"
            >
              {feedTab === "following" ? "Discover Posts" : "Create First Post"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ POST FEED ═══ */}
      {!isLoading && posts.length > 0 && (
        <>
          <div className="space-y-3 sm:space-y-4">
            {posts.map((post, i) => (
              <PostCard key={post.id} post={post} onDeleted={handlePostDeleted} index={i} />
            ))}
          </div>

          {/* Infinite scroll loading indicator */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-8 gap-3 animate-fade-in">
              <div className="geo-spinner" />
              <span className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Loading</span>
            </div>
          )}

          {/* Invisible sentinel for IntersectionObserver */}
          {hasMore && <div ref={sentinelRef} className="scroll-sentinel" />}

          {/* End of feed */}
          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8 animate-fade-in">
              <div className="flex items-center gap-4 justify-center">
                <div className="h-px w-12 bg-zinc-800" />
                <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-bold">End of Feed</p>
                <div className="h-px w-12 bg-zinc-800" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </PageTransition>
  );
}