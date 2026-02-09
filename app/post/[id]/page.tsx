"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { formatDistanceToNow } from "date-fns";
import type { PostWithUser } from "@/lib/types";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles?: {
    username?: string;
    email?: string;
    avatar_url?: string;
    display_name?: string;
  };
}

export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = usePrivy();
  const [post, setPost] = useState<PostWithUser | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setComments(data.comments || []);
    } catch (err) { console.error("Error:", err); }
  }, [id]);

  useEffect(() => { loadPost(); loadComments(); }, [loadPost, loadComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: id, user_id: user.id, content: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment("");
        loadComments();
        loadPost();
      }
    } catch (err) { console.error("Error:", err); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !confirm("Delete this comment?")) return;
    try {
      await fetch(`/api/comments/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId, user_id: user.id }),
      });
      loadComments();
      loadPost();
    } catch (err) { console.error("Error:", err); }
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

      {/* Comment Form */}
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
                  <Send className="w-3.5 h-3.5" />
                  Reply
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comments */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 pb-3 border-b border-zinc-800">
          Comments ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-zinc-800 p-8 text-center">
            <p className="text-xs text-zinc-600 uppercase tracking-wider font-bold">No comments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => {
              const name = (comment.profiles as any)?.display_name || comment.profiles?.username || comment.profiles?.email?.split("@")[0] || "User";
              const isOwn = user?.id === comment.user_id;
              return (
                <div key={comment.id} className="bg-[#0a0a0a] border border-zinc-800 p-4 interact-border group">
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
                        {isOwn && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-zinc-300 font-medium leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
