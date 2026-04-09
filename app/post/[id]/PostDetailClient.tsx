"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, Send, Trash2, Reply, ChevronDown, ChevronUp, Image as ImageIcon, X } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { formatDistanceToNow } from "date-fns";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { PostWithUser } from "@/lib/types";
import Link from "next/link";
import { toast } from "sonner";
import { PageTransition } from "@/components/PageTransition";

interface Comment {
  id: string;
  content: string;
  image_url?: string | null;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  profiles?: {
    username?: string;
    email?: string;
    avatar_url?: string;
    display_name?: string;
  };
  replies?: Comment[];
}

export function PostDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = usePrivy();
  const authFetch = useAuthFetch();
  const [post, setPost] = useState<PostWithUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [commentImages, setCommentImages] = useState<Array<{ file: File; preview: string }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const MAX_COMMENT_IMAGES = 4;

  // Load current user's avatar
  useEffect(() => {
    if (!user?.id) return;
    const loadAvatar = async () => {
      try {
        const res = await fetch(`/api/profile?user_id=${encodeURIComponent(user.id)}`);
        if (res.ok) {
          const data = await res.json();
          setMyAvatarUrl(data.profile?.avatar_url || null);
        }
      } catch {}
    };
    loadAvatar();
  }, [user?.id]);

  const loadPost = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/posts?post_id=${id}`);
      const data = await res.json();
      if (data.posts?.[0]) setPost(data.posts[0]);
    } catch (err) { console.error("Error:", err); }
    finally { setIsLoading(false); }
  }, [id]);

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?post_id=${id}`);
      const data = await res.json();
      const flat: Comment[] = data.comments || [];
      const map = new Map<string, Comment>();
      const roots: Comment[] = [];

      flat.forEach((c) => {
        c.replies = [];
        map.set(c.id, c);
      });

      flat.forEach((c) => {
        if (c.parent_id && map.has(c.parent_id)) {
          map.get(c.parent_id)!.replies!.push(c);
        } else {
          roots.push(c);
        }
      });

      setComments(roots);
    } catch (err) { console.error("Error:", err); }
  }, [id]);

  useEffect(() => { loadPost(); loadComments(); }, [loadPost, loadComments]);

  const addCommentImage = (file: File) => {
    if (commentImages.length >= MAX_COMMENT_IMAGES) {
      toast.error(`Maximum ${MAX_COMMENT_IMAGES} images`);
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) { toast.error("Unsupported format"); return; }
    if (file.size > 3.5 * 1024 * 1024) { toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 3.5MB.`); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCommentImages((prev) => [...prev, { file, preview: reader.result as string }]);
    };
    reader.readAsDataURL(file);
  };

  const addCommentFiles = (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      if (f.type.startsWith("image/")) addCommentImage(f);
    }
  };

  const handleCommentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addCommentFiles(e.target.files);
    if (commentFileRef.current) commentFileRef.current.value = "";
  };

  const handleCommentPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) addCommentImage(file);
        return;
      }
    }
  };

  const handleCommentDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  };
  const handleCommentDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };
  const handleCommentDragOver = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  };
  const handleCommentDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false); dragCounterRef.current = 0;
    if (e.dataTransfer.files?.length) addCommentFiles(e.dataTransfer.files);
  };

  const removeCommentImage = (index: number) => {
    setCommentImages((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCommentImages = () => setCommentImages([]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newComment.trim() && commentImages.length === 0)) return;
    setIsSubmitting(true);
    try {
      // Upload all images
      const imageUrls: string[] = [];
      for (const img of commentImages) {
        const formData = new FormData();
        formData.append("file", img.file);
        const uploadRes = await authFetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) throw new Error(uploadData.error || "Upload failed");
        imageUrls.push(uploadData.url);
      }

      // Single string for 1 image, JSON array for multiple (like posts)
      const imageUrlField = imageUrls.length === 0
        ? null
        : imageUrls.length === 1
          ? imageUrls[0]
          : JSON.stringify(imageUrls);

      const res = await authFetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id, content: newComment.trim(), image_url: imageUrlField }),
      });
      if (res.ok) {
        setNewComment("");
        clearCommentImages();
        loadComments();
        loadPost();
        toast.success("Comment added");
      }
    } catch (err) { console.error("Error:", err); toast.error("Failed to add comment"); }
    finally { setIsSubmitting(false); }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await authFetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id, content: replyContent.trim(), parent_id: parentId }),
      });
      if (res.ok) {
        setReplyContent("");
        setReplyingTo(null);
        loadComments();
        loadPost();
        toast.success("Reply added");
      }
    } catch (err) { console.error("Error:", err); toast.error("Failed to add reply"); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !confirm("Delete this comment?")) return;
    try {
      await authFetch("/api/comments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId }),
      });
      loadComments(); loadPost();
      toast.success("Comment deleted");
    } catch (err) { console.error("Error:", err); toast.error("Failed to delete comment"); }
  };

  const toggleThread = (commentId: string) => {
    setCollapsedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const totalComments = (list: Comment[]): number => {
    return list.reduce((sum, c) => sum + 1 + totalComments(c.replies || []), 0);
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const name = (comment.profiles as any)?.display_name || comment.profiles?.username || comment.profiles?.email?.split("@")[0] || "User";
    const avatarUrl = comment.profiles?.avatar_url;
    const isOwn = user?.id === comment.user_id;
    const hasReplies = (comment.replies?.length || 0) > 0;
    const isCollapsed = collapsedThreads.has(comment.id);
    const maxDepth = 4;
    const indentLevel = Math.min(depth, maxDepth);
    const profileLink = isOwn ? "/profile" : `/user/${encodeURIComponent(comment.user_id)}`;

    return (
      <div key={comment.id} className={depth > 0 ? "mt-2" : ""}>
        <div
          className={`bg-[#0a0a0a] border border-zinc-800 p-4 group transition-colors hover:bg-[#0d0d0d] ${
            depth > 0 ? "border-l-2 border-l-zinc-700/50" : ""
          }`}
          style={{ marginLeft: indentLevel > 0 ? `${indentLevel * 20}px` : undefined }}
        >
          <div className="flex gap-3">
            {/* Avatar - clickable with image support */}
            <Link href={profileLink} className="flex-shrink-0">
              <div className="w-8 h-8 border border-zinc-700 bg-zinc-900 flex items-center justify-center overflow-hidden hover:border-zinc-500 transition-colors">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-black text-white uppercase">{name[0]}</span>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Name - clickable link to profile */}
                  <Link href={profileLink} className="text-sm font-black text-white uppercase hover:text-zinc-300 transition-colors">
                    {name}
                  </Link>
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: false }).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {user && (
                    <button
                      onClick={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyContent("");
                      }}
                      className="text-zinc-700 hover:text-white transition-colors opacity-0 group-hover:opacity-100 p-1"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isOwn && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {comment.content && (
                <p className="text-sm text-zinc-300 font-medium leading-relaxed">{comment.content}</p>
              )}
              {comment.image_url && (() => {
                let urls: string[] = [];
                try {
                  const parsed = JSON.parse(comment.image_url);
                  if (Array.isArray(parsed)) urls = parsed;
                  else urls = [comment.image_url];
                } catch {
                  urls = [comment.image_url];
                }
                return urls.length > 0 ? (
                  <div className={`mt-2 grid gap-1.5 ${urls.length === 1 ? "grid-cols-1 inline-grid" : "grid-cols-2"}`}>
                    {urls.map((url, i) => (
                      <div key={i} className={`border border-zinc-800 overflow-hidden ${urls.length === 3 && i === 0 ? "col-span-2" : ""}`}>
                        <img src={url} alt="" className={`w-full object-cover ${urls.length === 1 ? "max-h-48" : "h-28"}`} />
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

              {hasReplies && (
                <button
                  onClick={() => toggleThread(comment.id)}
                  className="flex items-center gap-1 mt-2 text-[10px] text-zinc-600 hover:text-zinc-400 font-bold uppercase tracking-wider transition-colors"
                >
                  {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  {isCollapsed
                    ? `Show ${comment.replies!.length} ${comment.replies!.length === 1 ? "reply" : "replies"}`
                    : "Hide replies"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline reply form */}
        {replyingTo === comment.id && (
          <div
            className="mt-1 bg-[#080808] border border-zinc-800 p-3"
            style={{ marginLeft: `${(indentLevel + 1) * 20}px` }}
          >
            <div className="flex gap-3">
              <div className="w-6 h-6 flex-shrink-0 border border-zinc-700 bg-zinc-900 flex items-center justify-center overflow-hidden">
                {myAvatarUrl ? (
                  <img src={myAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[9px] font-black text-white uppercase">
                    {(user?.google?.name || user?.email?.address || "U")[0]}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to ${name}...`}
                  rows={2}
                  autoFocus
                  className="w-full bg-transparent text-sm font-medium text-white placeholder-zinc-700 focus:outline-none resize-none mb-2"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={isSubmitting || !replyContent.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white text-black font-black uppercase tracking-wider text-[10px] border border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30"
                  >
                    <Send className="w-3 h-3" /> Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nested replies */}
        {hasReplies && !isCollapsed && (
          <div>
            {comment.replies!.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-white animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-black uppercase tracking-wider mb-2">Post Not Found</h2>
        <button onClick={() => router.push("/")} className="text-sm text-zinc-400 hover:text-white font-bold uppercase tracking-wider">
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-bold uppercase tracking-wider text-sm">Back</span>
      </button>

      <PostCard post={post} />

      {user && (
        <form
          onSubmit={handleSubmitComment}
          onDragEnter={handleCommentDragEnter}
          onDragLeave={handleCommentDragLeave}
          onDragOver={handleCommentDragOver}
          onDrop={handleCommentDrop}
          className={`bg-[#0a0a0a] border p-5 relative transition-colors ${
            isDragging ? "border-white" : "border-zinc-800"
          }`}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-12 h-12 border-2 border-dashed border-zinc-500 flex items-center justify-center mb-2 animate-pulse">
                <ImageIcon className="w-5 h-5 text-zinc-400" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Drop images here</p>
            </div>
          )}

          <div className="flex gap-4">
            <div className="w-10 h-10 flex-shrink-0 border border-zinc-700 bg-zinc-900 flex items-center justify-center overflow-hidden">
              {myAvatarUrl ? (
                <img src={myAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-black text-white uppercase">
                  {(user.google?.name || user.email?.address || "U")[0]}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onPaste={handleCommentPaste}
                placeholder="WRITE A COMMENT..."
                rows={3}
                className="w-full bg-transparent text-sm font-medium text-white placeholder-zinc-700 placeholder:uppercase placeholder:tracking-wider focus:outline-none resize-none mb-3"
              />

              {/* Image previews */}
              {commentImages.length > 0 && (
                <div className="mb-3">
                  <div className={`grid gap-1.5 ${
                    commentImages.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  }`}>
                    {commentImages.map((img, i) => (
                      <div
                        key={i}
                        className={`border border-zinc-800 overflow-hidden relative group ${
                          commentImages.length === 3 && i === 0 ? "col-span-2" : ""
                        }`}
                      >
                        <img src={img.preview} alt="" className={`w-full object-cover ${
                          commentImages.length === 1 ? "max-h-48" : "h-28"
                        }`} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                        <button
                          type="button"
                          onClick={() => removeCommentImage(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/80 border border-zinc-700 flex items-center justify-center text-white hover:bg-red-600 hover:border-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest mt-1.5">
                    {commentImages.length}/{MAX_COMMENT_IMAGES} images
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input ref={commentFileRef} type="file" accept="image/*" multiple onChange={handleCommentFileSelect} className="hidden" />
                  <button
                    type="button"
                    onClick={() => commentFileRef.current?.click()}
                    className="p-1.5 text-zinc-600 hover:text-white transition-colors"
                    title="Attach images"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  {commentImages.length === 0 && (
                    <span className="text-[10px] text-zinc-700 font-bold uppercase tracking-wider hidden sm:inline">
                      Drag & drop or Ctrl+V
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || (!newComment.trim() && commentImages.length === 0)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black font-black uppercase tracking-wider text-xs border-2 border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30"
                >
                  <Send className="w-3.5 h-3.5" /> {isSubmitting ? "..." : "Reply"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 pb-3 border-b border-zinc-800">
          Comments ({totalComments(comments)})
        </h3>
        {comments.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-zinc-800 p-8 text-center">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold">No comments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => renderComment(comment))}
          </div>
        )}
      </div>
    </div>
    </PageTransition>
  );
}