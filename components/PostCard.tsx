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

  const handleLike = async () => {
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
  const handle = '@' + username.toLowerCase().replace(/\s+/g, '');
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true }).replace('about ', '');

  return (
    <div className="p-6 bg-card transition-colors cursor-pointer" onClick={() => router.push(`/post/${post.id}`)}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div 
          className="w-[60px] h-[60px] rounded-full bg-[#C2C2C2] flex items-center justify-center flex-shrink-0"
          style={{ background: '#C2C2C2' }}
        >
          <span className="text-xl font-bold text-white">
            {username[0].toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="font-bold truncate"
              style={{ fontSize: '20px', letterSpacing: '-1px', color: '#140106' }}
            >
              {username}
            </span>
            <span className="text-xs truncate" style={{ letterSpacing: '0px', color: '#989898' }}>
              {handle}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-[#989898]"></span>
            <span className="text-sm whitespace-nowrap" style={{ letterSpacing: '0px', color: '#989898' }}>
              {timeAgo.replace(' ago', '')}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-3 pl-[72px]">
        <p 
          className="whitespace-pre-wrap break-words mb-3"
          style={{ fontSize: '20px', lineHeight: '24px', letterSpacing: '-1px', color: '#140106' }}
        >
          {post.content}
        </p>

        {/* Image */}
        {post.image_url && (
          <div className="relative w-full rounded-[30px] overflow-hidden border border-border mt-3" style={{ maxHeight: '500px' }}>
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
            {(() => {
              const finalMarketData = {
                ...post.market_data,
                // Прокидываем tokenIds из БД если они есть
                yesTokenId: post.yes_token_id || post.market_data.yesTokenId,
                noTokenId: post.no_token_id || post.market_data.noTokenId,
              };
              
              console.log('🔍 PostCard marketData:', {
                post_yes_token_id: post.yes_token_id,
                post_no_token_id: post.no_token_id,
                market_data_yesTokenId: post.market_data.yesTokenId,
                market_data_noTokenId: post.market_data.noTokenId,
                final_yesTokenId: finalMarketData.yesTokenId,
                final_noTokenId: finalMarketData.noTokenId,
              });
              
              return (
                <MarketCard 
                  marketData={finalMarketData}
                  marketId={post.polymarket_market_id}
                />
              );
            })()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-8 pl-[72px]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 group transition-colors ${
            hasLiked ? "text-red-500" : "text-[#989898] hover:text-red-500"
          }`}
        >
          <Heart className={`w-5 h-5 ${hasLiked && "fill-current"} transition-all group-hover:scale-110`} />
          <span className="font-semibold text-xs" style={{ letterSpacing: '-1px' }}>
            {likes > 0 ? (likes >= 1000 ? `${(likes / 1000).toFixed(1)}k` : likes) : ''}
          </span>
        </button>

        <button
          onClick={() => router.push(`/post/${post.id}`)}
          className="flex items-center gap-2 text-[#989898] hover:text-primary group transition-colors"
        >
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-all" />
          <span className="font-semibold text-xs" style={{ letterSpacing: '-1px' }}>
            {post.comments_count > 0 ? (post.comments_count >= 1000 ? `${(post.comments_count / 1000).toFixed(1)}k` : post.comments_count) : ''}
          </span>
        </button>
      </div>
    </div>
  );
}
