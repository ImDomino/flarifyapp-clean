"use client";

import { useState } from "react";
import { Heart, MessageCircle, Repeat, Share } from "lucide-react";
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
    if (!user) { alert("Please sign in to like posts"); return; }
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
        body: JSON.stringify({ post_id: post.id, user_id: user.id }),
      });
      const data = await response.json();
      if (!data.success) { setHasLiked(!newLiked); setLikes(likes); }
    } catch {
      setHasLiked(!newLiked); setLikes(likes);
    } finally { setIsLiking(false); }
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
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });
  const isOwnPost = user?.id === post.user_id;

  const navigateToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(isOwnPost ? "/profile" : `/user/${post.user_id}`);
  };

  return (
    <article
      className="bg-[#0a0a0a] border border-zinc-800 p-5 sm:p-6 interact-border group cursor-pointer"
      onClick={() => router.push(`/post/${post.id}`)}
    >
      <div className="flex gap-4">
        {/* Square avatar */}
        <div
          className="w-12 h-12 flex-shrink-0 border border-zinc-700 group-hover:border-white transition-colors overflow-hidden cursor-pointer"
          onClick={navigateToProfile}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <span className="text-sm font-black text-white uppercase">
                {displayName[0]}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <h3
                className="font-black text-white uppercase text-sm tracking-wide truncate cursor-pointer hover:underline"
                onClick={navigateToProfile}
              >
                {displayName}
              </h3>
              <span className="text-zinc-600 text-xs font-bold uppercase flex-shrink-0">
                @{username}
              </span>
            </div>
            <span className="text-zinc-600 text-xs font-mono flex-shrink-0 ml-2">
              {timeAgo.toUpperCase()}
            </span>
          </div>

          {/* Content */}
          <p className="text-zinc-300 text-sm leading-7 font-medium mb-4 whitespace-pre-wrap">
            {post.content}
          </p>

          {/* Image */}
          {post.image_url && (
            <div className="border border-zinc-800 mb-4 group-hover:border-zinc-600 transition-colors overflow-hidden">
              <Image
                src={post.image_url}
                alt="Post image"
                width={690}
                height={400}
                className="w-full h-auto object-cover opacity-80 group-hover:opacity-100 transition-opacity"
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
            className="flex items-center gap-6 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-3 group/btn transition-colors ${
                hasLiked ? "text-white" : "text-zinc-500 hover:text-white"
              }`}
            >
              <div className="p-2 border border-transparent group-hover/btn:border-zinc-700 transition-colors">
                <Heart className={`w-[18px] h-[18px] ${hasLiked ? "fill-current" : ""}`} />
              </div>
              {likes > 0 && <span className="text-xs font-mono font-bold">{likes}</span>}
            </button>

            <button
              onClick={() => router.push(`/post/${post.id}`)}
              className="flex items-center gap-3 text-zinc-500 hover:text-white group/btn transition-colors"
            >
              <div className="p-2 border border-transparent group-hover/btn:border-zinc-700 transition-colors">
                <MessageCircle className="w-[18px] h-[18px]" />
              </div>
              {(post.comments_count ?? 0) > 0 && (
                <span className="text-xs font-mono font-bold">{post.comments_count}</span>
              )}
            </button>

            <button className="flex items-center gap-3 text-zinc-500 hover:text-white group/btn transition-colors">
              <div className="p-2 border border-transparent group-hover/btn:border-zinc-700 transition-colors">
                <Repeat className="w-[18px] h-[18px]" />
              </div>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
              }}
              className="ml-auto text-zinc-500 hover:text-white transition-colors"
            >
              <Share className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
