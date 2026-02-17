"use client";

import { useState } from "react";
import { Heart, MessageCircle, Repeat, Share, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PostWithUser } from "@/lib/types";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { MarketCard } from "./MarketCard";
import { useAuthFetch } from "@/hooks/useAuthFetch";

interface PostCardProps {
  post: PostWithUser;
  onDeleted?: () => void;
}

export function PostCard({ post, onDeleted }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [hasLiked, setHasLiked] = useState(post.user_has_liked || false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();
  const { user } = usePrivy();
  const authFetch = useAuthFetch();

  const isOwnPost = user?.id === post.user_id;

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
      const response = await authFetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id }),
      });
      const data = await response.json();
      if (!data.success) { setHasLiked(!newLiked); setLikes(likes); }
    } catch {
      setHasLiked(!newLiked); setLikes(likes);
    } finally { setIsLiking(false); }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      // Auto-hide confirm after 3s
      setTimeout(() => setShowDeleteConfirm(false), 3000);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await authFetch("/api/posts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id }),
      });
      const data = await res.json();
      if (data.success) {
        onDeleted?.();
        // If no callback, reload the page
        if (!onDeleted) router.refresh();
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const displayName =
    (post.profiles as any)?.display_name || post.profiles?.username || post.profiles?.email?.split("@")[0] || "Unknown";
  const username = post.profiles?.username || post.profiles?.email?.split("@")[0] || "unknown";
  const avatarUrl = post.profiles?.avatar_url;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false });

  const navigateToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(isOwnPost ? "/profile" : `/user/${post.user_id}`);
  };

  const isLongContent = (post.content?.length || 0) > 280;

  return (
    <article className="bg-[#0a0a0a] border border-zinc-800 p-5 sm:p-6 interact-border group cursor-pointer"
      onClick={() => router.push(`/post/${post.id}`)}>
      <div className="flex gap-4">
        <div className="w-12 h-12 flex-shrink-0 border border-zinc-700 group-hover:border-white transition-colors overflow-hidden cursor-pointer"
          onClick={navigateToProfile}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <span className="text-sm font-black text-white uppercase">{displayName[0]}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-black text-white uppercase text-sm tracking-wide truncate cursor-pointer hover:underline"
                onClick={navigateToProfile}>{displayName}</h3>
              <span className="text-zinc-600 text-xs font-bold uppercase flex-shrink-0">@{username}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <span className="text-zinc-600 text-xs font-mono">{timeAgo.toUpperCase()}</span>
              {/* Delete button — own posts only */}
              {isOwnPost && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`p-1.5 transition-all ${
                    showDeleteConfirm
                      ? "text-red-400 border border-red-800 bg-red-950/30"
                      : "text-zinc-700 hover:text-red-400 border border-transparent opacity-0 group-hover:opacity-100"
                  } disabled:opacity-50`}
                  title={showDeleteConfirm ? "Click again to confirm" : "Delete post"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            <p className={`text-zinc-300 text-sm leading-7 font-medium whitespace-pre-wrap ${
              isLongContent ? "line-clamp-4" : ""
            }`}>
              {post.content}
            </p>
            {isLongContent && (
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider hover:text-white transition-colors mt-1 inline-block">
                Show more
              </span>
            )}
          </div>

          {/* Image */}
          {post.image_url && (
            <div className="border border-zinc-800 mb-4 group-hover:border-zinc-600 transition-colors overflow-hidden"
              style={{ maxHeight: "35rem" }}>
              <Image src={post.image_url} alt="Post image" width={690} height={288}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                unoptimized />
            </div>
          )}

          {post.polymarket_market_id && post.market_data && (
            <div onClick={(e) => e.stopPropagation()}>
              <MarketCard marketData={{ ...post.market_data, yesTokenId: post.yes_token_id || post.market_data.yesTokenId, noTokenId: post.no_token_id || post.market_data.noTokenId }}
                marketId={post.polymarket_market_id} />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 pt-3" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleLike} disabled={isLiking}
              className={`flex items-center gap-3 group/btn transition-colors ${hasLiked ? "text-white" : "text-zinc-500 hover:text-white"}`}>
              <div className="p-2 border border-transparent group-hover/btn:border-zinc-700 transition-colors">
                <Heart className={`w-[18px] h-[18px] ${hasLiked ? "fill-current" : ""}`} />
              </div>
              {likes > 0 && <span className="text-xs font-mono font-bold">{likes}</span>}
            </button>
            <button onClick={() => router.push(`/post/${post.id}`)}
              className="flex items-center gap-3 text-zinc-500 hover:text-white group/btn transition-colors">
              <div className="p-2 border border-transparent group-hover/btn:border-zinc-700 transition-colors">
                <MessageCircle className="w-[18px] h-[18px]" />
              </div>
              {(post.comments_count ?? 0) > 0 && <span className="text-xs font-mono font-bold">{post.comments_count}</span>}
            </button>
            <button className="flex items-center gap-3 text-zinc-500 hover:text-white group/btn transition-colors">
              <div className="p-2 border border-transparent group-hover/btn:border-zinc-700 transition-colors">
                <Repeat className="w-[18px] h-[18px]" />
              </div>
            </button>
            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); }}
              className="ml-auto text-zinc-500 hover:text-white transition-colors">
              <Share className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
