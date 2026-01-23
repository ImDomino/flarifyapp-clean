"use client";

import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PostWithUser } from "@/lib/types";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

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

  return (
    <div className="bg-card rounded-lg border border-border p-6 card-hover">
      <div className="flex items-center space-x-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-semibold">
            {username[0].toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-semibold text-foreground">{username}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      <p className="text-foreground mb-4 whitespace-pre-wrap">{post.content}</p>

      <div className="flex items-center space-x-4 pt-4 border-t border-border">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 transition-colors ${
            hasLiked
              ? "text-red-500"
              : "text-muted-foreground hover:text-red-500"
          }`}
        >
          <Heart className={`h-5 w-5 ${hasLiked && "fill-current"}`} />
          <span className="text-sm font-medium">{likes}</span>
        </button>

        <button
          onClick={() => router.push(`/post/${post.id}`)}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">{post.comments_count || 0}</span>
        </button>
      </div>
    </div>
  );
}