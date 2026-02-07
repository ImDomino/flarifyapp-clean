"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  MessageCircle,
  Heart,
  TrendingUp,
  ArrowLeft,
  BadgeCheck,
  AtSign,
  Clock,
  Loader2,
} from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";
import type { PostWithUser } from "@/lib/types";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = usePrivy();
  const userId = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect to own profile page if viewing self
  useEffect(() => {
    if (user?.id && userId === user.id) {
      router.replace("/profile");
    }
  }, [user?.id, userId, router]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile?user_id=${userId}`);
      const data = await res.json();
      if (data.profile) setProfile(data.profile);
    } catch (err) {
      console.error("Error loading profile:", err);
    }
  }, [userId]);

  const loadFollowCounts = useCallback(async () => {
    try {
      const viewerId = user?.id || "";
      const res = await fetch(
        `/api/follows?user_id=${userId}&viewer_id=${encodeURIComponent(viewerId)}`
      );
      const data = await res.json();
      setFollowersCount(data.followers || 0);
      setFollowingCount(data.following || 0);
    } catch (err) {
      console.error("Error loading follow counts:", err);
    }
  }, [userId, user?.id]);

  const loadUserPosts = useCallback(async () => {
    try {
      const response = await fetch(`/api/posts?user_id=${userId}&page=1&limit=50`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  }, [userId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadProfile(), loadFollowCounts(), loadUserPosts()]).finally(() =>
      setIsLoading(false)
    );
  }, [loadProfile, loadFollowCounts, loadUserPosts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <div className="rounded-xl bg-base-900/70 border border-white/5 shadow-card p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight mb-4">
            User Not Found
          </h1>
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-slate-950 bg-gradient-to-r from-blue-500 to-teal-400 shadow-glow"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || profile.email?.split("@")[0] || "User";
  const username = profile.username || profile.email?.split("@")[0] || "user";
  const avatarUrl = profile.avatar_url;
  const bioText = profile.bio || "";

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header / Cover */}
      <section className="rounded-xl bg-base-900/60 border border-white/5 shadow-card overflow-hidden">
        <div className="relative">
          <div className="h-36 sm:h-44 bg-gradient-to-r from-[#111a3b] via-[#1a2a57] to-[#0d3a3a]" />
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.35),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(20,184,166,.28),transparent_55%)]" />

          <div className="absolute -bottom-10 left-6">
            <div className="h-[100px] w-[100px] rounded-full bg-gradient-to-br from-blue-500 to-teal-400 p-[3px] shadow-glow">
              <div className="h-full w-full rounded-full bg-base-900 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-blue-500/30 to-teal-400/25 flex items-center justify-center">
                    <span className="font-display text-3xl font-bold text-blue-100">
                      {displayName[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Follow button */}
          <div className="absolute bottom-4 right-5 flex items-center gap-2">
            <FollowButton
              targetUserId={userId}
              onToggle={() => loadFollowCounts()}
            />
          </div>
        </div>

        <div className="px-6 pt-14 pb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{displayName}</h1>
          <div className="mt-0.5 text-sm text-slate-400">@{username}</div>
          {bioText && (
            <p className="mt-3 text-sm leading-6 text-slate-300">{bioText}</p>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-slate-200">
              <strong>{followersCount}</strong>{" "}
              <span className="text-slate-500">Followers</span>
            </span>
            <span className="text-slate-200">
              <strong>{followingCount}</strong>{" "}
              <span className="text-slate-500">Following</span>
            </span>
            <span className="text-slate-200">
              <strong>{posts.length}</strong>{" "}
              <span className="text-slate-500">Posts</span>
            </span>
          </div>

          {profile.created_at && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              Joined{" "}
              {new Date(profile.created_at).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </div>
          )}
        </div>
      </section>

      {/* Posts */}
      <section className="rounded-xl bg-base-900/60 border border-white/5 shadow-card overflow-hidden">
        <div className="border-b border-white/5 px-5 py-3">
          <h2 className="font-display text-base font-semibold tracking-tight">
            Posts ({posts.length})
          </h2>
        </div>
        <div className="p-4 sm:p-5">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 text-slate-500 opacity-50" />
              <p className="text-slate-400">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
