"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PostWithUser } from "@/lib/types";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { MarketCard } from "./MarketCard";
import { FollowButton } from "./FollowButton";

interface PostCardProps {
  post: PostWithUser;
}

export function PostCard({ post }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [hasLiked, setHasLiked] = useState(post.user_has_liked || false);
  const [isLiking, setIsLiking] = useState(false);
  const router = useRouter();
  const { user } = usePrivy();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      alert("Please sign in to like posts");
      return;
    }

    if (isLiking) return;

    setIsLiking(true);

    const newLiked = !hasLiked;
    const newLikes = newLiked ? likes + 1 : likes - 1;
    setHasLiked(newLiked);
    setLikes(newLikes);

    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: post.id,
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setHasLiked(!newLiked);
        setLikes(likes);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      setHasLiked(!newLiked);
      setLikes(likes);
    } finally {
      setIsLiking(false);
    }
  };

  const displayName =
    (post.profiles as any)?.display_name ||
    post.profiles?.username ||
    post.profiles?.email?.split("@")[0] ||
    "Unknown";
  const username =
    post.profiles?.username ||
    post.profiles?.email?.split("@")[0] ||
    "unknown";
  const avatarUrl = post.profiles?.avatar_url;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: false,
  });
  const isOwnPost = user?.id === post.user_id;

  const navigateToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwnPost) {
      router.push(`/user/${post.user_id}`);
    } else {
      router.push(`/profile`);
    }
  };

  return (
    <article
      className="bg-base-900/60 border border-white/5 rounded-2xl p-5 hover:bg-base-900/80 transition-colors cursor-pointer group"
      onClick={() => router.push(`/post/${post.id}`)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3 min-w-0">
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-blue-500/30 transition-all"
            onClick={navigateToProfile}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center">
                <span className="font-display font-bold text-white text-sm">
                  {displayName[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Name & time */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3
                className="font-bold text-slate-100 text-sm truncate cursor-pointer hover:underline"
                onClick={navigateToProfile}
              >
                {displayName}
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium tracking-tight">
              <span
                className="cursor-pointer hover:underline"
                onClick={navigateToProfile}
              >
                @{username}
              </span>
              {" "}· {timeAgo}
            </p>
          </div>
        </div>

        {/* Follow button */}
        {!isOwnPost && (
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <FollowButton
              targetUserId={post.user_id}
              className="px-4 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500 hover:text-white transition-all"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <p className="text-slate-100 mb-4 leading-relaxed whitespace-pre-wrap">
        {post.content}
      </p>

      {/* Image */}
      {post.image_url && (
        <div
          className="rounded-2xl overflow-hidden border border-white/10 mb-4 group-hover:[&_img]:scale-[1.02]"
        >
          <Image
            src={post.image_url}
            alt="Post image"
            width={690}
            height={500}
            className="w-full h-auto object-cover transition-transform duration-700"
            unoptimized
          />
        </div>
      )}

      {/* Market Card */}
      {post.polymarket_market_id && post.market_data && (
        <div onClick={(e) => e.stopPropagation()}>
          <MarketCard
            marketData={{
              ...post.market_data,
              yesTokenId: post.yes_token_id || post.market_data.yesTokenId,
              noTokenId: post.no_token_id || post.market_data.noTokenId,
            }}
            marketId={post.polymarket_market_id}
          />
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center justify-between text-slate-500 pt-4 border-t border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => router.push(`/post/${post.id}`)}
          className="flex items-center gap-2 hover:text-blue-400 transition-all group/action"
        >
          <MessageCircle className="w-[18px] h-[18px] group-hover/action:scale-110 transition-transform" />
          {(post.comments_count ?? 0) > 0 && (
            <span className="text-xs">{post.comments_count}</span>
          )}
        </button>

        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-2 transition-all group/action ${
            hasLiked ? "text-rose-400" : "hover:text-rose-400"
          }`}
        >
          <Heart
            className={`w-[18px] h-[18px] group-hover/action:scale-110 transition-transform ${
              hasLiked ? "fill-current" : ""
            }`}
          />
          {likes > 0 && <span className="text-xs">{likes}</span>}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(
              `${window.location.origin}/post/${post.id}`
            );
          }}
          className="flex items-center gap-2 hover:text-teal-400 transition-all group/action"
        >
          <Share2 className="w-[18px] h-[18px] group-hover/action:scale-110 transition-transform" />
          <span className="text-xs">Share</span>
        </button>

        <button className="flex items-center gap-2 hover:text-blue-400 transition-all group/action">
          <Bookmark className="w-[18px] h-[18px] group-hover/action:scale-110 transition-transform" />
        </button>
      </div>
    </article>
  );
}
