"use client";

import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PostWithUser } from "@/lib/types";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { MarketCard } from "./MarketCard";

interface PostCardProps {
  post: PostWithUser;
}

export function PostCard({ post }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [hasLiked, setHasLiked] = useState(post.user_has_liked || false);
  const router = useRouter();
  const { user } = usePrivy();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      alert('Please sign in to like posts');
      return;
    }

    try {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          post_id: post.id,
          user_id: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.action === 'liked') {
          setLikes(likes + 1);
          setHasLiked(true);
        } else {
          setLikes(likes - 1);
          setHasLiked(false);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const username = post.profiles?.username || post.profiles?.email?.split('@')[0] || 'Unknown';
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-card backdrop-blur-xl border border-white/10 p-6 mb-4 cursor-pointer hover:border-white/20 transition-all card-shadow card-hover"
      onClick={() => router.push(`/post/${post.id}`)}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2A56F2] to-[#9DFECB] flex items-center justify-center text-lg font-semibold text-white">
          {username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-foreground">{username}</p>
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </div>
      </div>

      {/* Content */}
      <p className="text-foreground/90 mb-4 whitespace-pre-wrap">{post.content}</p>

      {/* Image */}
      {post.image_url && (
        <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 mb-4" style={{ maxHeight: '500px' }}>
          <Image
            src={post.image_url}
            alt="Post image"
            width={690}
            height={500}
            className="w-full h-auto object-cover"
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
      <div className="flex items-center gap-6 pt-4 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 transition-colors group ${
            hasLiked
              ? "text-chart-5"
              : "text-muted-foreground hover:text-chart-5"
          }`}
        >
          <Heart className={`w-5 h-5 transition-transform group-hover:scale-110 ${hasLiked && "fill-current"}`} />
          <span className="text-sm font-medium">{likes > 0 ? likes : ''}</span>
        </button>
        
        <button
          onClick={() => router.push(`/post/${post.id}`)}
          className="flex items-center gap-2 text-muted-foreground hover:text-chart-2 transition-colors group"
        >
          <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="text-sm font-medium">{post.comments_count ?? ''}</span>
        </button>
      </div>
    </div>
  );
}
