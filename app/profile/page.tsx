"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { PageTransition } from "@/components/PageTransition";
import {
  Shield, Fingerprint, Copy, Pencil, TrendingUp, TrendingDown,
  Eye, EyeOff, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { PositionsTab } from "@/components/PositionsTab";
import { EditProfileModal } from "@/components/EditProfileModal";
import { FollowListModal } from "@/components/FollowListModal";
import { PnlSummaryCard } from "@/components/PnlSummaryCard";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useSettings } from "@/hooks/useSettings";
import type { PostWithUser } from "@/lib/types";
import { useWallet } from "@/providers/WalletProvider";

type ProfileSection = "posts" | "positions";

export default function ProfilePage() {
  const { authenticated, user, login } = usePrivy();
  const router = useRouter();
  const { eoaAddress, safeAddress } = useWallet();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ProfileSection>("posts");
  const [copied, setCopied] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [followListType, setFollowListType] = useState<"followers" | "following" | null>(null);
  const authFetch = useAuthFetch();
  const { settings, updatePrivacy } = useSettings();

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/profile?user_id=${encodeURIComponent(user.id)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.profile) {
        setProfileData(data.profile);
      }
    } catch (err) { console.error("Error loading profile:", err); }
  }, [user?.id]);

  const loadFollowCounts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/follows?user_id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      setFollowersCount(data.followers || 0);
      setFollowingCount(data.following || 0);
    } catch (err) { console.error("Error loading follow counts:", err); }
  }, [user?.id]);

  const loadUserPosts = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const [postsRes, repostsRes] = await Promise.all([
        fetch(`/api/posts?user_id=${encodeURIComponent(user.id)}&page=1&limit=50`),
        fetch(`/api/reposts/list?user_id=${encodeURIComponent(user.id)}`),
      ]);
      const postsData = await postsRes.json();
      const repostsData = await repostsRes.json();

      const ownPosts = (postsData.posts || []).map((p: any) => ({ ...p, _sortTime: p.created_at }));
      const repostedPosts = (repostsData.posts || []).map((p: any) => ({ ...p, _sortTime: p.repost_created_at || p.created_at }));

      // Merge and sort by time descending
      const merged = [...ownPosts, ...repostedPosts].sort(
        (a: any, b: any) => new Date(b._sortTime).getTime() - new Date(a._sortTime).getTime()
      );

      setPosts(merged);
    } catch (error) { console.error("Error loading posts:", error); }
    finally { setIsLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!authenticated || !user) return;
    loadProfile();
    loadFollowCounts();
    loadUserPosts();
  }, [authenticated, user, loadProfile, loadFollowCounts, loadUserPosts]);

  const handleCopyAddress = () => {
    const value = safeAddress || user?.wallet?.address || "—";
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePostDeleted = () => {
    loadUserPosts();
  };

  const togglePnlVisibility = () => {
    updatePrivacy({ show_pnl_public: !settings.privacy.show_pnl_public });
  };

  // ── Not authenticated ──
  if (!authenticated) {
    return (
      <div className="text-center py-12 animate-scale-in">
        <div className="bg-[#0a0a0a] border-2 border-zinc-800 p-12 relative overflow-hidden corner-accent">
          <div className="absolute inset-0 grid-bg-animated opacity-10" />
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 border-2 border-zinc-700/50 flex items-center justify-center animate-float">
              <Shield className="w-8 h-8 text-zinc-500" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-wider mb-4">Sign In Required</h1>
            <p className="text-sm text-zinc-500 uppercase tracking-wide mb-6">You need to be signed in to view your profile</p>
            <button onClick={login}
              className="px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]">
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Profile data ──
  const displayName = profileData?.display_name || profileData?.username ||
    user?.google?.name || user?.email?.address?.split("@")[0] || "User";
  const username = profileData?.username ||
    user?.google?.name?.toLowerCase().replace(/\s+/g, "") ||
    user?.email?.address?.split("@")[0] || "user";
  const avatarUrl = profileData?.avatar_url || null;
  const bioText = profileData?.bio || "";
  const walletAddress = safeAddress || profileData?.wallet_address || user?.wallet?.address || "";
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "—";
  const memberSince = profileData?.created_at
    ? new Date(profileData.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "2025";

  return (
    <PageTransition>
    <div className="space-y-3">
      {/* ═══ PROFILE HEADER ═══ */}
      <section className="bg-[#0a0a0a] border border-zinc-800/70 relative overflow-hidden animate-fade-up corner-accent">
        {/* Geometric cover */}
        <div className="h-20 sm:h-24 bg-[#0a0a0a] relative border-b border-zinc-800/50">
          <div className="absolute inset-0 grid-bg-animated opacity-30" />
          <div className="absolute bottom-0 right-0 w-48 h-48 border-r border-b border-zinc-800/40 opacity-60 translate-x-12 translate-y-12" />
          <div className="absolute top-0 left-0 w-24 h-24 border-l border-t border-zinc-800/40 opacity-60 -translate-x-6 -translate-y-6" />
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 gradient-bottom opacity-60" />
        </div>

        <div className="px-4 sm:px-6 pb-4 sm:pb-5">
          {/* Avatar + Edit row */}
          <div className="flex items-end justify-between -mt-8 sm:-mt-10 mb-3 sm:mb-4 relative z-10">
            <div className="w-16 sm:w-20 h-16 sm:h-20 border-[3px] border-[#0a0a0a] bg-white flex items-center justify-center overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-black uppercase">{displayName[0]}</span>
              )}
            </div>

            <button onClick={() => setEditModalOpen(true)}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-zinc-700/60 text-zinc-400 hover:border-white/60 hover:text-white hover:bg-white/[0.03] transition-all duration-300 animate-fade-in stagger-3">
              <Pencil className="w-3 h-3 inline mr-1.5" />Edit Profile
            </button>
          </div>

          {/* Name + username */}
          <div className="mb-3 animate-fade-up stagger-2">
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-none">{displayName}</h1>
            <span className="text-xs text-zinc-500 font-bold uppercase mt-0.5 inline-block">@{username}</span>
          </div>

          {/* Bio */}
          {bioText && (
            <p className="text-sm text-zinc-400 font-medium leading-relaxed mb-3 max-w-lg animate-fade-up stagger-3">{bioText}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] text-zinc-600 uppercase tracking-widest font-bold animate-fade-up stagger-4">
            {walletAddress && (
              <button onClick={handleCopyAddress}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-800/60 bg-white/[0.02] hover:border-zinc-600 hover:bg-white/[0.04] transition-all duration-200">
                <Fingerprint className="w-3 h-3" />
                <span className="font-mono text-zinc-500">{shortWallet}</span>
                <Copy className="w-2.5 h-2.5 text-zinc-600" />
              </button>
            )}
            {copied && <span className="text-emerald-400 text-[10px] font-bold animate-scale-in">Copied!</span>}
            <span className="text-zinc-700">·</span>
            <span>Joined {memberSince}</span>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="grid grid-cols-4 gap-px bg-zinc-800/60 border border-zinc-800/60 animate-fade-up stagger-3">
        {[
          { value: posts.length, label: "Posts", onClick: undefined },
          { value: followersCount, label: "Followers", onClick: () => setFollowListType("followers") },
          { value: followingCount, label: "Following", onClick: () => setFollowListType("following") },
          { value: "—", label: "Trades", onClick: undefined },
        ].map((stat) => (
          <div key={stat.label}
            onClick={stat.onClick}
            className={`bg-[#0a0a0a] py-3 sm:py-4 px-1 sm:px-2 text-center group hover:bg-white/[0.02] transition-all duration-300 ${stat.onClick ? "cursor-pointer" : "cursor-default"}`}>
            <div className="text-lg sm:text-2xl font-black text-white leading-none mb-1 group-hover:scale-105 transition-transform duration-200">
              {stat.value}
            </div>
            <div className="text-[8px] sm:text-[9px] text-zinc-600 uppercase tracking-[0.1em] sm:tracking-[0.15em] font-bold">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* ═══ PNL CARD ═══ */}
      {eoaAddress && (
        <div className="animate-fade-up stagger-4">
          <PnlSummaryCard
            isPublic={settings.privacy.show_pnl_public}
            onTogglePublic={togglePnlVisibility}
          />
        </div>
      )}

      {/* ═══ SECTION TOGGLE ═══ */}
      <div className="flex items-center gap-1 bg-[#0a0a0a] border border-zinc-800/60 p-1 animate-fade-up stagger-5">
        {(["posts", "positions"] as const).map((section) => (
          <button key={section} onClick={() => setActiveSection(section)}
            className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              activeSection === section
                ? "bg-white text-black"
                : "text-zinc-500 hover:text-white hover:bg-white/[0.03]"
            }`}>
            {section === "posts" ? `Posts (${posts.length})` : "Positions"}
          </button>
        ))}
      </div>

      {/* ═══ CONTENT ═══ */}
      {activeSection === "posts" && (
        <section>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-[#0a0a0a] border border-zinc-800/50 p-5 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex gap-4">
                    <div className="w-11 h-11 shimmer-bg" />
                    <div className="flex-1 space-y-3">
                      <div className="h-3.5 w-32 shimmer-bg" />
                      <div className="h-3 w-full shimmer-bg" />
                      <div className="h-3 w-3/4 shimmer-bg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-[#0a0a0a] border border-zinc-800/60 p-10 text-center animate-scale-in corner-accent relative overflow-hidden">
              <div className="absolute inset-0 grid-bg-animated opacity-10" />
              <div className="relative z-10">
                <p className="text-zinc-500 text-sm uppercase tracking-wider font-bold mb-4">No Posts Yet</p>
                <button onClick={() => router.push("/create")}
                  className="px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-all duration-300">
                  Create First Post
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post, i) => (
                <PostCard key={post.id} post={post} onDeleted={handlePostDeleted} index={i} />
              ))}
            </div>
          )}
        </section>
      )}

      {activeSection === "positions" && (
        <section className="animate-fade-up">
          {eoaAddress ? (
            <PositionsTab />
          ) : (
            <div className="bg-[#0a0a0a] border border-zinc-800/60 p-10 text-center corner-accent relative overflow-hidden">
              <div className="absolute inset-0 grid-bg-animated opacity-10" />
              <div className="relative z-10">
                <div className="w-14 h-14 mx-auto mb-3 border-2 border-zinc-700/50 flex items-center justify-center animate-float">
                  <Shield className="w-7 h-7 text-zinc-500" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider mb-1">Wallet Not Connected</h3>
                <p className="text-xs text-zinc-600 uppercase tracking-wider">Your positions will appear here</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Follow List Modal */}
      {user && (
        <FollowListModal
          isOpen={followListType !== null}
          onClose={() => setFollowListType(null)}
          userId={user.id}
          type={followListType || "followers"}
          count={followListType === "following" ? followingCount : followersCount}
        />
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        currentUsername={username}
        currentDisplayName={displayName}
        currentAvatarUrl={avatarUrl}
        currentBio={bioText}
        onSaved={() => { loadProfile(); loadFollowCounts(); }}
      />
    </div>
    </PageTransition>
  );
}