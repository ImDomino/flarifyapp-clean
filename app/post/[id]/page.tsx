"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, Send, Trash2, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { formatDistanceToNow } from "date-fns";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { PostWithUser } from "@/lib/types";

interface Comment {
  id: string;
  content: string;
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

export default function PostDetailPage() {
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
      // Build tree from flat list
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

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await authFetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id, content: newComment.trim() }),
      });
      if (res.ok) { setNewComment(""); loadComments(); loadPost(); }
    } catch (err) { console.error("Error:", err); }
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
      }
    } catch (err) { console.error("Error:", err); }
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
    } catch (err) { console.error("Error:", err); }
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

  // ── Render a single comment + its replies recursively ──
  const renderComment = (comment: Comment, depth: number = 0) => {
    const name = (comment.profiles as any)?.display_name || comment.profiles?.username || comment.profiles?.email?.split("@")[0] || "User";
    const isOwn = user?.id === comment.user_id;
    const hasReplies = (comment.replies?.length || 0) > 0;
    const isCollapsed = collapsedThreads.has(comment.id);
    const maxDepth = 4; // visual nesting limit
    const indentLevel = Math.min(depth, maxDepth);

    return (
      <div key={comment.id} className={depth > 0 ? "mt-2" : ""}>
        <div
          className={`bg-[#0a0a0a] border border-zinc-800 p-4 group transition-colors hover:bg-[#0d0d0d] ${
            depth > 0 ? "border-l-2 border-l-zinc-700/50" : ""
          }`}
          style={{ marginLeft: indentLevel > 0 ? `${indentLevel * 20}px` : undefined }}
        >
          <div className="flex gap-3">
            <div className="w-8 h-8 flex-shrink-0 border border-zinc-700 bg-zinc-900 flex items-center justify-center">
              <span className="text-xs font-black text-white uppercase">{name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white uppercase">{name}</span>
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: false }).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Reply button */}
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
                  {/* Delete button */}
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
              <p className="text-sm text-zinc-300 font-medium leading-relaxed">{comment.content}</p>

              {/* Collapse/expand replies */}
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
              <div className="w-6 h-6 flex-shrink-0 border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                <span className="text-[9px] font-black text-white uppercase">
                  {(user?.google?.name || user?.email?.address || "U")[0]}
                </span>
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
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-bold uppercase tracking-wider text-sm">Back</span>
      </button>

      <PostCard post={post} />

      {/* New top-level comment */}
      {user && (
        <form onSubmit={handleSubmitComment} className="bg-[#0a0a0a] border border-zinc-800 p-5">
          <div className="flex gap-4">
            <div className="w-10 h-10 flex-shrink-0 border border-zinc-700 bg-white flex items-center justify-center">
              <span className="text-sm font-black text-black uppercase">
                {(user.google?.name || user.email?.address || "U")[0]}
              </span>
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="WRITE A COMMENT..."
                rows={3}
                className="w-full bg-transparent text-sm font-medium text-white placeholder-zinc-700 placeholder:uppercase placeholder:tracking-wider focus:outline-none resize-none mb-3"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-black font-black uppercase tracking-wider text-xs border-2 border-white hover:bg-black hover:text-white transition-colors disabled:opacity-30"
                >
                  <Send className="w-3.5 h-3.5" /> Reply
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comments section */}
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
  );
}