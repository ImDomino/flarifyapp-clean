"use client";

import { useState } from "react";
import { Heart, MessageCircle, ExternalLink, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PostWithUser } from "@/lib/types";
import { useRouter } from "next/navigation";
import { OrderForm } from "./OrderForm";

interface PostCardProps {
  post: PostWithUser;
  currentUserId?: string;
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes);
  const [hasLiked, setHasLiked] = useState(post.hasLiked || false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const router = useRouter();

  const handleLike = () => {
    if (!currentUserId) return;
    
    if (hasLiked) {
      setLikes(likes - 1);
      setHasLiked(false);
    } else {
      setLikes(likes + 1);
      setHasLiked(true);
    }
  };

  const handlePredictClick = () => {
    // Добавляем builder_id к URL
    const url = new URL(post.polymarket_url);
    url.searchParams.set('builder_id', post.ref_code);
    window.open(url.toString(), "_blank");
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 card-hover">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-semibold">
            {post.users.username[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-foreground">{post.users.username}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Content */}
      <h3 className="text-xl font-bold mb-2 text-foreground">{post.title}</h3>
      <p className="text-muted-foreground mb-4">{post.content}</p>

      {/* Polymarket Embed */}
      {post.market_title && (
        <div className="bg-secondary/50 rounded-lg p-4 mb-4 border border-border">
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-semibold text-sm text-foreground flex-1">
              {post.market_title}
            </h4>
            <ExternalLink className="h-4 w-4 text-muted-foreground ml-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-green-500/10 rounded p-3 border border-green-500/20">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">YES</span>
              </div>
              <p className="text-2xl font-bold text-green-500">
                {post.yes_price ? `${post.yes_price}¢` : "N/A"}
              </p>
            </div>
            
            <div className="bg-red-500/10 rounded p-3 border border-red-500/20">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground">NO</span>
              </div>
              <p className="text-2xl font-bold text-red-500">
                {post.no_price ? `${post.no_price}¢` : "N/A"}
              </p>
            </div>
          </div>

          {/* Toggle Order Form Button */}
          <button
            onClick={() => setShowOrderForm(!showOrderForm)}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors glow-effect flex items-center justify-center space-x-2 mb-3"
          >
            <span>Trade on Polymarket</span>
            {showOrderForm ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {/* Order Form (collapsible) */}
          {showOrderForm && (
            <div className="mt-3">
              <OrderForm post={post} />
            </div>
          )}

          {/* External Link */}
          <button
            onClick={handlePredictClick}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View on Polymarket →
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-4 pt-4 border-t border-border">
        <button
          onClick={handleLike}
          disabled={!currentUserId}
          className={`flex items-center space-x-2 transition-colors ${
            hasLiked
              ? "text-red-500"
              : "text-muted-foreground hover:text-red-500"
          } ${!currentUserId && "opacity-50 cursor-not-allowed"}`}
        >
          <Heart className={`h-5 w-5 ${hasLiked && "fill-current"}`} />
          <span className="text-sm font-medium">{likes}</span>
        </button>

        <button
          onClick={() => router.push(`/post/${post.id}`)}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">{post.comments_count}</span>
        </button>
      </div>
    </div>
  );
}
