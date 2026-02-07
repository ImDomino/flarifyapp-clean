"use client";

import { useState } from "react";
import { Heart, MessageCircle, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
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
    addSuffix: true,
  });
  const isOwnPost = user?.id === post.user_id;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="relative overflow-hidden rounded-3xl bg-card backdrop-blur-xl border border-white/10 p-6 mb-6 cursor-pointer card-shadow card-hover"
      onClick={() => router.push(`/post/${post.id}`)}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2A56F2] to-[#9DFECB] opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2A56F2] to-[#9DFECB] flex items-center justify-center text-lg font-semibold text-white shadow-lg overflow-hidden flex-shrink-0"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            displayName[0].toUpperCase()
          )}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground truncate">{displayName}</p>
            {!isOwnPost && (
              <span
                className="flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <FollowButton targetUserId={post.user_id} />
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            @{username} · {timeAgo}
          </p>
        </div>
        {post.polymarket_market_id && (
          <div className="flex items-center gap-1 px-3 py-1 bg-[#2A56F2]/10 border border-[#2A56F2]/20 rounded-full flex-shrink-0">
            <TrendingUp className="w-3 h-3 text-[#2A56F2]" />
            <span className="text-xs font-medium text-[#2A56F2]">Market</span>
          </div>
        )}
      </div>

      {/* Content */}
      <p className="text-foreground/90 mb-4 whitespace-pre-wrap leading-relaxed">
        {post.content}
      </p>

      {/* Image */}
      {post.image_url && (
        <motion.div
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full rounded-2xl overflow-hidden border border-white/10 mb-4 shadow-lg"
          style={{ maxHeight: "500px" }}
        >
          <Image
            src={post.image_url}
            alt="Post image"
            width={690}
            height={500}
            className="w-full h-auto object-cover"
            unoptimized
          />
        </motion.div>
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
        className="flex items-center gap-6 pt-4 border-t border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLike}
          disabled={isLiking}
          className={`flex items-center gap-2 transition-colors group ${
            hasLiked
              ? "text-[#FF375F]"
              : "text-muted-foreground hover:text-[#FF375F]"
          }`}
        >
          <Heart
            className={`w-5 h-5 transition-all ${hasLiked && "fill-current scale-110"}`}
          />
          {likes > 0 && <span className="text-sm font-medium">{likes}</span>}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push(`/post/${post.id}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-[#2A56F2] transition-colors group"
        >
          <MessageCircle className="w-5 h-5 transition-transform" />
          {(post.comments_count ?? 0) > 0 && (
            <span className="text-sm font-medium">{post.comments_count}</span>
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(
              `${window.location.origin}/post/${post.id}`
            );
            alert("Link copied to clipboard!");
          }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
}
