"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Heart,
  TrendingUp,
  Shield,
  Fingerprint,
  Copy,
  BadgeCheck,
  LayoutTemplate,
  AtSign,
  Hash,
  Clock,
  Filter,
  Pencil,
  Send,
} from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { PositionsTab } from "@/components/PositionsTab";
import { FollowButton } from "@/components/FollowButton";
import { EditProfileModal } from "@/components/EditProfileModal";
import type { PostWithUser } from "@/lib/types";
import { useWallet } from "@/providers/WalletProvider";

export default function ProfilePage() {
  const { authenticated, user, login } = usePrivy();
  const router = useRouter();
  const { eoaAddress } = useWallet();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "positions" | "activity">("positions");
  const [copied, setCopied] = useState(false);

  // Profile data from DB
  const [profileData, setProfileData] = useState<any>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/profile?user_id=${encodeURIComponent(user.id)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.profile) setProfileData(data.profile);
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }, [user?.id]);

  const loadFollowCounts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/follows?user_id=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      setFollowersCount(data.followers || 0);
      setFollowingCount(data.following || 0);
    } catch (err) {
      console.error("Error loading follow counts:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!authenticated || !user) return;
    loadProfile();
    loadFollowCounts();
    loadUserPosts();
  }, [authenticated, user]);

  const loadUserPosts = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const response = await fetch(`/api/posts?page=1&limit=100`);
      const data = await response.json();
      const userPosts = data.posts.filter((post: PostWithUser) => post.user_id === user.id);
      setPosts(userPosts);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = () => {
    const value = user?.wallet?.address || "—";
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!authenticated) {
    return (
      <div className="text-center py-12">
        <div className="rounded-xl bg-base-900/70 border border-white/5 shadow-card p-8">
          <div className="h-20 w-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center">
            <Shield className="w-10 h-10 text-blue-300" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight mb-4">
            Sign in to View Profile
          </h1>
          <p className="text-slate-400 mb-6">You need to be signed in to view your profile</p>
          <button
            onClick={login}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const displayName = profileData?.display_name || profileData?.username ||
    user?.google?.name || user?.email?.address?.split("@")[0] || "User";
  const username = profileData?.username ||
    user?.google?.name?.toLowerCase().replace(/\s+/g, "") ||
    user?.email?.address?.split("@")[0] || "user";
  const email = user?.google?.email || user?.email?.address || "";
  const avatarUrl = profileData?.avatar_url || null;
  const bioText = profileData?.bio || "";
  const bioDisplay = bioText || "Focused on prediction markets, clean risk sizing, and sharing trade rationale.";
  const walletAddress = user?.wallet?.address || "0x01fc...815d";
  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "0x01fc...815d";

  return (
    <div className="space-y-5">
      {/* Header / Cover Section */}
      <section className="rounded-xl bg-base-900/60 border border-white/5 shadow-card overflow-hidden">
        <div className="relative">
          <div className="h-44 sm:h-48 lg:h-52 bg-gradient-to-r from-[#111a3b] via-[#1a2a57] to-[#0d3a3a]" />
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.35),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(20,184,166,.28),transparent_55%)]" />

          {/* Avatar */}
          <div className="absolute -bottom-10 left-6 flex items-end gap-5">
            <div className="relative">
              <div className="h-[125px] w-[125px] rounded-full bg-gradient-to-br from-blue-500 to-teal-400 p-[3px] shadow-glow">
                <div className="h-full w-full rounded-full bg-base-900 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-blue-500/30 to-teal-400/25 flex items-center justify-center">
                      <span className="font-display text-4xl font-bold text-blue-100">
                        {displayName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-base-900 border border-white/10 flex items-center justify-center shadow-soft">
                <BadgeCheck className="text-lg text-blue-300" />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="absolute bottom-4 right-5 hidden sm:flex items-center gap-2">
            <button
              onClick={() => setEditModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold bg-white/5 hover:bg-white/8 border border-white/10 text-slate-200 transition"
            >
              <Pencil className="w-4 h-4 text-slate-300" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-6 pt-14 pb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
                {displayName}
              </h1>
              <div className="mt-0.5 text-sm text-slate-400">@{username}</div>
              <div className="mt-1 text-xs text-slate-500 truncate">{email}</div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <Fingerprint className="w-4 h-4 text-blue-200" />
                  <span className="text-xs text-slate-300">{shortWallet}</span>
                  <button
                    onClick={handleCopyAddress}
                    className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-blue-200 hover:text-blue-100 hover:bg-blue-500/10 transition"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>

                {/* Mobile edit button */}
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="sm:hidden inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold bg-white/5 hover:bg-white/8 border border-white/10 text-slate-200 transition min-h-[44px]"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <MessageCircle className="text-xl text-blue-300" />
            </div>
            <div className="text-xs text-slate-500">All time</div>
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl font-semibold tracking-tight">{posts.length}</div>
            <div className="mt-0.5 text-sm text-slate-400">Posts</div>
          </div>
        </div>

        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Heart className="text-xl text-rose-300" />
            </div>
            <div className="text-xs text-slate-500">Community</div>
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl font-semibold tracking-tight">{followersCount}</div>
            <div className="mt-0.5 text-sm text-slate-400">Followers</div>
          </div>
        </div>

        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <TrendingUp className="text-xl text-teal-200" />
            </div>
            <div className="text-xs text-slate-500">Network</div>
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl font-semibold tracking-tight">{followingCount}</div>
            <div className="mt-0.5 text-sm text-slate-400">Following</div>
          </div>
        </div>
      </section>

      {/* Bio + Quick Info */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold tracking-tight">Bio</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              Active trader
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{bioDisplay}</p>
        </div>

        <div className="rounded-xl bg-base-900/60 border border-white/5 shadow-soft p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Quick info</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-base-850/50 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <AtSign className="text-lg text-slate-400" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Handle</div>
                  <div className="text-sm font-semibold text-slate-200 truncate">
                    @{username}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(true)}
                className="text-xs font-semibold text-blue-300 hover:text-blue-200 transition"
              >
                Edit
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-base-850/50 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="text-lg text-slate-400" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">User ID</div>
                  <div className="text-sm font-semibold text-slate-200 truncate">
                    {user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-base-850/50 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="text-lg text-slate-400" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Member since</div>
                  <div className="text-sm font-semibold text-slate-200 truncate">
                    {profileData?.created_at
                      ? new Date(profileData.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : "Jan 2026"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs + Content */}
      <section className="rounded-xl bg-base-900/60 border border-white/5 shadow-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-3 sm:px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-base-850/70 border border-white/5 p-1">
              {(["posts", "positions", "activity"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition capitalize ${
                    activeTab === tab
                      ? "text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
                      : "text-slate-300 hover:text-slate-100 hover:bg-white/5"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === "posts" && <PostsContent posts={posts} isLoading={isLoading} />}
          {activeTab === "positions" &&
            (eoaAddress ? <PositionsTab /> : <WalletRequired />)}
          {activeTab === "activity" && <ActivityContent />}
        </div>
      </section>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        currentUsername={username}
        currentDisplayName={displayName}
        currentAvatarUrl={avatarUrl}
        currentBio={bioText}
        onSaved={() => {
          loadProfile();
          loadFollowCounts();
        }}
      />
    </div>
  );
}

function PostsContent({ posts, isLoading }: { posts: PostWithUser[]; isLoading: boolean }) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500/20 to-teal-500/20 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-blue-300" />
        </div>
        <p className="text-slate-400 mb-4">You haven't created any posts yet</p>
        <button
          onClick={() => router.push("/create")}
          className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
        >
          Create Your First Post
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function ActivityContent() {
  return (
    <div className="text-center py-12">
      <Heart className="w-12 h-12 mx-auto mb-4 text-slate-500 opacity-50" />
      <p className="text-slate-400">Activity feed coming soon...</p>
    </div>
  );
}

function WalletRequired() {
  return (
    <div className="text-center py-16 px-8">
      <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-blue-500/15 to-teal-500/15 border-2 border-white/20 flex items-center justify-center">
        <Shield className="w-12 h-12 text-blue-400" />
      </div>
      <h3 className="font-display text-xl font-bold text-slate-100 mb-4">Wallet Not Connected</h3>
      <p className="text-lg text-slate-300 mb-2">Your positions will appear here</p>
      <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
        Create your embedded Polygon wallet to load Polymarket CLOB positions.
      </p>
    </div>
  );
}
