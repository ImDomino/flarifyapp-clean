"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import {
  MessageCircle, Heart, TrendingUp, Shield, Fingerprint,
  Copy, Pencil, Clock, Hash, AtSign,
} from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { PositionsTab } from "@/components/PositionsTab";
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
  const [profileData, setProfileData] = useState<any>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/profile?user_id=${encodeURIComponent(user.id)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.profile) setProfileData(data.profile);
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
      const response = await fetch(`/api/posts?user_id=${encodeURIComponent(user.id)}&page=1&limit=50`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) { console.error("Error loading posts:", error); }
    finally { setIsLoading(false); }
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
        <div className="bg-[#0a0a0a] border-2 border-zinc-800 p-12">
          <div className="w-16 h-16 mx-auto mb-6 border-2 border-zinc-700 flex items-center justify-center">
            <Shield className="w-8 h-8 text-zinc-500" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider mb-4">Sign In Required</h1>
          <p className="text-sm text-zinc-500 uppercase tracking-wide mb-6">You need to be signed in to view your profile</p>
          <button
            onClick={login}
            className="px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-colors"
          >
            Sign In
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
  const avatarUrl = profileData?.avatar_url || null;
  const bioText = profileData?.bio || "";
  const walletAddress = user?.wallet?.address || "0x01fc...815d";
  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "0x01fc...815d";

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <section className="bg-[#0a0a0a] border border-zinc-800 overflow-hidden">
        {/* Cover */}
        <div className="h-32 sm:h-40 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 relative">
          <div className="absolute inset-0 grid-bg opacity-70" />
          <div className="absolute top-0 right-0 w-40 h-40 border-r-2 border-t-2 border-zinc-700 opacity-30" />
        </div>

        {/* Profile Info */}
        <div className="px-5 sm:px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-6">
            {/* Avatar */}
            <div className="w-24 h-24 border-4 border-[#0a0a0a] bg-white flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
              ) : (
                <span className="text-4xl font-black text-black uppercase">{displayName[0]}</span>
              )}
            </div>

            {/* Edit button */}
            <button
              onClick={() => setEditModalOpen(true)}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider border border-zinc-700 text-zinc-400 hover:border-white hover:text-white hover:bg-[#111] transition-all"
            >
              <Pencil className="w-3.5 h-3.5 inline mr-2" />
              Edit
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">{displayName}</h1>
          <div className="text-sm text-zinc-500 font-bold uppercase mt-1">@{username}</div>

          {bioText && (
            <p className="text-sm text-zinc-400 font-medium mt-4 leading-relaxed">{bioText}</p>
          )}

          {/* Wallet badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 border border-zinc-800 bg-[#111]">
            <Fingerprint className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-mono text-zinc-400">{shortWallet}</span>
            <button
              onClick={handleCopyAddress}
              className="text-xs font-bold text-zinc-500 hover:text-white transition-colors"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          {copied && <span className="ml-2 text-xs text-white font-bold">Copied!</span>}
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-3 gap-px bg-zinc-900 border border-zinc-900">
        {[
          { value: posts.length, label: "Posts", icon: MessageCircle },
          { value: followersCount, label: "Followers", icon: Heart },
          { value: followingCount, label: "Following", icon: TrendingUp },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#050505] p-4 sm:p-5 text-center group cursor-pointer hover:bg-[#0a0a0a] transition-colors">
            <div className="text-2xl sm:text-3xl font-black text-white">{stat.value}</div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold group-hover:text-zinc-400 mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </section>

      {/* Quick Info */}
      <section className="bg-[#0a0a0a] border border-zinc-800 divide-y divide-zinc-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <AtSign className="w-4 h-4 text-zinc-600" />
            <div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Handle</div>
              <div className="text-sm font-bold text-white">@{username}</div>
            </div>
          </div>
          <button onClick={() => setEditModalOpen(true)} className="text-xs font-bold text-zinc-500 hover:text-white transition uppercase tracking-wider">
            Edit
          </button>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Clock className="w-4 h-4 text-zinc-600" />
          <div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Member Since</div>
            <div className="text-sm font-bold text-white">
              {profileData?.created_at
                ? new Date(profileData.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : "2025"}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="border border-zinc-800 overflow-hidden">
        <div className="flex border-b border-zinc-800 bg-[#050505]/95 backdrop-blur">
          {(["posts", "positions", "activity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-center font-black uppercase tracking-wider text-sm transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-white text-white"
                  : "text-zinc-500 hover:text-white hover:bg-[#111]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-[#0a0a0a] p-4 sm:p-5">
          {activeTab === "posts" && <PostsContent posts={posts} isLoading={isLoading} />}
          {activeTab === "positions" && (eoaAddress ? <PositionsTab /> : <WalletRequired />)}
          {activeTab === "activity" && <ActivityContent />}
        </div>
      </section>

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
  );
}

function PostsContent({ posts, isLoading }: { posts: PostWithUser[]; isLoading: boolean }) {
  const router = useRouter();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white animate-spin" />
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500 text-sm uppercase tracking-wider font-bold mb-4">No Posts Yet</p>
        <button
          onClick={() => router.push("/create")}
          className="px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm border-2 border-white hover:bg-black hover:text-white transition-colors"
        >
          Create First Post
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {posts.map((post) => <PostCard key={post.id} post={post} />)}
    </div>
  );
}

function ActivityContent() {
  return (
    <div className="text-center py-12">
      <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">Coming Soon</p>
      <p className="text-[10px] text-zinc-700 mt-2 uppercase">Activity feed will appear here</p>
    </div>
  );
}

function WalletRequired() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 border-2 border-zinc-700 flex items-center justify-center">
        <Shield className="w-8 h-8 text-zinc-500" />
      </div>
      <h3 className="text-lg font-black uppercase tracking-wider mb-2">Wallet Not Connected</h3>
      <p className="text-sm text-zinc-500 uppercase tracking-wide">Your positions will appear here</p>
    </div>
  );
}
