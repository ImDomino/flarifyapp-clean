"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, AlertCircle, Fingerprint, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";
import { FollowListModal } from "@/components/FollowListModal";
import type { PostWithUser } from "@/lib/types";
import { useAuthFetch } from "@/hooks/useAuthFetch";

export function UserProfileClient() {
  const { id } = useParams();
  const router = useRouter();
  const { user, ready } = usePrivy();
  const authFetch = useAuthFetch();
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);

  const userId = decodeURIComponent(id as string);
  const isOwnProfile = ready && user?.id === userId;

  const loadProfile = useCallback(async () => {
    try {
      setProfileError(null);
      const res = await fetch(`/api/profile?user_id=${encodeURIComponent(userId)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.profile) setProfileData(data.profile);
      else setProfileError("Profile not found");
    } catch (err) {
      console.error("Error loading profile:", err);
      setProfileError("Failed to load profile");
    }
  }, [userId]);

  const loadFollowCounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/follows?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setFollowersCount(data.followers || 0);
      setFollowingCount(data.following || 0);
    } catch (err) { console.error("Error:", err); }
  }, [userId]);

  const loadPosts = useCallback(async () => {
    try {
      const [postsRes, repostsRes] = await Promise.all([
        authFetch(`/api/posts?user_id=${encodeURIComponent(userId)}&page=1&limit=50`),
        authFetch(`/api/reposts/list?user_id=${encodeURIComponent(userId)}`),
      ]);
      const postsData = await postsRes.json();
      const repostsData = await repostsRes.json();

      const ownPosts = (postsData.posts || []).map((p: any) => ({ ...p, _sortTime: p.created_at }));
      const repostedPosts = (repostsData.posts || []).map((p: any) => ({ ...p, _sortTime: p.repost_created_at || p.created_at }));

      const merged = [...ownPosts, ...repostedPosts].sort(
        (a: any, b: any) => new Date(b._sortTime).getTime() - new Date(a._sortTime).getTime()
      );

      setPosts(merged);
    } catch (err) { console.error("Error:", err); }
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    if (isOwnProfile) { router.replace("/profile"); return; }
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([loadProfile(), loadFollowCounts(), loadPosts()]);
      setIsLoading(false);
    };
    loadAll();
  }, [ready, userId, isOwnProfile, router, loadProfile, loadFollowCounts, loadPosts]);

  if (!ready || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="geo-spinner" />
      </div>
    );
  }

  if (profileError || !profileData) {
    return (
      <div className="space-y-6 animate-fade-up">
        <button onClick={() => router.back()}
          className="flex items-center gap-3 text-zinc-400 hover:text-white transition-all duration-200 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase tracking-wider text-sm">Back</span>
        </button>
        <div className="bg-[#0a0a0a] border border-zinc-800/60 p-12 text-center corner-accent relative overflow-hidden">
          <div className="absolute inset-0 grid-bg-animated opacity-10" />
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700/50 flex items-center justify-center animate-float">
              <AlertCircle className="w-8 h-8 text-zinc-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-wider mb-2">User Not Found</h2>
            <p className="text-sm text-zinc-500 uppercase tracking-wide mb-6">
              {profileError || "This profile doesn't exist"}
            </p>
            <button onClick={() => router.push("/")}
              className="px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300">
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profileData?.display_name || profileData?.username || "User";
  const username = profileData?.username || "user";
  const avatarUrl = profileData?.avatar_url || null;
  const bioText = profileData?.bio || "";
  const twitterHandle = profileData?.twitter_handle || null;
  const walletAddress = profileData?.wallet_address || "";
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "";
  const memberSince = profileData?.created_at
    ? new Date(profileData.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";

  return (
    <div className="space-y-3">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-3 text-zinc-400 hover:text-white transition-all duration-200 group animate-fade-in">
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold uppercase tracking-wider text-sm">Back</span>
      </button>

      {/* ═══ PROFILE HEADER ═══ */}
      <section className="bg-[#0a0a0a] border border-zinc-800/70 relative overflow-hidden animate-fade-up corner-accent">
        <div className="h-20 sm:h-24 bg-[#0a0a0a] relative border-b border-zinc-800/50">
          <div className="absolute inset-0 grid-bg-animated opacity-30" />
          <div className="absolute inset-0 gradient-bottom opacity-60" />
        </div>

        <div className="px-5 sm:px-6 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-4 relative z-10">
            <div className="w-20 h-20 border-[3px] border-[#0a0a0a] bg-white flex items-center justify-center overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-black uppercase">{displayName[0]}</span>
              )}
            </div>
            {user && !isOwnProfile && (
              <div className="animate-fade-in stagger-3">
                <FollowButton targetUserId={userId} currentUserId={user.id} onFollowChange={loadFollowCounts} />
              </div>
            )}
          </div>

          <div className="mb-3 animate-fade-up stagger-2">
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-none">{displayName}</h1>
            <span className="text-xs text-zinc-500 font-bold uppercase mt-0.5 inline-block">@{username}</span>
          </div>

          {bioText && (
            <p className="text-sm text-zinc-400 font-medium leading-relaxed mb-3 max-w-lg animate-fade-up stagger-3">{bioText}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-600 uppercase tracking-widest font-bold animate-fade-up stagger-4">
            {twitterHandle && (
              <a
                href={`https://x.com/${twitterHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-800/60 bg-white/[0.02] hover:border-zinc-600 hover:bg-white/[0.04] transition-all duration-200"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="text-zinc-400">@{twitterHandle}</span>
              </a>
            )}
            {shortWallet && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-800/60 bg-white/[0.02]">
                <Fingerprint className="w-3 h-3" />
                <span className="font-mono text-zinc-500">{shortWallet}</span>
              </span>
            )}
            {memberSince && (
              <>
                <span className="text-zinc-700">·</span>
                <span>Joined {memberSince}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid grid-cols-3 gap-px bg-zinc-800/60 border border-zinc-800/60 animate-fade-up stagger-3">
        {[
          { value: posts.length, label: "Posts", onClick: undefined },
          { value: followersCount, label: "Followers", onClick: () => setFollowListType("followers") },
          { value: followingCount, label: "Following", onClick: () => setFollowListType("following") },
        ].map((stat) => (
          <div key={stat.label} onClick={stat.onClick}
            className={`bg-[#0a0a0a] py-4 px-2 text-center group hover:bg-white/[0.02] transition-all duration-300 ${stat.onClick ? "cursor-pointer" : "cursor-default"}`}>
            <div className="text-xl sm:text-2xl font-black text-white leading-none mb-1 group-hover:scale-105 transition-transform duration-200">{stat.value}</div>
            <div className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] font-bold">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* ═══ PNL ═══ */}
      {profileData?.show_pnl_public !== false && profileData?.wallet_address && (
        <div className="animate-fade-up stagger-4">
          <PublicPnlCard walletAddress={profileData.wallet_address} />
        </div>
      )}

      {/* ═══ POSTS ═══ */}
      <section className="animate-fade-up stagger-5">
        <div className="flex items-center gap-3 mb-3 pb-2 border-b border-zinc-800/50">
          <div className="w-1 h-4 bg-white/20" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Posts ({posts.length})</span>
        </div>
        {posts.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-zinc-800/60 p-10 text-center corner-accent relative overflow-hidden">
            <div className="absolute inset-0 grid-bg-animated opacity-10" />
            <p className="relative z-10 text-sm text-zinc-500 uppercase tracking-wider font-bold">No Posts Yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, i) => <PostCard key={`${post.reposted_by ? 'rp-' : ''}${post.id}`} post={post} index={i} />)}
          </div>
        )}
      </section>

      {/* Follow List Modal */}
      <FollowListModal
        isOpen={followListType !== null}
        onClose={() => setFollowListType(null)}
        userId={userId}
        type={followListType || "followers"}
        count={followListType === "following" ? followingCount : followersCount}
      />
    </div>
  );
}

/**
 * Public PnL card — read-only
 */
function PublicPnlCard({ walletAddress }: { walletAddress: string }) {
  const [pnlData, setPnlData] = useState<{
    totalPnl: number;
    percentPnl: number;
    totalValue: number;
    positionCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPositions = async () => {
      try {
        const account = walletAddress.toLowerCase();
        const res = await fetch(`https://data-api.polymarket.com/positions?user=${account}`);
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const raw = Array.isArray(data) ? data : data.data || data.positions || [];

        let totalValue = 0;
        let totalCost = 0;
        let totalPnl = 0;

        for (const p of raw) {
          const size = Number(p.size ?? p.currentSize ?? 0);
          const avgPrice = Number(p.avgPrice ?? p.avg_price ?? 0) / 100;
          const currentValue = Number(p.currentValue ?? 0);
          const cashPnl = Number(p.cashPnl ?? 0);

          totalCost += size * avgPrice;
          totalValue += currentValue || (size * avgPrice);
          totalPnl += cashPnl;
        }

        const percentPnl = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

        if (!cancelled) {
          setPnlData({ totalPnl, percentPnl, totalValue, positionCount: raw.length });
        }
      } catch (err) {
        console.error("Failed to fetch public PnL:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchPositions();
    return () => { cancelled = true; };
  }, [walletAddress]);

  if (isLoading) {
    return (
      <div className="bg-[#0a0a0a] border border-zinc-800/60 p-5 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
        <span className="ml-2 text-xs text-zinc-600 uppercase tracking-wider font-bold">Loading PnL...</span>
      </div>
    );
  }

  if (!pnlData || pnlData.positionCount === 0) return null;

  const isUp = pnlData.totalPnl >= 0;

  return (
    <div className="bg-[#0a0a0a] border border-zinc-800/60 relative overflow-hidden card-hover corner-accent">
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${isUp ? "bg-emerald-500/50" : "bg-red-500/40"}`} />
      <div className="p-5">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 block">
          Trading Performance
        </span>
        <div className="flex items-baseline gap-3 mb-3">
          <span className={`text-2xl sm:text-3xl font-black tracking-tight transition-colors ${isUp ? "text-emerald-400" : "text-red-400"}`}>
            {isUp ? "+" : ""}${pnlData.totalPnl.toFixed(2)}
          </span>
          <span className={`text-sm font-mono font-bold ${isUp ? "text-emerald-500/60" : "text-red-500/50"}`}>
            {isUp ? "+" : ""}{pnlData.percentPnl.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
          <span className="flex items-center gap-1">
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            All-time
          </span>
          <span>{pnlData.positionCount} positions</span>
          <span>${pnlData.totalValue.toFixed(2)} portfolio</span>
        </div>
      </div>
    </div>
  );
}