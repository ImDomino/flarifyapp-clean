"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, Fingerprint, MessageCircle, Heart, TrendingUp } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";
import type { PostWithUser } from "@/lib/types";

export default function UserProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = usePrivy();
  const [profileData, setProfileData] = useState<any>(null);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const userId = id as string;
  const isOwnProfile = user?.id === userId;

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile?user_id=${encodeURIComponent(userId)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.profile) setProfileData(data.profile);
    } catch (err) { console.error("Error:", err); }
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
      setIsLoading(true);
      const response = await fetch(`/api/posts?user_id=${encodeURIComponent(userId)}&page=1&limit=50`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (err) { console.error("Error:", err); }
    finally { setIsLoading(false); }
  }, [userId]);

  useEffect(() => {
    if (isOwnProfile) { router.replace("/profile"); return; }
    loadProfile();
    loadFollowCounts();
    loadPosts();
  }, [userId, isOwnProfile]);

  const displayName = profileData?.display_name || profileData?.username || "User";
  const username = profileData?.username || "user";
  const avatarUrl = profileData?.avatar_url || null;
  const bioText = profileData?.bio || "";

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-bold uppercase tracking-wider text-sm">Back</span>
      </button>

      {/* Profile Header */}
      <section className="bg-[#0a0a0a] border border-zinc-800 overflow-hidden">
        <div className="h-32 sm:h-40 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 relative">
          <div className="absolute inset-0 grid-bg opacity-70" />
        </div>
        <div className="px-5 sm:px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-6">
            <div className="w-24 h-24 border-4 border-[#0a0a0a] bg-white flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
              ) : (
                <span className="text-4xl font-black text-black uppercase">{displayName[0]}</span>
              )}
            </div>
            {user && !isOwnProfile && (
              <FollowButton
                targetUserId={userId}
                currentUserId={user.id}
                onFollowChange={loadFollowCounts}
              />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">{displayName}</h1>
          <div className="text-sm text-zinc-500 font-bold uppercase mt-1">@{username}</div>
          {bioText && <p className="text-sm text-zinc-400 font-medium mt-4 leading-relaxed">{bioText}</p>}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-px bg-zinc-900 border border-zinc-900">
        {[
          { value: posts.length, label: "Posts", icon: MessageCircle },
          { value: followersCount, label: "Followers", icon: Heart },
          { value: followingCount, label: "Following", icon: TrendingUp },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#050505] p-4 sm:p-5 text-center">
            <div className="text-2xl sm:text-3xl font-black text-white">{stat.value}</div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mt-1">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Posts */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4 pb-3 border-b border-zinc-800">
          Posts
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-white animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-zinc-800 p-12 text-center">
            <p className="text-sm text-zinc-500 uppercase tracking-wider font-bold">No Posts Yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </section>
    </div>
  );
}
