"use client";

import { useState, useRef, useEffect } from "react";
import { Heart, MessageCircle, Repeat, Share, Trash2, Check } from "lucide-react";
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
  index?: number; // for stagger animation
}

export function PostCard({ post, onDeleted, index = 0 }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [hasLiked, setHasLiked] = useState(post.user_has_liked || false);
  const [isLiking, setIsLiking] = useState(false);
  const [likeBurst, setLikeBurst] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const { user } = usePrivy();
  const authFetch = useAuthFetch();

  const isOwnPost = user?.id === post.user_id;

  // Intersection Observer for scroll-reveal
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: "50px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { alert("Please sign in to like posts"); return; }
    if (isLiking) return;
    setIsLiking(true);

    const newLiked = !hasLiked;
    const newLikes = newLiked ? likes + 1 : likes - 1;
    setHasLiked(newLiked);
    setLikes(newLikes);

    // Trigger burst animation on like
    if (newLiked) {
      setLikeBurst(true);
      setTimeout(() => setLikeBurst(false), 500);
    }

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
        if (!onDeleted) router.refresh();
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  // Stagger delay based on index (capped at 8)
  const staggerClass = index <= 8 ? `stagger-${Math.min(index + 1, 8)}` : "";

  return (
    <article
      ref={cardRef}
      className={`
        bg-[#0a0a0a] border border-zinc-800/80 p-5 sm:p-6
        group cursor-pointer relative overflow-hidden
        card-hover corner-accent
        transition-[border-color] duration-300
        hover:border-zinc-600/60
        ${isVisible ? `animate-fade-up ${staggerClass}` : "opacity-0"}
      `}
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
      onClick={() => router.push(`/post/${post.id}`)}
    >
      {/* Subtle left accent line on hover */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-white/0 group-hover:bg-white/10 transition-colors duration-500" />

      <div className="flex gap-4">
        {/* Avatar */}
        <div
          className="w-11 h-11 flex-shrink-0 border border-zinc-700 group-hover:border-zinc-500 transition-all duration-300 overflow-hidden cursor-pointer relative"
          onClick={navigateToProfile}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
              <span className="text-sm font-black text-white uppercase">{displayName[0]}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline justify-between mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <h3
                className="font-black text-white uppercase text-[13px] tracking-wide truncate cursor-pointer hover:underline decoration-zinc-600 underline-offset-2"
                onClick={navigateToProfile}
              >
                {displayName}
              </h3>
              <span className="text-zinc-600 text-xs font-bold uppercase flex-shrink-0">
                @{username}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <span className="text-zinc-600 text-[10px] font-mono tracking-wide">
                {timeAgo.toUpperCase()}
              </span>
              {isOwnPost && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`p-1.5 transition-all duration-200 ${
                    showDeleteConfirm
                      ? "text-red-400 border border-red-800/50 bg-red-950/20 animate-scale-in"
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
            <div
              className="border border-zinc-800/60 mb-4 group-hover:border-zinc-700/60 transition-all duration-300 overflow-hidden img-hover-zoom"
              style={{ maxHeight: "35rem" }}
            >
              <Image
                src={post.image_url}
                alt="Post image"
                width={690}
                height={288}
                className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-all duration-500"
                unoptimized
              />
            </div>
          )}

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

          {/* Actions — with living hover effects */}
          <div className="flex items-center gap-5 pt-3 border-t border-zinc-800/40 mt-1" onClick={(e) => e.stopPropagation()}>
            {/* Like */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-2 group/btn transition-all duration-200 ${
                hasLiked ? "text-white" : "text-zinc-600 hover:text-white"
              }`}
            >
              <div className={`p-1.5 action-glow transition-all duration-200 ${likeBurst ? "like-burst like-ripple" : ""}`}>
                <Heart className={`w-[17px] h-[17px] transition-all duration-200 ${hasLiked ? "fill-current" : "group-hover/btn:scale-110"}`} />
              </div>
              {likes > 0 && (
                <span className={`text-xs font-mono font-bold transition-all ${likeBurst ? "number-pop" : ""}`}>
                  {likes}
                </span>
              )}
            </button>

            {/* Comment */}
            <button
              onClick={() => router.push(`/post/${post.id}`)}
              className="flex items-center gap-2 text-zinc-600 hover:text-white group/btn transition-all duration-200"
            >
              <div className="p-1.5 action-glow">
                <MessageCircle className="w-[17px] h-[17px] group-hover/btn:scale-110 transition-transform" />
              </div>
              {(post.comments_count ?? 0) > 0 && (
                <span className="text-xs font-mono font-bold">{post.comments_count}</span>
              )}
            </button>

            {/* Repost */}
            <button className="flex items-center gap-2 text-zinc-600 hover:text-white group/btn transition-all duration-200">
              <div className="p-1.5 action-glow">
                <Repeat className="w-[17px] h-[17px] group-hover/btn:scale-110 transition-transform" />
              </div>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="ml-auto text-zinc-600 hover:text-white transition-all duration-200 relative"
            >
              {copied ? (
                <span className="flex items-center gap-1.5 text-emerald-400 animate-scale-in">
                  <Check className="w-[17px] h-[17px]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Copied</span>
                </span>
              ) : (
                <Share className="w-[17px] h-[17px]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
