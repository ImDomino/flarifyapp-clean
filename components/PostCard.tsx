"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Heart, MessageCircle, Repeat, Share, Trash2, Check, Bookmark, ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { PostWithUser } from "@/lib/types";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { MarketCard } from "./MarketCard";
import { FollowButton } from "./FollowButton";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { toast } from "sonner";

function Linkify({ text }: { text: string }) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 hover:text-blue-300 hover:underline transition-colors break-all"
          >
            {part.length > 50 ? part.slice(0, 47) + "..." : part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function Lightbox({ urls, initialIndex, onClose }: { urls: string[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const url = urls[index];
  const hasMultiple = urls.length > 1;

  const prev = useCallback(() => setIndex((i) => (i - 1 + urls.length) % urls.length), [urls.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % urls.length), [urls.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, prev, next]);

  const content = (
    <>
      <div className="fixed inset-0 bg-black/95 z-[9999]" onClick={onClose} />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 border border-zinc-700 bg-black/80 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors pointer-events-auto z-10">
          <X className="w-5 h-5" />
        </button>

        {/* Counter */}
        {hasMultiple && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-zinc-500 pointer-events-none">
            {index + 1} / {urls.length}
          </div>
        )}

        {/* Nav arrows */}
        {hasMultiple && (
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 border border-zinc-700 bg-black/80 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors pointer-events-auto">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {hasMultiple && (
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 border border-zinc-700 bg-black/80 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-colors pointer-events-auto">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Image */}
        <img
          src={url}
          alt=""
          className="max-w-[90vw] max-h-[90vh] object-contain pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}

interface PostCardProps {
  post: PostWithUser & { 
    user_has_reposted?: boolean;
    reposts_count?: number;
    user_has_bookmarked?: boolean;
    reposted_by?: string;  // display name of reposter
  };
  onDeleted?: () => void;
  index?: number;
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

  // Repost state
  const [repostCount, setRepostCount] = useState(post.reposts_count || 0);
  const [hasReposted, setHasReposted] = useState(post.user_has_reposted || false);
  const [isReposting, setIsReposting] = useState(false);
  const [repostBurst, setRepostBurst] = useState(false);
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const repostMenuRef = useRef<HTMLDivElement>(null);

  // Bookmark state
  const [hasBookmarked, setHasBookmarked] = useState(post.user_has_bookmarked || false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [bookmarkBurst, setBookmarkBurst] = useState(false);

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
      toast.error("Failed to like post");
    } finally { setIsLiking(false); }
  };

  // Close repost menu on outside click
  useEffect(() => {
    if (!showRepostMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (repostMenuRef.current && !repostMenuRef.current.contains(e.target as Node)) {
        setShowRepostMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showRepostMenu]);

  const handleRepostClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { alert("Please sign in to repost"); return; }
    if (isOwnPost) return;
    if (hasReposted) {
      // Undo repost directly
      doRepost(null);
    } else {
      setShowRepostMenu(!showRepostMenu);
    }
  };

  const doRepost = async (quoteContent: string | null) => {
    if (isReposting) return;
    setIsReposting(true);
    setShowRepostMenu(false);

    const newReposted = !hasReposted;
    const newCount = newReposted ? repostCount + 1 : repostCount - 1;
    setHasReposted(newReposted);
    setRepostCount(newCount);

    if (newReposted) {
      setRepostBurst(true);
      setTimeout(() => setRepostBurst(false), 500);
    }

    try {
      const body: any = { post_id: post.id };
      if (quoteContent) body.quote_content = quoteContent;
      const response = await authFetch("/api/reposts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!data.success) { setHasReposted(!newReposted); setRepostCount(repostCount); }
    } catch {
      setHasReposted(!newReposted); setRepostCount(repostCount);
      toast.error("Failed to repost");
    } finally { setIsReposting(false); }
  };

  const handleQuoteSubmit = () => {
    if (!quoteText.trim()) return;
    doRepost(quoteText.trim());
    setQuoteText("");
    setShowQuoteInput(false);
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { alert("Please sign in to bookmark"); return; }
    if (isBookmarking) return;
    setIsBookmarking(true);

    const newBookmarked = !hasBookmarked;
    setHasBookmarked(newBookmarked);

    if (newBookmarked) {
      setBookmarkBurst(true);
      setTimeout(() => setBookmarkBurst(false), 500);
    }

    try {
      const response = await authFetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id }),
      });
      const data = await response.json();
      if (!data.success) setHasBookmarked(!newBookmarked);
    } catch {
      setHasBookmarked(!newBookmarked);
      toast.error("Failed to bookmark");
    } finally { setIsBookmarking(false); }
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
        toast.success("Post deleted");
        onDeleted?.();
        if (!onDeleted) router.refresh();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete post");
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);
  const staggerClass = index <= 8 ? `stagger-${Math.min(index + 1, 8)}` : "";

  return (
    <>
    <article
      ref={cardRef}
      className={`
        bg-[#0a0a0a] border border-zinc-800/80 
        group cursor-pointer relative overflow-hidden
        transition-all duration-300
        hover:bg-[#0d0d0d] hover:border-zinc-700/60
        ${isVisible ? `animate-fade-up ${staggerClass}` : "opacity-0"}
      `}
      onClick={() => router.push(`/post/${post.id}`)}
    >
      {/* Reposted by banner */}
      {post.reposted_by && (
        <div className="px-5 pt-3 pb-0">
          <div className="flex items-center gap-2 text-zinc-600">
            <Repeat className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {post.reposted_by} reposted
            </span>
          </div>
          {(post as any).quote_content && (
            <p className="text-sm text-zinc-400 font-medium mt-1.5 pl-5 border-l-2 border-zinc-800 ml-0.5">
              <Linkify text={(post as any).quote_content} />
            </p>
          )}
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="flex gap-3 sm:gap-4">
          {/* Avatar */}
          <div
            className="w-9 sm:w-11 h-9 sm:h-11 flex-shrink-0 border border-zinc-700 group-hover:border-zinc-500 transition-all duration-300 overflow-hidden cursor-pointer relative"
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
            <div className="flex items-baseline justify-between mb-2 sm:mb-2.5">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                <h3
                  className="font-black text-white uppercase text-[12px] sm:text-[13px] tracking-wide truncate cursor-pointer hover:underline decoration-zinc-600 underline-offset-2"
                  onClick={navigateToProfile}
                >
                  {displayName}
                </h3>
                <span className="text-zinc-600 text-[10px] sm:text-xs font-bold uppercase flex-shrink-0 hidden xs:inline">
                  @{username}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-1 sm:ml-2">
                {!isOwnPost && user && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" onClick={(e) => e.stopPropagation()}>
                    <FollowButton targetUserId={post.user_id} currentUserId={user.id} size="small" />
                  </div>
                )}
                <span className="text-zinc-600 text-[9px] sm:text-[10px] font-mono tracking-wide">
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
                isLongContent && !isExpanded ? "line-clamp-4" : ""
              }`}>
                <Linkify text={post.content} />
              </p>
              {isLongContent && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                  className="text-xs text-zinc-500 font-bold uppercase tracking-wider hover:text-white transition-colors mt-1"
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>

            {/* Images */}
            {post.image_url && (() => {
              let mediaUrls: string[] = [];
              try {
                if (post.image_url.startsWith("[")) {
                  mediaUrls = JSON.parse(post.image_url);
                } else {
                  mediaUrls = [post.image_url];
                }
              } catch {
                mediaUrls = [post.image_url];
              }

              const isVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url);
              const imageUrls = mediaUrls.filter((u) => !isVideo(u));

              const openLightbox = (url: string) => {
                const idx = imageUrls.indexOf(url);
                setLightbox({ urls: imageUrls, index: idx >= 0 ? idx : 0 });
              };

              const renderMedia = (url: string, className: string, key?: number) =>
                isVideo(url) ? (
                  <video
                    key={key}
                    src={url}
                    className={className}
                    controls
                    playsInline
                    preload="metadata"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <Image
                    key={key}
                    src={url}
                    alt="Post media"
                    width={690}
                    height={288}
                    className={`${className} cursor-zoom-in`}
                    unoptimized
                    onClick={(e) => { e.stopPropagation(); openLightbox(url); }}
                  />
                );

              if (mediaUrls.length === 1) {
                return (
                  <div
                    className="border border-zinc-800/60 mb-4 group-hover:border-zinc-700/60 transition-all duration-300 overflow-hidden img-hover-zoom"
                    style={{ maxHeight: "35rem" }}
                  >
                    {renderMedia(mediaUrls[0], "w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-all duration-500")}
                  </div>
                );
              }

              return (
                <div className={`grid gap-1 mb-4 ${
                  mediaUrls.length === 2 ? "grid-cols-2" : "grid-cols-2"
                }`}>
                  {mediaUrls.map((url, i) => (
                    <div
                      key={i}
                      className={`border border-zinc-800/60 group-hover:border-zinc-700/60 transition-all duration-300 overflow-hidden ${
                        mediaUrls.length === 3 && i === 0 ? "col-span-2" : ""
                      }`}
                    >
                      {renderMedia(url, `w-full object-cover opacity-85 group-hover:opacity-100 transition-all duration-500 ${
                        mediaUrls.length === 2 ? "h-48" :
                        mediaUrls.length === 3 && i === 0 ? "h-48" : "h-36"
                      }`, i)}
                    </div>
                  ))}
                </div>
              );
            })()}

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

            {/* Quote input */}
            {showQuoteInput && (
              <div className="mb-3 bg-[#080808] border border-zinc-800 p-3 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider mb-2">
                  Quote this post
                </div>
                <textarea
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="Add your thoughts..."
                  rows={2}
                  maxLength={500}
                  autoFocus
                  className="w-full bg-transparent text-sm font-medium text-white placeholder-zinc-700 focus:outline-none resize-none mb-2"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-700 font-mono">{quoteText.length}/500</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowQuoteInput(false); setQuoteText(""); }}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuoteSubmit(); }}
                      disabled={!quoteText.trim() || isReposting}
                      className="px-4 py-1.5 bg-white text-black font-black uppercase tracking-wider text-[10px] border border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30"
                    >
                      Quote
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 sm:gap-5 pt-3 border-t border-zinc-800/40 mt-1" onClick={(e) => e.stopPropagation()}>
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
              <div className="relative" ref={repostMenuRef}>
                <button
                  onClick={handleRepostClick}
                  disabled={isReposting || isOwnPost}
                  className={`flex items-center gap-2 group/btn transition-all duration-200 ${
                    hasReposted ? "text-emerald-400" : "text-zinc-600 hover:text-emerald-400"
                  } ${isOwnPost ? "opacity-30 cursor-not-allowed" : ""}`}
                  title={isOwnPost ? "Cannot repost your own post" : hasReposted ? "Undo repost" : "Repost"}
                >
                  <div className={`p-1.5 action-glow transition-all duration-200 ${repostBurst ? "like-burst" : ""}`}>
                    <Repeat className={`w-[17px] h-[17px] transition-all duration-200 ${!isOwnPost ? "group-hover/btn:scale-110" : ""}`} />
                  </div>
                  {repostCount > 0 && (
                    <span className={`text-xs font-mono font-bold transition-all ${repostBurst ? "number-pop" : ""}`}>
                      {repostCount}
                    </span>
                  )}
                </button>

                {/* Repost dropdown */}
                {showRepostMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-[#0a0a0a] border border-zinc-700 z-50 min-w-[160px] shadow-xl animate-scale-in">
                    <button
                      onClick={(e) => { e.stopPropagation(); doRepost(null); }}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 text-zinc-300 hover:bg-white/[0.05] hover:text-white transition-colors"
                    >
                      <Repeat className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Repost</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRepostMenu(false);
                        setShowQuoteInput(true);
                      }}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 text-zinc-300 hover:bg-white/[0.05] hover:text-white transition-colors border-t border-zinc-800/60"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Quote</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bookmark */}
              <button
                onClick={handleBookmark}
                disabled={isBookmarking}
                className={`flex items-center gap-2 group/btn transition-all duration-200 ml-auto ${
                  hasBookmarked ? "text-yellow-400" : "text-zinc-600 hover:text-yellow-400"
                }`}
                title={hasBookmarked ? "Remove bookmark" : "Bookmark"}
              >
                <div className={`p-1.5 action-glow transition-all duration-200 ${bookmarkBurst ? "like-burst" : ""}`}>
                  <Bookmark className={`w-[17px] h-[17px] transition-all duration-200 ${hasBookmarked ? "fill-current" : "group-hover/btn:scale-110"}`} />
                </div>
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="text-zinc-600 hover:text-white transition-all duration-200 relative"
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
      </div>
    </article>
    {lightbox && (
      <Lightbox urls={lightbox.urls} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />
    )}
    </>
  );
}